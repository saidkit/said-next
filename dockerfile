# ============================================
# Dependencies Stage
# ============================================
FROM node:20-alpine AS deps
WORKDIR /app
# Enable corepack (for managing package manager versions)
RUN corepack enable
# Copy package management files
COPY package.json pnpm-lock.yaml* ./
# Install dependencies using cache mount
RUN --mount=type=cache,target=/root/.local/share/pnpm/store/v3 \
  pnpm install --frozen-lockfile

# ============================================
# Build Stage
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app
# Enable corepack
RUN corepack enable
# Copy node_modules from dependencies stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source code
COPY . .
# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
# Build the application
RUN --mount=type=cache,target=/root/.local/share/pnpm/store/v3 \
  pnpm build

# ============================================
# Runtime Stage
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app
# Set production environment
ENV NODE_ENV=production
# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1
# Create system user group and user (for secure execution)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
# Copy necessary files from build stage
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Switch to non-root user
USER nextjs
# Expose port
EXPOSE 3000
# Set port and hostname
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# Start the application
CMD ["node", "server.js"]
