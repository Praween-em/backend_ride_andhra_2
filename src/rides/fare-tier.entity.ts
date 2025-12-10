import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { FareSetting } from './fare-setting.entity';
import { VehicleType } from './ride.entity'; // Assuming VehicleType is defined here

@Entity('fare_tiers')
export class FareTier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: VehicleType,
    enumName: 'vehicle_type',
  })
  vehicle_type: VehicleType;

  @ManyToOne(() => FareSetting, (fareSetting) => fareSetting.tiers)
  @JoinColumn({ name: 'vehicle_type', referencedColumnName: 'vehicle_type' })
  fare_setting: FareSetting;

  @Column('decimal', { precision: 10, scale: 3 })
  km_from: number;

  @Column('decimal', { precision: 10, scale: 3 })
  km_to: number;

  @Column('decimal', { precision: 10, scale: 4 })
  per_km_rate: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  per_minute_rate: number | null;
  
  @Column({ default: true })
  is_active: boolean;
  
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  effective_from: Date;
}
