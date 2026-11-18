#!/usr/bin/env bash
set -euo pipefail

case "${1:-}" in
  front|admin) target=$1 ;;
  *) echo 'Usage: check-deploy-readiness.sh front|admin' >&2; exit 2 ;;
esac

errors=0
summary() {
  if [[ -n ${GITHUB_STEP_SUMMARY:-} ]]; then
    printf '%s\n' "$1" >> "$GITHUB_STEP_SUMMARY"
  fi
}
summary "## 发布前置检查（$target）"
summary ''
summary '| 条件 | 结果 | 说明 |'
summary '| --- | --- | --- |'
require_value() {
  local name=$1 expected=$2 reason=$3 actual
  actual=${!name-}
  if [[ $actual == "$expected" ]]; then
    summary "| $name | 通过 | $reason |"
  else
    local status='值不匹配'
    [[ -n $actual ]] || status='未配置'
    printf '::error title=发布前置检查未通过::%s：%s。要求 %s；%s\n' "$name" "$status" "$expected" "$reason"
    summary "| $name | $status | 要求 $expected；$reason |"
    errors=$((errors + 1))
  fi
}

if [[ $target == front ]]; then
  require_value BLOG_BACKUP_RESTORE_VERIFIED 202611160001_blog_optimization '正式数据库备份已在独立库恢复并验收；CI 测试不能替代'
  require_value BLOG_ADMIN_COMPAT_READY true '配对后台候选已通过兼容验收并具备发布条件，不要求后台已先部署'
else
  require_value BLOG_API_COMPAT_READY true '正式 API 已提供本版后台所需能力并完成核验，合并 PR 不能替代'
fi

if ((errors > 0)); then
  summary ''
  summary '部署已停止，尚未上传文件、执行正式迁移或切换应用。'
  summary '配置入口：仓库 Settings → Environments → production → Environment variables（也兼容仓库 Variables）。只有相应验收完成后才设置就绪值。'
  summary '处理顺序与手动重跑见 docs/部署前置检查与发布顺序.md。不要通过填入就绪值跳过验收。'
  echo "发布前置检查失败：$errors 项未满足。完整原因见上方日志和 Actions Summary。" >&2
  exit 1
fi
summary ''
summary '全部发布前置条件已满足；继续构建与部署。'
echo '全部发布前置条件已满足'
