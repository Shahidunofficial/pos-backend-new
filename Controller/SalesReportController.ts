import { Controller, Get, Query, HttpException, HttpStatus, UseGuards, Request } from '@nestjs/common';
import {
  SalesReportService,
  DailySalesReport,
  MonthlySalesReport,
  ProductSalesReport,
  SalesOverview,
} from '../models/SalesReportModel';
import { SaleDocument } from '../models/SaleSchema';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class SalesReportController {
  constructor(private readonly salesReportService: SalesReportService) {}
  
  @Get('overview')
  async getSalesOverview(@Request() req): Promise<SalesOverview> {
    try {
      return await this.salesReportService.getSalesOverviewByUser(req.user.sub);
    } catch (error) {
      throw new HttpException('Failed to fetch sales overview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('daily')
  async getDailySalesReport(@Request() req, @Query('date') date?: string): Promise<DailySalesReport> {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      return await this.salesReportService.getDailySalesReportByUser(targetDate, req.user.sub);
    } catch (error) {
      throw new HttpException('Failed to fetch daily sales report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('monthly')
  async getMonthlySalesReport(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string
  ): Promise<MonthlySalesReport> {
    try {
      const today = new Date();
      const targetMonth = month ? parseInt(month) : today.getMonth() + 1;
      const targetYear = year ? parseInt(year) : today.getFullYear();

      if (targetMonth < 1 || targetMonth > 12) {
        throw new HttpException('Invalid month. Must be between 1 and 12', HttpStatus.BAD_REQUEST);
      }

      return await this.salesReportService.getMonthlySalesReportByUser(targetMonth, targetYear, req.user.sub);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to fetch monthly sales report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('products')
  async getProductSalesReport(@Request() req): Promise<ProductSalesReport[]> {
    try {
      return await this.salesReportService.getProductSalesReportByUser(req.user.sub);
    } catch (error) {
      throw new HttpException('Failed to fetch product sales report', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('date-range')
  async getSalesByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Request() req
  ): Promise<SaleDocument[]> {
    try {
      if (!startDate || !endDate) {
        throw new HttpException('Start date and end date are required', HttpStatus.BAD_REQUEST);
      }

      // Validate date format
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new HttpException('Invalid date format. Use YYYY-MM-DD', HttpStatus.BAD_REQUEST);
      }

      if (start > end) {
        throw new HttpException('Start date must be before end date', HttpStatus.BAD_REQUEST);
      }

      return await this.salesReportService.getSalesByDateRangeByUser(startDate, endDate, req.user.sub);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to fetch sales by date range', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('analytics')
  async getAnalytics(@Request() req): Promise<{
    totalSalesThisMonth: number;
    totalSalesLastMonth: number;
    growthPercentage: number;
    topSellingProducts: ProductSalesReport[];
    recentSales: SaleDocument[];
  }> {
    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      const [thisMonthReport, lastMonthReport, productReport] = await Promise.all([
        this.salesReportService.getMonthlySalesReportByUser(currentMonth, currentYear, req.user.sub),
        this.salesReportService.getMonthlySalesReportByUser(lastMonth, lastMonthYear, req.user.sub),
        this.salesReportService.getProductSalesReportByUser(req.user.sub),
      ]);

      // Calculate growth percentage
      const growthPercentage = lastMonthReport.totalRevenue > 0 
        ? ((thisMonthReport.totalRevenue - lastMonthReport.totalRevenue) / lastMonthReport.totalRevenue) * 100
        : 0;

      // Get recent sales (last 10)
      const endDate = today.toISOString().split('T')[0];
      const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const recentSales = await this.salesReportService.getSalesByDateRangeByUser(startDate, endDate, req.user.sub);

      return {
        totalSalesThisMonth: thisMonthReport.totalRevenue,
        totalSalesLastMonth: lastMonthReport.totalRevenue,
        growthPercentage: Math.round(growthPercentage * 100) / 100,
        topSellingProducts: productReport.slice(0, 5),
        recentSales: recentSales.slice(-10),
      };
    } catch (error) {
      throw new HttpException('Failed to fetch analytics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
