import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '../models/CartSchema';
import { Product, ProductDocument } from '../models/ProductSchema';

export interface AddToCartDto {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemDto {
  quantity: number;
}

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>
  ) {}

  async getCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!cart) {
      cart = await this.cartModel.create({ userId: new Types.ObjectId(userId), items: [] });
    }
    return cart;
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto): Promise<CartDocument> {
    const product = await this.productModel.findById(addToCartDto.productId);
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    // Calculate total stock from variants
    const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) || 0;
    
    if (totalStock < addToCartDto.quantity) {
      throw new HttpException('Insufficient stock', HttpStatus.BAD_REQUEST);
    }

    let cart = await this.getCart(userId);
    const existingItemIndex = cart.items.findIndex(
      item => item.productId.toString() === addToCartDto.productId
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + addToCartDto.quantity;
      if (totalStock < newQuantity) {
        throw new HttpException('Insufficient stock', HttpStatus.BAD_REQUEST);
      }
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      cart.items.push({
        productId: new Types.ObjectId(addToCartDto.productId),
        quantity: addToCartDto.quantity,
        price: product.sellingPrice
      });
    }

    return cart.save();
  }

  async updateCartItem(
    userId: string,
    productId: string,
    updateCartItemDto: UpdateCartItemDto
  ): Promise<CartDocument> {
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
    }

    // Calculate total stock from variants
    const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) || 0;
    
    if (totalStock < updateCartItemDto.quantity) {
      throw new HttpException('Insufficient stock', HttpStatus.BAD_REQUEST);
    }

    const cart = await this.getCart(userId);
    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) {
      throw new HttpException('Item not found in cart', HttpStatus.NOT_FOUND);
    }

    cart.items[itemIndex].quantity = updateCartItemDto.quantity;
    return cart.save();
  }

  async removeFromCart(userId: string, productId: string): Promise<CartDocument> {
    const cart = await this.getCart(userId);
    cart.items = cart.items.filter(
      item => item.productId.toString() !== productId
    );
    return cart.save();
  }

  async clearCart(userId: string): Promise<CartDocument> {
    const cart = await this.getCart(userId);
    cart.items = [];
    return cart.save();
  }
}
