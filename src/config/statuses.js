/**
 * Status definitions for submissions
 */

const statuses = [
  { id: 1, name: "In Queue" },
  { id: 2, name: "Processing" },
  { id: 3, name: "Accepted" },
  { id: 4, name: "Wrong Answer" },
  { id: 5, name: "Time Limit Exceeded" },
  { id: 6, name: "Compilation Error" },
  { id: 7, name: "Runtime Error (SIGSEGV)" },
  { id: 8, name: "Runtime Error (SIGXFSZ)" },
  { id: 9, name: "Runtime Error (SIGFPE)" },
  { id: 10, name: "Runtime Error (SIGABRT)" },
  { id: 11, name: "Runtime Error (NZEC)" },
  { id: 12, name: "Runtime Error (Other)" },
  { id: 13, name: "Internal Error" },
  { id: 14, name: "Exec Format Error" },
];

function getStatusById(id) {
  return statuses.find((s) => s.id === parseInt(id));
}

function getStatusByName(name) {
  return statuses.find((s) => s.name === name);
}

function getAllStatuses() {
  return statuses;
}

module.exports = {
  statuses,
  getStatusById,
  getStatusByName,
  getAllStatuses,
};
