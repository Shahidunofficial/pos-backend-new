import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ProductService, CreateProductDto, UpdateProductDto } from '../service/ProductService';
import { ProductDocument } from '../models/ProductSchema';
import { Category, CategoryDocument } from '../models/CategorySchema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { S3Service } from '../services/S3Service';

@Controller('products')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    private readonly s3Service: S3Service
  ) {}

  private parseJSON(value: any): any {
    if (!value) return undefined;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  }

  private async handleImageUpload(files: Express.Multer.File[], body: any): Promise<string[]> {
    console.log('🖼️  Image Upload Debug:', {
      filesCount: files?.length || 0,
      hasBodyImages: !!body.images,
      bodyImages: body.images
    });

    // Priority 1: Upload files to S3 if provided
    if (files && files.length > 0) {
      console.log('📤 Uploading files to S3:', files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype })));
      const urls = await this.s3Service.uploadMultipleImages(files);
      console.log('✅ S3 Upload successful:', urls);
      return urls;
    }
    
    // Priority 2: Use provided image URLs (but filter out blob URLs)
    if (body.images) {
      const parsedImages = this.parseJSON(body.images);
      // Filter out blob URLs (they're only valid in the browser)
      const validUrls = Array.isArray(parsedImages) 
        ? parsedImages.filter((url: string) => !url.startsWith('blob:'))
        : [];
      
      if (validUrls.length > 0) {
        console.log('📝 Using provided image URLs:', validUrls);
        return validUrls;
      } else {
        console.log('⚠️  Only blob URLs provided, which cannot be used');
      }
    }
    
    console.log('⚠️  No valid images provided');
    return [];
  }

  private validateProductDto(dto: CreateProductDto): void {
    if (!dto.name || !dto.brand || !dto.mainCategory || !dto.description) {
      throw new HttpException('Name, brand, main category, and description are required', HttpStatus.BAD_REQUEST);
    }
    if (dto.basePrice <= 0 || dto.purchasedPrice <= 0 || dto.sellingPrice <= 0) {
      throw new HttpException('All prices must be greater than 0', HttpStatus.BAD_REQUEST);
    }
    if (!dto.images || dto.images.length === 0 || dto.images.length > 3) {
      throw new HttpException('1-3 images are required', HttpStatus.BAD_REQUEST);
    }
  }

  // Public endpoints (no authentication required)
  @Get('public')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async getPublicProducts(): Promise<any[]> {
    try {
      const products = await this.productService.findAll();
      return products.map(product => {
        const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) || 0;
        return {
          _id: product._id,
          name: product.name,
          brand: product.brand,
          description: product.description,
          mainCategory: product.mainCategory,
          subCategory: product.subCategory,
          sellingPrice: product.sellingPrice,
          images: product.images,
          stock: totalStock,
          variants: product.variants
        };
      });
    } catch (error) {
      throw new HttpException('Failed to fetch products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('public/:id')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getPublicProductById(@Param('id') id: string): Promise<any> {
    try {
      const product = await this.productService.findById(id);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) || 0;
      return {
        _id: product._id,
        name: product.name,
        brand: product.brand,
        description: product.description,
        mainCategory: product.mainCategory,
        subCategory: product.subCategory,
        sellingPrice: product.sellingPrice,
        images: product.images,
        stock: totalStock,
        variants: product.variants,
        specifications: product.specifications,
        availableOptions: product.availableOptions
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to fetch product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Protected endpoints (authentication required)
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FilesInterceptor('images', 3))
  async createProduct(@UploadedFiles() files: Express.Multer.File[], @Body() body: any, @Request() req): Promise<ProductDocument> {
    try {
      console.log('🚀 Create Product Request:', {
        user: req.user.sub,
        filesReceived: files?.length || 0,
        bodyKeys: Object.keys(body)
      });

      const imageUrls = await this.handleImageUpload(files, body);
      
      const dto: CreateProductDto = {
        name: body.name, 
        brand: body.brand, 
        basePrice: parseFloat(body.basePrice),
        purchasedPrice: parseFloat(body.purchasedPrice), 
        sellingPrice: parseFloat(body.sellingPrice),
        mainCategory: body.mainCategory, 
        subCategory: body.subCategory, 
        subSubCategory: body.subSubCategory,
        description: body.description, 
        images: imageUrls, 
        userId: req.user.sub,
        specifications: this.parseJSON(body.specifications), 
        availableOptions: this.parseJSON(body.availableOptions),
        variants: this.parseJSON(body.variants)
      };

      console.log('📦 Product DTO:', { ...dto, images: `[${dto.images.length} images]` });
      
      this.validateProductDto(dto);
      const product = await this.productService.create(dto, req.user.sub);
      
      console.log('✅ Product created successfully:', product._id);
      return product;
    } catch (error) {
      console.error('❌ Create Product Error:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to create product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllProducts(@Request() req): Promise<ProductDocument[]> {
    if (!req.user?.sub) throw new HttpException('User ID not provided', HttpStatus.BAD_REQUEST);
    return await this.productService.findAllByUser(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getProductById(@Param('id') id: string, @Request() req): Promise<ProductDocument> {
    const product = await this.productService.findByIdAndUser(id, req.user.sub);
    if (!product) throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    return product;
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto, @Request() req): Promise<ProductDocument> {
    try {
      if (dto.basePrice !== undefined && dto.basePrice <= 0) {
        throw new HttpException('Base price must be greater than 0', HttpStatus.BAD_REQUEST);
      }
      if (dto.mainCategory && !(await this.categoryModel.findOne({ _id: dto.mainCategory, userId: req.user.sub }))) {
        throw new HttpException('Main category not found', HttpStatus.BAD_REQUEST);
      }
      const product = await this.productService.updateByUser(id, dto, req.user.sub);
      if (!product) throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      return product;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('Failed to update product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProduct(@Param('id') id: string, @Request() req): Promise<{ message: string }> {
    const deleted = await this.productService.deleteByUser(id, req.user.sub);
    if (!deleted) throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    return { message: 'Product deleted successfully' };
  }
}
