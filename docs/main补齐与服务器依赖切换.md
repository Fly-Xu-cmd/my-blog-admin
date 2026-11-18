# main 补齐与服务器依赖切换

日期：2026-11-18。本轮前台 main 基线 `4fa7fb7`，补齐来源 `d6ac02f`（与已合并 #71 的目标分支 `7d2162b` 文件树一致）。

## PR 核对

| 前台 PR | 实际目标 | main 状态 |
| --- | --- | --- |
| [#64](https://github.com/Fly-Xu-cmd/my-blog-front/pull/64) 安全 | main | 已包含 |
| [#65](https://github.com/Fly-Xu-cmd/my-blog-front/pull/65) 列表与正文 | main | 已包含 |
| [#66](https://github.com/Fly-Xu-cmd/my-blog-front/pull/66) 内容模型 | main | 已包含 |
| [#67](https://github.com/Fly-Xu-cmd/my-blog-front/pull/67) 统计与阅读入口 | main | 已包含 |
| [#69](https://github.com/Fly-Xu-cmd/my-blog-front/pull/69) 首页、订阅与主题 | codex/blog-stage-4-front | 已合并到功能分支，尚未进入 main |
| [#70](https://github.com/Fly-Xu-cmd/my-blog-front/pull/70) 系列 API | codex/blog-editorial-layout | 已合并到功能分支，尚未进入 main |
| [#71](https://github.com/Fly-Xu-cmd/my-blog-front/pull/71) pnpm | codex/blog-series-editor-api | 已合并到功能分支，尚未进入 main |

本轮直接从 main 建立 `codex/blog-main-rollup`，纳入后三项全部改动，并补齐服务器依赖切换。新 PR 的目标为 main。

后台最新 main 为 `46a4d4e`，仅包含已合并的阶段一。原 pnpm HEAD `d1a36cc` 与已合并 #36 的目标分支 `bd04f4b` 文件树一致。

| 后台 PR | 实际目标 | main 状态 |
| --- | --- | --- |
| [#31](https://github.com/Fly-Xu-cmd/my-blog-admin/pull/31) 安全 | main | 已包含 |
| [#32](https://github.com/Fly-Xu-cmd/my-blog-admin/pull/32) 列表与正文 | codex/blog-stage-1-admin | 已合并到功能分支，尚未进入 main |
| [#33](https://github.com/Fly-Xu-cmd/my-blog-admin/pull/33) 内容模型 | codex/blog-stage-2-admin | 已合并到功能分支，尚未进入 main |
| [#34](https://github.com/Fly-Xu-cmd/my-blog-admin/pull/34) 统计适配 | codex/blog-stage-3-admin | 已合并到功能分支，尚未进入 main |
| [#35](https://github.com/Fly-Xu-cmd/my-blog-admin/pull/35) 系列管理 | codex/blog-stage-4-admin | 已合并到功能分支，尚未进入 main |
| [#36](https://github.com/Fly-Xu-cmd/my-blog-admin/pull/36) pnpm | codex/blog-series-editor | 已合并到功能分支，尚未进入 main |

后台同样从 main 建立 `codex/blog-main-rollup`，把后五项完整补齐。前后台分别建立直接到 main 的新 PR，不再次依赖层叠功能分支。后续合并前须核对目标分支，防止重复遗漏。

## npm、pnpm 与旧 node_modules

服务器保留 npm。npm 只负责在 appuser 的版本化工具目录安装 pnpm 12.3.4；项目依赖由 pnpm 按锁文件安装。服务器须先准备 Node 24、npm、PM2、realpath、bash 和 Prisma 所需 OpenSSL；脚本在切换应用前校验 Node/pnpm 版本。工具位于 `~/.local/share/blog-tools/pnpm-12.3.4`，不覆盖全局 npm/pnpm 或上一版工具入口。

之前脚本直接在运行目录执行 pnpm install，会复用旧 npm 的 node_modules。本轮改为：

1. 每个 GitHub workflow attempt 使用 `releases/<sha>-<run-id>-<attempt>` 全新目录，上传构建与锁文件，不上传本地 node_modules。已有依赖的发布目录拒绝重用。
2. 上传可直接运行的 next.config.mjs，避免生产配置依赖 TypeScript 开发工具。在新目录 frozen/production/ignore-scripts 安装，Prisma 和新应用使用相同的既有 PM2 环境，显式生成 Prisma 并执行已通过备份恢复门槛的迁移。安装、生成或迁移失败时，原应用与其 node_modules 保持原状。
3. 根目录 .env 文件通过链接共享；上传仍固定使用 `/home/www/uploads`。保留 PM2 既有应用环境和 PORT，PATH 切换为当前 Node/pnpm 工具。PM2 环境及回滚配置仅写入私有 `.deploy-state/<release-id>`，不能提交或公开。
4. 候选准备完毕后仅重建 `my-blog`，确保 cwd 和启动入口确实切到新目录。检查本机 HTTP 返回的发布标识与候选 ID 相同，并验证匿名文章列表可读取数据库，成功后更新 current 链接。博客会有一次短暂重启，不是零停机发布。
5. 切换或健康检查失败时自动尝试恢复原 PM2 配置，current 保持旧指向；失败日志明确提示回滚结果。应用回滚不撤销数据库新增结构。

全新目录意味着暂时保留两套应用文件/依赖，主要额外空间为一套生产 node_modules；安装还需要下载与临时空间。发布前检查磁盘余量。旧目录保留用于回退，没有把旧 npm 模块混入新 pnpm 目录。

后台部署在 CI 安装依赖并构建，只上传 dist 静态产物，服务器不需要为后台安装 pnpm 项目依赖。服务器中可能存在的旧后台 node_modules 不参与此构建；本轮未登录服务器核对或删除它们。

## 保留与清理

正常保留当前健康版本和上一版。首次迁移的原 npm 安装作为第一份回退版本；新版正式验收且已有下一份经过验证的回退版本后，再清理它。自动删除默认关闭，不在首次切换时删除唯一回退目录。

后续每次正式验收后人工核对 PM2 实际 cwd、current 链接和本次 `.deploy-state/<release-id>/previous.json` 所引用的目录，再清理更老的发布目录。不能删除正在运行或回滚配置引用的目录。根 `/home/www/my-blog` 同时承载 .env、releases 和私有状态，不能整体删除；首次旧 node_modules/.next 的清理也只针对经过核对的独立路径。上传目录和环境文件始终保留。

需要手动回退时，仅对 my-blog 使用当前发布的私有 previous.json 恢复。若迁移前没有旧应用，则没有旧配置可恢复。回退后核对 PM2 cwd、HTTP 和业务读取，再将 current 改回经过确认的旧 release；不要只改链接而继续运行新 PM2 cwd。

## 验收范围

本轮在隔离 Linux Node 24 环境使用模拟 npm/pnpm/PM2 及真实 HTTP 进程，验证全新依赖、安装/生成/迁移失败不切换、错误版本标识/内容接口不可用触发回退、旧 node_modules 保留、环境/上传路径保留、已使用发布目录拒绝复用。此检查接入 CI，不连接正式数据库。

真实 pnpm 冻结安装、Prisma、自动化、构建与公开站浏览器另行运行。独立评审和最新提交 CI 结果记录在新 PR。生产服务器 Node/PM2、下载源、磁盘余量、真实备份恢复和正式发布未验收；不把隔离模拟等同于正式部署。
