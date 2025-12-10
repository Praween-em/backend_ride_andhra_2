import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { DriverProfile } from './driver-profile.entity';

@Entity('driver_locations')
export class DriverLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  driver_id: string;

  @ManyToOne(() => DriverProfile)
  @JoinColumn({ name: 'driver_id' })
  driver: DriverProfile;

  @Column('decimal', { precision: 10, scale: 6 })
  latitude: number;

  @Column('decimal', { precision: 10, scale: 6 })
  longitude: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  accuracy: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  heading: number;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  speed: number;

  @CreateDateColumn()
  created_at: Date;
}
