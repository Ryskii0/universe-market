import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Market, User, Position, Transaction, MarketStatus, Outcome, PriceHistoryPoint, TimeRange, LeaderboardEntry, ChatMessage } from '../types';

// ------------------------------------------------------------------
// CONFIGURATION: ENVIRONMENT VARIABLES
// ------------------------------------------------------------------
// 修改点：改为从环境变量读取。
// 本地运行时，它会读取 .env 文件
// Vercel 部署时，它会读取 Vercel 的后台配置
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ""; 
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || ""; 

// 增加一个简单的检查，方便调试
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("⚠️ Supabase 环境变量未配置！请检查 .env 文件或 Vercel 设置。");
}


// ------------------------------------------------------------------

export interface ApiService {
  register(username: string, password: string): Promise<void>;
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  selectRole(role: 'INTERN' | 'FULL_TIME'): Promise<User>;
  resetMyRole(): Promise<void>; 
  resetUserRoleByUsername(username: string, newBalance?: number): Promise<void>;

  getMarkets(): Promise<Market[]>;
  getMarket(id: string): Promise<Market | undefined>;
  createMarket(question: string, description: string, outcomesStr: string, endDate: string): Promise<Market>;
  deleteMarket(id: string): Promise<void>; 
  updateMarketStatus(id: string, status: MarketStatus): Promise<void>;

  buy(marketId: string, outcomeId: string, amount: number): Promise<void>;
  sell(marketId: string, outcomeId: string, shares: number): Promise<void>;
  
  getUserPositions(userId: string): Promise<Position[]>;
  getMarketHistory(marketId: string, range: TimeRange): Promise<PriceHistoryPoint[]>;
  getMarketTransactions(marketId: string): Promise<Transaction[]>;
  
  getLeaderboard(): Promise<LeaderboardEntry[]>;

  // Chat
  getChatMessages(): Promise<ChatMessage[]>;
  sendChatMessage(content: string): Promise<void>;

  // Admin
  triggerDailyCost(): Promise<void>;
  settleMarket(marketId: string, winningOutcomeId: string, finalPrice: number): Promise<void>;
  addPoints(username: string, points: number): Promise<void>;
  airdropPointsToActiveUsers(amount: number): Promise<number>; // For Event C
  getUserAllTransactions(userId: string): Promise<Transaction[]>;
}

// ============================================================================
// REAL IMPLEMENTATION (Supabase)
// ============================================================================
class SupabaseApi implements ApiService {
  public supabase: SupabaseClient;

  constructor(url: string, key: string) {
    this.supabase = createClient(url, key);
  }

  async register(username: string, password: string): Promise<void> {
    const { data, error } = await this.supabase.rpc('register_user', {
      p_username: username,
      p_password: password
    });
    if (error) throw new Error(error.message);
    
    // 保存 token 到 localStorage
    if (data?.token) {
      localStorage.setItem('supabase_token', data.token);
    }
  }

  async login(username: string, password: string): Promise<void> {
    const { data, error } = await this.supabase.rpc('login_user', {
      p_username: username,
      p_password: password
    });
    if (error) throw new Error(error.message);
    
    // 保存 token 到 localStorage
    if (data?.token) {
      localStorage.setItem('supabase_token', data.token);
    }
  }

  async logout(): Promise<void> {
    const token = localStorage.getItem('supabase_token');
    if (token) {
      try {
        await this.supabase.rpc('logout_user', { p_token: token });
      } catch (e) {
        console.warn('Logout RPC failed:', e);
      }
    }
    localStorage.removeItem('supabase_token');
  }

  async logUserLogin(userId: string): Promise<void> {
    try {
      await this.supabase.rpc('log_user_login', { p_user_id: userId });
    } catch (e) {
      console.warn('Failed to log user login:', e);
    }
  }

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('supabase_token');
    if (!token) return null;

    try {
      const { data, error } = await this.supabase.rpc('get_user_by_token', { p_token: token });
      if (error) {
        // Token 无效或过期，清除
        localStorage.removeItem('supabase_token');
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        username: data.username,
        isAdmin: data.is_admin || false,
        balance: data.balance || 0,
        role: data.role,
        isBankrupt: (data.balance || 0) <= 0,
        portfolioValue: 0
      };
    } catch (e) {
      console.error('Failed to get current user:', e);
      localStorage.removeItem('supabase_token');
      return null;
    }
  }

  async selectRole(role: 'INTERN' | 'FULL_TIME'): Promise<User> {
      const user = await this.getCurrentUser();
      if (!user) throw new Error("Login required");
      
      const { data, error } = await this.supabase.rpc('select_user_role', {
        p_user_id: user.id,
        p_role: role
      });
      
      if (error) throw new Error(error.message);
      
      // 刷新用户信息
      return await this.getCurrentUser() as User;
  }
  
  async resetMyRole(): Promise<void> {
      const user = await this.getCurrentUser();
      if (!user) return;
      await this.supabase.rpc('reset_user_role', { p_user_id: user.id });
  }

  async resetUserRoleByUsername(username: string, newBalance?: number): Promise<void> {
      const { error } = await this.supabase.rpc('reset_user_by_username', {
        p_username: username,
        p_new_balance: newBalance || null
      });
      if (error) throw new Error(error.message);
  }

  async getMarkets(): Promise<Market[]> {
    const { data: markets, error } = await this.supabase.from('markets').select('*').order('created_at', { ascending: false });
    if (error) {
        console.warn("Failed to fetch markets:", error);
        return [];
    }
    
    const { data: outcomes, error: outcomesError } = await this.supabase.from('outcomes').select('*');
    
    if (outcomesError) {
        console.warn("Failed to fetch outcomes:", outcomesError);
    }
    
    return markets.map((m: any) => ({
        id: m.id,
        question: m.question,
        description: m.description,
        status: m.status,
        endDate: m.end_date,
        totalVolume: m.volume,
        createdAt: m.created_at,
        winningOutcomeId: m.winning_outcome_id,
        finalPrice: m.final_price, 
        outcomes: outcomes?.filter((o: any) => o.market_id === m.id).map((o: any) => ({
            id: o.id,
            name: o.name,
            description: o.description || '',
            price: o.current_price || 0,
            volume: o.volume || 0,
            priceChange24h: 0 
        })).sort((a:any, b:any) => a.name.localeCompare(b.name)) || []
    }));
  }

  async getMarket(id: string): Promise<Market | undefined> {
     const markets = await this.getMarkets();
     return markets.find(m => m.id === id);
  }

  async createMarket(question: string, description: string, outcomesStr: string, endDate: string): Promise<Market> {
    // 1. Create Market
    const { data: market, error } = await this.supabase.from('markets').insert({
        question, description, end_date: endDate, status: 'OPEN', volume: 0
    }).select().single();
    
    if (error) throw new Error(`Market creation failed: ${error.message}`);
    
    try {
        const names = outcomesStr.split(/[,，]/).map(s => s.trim()).filter(s => s.length > 0);
        const initialPrice = 1 / names.length;
        const outcomeInserts = names.map(name => ({
            market_id: market.id,
            name,
            description: '', 
            current_price: initialPrice,
            volume: 0
        }));
        
        const { data: insertedOutcomes, error: outcomesError } = await this.supabase
            .from('outcomes')
            .insert(outcomeInserts)
            .select();

        if (outcomesError) throw new Error(outcomesError.message);

        // Snapshot initial price
        const historyInserts = insertedOutcomes!.map((o: any) => ({
            market_id: market.id,
            outcome_id: o.id,
            price: o.current_price,
            created_at: new Date().toISOString()
        }));
        await this.supabase.from('price_history').insert(historyInserts);

        return await this.getMarket(market.id) as Market;

    } catch (err: any) {
        await this.supabase.from('markets').delete().eq('id', market.id);
        throw new Error(`Failed to create outcomes: ${err.message}`);
    }
  }

  async deleteMarket(id: string): Promise<void> {
      console.log(`Starting DELETE for market ${id}...`);

      // 1. Delete Transactions (Must come first, they reference Outcomes and Markets)
      const { error: txError } = await this.supabase.from('transactions').delete().eq('market_id', id);
      if (txError) {
          console.error("Delete transactions failed:", txError);
          throw new Error(`Deletion Halted: Could not delete transactions. ${txError.message}`);
      }

      // 2. Delete Positions (References Outcomes and Markets)
      const { error: posError } = await this.supabase.from('positions').delete().eq('market_id', id);
      if (posError) {
          console.error("Delete positions failed:", posError);
          throw new Error(`Deletion Halted: Could not delete positions. ${posError.message}`);
      }

      // 3. Delete Price History (References Markets)
      const { error: phError } = await this.supabase.from('price_history').delete().eq('market_id', id);
      if (phError) {
          console.error("Delete price_history failed:", phError);
          throw new Error(`Deletion Halted: Could not delete price history. ${phError.message}`);
      }

      // 4. Delete Outcomes (References Markets)
      const { error: oError } = await this.supabase.from('outcomes').delete().eq('market_id', id);
      if (oError) {
          console.error("Delete outcomes failed:", oError);
          throw new Error(`Deletion Halted: Could not delete outcomes. ${oError.message}`);
      }

      // 5. Delete Market
      const { error: mError } = await this.supabase.from('markets').delete().eq('id', id);
      if (mError) {
          console.error("Delete market failed:", mError);
          throw new Error(`Deletion Halted: Could not delete market. ${mError.message}`);
      }

      console.log(`Market ${id} deleted successfully.`);
  }

  async updateMarketStatus(id: string, status: MarketStatus): Promise<void> {
      const { error } = await this.supabase.from('markets').update({ status }).eq('id', id).select();
      if (error) throw new Error(error.message);
  }

  // Helper to record history after trade
  private async _recordPriceHistory(marketId: string) {
      const { data: outcomes } = await this.supabase.from('outcomes').select('*').eq('market_id', marketId);
      if (!outcomes) return;
      
      const historyInserts = outcomes.map((o: any) => ({
            market_id: marketId,
            outcome_id: o.id,
            price: o.current_price,
            created_at: new Date().toISOString()
      }));
      await this.supabase.from('price_history').insert(historyInserts);
  }
  
  // Helper to log transaction with robust error handling
  private async _logTransaction(userId: string, marketId: string, outcomeId: string, type: 'BUY'|'SELL', amount: number, shares: number, price: number) {
      try {
          const { error } = await this.supabase.from('transactions').insert({
              user_id: userId,
              market_id: marketId,
              outcome_id: outcomeId,
              type,
              amount,
              shares,
              price
          });
          if (error) {
             console.error("Failed to log transaction:", JSON.stringify(error));
          }
      } catch (e: any) {
          console.error("Exception logging transaction:", e);
      }
  }

  async buy(marketId: string, outcomeId: string, amount: number): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Login required");

    // 1. Execute Trade via RPC
    const { error } = await this.supabase.rpc('buy_share', {
        p_market_id: marketId,
        p_outcome_id: outcomeId,
        p_amount: amount,
        p_user_id: user.id
    });
    if (error) throw new Error(error.message);

    // 2. Fetch updated state to record history and log transaction
    await this._recordPriceHistory(marketId);
    
    // 3. Log Transaction strictly
    const { data: outcome } = await this.supabase.from('outcomes').select('current_price').eq('id', outcomeId).single();
    if (outcome) {
        await this._logTransaction(user.id, marketId, outcomeId, 'BUY', amount, amount/outcome.current_price, outcome.current_price);
        
        // Analytics: 记录首单和用户价值指标
        try {
            await this.supabase.rpc('log_first_trade', { p_user_id: user.id });
            await this.supabase.rpc('update_user_value_metrics', { p_user_id: user.id, p_trade_amount: amount });
        } catch (e) {
            console.warn('Analytics tracking failed:', e);
        }
    }
  }

  async sell(marketId: string, outcomeId: string, sharesToSell: number): Promise<void> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Login required");

    const { error } = await this.supabase.rpc('sell_share', {
        p_market_id: marketId,
        p_outcome_id: outcomeId,
        p_shares_to_sell: sharesToSell,
        p_user_id: user.id
    });
    if (error) throw new Error(error.message);

    await this._recordPriceHistory(marketId);
    
    const { data: outcome } = await this.supabase.from('outcomes').select('current_price').eq('id', outcomeId).single();
    if (outcome) {
        const tradeAmount = sharesToSell * outcome.current_price;
        await this._logTransaction(user.id, marketId, outcomeId, 'SELL', tradeAmount, sharesToSell, outcome.current_price);
        
        // Analytics: 记录首单和用户价值指标
        try {
            await this.supabase.rpc('log_first_trade', { p_user_id: user.id });
            await this.supabase.rpc('update_user_value_metrics', { p_user_id: user.id, p_trade_amount: tradeAmount });
        } catch (e) {
            console.warn('Analytics tracking failed:', e);
        }
    }
  }

  async getUserPositions(userId: string): Promise<Position[]> {
    const { data } = await this.supabase.from('positions').select('*').eq('user_id', userId);
    return data?.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        marketId: p.market_id,
        outcomeId: p.outcome_id,
        shares: p.shares,
        avgPrice: p.avg_price
    })) || [];
  }

  async getMarketTransactions(marketId: string): Promise<Transaction[]> {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('market_id', marketId)
        .order('created_at', { ascending: false })
        .limit(50); // Increased limit for fuller history logs
      
      if (error) {
          // Robust error logging to see the actual error message
          console.error("Failed to fetch transactions:", JSON.stringify(error));
          return [];
      }

      return data.map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          marketId: t.market_id,
          outcomeId: t.outcome_id,
          type: t.type,
          amount: t.amount,
          shares: t.shares,
          price: t.price,
          timestamp: t.created_at
      }));
  }

  async getUserAllTransactions(userId: string): Promise<Transaction[]> {
      const { data, error } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
          console.error("Failed to fetch user transactions:", JSON.stringify(error));
          return [];
      }

      return data.map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          marketId: t.market_id,
          outcomeId: t.outcome_id,
          type: t.type,
          amount: t.amount,
          shares: t.shares,
          price: t.price,
          timestamp: t.created_at
      }));
  }

  async getMarketHistory(marketId: string, range: TimeRange): Promise<PriceHistoryPoint[]> {
    const market = await this.getMarket(marketId);
    if (!market || market.outcomes.length === 0) return [];

    const now = new Date();
    let startTime = new Date(0); 
    
    if (range === '1H') startTime = new Date(now.getTime() - 60 * 60 * 1000);
    else if (range === '6H') startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    else if (range === '1D') startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (range === '1W') startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    // 'ALL' defaults to epoch 0

    const { data: historyData } = await this.supabase
        .from('price_history')
        .select('*')
        .eq('market_id', marketId)
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: true });
    
    if (!historyData || historyData.length === 0) {
        // Return two points to ensure a line is drawn if needed, or just one
        const point: PriceHistoryPoint = { time: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
        market.outcomes.forEach(o => point[o.name] = o.price);
        return [point];
    }
    
    const outcomeMap = new Map<string, string>();
    market.outcomes.forEach(o => outcomeMap.set(o.id, o.name));

    const grouped = new Map<string, any>(); 

    historyData.forEach((row: any) => {
        const t = new Date(row.created_at);
        // Important: For 1H/6H/1D, we want granular data if available. 
        t.setSeconds(0, 0);
        
        const timeKey = t.toISOString();

        if (!grouped.has(timeKey)) {
            let label = '';
            const isToday = t.toDateString() === now.toDateString();
            
            if (range === '1H' || range === '6H') {
                 label = t.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            } else {
                 label = isToday 
                    ? t.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                    : `${t.getMonth()+1}/${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2,'0')}`;
            }

            grouped.set(timeKey, {
                time: label,
                rawTime: t.getTime() // store raw for sorting
            });
        }
        const point = grouped.get(timeKey);
        const name = outcomeMap.get(row.outcome_id);
        if (name) point[name] = parseFloat(row.price);
    });

    let result = Array.from(grouped.values())
        .sort((a,b) => a.rawTime - b.rawTime)
        .map(({rawTime, ...rest}) => rest); 

    // Always add "Now" to connect the line to the right edge
    const finalPoint: PriceHistoryPoint = { time: 'Now' };
    market.outcomes.forEach(o => finalPoint[o.name] = o.price);
    result.push(finalPoint);

    return result;
  }
  
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, username, balance')
        .order('balance', { ascending: false })
        .limit(5);
        
      if (error) return [];
      
      return data.map((d: any) => ({
          userId: d.id,
          username: d.username,
          balance: d.balance || 0
      }));
  }

  async getChatMessages(): Promise<ChatMessage[]> {
      const { data, error } = await this.supabase
        .from('global_chat')
        .select('*')
        .order('created_at', { ascending: true }) // Oldest first for chat log
        .limit(100);

      if (error) return []; // Fail silently or log
      
      return data.map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          username: m.username,
          content: m.content,
          createdAt: m.created_at
      }));
  }

  async sendChatMessage(content: string): Promise<void> {
      const user = await this.getCurrentUser();
      if (!user) return;
      
      await this.supabase.from('global_chat').insert({
          user_id: user.id,
          username: user.username,
          content
      });
  }

  async triggerDailyCost(): Promise<void> {
      const { data: users, error } = await this.supabase.from('users').select('*');
      if (error) throw error;
      if (!users) return;

      for (const u of users) {
          if (!u.role) continue;
          const cost = u.role === 'INTERN' ? 30 : 150;
          await this.supabase.from('users').update({ balance: (u.balance || 0) - cost }).eq('id', u.id);
      }
  }

  async settleMarket(marketId: string, winningOutcomeId: string, finalPrice: number): Promise<void> {
     const token = localStorage.getItem('supabase_token');
     if (!token) throw new Error("Login required");
     
     // 调用后端 Supabase RPC 函数，一次性完成：更新状态、发钱、清算
     const { error } = await this.supabase.rpc('settle_market_and_payout', {
         p_market_id: marketId,
         p_winning_outcome_id: winningOutcomeId,
         p_final_price: finalPrice,
         p_token: token
     });

     if (error) {
         console.error("Settlement RPC failed:", error);
         throw new Error(`CRITICAL: Settlement failed. ${error.message}`);
     }

     console.log("Settlement complete via RPC.");
  }

  async addPoints(username: string, points: number): Promise<void> {
    const { error } = await this.supabase.rpc('add_points_to_user', {
      p_username: username,
      p_points: points
    });
    if (error) throw new Error(error.message);
  }

  async airdropPointsToActiveUsers(amount: number): Promise<number> {
      // Changed to 1 hour (1 * 60 * 60 * 1000)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      // Get all transactions first
      const { data: txs, error } = await this.supabase.from('transactions')
        .select('user_id')
        .gte('created_at', oneHourAgo);
        
      if (error) throw new Error(error.message);
      if (!txs || txs.length === 0) return 0;
      
      const uniqueUserIds = Array.from(new Set(txs.map((t: any) => t.user_id)));
      
      // 使用 RPC 批量添加积分
      const { data, error: rpcError } = await this.supabase.rpc('airdrop_points_to_users', {
        p_user_ids: uniqueUserIds,
        p_points: amount
      });
      
      if (rpcError) throw new Error(rpcError.message);
      
      return data || 0;
  }
}

export const api: ApiService = new SupabaseApi(SUPABASE_URL, SUPABASE_KEY);
