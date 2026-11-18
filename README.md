# 博客管理后台

Umi Max / React 18 / Ant Design。后台与前台 API 在独立仓库；两仓使用 pnpm 12.3.4，各自保留 pnpm-lock.yaml，CI 和部署使用 Node 24。

```sh
npm install -g pnpm@12.3.4
pnpm install --frozen-lockfile
pnpm run start:dev
pnpm run test:unit
pnpm run tsc
pnpm run build:prod
```

BLOG_API_BASE_URL 指定 API 地址：本地默认为 http://localhost:3000，生产默认为 https://admin.xylxf.xyz。构建使用明确的 process.env.BASE_API_URL 定义，避免旧 .env 配置覆盖。只在服务器 API 配置管理员凭据，不在浏览器源码或构建 define 中放密码。

管理列表读取摘要，通过 scope=admin 获取完整详情后才允许编辑。笔记正文/分类/标签由本地同步维护，后台支持预览、类型设置、发布/隐藏和删除。系列管理支持完整文章顺序重排；序号冲突由数据库拒绝。封面与编辑器上传统一使用 header token。

创建文章的每个逻辑请求有 UUID Idempotency-Key：网络失败重试保留键，修改内容或成功后换键；没有自动重试写请求。401 清理登录状态，403 保留状态并提示权限。

依赖安装使用 pnpm install --frozen-lockfile，postinstall 会运行 max setup 生成匹配依赖版本的 .umi 类型。pnpm 通过 node-linker=hoisted 保持 Umi 所需的扁平依赖布局；不混用旧 node_modules 或 .umi 生成物。构建脚本批准在 pnpm-workspace.yaml，版本不符会失败，不自动下载替换。Jest 与 jest-environment-jsdom 使用同一主版本。依赖迁移验收见 [docs/pnpm迁移验收.md](docs/pnpm迁移验收.md)。

发布前先让 API 提供 header 验证等兼容能力，再适配后台，最后启用 API 强制鉴权和旧 token URL 停用。旧 API 尚未支持动态草稿前，勿用新界面创建动态。production 部署必须等检查、评审、备份恢复/迁移就绪和配对验收完成。
