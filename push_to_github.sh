#!/bin/bash
# GitHub 推送脚本

echo "🔗 连接 GitHub 仓库..."
git remote add origin https://github.com/Ryskii0/universe-market.git 2>/dev/null || echo "远程仓库已存在，跳过..."

echo "📤 推送到 GitHub..."
git branch -M main
git push -u origin main

echo "✅ 完成！访问 https://github.com/Ryskii0/universe-market 查看你的代码"
