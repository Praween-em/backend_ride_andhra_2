import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../users/user.entity';
import { VehicleType } from '../rides/ride.entity';

// Should be in its own file
export enum DriverStatus {
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('driver_profiles')
export class DriverProfile {
  @PrimaryColumn('uuid')
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50, unique: true })
  license_number: string;

  @Column({ type: 'text', nullable: true })
  license_image: string;

  @Column({ type: 'varchar', length: 12, nullable: true })
  aadhar_number: string;

  @Column({ type: 'text', nullable: true })
  aadhar_image: string;

  @Column({
    type: 'enum',
    enum: VehicleType,
    enumName: 'vehicle_type',
  })
  vehicle_type: VehicleType;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vehicle_model: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  vehicle_color: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  vehicle_plate_number: string;

  @Column({ type: 'text', array: true, nullable: true })
  vehicle_images: string[];

  @Column({ type: 'text', nullable: true })
  rc_document: string;

  @Column({ type: 'text', nullable: true })
  insurance_document: string;

  @Column('decimal', { precision: 2, scale: 1, default: 5.0 })
  driver_rating: number;

  @Column('integer', { default: 0 })
  total_rides: number;

  @Column('decimal', { precision: 12, scale: 2, default: 0.0 })
  earnings_total: number;

  @Column({ default: false })
  is_available: boolean;

  @Column({ default: false })
  is_online: boolean;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  current_latitude: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  current_longitude: number;

  @Column({ type: 'text', nullable: true })
  current_address: string;

  @Column({
    type: 'enum',
    enum: DriverStatus,
    enumName: 'driver_status',
    default: DriverStatus.PENDING_APPROVAL,
  })
  status: DriverStatus;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
