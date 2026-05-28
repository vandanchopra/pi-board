const express = require('express');
const path = require('path');
const {
  createTask, updateTask, listTasks, getTask, deleteTask, moveTask,
  createSprint, completeSprint, incompleteSprint, listSprints, getActiveSprint, updateSprint, deleteSprint, getSprintStats,
  createLabel, listLabels, updateLabel, deleteLabel,
  createPerson, listPeople, updatePerson, deletePerson,
  createSubtask, getSubtask, listSubtasks, toggleSubtask, updateSubtask, deleteSubtask,
  getColumnSettings, setColumnSetting,
  exportAll, importAll,
  getTaskActivity,
  getSprintBurndown, getAssigneeWorkload,
  createComment, listComments, deleteComment,
  STATUSES,
} = require('./lib/board');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Tasks
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = listTasks({
      sprint_id: req.query.sprint_id,
      status: req.query.status,
      search: req.query.search,
      assignee_id: req.query.assignee_id,
      labelIds: req.query.label_ids ? req.query.label_ids.split(',').map(Number) : undefined,
      archived: req.query.archived === '1' || req.query.archived === 'true',
      sortBy: req.query.sort_by,
      sortOrder: req.query.sort_order,
    });
    res.json({ tasks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = getTask(Number(req.params.id));
    if (!task) return res.status(404).json({ error: 'Not found' });
    res.json({ task });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const task = createTask(req.body);
    res.status(201).json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/tasks/:id', (req, res) => {
  try {
    const task = updateTask(Number(req.params.id), req.body);
    res.json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const task = deleteTask(Number(req.params.id));
    res.json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/tasks/:id/move', (req, res) => {
  try {
    const task = moveTask(Number(req.params.id), req.body.status, req.body.order, req.body.author || "pm-vh");
    res.json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/tasks/:id/duplicate', (req, res) => {
  try {
    const task = require('./lib/board').duplicateTask(Number(req.params.id));
    res.status(201).json({ task });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/tasks/:id/activity', (req, res) => {
  try {
    const activity = getTaskActivity(Number(req.params.id));
    res.json({ activity });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tasks/:id/comments', (req, res) => {
  try {
    const comments = listComments(Number(req.params.id));
    res.json({ comments });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/comments', (req, res) => {
  try {
    const comment = createComment(req.body);
    res.status(201).json({ comment });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/comments/:id', (req, res) => {
  try {
    deleteComment(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Subtasks
app.get('/api/tasks/:id/subtasks', (req, res) => {
  try {
    const subtasks = listSubtasks(Number(req.params.id));
    res.json({ subtasks });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/subtasks', (req, res) => {
  try {
    const subtask = createSubtask(req.body);
    res.status(201).json({ subtask });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/subtasks/:id', (req, res) => {
  try {
    const subtask = updateSubtask(Number(req.params.id), req.body);
    res.json({ subtask });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/subtasks/:id/toggle', (req, res) => {
  try {
    const subtask = toggleSubtask(Number(req.params.id));
    res.json({ subtask });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/subtasks/:id', (req, res) => {
  try {
    deleteSubtask(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Column Settings
app.get('/api/columns', (_req, res) => {
  try {
    res.json({ settings: getColumnSettings() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/columns/:status', (req, res) => {
  try {
    const setting = setColumnSetting(req.params.status, req.body.wip_limit);
    res.json({ setting });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Sprints
app.get('/api/sprints', (_req, res) => {
  try {
    res.json({ sprints: listSprints(), active: getActiveSprint() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sprints', (req, res) => {
  try {
    const sprint = createSprint(req.body.name, req.body.start_date, req.body.end_date);
    res.status(201).json({ sprint });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/sprints/:id/complete', (req, res) => {
  try {
    const sprint = completeSprint(Number(req.params.id));
    res.json({ sprint });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/sprints/:id/incomplete', (req, res) => {
  try {
    const sprint = incompleteSprint(Number(req.params.id));
    res.json({ sprint });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/sprints/:id', (req, res) => {
  try {
    const sprint = updateSprint(Number(req.params.id), req.body);
    res.json({ sprint });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/sprints/:id', (req, res) => {
  try {
    deleteSprint(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/sprints/:id/stats', (req, res) => {
  try {
    const stats = getSprintStats(Number(req.params.id));
    res.json({ stats });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/sprints/:id/burndown', (req, res) => {
  try {
    const burndown = getSprintBurndown(Number(req.params.id));
    res.json({ burndown });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/workload', (_req, res) => {
  try {
    const workload = getAssigneeWorkload();
    res.json({ workload });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Labels
app.get('/api/labels', (_req, res) => {
  try {
    res.json({ labels: listLabels() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/labels', (req, res) => {
  try {
    const label = createLabel(req.body.name, req.body.color);
    res.status(201).json({ label });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/labels/:id', (req, res) => {
  try {
    const label = updateLabel(Number(req.params.id), req.body.name, req.body.color);
    res.json({ label });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/labels/:id', (req, res) => {
  try {
    deleteLabel(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// People
app.get('/api/people', (_req, res) => {
  try {
    res.json({ people: listPeople() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/people', (req, res) => {
  try {
    const person = createPerson(req.body.name, req.body.color);
    res.status(201).json({ person });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/people/:id', (req, res) => {
  try {
    const person = updatePerson(Number(req.params.id), req.body.name, req.body.color);
    res.json({ person });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/people/:id', (req, res) => {
  try {
    deletePerson(Number(req.params.id));
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/export/json', (_req, res) => {
  try {
    const data = exportAll();
    res.setHeader('Content-Disposition', 'attachment; filename="pi-board-export.json"');
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/import/json', (req, res) => {
  try {
    importAll(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/export/csv', (req, res) => {
  try {
    const tasks = listTasks({
      sprint_id: req.query.sprint_id,
      status: req.query.status,
      search: req.query.search,
      assignee_id: req.query.assignee_id,
      labelIds: req.query.label_ids ? req.query.label_ids.split(',').map(Number) : undefined,
      archived: req.query.archived === '1' || req.query.archived === 'true',
      sortBy: req.query.sort_by,
      sortOrder: req.query.sort_order,
    });
    const headers = ['id','title','description','status','type','priority','sprint_id','assignee_id','due_date','estimate','created_at','updated_at'];
    const rows = tasks.map(t => [
      t.id, JSON.stringify(t.title), JSON.stringify(t.description || ''), t.status, t.type, t.priority,
      t.sprint_id || '', t.assignee_id || '', t.due_date || '', t.estimate || '', t.created_at, t.updated_at
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Disposition', 'attachment; filename="pi-board-tasks.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/statuses', (_req, res) => res.json({ statuses: STATUSES }));

// SPA catch-all: serve index.html for client-side routes like /task/:id
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let serverInstance = null;

function start(port = 3333) {
  if (serverInstance) {
    return { alreadyRunning: true, port };
  }
  serverInstance = app.listen(port, () => {
    console.log(`pi-board server running at http://localhost:${port}`);
  });
  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} already in use, assuming another pi-board instance is running.`);
    } else {
      console.error('Server error:', err);
    }
  });
  return { alreadyRunning: false, port };
}

function stop() {
  if (serverInstance) {
    serverInstance.close();
    serverInstance = null;
    return { stopped: true };
  }
  return { stopped: false };
}

module.exports = { app, start, stop };

if (require.main === module) {
  start(process.env.PI_BOARD_PORT || 3333);
}
