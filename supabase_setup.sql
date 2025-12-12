-- ============================================================================
-- Supabase 数据库设置 SQL
-- 用于用户名+密码认证系统
-- ============================================================================

-- 1. 创建 users 表（替代原来的 profiles 表）
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    balance NUMERIC DEFAULT 0,
    role TEXT CHECK (role IN ('INTERN', 'FULL_TIME')),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC);

-- 2. 更新 global_chat 表，将 email 改为 username
-- 如果表已存在，需要先删除旧列（如果有）
-- ALTER TABLE global_chat DROP COLUMN IF EXISTS email;
ALTER TABLE global_chat ADD COLUMN IF NOT EXISTS username TEXT;
-- 如果 email 列存在，可以迁移数据后删除
-- UPDATE global_chat SET username = (SELECT username FROM users WHERE users.id = global_chat.user_id);
-- ALTER TABLE global_chat DROP COLUMN IF EXISTS email;

-- 3. 创建 user_sessions 表用于存储会话 token
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

-- 4. 安装 pgcrypto 扩展（用于密码加密）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- RPC 函数：注册用户
-- ============================================================================
CREATE OR REPLACE FUNCTION register_user(
    p_username TEXT,
    p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_token TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 检查用户名是否已存在
    IF EXISTS (SELECT 1 FROM users WHERE username = LOWER(p_username)) THEN
        RAISE EXCEPTION 'Username already exists';
    END IF;
    
    -- 创建用户
    INSERT INTO users (username, password_hash, balance, role, is_admin)
    VALUES (LOWER(p_username), crypt(p_password, gen_salt('bf')), 0, NULL, FALSE)
    RETURNING id INTO v_user_id;
    
    -- 生成 session token（1年有效期，接近永久）
    v_token := gen_random_uuid()::TEXT;
    v_expires_at := NOW() + INTERVAL '1 year';
    
    -- 创建 session
    INSERT INTO user_sessions (user_id, token, expires_at)
    VALUES (v_user_id, v_token, v_expires_at);
    
    -- 返回 token
    RETURN json_build_object('token', v_token, 'user_id', v_user_id);
END;
$$;

-- ============================================================================
-- RPC 函数：用户登录
-- ============================================================================
CREATE OR REPLACE FUNCTION login_user(
    p_username TEXT,
    p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_token TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 验证用户名和密码
    SELECT id INTO v_user_id
    FROM users
    WHERE username = LOWER(p_username)
      AND password_hash = crypt(p_password, password_hash);
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid username or password';
    END IF;
    
    -- 更新最后登录时间
    UPDATE users SET last_login_at = NOW() WHERE id = v_user_id;
    
    -- 生成新的 session token（1年有效期，接近永久）
    v_token := gen_random_uuid()::TEXT;
    v_expires_at := NOW() + INTERVAL '1 year';
    
    -- 删除旧的 session（可选：保留多个设备登录）
    -- DELETE FROM user_sessions WHERE user_id = v_user_id;
    
    -- 创建新 session
    INSERT INTO user_sessions (user_id, token, expires_at)
    VALUES (v_user_id, v_token, v_expires_at);
    
    -- 返回 token
    RETURN json_build_object('token', v_token, 'user_id', v_user_id);
END;
$$;

-- ============================================================================
-- RPC 函数：通过 token 获取用户信息
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_by_token(
    p_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user JSON;
BEGIN
    -- 验证 token 并获取用户信息
    SELECT json_build_object(
        'id', u.id,
        'username', u.username,
        'balance', u.balance,
        'role', u.role,
        'is_admin', u.is_admin
    ) INTO v_user
    FROM users u
    INNER JOIN user_sessions s ON s.user_id = u.id
    WHERE s.token = p_token
      AND s.expires_at > NOW();
    
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired token';
    END IF;
    
    RETURN v_user;
END;
$$;

-- ============================================================================
-- RPC 函数：登出用户
-- ============================================================================
CREATE OR REPLACE FUNCTION logout_user(
    p_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM user_sessions WHERE token = p_token;
END;
$$;

-- ============================================================================
-- RPC 函数：选择角色
-- ============================================================================
CREATE OR REPLACE FUNCTION select_user_role(
    p_token TEXT,
    p_role TEXT,
    p_balance NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_user JSON;
BEGIN
    -- 验证 token 并获取 user_id
    SELECT s.user_id INTO v_user_id
    FROM user_sessions s
    WHERE s.token = p_token
      AND s.expires_at > NOW();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired token';
    END IF;
    
    -- 更新用户角色和余额
    UPDATE users
    SET role = p_role::TEXT,
        balance = p_balance
    WHERE id = v_user_id;
    
    -- 返回更新后的用户信息
    SELECT json_build_object(
        'id', u.id,
        'username', u.username,
        'balance', u.balance,
        'role', u.role,
        'is_admin', u.is_admin
    ) INTO v_user
    FROM users u
    WHERE u.id = v_user_id;
    
    RETURN v_user;
END;
$$;

-- ============================================================================
-- RPC 函数：重置用户角色
-- ============================================================================
CREATE OR REPLACE FUNCTION reset_user_role(
    p_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 验证 token 并获取 user_id
    SELECT s.user_id INTO v_user_id
    FROM user_sessions s
    WHERE s.token = p_token
      AND s.expires_at > NOW();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired token';
    END IF;
    
    -- 重置角色
    UPDATE users SET role = NULL WHERE id = v_user_id;
END;
$$;

-- ============================================================================
-- 清理过期 session 的函数（可选：可以设置定时任务）
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- ============================================================================
-- Row Level Security (RLS) 策略
-- ============================================================================

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- users 表策略：用户可以查看自己的信息，所有人可以查看排行榜（只读）
CREATE POLICY "Users can view own data" ON users
    FOR SELECT
    USING (true); -- 简化：允许所有人查看（排行榜需要）

-- users 表策略：只有通过 RPC 函数可以插入/更新
CREATE POLICY "Only RPC can insert users" ON users
    FOR INSERT
    WITH CHECK (false); -- 只允许通过 RPC 函数注册

CREATE POLICY "Only RPC can update users" ON users
    FOR UPDATE
    USING (false); -- 只允许通过 RPC 函数更新

-- user_sessions 表策略：只允许通过 RPC 函数操作
CREATE POLICY "Only RPC can manage sessions" ON user_sessions
    FOR ALL
    USING (false); -- 只允许通过 RPC 函数操作

-- ============================================================================
-- 注意事项：
-- 1. 这些 RPC 函数使用 SECURITY DEFINER，意味着它们以创建者的权限运行
-- 2. 密码使用 bcrypt 加密（通过 pgcrypto 扩展）
-- 3. Session token 有效期 1 年（接近永久，但建议定期清理过期session）
-- 4. 用户名不区分大小写（存储为小写）
-- 5. 如果已有 profiles 表，需要迁移数据到 users 表
-- ============================================================================

-- ============================================================================
-- 数据迁移 SQL（步骤3和4）- 仅在已有旧数据时执行
-- ============================================================================

-- ============================================================================
-- 步骤3：迁移 profiles 表数据到 users 表
-- profiles 表结构：id (uuid), email (text), balance (numeric), role (text), is_admin (bool)
-- 注意：没有 created_at 列，会使用默认值 NOW()
-- ============================================================================

-- 迁移用户数据
INSERT INTO users (id, username, balance, role, is_admin)
SELECT 
    p.id,
    -- 从 email 提取用户名（去掉 @bytedance.com 部分）
    -- 例如：zhangsan@bytedance.com -> 用户名：zhangsan
    LOWER(SPLIT_PART(p.email, '@', 1)) as username,
    COALESCE(p.balance, 0) as balance,
    p.role,  -- 保留原有角色（INTERN 或 FULL_TIME 或 NULL）
    COALESCE(p.is_admin, FALSE) as is_admin
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.id)
ON CONFLICT (id) DO NOTHING;

-- 重要：迁移后的用户没有密码，需要设置临时密码才能登录
-- 给所有迁移用户设置一个临时默认密码
UPDATE users 
SET password_hash = crypt('TempPass123!', gen_salt('bf'))
WHERE password_hash IS NULL 
  AND id IN (SELECT id FROM profiles);

-- ============================================================================
-- 迁移说明：
-- 1. 用户名：从 email 提取（例如：zhangsan@bytedance.com -> zhangsan）
-- 2. 临时密码：TempPass123! （请通知所有用户修改密码）
-- 3. 角色保留：如果用户已经选择过 INTERN 或 FULL_TIME，会保留
-- 4. 如果用户没有角色（role 为 NULL），登录后会显示选择身份的界面
-- 5. 余额和管理员权限都会保留
-- ============================================================================

-- 步骤4：更新 global_chat 表的 username（如果 global_chat 表存在且已有数据）
UPDATE global_chat gc
SET username = u.username
FROM users u
WHERE gc.user_id = u.id
  AND (gc.username IS NULL OR gc.username = '');

-- ============================================================================
-- 验证迁移结果（可选）
-- ============================================================================
-- 检查迁移了多少用户
-- SELECT COUNT(*) as migrated_users FROM users;

-- 检查迁移用户的角色分布
-- SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- 查看迁移的用户列表
-- SELECT id, username, balance, role, is_admin FROM users ORDER BY username;

