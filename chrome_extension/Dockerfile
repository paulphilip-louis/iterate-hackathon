FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# The dist folder will be created by the build command
# For development, npm run dev will build and watch for changes
# The dist folder is mounted as a volume for easy access

# Default command - builds and watches for changes
CMD ["npm", "run", "dev"]

