import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from '../models/ProductSchema';

@Controller('reports')
export class InventoryAnalysisController {
  constructor(
    @InjectModel('Product') private productModel: Model<Product>
  ) {}

  @Get('inventory-analysis')
  async getInventoryAnalysis() {
    try {
      const products = await this.productModel.find().exec();
      
      const productDetails = products.map(product => {
        const currentStock = product.variants.reduce((total, variant) => total + variant.stock, 0);
        const purchasePrice = product.purchasedPrice;
        const sellingPrice = product.sellingPrice;
        const investedAmount = currentStock * purchasePrice;
        const expectedProfit = currentStock * (sellingPrice - purchasePrice);
        
        return {
          productId: product._id,
          productName: product.name,
          currentStock,
          purchasePrice,
          sellingPrice,
          promotionalPrice: product.promotionalPrice,
          investedAmount,
          expectedProfit
        };
      });

      const totalInvestedAmount = productDetails.reduce((total, product) => total + product.investedAmount, 0);
      const expectedProfit = productDetails.reduce((total, product) => total + product.expectedProfit, 0);
      const currentStockValue = productDetails.reduce((total, product) => total + (product.currentStock * product.sellingPrice), 0);

      return {
        totalInvestedAmount,
        expectedProfit,
        currentStockValue,
        products: productDetails
      };
    } catch (error) {
      throw new Error('Failed to generate inventory analysis');
    }
  }
} 