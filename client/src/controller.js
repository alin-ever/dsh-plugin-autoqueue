var STATUS_CONFIG = {
  pending: { label: "\u5F85\u6267\u884C", color: "#596579" },
  running: { label: "\u6267\u884C\u4E2D", color: "#175cd3" },
  done: { label: "\u5DF2\u5B8C\u6210", color: "#067647" },
  failed: { label: "\u5DF2\u5931\u8D25", color: "#b42318" },
  stopped: { label: "\u5DF2\u505C\u6B62", color: "#9a6700" },
  interrupted: { label: "\u5DF2\u4E2D\u65AD", color: "#7a5af8" }
};

function isUnread(task) {
  if (task.status !== "done" && task.status !== "failed" && task.status !== "stopped" && task.status !== "interrupted") return false;
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
  var editTaskData = null;
  var showConfig = false;
  var loading = true;
  var error = null;
  var revision = 0;
  var config = { maxConcurrent: 1 };
  var metrics = { total: 0, running: 0, pending: 0, done24h: 0, failed24h: 0, successRate: 0 };
  var options = { workspaces: [], presets: [], models: [], isolation: { strict: true } };
  var transportError = null;
  var sseDisposer = null;
  var prevStatuses = {};
  var TERMINAL = { done: 1, failed: 1, stopped: 1, interrupted: 1 };
  var disposed = false;
  var lifecycle = 0;
  var initPromise = null;

  var listeners = [];

  function notif() {
    for (var i = 0; i < listeners.length; i++) listeners[i]();
  }

  function getSnapshot() {
    var counts = {};
    var activeTasks = tasks.filter(function (t) { return !t.archivedAt; });
    for (var i = 0; i < activeTasks.length; i++) {
      var s = activeTasks[i].status;
      counts[s] = (counts[s] || 0) + 1;
    }
    var filtered = tasks;
    if (filter !== "all") filtered = filtered.filter(function (t) { return t.status === filter; });
    if (navGroup === "archived") {
      filtered = filtered.filter(function (t) { return !!t.archivedAt; });
    } else {
      filtered = filtered.filter(function (t) { return !t.archivedAt; });
      if (navGroup === "cron") filtered = filtered.filter(function (t) { return t.taskType === "cron"; });
      else if (navGroup === "schedule") filtered = filtered.filter(function (t) { return t.taskType === "schedule"; });
      else if (navGroup === "manual") filtered = filtered.filter(function (t) { return t.taskType === "manual"; });
      else if (navGroup === "active") filtered = filtered.filter(function (t) { return t.status === "pending" || t.status === "running" || t.status === "interrupted"; });
    }
    var detailTask = showDetail ? tasks.find(function (t) { return t.key === showDetail; }) : null;
    var editTask = showEdit
      ? (editTaskData && editTaskData.key === showEdit ? editTaskData : tasks.find(function (t) { return t.key === showEdit; }))
      : null;
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

  function mergeConfig(next) {
    if (next && typeof next === "object") config = Object.assign({}, config, next);
  }

  function deriveMetrics(nextTasks) {
    var visible = (nextTasks || []).filter(function (t) { return !t.archivedAt; });
    var now = Date.now();
    var done24h = visible.filter(function (t) { return t.status === "done" && t.updatedAt && now - new Date(t.updatedAt).getTime() < 864e5; }).length;
    var failed24h = visible.filter(function (t) { return t.status === "failed" && t.updatedAt && now - new Date(t.updatedAt).getTime() < 864e5; }).length;
    var total24h = done24h + failed24h;
    return {
      total: visible.length,
      running: visible.filter(function (t) { return t.status === "running"; }).length,
      pending: visible.filter(function (t) { return t.status === "pending"; }).length,
      done24h: done24h,
      failed24h: failed24h,
      successRate: total24h ? Math.round(done24h / total24h * 100) : 0
    };
  }

  function applyState(data, notifyTransitions) {
    var incomingRevision = Number(data.revision);
    if (Number.isFinite(incomingRevision) && incomingRevision < revision) return false;
    var newTasks = data.tasks || [];
    var effectiveConfig = Object.assign({}, config, data.config || {});
    if (notifyTransitions) {
      for (var i = 0; i < newTasks.length; i++) {
        var t = newTasks[i];
        var prev = prevStatuses[t.key];
        var notificationsEnabled = t.enableNotifications === true || (t.enableNotifications == null && effectiveConfig.enableNotifications === true);
        if (prev !== undefined && prev !== t.status && TERMINAL[t.status] && notificationsEnabled) {
          var label = (STATUS_CONFIG[t.status] || {}).label || t.status;
          try { if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("autoqueue", { body: t.key + " \u2192 " + label, tag: t.key }); } catch (e) {}
        }
      }
    }
    prevStatuses = {};
    for (var j = 0; j < newTasks.length; j++) prevStatuses[newTasks[j].key] = newTasks[j].status;
    tasks = newTasks;
    if (Number.isFinite(incomingRevision)) revision = incomingRevision;
    mergeConfig(data.config);
    metrics = Object.assign(deriveMetrics(newTasks), data.metrics || {});
    transportError = null;
    error = null;
    if (showDetail && !tasks.find(function (t) { return t.key === showDetail; })) showDetail = null;
    if (showEdit && !tasks.find(function (t) { return t.key === showEdit; })) { showEdit = null; editTaskData = null; }
    return true;
  }

  async function loadState() {
    loading = true; notif();
    try {
      var data = await transport.state();
      applyState(data, false);
    } catch (err) { transportError = err.message; }
    loading = false; notif();
  }

  async function loadOptions() {
    try { options = await transport.options(); } catch (e) {}
  }

  async function loadConfig() {
    try {
      mergeConfig(await transport.getConfig());
    } catch (err) {
      transportError = err.message;
    }
  }

  function startSSE() {
    if (disposed || sseDisposer) return;
    sseDisposer = transport.subscribe(function (data) {
      if (disposed) return;
      if (data && data.revision !== undefined) {
        if (!applyState(data, true)) return;
      } else if (data === null) {
        loadState();
      }
      notif();
    });
  }

  function stopSSE() { if (sseDisposer) { sseDisposer(); sseDisposer = null; } }

  async function init() {
    if (disposed) return;
    if (initPromise) return initPromise;
    var token = ++lifecycle;
    initPromise = Promise.all([loadState(), loadOptions(), loadConfig()]).then(function () {
      if (!disposed && token === lifecycle) startSSE();
    });
    return initPromise;
  }

  function openBoard() {
    boardOpen = true; filter = "all"; navGroup = "all"; notif();
    document.dispatchEvent(new CustomEvent("dsh-panel-activate", { detail: "autoqueue" }));
    // Keep the closed workstation completely idle. State, options and SSE are
    // initialized only after the user explicitly opens the queue.
    init();
  }

  function closeBoard() {
    if (!boardOpen) return;
    boardOpen = false; showDetail = null; showEdit = null; editTaskData = null; showNewTask = false; showConfig = false; notif();
  }

  function toggleBoard() { if (boardOpen) closeBoard(); else openBoard(); }
  function setFilter(f) { filter = f; notif(); }
  function setNavGroup(g) { navGroup = g; notif(); }
  function openDetail(key) { showDetail = key; var t = tasks.find(function (x) { return x.key === key; }); if (t && isUnread(t)) markRead(key); notif(); }
  function closeDetail() { showDetail = null; notif(); }
  async function openEdit(key) {
    try {
      var detail = await transport.detail(key);
      if (!detail || !detail.ok || !detail.task) throw new Error((detail && detail.error) || "\u52A0\u8F7D\u4EFB\u52A1\u8BE6\u60C5\u5931\u8D25");
      showEdit = key;
      editTaskData = detail.task;
      notif();
    } catch (err) { error = err.message; notif(); }
  }
  function closeEdit() { showEdit = null; editTaskData = null; notif(); }
  function openNewTask() { showNewTask = true; notif(); }
  function closeNewTask() { showNewTask = false; notif(); }
  function openConfig() { showConfig = true; notif(); }
  function closeConfig() { showConfig = false; notif(); }

  async function createTask(data) {
    try {
      var result = await transport.createTask({
        requestId: crypto.randomUUID(), key: data.key, content: data.content,
        priority: data.priority, cron: data.cron, schedule: data.schedule, deadline: data.deadline,
        maxGoalRounds: data.maxGoalRounds, maxBlockedResumes: data.maxBlockedResumes,
        timeoutMs: data.timeoutMs, maxAttempts: data.maxAttempts, webhook: data.webhook,
        autoArchive: data.autoArchive, enableNotifications: data.enableNotifications
      });
      if (!result.ok) throw new Error(result.error || "\u521B\u5EFA\u5931\u8D25");
      showNewTask = false;
      await loadState();
      return result;
    } catch (err) { error = err.message; notif(); throw err; }
  }

  async function markRead(key, read) {
    try { var result = await transport.markRead(key, read !== false); await loadState(); return result; } catch (err) { error = err.message; notif(); throw err; }
  }

  async function doAction(kind, key, opts) {
    try {
      var result = await transport.action(kind, key, opts);
      if (!result.ok) throw new Error(result.error || kind + " \u5931\u8D25");
      await loadState();
      return result;
    } catch (err) { error = err.message; notif(); throw err; }
  }

  async function updateTask(key, patch) {
    try {
      var result = await transport.action("update", key, patch);
      if (!result.ok) throw new Error(result.error || "\u66F4\u65B0\u5931\u8D25");
      showEdit = null;
      editTaskData = null;
      await loadState();
      return result;
    } catch (err) { error = err.message; notif(); throw err; }
  }

  async function setConcurrency(n) {
    try {
      var result = await transport.action("set-concurrency", null, { maxConcurrent: n });
      if (!result.ok) throw new Error(result.error || "\u8BBE\u7F6E\u5E76\u53D1\u6570\u5931\u8D25");
      await loadState();
      return result;
    } catch (err) { error = err.message; notif(); throw err; }
  }
  async function updateConfig(patch) {
    try {
      var result = await transport.setConfig(patch);
      mergeConfig(result);
      await loadState();
      return result;
    } catch (err) { error = err.message; notif(); throw err; }
  }
  function clearError() { error = null; notif(); }

  function dispose() { disposed = true; lifecycle++; stopSSE(); listeners = []; }

  return {
    getSnapshot: getSnapshot, subscribe: subscribe, init: init, dispose: dispose,
    openBoard: openBoard, closeBoard: closeBoard, toggleBoard: toggleBoard,
    setFilter: setFilter, setNavGroup: setNavGroup,
    openDetail: openDetail, closeDetail: closeDetail,
    openEdit: openEdit, closeEdit: closeEdit,
    openNewTask: openNewTask, closeNewTask: closeNewTask,
    openConfig: openConfig, closeConfig: closeConfig,
    createTask: createTask, doAction: doAction, updateTask: updateTask, markRead: markRead,
    setConcurrency: setConcurrency, updateConfig: updateConfig, clearError: clearError,
    loadState: loadState
  };
}
