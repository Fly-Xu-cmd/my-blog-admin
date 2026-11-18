#!/usr/bin/env bash
set -euo pipefail
source_root=$(cd -- "$(dirname -- "$0")/.." && pwd)
sandbox=$(mktemp -d /tmp/blog-readiness-test.XXXXXX)
cleanup() {
  [[ $sandbox == /tmp/blog-readiness-test.* ]] && rm -rf -- "$sandbox"
}
trap cleanup EXIT
run_check() {
  local mode=$1
  shift
  : > "$sandbox/summary"
  env -u BLOG_BACKUP_RESTORE_VERIFIED -u BLOG_ADMIN_COMPAT_READY -u BLOG_API_COMPAT_READY \
    GITHUB_STEP_SUMMARY="$sandbox/summary" "$@" \
    bash "$source_root/scripts/check-deploy-readiness.sh" "$mode" > "$sandbox/log" 2>&1
}
expect_failure() {
  if run_check "$@"; then echo 'Expected readiness rejection' >&2; exit 1; fi
}
expect_failure front
grep -q 'BLOG_BACKUP_RESTORE_VERIFIED.*未配置' "$sandbox/log"
grep -q 'BLOG_ADMIN_COMPAT_READY.*未配置' "$sandbox/log"
grep -q 'BLOG_BACKUP_RESTORE_VERIFIED.*未配置' "$sandbox/summary"
grep -q 'BLOG_ADMIN_COMPAT_READY.*未配置' "$sandbox/summary"
grep -q '尚未上传文件' "$sandbox/summary"
expect_failure front BLOG_BACKUP_RESTORE_VERIFIED=wrong BLOG_ADMIN_COMPAT_READY=true
grep -q 'BLOG_BACKUP_RESTORE_VERIFIED.*值不匹配' "$sandbox/log"
if grep -q '::error.*BLOG_ADMIN_COMPAT_READY' "$sandbox/log"; then exit 1; fi
expect_failure front BLOG_BACKUP_RESTORE_VERIFIED=202611160001_blog_optimization BLOG_ADMIN_COMPAT_READY=false
grep -q 'BLOG_ADMIN_COMPAT_READY.*值不匹配' "$sandbox/log"
run_check front BLOG_BACKUP_RESTORE_VERIFIED=202611160001_blog_optimization BLOG_ADMIN_COMPAT_READY=true
if grep -q '::error' "$sandbox/log"; then exit 1; fi
grep -q 'BLOG_BACKUP_RESTORE_VERIFIED.*通过' "$sandbox/summary"
expect_failure admin
grep -q 'BLOG_API_COMPAT_READY.*未配置' "$sandbox/log"
expect_failure admin BLOG_API_COMPAT_READY=false
grep -q 'BLOG_API_COMPAT_READY.*值不匹配' "$sandbox/summary"
run_check admin BLOG_API_COMPAT_READY=true
if grep -q '::error' "$sandbox/log"; then exit 1; fi
grep -q 'BLOG_API_COMPAT_READY.*通过' "$sandbox/summary"
expect_failure invalid
grep -q 'Usage:' "$sandbox/log"
env -u GITHUB_STEP_SUMMARY BLOG_API_COMPAT_READY=true \
  bash "$source_root/scripts/check-deploy-readiness.sh" admin >/dev/null
echo 'Readiness checks passed: missing, invalid, complete, summaries and no-summary mode'
