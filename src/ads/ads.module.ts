import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AdCompetitionGroup } from '../entities/ad-competition-group.entity';
import { Ad } from '../entities/ad.entity';
import { AdDelivery } from '../entities/ad-delivery.entity';
import { AdPlacement } from '../entities/ad-placement.entity';
import { AdminAdsController } from './admin-ads.controller';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ad, AdDelivery, AdPlacement, AdCompetitionGroup]),
    AuthModule,
  ],
  controllers: [AdsController, AdminAdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
