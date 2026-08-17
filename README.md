# my-blog-admin - 个人博客管理后台

基于 [Ant Design Pro](https://pro.ant.design)（Umi Max）构建的个人博客内容管理后台，用于管理博客文章、动态、分类和标签。

## 技术栈

- **框架**: UmiJS Max 4.3.24（Ant Design Pro 预设）
- **UI**: React 18.3.1 + antd 5 + @ant-design/pro-components
- **构建**: mako（Rust 极速打包器）

## 本地启动

后台本身不直接连数据库，所有数据操作都调用 **my-blog** 的 API（`/api/*` 代理到 `localhost:3000`）。因此完整启动顺序是：**隧道 → my-blog → 本后台**。

### 1. 启动数据库隧道（远程 MySQL）

```bash
cd ../my-blog
pnpm tunnel
```

本地 3307 → 远程 3306（依赖 `~/.ssh/config` 中的 `my-blog-db` 别名）。保持终端运行。

### 2. 启动 my-blog API

```bash
cd ../my-blog
pnpm dev
```

http://localhost:3000

### 3. 启动本后台

```bash
cd admin
npm install        # 首次运行
npm run start:dev
```

打开 [http://localhost:8000](http://localhost:8000) 即可访问后台。

> `start:dev` 使用 `MOCK=none`（关闭 mock）并把 `/api/*` 代理到 `http://localhost:3000`（见 `config/proxy.ts`），数据全部来自真实后端。

## 常用命令

```bash
npm run start:dev     # 开发服务器（API 代理到 3000，MOCK 关闭，端口 8000）
npm run start         # 开发服务器（默认 UMI_ENV=dev）
npm run build         # 生产构建
npm run build:prod    # 生产构建（REACT_APP_ENV=prod）
npm run lint          # biome lint + TypeScript 检查
npm run test          # Jest 测试
npm run preview       # 构建后在 8000 端口预览
```

## 登录

登录走 `/api/login`（由 my-blog 校验），账号密码为 **my-blog/.env** 中的 `ADMIN_USERNAME` / `ADMIN_PASSWORD`。

## 目录结构

```
src/
├── pages/             # Welcome、new-post、new-dynamic、new-category、post-manage、dynamic-manage
├── services/nextjs/   # my-blog API 客户端函数
├── app.tsx            # 布局、认证流程、请求配置
└── access.ts          # 权限控制（canAdmin）
config/
├── routes.ts          # 路由配置
└── proxy.ts           # API 代理配置（dev → localhost:3000）
```

## 部署

通过 GitHub Actions 部署到阿里云服务器 `/home/www/my-blog-admin`（静态文件），与 my-blog 各自独立 CI/CD。

## 相关项目

- [my-blog](../my-blog/README.md) - 博客前端展示站 + API 服务
