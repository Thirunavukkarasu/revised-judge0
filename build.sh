#!/bin/bash

# Build script for Revised Judge0 Docker images
# This script builds both the compilers base image and the main application image

set -e

echo "Building Revised Judge0 Docker images..."
echo ""

# Build compilers base image
echo "Step 1/2: Building compilers base image..."
docker build -f Dockerfile.compilers -t revised-judge0-compilers:latest .
echo "✅ Compilers image built successfully"
echo ""

# Build main application image
echo "Step 2/2: Building main application image..."
docker build -f Dockerfile -t revised-judge0:latest .
echo "✅ Application image built successfully"
echo ""

echo "🎉 All images built successfully!"
echo ""
echo "Available images:"
echo "  - revised-judge0-compilers:latest (base image with compilers)"
echo "  - revised-judge0:latest (main application)"
echo ""
echo "To run the application:"
echo "  docker run -d --name revised-judge0 --privileged --cap-add=SYS_ADMIN -p 3000:3000 revised-judge0:latest"

