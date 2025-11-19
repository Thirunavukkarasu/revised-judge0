const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { getStatusByName } = require("../config/statuses");
const config = require("../config/config");

/**
 * Isolate execution service
 * Handles compilation and execution of code in isolated sandboxes
 */
class IsolateService {
  constructor(submission) {
    this.submission = submission;
    this.boxId = submission.id % 2147483647;
    this.cgroups = this.shouldUseCgroups() ? "--cg" : "";
    this.workdir = null;
    this.boxdir = null;
    this.tmpdir = null;
    this.useIsolate = true; // Will be set in initializeWorkdir
  }

  shouldUseCgroups() {
    return (
      !this.submission.enable_per_process_and_thread_time_limit ||
      !this.submission.enable_per_process_and_thread_memory_limit
    );
  }

  /**
   * Initialize the isolate sandbox
   */
  initializeWorkdir() {
    try {
      // Check if isolate is available
      let isolateAvailable = true;
      try {
        execSync("which isolate", { encoding: "utf-8", stdio: "pipe" });
      } catch (error) {
        isolateAvailable = false;
      }

      if (!isolateAvailable && process.env.NODE_ENV !== "development") {
        throw new Error(
          "isolate command not found. Please install isolate or set NODE_ENV=development"
        );
      }

      if (!isolateAvailable) {
        // Development mode: use temp directory instead of isolate
        console.log(`[DEV MODE] Using temp directory instead of isolate`);
        this.useIsolate = false;
        const os = require("os");
        const tempDir = path.join(os.tmpdir(), `judge0-${this.boxId}`);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        this.workdir = tempDir;
        this.boxdir = path.join(this.workdir, "box");
        this.tmpdir = path.join(this.workdir, "tmp");
        if (!fs.existsSync(this.boxdir)) {
          fs.mkdirSync(this.boxdir, { recursive: true });
        }
        if (!fs.existsSync(this.tmpdir)) {
          fs.mkdirSync(this.tmpdir, { recursive: true });
        }
        console.log(`[DEV MODE] Using workdir: ${this.workdir}`);
      } else {
        this.useIsolate = true;
        // Initialize isolate box
        console.log(`Initializing isolate box ${this.boxId}...`);
        const initOutput = execSync(
          `isolate ${this.cgroups} -b ${this.boxId} --init`,
          { encoding: "utf-8" }
        );
        this.workdir = initOutput.trim();
        console.log(`Isolate box initialized at: ${this.workdir}`);
        this.boxdir = path.join(this.workdir, "box");
        this.tmpdir = path.join(this.workdir, "tmp");
      }

      // Create necessary files
      this.stdinFile = path.join(this.workdir, "stdin.txt");
      this.stdoutFile = path.join(this.workdir, "stdout.txt");
      this.stderrFile = path.join(this.workdir, "stderr.txt");
      this.metadataFile = path.join(this.workdir, "metadata.txt");

      // Initialize files
      this.initializeFile(this.stdinFile);
      this.initializeFile(this.stdoutFile);
      this.initializeFile(this.stderrFile);
      this.initializeFile(this.metadataFile);

      // Write source code
      const language = this.submission.language;
      const sourceFile = path.join(this.boxdir, language.source_file);
      fs.writeFileSync(sourceFile, this.submission.source_code, "utf8");

      // Write stdin
      fs.writeFileSync(this.stdinFile, this.submission.stdin || "", "utf8");

      return true;
    } catch (error) {
      console.error(`Failed to initialize workdir:`, error);
      throw new Error(`Failed to initialize workdir: ${error.message}`);
    }
  }

  initializeFile(filePath) {
    try {
      execSync(`sudo touch ${filePath} && sudo chown $(whoami): ${filePath}`, {
        encoding: "utf-8",
      });
    } catch (error) {
      // If sudo fails, try without sudo
      fs.writeFileSync(filePath, "");
    }
  }

  /**
   * Compile the code if needed
   */
  async compile() {
    const language = this.submission.language;

    // Skip compilation for interpreted languages
    if (!language.compile_cmd) {
      return { success: true };
    }

    const compileScript = path.join(this.boxdir, "compile.sh");
    const compilerOptions = this.sanitizeInput(
      this.submission.compiler_options || ""
    );
    const compileCmd = language.compile_cmd.replace("%s", compilerOptions);

    // Write compile script
    fs.writeFileSync(compileScript, compileCmd, "utf8");
    fs.chmodSync(compileScript, "755");

    const compileOutputFile = path.join(this.workdir, "compile_output.txt");
    this.initializeFile(compileOutputFile);

    try {
      console.log(`Compiling with command: ${compileCmd}`);

      if (this.useIsolate) {
        // Build isolate command for compilation
        const isolateCmd = this.buildIsolateCommand({
          input: "/dev/null",
          output: compileOutputFile,
          timeLimit: config.MAX_CPU_TIME_LIMIT,
          wallTimeLimit: config.MAX_WALL_TIME_LIMIT,
          memoryLimit: config.MAX_MEMORY_LIMIT,
          stackLimit: config.MAX_STACK_LIMIT,
          maxProcesses: config.MAX_MAX_PROCESSES_AND_OR_THREADS,
          maxFileSize: config.MAX_MAX_FILE_SIZE,
          command: `/bin/bash compile.sh`,
        });
        execSync(isolateCmd, { encoding: "utf-8", stdio: "pipe" });
      } else {
        // Dev mode: run directly without isolate (less secure!)
        console.log(`[DEV MODE] Running compilation without isolate`);
        try {
          const output = execSync(`cd ${this.boxdir} && ${compileCmd} 2>&1`, {
            encoding: "utf-8",
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000, // 30 second timeout
          });
          fs.writeFileSync(compileOutputFile, output);
        } catch (error) {
          // Write error output to compile output file
          const errorOutput =
            error.stdout ||
            error.stderr ||
            error.message ||
            "Compilation failed";
          fs.writeFileSync(compileOutputFile, errorOutput);
          throw error; // Re-throw to be caught by outer try-catch
        }
      }

      // Read compile output
      let compileOutput = "";
      if (fs.existsSync(compileOutputFile)) {
        compileOutput = fs.readFileSync(compileOutputFile, "utf8");
      }
      console.log(`Compilation successful`);

      // Clean up
      fs.unlinkSync(compileScript);
      if (fs.existsSync(compileOutputFile)) {
        fs.unlinkSync(compileOutputFile);
      }

      return { success: true, compile_output: compileOutput || null };
    } catch (error) {
      console.error(`Compilation failed:`, error.message);
      // Read compile output even on failure
      let compileOutput = "";
      if (fs.existsSync(compileOutputFile)) {
        compileOutput = fs.readFileSync(compileOutputFile, "utf8");
      }

      // Clean up
      if (fs.existsSync(compileScript)) {
        fs.unlinkSync(compileScript);
      }
      if (fs.existsSync(compileOutputFile)) {
        fs.unlinkSync(compileOutputFile);
      }

      return {
        success: false,
        compile_output: compileOutput || "Compilation failed",
        status: getStatusByName("Compilation Error"),
      };
    }
  }

  /**
   * Run the compiled/interpreted code
   */
  async run() {
    const language = this.submission.language;
    const runScript = path.join(this.boxdir, "run.sh");
    const commandLineArgs = this.sanitizeInput(
      this.submission.command_line_arguments || ""
    );
    const runCmd = `${language.run_cmd} ${commandLineArgs}`.trim();

    // Write run script
    fs.writeFileSync(runScript, runCmd, "utf8");
    fs.chmodSync(runScript, "755");

    try {
      console.log(`Running with command: ${runCmd}`);

      if (this.useIsolate) {
        // Build isolate command for execution
        const isolateCmd = this.buildIsolateCommand({
          input: this.stdinFile,
          output: this.stdoutFile,
          error: this.stderrFile,
          timeLimit: this.submission.cpu_time_limit || config.CPU_TIME_LIMIT,
          extraTime: this.submission.cpu_extra_time || config.CPU_EXTRA_TIME,
          wallTimeLimit:
            this.submission.wall_time_limit || config.WALL_TIME_LIMIT,
          memoryLimit: this.submission.memory_limit || config.MEMORY_LIMIT,
          stackLimit: this.submission.stack_limit || config.STACK_LIMIT,
          maxProcesses:
            this.submission.max_processes_and_or_threads ||
            config.MAX_PROCESSES_AND_OR_THREADS,
          maxFileSize: this.submission.max_file_size || config.MAX_FILE_SIZE,
          enableNetwork:
            this.submission.enable_network || config.ENABLE_NETWORK,
          redirectStderr:
            this.submission.redirect_stderr_to_stdout ||
            config.REDIRECT_STDERR_TO_STDOUT,
          command: `/bin/bash run.sh`,
        });
        execSync(isolateCmd, { encoding: "utf-8", stdio: "pipe" });
      } else {
        // Dev mode: run directly without isolate (less secure!)
        console.log(`[DEV MODE] Running execution without isolate`);
        try {
          const stdin = fs.existsSync(this.stdinFile)
            ? fs.readFileSync(this.stdinFile, "utf8")
            : "";

          // Use spawnSync to properly capture stdout and stderr separately
          const result = spawnSync(
            "bash",
            ["-c", `cd ${this.boxdir} && ${runCmd}`],
            {
              input: stdin,
              encoding: "utf-8",
              maxBuffer: 10 * 1024 * 1024,
            }
          );

          // Write stdout and stderr to files
          const stdout = result.stdout || "";
          const stderr = result.stderr || "";

          console.log(
            `[DEV MODE] Execution result - stdout: "${stdout}", stderr: "${stderr}", exit code: ${result.status}`
          );

          console.log(`[DEBUG] Writing stdout to: ${this.stdoutFile}`);
          console.log(`[DEBUG] Writing stderr to: ${this.stderrFile}`);

          fs.writeFileSync(this.stdoutFile, stdout);
          console.log(
            `[DEBUG] stdoutFile written, exists: ${fs.existsSync(
              this.stdoutFile
            )}`
          );

          if (stderr) {
            fs.writeFileSync(this.stderrFile, stderr);
            console.log(
              `[DEBUG] stderrFile written, exists: ${fs.existsSync(
                this.stderrFile
              )}`
            );
          } else {
            // Write empty string to stderr file so it exists
            fs.writeFileSync(this.stderrFile, "");
          }

          // Create mock metadata with actual exit code
          const exitCode = result.status || 0;
          this.createMockMetadata(exitCode, result.signal);

          // If exit code is non-zero, throw error
          if (exitCode !== 0) {
            throw new Error(`Process exited with code ${exitCode}`);
          }
        } catch (error) {
          // Write error to stderr
          const errorOutput =
            error.stdout || error.stderr || error.message || "Execution failed";
          fs.writeFileSync(this.stderrFile, errorOutput);
          // Create mock metadata with error exit code
          this.createMockMetadata(error.status || 1, null);
          throw error; // Re-throw to be caught by outer try-catch
        }
      }
      console.log(`Execution successful`);

      // Clean up run script
      if (fs.existsSync(runScript)) {
        fs.unlinkSync(runScript);
      }

      return { success: true };
    } catch (error) {
      console.error(`Execution failed:`, error.message);
      // Clean up run script
      if (fs.existsSync(runScript)) {
        fs.unlinkSync(runScript);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Build isolate command string
   */
  buildIsolateCommand(options) {
    const {
      input,
      output,
      error,
      timeLimit,
      extraTime = 0,
      wallTimeLimit,
      memoryLimit,
      stackLimit,
      maxProcesses,
      maxFileSize,
      enableNetwork = false,
      redirectStderr = false,
      command,
    } = options;

    let cmd = `isolate ${this.cgroups} -s -b ${this.boxId} -M ${this.metadataFile}`;

    if (redirectStderr) {
      cmd += " --stderr-to-stdout";
    }

    if (enableNetwork) {
      cmd += " --share-net";
    }

    cmd += ` -t ${timeLimit}`;
    cmd += ` -x ${extraTime}`;
    cmd += ` -w ${wallTimeLimit}`;
    cmd += ` -k ${stackLimit}`;
    cmd += ` -p${maxProcesses}`;

    // Memory limit
    if (this.submission.enable_per_process_and_thread_memory_limit) {
      cmd += ` -m ${memoryLimit}`;
    } else {
      cmd += ` --cg-mem=${memoryLimit}`;
    }

    // Timing
    if (
      this.submission.enable_per_process_and_thread_time_limit &&
      this.cgroups
    ) {
      cmd += " --no-cg-timing";
    } else if (!this.submission.enable_per_process_and_thread_time_limit) {
      cmd += " --cg-timing";
    }

    cmd += ` -f ${maxFileSize}`;
    cmd += " -E HOME=/tmp";
    cmd +=
      ' -E PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"';
    cmd += " -E LANG -E LANGUAGE -E LC_ALL";
    cmd += " -d /etc:noexec";
    cmd += " --run";
    cmd += ` -- ${command}`;

    // I/O redirection
    if (input) {
      cmd += ` < ${input}`;
    }
    if (output) {
      cmd += ` > ${output}`;
    }
    if (error && !redirectStderr) {
      cmd += ` 2> ${error}`;
    }

    return cmd;
  }

  /**
   * Verify execution results
   */
  verify() {
    const metadata = this.getMetadata();

    let stdout = null;
    let stderr = null;

    console.log(
      `[DEBUG] Verifying - stdoutFile: ${
        this.stdoutFile
      }, exists: ${fs.existsSync(this.stdoutFile)}`
    );
    console.log(
      `[DEBUG] Verifying - stderrFile: ${
        this.stderrFile
      }, exists: ${fs.existsSync(this.stderrFile)}`
    );

    if (fs.existsSync(this.stdoutFile)) {
      const stdoutContent = fs.readFileSync(this.stdoutFile, "utf8");
      console.log(
        `[DEBUG] Read stdout content: "${stdoutContent}" (length: ${stdoutContent.length})`
      );
      // Only set to null if truly empty, otherwise keep the content (even if it's just whitespace)
      stdout = stdoutContent.trim() === "" ? null : stdoutContent;
    } else {
      console.log(`[DEBUG] stdoutFile does not exist at ${this.stdoutFile}`);
    }

    if (fs.existsSync(this.stderrFile)) {
      const stderrContent = fs.readFileSync(this.stderrFile, "utf8");
      console.log(
        `[DEBUG] Read stderr content: "${stderrContent}" (length: ${stderrContent.length})`
      );
      // Only set to null if truly empty, otherwise keep the content
      stderr = stderrContent.trim() === "" ? null : stderrContent;
    } else {
      console.log(`[DEBUG] stderrFile does not exist at ${this.stderrFile}`);
    }

    const status = this.determineStatus(metadata);

    return {
      stdout,
      stderr,
      time: parseFloat(metadata.time) || null,
      wall_time: parseFloat(metadata["time-wall"]) || null,
      memory: parseInt(metadata[this.cgroups ? "cg-mem" : "max-rss"]) || null,
      exit_code: parseInt(metadata.exitcode) || 0,
      exit_signal: metadata.exitsig ? parseInt(metadata.exitsig) : null,
      message: metadata.message || null,
      status,
    };
  }

  /**
   * Get metadata from isolate
   */
  getMetadata() {
    if (!fs.existsSync(this.metadataFile)) {
      return {};
    }

    const metadataContent = fs.readFileSync(this.metadataFile, "utf8");
    const metadata = {};

    metadataContent.split("\n").forEach((line) => {
      if (line.trim()) {
        const [key, ...values] = line.split(":");
        if (key && values.length > 0) {
          metadata[key.trim()] = values.join(":").trim();
        }
      }
    });

    return metadata;
  }

  /**
   * Determine submission status from metadata
   */
  determineStatus(metadata) {
    const status = metadata.status;

    if (status === "TO") {
      return getStatusByName("Time Limit Exceeded");
    } else if (status === "SG") {
      // Signal-based runtime error
      const exitSignal = parseInt(metadata.exitsig);
      if (exitSignal === 11) return getStatusByName("Runtime Error (SIGSEGV)");
      if (exitSignal === 25) return getStatusByName("Runtime Error (SIGXFSZ)");
      if (exitSignal === 8) return getStatusByName("Runtime Error (SIGFPE)");
      if (exitSignal === 6) return getStatusByName("Runtime Error (SIGABRT)");
      return getStatusByName("Runtime Error (Other)");
    } else if (status === "RE") {
      return getStatusByName("Runtime Error (NZEC)");
    } else if (status === "XX") {
      return getStatusByName("Internal Error");
    } else {
      // Check if output matches expected output
      if (this.submission.expected_output) {
        const expected = this.strip(this.submission.expected_output);
        const actual = this.strip(this.getStdout());
        if (expected === actual) {
          return getStatusByName("Accepted");
        } else {
          return getStatusByName("Wrong Answer");
        }
      } else {
        return getStatusByName("Accepted");
      }
    }
  }

  getStdout() {
    if (fs.existsSync(this.stdoutFile)) {
      return fs.readFileSync(this.stdoutFile, "utf8");
    }
    return "";
  }

  strip(text) {
    if (!text) return null;
    return text
      .split("\n")
      .map((line) => line.rtrim())
      .join("\n")
      .rtrim();
  }

  /**
   * Sanitize user input to prevent command injection
   */
  sanitizeInput(input) {
    if (!input) return "";
    return input
      .toString()
      .trim()
      .replace(/[$&;<>|`]/g, "");
  }

  /**
   * Create mock metadata for dev mode
   */
  createMockMetadata(exitCode, signal) {
    const metadata = {
      time: "0.001",
      "time-wall": "0.001",
      "max-rss": "1024",
      "cg-mem": "1024",
      exitcode: exitCode.toString(),
      exitsig: signal ? signal.toString() : "",
      status: exitCode === 0 ? "OK" : "RE",
      message: "",
    };

    const metadataContent = Object.entries(metadata)
      .map(([key, value]) => `${key}:${value}`)
      .join("\n");

    fs.writeFileSync(this.metadataFile, metadataContent);
  }

  /**
   * Cleanup isolate sandbox
   */
  cleanup() {
    try {
      // Fix permissions
      execSync(`sudo chown -R $(whoami): ${this.boxdir}`, { stdio: "pipe" });
    } catch (error) {
      // Ignore permission errors
    }

    // Clean up files
    try {
      if (fs.existsSync(this.boxdir)) {
        execSync(`sudo rm -rf ${this.boxdir}/*`, { stdio: "pipe" });
      }
      if (fs.existsSync(this.tmpdir)) {
        execSync(`sudo rm -rf ${this.tmpdir}/*`, { stdio: "pipe" });
      }
      [
        this.stdinFile,
        this.stdoutFile,
        this.stderrFile,
        this.metadataFile,
      ].forEach((file) => {
        if (file && fs.existsSync(file)) {
          execSync(`sudo rm -rf ${file}`, { stdio: "pipe" });
        }
      });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Cleanup isolate box
    if (this.useIsolate) {
      try {
        execSync(`isolate ${this.cgroups} -b ${this.boxId} --cleanup`, {
          stdio: "pipe",
        });
      } catch (error) {
        console.error(
          `Failed to cleanup isolate box ${this.boxId}:`,
          error.message
        );
      }
    } else {
      // Dev mode: cleanup temp directory
      try {
        if (fs.existsSync(this.workdir)) {
          execSync(`rm -rf ${this.workdir}`, { stdio: "pipe" });
        }
      } catch (error) {
        console.error(`Failed to cleanup temp directory:`, error.message);
      }
    }
  }
}

module.exports = IsolateService;
