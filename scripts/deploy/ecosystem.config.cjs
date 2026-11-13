// The PM2 process for SISLAB v2. The deploy workflow copies this file to
// DEPLOY_PATH and runs `pm2 startOrReload` on it with DEPLOY_PATH, NODE_BIN and
// PM2_APP_NAME set.

function required(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is required`);
	}
	return value;
}

const deployPath = required("DEPLOY_PATH");

module.exports = {
	apps: [
		{
			name: required("PM2_APP_NAME"),
			// Both paths go through the `current` symlink, so each reload starts
			// whichever release `current` points at.
			cwd: `${deployPath}/current`,
			script: `${deployPath}/current/server/index.mjs`,
			// Other apps on the server use a different Node, so this one names its
			// own instead of taking the one on PATH.
			interpreter: required("NODE_BIN"),
			// Absolute, because the process's working directory resolves to the
			// release directory, where a relative path would not find shared/.
			node_args: `--env-file=${deployPath}/shared/.env`,
			env: { NODE_ENV: "production" },
		},
	],
};
