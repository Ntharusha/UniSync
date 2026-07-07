FROM node:22-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code files
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 3001

# Start backend application
CMD ["npm", "start"]
