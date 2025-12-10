import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { VehicleType } from './ride.entity';
import { FareTier } from './fare-tier.entity';

@Entity('fare_settings')
export class FareSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: VehicleType,
    enumName: 'vehicle_type',
    unique: true,
  })
  vehicle_type: VehicleType;

  @Column('decimal', { precision: 12, scale: 2 })
  base_fare: number;

  @Column('decimal', { precision: 10, scale: 4 })
  per_km_rate: number;

  @Column('decimal', { precision: 10, scale: 4 })
  per_minute_rate: number;

  @Column('decimal', { precision: 12, scale: 2 })
  minimum_fare: number;

  @Column('decimal', { precision: 6, scale: 3, default: 1.0 })
  surge_multiplier: number;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => FareTier, (tier) => tier.fare_setting, {
    cascade: true,
  })
  tiers: FareTier[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
