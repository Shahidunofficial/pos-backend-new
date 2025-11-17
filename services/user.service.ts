import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from '../models/UserModel';
import { LoginDto } from '../dto/login.dto';
import { StoreSignupDto } from '../dto/signup.dto';
import { CreateCashierDto } from '../dto/create-cashier.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';

const JWT_SECRET = '324253235DEWFSFSFS'; // Hardcoded secret for development

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService
  ) {}

  async login(loginDto: LoginDto) {
    const { email, username, password, role } = loginDto;

    // Find user by email (admin) or username (cashier) and role
    const query = role === UserRole.ADMIN 
      ? { email, role } 
      : { username, role };
    
    const user = await this.userModel.findOne(query);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { 
      sub: user._id, 
      email: user.email,
      username: user.username,
      role: user.role,
      name: user.name
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        name: user.name
      }
    };
  }

  async validateUser(email: string, role: string): Promise<any> {
    const user = await this.userModel.findOne({ email, role });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  async customerSignup(signupDto: { email: string; password: string; name: string }) {
    const { email, password, name } = signupDto;

    // Check if customer already exists
    const existingCustomer = await this.userModel.findOne({ 
      email, 
      role: UserRole.CUSTOMER 
    });
    
    if (existingCustomer) {
      throw new ConflictException('Customer account already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create customer user
    const customer = new this.userModel({
      email,
      password: hashedPassword,
      role: UserRole.CUSTOMER,
      name
    });

    await customer.save();

    // Generate JWT token
    const payload = { 
      sub: customer._id, 
      email: customer.email, 
      role: customer.role,
      name: customer.name
    };

    return {
      message: 'Customer account created successfully',
      access_token: this.jwtService.sign(payload),
      user: {
        id: customer._id,
        email: customer.email,
        role: customer.role,
        name: customer.name
      }
    };
  }

  async customerLogin(loginDto: { email: string; password: string }) {
    const { email, password } = loginDto;

    // Find customer by email
    const user = await this.userModel.findOne({ email, role: UserRole.CUSTOMER });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { 
      sub: user._id, 
      email: user.email,
      role: user.role,
      name: user.name
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    };
  }

  async storeSignup(signupDto: StoreSignupDto) {
    const { storeName, adminEmail, adminPassword, adminName } = signupDto;

    // Check if admin already exists
    const existingAdmin = await this.userModel.findOne({ 
      email: adminEmail, 
      role: UserRole.ADMIN 
    });
    
    if (existingAdmin) {
      throw new ConflictException('Admin account already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const admin = new this.userModel({
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.ADMIN,
      name: adminName
    });

    await admin.save();

    // Generate JWT token
    const payload = { 
      sub: admin._id, 
      email: admin.email, 
      role: admin.role,
      name: admin.name
    };

    return {
      message: 'Store setup completed successfully',
      access_token: this.jwtService.sign(payload),
      user: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        name: admin.name
      }
    };
  }

  async createCashier(createCashierDto: CreateCashierDto, adminId: string) {
    const { username, password, name } = createCashierDto;

    // Verify admin exists
    const admin = await this.userModel.findById(adminId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Only admins can create cashier accounts');
    }

    // Check if cashier already exists
    const existingCashier = await this.userModel.findOne({ 
      username, 
      role: UserRole.CASHIER 
    });
    
    if (existingCashier) {
      throw new ConflictException('Cashier account with this username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create cashier user
    const cashier = new this.userModel({
      username,
      password: hashedPassword,
      role: UserRole.CASHIER,
      name
    });

    await cashier.save();

    return {
      message: 'Cashier account created successfully',
      user: {
        id: cashier._id,
        username: cashier.username,
        role: cashier.role,
        name: cashier.name
      }
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Find user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedNewPassword;
    user.updatedAt = new Date();
    await user.save();

    return {
      message: 'Password changed successfully'
    };
  }

  async getAllCashiers(adminId: string) {
    // Verify admin
    const admin = await this.userModel.findById(adminId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Only admins can view cashier accounts');
    }

    const cashiers = await this.userModel
      .find({ role: UserRole.CASHIER })
      .select('-password')
      .sort({ createdAt: -1 });

    return cashiers;
  }

  async deleteCashier(cashierId: string, adminId: string) {
    // Verify admin
    const admin = await this.userModel.findById(adminId);
    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Only admins can delete cashier accounts');
    }

    const cashier = await this.userModel.findOneAndDelete({ 
      _id: cashierId, 
      role: UserRole.CASHIER 
    });

    if (!cashier) {
      throw new UnauthorizedException('Cashier not found');
    }

    return {
      message: 'Cashier account deleted successfully'
    };
  }
}
