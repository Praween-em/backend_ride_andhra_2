import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './payment.entity';
import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';

import { MigrationService } from './migration.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Wallet, WalletTransaction])],
  controllers: [PaymentsController],
  providers: [PaymentsService, MigrationService],
  exports: [PaymentsService],
})
export class PaymentsModule { }
