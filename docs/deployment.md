# Deployment

How the SteelForce Admin Web Portal is built, shipped and run with Docker and
GitHub Actions.

| Piece | File |
|---|---|
| Image build (multi-stage, standalone Next.js, non-root) | [`Dockerfile`](../Dockerfile) |
| Build-context exclusions | [`.dockerignore`](../.dockerignore) |
| Local build + run | [`compose.yaml`](../compose.yaml) |
| Server runtime (prebuilt image, hardened) | [`deploy/compose.yaml`](../deploy/compose.yaml) |
| Server deploy / rollback script | [`deploy/deploy.sh`](../deploy/deploy.sh) |
| CI/CD pipeline | [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) |
| Health endpoint | [`src/app/healthz/route.ts`](../src/app/healthz/route.ts) |
| Variable template | [`.env.example`](../.env.example) |

---

## 1. How configuration works (read this first)

**All of the portal's configuration is build-time.** There are no runtime secrets.

- `NEXT_PUBLIC_*` values are inlined into the browser JavaScript by `next build`.
  Anyone can read them in DevTools, so they are configuration, never secrets.
- The backend proxy target (`BACKEND_INTERNAL_URL` > `API_BASE_URL` > `API_PROXY_URL`)
  is compiled into the rewrite table by `next build`.

So **changing any value means building a new image**. Restarting a container with
different environment variables has no effect. Each image is built for one
environment.

| Where | Where the values come from |
|---|---|
| `npm run dev` | `.env.local` / `.env` (gitignored) |
| `docker compose up --build` (local) | shell environment, or `.env` next to `compose.yaml` → build args |
| GitHub Actions | repository **Variables** and **Secrets** → build args |
| Server | nothing app-specific; only `PORTAL_PORT` in the deploy directory's `.env` |

`.env*` files (except `.env.example`) are excluded by both `.gitignore` and
`.dockerignore`, so a local `.env` can never be committed or baked into an image.

### Variables

| Variable | Default when empty | Purpose |
|---|---|---|
| `BACKEND_INTERNAL_URL` / `API_BASE_URL` / `API_PROXY_URL` | `https://www.pnc-spts-stg-api.me` | Backend that `/api/*`, `/docs/*`, `/files/*` are proxied to |
| `NEXT_PUBLIC_API_BASE_URL` | empty (same-origin proxy) | Feature API base URL. Keep it empty to avoid CORS |
| `NEXT_PUBLIC_API_TIMEOUT` | `15000` | Request timeout (ms, minimum 1000) |
| `NEXT_PUBLIC_AUTH_API_URL` | `/api/v1/auth` | Identity endpoints |
| `NEXT_PUBLIC_AUTH_MODE` | `static` in the Dockerfile, **`api` in CI** | `static` = offline demo accounts, `api` = real login |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | empty (demo map) | Google Maps. Restrict it by HTTP referrer in Google Cloud |
| `NEXT_PUBLIC_USER_MANAGEMENT_API` | `false` | Use the real `/api/v1/users` and `/roles` |
| `NEXT_PUBLIC_DEPOTS_API` | `false` | Load depots from `/api/v1/customers` |

> **Never deploy a public image with `NEXT_PUBLIC_AUTH_MODE=static`.** Static mode
> signs users in against demo accounts whose passwords are in the source code
> (`src/infrastructure/auth/repository.ts`). CI therefore defaults to `api`.

---

## 2. Local Docker

Requires Docker Engine 23+ and Compose v2.20+.

```bash
cp .env.example .env              # then fill in the values you need
docker compose up -d --build --wait
open http://127.0.0.1:3000        # PORTAL_PORT=3100 docker compose up ... if 3000 is taken
curl http://127.0.0.1:3000/healthz   # {"status":"ok"}
docker compose logs -f
docker compose down
```

To build and run without Compose:

```bash
docker build -t steelforce-portal:local \
  --build-arg BACKEND_INTERNAL_URL=https://www.pnc-spts-stg-api.me \
  --build-arg NEXT_PUBLIC_AUTH_MODE=api \
  .
docker run -d --name portal -p 127.0.0.1:3000:3000 --restart unless-stopped steelforce-portal:local
```

The image is based on `node:20-alpine`, runs as the non-root `node` user, contains
only the Next.js standalone server and static assets, and uses about 240 MB on disk.
Its `HEALTHCHECK` polls `/healthz`, which answers without calling the backend, so a
backend outage never makes Docker restart the portal.

---

## 3. GitHub Actions pipeline

`.github/workflows/ci-cd.yml`:

| Trigger | verify | image | deploy |
|---|---|---|---|
| Pull request | ✔ | build + smoke test (not pushed) | – |
| Push to `main` | ✔ | build + smoke test + **push** | ✔ if `DEPLOY_ENABLED=true` |
| Manual (`workflow_dispatch` on `main`) | ✔ | ✔ | ✔ if `DEPLOY_ENABLED=true` |

1. **verify**: `npm ci` → `npm run lint` → `npm run typecheck` → `npm test --if-present`
   (there is no test suite yet) → `npm run build`.
2. **image**: builds the Docker image with Buildx (GitHub Actions layer cache),
   starts it, waits for it to be healthy, requests `/healthz` and `/login`, then
   pushes it to GHCR.
3. **deploy**: SSHes to the server, uploads `deploy/compose.yaml` and
   `deploy/deploy.sh`, logs the server in to GHCR with the job's short-lived token
   (sent over stdin, never on the command line), runs `deploy.sh deploy <image>`,
   logs out, and optionally checks `PUBLIC_URL/healthz`.

### Container registry

Images go to **GitHub Container Registry**:

```
ghcr.io/dydev99/steelforce-webportal:sha-<7-char commit>   immutable, used for deploys and rollback
ghcr.io/dydev99/steelforce-webportal:latest                last build from main
```

Pushing uses the built-in `GITHUB_TOKEN`, so no registry secret is needed. The first
push creates the package as **private**. If the server should pull without a token,
make it public (or connect it to the repo) under GitHub → Packages →
steelforce-webportal → Package settings.

### Repository Variables (Settings → Secrets and variables → Actions → Variables)

| Variable | Required | Example |
|---|---|---|
| `BACKEND_INTERNAL_URL` | recommended | `https://www.pnc-spts-stg-api.me` |
| `NEXT_PUBLIC_AUTH_MODE` | optional (defaults to `api`) | `api` |
| `NEXT_PUBLIC_API_BASE_URL` | optional | *(empty)* |
| `NEXT_PUBLIC_API_TIMEOUT` | optional | `15000` |
| `NEXT_PUBLIC_AUTH_API_URL` | optional | `/api/v1/auth` |
| `NEXT_PUBLIC_USER_MANAGEMENT_API` | optional | `true` |
| `NEXT_PUBLIC_DEPOTS_API` | optional | `true` |
| `DEPLOY_ENABLED` | to turn on deploys | `true` |
| `DEPLOY_PATH` | optional | `/opt/steelforce-portal` |
| `PUBLIC_URL` | optional (post-deploy check) | `https://portal.example.com` |

### Secrets

Repository secret (used by the build):

| Secret | Purpose |
|---|---|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps key. Stored as a secret only so it is masked in logs |

Secrets for the **`production` environment** (Settings → Environments → production).
Add *Required reviewers* there if deploys should need approval:

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | server hostname or IP |
| `DEPLOY_USER` | SSH user (member of the `docker` group, not root) |
| `DEPLOY_PORT` | SSH port (optional, defaults to 22) |
| `DEPLOY_SSH_KEY` | **private** key of a deploy-only key pair (see §4) |
| `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan -H <host>`, which pins the server's host key |

---

## 4. Server setup (one time)

Any Linux host with Docker Engine 23+ and the Compose v2.20+ plugin. The portal is
stateless and uses no volumes or database, so it cannot affect the backend stack or
its data.

```bash
# on the server
sudo useradd -m -s /bin/bash deploy && sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy /opt/steelforce-portal
echo "PORTAL_PORT=3000" | sudo -u deploy tee /opt/steelforce-portal/.env   # pick a free port

# on your machine: a dedicated key pair for CI
ssh-keygen -t ed25519 -N '' -C github-actions-deploy -f ./deploy_key
ssh-copy-id -i ./deploy_key.pub deploy@<host>
ssh-keyscan -H <host>            # paste the output into DEPLOY_KNOWN_HOSTS
# paste ./deploy_key into DEPLOY_SSH_KEY, then delete both local files
```

The container listens on **`127.0.0.1:${PORTAL_PORT}` only**, the same layout as
the backend's `compose.prod.yaml`. Put your TLS reverse proxy in front of it, for
example with nginx:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;     # SignalR / websockets
    proxy_set_header Connection "upgrade";
}
```

Runtime hardening in `deploy/compose.yaml`: `restart: unless-stopped` (restarts
after crashes and reboots), read-only root filesystem, all Linux capabilities
dropped, `no-new-privileges`, 512 MB memory limit, and rotated JSON logs
(5 × 20 MB).

---

## 5. Deploy process

Automatic: merge to `main`. To deploy by hand on the server:

```bash
cd /opt/steelforce-portal
echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-user> --password-stdin   # if the package is private
./deploy.sh deploy ghcr.io/dydev99/steelforce-webportal:sha-abc1234
./deploy.sh status
```

What `deploy.sh deploy` does:

1. **Pulls the new image first.** If the pull fails, production is not touched.
2. Recreates the container and waits up to `WAIT_TIMEOUT` (120 s) for Docker to
   report it healthy, then requests `/healthz` from the host.
3. On success, records the old image as `.state/previous` and the new one as
   `.state/current`, then prunes old portal images (keeping the newest 5, plus
   current and previous).
4. **On failure, it restarts the previous image automatically** and exits non-zero,
   which fails the GitHub job.

Downtime is limited to the container swap, typically 1–2 seconds. True zero
downtime would need two containers behind the proxy (blue/green), which is not
needed at this scale.

---

## 6. Rollback

```bash
cd /opt/steelforce-portal
./deploy.sh rollback                                                     # back to .state/previous
./deploy.sh rollback ghcr.io/dydev99/steelforce-webportal:sha-abc1234   # any earlier build
```

Every `sha-*` tag stays in GHCR, so any commit that was built can be restored.
Alternatively, re-run an older successful workflow run from the Actions tab. That
redeploys that run's image.

---

## 7. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Bind for 0.0.0.0:3000 failed: port is already allocated` | Another container or process is using the port. Set `PORTAL_PORT` to a free one |
| `/api/*` calls go to the wrong backend | The proxy target is fixed at build time. Fix `BACKEND_INTERNAL_URL` and rebuild |
| A changed `NEXT_PUBLIC_*` value has no effect | Also fixed at build time. Rebuild the image |
| Sign-in accepts demo accounts in production | Image was built with `NEXT_PUBLIC_AUTH_MODE=static`. Rebuild with `api` |
| Pages load but CSS and JS return 404 | `public/` or `.next/static` is missing from the image. Don't change the `COPY` lines in the runner stage |
| `denied` / `unauthorized` when pulling on the server | Private GHCR package. `docker login ghcr.io`, or make the package public |
| Deploy job: `Host key verification failed` | `DEPLOY_KNOWN_HOSTS` is missing or stale. Re-run `ssh-keyscan -H <host>` |
| Deploy job: `Permission denied (publickey)` | Public key missing from the server's `~/.ssh/authorized_keys` for `DEPLOY_USER` |
| `unknown flag: --wait-timeout` | Compose is too old. Install the Compose v2.20+ plugin |
| `container ... is unhealthy` | `docker compose -f compose.yaml logs portal` (with `PORTAL_IMAGE=...` set), or `docker logs steelforce-portal-portal-1` |
| Deploy step skipped | Set the repository variable `DEPLOY_ENABLED=true` |
| `next build` fails inside Docker but works on the host | A stale `.next` or host `node_modules` in the context. Both are dockerignored; check nobody removed them |
