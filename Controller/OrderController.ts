import { Controller, Get, Post, Body, Param, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OrderService, CreateOrderDto } from '../service/OrderService';
import { OrderDocument, OrderStatus } from '../models/OrderSchema';
import { UserRole } from '../models/UserModel';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('create')
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req
  ): Promise<OrderDocument> {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }
    return this.orderService.createOrder(req.user.sub, createOrderDto);
  }

  @Get('history')
  async getOrders(@Request() req): Promise<OrderDocument[]> {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }
    return this.orderService.getOrders(req.user.sub);
  }

  @Get(':id')
  async getOrderById(
    @Param('id') id: string,
    @Request() req
  ): Promise<OrderDocument> {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }
    return this.orderService.getOrderById(req.user.sub, id);
  }

  // Admin only endpoint to update order status
  @Post(':id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @Request() req
  ): Promise<OrderDocument> {
    if (req.user.role !== UserRole.ADMIN) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }
    return this.orderService.updateOrderStatus(id, status);
  }
}
