import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { FareSetting } from './fare-setting.entity';

@Entity('fare_tiers')
export class FareTier {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => FareSetting)
    @JoinColumn({ name: 'vehicle_type', referencedColumnName: 'vehicle_type' })
    fareSetting: FareSetting;

    // Removed conflicting @Column. Access via fareSetting.vehicle_type or use relation in query.

    @Column('decimal', { precision: 8, scale: 2 })
    km_from: number;

    @Column('decimal', { precision: 8, scale: 2 })
    km_to: number;

    @Column('decimal', { precision: 8, scale: 2 })
    per_km_rate: number;
}
