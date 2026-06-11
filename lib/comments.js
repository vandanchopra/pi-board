const db = require('./db');

function createComment({ task_id, author, body }) {
  if (!body) throw new Error('Comment body is required');
  const insert = db.prepare(`INSERT INTO comments (task_id, author, body) VALUES (?, ?, ?)`);
  const result = insert.run(task_id, author || 'user', body);
  return getComment(result.lastInsertRowid);
}

function getComment(id) {
  return db.prepare(`SELECT * FROM comments WHERE id = ?`).get(id) || null;
}

function listComments(taskId) {
  return db.prepare(`SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC`).all(taskId);
}

function updateComment(id, { body, author }) {
  const comment = getComment(id);
  if (!comment) throw new Error(`Comment not found: ${id}`);
  if (!body) throw new Error('Comment body is required');
  db.prepare(`UPDATE comments SET body = ?, updated_at = datetime('now') WHERE id = ?`).run(body, id);
  return getComment(id);
}

function deleteComment(id) {
  const comment = getComment(id);
  if (!comment) throw new Error(`Comment not found: ${id}`);
  db.prepare(`DELETE FROM comments WHERE id = ?`).run(id);
  return comment;
}

module.exports = { createComment, getComment, listComments, updateComment, deleteComment };
