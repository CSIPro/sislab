# Deployment

Every push to `main` runs `.github/workflows/deploy.yml`. You can also start it by hand from the Actions tab.

The workflow has two jobs:

1. `build` type-checks the code, runs the unit tests and runs `pnpm build`. Nitro writes a self-contained server to `.output`, with its dependencies bundled in, and the job uploads it as an artifact.
2. `deploy` connects to the server through the bridge host, as the account that runs PM2. It checks that the server's Node 24 is there and unpacks the artifact into a new release directory. It writes the environment file from GitHub and copies `scripts/deploy/ecosystem.config.cjs` next to it. Then it runs `scripts/deploy/activate-release.sh` on the server.

The activation script points the `current` symlink at the new release and runs `pm2 startOrReload`. It then waits until the process runs from the new release and `/v2/` answers. If that doesn't happen within a minute, the script prints the PM2 log, points `current` back at the previous release, reloads again and fails the job. When the deploy succeeds, it runs `pm2 save`, which saves every PM2 process on that account, not only this one.

The server never sees the source code and never runs `pnpm install`. The workflow does not use sudo and does not touch systemd.

## Server layout

```
/var/www/sislab-v2/            # DEPLOY_PATH
├── current -> releases/412.1-<sha>
├── ecosystem.config.cjs       # copied on every deploy
├── shared/
│   └── .env                   # written on every deploy, mode 600
└── releases/
    ├── 412.1-<sha>/           # contents of .output
    │   ├── public/
    │   └── server/index.mjs
    └── 411.1-<sha>/
```

Each deploy creates a fresh release directory, so nothing gets overwritten while the app runs. The script keeps the five newest releases and removes older ones.

Do not set `DEPLOY_PATH` to the legacy SISLAB directory. The legacy app still serves the root of the host.

## One-time server setup

These steps run once on the production server. PM2 already runs other apps there and `pm2 startup` is already in place, so PM2 brings the processes saved with `pm2 save` back after a reboot.

Install Node 24 next to the Node the other apps use, without changing nvm's default. `nvm install` leaves the default alias alone. As the PM2 account:

```bash
nvm install 24
nvm which 24     # this path goes in NODE_BIN
nvm alias default   # should still name the version the other apps use
```

`ecosystem.config.cjs` names this binary as the interpreter, so only SISLAB runs on Node 24.

Make sure the PM2 account can write to the deploy path:

```bash
sudo install -d -o <pm2 account> -g <pm2 account> /var/www/sislab-v2
```

Check whether `pm2` is on PATH for a non-interactive SSH session. Under nvm it usually isn't, because `.bashrc` stops early in that case:

```bash
ssh <pm2 account>@<production hostname> 'command -v pm2'
```

If that prints nothing, set `PM2_BIN` to the absolute path that `command -v pm2` prints in an interactive shell.

The reverse proxy that serves the legacy app must forward `/v2/` to `127.0.0.1:<PORT>`. The session cookie is `Secure` in production, so the proxy must serve `/v2/` over HTTPS.

## GitHub configuration

Create an environment named `production` under Settings, Environments. Limit its deployment branches to `main`. Add required reviewers if a person should approve each deploy.

Add these secrets to the environment:

| Secret | Value |
| --- | --- |
| `SSH_PRIVATE_KEY` | A private key made only for this workflow, with no passphrase. Create it with `ssh-keygen -t ed25519 -C sislab-deploy -f sislab-deploy`. |
| `DATABASE_URL` | The production database URL that the running app uses |

Add these as environment variables. They aren't secret, and as variables they show up readable in the logs:

| Variable | Value |
| --- | --- |
| `BRIDGE_HOSTNAME` | Public address of the bridge host |
| `BRIDGE_USERNAME` | Account on the bridge host |
| `PRODUCTION_HOSTNAME` | Address of the production server as the bridge sees it |
| `PRODUCTION_USERNAME` | The account that runs PM2 on the production server |
| `SSH_KNOWN_HOSTS` | Host key lines for both hosts (see below) |
| `DEPLOY_PATH` | For example `/var/www/sislab-v2` |
| `NODE_BIN` | Absolute path to Node 24 on the server, from `nvm which 24` |
| `PM2_BIN` | Optional. Absolute path to `pm2` when it isn't on PATH over SSH. |
| `PM2_APP_NAME` | Optional, defaults to `sislab-v2`. Must not clash with another PM2 app on the server. |
| `PORT` | Optional, defaults to `3000`. Must not clash with another app on the server. |

Leave the `BOOTSTRAP_*` values and `DATABASE_URL_TEST` out of GitHub. The bootstrap command runs once, from a machine with the source code, and its secrets don't belong in the server's runtime environment.

To change an environment variable of the running app, change it in GitHub and deploy again. Edits made by hand to `shared/.env` are lost on the next deploy.

To fill `SSH_KNOWN_HOSTS`, run `ssh-keyscan` from a machine you trust, against each host, and check the fingerprints with `ssh-keygen -lf` against the ones the hosts' administrators report:

```bash
ssh-keyscan -t ed25519 <bridge hostname>
ssh <bridge user>@<bridge hostname> ssh-keyscan -t ed25519 <production hostname>
```

Run the second command before you restrict the key on the bridge. Use the same production hostname as `PRODUCTION_HOSTNAME`, because SSH looks the server up in `known_hosts` under that name.

## SSH keys

The workflow only uses the bridge to reach the production server's SSH port. In the bridge account's `~/.ssh/authorized_keys`, limit the deploy key to that:

```
restrict,port-forwarding,permitopen="<production hostname>:22" ssh-ed25519 AAAA... sislab-deploy
```

On the production server, add the public key to the PM2 account's `authorized_keys` without restrictions, because the workflow runs commands there.

## Rolling back by hand

As the PM2 account, list the releases, point `current` at an older one and reload:

```bash
ls -1t /var/www/sislab-v2/releases
ln -sfn /var/www/sislab-v2/releases/<release> /var/www/sislab-v2/current.next
mv -Tf /var/www/sislab-v2/current.next /var/www/sislab-v2/current
pm2 reload sislab-v2
```

The next push to `main` deploys over the rollback.

## Database migrations

The workflow does not run migrations. Run `pnpm db:migrate` against the production database before you push a change that adds one, and write the migration so the code that is live while it runs keeps working.
