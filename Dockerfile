# ==========================================
# Multi-Stage Production Dockerfile
# Stage 1: Build the Vite Application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies based on package-lock.json
COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

# Copy application source code
COPY . .

# Build the production distribution
ENV NODE_ENV=production
RUN npm run build

# ==========================================
# Stage 2: Serve with Lightweight Nginx
# ==========================================
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration for Single Page Application routing
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg)$ { \
        expires 6M; \
        access_log off; \
        add_header Cache-Control "public, max-age=15552000, immutable"; \
    } \
    error_page 500 502 503 504 /50x.html; \
    location = /50x.html { \
        root /usr/share/nginx/html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
