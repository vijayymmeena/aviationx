## build runner
FROM node:lts-alpine AS build-runner

# Install pnpm globally
RUN npm install -g pnpm

# Set temp directory
WORKDIR /tmp/app

# Copy dependency files first for caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source files
COPY src ./src
COPY tsconfig.json ./

# Build project
RUN pnpm run build

## production runner
FROM node:lts-alpine AS prod-runner

# Install pnpm globally
RUN npm install -g pnpm

# Set work directory
WORKDIR /app

# Copy package.json and lockfile from build stage
COPY --from=build-runner /tmp/app/package.json /tmp/app/pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

# Copy built files from build stage
COPY --from=build-runner /tmp/app/build ./build

# Start the app
CMD ["pnpm", "start"]
