const tasks = require('./tasks');
const sprints = require('./sprints');
const labels = require('./labels');
const people = require('./people');
const subtasks = require('./subtasks');
const columns = require('./columns');
const exporter = require('./export');
const activity = require('./activity');
const stats = require('./stats');
const comments = require('./comments');

module.exports = {
  STATUSES: tasks.STATUSES,
  // tasks
  createTask: tasks.createTask,
  getTask: tasks.getTask,
  listTasks: tasks.listTasks,
  updateTask: tasks.updateTask,
  moveTask: tasks.moveTask,
  positionTask: tasks.positionTask,
  deleteTask: tasks.deleteTask,
  duplicateTask: tasks.duplicateTask,
  archiveSprintTasks: tasks.archiveSprintTasks,
  // sprints
  createSprint: sprints.createSprint,
  getSprint: sprints.getSprint,
  getActiveSprint: sprints.getActiveSprint,
  listSprints: sprints.listSprints,
  completeSprint: sprints.completeSprint,
  incompleteSprint: sprints.incompleteSprint,
  updateSprint: sprints.updateSprint,
  deleteSprint: sprints.deleteSprint,
  getSprintStats: sprints.getSprintStats,
  // labels
  createLabel: labels.createLabel,
  getLabel: labels.getLabel,
  listLabels: labels.listLabels,
  updateLabel: labels.updateLabel,
  deleteLabel: labels.deleteLabel,
  // people
  createPerson: people.createPerson,
  getPerson: people.getPerson,
  listPeople: people.listPeople,
  updatePerson: people.updatePerson,
  deletePerson: people.deletePerson,
  // subtasks
  createSubtask: subtasks.createSubtask,
  getSubtask: subtasks.getSubtask,
  listSubtasks: subtasks.listSubtasks,
  toggleSubtask: subtasks.toggleSubtask,
  updateSubtask: subtasks.updateSubtask,
  deleteSubtask: subtasks.deleteSubtask,
  // columns
  getColumnSettings: columns.getColumnSettings,
  getColumnSetting: columns.getColumnSetting,
  setColumnSetting: columns.setColumnSetting,
  // export/import
  exportAll: exporter.exportAll,
  importAll: exporter.importAll,
  // activity
  getTaskActivity: activity.getTaskActivity,
  deleteActivity: activity.deleteActivity,
  // stats
  getSprintBurndown: stats.getSprintBurndown,
  getAssigneeWorkload: stats.getAssigneeWorkload,
  // comments
  createComment: comments.createComment,
  getComment: comments.getComment,
  listComments: comments.listComments,
  updateComment: comments.updateComment,
  deleteComment: comments.deleteComment,
};
