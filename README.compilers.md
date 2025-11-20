# Revised Judge0 Compilers Docker Image

A Docker base image containing compilers, interpreters, and the isolate sandbox for code execution. This image follows the same architecture as [Judge0's compilers image](https://github.com/judge0/compilers).

## Overview

This image provides a consistent, reproducible environment with specific versions of compilers and interpreters. It's designed to be used as a base image for code execution systems.

## Supported Languages

- **C** - GCC 9.2.0 (built from source)
- **C++** - GCC 9.2.0 (built from source)
- **Java** - OpenJDK 13.0.1
- **Python** - Python 3.8.1 (built from source)
- **JavaScript** - Node.js 18 LTS
- **SQL** - SQLite3

## Components

### Compilers & Interpreters

- **GCC 9.2.0**: Installed to `/usr/local/gcc-9.2.0`
  - Supports C and C++
  - Built from source with multilib disabled
- **Python 3.8.1**: Installed to `/usr/local/python-3.8.1`
  - Built from source
- **OpenJDK 13.0.1**: Installed to `/usr/local/openjdk13`

  - Symlinks created in `/usr/local/bin/`:
    - `javac` → `/usr/local/openjdk13/bin/javac`
    - `java` → `/usr/local/openjdk13/bin/java`
    - `jar` → `/usr/local/openjdk13/bin/jar`

- **Node.js 18 LTS**: Installed via NodeSource repository

  - Available as `node` and `npm` commands

- **SQLite3**: Installed via apt package manager
  - Available as `sqlite3` command

### Sandboxing

- **Isolate**: Judge0's fork (commit `ad39cc4d0fbb577fb545910095c9da5ef8fc9a1a`)
  - Installed to `/usr/local/bin/isolate`
  - Box root directory: `/var/local/lib/isolate` (set via `BOX_ROOT` environment variable)

## Building the Image

```bash
docker build -f Dockerfile.compilers -t revised-judge0-compilers:latest .
```

**Note:** Building from source takes significant time (1-2 hours) as it compiles GCC and Python. The image is large (~2-3 GB) but provides exact version control.

## Using as Base Image

This image is designed to be used as a base for application images:

```dockerfile
FROM revised-judge0-compilers:latest

# Your application setup here
# Bun.js, application code, etc.
```

## Environment Variables

- `BOX_ROOT=/var/local/lib/isolate` - Isolate sandbox root directory
- `LANG=en_US.UTF-8` - Locale settings
- `LANGUAGE=en_US:en` - Language settings
- `LC_ALL=en_US.UTF-8` - Locale settings

## Version Information

The versions used in this image are:

| Component | Version                                  | Source                |
| --------- | ---------------------------------------- | --------------------- |
| GCC       | 9.2.0                                    | Built from source     |
| Python    | 3.8.1                                    | Built from source     |
| OpenJDK   | 13.0.1                                   | Pre-built binary      |
| Node.js   | 18 LTS                                   | NodeSource repository |
| SQLite3   | Latest                                   | Ubuntu 22.04 package  |
| Isolate   | ad39cc4d0fbb577fb545910095c9da5ef8fc9a1a | Judge0 fork           |

## Why Build from Source?

Following Judge0's approach, we build GCC and Python from source to ensure:

1. **Version Consistency**: Exact same versions across all environments
2. **Reproducibility**: Same build every time, regardless of Ubuntu updates
3. **Isolation**: Compilers installed to `/usr/local/` paths, not system paths
4. **Production Parity**: Matches Judge0's production setup

## Quick Test

After building, you can test the compilers:

```bash
# Test GCC
docker run --rm revised-judge0-compilers:latest /usr/local/gcc-9.2.0/bin/gcc --version

# Test Python
docker run --rm revised-judge0-compilers:latest /usr/local/python-3.8.1/bin/python3 --version

# Test Java
docker run --rm revised-judge0-compilers:latest java -version

# Test Node.js
docker run --rm revised-judge0-compilers:latest node --version

# Test SQLite
docker run --rm revised-judge0-compilers:latest sqlite3 --version

# Test Isolate
docker run --rm --privileged revised-judge0-compilers:latest isolate --version
```

## Image Size

- **Base Ubuntu 22.04**: ~80 MB
- **With compilers built from source**: ~2-3 GB
- **Final image size**: ~2-3 GB

## Build Time

- **System packages**: ~5 minutes
- **GCC compilation**: ~30-60 minutes (depends on CPU cores)
- **Python compilation**: ~10-20 minutes
- **Total build time**: ~1-2 hours

## Maintenance

### Updating Versions

To update compiler versions, modify the `ENV` variables in `Dockerfile.compilers`:

```dockerfile
ENV GCC_VERSIONS \
    9.2.0  # Update version here

ENV PYTHON_VERSIONS \
    3.8.1  # Update version here
```

Then rebuild the image.

### Checking for Updates

The Dockerfile includes comments with URLs to check for latest versions:

- GCC: https://gcc.gnu.org/releases.html
- Python: https://www.python.org/downloads
- OpenJDK: https://jdk.java.net
- Node.js: https://nodejs.org
- SQLite3: https://packages.debian.org/buster/sqlite3

## Troubleshooting

### Build Fails During GCC Compilation

- Ensure you have enough disk space (at least 10 GB free)
- Ensure you have enough RAM (at least 4 GB recommended)
- The build uses `make -j$(nproc)` for parallel compilation

### Isolate Not Working

- Ensure container runs with `--privileged` flag
- Ensure `SYS_ADMIN` capability is added: `--cap-add=SYS_ADMIN`
- Check that `/var/local/lib/isolate` directory exists and has correct permissions

### Compiler Not Found

- Check installation paths: `/usr/local/gcc-9.2.0/bin/`, `/usr/local/python-3.8.1/bin/`
- Use full paths or add to PATH environment variable
- Verify symlinks exist for Java: `/usr/local/bin/java`

## License

This image follows the same licensing as Judge0. See the main project LICENSE file for details.

## References

- [Judge0 Compilers Repository](https://github.com/judge0/compilers)
- [Judge0 Isolate Fork](https://github.com/judge0/isolate)
- [Original Isolate](https://github.com/ioi/isolate)
