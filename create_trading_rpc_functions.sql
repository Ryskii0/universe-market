-- ============================================================================
-- 交易 RPC 函数：买入和卖出
-- 核心机制：所有选项的价格总和必须始终等于 1（概率总和 = 100%）
-- ============================================================================

-- 删除已存在的函数（如果存在）
DROP FUNCTION IF EXISTS buy_share(UUID, UUID, NUMERIC, UUID);
DROP FUNCTION IF EXISTS sell_share(UUID, UUID, NUMERIC, UUID);

-- ============================================================================
-- RPC 函数：买入份额
-- ============================================================================
CREATE OR REPLACE FUNCTION buy_share(
    p_market_id UUID,
    p_outcome_id UUID,
    p_amount NUMERIC,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_balance NUMERIC;
    v_current_price NUMERIC;
    v_new_price NUMERIC;
    v_shares NUMERIC;
    v_price_change NUMERIC;
    v_total_price NUMERIC;
    v_other_outcomes RECORD;
    v_price_adjustment NUMERIC;
    v_execution_price NUMERIC;
    v_actual_amount NUMERIC;
BEGIN
    -- 1. 检查用户余额
    SELECT balance INTO v_user_balance
    FROM users
    WHERE id = p_user_id;
    
    IF v_user_balance IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF v_user_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- 2. 获取当前价格
    SELECT current_price INTO v_current_price
    FROM outcomes
    WHERE id = p_outcome_id AND market_id = p_market_id;
    
    IF v_current_price IS NULL THEN
        RAISE EXCEPTION 'Outcome not found';
    END IF;
    
    -- 3. 计算价格影响（滑点）：买入时价格上涨
    -- 价格变化 = 投入金额 * 0.0001（可调整的滑点系数）
    v_price_change := p_amount * 0.0001;
    v_new_price := LEAST(0.99, v_current_price + v_price_change);
    v_execution_price := (v_current_price + v_new_price) / 2; -- 平均价格作为执行价格
    
    -- 4. 计算能获得的份额（使用执行价格）
    v_shares := p_amount / v_execution_price;
    v_actual_amount := v_shares * v_execution_price; -- 实际扣除的金额
    
    -- 5. 更新用户余额
    UPDATE users
    SET balance = balance - v_actual_amount
    WHERE id = p_user_id;
    
    -- 6. 更新目标选项的价格
    UPDATE outcomes
    SET current_price = v_new_price,
        volume = volume + v_shares
    WHERE id = p_outcome_id;
    
    -- 7. 关键：调整其他选项的价格，保持总和为 1
    -- 计算需要从其他选项减少的总价格
    v_price_adjustment := v_new_price - v_current_price;
    
    -- 获取该市场的所有其他选项
    FOR v_other_outcomes IN
        SELECT id, current_price
        FROM outcomes
        WHERE market_id = p_market_id AND id != p_outcome_id
    LOOP
        -- 按比例减少其他选项的价格
        -- 确保价格不会低于 0.01
        UPDATE outcomes
        SET current_price = GREATEST(0.01, current_price - (v_price_adjustment * (v_other_outcomes.current_price / (1 - v_current_price))))
        WHERE id = v_other_outcomes.id;
    END LOOP;
    
    -- 8. 归一化：确保所有选项价格总和 = 1
    SELECT SUM(current_price) INTO v_total_price
    FROM outcomes
    WHERE market_id = p_market_id;
    
    IF v_total_price != 1.0 THEN
        -- 按比例调整所有选项，使总和 = 1
        UPDATE outcomes
        SET current_price = current_price / v_total_price
        WHERE market_id = p_market_id;
    END IF;
    
    -- 9. 更新市场总交易量
    UPDATE markets
    SET volume = volume + v_actual_amount
    WHERE id = p_market_id;
    
    -- 10. 更新或创建持仓
    INSERT INTO positions (user_id, market_id, outcome_id, shares, avg_price)
    VALUES (p_user_id, p_market_id, p_outcome_id, v_shares, v_execution_price)
    ON CONFLICT (user_id, market_id, outcome_id) DO UPDATE
    SET shares = positions.shares + v_shares,
        avg_price = (positions.shares * positions.avg_price + v_shares * v_execution_price) / (positions.shares + v_shares);
    
    -- 11. 返回结果
    RETURN json_build_object(
        'shares', v_shares,
        'price', v_execution_price,
        'amount', v_actual_amount
    );
END;
$$;

-- ============================================================================
-- RPC 函数：卖出份额
-- ============================================================================
CREATE OR REPLACE FUNCTION sell_share(
    p_market_id UUID,
    p_outcome_id UUID,
    p_shares_to_sell NUMERIC,
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_shares NUMERIC;
    v_current_price NUMERIC;
    v_new_price NUMERIC;
    v_price_change NUMERIC;
    v_total_price NUMERIC;
    v_other_outcomes RECORD;
    v_price_adjustment NUMERIC;
    v_execution_price NUMERIC;
    v_amount_received NUMERIC;
BEGIN
    -- 1. 检查用户持仓
    SELECT shares INTO v_user_shares
    FROM positions
    WHERE user_id = p_user_id 
      AND market_id = p_market_id 
      AND outcome_id = p_outcome_id;
    
    IF v_user_shares IS NULL OR v_user_shares < p_shares_to_sell THEN
        RAISE EXCEPTION 'Insufficient shares';
    END IF;
    
    -- 2. 获取当前价格
    SELECT current_price INTO v_current_price
    FROM outcomes
    WHERE id = p_outcome_id AND market_id = p_market_id;
    
    IF v_current_price IS NULL THEN
        RAISE EXCEPTION 'Outcome not found';
    END IF;
    
    -- 3. 计算价格影响（滑点）：卖出时价格下降
    v_price_change := (p_shares_to_sell * v_current_price) * 0.0001;
    v_new_price := GREATEST(0.01, v_current_price - v_price_change);
    v_execution_price := (v_current_price + v_new_price) / 2; -- 平均价格作为执行价格
    
    -- 4. 计算能收回的能量
    v_amount_received := p_shares_to_sell * v_execution_price;
    
    -- 5. 更新用户余额
    UPDATE users
    SET balance = balance + v_amount_received
    WHERE id = p_user_id;
    
    -- 6. 更新目标选项的价格
    UPDATE outcomes
    SET current_price = v_new_price,
        volume = volume - p_shares_to_sell
    WHERE id = p_outcome_id;
    
    -- 7. 关键：调整其他选项的价格，保持总和为 1
    -- 计算需要增加到其他选项的总价格
    v_price_adjustment := v_current_price - v_new_price;
    
    -- 获取该市场的所有其他选项
    FOR v_other_outcomes IN
        SELECT id, current_price
        FROM outcomes
        WHERE market_id = p_market_id AND id != p_outcome_id
    LOOP
        -- 按比例增加其他选项的价格
        -- 确保价格不会超过 0.99
        UPDATE outcomes
        SET current_price = LEAST(0.99, current_price + (v_price_adjustment * (v_other_outcomes.current_price / (1 - v_current_price))))
        WHERE id = v_other_outcomes.id;
    END LOOP;
    
    -- 8. 归一化：确保所有选项价格总和 = 1
    SELECT SUM(current_price) INTO v_total_price
    FROM outcomes
    WHERE market_id = p_market_id;
    
    IF v_total_price != 1.0 THEN
        -- 按比例调整所有选项，使总和 = 1
        UPDATE outcomes
        SET current_price = current_price / v_total_price
        WHERE market_id = p_market_id;
    END IF;
    
    -- 9. 更新市场总交易量
    UPDATE markets
    SET volume = volume + v_amount_received
    WHERE id = p_market_id;
    
    -- 10. 更新持仓
    UPDATE positions
    SET shares = shares - p_shares_to_sell
    WHERE user_id = p_user_id 
      AND market_id = p_market_id 
      AND outcome_id = p_outcome_id;
    
    -- 如果持仓为 0 或负数，删除记录
    DELETE FROM positions
    WHERE user_id = p_user_id 
      AND market_id = p_market_id 
      AND outcome_id = p_outcome_id
      AND shares <= 0;
    
    -- 11. 返回结果
    RETURN json_build_object(
        'shares', p_shares_to_sell,
        'price', v_execution_price,
        'amount', v_amount_received
    );
END;
$$;

-- ============================================================================
-- 说明：
-- 1. 买入时：目标选项涨价，其他选项按比例跌价，总和保持 1
-- 2. 卖出时：目标选项跌价，其他选项按比例涨价，总和保持 1
-- 3. 每次交易后都会归一化，确保总和严格等于 1.0
-- 4. 滑点系数：0.0001（可根据需要调整）
-- 5. 价格范围：0.01 - 0.99
-- ============================================================================

