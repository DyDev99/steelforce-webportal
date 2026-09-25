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
# Build context is ./admin-web-portal (see docker-compose.yml).
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
# known here rather than at run time. Compose passes the service DNS name.
ARG BACKEND_INTERNAL_URL

# NEXT_PUBLIC_* is inlined into the browser bundle at build time. Keep this a
# relative path so one image stays promotable across environments and the
# browser never learns an internal hostname.
#
# The app reads further NEXT_PUBLIC_* values (AUTH_API_URL, API_TIMEOUT,
# GOOGLE_MAPS_API_KEY) that are intentionally NOT declared here:
# src/config/environment.ts falls back with `??`, which treats an empty string
# as a real value - an empty ENV would defeat the fallback rather than trigger
# it. Add an ARG/ENV pair only alongside a genuine value.
ARG NEXT_PUBLIC_API_BASE_URL

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
# The `:-static` on the ENV line is not redundant: an ARG passed through as an
# empty string would otherwise survive the `??` in environment.ts and resolve to
# neither 'api' nor 'static', quietly selecting the API repository.
ARG NEXT_PUBLIC_AUTH_MODE=static

ENV BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL} \
    NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
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

# Node 18+ has a global fetch, so this needs no extra package. Any response
# below 500 counts as healthy: `/` renders a client-side redirect to /login,
# so a 3xx or 4xx still proves the server is serving.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

# The standalone build emits its own minimal server; `next start` is not used.
CMD ["node", "server.js"]
