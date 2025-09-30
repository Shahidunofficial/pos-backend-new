import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sale, SaleDocument } from '../models/SaleSchema';

export interface CreateSaleDto {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  customerName?: string;
}

@Injectable()
export class SaleService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
  ) {}

  async create(saleData: { items: Array<{ productId: string; quantity: number; price: number }>; total: number; profit: number; customerName?: string; userId: string }): Promise<SaleDocument> {
    const createdSale = new this.saleModel(saleData);
    return createdSale.save();
  }

  async findAll(): Promise<SaleDocument[]> {
    return this.saleModel.find().populate('items.productId').exec();
  }

  async findAllByUser(userId: string): Promise<SaleDocument[]> {
    return this.saleModel.find({ userId }).populate('items.productId').exec();
  }

  async findById(id: string): Promise<SaleDocument | null> {
    return this.saleModel.findById(id).populate('items.productId').exec();
  }

  async findByIdAndUser(id: string, userId: string): Promise<SaleDocument | null> {
    return this.saleModel.findOne({ _id: id, userId }).populate('items.productId').exec();
  }

  async getSalesReport(startDate?: Date, endDate?: Date): Promise<SaleDocument[]> {
    const query: any = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    return this.saleModel.find(query).populate('items.productId').exec();
  }

  async getSalesReportByUser(userId: string, startDate?: Date, endDate?: Date): Promise<SaleDocument[]> {
    const query: any = { userId };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    return this.saleModel.find(query).populate('items.productId').exec();
  }
} 