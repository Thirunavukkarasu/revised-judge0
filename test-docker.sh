#!/bin/bash

# Test script for Docker setup

echo "Testing Revised Judge0 Docker setup..."
echo ""

# Check if container is running
if ! docker ps | grep -q revised-judge0; then
    echo "❌ Container is not running. Start it with:"
    echo "   docker run -d --name revised-judge0 --privileged --cap-add=SYS_ADMIN -p 3000:3000 revised-judge0"
    exit 1
fi

echo "✅ Container is running"
echo ""

# Test health endpoint
echo "Testing health endpoint..."
HEALTH=$(curl -s http://localhost:3000/health)
if [ "$HEALTH" == '{"status":"ok"}' ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed: $HEALTH"
    exit 1
fi
echo ""

# Test root endpoint
echo "Testing root endpoint..."
ROOT=$(curl -s http://localhost:3000/)
if echo "$ROOT" | grep -q "Revised Judge0 API"; then
    echo "✅ Root endpoint working"
else
    echo "❌ Root endpoint failed"
    exit 1
fi
echo ""

# Test languages endpoint
echo "Testing languages endpoint..."
LANGUAGES=$(curl -s http://localhost:3000/languages)
if echo "$LANGUAGES" | grep -q "Python"; then
    echo "✅ Languages endpoint working"
else
    echo "❌ Languages endpoint failed"
    exit 1
fi
echo ""

# Test Python submission
echo "Testing Python submission..."
TOKEN=$(curl -s -X POST http://localhost:3000/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "source_code": "print(\"Hello from Docker!\")",
    "language_id": 4,
    "stdin": ""
  }' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to create submission"
    exit 1
fi

echo "✅ Submission created with token: $TOKEN"
echo "Waiting for processing..."
sleep 3

# Check submission result
RESULT=$(curl -s "http://localhost:3000/submissions/$TOKEN")
if echo "$RESULT" | grep -q "Hello from Docker"; then
    echo "✅ Submission executed successfully"
    echo ""
    echo "Result:"
    echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
else
    echo "❌ Submission execution failed"
    echo "Result: $RESULT"
    exit 1
fi

echo ""
echo "🎉 All tests passed!"

