-- ============================================================================
-- 创建重置用户功能的 RPC 函数
-- 用于给破产用户重新开始的机会
-- ============================================================================

-- 删除已存在的函数（如果存在）
DROP FUNCTION IF EXISTS reset_user_completely(UUID, NUMERIC);
DROP FUNCTION IF EXISTS reset_user_by_username(TEXT, NUMERIC);

-- ============================================================================
-- RPC 函数：完全重置用户（通过 user_id）
-- 用于管理员操作，可以重置余额、角色，并清除所有 session
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_user_completely(
    p_user_id UUID,
    p_new_balance NUMERIC DEFAULT NULL  -- 如果为 NULL，则不清除余额
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
BEGIN
    -- 1. 清除该用户的所有 session（强制登出）
    DELETE FROM user_sessions WHERE user_id = p_user_id;
    
    -- 2. 重置角色
    UPDATE users SET role = NULL WHERE id = p_user_id;
    
    -- 3. 如果提供了新余额，则重置余额
    IF p_new_balance IS NOT NULL THEN
        UPDATE users SET balance = p_new_balance WHERE id = p_user_id;
    END IF;
    
    -- 4. 返回结果
    SELECT json_build_object(
        'success', true,
        'user_id', p_user_id,
        'sessions_cleared', true,
        'role_reset', true,
        'balance_reset', p_new_balance IS NOT NULL,
        'new_balance', p_new_balance
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- RPC 函数：通过用户名重置用户（用于管理员后台）
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_user_by_username(
    p_username TEXT,
    p_new_balance NUMERIC DEFAULT NULL  -- 如果为 NULL，则不清除余额
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_result JSON;
BEGIN
    -- 1. 获取用户 ID
    SELECT id INTO v_user_id
    FROM users
    WHERE username = p_username;
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not found'
        );
    END IF;
    
    -- 2. 调用完全重置函数
    SELECT reset_user_completely(v_user_id, p_new_balance) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- 验证函数已创建
-- ============================================================================

SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('reset_user_completely', 'reset_user_by_username')
ORDER BY routine_name;

