# Git 和 GitHub 设置指南

## 📋 当前状态检查

执行以下命令检查当前状态：

```bash
cd /Users/bytedance/Downloads/code/byte-market-main
git status
git remote -v
```

## 🚀 初始化 Git 仓库（如果还没有）

如果还没有初始化，执行：

```bash
# 1. 初始化 Git 仓库
git init

# 2. 添加所有文件（.gitignore 会自动排除不需要的文件）
git add .

# 3. 提交
git commit -m "Initial commit: Universe Market"
```

## 🔗 连接到 GitHub

### 方式一：连接到已存在的仓库

如果你已经在 GitHub 上创建了仓库：

```bash
# 添加远程仓库（替换为你的实际仓库地址）
git remote add origin https://github.com/你的用户名/仓库名.git

# 或者使用 SSH（如果你配置了 SSH key）
git remote add origin git@github.com:你的用户名/仓库名.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 方式二：创建新仓库

1. 在 GitHub 上创建新仓库（例如：`universe-market`）
2. 不要初始化 README、.gitignore 或 license（因为本地已有）
3. 复制仓库地址，然后执行上面的命令

## ✅ 验证

```bash
# 检查远程仓库
git remote -v

# 检查状态
git status
```

## 📝 后续更新

以后修改代码后：

```bash
git add .
git commit -m "描述你的修改"
git push
```

## 🔒 重要提醒

- ✅ `.env.local` 已在 `.gitignore` 中，不会被上传
- ✅ 敏感信息（Supabase URL/Key）只在本地和 Vercel 环境变量中
- ⚠️ 不要将任何密钥硬编码到代码中

