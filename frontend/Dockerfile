# Stage 1: Build the React Application
FROM node:22-alpine AS build

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Serve the Application with Nginx
FROM nginx:stable-alpine

# Copy built assets from Build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
