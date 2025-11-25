# =============================================================================
# BuildMyBot.App - Multi-Stage Production Dockerfile
# =============================================================================
# This Dockerfile builds a production-ready container for BuildMyBot.App
#
# NOTE: This is configured for the current Vite + React setup.
# When you migrate to Next.js (recommended for backend API routes),
# you'll need to update this Dockerfile accordingly.
#
# Build command:
#   docker build -t buildmybot:latest .
#
# Run command:
#   docker run -p 3000:80 --env-file .env buildmybot:latest
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Install pnpm (optional, but faster than npm)
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install dependencies
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; \
    fi

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build arguments (passed from environment variables)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

# Set environment variables for build
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NODE_ENV=production

# Build the application
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production Runtime (Nginx)
# -----------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S buildmybot -u 1001

# Set ownership
RUN chown -R buildmybot:nodejs /usr/share/nginx/html && \
    chown -R buildmybot:nodejs /var/cache/nginx && \
    chown -R buildmybot:nodejs /var/log/nginx && \
    chown -R buildmybot:nodejs /etc/nginx/conf.d

RUN touch /var/run/nginx.pid && \
    chown -R buildmybot:nodejs /var/run/nginx.pid

# Switch to non-root user
USER buildmybot

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# =============================================================================
# PRODUCTION DEPLOYMENT NOTES
# =============================================================================
#
# 1. Build with build args:
#    docker build \
#      --build-arg NEXT_PUBLIC_APP_URL=https://buildmybot.app \
#      --build-arg NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
#      --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx \
#      --build-arg NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx \
#      -t buildmybot:latest .
#
# 2. Run with environment variables:
#    docker run -d \
#      -p 80:80 \
#      --name buildmybot \
#      --restart unless-stopped \
#      buildmybot:latest
#
# 3. For Railway/Render deployment:
#    - They auto-detect Dockerfile
#    - Set environment variables in dashboard
#    - Expose PORT environment variable
#
# 4. For Kubernetes:
#    - Create ConfigMap for environment variables
#    - Use this image in your deployment manifest
#    - Set up horizontal pod autoscaling
#
# =============================================================================
# NEXT.JS MIGRATION DOCKERFILE (Future)
# =============================================================================
# When you migrate to Next.js, replace the runner stage with:
#
# FROM node:20-alpine AS runner
# WORKDIR /app
# ENV NODE_ENV production
# RUN addgroup --system --gid 1001 nodejs
# RUN adduser --system --uid 1001 nextjs
# COPY --from=builder /app/public ./public
# COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# USER nextjs
# EXPOSE 3000
# ENV PORT 3000
# CMD ["node", "server.js"]
#
# =============================================================================
