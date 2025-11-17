import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductController } from '../Controller/ProductController';
import { CategoryController } from '../Controller/CategoryController';
import { PublicCategoryController } from '../Controller/PublicCategoryController';
import { SalesReportController } from '../Controller/SalesReportController';
import { InventoryAnalysisController } from '../Controller/InventoryAnalysisController';
import { NewSaleController } from '../Controller/NewSaleController';
import { CartController } from '../Controller/CartController';
import { OrderController } from '../Controller/OrderController';
import { ImageController } from '../Controller/ImageController';
import { Product, ProductSchema } from '../models/ProductSchema';
import { UserController } from '../Controller/UserController';
import { UserService } from '../services/user.service';
import { Category, CategorySchema } from '../models/CategorySchema';
import { Sale, SaleSchema } from '../models/SaleSchema';
import { Cart, CartSchema } from '../models/CartSchema';
import { Order, OrderSchema } from '../models/OrderSchema';
import { ProductService } from '../service/ProductService';
import { SaleService } from '../service/SaleService';
import { CartService } from '../service/CartService';
import { OrderService } from '../service/OrderService';
import { S3Service } from '../services/S3Service';
import { SalesReportService } from '../models/SalesReportModel';
import { User, UserSchema } from '../models/UserModel';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{
        ttl: 60000, // time in milliseconds
        limit: 100,
      }],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 3, // Maximum 3 files
      },
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb+srv://user123:thundershahid@cluster0.ygrmcle.mongodb.net/pos?retryWrites=true&w=majority'),
    PassportModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Sale.name, schema: SaleSchema },
      { name: User.name, schema: UserSchema },
      { name: Cart.name, schema: CartSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    JwtModule.register({
      secret: '324253235DEWFSFSFS', // Hardcoded for development
      global: true,
      signOptions: { 
        expiresIn: '24h',
        algorithm: 'HS256'
      },
    }),
  ],
  controllers: [
    AppController,
    ProductController,
    CategoryController,
    PublicCategoryController,
    SalesReportController,
    UserController,
    InventoryAnalysisController,
    NewSaleController,
    CartController,
    OrderController,
    ImageController,
  ],
  providers: [
    AppService, 
    ProductService, 
    SaleService, 
    SalesReportService,
    UserService,
    CartService,
    OrderService,
    S3Service,
    JwtStrategy
  ],
})
export class AppModule {}
