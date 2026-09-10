import { STATUS_CONFIG, isUnread } from "./utils.js";

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
  var showTemplates = false;
  var loading = true;
  var error = null;
  var revision = 0;
  var config = { maxConcurrent: 1 };
  var metrics = { total: 0, running: 0, pending: 0, done24h: 0, failed24h: 0, successRate: 0 };
  var options = { workspaces: [], presets: [], models: [], isolation: null };
  var optionsStatus = "idle";
  var runtimeHealth = {
    status: "idle", connected: false, reconnecting: false,
    lastEventAt: null, revision: null
  };
  var runtimeObservation = null;
  var sseDisposer = null;
  var disposed = false;
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
    var scoped = tasks;
    if (navGroup === "archived") {
      scoped = scoped.filter(function (t) { return !!t.archivedAt; });
    } else {
      scoped = scoped.filter(function (t) { return !t.archivedAt; });
      if (navGroup === "cron") scoped = scoped.filter(function (t) { return !!t.cron; });
      else if (navGroup === "schedule") scoped = scoped.filter(function (t) { return !!t.schedule && !t.cron; });
      else if (navGroup === "manual") scoped = scoped.filter(function (t) { return !t.cron && !t.schedule; });
    }
    var scopeCounts = {};
    for (var s = 0; s < scoped.length; s++) scopeCounts[scoped[s].status] = (scopeCounts[scoped[s].status] || 0) + 1;
    var filtered = filter === "all" ? scoped : scoped.filter(function (t) { return t.status === filter; });
    var detailTask = showDetail ? tasks.find(function (t) { return t.key === showDetail; }) : null;
    var editTask = showEdit
      ? (editTaskData && editTaskData.key === showEdit ? editTaskData : tasks.find(function (t) { return t.key === showEdit; }))
      : null;
    return {
      tasks: tasks, scoped: scoped, filtered: filtered, counts: counts, scopeCounts: scopeCounts,
      scopeMetrics: deriveMetrics(scoped.map(function (task) { return Object.assign({}, task, { archivedAt: null }); })), metrics: metrics,
      boardOpen: boardOpen, filter: filter, navGroup: navGroup,
      showDetail: showDetail, showNewTask: showNewTask, showEdit: showEdit, showConfig: showConfig, showTemplates: showTemplates,
      loading: loading, error: error, revision: revision, config: config, options: options,
      optionsStatus: optionsStatus,
      runtimeHealth: runtimeHealth,
      runtimeObservation: runtimeObservation,
      detailTask: detailTask, editTask: editTask,
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
        if (prev !== undefined && prev !== t.status && (TERMINAL[t.status] || prev === "running" && t.status === "todo") && notificationsEnabled) {
          var label = (STATUS_CONFIG[t.status] || {}).label || t.status;
          try { if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("autoqueue", { body: t.key + " → " + label, tag: t.key }); } catch (e) {}
        }
      }
    }
    prevStatuses = {};
    for (var j = 0; j < newTasks.length; j++) prevStatuses[newTasks[j].key] = newTasks[j].status;
    tasks = newTasks;
    if (Number.isFinite(incomingRevision)) revision = incomingRevision;
    runtimeHealth = Object.assign({}, runtimeHealth, { revision: revision });
    if (data.runtime && typeof data.runtime === "object") runtimeObservation = data.runtime;
    mergeConfig(data.config);
    metrics = Object.assign(deriveMetrics(newTasks), data.metrics || {});
    error = null;
    if (showDetail && !tasks.find(function (t) { return t.key === showDetail; })) { showDetail = null; error = "任务 \"" + showDetail + "\" 已被删除或移除"; }
    if (showEdit && !tasks.find(function (t) { return t.key === showEdit; })) { showEdit = null; editTaskData = null; error = "任务 \"" + showEdit + "\" 已被删除或移除"; }
    return true;
  }

  async function loadState() {
    loading = true; notif();
    var refreshed = false;
    try {
      var data = await transport.state();
      applyState(data, false);
      refreshed = true;
    } catch (err) { error = err.message; }
    loading = false; notif();
    return refreshed;
  }

  async function loadOptions() {
    optionsStatus = "loading";
    try {
      var loaded = await transport.options();
      options = loaded && typeof loaded === "object" ? loaded : { workspaces: [], presets: [], models: [], isolation: null };
      optionsStatus = "ready";
    } catch (err) {
      optionsStatus = "error";
      error = err.message || "隔离策略读取失败";
    }
    notif();
  }

  async function loadConfig() {
    try {
      mergeConfig(await transport.getConfig());
    } catch (err) {
      error = err.message;
    }
  }

  function startSSE() {
    if (disposed || sseDisposer) return;
    runtimeHealth = Object.assign({}, runtimeHealth, { status: "connecting", connected: false, reconnecting: false });
    notif();
    sseDisposer = transport.subscribe(function (data) {
      if (disposed) return;
      if (data && data.revision !== undefined) {
        if (!applyState(data, true)) return;
      } else if (data === null) {
        loadState();
      }
      notif();
    }, function (health) {
      if (disposed) return;
      var previousRevision = Number(runtimeHealth.revision);
      var incomingHealthRevision = Number(health && health.revision);
      runtimeHealth = Object.assign({}, runtimeHealth, health || {});
      if (Number.isFinite(previousRevision) || Number.isFinite(incomingHealthRevision) || Number.isFinite(revision)) {
        runtimeHealth.revision = Math.max(
          Number.isFinite(previousRevision) ? previousRevision : 0,
          Number.isFinite(incomingHealthRevision) ? incomingHealthRevision : 0,
          Number.isFinite(revision) ? revision : 0
        );
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
    boardOpen = false; showDetail = null; showEdit = null; editTaskData = null; showNewTask = false; showConfig = false; showTemplates = false; notif();
  }

  function toggleBoard() { if (boardOpen) closeBoard(); else openBoard(); }
  function setFilter(f) { filter = f; notif(); }
  function setNavGroup(g) { navGroup = g; notif(); }
  function openDetail(key) { showDetail = key; var t = tasks.find(function (x) { return x.key === key; }); if (t && isUnread(t)) markRead(key); notif(); }
  function closeDetail() { showDetail = null; notif(); }
  async function openEdit(key) {
    try {
      var detail = await transport.detail(key);
      if (!detail || !detail.ok || !detail.task) throw new Error((detail && detail.error) || "加载任务详情失败");
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
  function openTemplates() { showTemplates = true; notif(); }
  function closeTemplates() { showTemplates = false; notif(); }

  async function createTask(data) {
    try {
      var result = await transport.createTask({
        requestId: crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16); }), key: data.key, content: data.content,
        priority: data.priority, cron: data.cron, schedule: data.schedule, deadline: data.deadline,
        maxGoalRounds: data.maxGoalRounds, maxBlockedResumes: data.maxBlockedResumes,
        timeoutMs: data.timeoutMs, maxAttempts: data.maxAttempts, webhook: data.webhook,
        provider: data.provider, model: data.model,
        autoArchive: data.autoArchive, enableNotifications: data.enableNotifications
      });
      if (!result.ok) throw new Error(result.error || "创建失败");
      showNewTask = false;
      error = null;
      var stateRefreshed = await loadState();
      var createdTask = stateRefreshed
        ? tasks.find(function (task) { return task.key === result.key; })
        : null;
      return Object.assign({}, result, {
        stateRefreshed: stateRefreshed,
        taskState: createdTask ? { status: createdTask.status, archivedAt: createdTask.archivedAt || null } : null
      });
    } catch (err) { error = err.message; notif(); throw err; }
  }

  async function markRead(key, read) {
    try { var result = await transport.markRead(key, read !== false); await loadState(); return result; } catch (err) { error = err.message; notif(); throw err; }
  }

  async function doAction(kind, key, opts) {
    try {
      var result = await transport.action(kind, key, opts);
      var isBatchArchive = kind === "archive" && opts && Array.isArray(opts.keys) && Array.isArray(result && result.results);
      if (!result.ok && !isBatchArchive) throw new Error(result.error || kind + " 失败");
      error = null;
      await loadState();
      return result;
    } catch (err) { error = err.message; notif(); throw err; }
  }

  async function updateTask(key, patch) {
    try {
      var result = await transport.action("update", key, patch);
      if (!result.ok) throw new Error(result.error || "更新失败");
      showEdit = null;
      editTaskData = null;
      error = null;
      await loadState();
      return result;
    } catch (err) { error = err.message; notif(); throw err; }
  }

  async function setConcurrency(n) {
    try {
      var result = await transport.action("set-concurrency", null, { maxConcurrent: n });
      if (!result.ok) throw new Error(result.error || "设置并发数失败");
      error = null;
      await loadState();
      return result;
    } catch (err) { error = err.message; notif(); throw err; }
  }
  async function updateConfig(patch) {
    try {
      var result = await transport.setConfig(patch);
      mergeConfig(result);
      error = null;
      await loadState();
      return result;
    } catch (err) { error = err.message; notif(); throw err; }
  }
  function clearError() { error = null; notif(); }

  function dispose() { disposed = true; lifecycle++; stopSSE(); listeners = []; initPromise = null; }

  return {
    getSnapshot: getSnapshot, subscribe: subscribe, init: init, dispose: dispose,
    openBoard: openBoard, closeBoard: closeBoard, toggleBoard: toggleBoard,
    setFilter: setFilter, setNavGroup: setNavGroup,
    openDetail: openDetail, closeDetail: closeDetail,
    openEdit: openEdit, closeEdit: closeEdit,
    openNewTask: openNewTask, closeNewTask: closeNewTask,
    openConfig: openConfig, closeConfig: closeConfig,
    openTemplates: openTemplates, closeTemplates: closeTemplates,
    createTask: createTask, doAction: doAction, updateTask: updateTask, markRead: markRead,
    setConcurrency: setConcurrency, updateConfig: updateConfig, clearError: clearError,
    loadState: loadState
  };
}
