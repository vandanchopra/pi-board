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

function deleteActivity(id) {
  const activity = db.prepare(`SELECT * FROM activity_log WHERE id = ?`).get(id);
  if (!activity) throw new Error(`Activity entry not found: ${id}`);
  db.prepare(`DELETE FROM activity_log WHERE id = ?`).run(id);
  return activity;
}

module.exports = { logActivity, getTaskActivity, deleteActivity };
