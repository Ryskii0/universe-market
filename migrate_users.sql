-- ============================================================================
-- 用户迁移 SQL（步骤3和步骤4）
-- 从 profiles 表迁移到 users 表，并更新 global_chat 表
-- ============================================================================

-- ============================================================================
-- 步骤3：迁移 profiles 表数据到 users 表
-- profiles 表结构：id (uuid), email (text), balance (numeric), role (text), is_admin (bool)
-- ============================================================================

-- 首先：修复已存在但 password_hash 为 NULL 的用户（如果之前迁移失败）
UPDATE users 
SET password_hash = crypt('TempPass123!', gen_salt('bf'))
WHERE password_hash IS NULL;

-- 迁移用户数据（在INSERT时就设置临时密码）
-- 临时密码：TempPass123! （请通知所有用户修改密码）
INSERT INTO users (id, username, password_hash, balance, role, is_admin)
SELECT 
    p.id,
    -- 从 email 提取用户名（去掉 @bytedance.com 部分）
    -- 例如：zhangsan@bytedance.com -> 用户名：zhangsan
    -- 注意：将点号(.)替换为下划线(_)，因为用户名约束只允许字母、数字和下划线
    -- 例如：liulu.roxy@bytedance.com -> 用户名：liulu_roxy
    REPLACE(LOWER(SPLIT_PART(p.email, '@', 1)), '.', '_') as username,
    -- 在插入时就设置临时密码
    crypt('TempPass123!', gen_salt('bf')) as password_hash,
    COALESCE(p.balance, 0) as balance,
    p.role,  -- 保留原有角色（INTERN 或 FULL_TIME 或 NULL）
    COALESCE(p.is_admin, FALSE) as is_admin
FROM profiles p
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 迁移说明：
-- 1. 用户名：从 email 提取，点号(.)会替换为下划线(_)
--    例如：zhangsan@bytedance.com -> zhangsan
--    例如：liulu.roxy@bytedance.com -> liulu_roxy
-- 2. 临时密码：TempPass123! （请通知所有用户修改密码）
-- 3. 角色保留：如果用户已经选择过 INTERN 或 FULL_TIME，会保留
-- 4. 如果用户没有角色（role 为 NULL），登录后会显示选择身份的界面
-- 5. 余额和管理员权限都会保留
-- ============================================================================

-- ============================================================================
-- 步骤4：更新 global_chat 表的 username
-- ============================================================================

-- 更新 global_chat 表的 username（如果 global_chat 表存在且已有数据）
UPDATE global_chat gc
SET username = u.username
FROM users u
WHERE gc.user_id = u.id
  AND (gc.username IS NULL OR gc.username = '');

-- ============================================================================
-- 验证迁移结果（可选）
-- ============================================================================

-- 检查迁移了多少用户
SELECT COUNT(*) as migrated_users FROM users;

-- 检查迁移用户的角色分布
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- 查看迁移的用户列表（前10个）
SELECT id, username, balance, role, is_admin, created_at 
FROM users 
ORDER BY created_at DESC
LIMIT 10;

-- 检查 global_chat 表的 username 更新情况
SELECT COUNT(*) as total_messages, 
       COUNT(username) as messages_with_username,
       COUNT(*) - COUNT(username) as messages_without_username
FROM global_chat;

