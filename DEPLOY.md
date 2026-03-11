# TruthSequence 部署指南（Git + Netlify）

## 一、已完成的准备

- ✅ 项目已初始化 Git
- ✅ 已添加 `netlify.toml` 配置文件（与 JadeTycoon-Web 相同结构）
- ✅ 已创建初始提交

## 二、推送到 GitHub

### 1. 在 GitHub 创建新仓库

1. 打开 https://github.com/new
2. 仓库名称建议：`TruthSequence` 或 `truth-sequence`
3. 选择 **Public**，**不要**勾选 “Add a README file”
4. 点击 **Create repository**

### 2. 关联远程仓库并推送

在本地项目目录执行（将 `YOUR_USERNAME` 和 `REPO_NAME` 替换为你的 GitHub 用户名和仓库名）：

```bash
cd d:\AIHTML\TruthSequence

# 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/TruthSequence.git

# 推送到 main 分支（如 GitHub 默认用 main）
git branch -M main
git push -u origin main
```

或使用 SSH：

```bash
git remote add origin git@github.com:YOUR_USERNAME/TruthSequence.git
git branch -M main
git push -u origin main
```

## 三、Netlify 部署

### 方式一：通过 Netlify 网站（推荐）

1. 登录 [Netlify](https://app.netlify.com/)
2. 点击 **Add new site** → **Import an existing project**
3. 选择 **GitHub**，授权后选择刚创建的 `TruthSequence` 仓库
4. Netlify 会自动读取 `netlify.toml` 配置：
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. 点击 **Deploy site** 开始部署

### 方式二：使用 Netlify CLI

```bash
npm install -g netlify-cli
cd d:\AIHTML\TruthSequence
netlify login
netlify init   # 选择 “Create & configure a new site”，关联 GitHub 或直接部署
netlify deploy --prod
```

## 四、后续更新

每次修改后推送即可触发 Netlify 自动部署：

```bash
git add .
git commit -m "feat: 描述你的修改"
git push
```

## 五、配置说明（netlify.toml）

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

- 使用 Vite 构建，输出目录为 `dist`
- SPA 路由：所有路径重定向到 `index.html`，由前端路由接管
