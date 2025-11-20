# Main application image
# Uses the compilers base image which contains all compilers and isolate
FROM revised-judge0-compilers:latest

# Install Bun.js
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN bun install

# Copy application code
COPY . .

# Verify isolate is available
RUN isolate --check || true

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Run as root for isolate (isolate needs root privileges)
# In production, consider using a more secure setup
USER root

# Start the server
CMD ["bun", "run", "src/server.js"]

