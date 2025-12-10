import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { Ride } from './ride.entity';
import { RideRoute } from './ride-route.entity';
import { FareSetting } from './fare-setting.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { FareTier } from './fare-tier.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ride, RideRoute, FareSetting, FareTier]),
    NotificationsModule,
  ],
  controllers: [RidesController],
  providers: [RidesService],
})
export class RidesModule {}
