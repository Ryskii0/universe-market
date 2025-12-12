# GitHub 推送认证指南

## 问题
推送代码时提示需要用户名和密码，但 GitHub 已不再支持密码认证。

## 解决方案：使用 Personal Access Token

### 第一步：创建 Personal Access Token

1. 访问：https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 填写信息：
   - **Note**: `universe-market-push` (描述用途)
   - **Expiration**: 选择有效期（建议 90 天或 No expiration）
   - **Select scopes**: 勾选 `repo` (完整仓库访问权限)
4. 点击 "Generate token"
5. ⚠️ **重要**: 立即复制 Token（只显示一次！格式类似：`ghp_xxxxxxxxxxxxxxxxxxxx`）

### 第二步：使用 Token 推送

**方式一：在推送时输入**
```bash
cd /Users/bytedance/Downloads/code/universe-market-main
git push -u origin main
```
- Username: `Ryskii0`
- Password: 粘贴你的 Token（不是 GitHub 密码）

**方式二：将 Token 保存到 Keychain（推荐）**
```bash
# 推送时会提示输入用户名和密码
git push -u origin main
# Username: Ryskii0
# Password: 你的Token
# macOS 会自动保存到 Keychain，下次不需要再输入
```

### 第三步：验证

推送成功后，访问 https://github.com/Ryskii0/universe-market 查看你的代码。

## 安全提示

- ✅ Token 已保存在 macOS Keychain，不会泄露
- ⚠️ 如果 Token 泄露，立即在 GitHub 设置中删除并重新生成
- 💡 建议定期更新 Token

