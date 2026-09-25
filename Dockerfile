# SteelForce Admin Web Portal — Next.js 13.5 (App Router)
#
#   deps    → deterministic `npm ci` against the committed package-lock.json
#   builder → `next build`, emitting the standalone server bundle
#   runner  → node + that bundle only. No npm, no source, no build toolchain.
#
# `runner` is deliberately the LAST stage, so docker-compose.yml needs no
# `target:` for this service (unlike backend-server, whose last stage is `dev`).
# If a `dev` stage is ever added here, it must go ABOVE runner or Compose will
# silently start shipping the development image.
#
# Build context is the repository root (see compose.yaml and
# .github/workflows/ci-cd.yml).
#
# No `# syntax=` directive on purpose: pinning an external Dockerfile frontend
# makes every build fetch it from Docker Hub first. Nothing here needs a newer
# frontend than the one built into Docker 23+.

ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS base
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# Stage 1 — dependencies
# ---------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# package-lock.json is the project's lock file, so npm is the package manager.
# `npm ci` fails loudly when the lock file and package.json disagree - that is
# the reproducible-build guarantee.
#
# Note there is no `--omit=dev`: this project declares typescript, tailwind and
# postcss under "dependencies", so omitting dev dependencies would remove the
# very packages `next build` needs. The runtime image stays small anyway,
# because the standalone bundle below carries only what the server imports.
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=npm,target=/root/.npm \
    npm ci

# ---------------------------------------------------------------------------
# Stage 2 — build
# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Next compiles rewrites into the build output, so the proxy target has to be
# known here rather than at run time. Unset, next.config.js falls back to the
# staging API.
ARG BACKEND_INTERNAL_URL

# NEXT_PUBLIC_* is inlined into the browser bundle at build time. Keep this a
# relative path so one image stays promotable across environments and the
# browser never learns an internal hostname.
ARG NEXT_PUBLIC_API_BASE_URL

# The remaining NEXT_PUBLIC_* values the app reads. Every one of them is safe
# to pass as an empty string: src/config/environment.ts falls back with `||`
# for the URL and mode, validates the timeout, and compares the two feature
# flags against the literal 'true'.
#
# The Maps key ships to the browser by design (it is restricted by HTTP
# referrer in Google Cloud, not by secrecy). These ARGs exist only in this
# stage, so none of them appears in the runner image's history.
ARG NEXT_PUBLIC_AUTH_API_URL
ARG NEXT_PUBLIC_API_TIMEOUT
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_USER_MANAGEMENT_API=false
ARG NEXT_PUBLIC_DEPOTS_API=false

# Which auth repository the app binds at build time.
#
#   static → the offline demo directory in src/infrastructure/auth/repository.ts.
#            No backend needed; sign in with the DEMO_DIRECTORY accounts.
#   api    → the real ISI.Api identity endpoints.
#
# Defaulted to `static` deliberately. environment.ts only falls back to `static`
# when NODE_ENV is not production, and this image always sets NODE_ENV=production
# - so without this the container would silently demand a live API.
#
# The `:-static` on the ENV line keeps that default when the ARG is passed
# through as an empty string (environment.ts would otherwise pick 'api').
ARG NEXT_PUBLIC_AUTH_MODE=static

ENV BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL} \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_AUTH_API_URL=${NEXT_PUBLIC_AUTH_API_URL} \
    NEXT_PUBLIC_API_TIMEOUT=${NEXT_PUBLIC_API_TIMEOUT} \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY} \
    NEXT_PUBLIC_USER_MANAGEMENT_API=${NEXT_PUBLIC_USER_MANAGEMENT_API} \
    NEXT_PUBLIC_DEPOTS_API=${NEXT_PUBLIC_DEPOTS_API} \
    NEXT_PUBLIC_AUTH_MODE=${NEXT_PUBLIC_AUTH_MODE:-static} \
    NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — runtime
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

# PORT and HOSTNAME are what the standalone server reads. Compose sets both as
# well; these defaults keep `docker run` on this image working on its own.
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# `node` (uid 1000) ships with the official image, so no user is created here.
# public/ and .next/static are not part of the standalone bundle by design and
# must be copied alongside it, or every asset and stylesheet 404s.
COPY --from=builder --chown=node:node /app/public           ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static     ./.next/static

USER node

EXPOSE 3000

# Node 18+ has a global fetch, so this needs no extra package. /healthz is a
# route handler that answers 200 without touching the backend
# (src/app/healthz/route.ts), so a backend outage never restarts the portal.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# The standalone build emits its own minimal server; `next start` is not used.
CMD ["node", "server.js"]
