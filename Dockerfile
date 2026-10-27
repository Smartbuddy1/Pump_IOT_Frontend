# Multi-stage production Dockerfile for Pump IoT Frontend
# Stage 1: Build React SPA
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve via Nginx Alpine
FROM nginx:alpine

# Copy built artifacts to Nginx html directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration if present
COPY nginx-frontend.conf.example /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
