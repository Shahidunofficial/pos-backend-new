import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sale, SaleDocument } from './SaleSchema';
import { Product, ProductDocument } from './ProductSchema';

export interface SalesOverview {
  todaysSales: number;
  todaysRevenue: number;
  monthToDateSales: number;
  monthToDateRevenue: number;
  activeOrders: number;
  topSellingProducts: ProductSalesReport[];
}

export interface DailySalesReport {
  date: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit:number;
  averageOrderValue: number;
  transactions: SaleDocument[];
}

export interface MonthlySalesReport {
  month: string;
  year: number;
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  dailyBreakdown: DailySalesReport[];
}

export interface ProductSalesReport {
  productId: string;
  productName: string;
  quantitySold: number;
  totalRevenue: number;
  averagePrice: number;
}

export interface ProfitOfSale{
  saleId:string;
  profit:number;
  saleDate:Date;

}

@Injectable()
export class SalesReportService {
  constructor(
    @InjectModel('Sale') private saleModel: Model<SaleDocument>,
    @InjectModel('Product') private productModel: Model<ProductDocument>,
  ) {}

  async getSalesOverview(): Promise<SalesOverview> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const [todaySales, monthSales, productSales] = await Promise.all([
      this.saleModel.find({
        createdAt: { $gte: today, $lte: todayEnd }
      }).exec(),
      this.saleModel.find({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      }).exec(),
      this.getProductSalesReport()
    ]);

    const todaysRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const monthToDateRevenue = monthSales.reduce((sum, sale) => sum + sale.total, 0);

    return {
      todaysSales: todaySales.length,
      todaysRevenue,
      monthToDateSales: monthSales.length,
      monthToDateRevenue,
      activeOrders: 0, // This would need to be implemented based on your order status system
      topSellingProducts: productSales.slice(0, 5),
    };
  }

  async getSalesOverviewByUser(userId: string): Promise<SalesOverview> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const [todaySales, monthSales, productSales] = await Promise.all([
      this.saleModel.find({
        userId,
        createdAt: { $gte: today, $lte: todayEnd }
      }).exec(),
      this.saleModel.find({
        userId,
        createdAt: { $gte: monthStart, $lte: monthEnd }
      }).exec(),
      this.getProductSalesReportByUser(userId)
    ]);

    const todaysRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const monthToDateRevenue = monthSales.reduce((sum, sale) => sum + sale.total, 0);

    return {
      todaysSales: todaySales.length,
      todaysRevenue,
      monthToDateSales: monthSales.length,
      monthToDateRevenue,
      activeOrders: 0,
      topSellingProducts: productSales.slice(0, 5),
    };
  }

  async getDailySalesReport(date: string): Promise<DailySalesReport> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const sales = await this.saleModel
      .find({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .populate('items.productId')
      .exec();

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit= sales.reduce((sum,sale)=>sum+sale.profit,0);

    return {
      date,
      totalSales: sales.length,
      totalRevenue,
      totalProfit,
      averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      transactions: sales,
    };
  }

  async getDailySalesReportByUser(date: string, userId: string): Promise<DailySalesReport> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // in sales include the daily profit

    const sales = await this.saleModel
      .find({
        userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .populate('items.productId')
      .exec();

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit= sales.reduce((sum,sale)=>sum+sale.profit,0);

    return {
      date,
      totalSales: sales.length,
      totalRevenue,
      totalProfit,
      averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      transactions: sales,
    };
  }

  async getMonthlySalesReport(month: number, year: number): Promise<MonthlySalesReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const sales = await this.saleModel
      .find({
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .exec();

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

    // Create daily breakdown
    const dailyBreakdown: DailySalesReport[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const daySales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= dayStart && saleDate <= dayEnd;
      });

      const dayRevenue = daySales.reduce((sum, sale) => sum + sale.total, 0);

      dailyBreakdown.push({
        date: dateStr,
        totalSales: daySales.length,
        totalRevenue: dayRevenue,
        totalProfit: daySales.reduce((sum, sale) => sum + sale.profit, 0),
        averageOrderValue: daySales.length > 0 ? dayRevenue / daySales.length : 0,
        transactions: daySales,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return {
      month: monthNames[month - 1],
      year,
      totalSales: sales.length,
      totalRevenue,
      averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      dailyBreakdown,
    };
  }

  async getMonthlySalesReportByUser(month: number, year: number, userId: string): Promise<MonthlySalesReport> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const sales = await this.saleModel
      .find({
        userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .exec();

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);

    // Create daily breakdown
    const dailyBreakdown: DailySalesReport[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const daySales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= dayStart && saleDate <= dayEnd;
      });

      const dayRevenue = daySales.reduce((sum, sale) => sum + sale.total, 0);

      dailyBreakdown.push({
        date: dateStr,
        totalSales: daySales.length,
        totalRevenue: dayRevenue,
        totalProfit: daySales.reduce((sum, sale) => sum + sale.profit, 0),
        averageOrderValue: daySales.length > 0 ? dayRevenue / daySales.length : 0,
        transactions: daySales,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return {
      month: monthNames[month - 1],
      year,
      totalSales: sales.length,
      totalRevenue,
      averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
      dailyBreakdown,
    };
  }

  async getProductSalesReport(): Promise<ProductSalesReport[]> {
    const sales = await this.saleModel
      .find()
      .populate('items.productId')
      .exec();

    const productStats = new Map<string, ProductSalesReport>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = item.productId as any;
        if (!product) return;

        const productId = product._id.toString();
        const stats = productStats.get(productId) || {
          productId,
          productName: product.name,
          quantitySold: 0,
          totalRevenue: 0,
          averagePrice: 0,
        };

        stats.quantitySold += item.quantity;
        stats.totalRevenue += item.price * item.quantity;
        stats.averagePrice = stats.totalRevenue / stats.quantitySold;

        productStats.set(productId, stats);
      });
    });

    return Array.from(productStats.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  async getProductSalesReportByUser(userId: string): Promise<ProductSalesReport[]> {
    const sales = await this.saleModel
      .find({ userId })
      .populate('items.productId')
      .exec();

    const productStats = new Map<string, ProductSalesReport>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = item.productId as any;
        if (!product) return;

        const productId = product._id.toString();
        const stats = productStats.get(productId) || {
          productId,
          productName: product.name,
          quantitySold: 0,
          totalRevenue: 0,
          averagePrice: 0,
        };

        stats.quantitySold += item.quantity;
        stats.totalRevenue += item.price * item.quantity;
        stats.averagePrice = stats.totalRevenue / stats.quantitySold;

        productStats.set(productId, stats);
      });
    });

    return Array.from(productStats.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  async getSalesByDateRange(startDate: string, endDate: string): Promise<SaleDocument[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.saleModel
      .find({
        createdAt: {
          $gte: start,
          $lte: end,
        },
      })
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getSalesByDateRangeByUser(startDate: string, endDate: string, userId: string): Promise<SaleDocument[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return this.saleModel
      .find({
        userId,
        createdAt: {
          $gte: start,
          $lte: end,
        },
      })
      .populate('items.productId')
      .sort({ createdAt: -1 })
      .exec();
  }
}
