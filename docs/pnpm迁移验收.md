# pnpm 迁移与验收

日期：2026-11-18。后台基线 a43c415，配对前台基线 ac67d79。用户确认前后台统一 pnpm 12.3.4；两仓保持独立锁文件，CI 和部署使用 Node 24。本次不执行生产发布。

## 变更目的

原后台由 npm 锁文件和 npm CI 交付，未跟踪的 pnpm 文件没有接入流水线且引入了版本升级。重新从原 npm 锁文件导入，补齐干净安装、生成类型、测试、构建与提交检查。

## 影响范围

删除 package-lock.json 和仅供 npm 的 legacy-peer-deps 配置，声明精确 packageManager 并提交 pnpm-lock.yaml。42 项直接依赖解析版本与原 npm 锁一致；测试直接使用的 history 明确加入开发依赖。pnpm-workspace.yaml 使用 nodeLinker: hoisted，保留 Umi 的扁平依赖布局；allowBuilds 明确批准现有依赖脚本，postinstall 自动 max setup。pmOnFail: error 使版本不符直接失败。

脚本、lint-staged、commit-msg、CI、部署和 README 都改用 pnpm。两份工作流先设置 Node 24，再安装 pnpm 12.3.4，以 frozen-lockfile 安装。npm 仅用于安装 pnpm 工具。前台同步修复 pnpm 版本和配置的部署传输，不改业务逻辑、URL、发布状态或数据库结构。

## 验证结果

干净副本的 frozen-lockfile 安装通过，自动 max setup 完成；安装前后锁文件与批准配置一致。实施者本机为 Node 22.23.3 / pnpm 12.3.4，后台 Jest 18 项、tsc 和生产构建通过。配对前台干净安装、Vitest 35 项、类型检查、lint、构建通过；仅生产依赖安装后 Prisma 生成、隔离只读查询及 sharp 图片编码通过。四份 YAML 与远程脚本 bash -n 通过。配对 Playwright 18 项通过，覆盖后台登录、CRUD、详情失败禁保存和发布，以及公开站与订阅回归。只连接 blog_test，未操作演示或正式数据。

coverage/update 脚本 showConfig 确认 collectCoverage=true 和 updateSnapshot=all，参数正确传入 Jest，未写快照。配对前台在 Docker Node 24 / Linux、pnpm 12.3.4、PM2 7.1.2 验证旧入口替换、重复重载和首次启动三场景通过。

独立只读评审继续复用原会话：覆盖率/快照参数与配对前台旧 PM2 入口两项 P2 已修复并复核通过，Docker 三场景及首次重启风险已补充。提交后 Node 24 / Linux CI 结果以本轮 PR checks 为准。正式服务器、实际部署和生产内容审计未验收。

## 风险与回滚

不同时运行安装与开发进程，不复用旧 npm node_modules 或 .umi。Umi/React 18 的已有 peer 告警仍存在，本次不顺带升级框架。回滚时配对恢复 npm 配置、npm 锁和工作流，重新 npm ci/max setup；不能只替换锁文件。保留当前安全鉴权和数据库结构。
