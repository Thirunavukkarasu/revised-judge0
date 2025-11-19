import { v4 as uuidv4 } from "uuid";
import { getLanguageById } from "../languages/config.js";
import { getStatusByName } from "../statuses/config.js";
import config from "../shared/config.js";
import IsolateService from "./isolateService.js";

/**
 * In-memory storage for submissions (replace with database in production)
 */
const submissions = new Map();

/**
 * Submission Service
 * Handles submission creation, processing, and retrieval
 */
export default class SubmissionService {
  /**
   * Create a new submission
   */
  static createSubmission(data) {
    const language = getLanguageById(data.language_id);
    if (!language) {
      throw new Error(`Language with id ${data.language_id} not found`);
    }

    const submission = {
      id: submissions.size + 1,
      token: uuidv4(),
      source_code: data.source_code,
      language_id: data.language_id,
      language: language,
      stdin: data.stdin || "",
      expected_output: data.expected_output || null,
      compiler_options: data.compiler_options || "",
      command_line_arguments: data.command_line_arguments || "",
      cpu_time_limit: data.cpu_time_limit || config.CPU_TIME_LIMIT,
      cpu_extra_time: data.cpu_extra_time || config.CPU_EXTRA_TIME,
      wall_time_limit: data.wall_time_limit || config.WALL_TIME_LIMIT,
      memory_limit: data.memory_limit || config.MEMORY_LIMIT,
      stack_limit: data.stack_limit || config.STACK_LIMIT,
      max_processes_and_or_threads:
        data.max_processes_and_or_threads ||
        config.MAX_PROCESSES_AND_OR_THREADS,
      max_file_size: data.max_file_size || config.MAX_FILE_SIZE,
      enable_per_process_and_thread_time_limit:
        data.enable_per_process_and_thread_time_limit || false,
      enable_per_process_and_thread_memory_limit:
        data.enable_per_process_and_thread_memory_limit || false,
      redirect_stderr_to_stdout:
        data.redirect_stderr_to_stdout || config.REDIRECT_STDERR_TO_STDOUT,
      enable_network: data.enable_network || config.ENABLE_NETWORK,
      status: getStatusByName("In Queue"),
      created_at: new Date(),
      queued_at: new Date(),
      started_at: null,
      finished_at: null,
      time: null,
      wall_time: null,
      memory: null,
      stdout: null,
      stderr: null,
      compile_output: null,
      exit_code: null,
      exit_signal: null,
      message: null,
    };

    submissions.set(submission.id, submission);
    return submission;
  }

  /**
   * Get submission by ID
   */
  static getSubmissionById(id) {
    return submissions.get(parseInt(id));
  }

  /**
   * Get submission by token
   */
  static getSubmissionByToken(token) {
    for (const submission of submissions.values()) {
      if (submission.token === token) {
        return submission;
      }
    }
    return null;
  }

  /**
   * Process a submission
   */
  static async processSubmission(submissionId) {
    const submission = submissions.get(submissionId);
    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`);
    }

    // Update status to processing
    submission.status = getStatusByName("Processing");
    submission.started_at = new Date();

    const isolateService = new IsolateService(submission);

    try {
      // Initialize workdir
      isolateService.initializeWorkdir();

      // Compile if needed
      const compileResult = await isolateService.compile();
      if (!compileResult.success) {
        submission.status =
          compileResult.status || getStatusByName("Compilation Error");
        submission.compile_output = compileResult.compile_output;
        submission.finished_at = new Date();
        isolateService.cleanup();
        return submission;
      }

      submission.compile_output = compileResult.compile_output;

      // Run the code
      const runResult = await isolateService.run();
      if (!runResult.success) {
        submission.status = getStatusByName("Runtime Error (NZEC)");
        submission.finished_at = new Date();
        isolateService.cleanup();
        return submission;
      }

      // Verify results
      const verifyResult = isolateService.verify();
      submission.stdout = verifyResult.stdout;
      submission.stderr = verifyResult.stderr;
      submission.time = verifyResult.time;
      submission.wall_time = verifyResult.wall_time;
      submission.memory = verifyResult.memory;
      submission.exit_code = verifyResult.exit_code;
      submission.exit_signal = verifyResult.exit_signal;
      submission.message = verifyResult.message;
      submission.status = verifyResult.status;
      submission.finished_at = new Date();

      // Cleanup
      isolateService.cleanup();

      return submission;
    } catch (error) {
      submission.status = getStatusByName("Internal Error");
      submission.message = error.message;
      submission.finished_at = new Date();
      isolateService.cleanup();
      return submission;
    }
  }

  /**
   * Get all submissions
   */
  static getAllSubmissions() {
    return Array.from(submissions.values());
  }
}
