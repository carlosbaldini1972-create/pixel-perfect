# ───────────────────────────────────────────────────────────────────────────
# VirtualWeb ERP — App container (TanStack Start) for self-hosted VM
# Build runs from project root: docker compose build app
# ───────────────────────────────────────────────────────────────────────────

# 1) Builder ----------------------------------------------------------------
FROM oven/bun:1.1-debian AS builder
WORKDIR /app

# Install deps first for cache reuse
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# Copy the rest
COPY . .

# Build-time env vars are baked into the client bundle by Vite.
# docker-compose passes these as --build-arg (see compose).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

RUN bun run build

# 2) Runtime ---------------------------------------------------------------
FROM oven/bun:1.1-debian AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy build output + minimal runtime
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY deploy/app/server.mjs ./server.mjs

EXPOSE 3000
CMD ["bun", "run", "server.mjs"]
