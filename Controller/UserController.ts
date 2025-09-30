import { Controller, Post, Body, Get, UseGuards, Request, Put, Delete, Param } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { LoginDto } from '../dto/login.dto';
import { StoreSignupDto } from '../dto/signup.dto';
import { CreateCashierDto } from '../dto/create-cashier.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('auth')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Store signup (first time setup)
  @Post('store-signup')
  async storeSignup(@Body() signupDto: StoreSignupDto) {
    return this.userService.storeSignup(signupDto);
  }

  // Login for existing users
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }

  // Get current user profile
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  // Validate user exists (for frontend email step)
  @Post('validate')
  async validateUser(@Body() { email, role }: { email: string; role: string }) {
    return this.userService.validateUser(email, role);
  }

  // Admin: Create cashier account
  @UseGuards(JwtAuthGuard)
  @Post('cashiers')
  async createCashier(@Body() createCashierDto: CreateCashierDto, @Request() req) {
    return this.userService.createCashier(createCashierDto, req.user.sub);
  }

  // Admin: Get all cashiers
  @UseGuards(JwtAuthGuard)
  @Get('cashiers')
  async getAllCashiers(@Request() req) {
    return this.userService.getAllCashiers(req.user.sub);
  }

  // Admin: Delete cashier
  @UseGuards(JwtAuthGuard)
  @Delete('cashiers/:id')
  async deleteCashier(@Param('id') cashierId: string, @Request() req) {
    return this.userService.deleteCashier(cashierId, req.user.sub);
  }

  // Change password (admin or cashier)
  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(@Body() changePasswordDto: ChangePasswordDto, @Request() req) {
    return this.userService.changePassword(req.user.sub, changePasswordDto);
  }
}