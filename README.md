# Universe Market - 预测市场游戏

一个基于 React + TypeScript + Supabase 的预测市场游戏，UI 风格参考 Rick and Morty。

## 🚀 快速开始

### 本地开发

1. **安装依赖**
```bash
npm install
```

2. **配置环境变量**
创建 `.env.local` 文件：
```env
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_KEY=你的Supabase匿名密钥
```

3. **运行开发服务器**
```bash
npm run dev
```

### 数据库初始化

在 Supabase SQL Editor 中按顺序执行：

1. `supabase_setup.sql` - 基础表结构和认证
2. `create_trading_rpc_functions.sql` - 交易功能
3. `create_admin_rpc_functions.sql` - 管理员功能
4. `create_settle_market_rpc.sql` - 结算功能
5. `create_reset_user_rpc.sql` - 用户重置功能
6. `create_analytics_table.sql` - 数据分析（可选）

## 📦 技术栈

- **前端**: React 19 + TypeScript + Vite
- **UI**: Tailwind CSS + Lucide Icons
- **图表**: Recharts
- **后端**: Supabase (PostgreSQL + RPC Functions)
- **部署**: Vercel

## 🔒 安全说明

- `.env.local` 文件已加入 `.gitignore`，不会上传到 GitHub
- 部署到 Vercel 时，请在 Vercel 后台配置环境变量

## 📝 部署

详细部署指南请查看 [DEPLOY.md](./DEPLOY.md)

## 📁 项目结构

```
byte-market-main/
├── src/
│   ├── App.tsx          # 主应用组件
│   ├── main.tsx         # 入口文件
│   ├── types.ts         # TypeScript 类型定义
│   └── services/
│       └── mockStore.ts # API 服务层
├── *.sql                # 数据库初始化脚本
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🎮 功能特性

- ✅ 用户名/密码登录（首次登录自动注册）
- ✅ 角色选择（实习生/正式员工）
- ✅ 市场交易（买入/卖出）
- ✅ 实时价格更新
- ✅ 持仓管理
- ✅ 交易历史
- ✅ 排行榜
- ✅ 管理员面板
- ✅ 市场结算
- ✅ 数据分析追踪

## 📄 License

Private
