# Build stage
FROM node:20.11-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/isr-app ./apps/isr-app
COPY libs ./libs

# Build the application
RUN npx nx build isr-app

# Production stage
FROM caddy:2.7-alpine

# Copy built application
COPY --from=builder /app/apps/isr-app/dist /usr/share/caddy

# Create Caddyfile
RUN echo -e ':80 {\n    root * /usr/share/caddy\n    file_server\n    try_files {path} /index.html\n}' > /etc/caddy/Caddyfile

EXPOSE 80

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]