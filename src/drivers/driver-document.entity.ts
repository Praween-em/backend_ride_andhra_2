import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Driver } from './driver.entity';
import { User } from '../users/user.entity';
import { DocumentStatus } from '../users/user.entity'; // Assuming DocumentStatus is defined in user.entity.ts

@Entity('driver_documents')
export class DriverDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  driver_id: number;

  @ManyToOne(() => Driver)
  @JoinColumn({ name: 'driver_id' })
  driver: Driver;

  @Column()
  document_type: string;

  @Column()
  document_image: string;

  @Column({ nullable: true })
  document_number: string;

  @Column({ type: 'date', nullable: true })
  expiry_date: Date;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    enumName: 'document_status_enum',
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @Column({ type: 'uuid', nullable: true })
  verified_by: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'verified_by' })
  verified_by_user: User;

  @Column({ type: 'timestamp with time zone', nullable: true })
  verified_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}