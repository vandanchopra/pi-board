const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(process.cwd(), '.pi');
const DB_FILE = path.join(DB_DIR, 'board.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_FILE);

db.exec(`
  CREATE TABLE IF NOT EXISTS sprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS labels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#38bdf8'
  );

  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#4ade80'
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'backlog' CHECK(status IN ('backlog', 'in-progress', 'code-review', 'uat', 'completed')),
    type TEXT NOT NULL DEFAULT 'feature' CHECK(type IN ('bug', 'feature', 'chore')),
    assignee_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('urgent', 'high', 'medium', 'low')),
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS task_labels (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
  );

  CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_task_id)
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS column_settings (
    status TEXT PRIMARY KEY,
    wip_limit INTEGER
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author TEXT NOT NULL DEFAULT 'user',
    body TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migrations: add columns safely to existing tables
const taskCols = db.prepare("PRAGMA table_info(tasks)").all();
if (!taskCols.find(c => c.name === 'due_date')) {
  db.exec(`ALTER TABLE tasks ADD COLUMN due_date DATE;`);
}
if (!taskCols.find(c => c.name === 'estimate')) {
  db.exec(`ALTER TABLE tasks ADD COLUMN estimate INTEGER;`);
}
if (!taskCols.find(c => c.name === 'archived')) {
  db.exec(`ALTER TABLE tasks ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;`);
}

// Migration: retire removed "Features of the Future" lane by moving any legacy
// tasks back to backlog so they remain visible on the board.
db.prepare(`UPDATE tasks SET status = 'backlog' WHERE status = 'features-of-the-future'`).run();

// Migration: author for activity log entries
const activityCols = db.prepare("PRAGMA table_info(activity_log)").all();
if (!activityCols.find(c => c.name === 'author')) {
  db.exec(`ALTER TABLE activity_log ADD COLUMN author TEXT;`);
}

// Migration: updated_at for comments
const commentCols = db.prepare("PRAGMA table_info(comments)").all();
if (!commentCols.find(c => c.name === 'updated_at')) {
  db.exec(`ALTER TABLE comments ADD COLUMN updated_at DATETIME;`);
}

module.exports = db;
