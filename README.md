# Revised Judge0 - Bun.js Implementation

A Bun.js implementation of Judge0 code execution system supporting Python, Java, C++, C, and JavaScript.

## Features

- **Multi-language Support**: Python, Java, C++, C, and JavaScript
- **Isolated Execution**: Uses `isolate` sandbox for secure code execution
- **Resource Limits**: CPU time, memory, stack, and file size limits
- **RESTful API**: Simple Bun.js HTTP server API for code submissions

## Prerequisites

- Bun.js (latest version)
- `isolate` sandbox tool installed and configured
- Required compilers/interpreters:
  - GCC 9.2.0 (for C/C++)
  - OpenJDK 13.0.1 (for Java)
  - Python 3.8.1
  - Node.js 12.14.0

## Installation

1. Install Bun.js (if not already installed):

```bash
curl -fsSL https://bun.sh/install | bash
```

2. Install dependencies:

```bash
bun install
```

3. Ensure `isolate` is installed and configured:

```bash
# Check if isolate is available
which isolate

# If not installed, install it (varies by system)
# On Ubuntu/Debian:
sudo apt-get install isolate
```

4. Configure isolate (if needed):

```bash
# Check isolate configuration
isolate --check
```

## Usage

### Start the server:

```bash
bun start
```

Or for development with auto-reload:

```bash
bun run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Create Submission

```bash
POST /submissions
Content-Type: application/json

{
  "source_code": "#include <iostream>\nint main() { std::cout << \"Hello\" << std::endl; return 0; }",
  "language_id": 2,
  "stdin": "",
  "expected_output": "Hello\n"
}
```

Response:

```json
{
  "token": "uuid-token",
  "status": {
    "id": 1,
    "description": "In Queue"
  }
}
```

### Get Submission Result

```bash
GET /submissions/:token
```

Response:

```json
{
  "stdout": "Hello\n",
  "stderr": null,
  "compile_output": null,
  "message": null,
  "status": {
    "id": 3,
    "description": "Accepted"
  },
  "time": 0.001,
  "memory": 1024,
  "exit_code": 0,
  "exit_signal": null
}
```

### Get Languages

```bash
GET /languages
```

### Get Statuses

```bash
GET /statuses
```

## Supported Languages

| ID  | Language                     | Source File |
| --- | ---------------------------- | ----------- |
| 1   | C (GCC 9.2.0)                | main.c      |
| 2   | C++ (GCC 9.2.0)              | main.cpp    |
| 3   | Java (OpenJDK 13.0.1)        | Main.java   |
| 4   | Python (3.8.1)               | script.py   |
| 5   | JavaScript (Node.js 12.14.0) | script.js   |

## Project Structure

```
revised-judge0/
├── src/
│   ├── languages/            # Languages module
│   │   ├── config.js        # Language configurations
│   │   └── route.js         # Language endpoints
│   ├── statuses/            # Statuses module
│   │   ├── config.js        # Status definitions
│   │   └── route.js         # Status endpoints
│   ├── submissions/         # Submissions module
│   │   ├── service.js       # Submission management
│   │   ├── isolateService.js # Isolate execution service
│   │   └── route.js         # Submission endpoints
│   ├── shared/              # Shared utilities
│   │   └── config.js        # Shared configuration constants
│   └── server.js            # Bun.js HTTP server
├── package.json
└── README.md
```

## Example Usage

### C++ Example

```bash
curl -X POST http://localhost:3000/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "source_code": "#include <iostream>\nint main() { std::cout << \"Hello World\" << std::endl; return 0; }",
    "language_id": 2,
    "stdin": ""
  }'
```

### Python Example

```bash
curl -X POST http://localhost:3000/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "source_code": "print(\"Hello World\")",
    "language_id": 4,
    "stdin": ""
  }'
```

### Java Example

```bash
curl -X POST http://localhost:3000/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "source_code": "public class Main { public static void main(String[] args) { System.out.println(\"Hello World\"); } }",
    "language_id": 3,
    "stdin": ""
  }'
```

## Docker

> **Note:** For detailed information about the compilers base image, see [README.compilers.md](./README.compilers.md)

### Architecture

The Docker setup uses a two-image architecture (similar to Judge0):

1. **`revised-judge0-compilers`** - Base image containing:

   - All compilers/interpreters (GCC, Java, Python, Node.js)
   - Isolate sandbox
   - System dependencies

2. **`revised-judge0`** - Application image containing:
   - Bun.js runtime
   - Application code
   - Uses compilers image as base

This separation allows for:

- Faster rebuilds (compilers image is cached)
- Reusable compilers image
- Better separation of concerns

### Building and Running with Docker

**Option 1: Use the build script (recommended)**

```bash
./build.sh
```

This will build both images in the correct order.

**Option 2: Build manually**

1. **Build the compilers base image first:**

```bash
docker build -f Dockerfile.compilers -t revised-judge0-compilers:latest .
```

2. **Build the main application image:**

```bash
docker build -f Dockerfile -t revised-judge0:latest .
```

3. **Run the container:**

```bash
docker run -d \
  --name revised-judge0 \
  --privileged \
  --cap-add=SYS_ADMIN \
  -p 3000:3000 \
  revised-judge0:latest
```

4. **Access the API:**

The server will be available at `http://localhost:3000`

### Docker Requirements

- Docker with privileged mode support (required for isolate)

**Note:** The container runs in privileged mode to allow isolate to function properly. This is necessary for cgroups and sandboxing features. In production, consider using more restrictive security settings or running isolate in a separate container.

### Useful Docker Commands

```bash
# View logs
docker logs revised-judge0

# Stop the container
docker stop revised-judge0

# Start the container
docker start revised-judge0

# Remove the container
docker rm revised-judge0

# Remove images
docker rmi revised-judge0:latest
docker rmi revised-judge0-compilers:latest

# Rebuild only the application (if compilers haven't changed)
docker build -f Dockerfile -t revised-judge0:latest .
```

### Testing with Docker

Once the container is running, you can test it:

**Option 1: Use the test script (recommended)**

```bash
./test-docker.sh
```

**Option 2: Manual testing**

```bash
# Health check
curl http://localhost:3000/health

# Create a submission
curl -X POST http://localhost:3000/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "source_code": "print(\"Hello from Docker!\")",
    "language_id": 4,
    "stdin": ""
  }'

# Get submission result (replace TOKEN with the token from above)
curl http://localhost:3000/submissions/TOKEN
```

## Notes

- This is a simplified implementation for demonstration purposes
- In production, you should use a proper database instead of in-memory storage
- Add authentication and rate limiting for production use
- Error handling can be enhanced
- Consider adding support for additional languages

## License

MIT
