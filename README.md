# Revised Judge0 - Node.js Implementation

A Node.js implementation of Judge0 code execution system supporting Python, Java, C++, C, and JavaScript.

## Features

- **Multi-language Support**: Python, Java, C++, C, and JavaScript
- **Isolated Execution**: Uses `isolate` sandbox for secure code execution
- **Resource Limits**: CPU time, memory, stack, and file size limits
- **RESTful API**: Simple Express.js API for code submissions

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- `isolate` sandbox tool installed and configured
- Required compilers/interpreters:
  - GCC 9.2.0 (for C/C++)
  - OpenJDK 13.0.1 (for Java)
  - Python 3.8.1
  - Node.js 12.14.0

## Installation

1. Install dependencies:

```bash
npm install
```

2. Ensure `isolate` is installed and configured:

```bash
# Check if isolate is available
which isolate

# If not installed, install it (varies by system)
# On Ubuntu/Debian:
sudo apt-get install isolate
```

3. Configure isolate (if needed):

```bash
# Check isolate configuration
isolate --check
```

## Usage

### Start the server:

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
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
│   ├── config/
│   │   ├── languages.js      # Language configurations
│   │   ├── statuses.js       # Status definitions
│   │   └── config.js         # Configuration constants
│   ├── services/
│   │   ├── isolateService.js # Isolate execution service
│   │   └── submissionService.js # Submission management
│   ├── routes/
│   │   ├── submissions.js    # Submission endpoints
│   │   ├── languages.js      # Language endpoints
│   │   └── statuses.js      # Status endpoints
│   └── server.js             # Express server
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

## Notes

- This is a simplified implementation for demonstration purposes
- In production, you should use a proper database instead of in-memory storage
- Add authentication and rate limiting for production use
- Error handling can be enhanced
- Consider adding support for additional languages

## License

MIT
# revised-judge0
