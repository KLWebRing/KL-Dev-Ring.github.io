// ── KL DevVerse — Wallet Controller ──────────────────────────────────
// HTTP endpoints for wallet operations.
// All routes require authentication.

import { Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';

@Controller('economy/wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * GET /economy/wallet
   * Returns the player's full wallet state.
   */
  @Get()
  async getWallet(@Request() req: { user: { sub: string } }) {
    return this.walletService.getWallet(req.user.sub);
  }

  /**
   * POST /economy/wallet/claim-daily
   * Claim the daily login reward.
   */
  @Post('claim-daily')
  async claimDailyReward(@Request() req: { user: { sub: string } }) {
    return this.walletService.claimDailyReward(req.user.sub);
  }

  /**
   * GET /economy/wallet/transactions?page=1&limit=50
   * Get paginated transaction history.
   */
  @Get('transactions')
  async getTransactions(
    @Request() req: { user: { sub: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactionHistory(
      req.user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 100) : 50,
    );
  }
}
