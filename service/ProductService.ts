import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../models/ProductSchema';

export interface CreateProductDto {
  name: string;
  brand: string;
  basePrice: number;
  purchasedPrice: number;
  sellingPrice: number;
  mainCategory: string;
  subCategory?: string;
  subSubCategory?: string;
  description: string;
  images: string[];
  specifications?: Record<string, string>;
  availableOptions?: {
    color?: string[];
    ram?: string[];
    storage?: string[];
  };
  variants: Array<{
    id: string;
    color?: string;
    ram?: string;
    storage?: string;
    purchasedPrice: number;
    sellingPrice: number;
    stock: number;
  }>;
  userId: string;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(createProductDto: CreateProductDto, userId: string): Promise<ProductDocument> {
    const product = new this.productModel({
      ...createProductDto,
      userId
    });
    return product.save();
  }

  async findAll(): Promise<ProductDocument[]> {
    return this.productModel.find().exec();
  }

  async findAllByUser(userId: string): Promise<ProductDocument[]> {
    return this.productModel.find({ userId }).exec();
  }

  async findById(id: string): Promise<ProductDocument | null> {
    return this.productModel.findById(id).exec();
  }

  async findByIdAndUser(id: string, userId: string): Promise<ProductDocument | null> {
    return this.productModel.findOne({ _id: id, userId }).exec();
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<ProductDocument | null> {
    return this.productModel.findByIdAndUpdate(id, updateProductDto, { new: true }).exec();
  }

  async updateByUser(id: string, updateProductDto: UpdateProductDto, userId: string): Promise<ProductDocument | null> {
    return this.productModel.findOneAndUpdate(
      { _id: id, userId }, 
      updateProductDto, 
      { new: true }
    ).exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async deleteByUser(id: string, userId: string): Promise<boolean> {
    const result = await this.productModel.findOneAndDelete({ _id: id, userId }).exec();
    return result !== null;
  }

  async updateStock(id: string, stockChange: number): Promise<ProductDocument | null> {
    const product = await this.findById(id);
    if (!product) {
      return null;
    }

    // If product has variants, update the first variant's stock
    // Otherwise, create a default variant
    if (!product.variants || product.variants.length === 0) {
      product.variants = [{
        id: 'default',
        purchasedPrice: product.purchasedPrice,
        sellingPrice: product.sellingPrice,
        stock: 0
      }];
    }

    const defaultVariant = product.variants[0];
    const newStock = defaultVariant.stock + stockChange;
    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }

    defaultVariant.stock = newStock;
    return this.productModel.findByIdAndUpdate(
      id,
      { variants: product.variants },
      { new: true }
    ).exec();
  }

  async updateStockByUser(id: string, stockChange: number, userId: string): Promise<ProductDocument | null> {
    const product = await this.findByIdAndUser(id, userId);
    if (!product) {
      return null;
    }

    // If product has variants, update the first variant's stock
    // Otherwise, create a default variant
    if (!product.variants || product.variants.length === 0) {
      product.variants = [{
        id: 'default',
        purchasedPrice: product.purchasedPrice,
        sellingPrice: product.sellingPrice,
        stock: 0
      }];
    }

    const defaultVariant = product.variants[0];
    const newStock = defaultVariant.stock + stockChange;
    if (newStock < 0) {
      throw new Error('Insufficient stock');
    }

    defaultVariant.stock = newStock;
    return this.productModel.findOneAndUpdate(
      { _id: id, userId },
      { variants: product.variants },
      { new: true }
    ).exec();
  }

  async findAvailableProducts(): Promise<ProductDocument[]> {
    return this.productModel.find({
      'variants.stock': { $gt: 0 }
    }).exec();
  }

  async findAvailableProductsByUser(userId: string): Promise<ProductDocument[]> {
    return this.productModel.find({
      userId,
      'variants.stock': { $gt: 0 }
    }).exec();
  }
} 