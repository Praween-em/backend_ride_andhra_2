import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User, UserRole } from '../users/user.entity';

// These enums should ideally be in their own files and shared,
// but for now, defining them here to match ride_andhra.sql
export enum VehicleType {
  CAB = 'cab',
  BIKE = 'bike',
  AUTO = 'auto',
  BIKE_LITE = 'bike_lite',
  PARCEL = 'parcel',
  PREMIUM = 'premium',
}

export enum RideStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_DRIVERS = 'no_drivers',
}

@Entity('rides')
export class Ride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  rider_id: string;

  @Column({ type: 'uuid', nullable: true })
  driver_id: string;

  // Relationships
  @ManyToOne(() => User)
  @JoinColumn({ name: 'rider_id' })
  rider: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  // Pickup details
  @Column('decimal', { precision: 10, scale: 6 })
  pickup_latitude: number;

  @Column('decimal', { precision: 10, scale: 6 })
  pickup_longitude: number;

  @Column('text')
  pickup_address: string;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  pickup_location: string;

  // Dropoff details
  @Column('decimal', { precision: 10, scale: 6 })
  dropoff_latitude: number;

  @Column('decimal', { precision: 10, scale: 6 })
  dropoff_longitude: number;

  @Column('text')
  dropoff_address: string;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  dropoff_location: string;

  // Ride details
  @Column({
    type: 'enum',
    enum: VehicleType,
    enumName: 'vehicle_type_enum',
  })
  vehicle_type: VehicleType;

  @Column({ name: 'estimated_distance_km', type: 'decimal', precision: 8, scale: 2, nullable: true })
  estimated_distance_km: number;

  @Column({ name: 'estimated_duration_min', type: 'integer', nullable: true })
  estimated_duration_min: number;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  estimated_fare: number;

  // Actual ride metrics
  @Column({ name: 'actual_distance_km', type: 'decimal', precision: 8, scale: 2, nullable: true })
  actual_distance_km: number;

  @Column({ name: 'actual_duration_min', type: 'integer', nullable: true })
  actual_duration_min: number;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  final_fare: number;

  // Timestamps
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  requested_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  accepted_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  // Status and metadata
  @Column({
    type: 'enum',
    enum: RideStatus,
    enumName: 'ride_status_enum',
    default: RideStatus.PENDING,
  })
  status: RideStatus;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
    nullable: true,
  })
  cancelled_by: UserRole;

  // Ratings
  @Column({ type: 'integer', nullable: true })
  rider_rating: number;

  @Column({ type: 'integer', nullable: true })
  driver_rating: number;

  @Column({ type: 'text', nullable: true })
  rider_review: string;

  @Column({ type: 'text', nullable: true })
  driver_review: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
