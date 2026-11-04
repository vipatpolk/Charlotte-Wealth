import { Injectable } from '@nestjs/common';

export interface PortfolioSummary {
  clientId: string;
  clientName: string;
  totalNetWorth: number;
  currency: string;
  ytdReturnPercentage: number;
  dayChangeAmount: number;
  dayChangePercentage: number;
  allocations: {
    category: string;
    percentage: number;
    amount: number;
  }[];
  recentTransactions: {
    id: string;
    asset: string;
    type: string;
    amount: number;
    timestamp: string;
    status: string;
  }[];
}

@Injectable()
export class AppService {
  getHello(): string {
    return 'Charlotte Wealth API - Hello World!';
  }

  getHealth() {
    return {
      status: 'healthy',
      service: 'Charlotte Wealth Core API',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  getPortfolio(): PortfolioSummary {
    return {
      clientId: 'CW-CLIENT-001',
      clientName: 'Lady Charlotte',
      totalNetWorth: 2845430.0,
      currency: 'USD',
      ytdReturnPercentage: 18.4,
      dayChangeAmount: 34120.5,
      dayChangePercentage: 1.21,
      allocations: [
        { category: 'US Equities & Tech', percentage: 45, amount: 1280443.5 },
        { category: 'Global Fixed Income', percentage: 25, amount: 711357.5 },
        { category: 'Private Equity & Real Estate', percentage: 20, amount: 569086.0 },
        { category: 'Cash & Liquidity Reserve', percentage: 10, amount: 284543.0 },
      ],
      recentTransactions: [
        {
          id: 'TX-9021',
          asset: 'Vanguard Total Stock Market (VTI)',
          type: 'Buy',
          amount: 25000.0,
          timestamp: new Date().toISOString(),
          status: 'Completed',
        },
        {
          id: 'TX-9020',
          asset: 'Treasury Bond Yield Fund (BND)',
          type: 'Dividend',
          amount: 3820.4,
          timestamp: new Date().toISOString(),
          status: 'Completed',
        },
      ],
    };
  }
}
