const db = require('./db');

function logActivity({ task_id, action, old_value, new_value, author }) {
  return db.prepare(`
    INSERT INTO activity_log (task_id, action, old_value, new_value, author)
    VALUES (?, ?, ?, ?, ?)
  `).run(task_id, action, old_value || null, new_value || null, author || null);
}

function getTaskActivity(taskId) {
  return db.prepare(`
    SELECT * FROM activity_log WHERE task_id = ? ORDER BY created_at ASC
  `).all(taskId);
}

module.exports = { logActivity, getTaskActivity };
