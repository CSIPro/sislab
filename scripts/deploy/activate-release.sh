#!/usr/bin/env bash
# Runs on the production server, as the account that runs PM2. Points `current`
# at a release that the deploy workflow already unpacked, starts or reloads the
# PM2 process and checks that the new release answers. If the check fails, it
# points `current` back at the previous release and reloads again.
#
# Usage: activate-release.sh <deploy path> <release> <pm2 app name> <port> <node bin> [pm2 bin] [releases to keep]
set -euo pipefail

deploy_path=${1:?deploy path is required}
release=${2:?release name is required}
app=${3:?pm2 app name is required}
port=${4:?port is required}
node_bin=${5:?node binary is required}
pm2_bin=${6:-pm2}
keep=${7:-5}

releases_dir="$deploy_path/releases"
new_release="$releases_dir/$release"
current_link="$deploy_path/current"
ecosystem="$deploy_path/ecosystem.config.cjs"

# pm2 is a Node script. When it is installed outside PATH, as under nvm, its
# directory also holds the node its shebang needs.
if [[ $pm2_bin == */* ]]; then
	PATH="$(dirname "$pm2_bin"):$PATH"
fi

# ecosystem.config.cjs reads these.
export DEPLOY_PATH="$deploy_path" NODE_BIN="$node_bin" PM2_APP_NAME="$app"

if [[ ! -f "$new_release/server/index.mjs" ]]; then
	echo "$new_release/server/index.mjs is missing, so the upload did not finish" >&2
	exit 1
fi

previous_release=$(readlink -f "$current_link" || true)

# Replace the symlink in one rename so `current` never points at nothing.
point_current_at() {
	ln -sfn "$1" "$current_link.next"
	mv -Tf "$current_link.next" "$current_link"
}

reload() {
	"$pm2_bin" startOrReload "$ecosystem" --only "$app"
}

# The release directory the running process started in, read from its working
# directory, which the kernel reports with the symlink resolved.
running_release() {
	local pid
	pid=$("$pm2_bin" pid "$app" | head -n 1)
	if [[ -n $pid && $pid != 0 ]]; then
		readlink -f "/proc/$pid/cwd"
	fi
}

# Passes once the process runs from the given release and answers on /v2/.
healthy() {
	local expected
	expected=$(readlink -f "$1")
	for _ in $(seq 1 30); do
		if [[ "$(running_release || true)" == "$expected" ]] &&
			curl -fs -o /dev/null "http://127.0.0.1:$port/v2/"; then
			return 0
		fi
		sleep 2
	done
	return 1
}

echo "Activating $release"
point_current_at "$new_release"
reload

if ! healthy "$new_release"; then
	echo "$app did not answer from $release on port $port after the reload" >&2
	"$pm2_bin" logs "$app" --lines 50 --nostream >&2 || true
	if [[ -n "$previous_release" && -d "$previous_release" ]]; then
		echo "Rolling back to $(basename "$previous_release")" >&2
		point_current_at "$previous_release"
		reload
		if healthy "$previous_release"; then
			echo "$(basename "$previous_release") is live again" >&2
		else
			echo "The previous release does not answer either" >&2
		fi
	fi
	exit 1
fi

# Saves every PM2 process on this account, so they all come back after a reboot.
"$pm2_bin" save
echo "$release is live"

# Keep the newest releases for manual rollbacks. Never delete the live one.
live_release=$(readlink -f "$current_link")
ls -1dt "$releases_dir"/*/ | tail -n +"$((keep + 1))" | while read -r old; do
	old=${old%/}
	if [[ "$(readlink -f "$old")" != "$live_release" ]]; then
		rm -rf -- "$old"
	fi
done
