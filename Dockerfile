# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source and build
COPY . .
RUN npm run build

# Runtime stage
FROM nginx:stable-alpine
WORKDIR /usr/share/nginx/html

# Clean default nginx assets and copy built app
RUN rm -rf ./*
COPY --from=builder /app/dist .

# Use custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
