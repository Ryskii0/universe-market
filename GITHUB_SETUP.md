# GitHub 仓库设置步骤

## 第一步：在 GitHub 网页端创建仓库

1. 访问 https://github.com/new
2. 填写仓库信息：
   - **Repository name**: `universe-market`
   - **Description**: `预测市场游戏 - Universe Market`
   - **Visibility**: 选择 Public 或 Private（根据你的需求）
   - ⚠️ **重要**: 不要勾选以下选项：
     - ❌ Add a README file
     - ❌ Add .gitignore
     - ❌ Choose a license
   （因为本地已有这些文件）

3. 点击 "Create repository"

## 第二步：连接本地仓库并推送

创建完仓库后，GitHub 会显示一个页面，上面有命令。或者直接执行以下命令：

```bash
cd /Users/bytedance/Downloads/code/universe-market-main

# 添加远程仓库
git remote add origin https://github.com/Ryskii0/universe-market.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

## 完成！

推送成功后，访问 https://github.com/Ryskii0/universe-market 就能看到你的代码了。

## 后续更新代码

以后修改代码后，执行：

```bash
git add .
git commit -m "描述你的修改"
git push
```

