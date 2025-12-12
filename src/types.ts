
export enum MarketStatus {
  OPEN = 'OPEN',
  LOCKED = 'LOCKED', 
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED'
}

export type UserRole = 'INTERN' | 'FULL_TIME';

export interface Outcome {
  id: string;
  name: string; // "A"
  description: string; // "≤ 430元"
  price: number; // Current Price (0.01 - 0.99), represents probability
  volume: number; // Total volume traded on this outcome
  priceChange24h: number; // For UI display
}

export interface Market {
  id: string;
  question: string;
  description: string;
  outcomes: Outcome[];
  status: MarketStatus;
  endDate: string;
  totalVolume: number;
  createdAt: string;
  
  // Resolution
  winningOutcomeId?: string | null;
  finalPrice?: number;
}

export interface User {
  id: string; 
  username: string;
  isAdmin: boolean;
  balance: number;
  role?: UserRole | null; 
  portfolioValue: number; // Calculated field
  isBankrupt: boolean;
}

export interface Position {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  shares: number; // Number of shares held
  avgPrice: number; // Average buy-in price
}

export interface Transaction {
  id: string;
  userId: string;
  marketId: string;
  outcomeId: string;
  type: 'BUY' | 'SELL';
  amount: number; // Points spent or received
  shares: number; // Shares bought or sold
  price: number; // Execution price
  timestamp: string;
}

export interface PriceHistoryPoint {
  time: string;
  [key: string]: number | string; // Dynamic keys for outcome names
}

export type TimeRange = '1H' | '6H' | '1D' | '1W' | 'ALL';

export interface LeaderboardEntry {
    userId: string;
    username: string;
    balance: number;
}

export interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    content: string;
    createdAt: string;
}
