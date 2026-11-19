#!/usr/bin/env bash
set -euo pipefail
source_root=$(cd -- "$(dirname -- "$0")/.." && pwd)
sandbox=$(mktemp -d /tmp/blog-admin-release-test.XXXXXX)
cleanup() { [[ $sandbox == /tmp/blog-admin-release-test.* ]] && rm -rf -- "$sandbox"; }
trap cleanup EXIT
id=0123456789012345678901234567890123456789-1-1
prepare() {
  root="$sandbox/$1"
  mkdir -p "$root/dist" "$root/releases/$id/dist"
  echo legacy > "$root/dist/index.html"
  echo new > "$root/releases/$id/dist/index.html"
  echo "$id" > "$root/releases/$id/dist/deploy-version.txt"
  printf 'process.exit(process.argv[2] === "--access-check" ? 0 : %s);\n' "$2" > "$root/releases/$id/check-admin-health.mjs"
  echo 'process.exit(0);' > "$root/releases/$id/check-api-compatibility.mjs"
}
prepare success 0
bash "$source_root/scripts/deploy-admin.sh" "$root" "$id" http://example.test http://api.test
[[ $(cat "$root/dist/index.html") == new && -L $root/dist ]]
[[ $(cat "$root/releases/legacy-$id/dist/index.html") == legacy ]]
[[ $(stat -c %a "$root/releases/legacy-$id") == 755 ]]
prepare rollback 1
if bash "$source_root/scripts/deploy-admin.sh" "$root" "$id" http://example.test http://api.test; then exit 1; fi
[[ $(cat "$root/dist/index.html") == legacy ]]
prepare wrong_marker 0
echo wrong > "$root/releases/$id/dist/deploy-version.txt"
if bash "$source_root/scripts/deploy-admin.sh" "$root" "$id" http://example.test http://api.test; then exit 1; fi
[[ -d $root/dist && ! -L $root/dist && $(cat "$root/dist/index.html") == legacy ]]
prepare api_before 0
echo 'process.exit(1);' > "$root/releases/$id/check-api-compatibility.mjs"
if bash "$source_root/scripts/deploy-admin.sh" "$root" "$id" http://example.test http://api.test; then exit 1; fi
[[ -d $root/dist && ! -L $root/dist && $(cat "$root/dist/index.html") == legacy ]]
prepare access_before 0
echo 'process.exit(process.argv[2] === "--access-check" ? 1 : 0);' > "$root/releases/$id/check-admin-health.mjs"
if bash "$source_root/scripts/deploy-admin.sh" "$root" "$id" http://example.test http://api.test; then exit 1; fi
[[ -d $root/dist && ! -L $root/dist && $(cat "$root/dist/index.html") == legacy ]]
[[ ! -e "$root/.deploy-state/$id" && ! -e "$root/releases/legacy-$id" ]]

echo 'Admin release checks passed: access failure before switch, legacy adoption, healthy switch, rollback and incorrect marker'
