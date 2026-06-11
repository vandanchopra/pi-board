const { exec } = require("child_process");
const {
  createTask, updateTask, listTasks, getTask, deleteTask, duplicateTask,
  createSprint, completeSprint, incompleteSprint, listSprints, updateSprint, deleteSprint, getSprint, archiveSprintTasks, getSprintStats,
  createLabel, listLabels, updateLabel, deleteLabel,
  createPerson, listPeople, updatePerson, deletePerson,
  createSubtask, toggleSubtask, updateSubtask, deleteSubtask,
  getColumnSettings, setColumnSetting,
  exportAll, importAll,
  getSprintBurndown, getAssigneeWorkload,
  createComment, listComments, updateComment, deleteComment,
  STATUSES,
} = require("./lib/board");
const { start, stop } = require("./server");

module.exports = async function (pi) {
  const { Type } = await import("typebox");

  const StatusType = Type.Union([
    Type.Literal("backlog"),
    Type.Literal("in-progress"),
    Type.Literal("code-review"),
    Type.Literal("uat"),
    Type.Literal("completed"),
  ]);

  const PriorityType = Type.Union([
    Type.Literal("urgent"),
    Type.Literal("high"),
    Type.Literal("medium"),
    Type.Literal("low"),
  ]);

  const TypeType = Type.Union([
    Type.Literal("bug"),
    Type.Literal("feature"),
    Type.Literal("chore"),
  ]);

  function normalizeTaskParams(params) {
    const normalized = { ...params };
    if (params.sprintId !== undefined) { normalized.sprint_id = params.sprintId; delete normalized.sprintId; }
    if (params.assigneeId !== undefined) { normalized.assignee_id = params.assigneeId; delete normalized.assigneeId; }
    if (params.labelIds !== undefined) { normalized.labelIds = params.labelIds; delete normalized.labelIds; }
    if (params.dueDate !== undefined) { normalized.due_date = params.dueDate; delete normalized.dueDate; }
    if (params.estimate !== undefined) { normalized.estimate = params.estimate; delete normalized.estimate; }
    return normalized;
  }

  pi.registerTool({
    name: "board_create_task",
    label: "Create Task",
    description: "Create a new task on the board",
    parameters: Type.Object({
      title: Type.String({ description: "Task title" }),
      description: Type.Optional(Type.String({ description: "Task description" })),
      sprintId: Type.Optional(Type.Integer({ description: "Sprint ID" })),
      status: Type.Optional(StatusType),
      type: Type.Optional(TypeType),
      priority: Type.Optional(PriorityType),
      order: Type.Optional(Type.Integer({ description: "Display order within column" })),
      assigneeId: Type.Optional(Type.Integer({ description: "Assignee person ID" })),
      assigneeName: Type.Optional(Type.String({ description: "Create and assign a new person by name (used if assigneeId omitted)" })),
      labelIds: Type.Optional(Type.Array(Type.Integer(), { description: "Label IDs to attach" })),
      dueDate: Type.Optional(Type.String({ description: "Due date (YYYY-MM-DD)" })),
      estimate: Type.Optional(Type.Integer({ description: "Story points estimate" })),
      dependsOnIds: Type.Optional(Type.Array(Type.Integer(), { description: "Task IDs this task depends on" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const task = createTask(normalizeTaskParams(params));
      return {
        content: [{ type: "text", text: `Created task ${task.id}: ${task.title} (${task.status})` }],
        details: { task },
      };
    },
  });

  pi.registerTool({
    name: "board_update_task",
    label: "Update Task",
    description: "Update an existing task by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Task ID" }),
      title: Type.Optional(Type.String()),
      description: Type.Optional(Type.String()),
      sprintId: Type.Optional(Type.Integer()),
      status: Type.Optional(StatusType),
      type: Type.Optional(TypeType),
      priority: Type.Optional(PriorityType),
      order: Type.Optional(Type.Integer()),
      assigneeId: Type.Optional(Type.Integer()),
      assigneeName: Type.Optional(Type.String({ description: "Create and assign a new person by name" })),
      labelIds: Type.Optional(Type.Array(Type.Integer())),
      dueDate: Type.Optional(Type.String({ description: "Due date (YYYY-MM-DD)" })),
      estimate: Type.Optional(Type.Integer({ description: "Story points estimate" })),
      dependsOnIds: Type.Optional(Type.Array(Type.Integer(), { description: "Task IDs this task depends on" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { id, ...updates } = params;
      const task = updateTask(id, normalizeTaskParams(updates));
      return {
        content: [{ type: "text", text: `Updated task ${task.id}: ${task.title} (${task.status})` }],
        details: { task },
      };
    },
  });

  pi.registerTool({
    name: "board_list_tasks",
    label: "List Tasks",
    description: "List all tasks, optionally filtered by sprint, status, search, and sorted",
    parameters: Type.Object({
      sprintId: Type.Optional(Type.Integer({ description: "Filter by sprint ID" })),
      status: Type.Optional(StatusType),
      search: Type.Optional(Type.String({ description: "Search by title or description substring" })),
      assigneeId: Type.Optional(Type.Integer({ description: "Filter by assignee person ID" })),
      labelIds: Type.Optional(Type.Array(Type.Integer(), { description: "Filter by label IDs" })),
      archived: Type.Optional(Type.Boolean({ description: "Include archived tasks" })),
      sortBy: Type.Optional(Type.Union([
        Type.Literal("priority"),
        Type.Literal("order"),
        Type.Literal("created_at"),
      ], { description: "Sort field" })),
      sortOrder: Type.Optional(Type.Union([
        Type.Literal("asc"),
        Type.Literal("desc"),
      ], { description: "Sort direction" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const normalized = normalizeTaskParams(params);
      if (params.archived === undefined) normalized.archived = false;
      const tasks = listTasks(normalized);
      if (tasks.length === 0) {
        return { content: [{ type: "text", text: "No tasks found." }] };
      }
      const lines = tasks.map(t => `- ${t.id}: ${t.title} [${t.status}]${t.assignee ? ' (' + t.assignee.name + ')' : ''} (sprint: ${t.sprint_id})`);
      return {
        content: [{ type: "text", text: `Tasks (${tasks.length}):\n${lines.join('\n')}` }],
        details: { tasks },
      };
    },
  });

  pi.registerTool({
    name: "board_get_task",
    label: "Get Task",
    description: "Get a single task by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Task ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const task = getTask(params.id);
      if (!task) {
        return { content: [{ type: "text", text: `Task not found: ${params.id}` }] };
      }
      return {
        content: [{ type: "text", text: `Task ${task.id}:\nTitle: ${task.title}\nDescription: ${task.description || '(none)'}\nType: ${task.type}\nStatus: ${task.status}\nPriority: ${task.priority}\nSprint: ${task.sprint_id}\nAssignee: ${task.assignee ? task.assignee.name : 'unassigned'}\nLabels: ${task.labels.map(l => l.name).join(', ') || 'none'}\nDue Date: ${task.due_date || 'none'}\nEstimate: ${task.estimate || 'none'}\nDepends On: ${task.depends_on.map(d => d.title).join(', ') || 'none'}\nBlocking: ${task.blocking.map(b => b.title).join(', ') || 'none'}\nCreated: ${task.created_at}\nUpdated: ${task.updated_at}` }],
        details: { task },
      };
    },
  });

  pi.registerTool({
    name: "board_delete_task",
    label: "Delete Task",
    description: "Delete a task by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Task ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const task = deleteTask(params.id);
      return {
        content: [{ type: "text", text: `Deleted task ${task.id}: ${task.title}` }],
        details: { task },
      };
    },
  });

  pi.registerTool({
    name: "board_duplicate_task",
    label: "Duplicate Task",
    description: "Duplicate a task by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Task ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const task = duplicateTask(params.id);
      return {
        content: [{ type: "text", text: `Duplicated task ${params.id} → new task ${task.id}: ${task.title}` }],
        details: { task },
      };
    },
  });

  pi.registerTool({
    name: "board_add_subtask",
    label: "Add Subtask",
    description: "Add a subtask to a task",
    parameters: Type.Object({
      taskId: Type.Integer({ description: "Parent task ID" }),
      title: Type.String({ description: "Subtask title" }),
      order: Type.Optional(Type.Integer({ description: "Display order" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const subtask = createSubtask({ task_id: params.taskId, title: params.title, order: params.order });
      return {
        content: [{ type: "text", text: `Added subtask ${subtask.id} to task ${params.taskId}: ${subtask.title}` }],
        details: { subtask },
      };
    },
  });

  pi.registerTool({
    name: "board_toggle_subtask",
    label: "Toggle Subtask",
    description: "Toggle completion status of a subtask",
    parameters: Type.Object({
      id: Type.Integer({ description: "Subtask ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const subtask = toggleSubtask(params.id);
      return {
        content: [{ type: "text", text: `Subtask ${subtask.id} ${subtask.completed ? 'completed' : 'incomplete'}: ${subtask.title}` }],
        details: { subtask },
      };
    },
  });

  pi.registerTool({
    name: "board_update_subtask",
    label: "Update Subtask",
    description: "Update a subtask title or order",
    parameters: Type.Object({
      id: Type.Integer({ description: "Subtask ID" }),
      title: Type.Optional(Type.String()),
      order: Type.Optional(Type.Integer()),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { id, ...updates } = params;
      const subtask = updateSubtask(id, updates);
      return {
        content: [{ type: "text", text: `Updated subtask ${subtask.id}: ${subtask.title}` }],
        details: { subtask },
      };
    },
  });

  pi.registerTool({
    name: "board_delete_subtask",
    label: "Delete Subtask",
    description: "Delete a subtask by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Subtask ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const subtask = deleteSubtask(params.id);
      return {
        content: [{ type: "text", text: `Deleted subtask ${subtask.id}: ${subtask.title}` }],
        details: { subtask },
      };
    },
  });

  pi.registerTool({
    name: "board_add_comment",
    label: "Add Comment",
    description: "Add a comment to a task",
    parameters: Type.Object({
      taskId: Type.Integer({ description: "Task ID" }),
      body: Type.String({ description: "Comment text" }),
      author: Type.Optional(Type.String({ description: "Author name" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const comment = createComment({ task_id: params.taskId, author: params.author, body: params.body });
      return {
        content: [{ type: "text", text: `Added comment to task ${params.taskId}` }],
        details: { comment },
      };
    },
  });

  pi.registerTool({
    name: "board_list_comments",
    label: "List Comments",
    description: "List comments on a task",
    parameters: Type.Object({
      taskId: Type.Integer({ description: "Task ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const comments = listComments(params.taskId);
      if (comments.length === 0) return { content: [{ type: "text", text: "No comments." }] };
      const lines = comments.map(c => `- ${c.author} (${c.created_at}): ${c.body}`);
      return {
        content: [{ type: "text", text: `Comments (${comments.length}):\n${lines.join('\n')}` }],
        details: { comments },
      };
    },
  });

  pi.registerTool({
    name: "board_delete_comment",
    label: "Delete Comment",
    description: "Delete a comment by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Comment ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      deleteComment(params.id);
      return {
        content: [{ type: "text", text: `Deleted comment ${params.id}` }],
      };
    },
  });

  pi.registerTool({
    name: "board_update_comment",
    label: "Update Comment",
    description: "Update a comment by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Comment ID" }),
      body: Type.String({ description: "Updated comment text" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const comment = updateComment(params.id, { body: params.body });
      return {
        content: [{ type: "text", text: `Updated comment ${comment.id}` }],
        details: { comment },
      };
    },
  });

  pi.registerTool({
    name: "board_create_sprint",
    label: "Create Sprint",
    description: "Create a new sprint (auto-activates it and completes the previous active sprint)",
    parameters: Type.Object({
      name: Type.String({ description: "Sprint name" }),
      startDate: Type.String({ description: "Start date (YYYY-MM-DD)" }),
      endDate: Type.String({ description: "End date (YYYY-MM-DD)" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const sprint = createSprint(params.name, params.startDate, params.endDate);
      return {
        content: [{ type: "text", text: `Created sprint ${sprint.id}: ${sprint.name} (${sprint.start_date} → ${sprint.end_date})` }],
        details: { sprint },
      };
    },
  });

  pi.registerTool({
    name: "board_list_sprints",
    label: "List Sprints",
    description: "List all sprints",
    parameters: Type.Object({}),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const sprints = listSprints();
      if (sprints.length === 0) return { content: [{ type: "text", text: "No sprints found." }] };
      const lines = sprints.map(s => `- ${s.id}: ${s.name} (${s.status}) ${s.start_date} → ${s.end_date}`);
      return {
        content: [{ type: "text", text: `Sprints (${sprints.length}):\n${lines.join('\n')}` }],
        details: { sprints },
      };
    },
  });

  pi.registerTool({
    name: "board_complete_sprint",
    label: "Complete Sprint",
    description: "Complete a sprint by ID and move all its tasks to completed",
    parameters: Type.Object({
      id: Type.Integer({ description: "Sprint ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const sprint = completeSprint(params.id);
      return {
        content: [{ type: "text", text: `Completed sprint ${sprint.id}: ${sprint.name}` }],
        details: { sprint },
      };
    },
  });

  pi.registerTool({
    name: "board_archive_sprint_tasks",
    label: "Archive Sprint Tasks",
    description: "Archive all completed tasks in a sprint",
    parameters: Type.Object({
      id: Type.Integer({ description: "Sprint ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const result = archiveSprintTasks(params.id);
      return {
        content: [{ type: "text", text: `Archived ${result.updated} completed tasks from sprint ${params.id}` }],
        details: { result },
      };
    },
  });

  pi.registerTool({
    name: "board_get_sprint_stats",
    label: "Get Sprint Stats",
    description: "Get statistics for a sprint",
    parameters: Type.Object({
      id: Type.Integer({ description: "Sprint ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const stats = getSprintStats(params.id);
      return {
        content: [{ type: "text", text: `Sprint ${stats.sprint_id} stats:\nTotal tasks: ${stats.total}\nCompleted: ${stats.completed} (${stats.completion_pct}%)\nTotal estimate: ${stats.total_estimate} pts\nCompleted estimate: ${stats.completed_estimate} pts (${stats.estimate_completion_pct}%)` }],
        details: { stats },
      };
    },
  });

  pi.registerTool({
    name: "board_get_sprint_burndown",
    label: "Get Sprint Burndown",
    description: "Get burndown data for a sprint",
    parameters: Type.Object({
      id: Type.Integer({ description: "Sprint ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const burndown = getSprintBurndown(params.id);
      const lines = burndown.completions.map(c => `- ${c.day}: ${c.count} tasks (${c.estimate} pts)`);
      return {
        content: [{ type: "text", text: `Burndown for sprint ${params.id}:\nTotal: ${burndown.total} tasks / ${burndown.totalEstimate} pts\nDaily completions:\n${lines.join('\n') || 'None'}` }],
        details: { burndown },
      };
    },
  });

  pi.registerTool({
    name: "board_get_workload",
    label: "Get Workload",
    description: "Get assignee workload overview",
    parameters: Type.Object({}),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const workload = getAssigneeWorkload();
      const lines = workload.map(w => `- ${w.name}: ${w.task_count} tasks, ${w.total_estimate} pts`);
      return {
        content: [{ type: "text", text: `Assignee workload:\n${lines.join('\n')}` }],
        details: { workload },
      };
    },
  });

  pi.registerTool({
    name: "board_incomplete_sprint",
    label: "Incomplete Sprint",
    description: "Reactivate a completed sprint by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Sprint ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const sprint = incompleteSprint(params.id);
      return {
        content: [{ type: "text", text: `Reactivated sprint ${sprint.id}: ${sprint.name}` }],
        details: { sprint },
      };
    },
  });

  pi.registerTool({
    name: "board_update_sprint",
    label: "Update Sprint",
    description: "Update an existing sprint by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Sprint ID" }),
      name: Type.Optional(Type.String()),
      startDate: Type.Optional(Type.String({ description: "Start date (YYYY-MM-DD)" })),
      endDate: Type.Optional(Type.String({ description: "End date (YYYY-MM-DD)" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { id, ...rest } = params;
      const updates = {};
      if (rest.name !== undefined) updates.name = rest.name;
      if (rest.startDate !== undefined) updates.start_date = rest.startDate;
      if (rest.endDate !== undefined) updates.end_date = rest.endDate;
      const sprint = updateSprint(id, updates);
      return {
        content: [{ type: "text", text: `Updated sprint ${sprint.id}: ${sprint.name} (${sprint.start_date} → ${sprint.end_date})` }],
        details: { sprint },
      };
    },
  });

  pi.registerTool({
    name: "board_delete_sprint",
    label: "Delete Sprint",
    description: "Delete a sprint by ID (fails if tasks are assigned)",
    parameters: Type.Object({
      id: Type.Integer({ description: "Sprint ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const result = deleteSprint(params.id);
      return {
        content: [{ type: "text", text: `Deleted sprint ${params.id}` }],
        details: { result },
      };
    },
  });

  pi.registerTool({
    name: "board_get_sprint",
    label: "Get Sprint",
    description: "Get a single sprint by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Sprint ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const sprint = getSprint(params.id);
      if (!sprint) {
        return { content: [{ type: "text", text: `Sprint not found: ${params.id}` }] };
      }
      return {
        content: [{ type: "text", text: `Sprint ${sprint.id}: ${sprint.name} (${sprint.status}) ${sprint.start_date} → ${sprint.end_date}` }],
        details: { sprint },
      };
    },
  });

  pi.registerTool({
    name: "board_create_label",
    label: "Create Label",
    description: "Create a new colored label",
    parameters: Type.Object({
      name: Type.String({ description: "Label name" }),
      color: Type.Optional(Type.String({ description: "Hex color (e.g. #38bdf8)" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const label = createLabel(params.name, params.color);
      return {
        content: [{ type: "text", text: `Created label ${label.id}: ${label.name} (${label.color})` }],
        details: { label },
      };
    },
  });

  pi.registerTool({
    name: "board_list_labels",
    label: "List Labels",
    description: "List all labels",
    parameters: Type.Object({}),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const labels = listLabels();
      if (labels.length === 0) return { content: [{ type: "text", text: "No labels found." }] };
      return {
        content: [{ type: "text", text: `Labels (${labels.length}):\n${labels.map(l => `- ${l.id}: ${l.name} (${l.color})`).join('\n')}` }],
        details: { labels },
      };
    },
  });

  pi.registerTool({
    name: "board_update_label",
    label: "Update Label",
    description: "Update a label by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Label ID" }),
      name: Type.Optional(Type.String()),
      color: Type.Optional(Type.String({ description: "Hex color (e.g. #38bdf8)" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { id, ...rest } = params;
      const label = updateLabel(id, rest.name, rest.color);
      return {
        content: [{ type: "text", text: `Updated label ${label.id}: ${label.name} (${label.color})` }],
        details: { label },
      };
    },
  });

  pi.registerTool({
    name: "board_delete_label",
    label: "Delete Label",
    description: "Delete a label by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Label ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      deleteLabel(params.id);
      return {
        content: [{ type: "text", text: `Deleted label ${params.id}` }],
      };
    },
  });

  pi.registerTool({
    name: "board_create_person",
    label: "Create Person",
    description: "Create a new person (assignee)",
    parameters: Type.Object({
      name: Type.String({ description: "Person name" }),
      color: Type.Optional(Type.String({ description: "Hex color (e.g. #4ade80)" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const person = createPerson(params.name, params.color);
      return {
        content: [{ type: "text", text: `Created person ${person.id}: ${person.name}` }],
        details: { person },
      };
    },
  });

  pi.registerTool({
    name: "board_list_column_settings",
    label: "List Column Settings",
    description: "List WIP limits for all columns",
    parameters: Type.Object({}),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const settings = getColumnSettings();
      if (settings.length === 0) return { content: [{ type: "text", text: "No column settings configured." }] };
      const lines = settings.map(s => `- ${s.status}: WIP limit ${s.wip_limit || 'none'}`);
      return {
        content: [{ type: "text", text: `Column settings:\n${lines.join('\n')}` }],
        details: { settings },
      };
    },
  });

  pi.registerTool({
    name: "board_set_column_wip_limit",
    label: "Set Column WIP Limit",
    description: "Set the WIP limit for a column/status",
    parameters: Type.Object({
      status: Type.String({ description: "Column status" }),
      wipLimit: Type.Integer({ description: "WIP limit (0 = no limit)" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const setting = setColumnSetting(params.status, params.wipLimit);
      return {
        content: [{ type: "text", text: `Set WIP limit for ${setting.status} to ${setting.wip_limit}` }],
        details: { setting },
      };
    },
  });

  pi.registerTool({
    name: "board_list_people",
    label: "List People",
    description: "List all people",
    parameters: Type.Object({}),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const people = listPeople();
      if (people.length === 0) return { content: [{ type: "text", text: "No people found." }] };
      return {
        content: [{ type: "text", text: `People (${people.length}):\n${people.map(p => `- ${p.id}: ${p.name}`).join('\n')}` }],
        details: { people },
      };
    },
  });

  pi.registerTool({
    name: "board_update_person",
    label: "Update Person",
    description: "Update a person by ID",
    parameters: Type.Object({
      id: Type.Integer({ description: "Person ID" }),
      name: Type.Optional(Type.String()),
      color: Type.Optional(Type.String({ description: "Hex color (e.g. #4ade80)" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { id, ...rest } = params;
      const person = updatePerson(id, rest.name, rest.color);
      return {
        content: [{ type: "text", text: `Updated person ${person.id}: ${person.name}` }],
        details: { person },
      };
    },
  });

  pi.registerTool({
    name: "board_delete_person",
    label: "Delete Person",
    description: "Delete a person by ID (unassigns their tasks)",
    parameters: Type.Object({
      id: Type.Integer({ description: "Person ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      deletePerson(params.id);
      return {
        content: [{ type: "text", text: `Deleted person ${params.id}` }],
      };
    },
  });

  pi.registerTool({
    name: "board_export_json",
    label: "Export Board to JSON",
    description: "Export all board data to JSON",
    parameters: Type.Object({}),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const data = exportAll();
      const summary = `Sprints: ${data.sprints.length}, Tasks: ${data.tasks.length}, Labels: ${data.labels.length}, People: ${data.people.length}`;
      return {
        content: [{ type: "text", text: `Board export:\n${summary}` }],
        details: { data },
      };
    },
  });

  pi.registerTool({
    name: "board_import_json",
    label: "Import Board from JSON",
    description: "Import board data from JSON (replaces all existing data)",
    parameters: Type.Object({
      data: Type.Any({ description: "Exported board data object" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      importAll(params.data);
      return {
        content: [{ type: "text", text: "Board data imported successfully." }],
      };
    },
  });

  pi.registerCommand("board", {
    description: "Open the Kanban board web UI in your browser",
    handler: async (args, ctx) => {
      const PORT = process.env.PI_BOARD_PORT || 3333;
      const result = start(PORT);
      if (result.alreadyRunning) {
        ctx.ui.notify(`Server already running at http://localhost:${PORT}`, "info");
      } else {
        ctx.ui.notify(`Started pi-board server at http://localhost:${PORT}`, "info");
      }
      const url = `http://localhost:${PORT}`;
      const cmd = process.platform === "darwin" ? `open ${url}` :
                  process.platform === "win32" ? `start ${url}` :
                  `xdg-open ${url}`;
      exec(cmd, (error) => {
        if (error) {
          ctx.ui.notify(`Board is running at ${url}`, "info");
        }
      });
    },
  });

  pi.registerCommand("board:restart", {
    description: "Restart the board server (use after updating pi-board)",
    handler: async (args, ctx) => {
      const PORT = process.env.PI_BOARD_PORT || 3333;
      const stopped = stop();
      if (stopped.stopped) {
        ctx.ui.notify(`Stopped pi-board server`, "info");
      }
      const result = start(PORT);
      ctx.ui.notify(`Restarted pi-board server at http://localhost:${PORT}`, "info");
      const url = `http://localhost:${PORT}`;
      const cmd = process.platform === "darwin" ? `open ${url}` :
                  process.platform === "win32" ? `start ${url}` :
                  `xdg-open ${url}`;
      exec(cmd, (error) => {
        if (error) {
          ctx.ui.notify(`Board is running at ${url}`, "info");
        }
      });
    },
  });
};
