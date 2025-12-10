import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class MigrationService implements OnModuleInit {
    constructor(private dataSource: DataSource) { }

    async onModuleInit() {
        console.log('Running manual migration for wallet_transactions...');
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        try {
            await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "wallet_transactions" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "wallet_id" uuid NOT NULL,
          "amount" numeric(10,2) NOT NULL,
          "transaction_type" character varying NOT NULL,
          "reference_type" character varying NOT NULL,
          "reference_id" character varying NOT NULL,
          "description" character varying NOT NULL,
          "balance_after" numeric(10,2) NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_wallet_transactions_id" PRIMARY KEY ("id"),
          CONSTRAINT "FK_wallet_transactions_wallet_id" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )
      `);
            console.log('Manual migration completed: wallet_transactions table created or already exists.');
        } catch (error) {
            console.error('Manual migration failed:', error);
        } finally {
            await queryRunner.release();
        }
    }
}
