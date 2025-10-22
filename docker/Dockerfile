FROM --platform=linux/amd64 node:17-alpine
MAINTAINER Vaclav Barta "vaclav@equilibrium.co"

RUN apk --no-cache add su-exec curl gcc musl-dev

# Create application user early
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -h /app

# Install Rust toolchain as appuser
USER appuser
WORKDIR /app
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
ENV PATH="/app/.cargo/bin:${PATH}"

# Install WASM target and rust-analyzer
RUN rustup target add wasm32v1-none
RUN rustup component add rust-analyzer

# Switch back to root for system-level operations
USER root

# Copy package files and install dependencies
COPY compiler-api/package.json .
COPY compiler-api/yarn.lock .
COPY compiler-api/tsconfig.json .
COPY compiler-api/src ./src

# Copy only WASM optimizer (keeping wasm-opt for optimization)
COPY run.sh .

# Set ownership
RUN chown -R appuser:appgroup /app

# Install Node.js dependencies and build as appuser
USER appuser
RUN yarn && yarn build

# Switch back to root for CMD (run.sh will use su-exec to drop privileges)
USER root

EXPOSE $PORT
CMD ["./run.sh", "node", "dist/index.js"]