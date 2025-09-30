import { Controller, Get, Post, Put, Delete, Body, Param, HttpException, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ProductService, CreateProductDto, UpdateProductDto } from '../service/ProductService';
import { Product, ProductDocument } from '../models/ProductSchema';
import { Category, CategoryDocument } from '../models/CategorySchema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>
  ) {}
  
  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto, @Request() req): Promise<ProductDocument> {
    try {
      // Validate required fields
      
      if (!createProductDto.name || !createProductDto.brand || !createProductDto.mainCategory || !createProductDto.description) {
        throw new HttpException('Name, brand, main category, and description are required', HttpStatus.BAD_REQUEST);
      }

      if (createProductDto.basePrice <= 0 || createProductDto.purchasedPrice <= 0 || createProductDto.sellingPrice <= 0) {
        throw new HttpException('All prices must be greater than 0', HttpStatus.BAD_REQUEST);
      }

      if (!createProductDto.images || createProductDto.images.length === 0) {
        throw new HttpException('At least one image is required', HttpStatus.BAD_REQUEST);
      }

      if (createProductDto.images.length > 3) {
        throw new HttpException('Maximum 3 images allowed', HttpStatus.BAD_REQUEST);
      }


      const product = await this.productService.create(createProductDto, req.user.sub);
      return product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to create product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async getAllProducts(@Request() req): Promise<ProductDocument[]> {
    try {
      if (!req.user || !req.user.sub) {
        throw new HttpException('User ID not provided', HttpStatus.BAD_REQUEST);
      }
      return await this.productService.findAllByUser(req.user.sub);
    } catch (error) {
      throw new HttpException('Failed to fetch products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getProductById(@Param('id') id: string, @Request() req): Promise<ProductDocument> {
    try {
      const product = await this.productService.findByIdAndUser(id, req.user.sub);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      return product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to fetch product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req
  ): Promise<ProductDocument> {
    try {
      if (updateProductDto.basePrice !== undefined && updateProductDto.basePrice <= 0) {
        throw new HttpException('Base price must be greater than 0', HttpStatus.BAD_REQUEST);
      }

      // If updating main category, validate it exists and belongs to user
      if (updateProductDto.mainCategory) {
        const mainCategory = await this.categoryModel.findOne({ 
          _id: updateProductDto.mainCategory, 
          userId: req.user.sub 
        });
        if (!mainCategory) {
          throw new HttpException('Main category not found', HttpStatus.BAD_REQUEST);
        }
      }

      // If updating sub-category, validate it exists and belongs to the main category and user
      if (updateProductDto.subCategory) {
        const product = await this.productService.findByIdAndUser(id, req.user.sub);
        const mainCategoryId = updateProductDto.mainCategory || product?.mainCategory;
        
        const subCategory = await this.categoryModel.findOne({ 
          _id: updateProductDto.subCategory, 
          userId: req.user.sub 
        });
        if (!subCategory || subCategory.parentId?.toString() !== mainCategoryId) {
          throw new HttpException('Invalid sub-category', HttpStatus.BAD_REQUEST);
        }
      }

      const product = await this.productService.updateByUser(id, updateProductDto, req.user.sub);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      return product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to update product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: string, @Request() req): Promise<{ message: string }> {
    try {
      const deleted = await this.productService.deleteByUser(id, req.user.sub);
      if (!deleted) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      return { message: 'Product deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to delete product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id/stock')
  async updateStock(
    @Param('id') id: string,
    @Body() body: { stockChange: number },
    @Request() req
  ): Promise<ProductDocument> {
    try {
      const product = await this.productService.updateStockByUser(id, body.stockChange, req.user.sub);
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      return product;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message === 'Insufficient stock') {
        throw new HttpException('Insufficient stock', HttpStatus.BAD_REQUEST);
      }
      throw new HttpException('Failed to update stock', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
