import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductController } from '../Controller/ProductController';
import { CategoryController } from '../Controller/CategoryController';
import { SalesReportController } from '../Controller/SalesReportController';
import { InventoryAnalysisController } from '../Controller/InventoryAnalysisController';
import { NewSaleController } from '../Controller/NewSaleController';
import { Product, ProductSchema } from '../models/ProductSchema';
import { UserController } from '../Controller/UserController';
import { UserService } from '../services/user.service';
import { Category, CategorySchema } from '../models/CategorySchema';
import { Sale, SaleSchema } from '../models/SaleSchema';
import { ProductService } from '../service/ProductService';
import { SaleService } from '../service/SaleService';
import { SalesReportService } from '../models/SalesReportModel';
import { User, UserSchema } from '../models/UserModel';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb+srv://user123:thundershahid@cluster0.ygrmcle.mongodb.net/pos?retryWrites=true&w=majority'),
    PassportModule,
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Sale.name, schema: SaleSchema },
      { name: User.name, schema: UserSchema },
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
    SalesReportController,
    UserController,
    InventoryAnalysisController,
    NewSaleController,
  ],
  providers: [
    AppService, 
    ProductService, 
    SaleService, 
    SalesReportService,
    UserService,
    JwtStrategy
  ],
})
export class AppModule {}
