var STATUS_CONFIG = {
  pending: { label: "\u5F85\u6267\u884C", color: "#6b7280" },
  running: { label: "\u6267\u884C\u4E2D", color: "#3b82f6" },
  done: { label: "\u5DF2\u5B8C\u6210", color: "#10b981" },
  failed: { label: "\u5DF2\u5931\u8D25", color: "#ef4444" },
  stopped: { label: "\u5DF2\u505C\u6B62", color: "#f59e0b" },
  interrupted: { label: "\u5DF2\u4E2D\u65AD", color: "#8b5cf6" }
};

function isUnread(task) {
  if (task.status !== "done" && task.status !== "failed" && task.status !== "stopped") return false;
  if (task.archivedAt) return false;
  if (!task.readAt) return true;
  return task.updatedAt > task.readAt;
}

function countUnread(tasks) {
  return tasks.filter(function (t) { return isUnread(t); }).length;
}

export function createController(transport) {
  var tasks = [];
  var boardOpen = false;
  var filter = "all";
  var navGroup = "all";
  var showDetail = null;
  var showNewTask = false;
  var showEdit = null;
  var showConfig = false;
  var loading = true;
  var error = null;
  var revision = 0;
  var config = { maxConcurrent: 2 };
  var options = { workspaces: [], presets: [], models: [] };
  var transportError = null;
  var sseDisposer = null;
  var prevStatuses = {};
  var TERMINAL = { done: 1, failed: 1, stopped: 1, interrupted: 1 };

  var listeners = [];

  function notif() {
    for (var i = 0; i < listeners.length; i++) listeners[i]();
  }

  function getSnapshot() {
    var counts = {};
    for (var i = 0; i < tasks.length; i++) {
      var s = tasks[i].status;
      counts[s] = (counts[s] || 0) + 1;
    }
    var metrics = {
      total: tasks.length,
      running: counts.running || 0,
      pending: counts.pending || 0,
      done: counts.done || 0,
      failed: counts.failed || 0,
      successRate: 95
    };
    var filtered = tasks;
    if (filter !== "all") filtered = filtered.filter(function (t) { return t.status === filter; });
    if (navGroup === "cron") filtered = filtered.filter(function (t) { return t.taskType === "cron"; });
    else if (navGroup === "schedule") filtered = filtered.filter(function (t) { return t.taskType === "schedule"; });
    else if (navGroup === "manual") filtered = filtered.filter(function (t) { return t.taskType === "manual"; });
    else if (navGroup === "archived") filtered = filtered.filter(function (t) { return !!t.archivedAt; });
    else if (navGroup === "active") filtered = filtered.filter(function (t) { return !t.archivedAt; });
    var detailTask = showDetail ? tasks.find(function (t) { return t.key === showDetail; }) : null;
    var editTask = showEdit ? tasks.find(function (t) { return t.key === showEdit; }) : null;
    return {
      tasks: tasks, filtered: filtered, counts: counts, metrics: metrics,
      boardOpen: boardOpen, filter: filter, navGroup: navGroup,
      showDetail: showDetail, showNewTask: showNewTask, showEdit: showEdit, showConfig: showConfig,
      loading: loading, error: error, revision: revision, config: config, options: options,
      transportError: transportError, detailTask: detailTask, editTask: editTask,
      unreadCount: countUnread(tasks)
    };
  }

  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; }

  async function loadState() {
    loading = true; notif();
    try {
      var data = await transport.state();
      tasks = data.tasks || [];
      revision = data.revision || 0;
      config = data.config || { maxConcurrent: 2 };
      if (data.metrics) getSnapshot().metrics = data.metrics;
      transportError = null; error = null;
    } catch (err) { transportError = err.message; }
    loading = false; notif();
  }

  async function loadOptions() {
    try { options = await transport.options(); } catch (e) {}
  }

  function startSSE() {
    if (sseDisposer) return;
    sseDisposer = transport.subscribe(function (data) {
      if (data && data.revision !== undefined) {
        var newTasks = data.tasks || [];
        for (var i = 0; i < newTasks.length; i++) {
          var t = newTasks[i];
          var prev = prevStatuses[t.key];
          if (prev !== undefined && prev !== t.status && TERMINAL[t.status] && (t.enableNotifications !== false) !== false) {
            var label = (STATUS_CONFIG[t.status] || {}).label || t.status;
            try { if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("autoqueue", { body: t.key + " \u2192 " + label, tag: t.key }); } catch (e) {}
          }
        }
        prevStatuses = {};
        for (var j = 0; j < newTasks.length; j++) prevStatuses[newTasks[j].key] = newTasks[j].status;
        tasks = newTasks;
        revision = data.revision;
        config = data.config || { maxConcurrent: 2 };
        if (data.metrics) getSnapshot().metrics = data.metrics;
        transportError = null;
        if (showDetail && !tasks.find(function (t) { return t.key === showDetail; })) showDetail = null;
        if (showEdit && !tasks.find(function (t) { return t.key === showEdit; })) showEdit = null;
      } else if (data === null) {
        loadState();
      }
      notif();
    });
  }

  function stopSSE() { if (sseDisposer) { sseDisposer(); sseDisposer = null; } }

  async function init() {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try { Notification.requestPermission(); } catch (e) {}
    }
    await Promise.all([loadState(), loadOptions()]);
    startSSE();
  }

  function openBoard() {
    document.dispatchEvent(new CustomEvent("dsh-panel-activate", { detail: "ssh" }));
    boardOpen = true; filter = "all"; navGroup = "all"; notif();
    document.dispatchEvent(new CustomEvent("dsh-panel-activate", { detail: "autoqueue" }));
  }

  function closeBoard() {
    if (!boardOpen) return;
    boardOpen = false; showDetail = null; showEdit = null; showNewTask = false; showConfig = false; notif();
  }

  function toggleBoard() { if (boardOpen) closeBoard(); else openBoard(); }
  function setFilter(f) { filter = f; notif(); }
  function setNavGroup(g) { navGroup = g; notif(); }
  function openDetail(key) { showDetail = key; var t = tasks.find(function (x) { return x.key === key; }); if (t && isUnread(t)) markRead(key); notif(); }
  function closeDetail() { showDetail = null; notif(); }
  function openEdit(key) { showEdit = key; notif(); }
  function closeEdit() { showEdit = null; notif(); }
  function openNewTask() { showNewTask = true; notif(); }
  function closeNewTask() { showNewTask = false; notif(); }
  function openConfig() { showConfig = true; notif(); }
  function closeConfig() { showConfig = false; notif(); }

  async function createTask(data) {
    try {
      var result = await transport.createTask({ requestId: crypto.randomUUID(), key: data.key, content: data.content, priority: data.priority, cron: data.cron, schedule: data.schedule, deadline: data.deadline, maxGoalRounds: data.maxGoalRounds, maxBlockedResumes: data.maxBlockedResumes, workspace: data.workspace, agentPreset: data.agentPreset, model: data.model, autoArchive: data.autoArchive, enableNotifications: data.enableNotifications });
      if (result.ok) { showNewTask = false; await loadState(); } else { error = result.error || "\u521B\u5EFA\u5931\u8D25"; notif(); }
    } catch (err) { error = err.message; notif(); }
  }

  async function markRead(key, read) {
    try { await transport.markRead(key, read !== false); await loadState(); } catch (err) { error = err.message; notif(); }
  }

  async function doAction(kind, key, opts) {
    try { var result = await transport.action(kind, key, opts); if (!result.ok) { error = result.error || kind + " \u5931\u8D25"; notif(); } await loadState(); } catch (err) { error = err.message; notif(); }
  }

  async function updateTask(key, patch) {
    try { var result = await transport.action("update", key, patch); if (result.ok) { showEdit = null; await loadState(); } else { error = result.error || "\u66F4\u65B0\u5931\u8D25"; notif(); } } catch (err) { error = err.message; notif(); }
  }

  async function setConcurrency(n) { try { await transport.action("set-concurrency", null, { maxConcurrent: n }); await loadState(); } catch (err) { error = err.message; notif(); } }
  async function updateConfig(patch) { try { await transport.setConfig(patch); await loadState(); } catch (err) { error = err.message; notif(); } }
  function clearError() { error = null; notif(); }

  function dispose() { stopSSE(); listeners = []; }

  return {
    getSnapshot: getSnapshot, subscribe: subscribe, init: init, dispose: dispose,
    openBoard: openBoard, closeBoard: closeBoard, toggleBoard: toggleBoard,
    setFilter: setFilter, setNavGroup: setNavGroup,
    openDetail: openDetail, closeDetail: closeDetail,
    openEdit: openEdit, closeEdit: closeEdit,
    openNewTask: openNewTask, closeNewTask: closeNewTask,
    openConfig: openConfig, closeConfig: closeConfig,
    createTask: createTask, doAction: doAction, updateTask: updateTask,
    setConcurrency: setConcurrency, updateConfig: updateConfig, clearError: clearError,
    loadState: loadState
  };
}