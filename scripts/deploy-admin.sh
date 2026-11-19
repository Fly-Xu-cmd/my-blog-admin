#!/usr/bin/env bash
set -eEuo pipefail
umask 077
root=$(realpath -e -- "${1:?deployment root required}")
id=${2:?release id required}
site=${3:?admin site URL required}
api=${4:?API base URL required}
[[ $id =~ ^[0-9a-f]{40}-[0-9]+-[0-9]+$ ]]
candidate=$(realpath -e -- "$root/releases/$id/dist")
[[ $candidate == "$root/releases/$id/dist" ]]
test -f "$candidate/index.html"
test "$(cat "$candidate/deploy-version.txt")" = "$id"
command -v node >/dev/null
node "$root/releases/$id/check-api-compatibility.mjs" "$api" --once
node "$root/releases/$id/check-admin-health.mjs" --access-check "$site"
state="$root/.deploy-state/$id"
[[ ! -e $state ]]
mkdir -p -- "$state"
previous=''
legacy=false
if [[ -L $root/dist ]]; then
  previous=$(realpath -e -- "$root/dist")
  [[ $previous == "$root/releases/"*/dist ]]
elif [[ -d $root/dist ]]; then
  [[ $(realpath -e -- "$root/dist") == "$root/dist" ]]
  previous="$root/releases/legacy-$id/dist"
  mkdir -p -m 0755 -- "$root/releases/legacy-$id"
  legacy=true
elif [[ -e $root/dist ]]; then
  echo 'Existing dist is not a directory or release link' >&2; exit 1
fi
printf '%s\n' "$previous" > "$state/previous-path"
switched=false
committed=false
rollback() {
  local code=$?
  trap - EXIT
  if [[ $switched == true && $committed == false ]]; then
    echo 'Admin release failed; restoring previous files' >&2
    if [[ -n $previous ]]; then
      if [[ $legacy == true && -d $root/dist && ! -L $root/dist ]]; then
        : # Initial legacy move failed; the original directory remains intact.
      else
        ln -s -- "$previous" "$root/.rollback-$id"
        mv -Tf -- "$root/.rollback-$id" "$root/dist"
      fi
    elif [[ -L $root/dist && $(readlink "$root/dist") == "$candidate" ]]; then
      unlink "$root/dist"
    fi
  fi
  exit "$code"
}
trap rollback EXIT
ln -s -- "$candidate" "$root/.dist-$id"
switched=true
if [[ $legacy == true ]]; then mv -- "$root/dist" "$previous"; fi
mv -Tf -- "$root/.dist-$id" "$root/dist"
healthy=false
for ((attempt=1; attempt<=10; attempt++)); do
  if node "$root/releases/$id/check-admin-health.mjs" "$site" "$id" "$api"; then healthy=true; break; fi
  if ((attempt<10)); then sleep 2; fi
done
[[ $healthy == true ]] || { echo 'New admin release failed health checks' >&2; exit 1; }
committed=true
echo "Admin deployment healthy: $id; previous release retained"
