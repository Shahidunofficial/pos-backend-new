import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../models/OrderSchema';
import { Cart, CartDocument } from '../models/CartSchema';
import { Product, ProductDocument } from '../models/ProductSchema';

export interface CreateOrderDto {
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>
  ) {}

  async createOrder(userId: string, createOrderDto: CreateOrderDto): Promise<OrderDocument> {
    const cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!cart || cart.items.length === 0) {
      throw new HttpException('Cart is empty', HttpStatus.BAD_REQUEST);
    }

    // Verify stock availability and update product stock
    for (const item of cart.items) {
      const product = await this.productModel.findById(item.productId);
      if (!product) {
        throw new HttpException(`Product ${item.productId} not found`, HttpStatus.NOT_FOUND);
      }
      
      // Calculate total stock from variants
      const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) || 0;
      
      if (totalStock < item.quantity) {
        throw new HttpException(`Insufficient stock for product ${product.name}`, HttpStatus.BAD_REQUEST);
      }
      
      // Update product stock (deduct from first available variants)
      let remainingQuantity = item.quantity;
      for (const variant of product.variants) {
        if (remainingQuantity <= 0) break;
        if (variant.stock > 0) {
          const deductAmount = Math.min(variant.stock, remainingQuantity);
          variant.stock -= deductAmount;
          remainingQuantity -= deductAmount;
        }
      }
      await product.save();
    }

    // Create order
    const order = await this.orderModel.create({
      userId: new Types.ObjectId(userId),
      items: cart.items,
      total: cart.total,
      status: OrderStatus.PENDING,
      shippingAddress: createOrderDto.shippingAddress,
    });

    // Clear cart after successful order creation
    await this.cartModel.findByIdAndUpdate(cart._id, { $set: { items: [] } });

    return order;
  }

  async getOrders(userId: string): Promise<OrderDocument[]> {
    return this.orderModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
  }

  async getOrderById(userId: string, orderId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId)
    });

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return order;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<OrderDocument> {
    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      { $set: { status } },
      { new: true }
    );

    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    return order;
  }
}
