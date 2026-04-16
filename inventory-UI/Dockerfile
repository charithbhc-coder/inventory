# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Argument for the API URL during build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build for production
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the custom nginx config for the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build assets to the subdirectory folder
COPY --from=builder /app/dist /usr/share/nginx/html/inventory

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
