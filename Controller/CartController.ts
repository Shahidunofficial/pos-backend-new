import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CartService, AddToCartDto, UpdateCartItemDto } from '../service/CartService';
import { CartDocument } from '../models/CartSchema';
import { UserRole } from '../models/UserModel';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Request() req): Promise<CartDocument> {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }
    return this.cartService.getCart(req.user.sub);
  }

  @Post('add')
  async addToCart(
    @Body() addToCartDto: AddToCartDto,
    @Request() req
  ): Promise<CartDocument> {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }
    return this.cartService.addToCart(req.user.sub, addToCartDto);
  }

  @Put(':productId')
  async updateCartItem(
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @Request() req
  ): Promise<CartDocument> {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }
    return this.cartService.updateCartItem(req.user.sub, productId, updateCartItemDto);
  }

  @Delete(':productId')
  async removeFromCart(
    @Param('productId') productId: string,
    @Request() req
  ): Promise<CartDocument> {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }
    return this.cartService.removeFromCart(req.user.sub, productId);
  }

  @Delete()
  async clearCart(@Request() req): Promise<CartDocument> {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new HttpException('Unauthorized', HttpStatus.FORBIDDEN);
    }
    return this.cartService.clearCart(req.user.sub);
  }
}
