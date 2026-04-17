# Stage 1: Build
FROM node:20-alpine AS builder

# Skip downloading Chromium during npm install
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

# Install Chromium and dependencies for PDF generation
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Configure Puppeteer to use the system-installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install production dependencies only
RUN npm install --omit=dev

# Install MJML (required for template rendering if not bundled)
RUN npm install -g mjml

EXPOSE 3000

CMD ["node", "dist/main"]
