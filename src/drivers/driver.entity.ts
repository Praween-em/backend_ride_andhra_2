import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../users/user.entity';
import { VehicleType } from '../rides/ride.entity';
import { DriverDocument } from './driver-document.entity';

@Entity('drivers')
export class Driver {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  user_id: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column()
  license_number: string;

  @Column()
  vehicle_details: string;

  @Column({
    type: 'enum',
    enum: VehicleType,
    enumName: 'vehicle_type_enum',
    nullable: true, // Set to true temporarily for migration
  })
  vehicle_type: VehicleType;

  @Column({ default: false })
  is_online: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_seen_at: Date;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  current_latitude: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  current_longitude: number;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  current_location: string;
  
  @OneToMany(() => DriverDocument, (document) => document.driver)
  documents: DriverDocument[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
