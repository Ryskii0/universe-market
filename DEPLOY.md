# 部署指南

## 📋 部署前准备

### 1. 环境变量配置

**本地开发：**
- 创建 `.env.local` 文件（已加入 .gitignore，不会上传到 GitHub）
- 添加以下内容：
```
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_KEY=你的Supabase匿名密钥
```

**Vercel 部署：**
- 在 Vercel 项目设置 → Environment Variables 中添加：
  - `VITE_SUPABASE_URL` = 你的 Supabase 项目 URL
  - `VITE_SUPABASE_KEY` = 你的 Supabase 匿名密钥

### 2. 数据库初始化

在 Supabase SQL Editor 中按顺序执行以下 SQL 文件：

1. `supabase_setup.sql` - 创建基础表结构和认证系统
2. `migrate_users.sql` - （如果从旧系统迁移）迁移用户数据
3. `create_trading_rpc_functions.sql` - 创建交易相关的 RPC 函数
4. `create_admin_rpc_functions.sql` - 创建管理员相关的 RPC 函数
5. `create_settle_market_rpc.sql` - 创建结算相关的 RPC 函数
6. `create_reset_user_rpc.sql` - 创建用户重置相关的 RPC 函数
7. `create_analytics_table.sql` - 创建数据分析表（可选）

## 🚀 GitHub 部署步骤

### 1. 初始化 Git 仓库

```bash
cd byte-market-main
git init
git add .
git commit -m "Initial commit: Universe Market"
```

### 2. 创建 GitHub 仓库并推送

```bash
# 在 GitHub 上创建新仓库（例如：universe-market）
# 然后执行：
git remote add origin https://github.com/你的用户名/universe-market.git
git branch -M main
git push -u origin main
```

### 3. 连接到 Vercel

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "Import Project"
3. 选择你的 GitHub 仓库
4. 在 "Environment Variables" 中添加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_KEY`
5. 点击 "Deploy"

## 📁 需要上传的文件

✅ **需要上传：**
- `src/` - 所有源代码
- `package.json` 和 `package-lock.json` - 依赖配置
- `tsconfig.json` - TypeScript 配置
- `vite.config.ts` - Vite 构建配置
- `index.html` - 入口 HTML
- `*.sql` - 数据库初始化脚本（供参考）
- `.gitignore` - Git 忽略规则
- `README.md` - 项目说明

❌ **不需要上传（已在 .gitignore 中）：**
- `node_modules/` - 依赖包（Vercel 会自动安装）
- `.env.local` - 本地环境变量（包含敏感信息）
- `dist/` - 构建产物（Vercel 会自动构建）
- `.DS_Store` - macOS 系统文件

## 🔒 安全注意事项

- ✅ `.env.local` 已加入 .gitignore，不会上传到 GitHub
- ✅ Supabase 密钥只在 Vercel 环境变量中配置
- ⚠️ 不要在代码中硬编码任何密钥或敏感信息

## 📝 项目名称

当前项目文件夹名为 `byte-market-main`，你可以：
1. 保持文件夹名称不变（GitHub 仓库名可以不同）
2. 或者重命名文件夹为 `universe-market`（需要更新所有引用）

## 🎯 快速检查清单

部署前确认：
- [ ] `.env.local` 已创建且包含正确的 Supabase 配置
- [ ] `.gitignore` 已包含 `.env.local`
- [ ] 所有 SQL 文件已在 Supabase 中执行
- [ ] GitHub 仓库已创建
- [ ] Vercel 环境变量已配置

