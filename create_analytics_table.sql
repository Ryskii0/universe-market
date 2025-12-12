-- ============================================================================
-- Analytics 表：用于追踪用户行为数据
-- ============================================================================

-- 创建 analytics 表
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- UX 效率指标
    login_at TIMESTAMP WITH TIME ZONE,           -- 登录时间
    first_trade_at TIMESTAMP WITH TIME ZONE,     -- 首单时间
    time_to_first_trade_seconds INTEGER,         -- 从登录到首单耗时（秒）
    
    -- 用户价值指标
    total_trade_count INTEGER DEFAULT 0,         -- 总交易次数
    total_trade_volume NUMERIC DEFAULT 0,        -- 总交易额（E）
    last_trade_at TIMESTAMP WITH TIME ZONE,      -- 最后交易时间
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_login_at ON user_analytics(login_at);
CREATE INDEX IF NOT EXISTS idx_analytics_first_trade_at ON user_analytics(first_trade_at);

-- 创建 RPC 函数：记录登录时间
CREATE OR REPLACE FUNCTION log_user_login(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_analytics (user_id, login_at)
    VALUES (p_user_id, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET login_at = NOW(),
        updated_at = NOW();
END;
$$;

-- 创建 RPC 函数：记录首单
CREATE OR REPLACE FUNCTION log_first_trade(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_login_at TIMESTAMP WITH TIME ZONE;
    v_first_trade_at TIMESTAMP WITH TIME ZONE;
    v_time_to_first_trade INTEGER;
BEGIN
    -- 获取登录时间
    SELECT login_at INTO v_login_at
    FROM user_analytics
    WHERE user_id = p_user_id;
    
    -- 检查是否已有首单记录
    SELECT first_trade_at INTO v_first_trade_at
    FROM user_analytics
    WHERE user_id = p_user_id AND first_trade_at IS NOT NULL;
    
    -- 如果已有首单记录，直接返回
    IF v_first_trade_at IS NOT NULL THEN
        RETURN json_build_object('is_first_trade', false);
    END IF;
    
    -- 记录首单时间
    v_first_trade_at := NOW();
    
    -- 计算耗时（如果有登录时间）
    IF v_login_at IS NOT NULL THEN
        v_time_to_first_trade := EXTRACT(EPOCH FROM (v_first_trade_at - v_login_at))::INTEGER;
    END IF;
    
    -- 更新或插入记录
    INSERT INTO user_analytics (user_id, first_trade_at, time_to_first_trade_seconds)
    VALUES (p_user_id, v_first_trade_at, v_time_to_first_trade)
    ON CONFLICT (user_id) DO UPDATE
    SET first_trade_at = v_first_trade_at,
        time_to_first_trade_seconds = v_time_to_first_trade,
        updated_at = NOW();
    
    RETURN json_build_object(
        'is_first_trade', true,
        'time_to_first_trade_seconds', v_time_to_first_trade
    );
END;
$$;

-- 创建 RPC 函数：更新用户价值指标
CREATE OR REPLACE FUNCTION update_user_value_metrics(
    p_user_id UUID,
    p_trade_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO user_analytics (user_id, total_trade_count, total_trade_volume, last_trade_at)
    VALUES (p_user_id, 1, p_trade_amount, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET total_trade_count = user_analytics.total_trade_count + 1,
        total_trade_volume = user_analytics.total_trade_volume + p_trade_amount,
        last_trade_at = NOW(),
        updated_at = NOW();
END;
$$;

-- 注意：需要添加唯一约束确保每个用户只有一条 analytics 记录
-- 如果表已存在，先删除可能存在的重复数据
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_analytics_user_id_key'
    ) THEN
        ALTER TABLE user_analytics ADD CONSTRAINT user_analytics_user_id_key UNIQUE (user_id);
    END IF;
END $$;

