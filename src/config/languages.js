/**
 * Language configurations for supported languages
 * Each language has: id, name, source_file, compile_cmd (optional), run_cmd
 */

// Use system compilers/interpreters for development
// In production, these should point to specific versions in /usr/local
const languages = [
  {
    id: 1,
    name: "C (GCC)",
    source_file: "main.c",
    compile_cmd: "gcc %s main.c -o a.out",
    run_cmd: "./a.out",
  },
  {
    id: 2,
    name: "C++ (GCC)",
    source_file: "main.cpp",
    compile_cmd: "g++ %s main.cpp -o a.out",
    run_cmd: "./a.out",
  },
  {
    id: 3,
    name: "Java",
    source_file: "Main.java",
    compile_cmd: "javac %s Main.java",
    run_cmd: "java Main",
  },
  {
    id: 4,
    name: "Python",
    source_file: "script.py",
    compile_cmd: null, // Python is interpreted
    run_cmd: "python3 script.py",
  },
  {
    id: 5,
    name: "JavaScript (Node.js)",
    source_file: "script.js",
    compile_cmd: null, // JavaScript is interpreted
    run_cmd: "node script.js",
  },
];

/**
 * Get language by ID
 */
function getLanguageById(id) {
  return languages.find((lang) => lang.id === parseInt(id));
}

/**
 * Get all languages
 */
function getAllLanguages() {
  return languages;
}

module.exports = {
  languages,
  getLanguageById,
  getAllLanguages,
};
