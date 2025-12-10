import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { WalletTransaction } from './wallet-transaction.entity';

@Injectable()
export class PaymentsService {
    constructor(
        @InjectRepository(Wallet)
        private walletRepository: Repository<Wallet>,
        @InjectRepository(WalletTransaction)
        private walletTransactionRepository: Repository<WalletTransaction>,
    ) { }

    async getWalletByUserId(userId: string): Promise<Wallet> {
        console.log(`Fetching wallet for user: ${userId}`);
        try {
            let wallet = await this.walletRepository.findOne({
                where: { user_id: userId },
            });

            // Create wallet if it doesn't exist
            if (!wallet) {
                console.log(`Wallet not found for user ${userId}, creating new one.`);
                wallet = this.walletRepository.create({
                    user_id: userId,
                    balance: 0,
                    currency: 'INR',
                    is_active: true,
                });
                wallet = await this.walletRepository.save(wallet);
                console.log(`Wallet created: ${wallet.id}`);
            } else {
                console.log(`Wallet found: ${wallet.id}`);
            }

            return wallet;
        } catch (error) {
            console.error('Error in getWalletByUserId:', error);
            throw error;
        }
    }

    async getWalletTransactions(userId: string, limit: number = 10): Promise<WalletTransaction[]> {
        try {
            const wallet = await this.getWalletByUserId(userId);

            return this.walletTransactionRepository.find({
                where: { wallet_id: wallet.id },
                order: { created_at: 'DESC' },
                take: limit,
            });
        } catch (error) {
            console.error('Error in getWalletTransactions:', error);
            throw error;
        }
    }
}
