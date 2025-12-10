import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver } from './driver.entity';
import { DriverDocument } from './driver-document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Driver, DriverDocument])],
  exports: [TypeOrmModule],
})
export class DriversModule {}