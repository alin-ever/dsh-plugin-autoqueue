// src/client/helpers.js
var API_PREFIX = "/api/queue";
var STATUS_CONFIG = {
  pending: { label: "\u5F85\u6267\u884C", color: "#6b7280" },
  running: { label: "\u6267\u884C\u4E2D", color: "#3b82f6" },
  done: { label: "\u5DF2\u5B8C\u6210", color: "#10b981" },
  failed: { label: "\u5DF2\u5931\u8D25", color: "#ef4444" },
  stopped: { label: "\u5DF2\u505C\u6B62", color: "#f59e0b" },
  interrupted: { label: "\u5DF2\u4E2D\u65AD", color: "#8b5cf6" }
};
var CRON_PRESETS = [
  { label: "\u81EA\u5B9A\u4E49", value: "" },
  { label: "\u6BCF\u5929 08:00", value: "0 8 * * *" },
  { label: "\u6BCF\u5929 20:00", value: "0 20 * * *" },
  { label: "\u5DE5\u4F5C\u65E5 08:00", value: "0 8 * * 1-5" },
  { label: "\u5DE5\u4F5C\u65E5 20:00", value: "0 20 * * 1-5" },
  { label: "\u6BCF 30 \u5206\u949F", value: "*/30 * * * *" },
  { label: "\u6BCF\u5C0F\u65F6", value: "0 * * * *" },
  { label: "\u6BCF 2 \u5C0F\u65F6", value: "0 */2 * * *" },
  { label: "\u6BCF\u5468\u4E00 08:00", value: "0 8 * * 1" },
  { label: "\u6BCF\u6708 1 \u65E5 08:00", value: "0 8 1 * *" }
];
var DEADLINE_PRESETS = [
  { label: "\u4E0D\u914D\u7F6E", value: "" },
  { label: "\u81EA\u5B9A\u4E49", value: "__custom__" },
  { label: "\u6BCF\u5929 09:00", value: "0 9 * * *" },
  { label: "\u6BCF\u5929 21:00", value: "0 21 * * *" },
  { label: "\u6BCF\u5929 23:00", value: "0 23 * * *" },
  { label: "\u5DE5\u4F5C\u65E5 09:00", value: "0 9 * * 1-5" },
  { label: "\u5DE5\u4F5C\u65E5 21:00", value: "0 21 * * 1-5" },
  { label: "\u5DE5\u4F5C\u65E5 23:00", value: "0 23 * * 1-5" }
];
var QUEUE_CSS = `
  [data-dsh-autoqueue-view] {
    position: absolute; inset: 0; z-index: 10;
    background: var(--bg-primary, #fff); overflow-y: auto;
    display: none; flex-direction: column; gap: 4px;
    font-family: system-ui, -apple-system, sans-serif;
  }
  [data-dsh-autoqueue-active] [data-dsh-autoqueue-view] { display: flex; }
  [data-dsh-autoqueue-active] [data-pane="conversation"] > *:not([data-dsh-autoqueue-view]) { display: none !important; }

  .aq-header {
    display: flex; align-items: center; gap: 12px;
    padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e5e7eb);
    position: sticky; top: 0; background: var(--bg-primary, #fff); z-index: 2;
  }
  .aq-header h2 { margin: 0; font-size: 18px; font-weight: 600; flex: 1; }
  .aq-back {
    border: none; background: none; cursor: pointer; font-size: 20px;
    color: var(--text-secondary, #6b7280); padding: 4px 8px; border-radius: 6px;
  }
  .aq-back:hover { background: var(--hover-bg, #f3f4f6); }
  .aq-btn {
    padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500;
    cursor: pointer; border: 1px solid var(--border-color, #d1d5db);
    background: var(--bg-primary, #fff); color: var(--text-primary, #111827);
    white-space: nowrap;
  }
  .aq-btn:hover { background: var(--hover-bg, #f3f4f6); }
  .aq-btn.primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
  .aq-btn.primary:hover { background: #2563eb; }
  .aq-btn.danger { color: #ef4444; border-color: #ef4444; }
  .aq-btn.danger:hover { background: #fef2f2; }
  .aq-btn.warn { color: #f59e0b; border-color: #f59e0b; }
  .aq-btn.warn:hover { background: #fffbeb; }
  .aq-btn.success { color: #10b981; border-color: #10b981; }
  .aq-btn.success:hover { background: #f0fdf4; }

  .aq-stats {
    display: flex; gap: 8px; padding: 12px 20px;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
    flex-wrap: wrap;
  }
  .aq-stat {
    padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
    background: var(--hover-bg, #f3f4f6); cursor: pointer;
    border: 1px solid transparent;
  }
  .aq-stat.active { border-color: #3b82f6; }

  .aq-tasks { padding: 12px 20px; flex: 1; }
  .aq-card {
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 8px; padding: 16px 18px; margin-bottom: 10px;
    display: flex; align-items: center; gap: 14px;
    transition: box-shadow 0.15s; cursor: pointer;
  }
  .aq-card:hover { box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .aq-card-status {
    width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
  }
  .aq-card-body { flex: 1; min-width: 0; }
  .aq-card-key { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
  .aq-card-meta { font-size: 12px; color: var(--text-secondary, #6b7280); }
  .aq-card-summary { font-size: 12px; color: var(--text-secondary, #6b7280); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .aq-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
  .aq-card-actions .aq-btn { font-size: 11px; padding: 3px 8px; }

  .aq-modal-overlay {
    position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center;
  }
  .aq-modal {
    background: var(--bg-primary, #fff); border-radius: 12px;
    padding: 24px; width: 520px; max-width: 90vw; max-height: 85vh;
    overflow-y: auto; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  }
  .aq-modal.wide { width: 680px; }
  .aq-modal h3 { margin: 0 0 16px; font-size: 16px; }
  .aq-modal label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; margin-top: 8px; }
  .aq-modal label:first-of-type { margin-top: 0; }
  .aq-modal input, .aq-modal textarea, .aq-modal select {
    width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #d1d5db);
    border-radius: 6px; font-size: 13px; margin-bottom: 8px; box-sizing: border-box;
    font-family: inherit; background: var(--bg-primary, #fff); color: var(--text-primary, #111827);
  }
  .aq-modal textarea { resize: vertical; min-height: 100px; }
  .aq-modal select { cursor: pointer; appearance: none; padding: 8px 36px 8px 12px; text-overflow: ellipsis; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
  .aq-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
  .aq-modal-actions-left { margin-right: auto; }

  .aq-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 12px; }
  .aq-detail-item { font-size: 13px; }
  .aq-detail-item .label { color: var(--text-secondary, #6b7280); }
  .aq-detail-item .value { font-weight: 500; }

  .aq-report { background: var(--hover-bg, #f9fafb); border-radius: 8px; padding: 12px 16px; margin-top: 12px; max-height: 300px; overflow-y: auto; }
  .aq-report pre { margin: 0; font-size: 12px; white-space: pre-wrap; word-break: break-all; font-family: monospace; }

  .aq-exec-table { width: 100%; font-size: 12px; border-collapse: collapse; margin-top: 8px; }
  .aq-exec-table th, .aq-exec-table td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border-color, #e5e7eb); }
  .aq-exec-table th { font-weight: 600; color: var(--text-secondary, #6b7280); }

  .aq-row { display: flex; gap: 12px; }
  .aq-row > * { flex: 1; min-width: 0; }

  .aq-empty { text-align: center; padding: 60px 20px; color: var(--text-secondary, #9ca3af); }
  .aq-empty-cta { margin-top: 12px; }
  .aq-empty-cta .aq-btn { font-size: 14px; padding: 8px 20px; }

  .aq-error {
    padding: 8px 20px; color: #ef4444; font-size: 13px; background: #fef2f2;
    border-bottom: 1px solid #fecaca; display: flex; align-items: center; gap: 8px;
  }
  .aq-error-dismiss { margin-left: auto; cursor: pointer; opacity: 0.6; font-size: 16px; }
  .aq-error-dismiss:hover { opacity: 1; }

  .aq-schedule-help { font-size: 11px; color: var(--text-secondary, #9ca3af); margin-top: -4px; margin-bottom: 8px; }
  .aq-tip {
    display: inline-flex; align-items: center; justify-content: center;
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--border-color, #e5e7eb); color: var(--text-secondary, #9ca3af);
    font-size: 11px; line-height: 1; margin-left: 5px; cursor: help;
    flex-shrink: 0; vertical-align: middle;
  }
  .aq-tip:hover { background: var(--text-secondary, #9ca3af); color: var(--bg-primary, #fff); }

  .aq-loading { text-align: center; padding: 60px; color: var(--text-secondary, #9ca3af); font-size: 14px; }

  .aq-msg {
    padding: 6px 20px; font-size: 12px; color: #059669;
    background: #ecfdf5; border-bottom: 1px solid #a7f3d0;
    text-align: center; animation: aq-fade-out 2s ease-in forwards;
  }
  @keyframes aq-fade-out { 0% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0; height: 0; padding: 0; overflow: hidden; } }

  .aq-sidebar-entry {
    box-sizing: border-box; width: 100%; height: 36px;
    color: var(--text-secondary, #6b7280);
    cursor: pointer; white-space: nowrap;
    background: none; border: none; border-radius: 8px;
    align-items: center; gap: 8px;
    padding: 0 10px; font-size: 13px; display: flex;
    font-family: inherit;
  }
  .aq-sidebar-entry:hover { background: var(--dsw-alias-interactive-bg-hover, #f3f4f6); color: var(--text-primary, #111827); }
  .aq-sidebar-entry[data-active] { background: var(--dsw-alias-interactive-bg-active, #e5e7eb); color: var(--text-primary, #111827); font-weight: 600; }
  .aq-sidebar-icon { flex: none; justify-content: center; align-items: center; width: 24px; height: 24px; display: inline-flex; }
  .aq-sidebar-icon svg { width: 18px; height: 18px; display: block; }
  .aq-sidebar-label { text-overflow: ellipsis; overflow: hidden; }
  [data-sidebar-collapsed] .aq-sidebar-entry { border-radius: 50%; justify-content: center; width: 36px; height: 36px; margin: 0 auto 12px; padding: 0; }
  [data-sidebar-collapsed] .aq-sidebar-label { display: none; }
`;
function cls(...args) {
  return args.filter(Boolean).join(" ");
}
function uuid() {
  return globalThis.crypto?.randomUUID?.() ?? `browser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 6e4);
  if (mins < 1) return "\u521A\u521A";
  if (mins < 60) return `${mins} \u5206\u949F\u524D`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} \u5C0F\u65F6\u524D`;
  return `${Math.floor(hours / 24)} \u5929\u524D`;
}
function formatIso(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { hour12: false });
}
function isUnread(task) {
  if (task.status !== "done" && task.status !== "failed" && task.status !== "stopped") return false;
  if (task.archivedAt) return false;
  if (!task.readAt) return true;
  return task.updatedAt > task.readAt;
}
function unreadCount(tasks) {
  return tasks.filter(t => isUnread(t)).length;
}
function taskFirstLine(body) {
  if (!body) return "";
  return body.split("\n")[0]?.replace(/^#+\s*/, "").trim() || "";
}
function cronToHuman(cron) {
  if (!cron) return "";
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, dom, month, dow] = parts;
  const time = `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;
  if (dom === "*" && month === "*" && dow === "*") return `\u6BCF\u5929 ${time}`;
  if (dom === "*" && month === "*" && dow === "1-5") return `\u5DE5\u4F5C\u65E5 ${time}`;
  const DOW_MAP = { 0: "\u65E5", 1: "\u4E00", 2: "\u4E8C", 3: "\u4E09", 4: "\u56DB", 5: "\u4E94", 6: "\u516D" };
  if (dom === "*" && month === "*" && /^\d$/.test(dow) && DOW_MAP[dow]) return `\u6BCF\u5468${DOW_MAP[dow]} ${time}`;
  if (/^\d+$/.test(dom) && month === "*" && dow === "*") return `\u6BCF\u6708${parseInt(dom, 10)}\u65E5 ${time}`;
  if (min.startsWith("*/")) return `\u6BCF${min.slice(2)}\u5206\u949F`;
  return cron;
}

// src/client/transport.js
var REQUEST_TIMEOUT_MS = 15e3;
async function readJson(response) {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json();
}
async function request(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await readJson(await fetch(API_PREFIX + url, { ...init, signal: controller.signal }));
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`\u8BF7\u6C42\u8D85\u65F6 (${REQUEST_TIMEOUT_MS / 1e3}s)`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
function createTransport() {
  return {
    /** GET /state — 获取任务队列快照 */
    async state() {
      return await request("/state");
    },
    /** GET /detail?key=xxx — 获取任务详情（含报告） */
    async detail(key) {
      return await request(`/detail?key=${encodeURIComponent(key)}`);
    },
    /** GET /options — 获取工作区和 Agent 预设列表 */
    async options() {
      return await request("/options");
    },
    /** GET /config — 获取运行时配置 */
    async getConfig() {
      return await request("/config");
    },
    /** POST /config — 修改运行时配置 */
    async setConfig(patch) {
      return await request("/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch)
      });
    },
    /** POST /task — 创建任务 */
    async createTask(data) {
      return await request("/task", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data)
      });
    },
    /** POST /action — 执行动作 */
    async action(kind, key, opts = {}) {
      return await request("/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestId: uuid(),
          action: { kind, key, ...opts }
        })
      });
    },
    /** POST /mark-read — 标记已读 */
    async markRead(key, read = true) {
      return await request("/mark-read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, read })
      });
    },
    /** SSE /events — 实时推送 */
    subscribe(listener) {
      const events = new EventSource(API_PREFIX + "/events");
      events.onmessage = (message) => {
        try {
          const parsed = JSON.parse(message.data);
          if (parsed === null || typeof parsed !== "object" || typeof parsed.revision !== "number") throw new Error("invalid");
          listener(parsed);
        } catch {
        }
      };
      events.onerror = () => {
      };
      const onVisible = () => {
        if (document.visibilityState === "visible") listener(null);
      };
      document.addEventListener("visibilitychange", onVisible);
      return () => {
        document.removeEventListener("visibilitychange", onVisible);
        events.close();
      };
    }
  };
}

// src/client/controller.js
function createController(transport) {
  let tasks = [];
  let boardOpen = false;
  let filter = "all";
  let selectedTask = null;
  let showNewTask = false;
  let showDetail = null;
  let showEdit = null;
  let showConfig = false;
  let loading = true;
  let error = null;
  let revision = 0;
  let config = { maxConcurrent: 2 };
  let options = { workspaces: [], presets: [] };
  let transportError = null;
  let sseDisposer = null;
  let prevTasks = new Map();
  const TERMINAL_STATUSES = new Set(["done", "failed", "stopped", "interrupted"]);
  function showNotification(taskKey, status) {
    const label = STATUS_CONFIG[status]?.label || status;
    const body = `${taskKey} → ${label}`;
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try { new Notification("autoqueue", { body, tag: taskKey }); } catch {}
    }
  }
  function requestNotificationPermission() {
    if (typeof Notification === "undefined" || Notification.permission === "granted") return;
    if (Notification.permission !== "default") return;
    try { Notification.requestPermission(); } catch {}
  }
  const listeners = /* @__PURE__ */ new Set();
  function getSnapshot() {
    const counts = {};
    for (const t of tasks) counts[t.status] = (counts[t.status] || 0) + 1;
    const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
    const detailTask = showDetail ? tasks.find((t) => t.key === showDetail) : null;
    const editTask = showEdit ? tasks.find((t) => t.key === showEdit) : null;
    return {
      tasks,
      unreadCount: unreadCount(tasks),
      boardOpen,
      filter,
      selectedTask,
      showNewTask,
      showDetail,
      showEdit,
      showConfig,
      loading,
      error,
      revision,
      config,
      options,
      transportError,
      filtered,
      counts,
      detailTask,
      editTask
    };
  }
  function notify() {
    for (const fn of listeners) fn();
  }
  function subscribe(fn) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }
  async function markRead(key, read = true) {
    try {
      await transport.markRead(key, read);
      await loadState();
    } catch (err) {
      error = err.message;
      notify();
    }
  }
  async function loadState() {
    loading = true;
    notify();
    try {
      const data = await transport.state();
      tasks = data.tasks || [];
      revision = data.revision || 0;
      config = data.config || { maxConcurrent: 2 };
      transportError = null;
      error = null;
    } catch (err) {
      transportError = err.message;
    }
    loading = false;
    notify();
  }
  async function loadOptions() {
    try {
      const data = await transport.options();
      options = data;
    } catch {
    }
  }
  function startSSE() {
    if (sseDisposer) return;
    sseDisposer = transport.subscribe((data) => {
      if (data && data.revision !== void 0) {
        const newTasks = data.tasks || [];
        for (const task of newTasks) {
          const prevStatus = prevTasks.get(task.key);
          if (prevStatus !== void 0 && prevStatus !== task.status && TERMINAL_STATUSES.has(task.status) && (task.enableNotifications ?? config.enableNotifications) !== false) {
            requestNotificationPermission();
            showNotification(task.key, task.status);
          }
        }
        prevTasks = new Map(newTasks.map((t) => [t.key, t.status]));
        tasks = newTasks;
        revision = data.revision;
        config = data.config || { maxConcurrent: 2 };
        transportError = null;
        if (showDetail && !tasks.find((t) => t.key === showDetail)) showDetail = null;
        if (showEdit && !tasks.find((t) => t.key === showEdit)) showEdit = null;
      } else if (data === null) {
        loadState();
      }
      notify();
    });
  }
  function stopSSE() {
    if (sseDisposer) {
      sseDisposer();
      sseDisposer = null;
    }
  }
  async function init() {
    await Promise.all([loadState(), loadOptions()]);
    startSSE();
  }
  function openBoard() {
    if (boardOpen) return;
    // 先通知其他面板关闭（任务看板只认 ssh 事件）
    document.dispatchEvent(new CustomEvent("dsh-panel-activate", { detail: "ssh" }));
    boardOpen = true;
    filter = "all";
    notify();
    document.dispatchEvent(new CustomEvent("dsh-panel-activate", { detail: "autoqueue" }));
  }
  function closeBoard() {
    if (!boardOpen) return;
    boardOpen = false;
    showDetail = null;
    showEdit = null;
    showNewTask = false;
    showConfig = false;
    notify();
  }
  function toggleBoard() {
    if (boardOpen) closeBoard();
    else openBoard();
  }
  function setFilter(f) {
    filter = f;
    notify();
  }
  function openDetail(key) {
    showDetail = key;
    const task = tasks.find(t => t.key === key);
    if (task && isUnread(task)) {
      markRead(key);
    }
    notify();
  }
  function closeDetail() {
    showDetail = null;
    notify();
  }
  function openEdit(key) {
    showEdit = key;
    notify();
  }
  function closeEdit() {
    showEdit = null;
    notify();
  }
  function openNewTask() {
    showNewTask = true;
    notify();
  }
  function closeNewTask() {
    showNewTask = false;
    notify();
  }
  function openConfig() {
    showConfig = true;
    notify();
  }
  function closeConfig() {
    showConfig = false;
    notify();
  }
  async function createTask(data) {
    try {
      const result = await transport.createTask({
        requestId: uuid(),
        ...data
      });
      if (result.ok) {
        showNewTask = false;
        await loadState();
      } else {
        error = result.error || "\u521B\u5EFA\u5931\u8D25";
        notify();
      }
    } catch (err) {
      error = err.message;
      notify();
    }
  }
  async function doAction(kind, key, opts = {}) {
    try {
      const result = await transport.action(kind, key, opts);
      if (!result.ok) {
        error = result.error || `${kind} \u5931\u8D25`;
        notify();
      }
      await loadState();
    } catch (err) {
      error = err.message;
      notify();
    }
  }
  async function updateTask(key, patch) {
    try {
      const result = await transport.action("update", key, patch);
      if (result.ok) {
        showEdit = null;
        await loadState();
      } else {
        error = result.error || "\u66F4\u65B0\u5931\u8D25";
        notify();
      }
    } catch (err) {
      error = err.message;
      notify();
    }
  }
  async function setConcurrency(n) {
    try {
      await transport.action("set-concurrency", null, { maxConcurrent: n });
      await loadState();
    } catch (err) {
      error = err.message;
      notify();
    }
  }
  async function updateConfig(patch) {
    try {
      await transport.setConfig(patch);
      await loadState();
    } catch (err) {
      error = err.message;
      notify();
    }
  }
  function clearError() {
    error = null;
    notify();
  }
  function dispose() {
    stopSSE();
    listeners.clear();
  }
  return {
    getSnapshot,
    subscribe,
    init,
    dispose,
    openBoard,
    closeBoard,
    toggleBoard,
    setFilter,
    openDetail,
    closeDetail,
    openEdit,
    closeEdit,
    openNewTask,
    closeNewTask,
    openConfig,
    closeConfig,
    createTask,
    doAction,
    updateTask,
    setConcurrency,
    updateConfig,
    loadState,
    clearError
  };
}

// src/client/components.js
function createComponents(React) {
  const e = React.createElement;
  function CronField({ label, value, onChange, presets, placeholder, tip: tipText }) {
    const [selectVal, setSelectVal] = React.useState(() => {
      const matched = presets.find((p) => p.value === value && p.value !== "" && p.value !== "__custom__");
      return matched ? matched.value : (value ? "__custom__" : "");
    });
    const isCustom = selectVal === "__custom__";
    return e(
      "div",
      null,
      e("label", null, label, tipText ? e("span", { className: "aq-tip", title: tipText }, "\u24D8") : null),
      e(
        "div",
        { style: { display: "flex", gap: "8px", alignItems: "stretch", minWidth: 0 } },
        e(
          "select",
          {
            value: selectVal,
            onChange: (ev) => {
              const v = ev.target.value;
              setSelectVal(v);
              if (v === "__custom__") return;
              onChange(v);
            },
            style: { width: "50%", flexShrink: 0 }
          },
          ...presets.map((p) => e("option", { key: p.value, value: p.value }, p.label))
        ),
        e("input", {
          value: selectVal === "" ? "" : value,
          onChange: (ev) => onChange(ev.target.value),
          placeholder: placeholder || "\u81EA\u5B9A\u4E49 cron \u8868\u8FBE\u5F0F",
          style: { flex: 1, minWidth: 0 },
          disabled: !isCustom && selectVal !== ""
        })
      )
    );
  }
  function ErrorBanner({ error, onDismiss }) {
    if (!error) return null;
    return e(
      "div",
      { className: "aq-error" },
      e("span", null, error),
      e("span", { className: "aq-error-dismiss", onClick: onDismiss, title: "\u5173\u95ED" }, "\xD7")
    );
  }
  function StatsBar({ counts, total, filter, onFilter }) {
    return e(
      "div",
      { className: "aq-stats" },
      e("span", {
        className: cls("aq-stat", filter === "all" && "active"),
        onClick: () => onFilter("all")
      }, `\u5168\u90E8 (${total})`),
      ...Object.entries(STATUS_CONFIG).map(
        ([status, cfg]) => (counts[status] || 0) > 0 ? e("span", {
          key: status,
          className: cls("aq-stat", filter === status && "active"),
          onClick: () => onFilter(status),
          style: filter === status ? { borderColor: cfg.color } : {}
        }, `${cfg.label} (${counts[status]})`) : null
      ).filter(Boolean)
    );
  }
  function TaskCard({ task, onAction, onDetail, onEdit, onSession }) {
    const unread = isUnread(task);
    const cfg = STATUS_CONFIG[task.status] || { label: task.status, color: "#6b7280" };
    const summary = taskFirstLine(task.body);
    const actions = [];
    if (task.status === "running") {
      actions.push(e("button", { key: "stop", className: "aq-btn danger", onClick: (ev) => {
        ev.stopPropagation();
        onAction("stop", task.key);
      } }, "\u505C\u6B62"));
    }
    if (task.status === "pending") {
      actions.push(e("button", { key: "edit", className: "aq-btn", onClick: (ev) => {
        ev.stopPropagation();
        onEdit(task.key);
      } }, "\u7F16\u8F91"));
      actions.push(e("button", { key: "delete", className: "aq-btn danger", onClick: (ev) => {
        ev.stopPropagation();
        onAction("delete", task.key);
      } }, "\u5220\u9664"));
    }
    if (task.status === "done" || task.status === "failed" || task.status === "stopped") {
      if (!task.archivedAt) {
        actions.push(e("button", { key: "rerun", className: "aq-btn success", onClick: (ev) => {
          ev.stopPropagation();
          onAction("rerun", task.key);
        } }, "\u91CD\u8DD1"));
        actions.push(e("button", { key: "archive", className: "aq-btn warn", onClick: (ev) => {
          ev.stopPropagation();
          onAction("archive", task.key);
        } }, "\u5F52\u6863"));
      }
    }
    if (task.archivedAt) {
      actions.push(e("button", { key: "restore", className: "aq-btn", onClick: (ev) => {
        ev.stopPropagation();
        onAction("restore", task.key);
      } }, "\u8FD8\u539F"));
    }
    const session = task.sessionId || (task.executions?.length ? task.executions[task.executions.length - 1].sessionId : null);
    if (session) {
      actions.push(e("button", { key: "session", className: "aq-btn", onClick: (ev) => {
        ev.stopPropagation();
        onSession(session);
      } }, "跳转"));
    }
    return e(
      "div",
      {
        className: "aq-card",
        onClick: () => onDetail(task.key),
        title: "\u70B9\u51FB\u67E5\u770B\u8BE6\u60C5"
      },
      e("span", { className: "aq-card-status", style: { background: cfg.color }, title: cfg.label }),
      e(
        "div",
        { className: "aq-card-body" },
        e("div", { className: "aq-card-key" }, unread ? e("span", { className: "aq-card-unread-dot" }) : null, task.key),
        summary && e("div", { className: "aq-card-summary" }, summary),
        e(
          "div",
          { className: "aq-card-meta" },
          cfg.label,
          task.cron ? ` \xB7 ${cronToHuman(task.cron)}` : "",
          task.schedule ? ` \xB7 \u5B9A\u65F6: ${formatIso(task.schedule)}` : "",
          task.attempts > 0 ? ` \xB7 \u5C1D\u8BD5 ${task.attempts} \u6B21` : "",
          task.blockedResumes > 0 ? ` \xB7 \u53CD\u963B\u585E ${task.blockedResumes} \u6B21` : "",
          task.updatedAt ? ` \xB7 ${timeAgo(task.updatedAt)}` : ""
        )
      ),
      actions.length > 0 ? e("div", { className: "aq-card-actions" }, ...actions) : null
    );
  }
  function TaskDetailModal({ task, transport, onClose, onAction }) {
    const [detail, setDetail] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
      let cancelled = false;
      transport.detail(task.key).then((data) => {
        if (!cancelled) {
          setDetail(data);
          setLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [task.key]);
    const d = detail?.task || task;
    const cfg = STATUS_CONFIG[d.status] || { label: d.status, color: "#6b7280" };
    return e(
      "div",
      { className: "aq-modal-overlay", onClick: (ev) => {
        if (ev.target === ev.currentTarget) onClose();
      } },
      e(
        "div",
        { className: "aq-modal wide" },
        e("h3", null, `\u4EFB\u52A1\u8BE6\u60C5: ${d.key}`),
        e(
          "div",
          { className: "aq-detail-grid" },
          e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u72B6\u6001: "), e("span", { className: "value", style: { color: cfg.color } }, cfg.label)),
          e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u4F18\u5148\u7EA7: "), e("span", { className: "value" }, String(d.priority ?? 5))),
          d.attempts > 0 ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u5C1D\u8BD5\u6B21\u6570: "), e("span", { className: "value" }, String(d.attempts))) : null,
          d.blockedResumes > 0 ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u53CD\u963B\u585E: "), e("span", { className: "value" }, String(d.blockedResumes))) : null,
          d.cron ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u5B9A\u65F6\u89C4\u5219: "), e("span", { className: "value" }, cronToHuman(d.cron))) : null,
          d.schedule ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u5B9A\u65F6\u6267\u884C: "), e("span", { className: "value" }, formatIso(d.schedule))) : null,
          d.deadline ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u622A\u6B62\u65F6\u95F4: "), e("span", { className: "value" }, cronToHuman(d.deadline))) : null,
          d.workspace ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u5DE5\u4F5C\u533A: "), e("span", { className: "value" }, String(d.workspace).slice(0, 12))) : null,
          d.agentPreset ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "Agent \u9884\u8BBE: "), e("span", { className: "value" }, d.agentPreset)) : null,
          d.autoArchive ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u81EA\u52A8\u5F52\u6863: "), e("span", { className: "value" }, "\u662F")) : null,
          d.enableNotifications !== false ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u901A\u77E5: "), e("span", { className: "value" }, "\u662F")) : null,
          d.maxGoalRounds ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u6700\u5927\u8F6E\u6570: "), e("span", { className: "value" }, String(d.maxGoalRounds))) : null,
          d.maxBlockedResumes ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u6700\u5927\u53CD\u963B\u585E: "), e("span", { className: "value" }, String(d.maxBlockedResumes))) : null,
          d.maxAttempts ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u6700\u5927\u91CD\u8BD5: "), e("span", { className: "value" }, String(d.maxAttempts))) : null,
          d.timeoutMs ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u8D85\u65F6: "), e("span", { className: "value" }, `${Math.round(d.timeoutMs / 6e4)} \u5206\u949F`)) : null,
          d.createdAt ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u521B\u5EFA\u65F6\u95F4: "), e("span", { className: "value" }, formatIso(d.createdAt))) : null,
          d.updatedAt ? e("div", { className: "aq-detail-item" }, e("span", { className: "label" }, "\u66F4\u65B0\u65F6\u95F4: "), e("span", { className: "value" }, formatIso(d.updatedAt))) : null
        ),
        d.body ? e(
          "div",
          { className: "aq-report" },
          e("div", { style: { fontWeight: 600, fontSize: "13px", marginBottom: "8px" } }, "\u4EFB\u52A1\u5185\u5BB9"),
          e("pre", null, d.body)
        ) : null,
        loading ? e("div", { style: { textAlign: "center", padding: "20px", color: "#9ca3af" } }, "\u52A0\u8F7D\u4E2D...") : null,
        detail?.task?.reports ? e(
          "div",
          null,
          detail.task.reports.goal ? e(
            "div",
            { className: "aq-report" },
            e("div", { style: { fontWeight: 600, fontSize: "13px", marginBottom: "8px" } }, "\u76EE\u6807\u5FEB\u7167"),
            e("pre", null, detail.task.reports.goal)
          ) : null,
          detail.task.reports.result ? e(
            "div",
            { className: "aq-report" },
            e("div", { style: { fontWeight: 600, fontSize: "13px", marginBottom: "8px" } }, "\u6267\u884C\u7ED3\u679C"),
            e("pre", null, detail.task.reports.result)
          ) : null,
          detail.task.reports.report ? e(
            "div",
            { className: "aq-report" },
            e("div", { style: { fontWeight: 600, fontSize: "13px", marginBottom: "8px" } }, "\u6267\u884C\u62A5\u544A"),
            e("pre", null, detail.task.reports.report)
          ) : null
        ) : null,
        d.executions && d.executions.length > 0 ? e(
          "div",
          null,
          e("div", { style: { fontWeight: 600, fontSize: "13px", marginTop: "12px", marginBottom: "4px" } }, "\u6267\u884C\u8BB0\u5F55"),
          e(
            "table",
            { className: "aq-exec-table" },
            e(
              "thead",
              null,
              e(
                "tr",
                null,
                e("th", null, "\u6B21\u6570"),
                e("th", null, "\u72B6\u6001"),
                e("th", null, "\u5F00\u59CB\u65F6\u95F4"),
                e("th", null, "\u7ED3\u675F\u65F6\u95F4"),
                e("th", null, "\u9519\u8BEF")
              )
            ),
            e(
              "tbody",
              null,
              ...d.executions.map(
                (ex, i) => e(
                  "tr",
                  { key: i },
                  e("td", null, String(ex.attempt || i + 1)),
                  e("td", null, (STATUS_CONFIG[ex.result] || { label: ex.result || "-" }).label),
                  e("td", null, formatIso(ex.startedAt)),
                  e("td", null, ex.endedAt ? formatIso(ex.endedAt) : "-"),
                  e("td", null, ex.error ? String(ex.error).slice(0, 60) : "-")
                )
              )
            )
          )
        ) : null,
        e(
          "div",
          { className: "aq-modal-actions" },
          e("button", { className: "aq-btn", onClick: onClose }, "\u5173\u95ED"),
          d.status === "running" ? e("button", { className: "aq-btn danger", onClick: () => {
            onAction("stop", d.key);
            onClose();
          } }, "\u505C\u6B62") : null,
          d.status === "failed" || d.status === "stopped" ? e("button", { className: "aq-btn success", onClick: () => {
            onAction("rerun", d.key);
            onClose();
          } }, "\u91CD\u65B0\u6267\u884C") : null,
          d.status !== "running" && !d.archivedAt ? e("button", { className: "aq-btn warn", onClick: () => {
            onAction("archive", d.key);
            onClose();
          } }, "\u5F52\u6863") : null,
          d.archivedAt ? e("button", { className: "aq-btn", onClick: () => {
            onAction("restore", d.key);
            onClose();
          } }, "\u8FD8\u539F") : null
        )
      )
    );
  }
  function NewTaskModal({ onClose, onCreated, options }) {
    const [key, setKey] = React.useState("");
    const [content, setContent] = React.useState("");
    const [priority, setPriority] = React.useState("5");
    const [cron, setCron] = React.useState("");
    const [schedule, setSchedule] = React.useState("");
    const [deadline, setDeadline] = React.useState("");
    const [maxGoalRounds, setMaxGoalRounds] = React.useState("");
    const [maxBlockedResumes, setMaxBlockedResumes] = React.useState("");
    const [workspace, setWorkspace] = React.useState("");
    const [agentPreset, setAgentPreset] = React.useState("");
    const [model, setModel] = React.useState("");
    const [autoArchive, setAutoArchive] = React.useState(false);
    const [enableNotifications, setEnableNotifications] = React.useState(true);
    const [error, setError] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    async function handleSubmit(ev) {
      ev.preventDefault();
      if (!key.trim() || !content.trim()) {
        setError("\u8BF7\u586B\u5199\u4EFB\u52A1\u6807\u8BC6\u548C\u5185\u5BB9");
        return;
      }
      setSubmitting(true);
      setError("");
      const data = {
        key: key.trim(),
        content: content.trim(),
        priority: parseInt(priority, 10) || 5
      };
      if (cron.trim()) data.cron = cron.trim();
      if (schedule.trim()) {
        data.schedule = schedule.trim() + ":00Z";
      }
      if (deadline.trim()) data.deadline = deadline.trim();
      if (maxGoalRounds) data.maxGoalRounds = parseInt(maxGoalRounds, 10);
      if (maxBlockedResumes) data.maxBlockedResumes = parseInt(maxBlockedResumes, 10);
      if (workspace) data.workspace = workspace;
      if (agentPreset) data.agentPreset = agentPreset;
      if (model) data.model = model;
      if (autoArchive) data.autoArchive = true;
      if (!enableNotifications) data.enableNotifications = false;
      try {
        await onCreated(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
    }
    return e(
      "div",
      { className: "aq-modal-overlay", onClick: (ev) => {
        if (ev.target === ev.currentTarget) onClose();
      } },
      e(
        "div",
        { className: "aq-modal" },
        e("h3", null, "\u65B0\u5EFA\u4EFB\u52A1"),
        error && e("div", { style: { color: "#ef4444", fontSize: "13px", marginBottom: "8px" } }, error),
        e("label", null, "\u4EFB\u52A1\u6807\u8BC6\uFF08key\uFF09*"),
        e("input", { value: key, onChange: (ev) => setKey(ev.target.value), placeholder: "\u4F8B\u5982: daily-report" }),
        e("label", null, "\u4EFB\u52A1\u5185\u5BB9\uFF08Markdown\uFF09*"),
        e("textarea", { value: content, onChange: (ev) => setContent(ev.target.value), placeholder: "# \u4EFB\u52A1\u6807\u9898\n\n\u4EFB\u52A1\u63CF\u8FF0..." }),
        e(
          "div",
          { className: "aq-row" },
          e(
            "div",
            null,
            e("label", null, "\u4F18\u5148\u7EA7 (1-10)"),
            e("input", { type: "number", min: "1", max: "10", value: priority, onChange: (ev) => setPriority(ev.target.value) })
          ),
          e(
            "div",
            null,
            e("label", null, "\u6700\u5927\u8F6E\u6570"),
            e("input", { type: "number", min: "1", max: "100", value: maxGoalRounds, onChange: (ev) => setMaxGoalRounds(ev.target.value), placeholder: "\u9ED8\u8BA4 40" })
          ),
          e(
            "div",
            null,
            e("label", null, "\u6700\u5927\u53CD\u963B\u585E"),
            e("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes, onChange: (ev) => setMaxBlockedResumes(ev.target.value), placeholder: "\u9ED8\u8BA4 3" })
          )
        ),
        e(CronField, { label: "\u5FAA\u73AF\u8C03\u5EA6 (cron)", value: cron, onChange: setCron, presets: CRON_PRESETS, placeholder: "0 8 * * *" }),
        e("label", { style: { marginTop: "8px" } }, "\u4E00\u6B21\u6027\u5B9A\u65F6"),
        e("input", { type: "datetime-local", value: schedule, onChange: (ev) => setSchedule(ev.target.value) }),
        e(CronField, { label: "\u622A\u6B62\u65F6\u95F4 (deadline)", value: deadline, onChange: setDeadline, presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" }),
        e(
          "div",
          { className: "aq-row" },
          options.workspaces.length > 0 ? e(
            "div",
            null,
            e("label", null, "\u5DE5\u4F5C\u533A"),
            e(
              "select",
              { value: workspace, onChange: (ev) => setWorkspace(ev.target.value) },
              e("option", { value: "" }, "\u81EA\u52A8\u521B\u5EFA"),
              ...options.workspaces.map((ws) => e("option", { key: ws.workspaceId, value: ws.workspaceId }, ws.title || ws.path))
            )
          ) : null,
          options.presets.length > 0 ? e(
            "div",
            null,
            e("label", null, "Agent \u9884\u8BBE"),
            e(
              "select",
              { value: agentPreset, onChange: (ev) => setAgentPreset(ev.target.value) },
              e("option", { value: "" }, "\u9ED8\u8BA4"),
              ...options.presets.map((p) => e("option", { key: p.id, value: p.id }, p.name || p.id))
            )
          ) : null
        ),
        e(
          "div",
          { className: "aq-row" },
          e(
            "div",
            null,
            e("label", null, "\u6A21\u578B"),
            e(
              "select",
              { value: model, onChange: (ev) => setModel(ev.target.value) },
              e("option", { value: "" }, "\u9ED8\u8BA4\uFF08\u5F53\u524D\u4F1A\u8BDD\u6A21\u578B\uFF09"),
              ...(options.models && options.models.length > 0
                ? options.models.map((m) => e("option", { key: m, value: m }, m))
                : [])
            )
          )
        ),
        e(
          "label",
          { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" } },
          e("input", { type: "checkbox", checked: autoArchive, onChange: (ev) => setAutoArchive(ev.target.checked), style: { width: "auto", margin: 0 } }),
          "\u5B8C\u6210\u540E\u81EA\u52A8\u5F52\u6863"
        ),
        e(
          "div",
          { className: "aq-modal-actions" },
          e("button", { className: "aq-btn", onClick: onClose }, "\u53D6\u6D88"),
          e("button", { className: "aq-btn primary", onClick: handleSubmit, disabled: submitting }, submitting ? "\u63D0\u4EA4\u4E2D..." : "\u521B\u5EFA")
        )
      )
    );
  }
  function EditTaskModal({ task, onClose, onUpdate }) {
    const [key] = React.useState(task.key);
    const [content, setContent] = React.useState(task.body || "");
    const [cron, setCron] = React.useState(task.cron || "");
    const [deadline, setDeadline] = React.useState(task.deadline || "");
    const [schedule, setSchedule] = React.useState(
      task.schedule ? task.schedule.replace(/:\d{2}Z$/, "").replace(/\.\d{3}Z$/, "") : ""
    );
    const [priority, setPriority] = React.useState(String(task.priority ?? 5));
    const [autoArchive, setAutoArchive] = React.useState(!!task.autoArchive);
    const [enableNotifications, setEnableNotifications] = React.useState(task.enableNotifications !== false);
    const [maxGoalRounds, setMaxGoalRounds] = React.useState(task.maxGoalRounds ? String(task.maxGoalRounds) : "");
    const [maxBlockedResumes, setMaxBlockedResumes] = React.useState(task.maxBlockedResumes ? String(task.maxBlockedResumes) : "");
    const [error, setError] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    async function handleSubmit(ev) {
      ev.preventDefault();
      setSubmitting(true);
      setError("");
      const patch = {};
      if (content !== (task.body || "")) patch.content = content;
      if (cron !== (task.cron || "")) patch.cron = cron;
      const scheduleIso = schedule ? schedule + ":00Z" : "";
      if (scheduleIso !== (task.schedule || "")) patch.schedule = scheduleIso;
      if (deadline !== (task.deadline || "")) patch.deadline = deadline;
      if (priority !== String(task.priority ?? 5)) patch.priority = parseInt(priority, 10);
      if (autoArchive !== !!task.autoArchive) patch.autoArchive = autoArchive;
      if (enableNotifications !== (task.enableNotifications !== false)) patch.enableNotifications = enableNotifications;
      if (maxGoalRounds !== (task.maxGoalRounds ? String(task.maxGoalRounds) : "")) patch.maxGoalRounds = maxGoalRounds ? parseInt(maxGoalRounds, 10) : void 0;
      if (maxBlockedResumes !== (task.maxBlockedResumes ? String(task.maxBlockedResumes) : "")) patch.maxBlockedResumes = maxBlockedResumes ? parseInt(maxBlockedResumes, 10) : void 0;
      if (Object.keys(patch).length === 0) {
        onClose();
        return;
      }
      try {
        await onUpdate(key, patch);
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
    }
    return e(
      "div",
      { className: "aq-modal-overlay", onClick: (ev) => {
        if (ev.target === ev.currentTarget) onClose();
      } },
      e(
        "div",
        { className: "aq-modal" },
        e("h3", null, `\u7F16\u8F91\u4EFB\u52A1: ${key}`),
        error && e("div", { style: { color: "#ef4444", fontSize: "13px", marginBottom: "8px" } }, error),
        e("label", null, "\u4EFB\u52A1\u5185\u5BB9\uFF08Markdown\uFF09"),
        e("textarea", { value: content, onChange: (ev) => setContent(ev.target.value), style: { minHeight: "150px" } }),
        e(
          "div",
          { className: "aq-row" },
          e(
            "div",
            null,
            e("label", null, "\u4F18\u5148\u7EA7 (1-10)"),
            e("input", { type: "number", min: "1", max: "10", value: priority, onChange: (ev) => setPriority(ev.target.value) })
          ),
          e(
            "div",
            null,
            e("label", null, "\u6700\u5927\u8F6E\u6570"),
            e("input", { type: "number", min: "1", max: "100", value: maxGoalRounds, onChange: (ev) => setMaxGoalRounds(ev.target.value), placeholder: "\u9ED8\u8BA4 40" })
          ),
          e(
            "div",
            null,
            e("label", null, "\u6700\u5927\u53CD\u963B\u585E"),
            e("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes, onChange: (ev) => setMaxBlockedResumes(ev.target.value), placeholder: "\u9ED8\u8BA4 3" })
          )
        ),
        e(CronField, { label: "\u5FAA\u73AF\u8C03\u5EA6 (cron)", value: cron, onChange: setCron, presets: CRON_PRESETS, placeholder: "0 8 * * *" }),
        e("label", { style: { marginTop: "8px" } }, "\u4E00\u6B21\u6027\u5B9A\u65F6"),
        e("input", { type: "datetime-local", value: schedule, onChange: (ev) => setSchedule(ev.target.value) }),
        e(CronField, { label: "\u622A\u6B62\u65F6\u95F4 (deadline)", value: deadline, onChange: setDeadline, presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" }),
        e(
          "label",
          { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" } },
          e("input", { type: "checkbox", checked: autoArchive, onChange: (ev) => setAutoArchive(ev.target.checked), style: { width: "auto", margin: 0 } }),
          "\u5B8C\u6210\u540E\u81EA\u52A8\u5F52\u6863"
        ),
        e(
          "label",
          { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" } },
          e("input", { type: "checkbox", checked: enableNotifications, onChange: (ev) => setEnableNotifications(ev.target.checked), style: { width: "auto", margin: 0 } }),
          "\u4EFB\u52A1\u5B8C\u6210\u65F6\u901A\u77E5"
        ),
        e(
          "div",
          { className: "aq-modal-actions" },
          e("button", { className: "aq-btn", onClick: onClose }, "\u53D6\u6D88"),
          e("button", { className: "aq-btn primary", onClick: handleSubmit, disabled: submitting }, submitting ? "\u63D0\u4EA4\u4E2D..." : "\u4FDD\u5B58")
        )
      )
    );
  }
  function ConfirmModal({ message, onConfirm, onCancel }) {
    return e(
      "div",
      { className: "aq-modal-overlay", onClick: (ev) => {
        if (ev.target === ev.currentTarget) onCancel();
      } },
      e(
        "div",
        { className: "aq-modal", style: { width: "380px" } },
        e("div", { style: { fontSize: "14px", marginBottom: "16px", lineHeight: "1.6" } }, message),
        e(
          "div",
          { className: "aq-modal-actions" },
          e("button", { className: "aq-btn", onClick: onCancel }, "\u53D6\u6D88"),
          e("button", { className: "aq-btn danger", onClick: onConfirm }, "\u786E\u8BA4")
        )
      )
    );
  }
  function ConfigPanel({ config, onUpdate, onSetConcurrency, onClose, options }) {
    const [maxConcurrent, setMaxConcurrent] = React.useState(String(config.maxConcurrent ?? 2));
    const [maxGoalRounds, setMaxGoalRounds] = React.useState(String(config.maxGoalRounds ?? 40));
    const [maxBlockedResumes, setMaxBlockedResumes] = React.useState(String(config.maxBlockedResumes ?? 3));
    const [autoArchive, setAutoArchive] = React.useState(!!config.autoArchive);
    const [stallThreshold, setStallThreshold] = React.useState(String(config.stallThreshold ?? 10));
    const [unknownThreshold, setUnknownThreshold] = React.useState(String(config.unknownThreshold ?? 3));
    const [maxAttempts, setMaxAttempts] = React.useState(String(config.maxAttempts ?? 3));
    const [defaultDeadline, setDefaultDeadline] = React.useState(config.defaultDeadline || "");
    const [queueDir, setQueueDir] = React.useState(config.queueDir || "");
    const [enableNotifications, setEnableNotifications] = React.useState(config.enableNotifications !== false);
    const [webhook, setWebhook] = React.useState(config.webhook || "");
    const [workspace, setWorkspace] = React.useState(config.workspace || "");
    const [agentPreset, setAgentPreset] = React.useState(config.agentPreset || "");
    const [model, setModel] = React.useState(config.model || "");
    const [priority, setPriority] = React.useState(String(config.priority ?? 5));
    function handleSave() {
      const patch = {};
      patch.maxGoalRounds = parseInt(maxGoalRounds, 10);
      patch.maxBlockedResumes = parseInt(maxBlockedResumes, 10);
      patch.autoArchive = autoArchive;
      patch.stallThreshold = parseInt(stallThreshold, 10);
      patch.unknownThreshold = parseInt(unknownThreshold, 10);
      patch.maxAttempts = parseInt(maxAttempts, 10);
      patch.defaultDeadline = defaultDeadline || null;
      patch.webhook = webhook || null;
      patch.workspace = workspace || null;
      patch.queueDir = queueDir || null;
      patch.enableNotifications = enableNotifications;
      patch.agentPreset = agentPreset || null;
      patch.model = model || null;
      patch.priority = parseInt(priority, 10) || 5;
      // maxConcurrent 通过独立的 action 设置
      const newMc = parseInt(maxConcurrent, 10);
      if (newMc !== (config.maxConcurrent ?? 2)) onSetConcurrency(newMc);
      onUpdate(patch);
      onClose();
    }
    const tip = (text) => e("span", { className: "aq-tip", title: text }, "\u24D8");
    return e(
      "div",
      { className: "aq-modal-overlay", onClick: (ev) => {
        if (ev.target === ev.currentTarget) onClose();
      } },
      e(
        "div",
        { className: "aq-modal wide" },
        e("h3", null, "\u8FD0\u884C\u65F6\u914D\u7F6E"),
        e(
          "div",
          { className: "aq-row" },
          e(
            "div",
            null,
            e("label", null, "\u6700\u5927\u5E76\u53D1\u6570 (1-8)", tip("\u540C\u65F6\u8FD0\u884C\u7684\u6700\u5927\u4EFB\u52A1\u6570\uFF0C\u8D85\u8FC7\u6B64\u6570\u7684\u65B0\u4EFB\u52A1\u5C06\u6392\u961F\u7B49\u5F85")),
            e("input", { type: "number", min: "1", max: "8", value: maxConcurrent, onChange: (ev) => setMaxConcurrent(ev.target.value) })
          ),
          e(
            "div",
            null,
            e("label", null, "\u6700\u5927\u91CD\u8BD5 (1-10)", tip("\u4EFB\u52A1\u6D3E\u53D1\u5931\u8D25\u540E\u7684\u6700\u5927\u91CD\u8BD5\u6B21\u6570")),
            e("input", { type: "number", min: "1", max: "10", value: maxAttempts, onChange: (ev) => setMaxAttempts(ev.target.value) })
          )
        ),
        e(
          "div",
          { className: "aq-row" },
          e(
            "div",
            null,
            e("label", null, "\u6700\u5927 goal \u8F6E\u6570 (1-100)", tip("\u5355\u4E2A\u4EFB\u52A1\u81EA\u52A8\u7EED\u8DD1\u7684\u6700\u5927\u8F6E\u6570")),
            e("input", { type: "number", min: "1", max: "100", value: maxGoalRounds, onChange: (ev) => setMaxGoalRounds(ev.target.value) })
          ),
          e(
            "div",
            null,
            e("label", null, "\u6700\u5927\u53CD\u963B\u585E (0-10)", tip("\u4EFB\u52A1\u5361\u4F4F\u65F6\u81EA\u52A8\u6062\u590D\u7684\u6700\u5927\u6B21\u6570\uFF0C\u8D85\u8FC7\u540E\u6807\u8BB0\u4E3A\u5931\u8D25")),
            e("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes, onChange: (ev) => setMaxBlockedResumes(ev.target.value) })
          )
        ),
        e(
          "div",
          { className: "aq-row" },
          e(
            "div",
            null,
            e("label", null, "\u505C\u6EDE\u9608\u503C (1-100)", tip("\u8FDE\u7EED active \u8F6E\u6570\u540E\u89E6\u53D1\u505C\u6EDE\u68C0\u6D4B\uFF0C\u5224\u5B9A\u4EFB\u52A1\u662F\u5426\u5361\u4F4F")),
            e("input", { type: "number", min: "1", max: "100", value: stallThreshold, onChange: (ev) => setStallThreshold(ev.target.value) })
          ),
          e(
            "div",
            null,
            e("label", null, "\u4E0D\u53EF\u8FBE\u9608\u503C (1-100)", tip("\u8FDE\u7EED\u8F6E\u8BE2\u5931\u8D25\u540E\u5224\u5B9A\u4EFB\u52A1\u4E0D\u53EF\u8FBE")),
            e("input", { type: "number", min: "1", max: "100", value: unknownThreshold, onChange: (ev) => setUnknownThreshold(ev.target.value) })
          )
        ),
        e(
          "div",
          { className: "aq-row" },
          e(
            "div",
            null,
            e(CronField, { label: "\u5168\u5C40\u622A\u6B62\u65F6\u95F4 (deadline)", value: defaultDeadline, onChange: setDefaultDeadline, presets: DEADLINE_PRESETS, placeholder: "\u81EA\u5B9A\u4E49 cron \u8868\u8FBE\u5F0F", tip: "\u5230\u70B9\u5F3A\u5236\u505C\u6B62\u6240\u6709\u8FD0\u884C\u4E2D\u4EFB\u52A1\uFF08cron \u8868\u8FBE\u5F0F\uFF09" }),
            e("div", { className: "aq-schedule-help" }, "\u7559\u7A7A\u8868\u793A\u4E0D\u8BBE\u7F6E\u5168\u5C40\u622A\u6B62\u65F6\u95F4")
          ),
          e(
            "div",
            null,
            e("label", null, "\u9ED8\u8BA4\u4F18\u5148\u7EA7 (1-10)", tip("\u65B0\u521B\u5EFA\u4EFB\u52A1\u7684\u9ED8\u8BA4\u4F18\u5148\u7EA7\uFF0C\u6570\u5B57\u8D8A\u5927\u4F18\u5148\u7EA7\u8D8A\u9AD8")),
            e("div", { style: { display: "flex", gap: "8px", alignItems: "center" } },
              e("input", { type: "number", min: "1", max: "10", value: priority, onChange: (ev) => setPriority(ev.target.value), style: { flex: 1, marginBottom: 0 } }),
              e("label", { style: { display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", whiteSpace: "nowrap", margin: 0, fontSize: "13px" } },
                e("input", { type: "checkbox", checked: autoArchive, onChange: (ev) => setAutoArchive(ev.target.checked), style: { width: "auto", margin: 0 } }),
                "\u81EA\u52A8\u5F52\u6863",
                e("span", { className: "aq-tip", title: "\u4EFB\u52A1\u5B8C\u6210\u540E\u81EA\u52A8\u5F52\u6863\uFF0C\u4E0D\u518D\u663E\u793A\u5728\u4E3B\u5217\u8868\u4E2D" }, "\u24D8")
              ),
              e("label", { style: { display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", whiteSpace: "nowrap", margin: 0, fontSize: "13px" } },
                e("input", { type: "checkbox", checked: enableNotifications, onChange: (ev) => setEnableNotifications(ev.target.checked), style: { width: "auto", margin: 0 } }),
                "\u4EFB\u52A1\u901A\u77E5",
                e("span", { className: "aq-tip", title: "\u4EFB\u52A1\u8FDB\u5165\u7EC8\u6001\u65F6\u5F39\u51FA\u6D4F\u89C8\u5668\u901A\u77E5" }, "\u24D8")
              )
            )
          )
        ),
        e("label", null, "Webhook \u56DE\u8C03 URL", tip("\u4EFB\u52A1\u5B8C\u6210\u6216\u5931\u8D25\u65F6 POST \u56DE\u8C03\u7684 URL\uFF0Cpayload \u5305\u542B\u4EFB\u52A1\u8BE6\u60C5")),
        e("div", { className: "aq-row" },
          e("div", null,
            e("label", null, "收件箱目录", tip("扫描收件箱的目录路径，默认为 ~/.dsh/queue/tasks")),
            e("input", { value: queueDir, onChange: (ev) => setQueueDir(ev.target.value), placeholder: "默认 ~/.dsh/queue/tasks" })
          ),
          e("div", null,
            e("label", null, "Webhook URL", tip("任务完成时回调的 Webhook 地址")),
            e("input", { value: webhook, onChange: (ev) => setWebhook(ev.target.value), placeholder: "https://example.com/webhook" })
          )
        ),
        e(
          "div",
          { className: "aq-row" },
          e(
            "div",
            null,
            e("label", null, "\u9ED8\u8BA4 Agent \u9884\u8BBE", tip("\u65B0\u4EFB\u52A1\u7684\u9ED8\u8BA4\u6267\u884C\u9884\u8BBE\uFF0C\u4E0D\u8BBE\u7F6E\u5219\u81EA\u52A8\u5224\u5B9A")),
            options.presets && options.presets.length > 0 ? e(
              "select",
              { value: agentPreset, onChange: (ev) => setAgentPreset(ev.target.value) },
              e("option", { value: "" }, "\u81EA\u52A8\u5224\u5B9A"),
              ...options.presets.map((p) => e("option", { key: p.id, value: p.id }, p.name || p.id))
            ) : e("input", { value: agentPreset, onChange: (ev) => setAgentPreset(ev.target.value), placeholder: "\u4E0D\u8BBE\u7F6E\u5219\u81EA\u52A8\u5224\u5B9A" })
          ),
          e(
            "div",
            null,
            e("label", null, "\u9ED8\u8BA4\u6A21\u578B", tip("\u65B0\u4EFB\u52A1\u7684\u9ED8\u8BA4\u6267\u884C\u6A21\u578B\uFF0C\u4E0D\u8BBE\u7F6E\u5219\u4F7F\u7528\u5F53\u524D\u4F1A\u8BDD\u6A21\u578B")),
            e(
              "select",
              { value: model, onChange: (ev) => setModel(ev.target.value) },
              e("option", { value: "" }, "\u9ED8\u8BA4\uFF08\u5F53\u524D\u4F1A\u8BDD\u6A21\u578B\uFF09"),
              ...(options.models && options.models.length > 0
                ? options.models.map((m) => e("option", { key: m, value: m }, m))
                : [])
            )
          )
        ),
        e(
          "div",
          { className: "aq-modal-actions" },
          e("button", { className: "aq-btn", onClick: onClose }, "\u53D6\u6D88"),
          e("button", { className: "aq-btn primary", onClick: handleSave }, "\u4FDD\u5B58")
        )
      )
    );
  }
  function Dashboard({ controller, transport, sessions }) {
    const [snap, setSnap] = React.useState(() => controller.getSnapshot());
    const [confirm, setConfirm] = React.useState(null);
    const [msg, setMsg] = React.useState(null);
    React.useEffect(() => {
      const unsubscribe = controller.subscribe(() => setSnap(controller.getSnapshot()));
      return unsubscribe;
    }, []);
    function handleAction(kind, key) {
      if (kind === "delete") {
        setConfirm({ message: "\u786E\u8BA4\u5220\u9664\u4EFB\u52A1\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002", onConfirm: () => {
          controller.doAction(kind, key);
          setConfirm(null);
        } });
      } else if (kind === "stop") {
        setConfirm({ message: "\u786E\u8BA4\u505C\u6B62\u8FD0\u884C\u4E2D\u7684\u4EFB\u52A1\uFF1FAgent \u6B63\u5728\u6267\u884C\u7684\u5DE5\u4F5C\u5C06\u88AB\u4E2D\u65AD\u3002", onConfirm: () => {
          controller.doAction(kind, key);
          setConfirm(null);
        } });
      } else if (kind === "force-scan") {
        controller.doAction(kind, key);
        setMsg("\u6B63\u5728\u626B\u63CF\u6536\u4EF6\u7BB1...");
        setTimeout(() => setMsg(null), 2500);
      } else {
        controller.doAction(kind, key);
      }
    }
    return e(
      "div",
      { "data-dsh-autoqueue-view": "" },
      // 头部
      e(
        "div",
        { className: "aq-header" },
        e("button", { className: "aq-back", onClick: () => controller.closeBoard(), "aria-label": "\u5173\u95ED" }, "\u2039"),
        e("h2", null, "\u4EFB\u52A1\u961F\u5217"),
        e("button", { className: "aq-btn", onClick: () => handleAction("force-scan"), title: "\u626B\u63CF\u6536\u4EF6\u7BB1\u4E2D\u7684 .md \u6587\u4EF6" }, "\u7ACB\u5373\u626B\u63CF"),
        e("button", { className: "aq-btn", onClick: () => controller.openConfig() }, "\u2699 \u914D\u7F6E"),
        e("button", { className: "aq-btn primary", onClick: () => controller.openNewTask() }, "+ \u65B0\u5EFA\u4EFB\u52A1")
      ),
      // 反馈消息
      msg && e("div", { className: "aq-msg", key: msg }, msg),
      // 错误横幅
      e(ErrorBanner, { error: snap.error || snap.transportError, onDismiss: () => controller.clearError() }),
      // 状态统计
      e(StatsBar, {
        counts: snap.counts,
        total: snap.tasks.length,
        filter: snap.filter,
        onFilter: (f) => controller.setFilter(f)
      }),
      // 任务列表
      e("div", { className: "aq-tasks" },
        snap.loading ? e("div", { className: "aq-loading" }, "\u52A0\u8F7D\u4E2D...") : null,
        !snap.loading && snap.filtered.length === 0 ? e(
          "div",
          { className: "aq-empty" },
          e("div", null, snap.filter === "all" ? "\u8FD8\u6CA1\u6709\u4EFB\u52A1" : "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u4EFB\u52A1"),
          snap.filter === "all" ? e("div", { className: "aq-empty-cta" }, e("button", { className: "aq-btn primary", onClick: () => controller.openNewTask() }, "+ \u521B\u5EFA\u7B2C\u4E00\u4E2A\u4EFB\u52A1")) : null
        ) : null,
        !snap.loading && snap.filtered.map((task) => e(TaskCard, {
          key: task.key,
          task,
          onAction: handleAction,
          onDetail: (key) => controller.openDetail(key),
          onEdit: (key) => controller.openEdit(key),
           onSession: (sessionId) => {
             controller.closeBoard();
             sessions.open(sessionId);
           }
        })),
      ),
      // 弹窗
      snap.showNewTask && e(NewTaskModal, {
        onClose: () => controller.closeNewTask(),
        onCreated: (data) => controller.createTask(data),
        options: snap.options
      }),
      snap.showDetail && snap.detailTask && e(TaskDetailModal, {
        task: snap.detailTask,
        transport,
        onClose: () => controller.closeDetail(),
        onAction: (kind, key) => controller.doAction(kind, key)
      }),
      snap.showEdit && snap.editTask && e(EditTaskModal, {
        task: snap.editTask,
        onClose: () => controller.closeEdit(),
        onUpdate: (key, patch) => controller.updateTask(key, patch)
      }),
      snap.showConfig && e(ConfigPanel, {
        config: snap.config,
        onUpdate: (patch) => controller.updateConfig(patch),
        onSetConcurrency: (n) => controller.setConcurrency(n),
        onClose: () => controller.closeConfig(),
        options: snap.options
      }),
      confirm && e(ConfirmModal, {
        message: confirm.message,
        onConfirm: confirm.onConfirm,
        onCancel: () => setConfirm(null)
      })
    );
  }
  return {
    CronField,
    ErrorBanner,
    StatsBar,
    TaskCard,
    TaskDetailModal,
    NewTaskModal,
    EditTaskModal,
    ConfirmModal,
    ConfigPanel,
    Dashboard
  };
}

// src/client/mount.js
var PANEL_ATTR = "data-dsh-autoqueue-active";
var VIEW_ATTR = "data-dsh-autoqueue-view";
var PANEL_NAME = "autoqueue";
var ENTRY_SELECTOR = "[data-dsh-autoqueue-entry]";
var ENTRY_ATTR = "data-dsh-autoqueue-entry";
var SIDEBAR_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 15 15"/><line x1="5" y1="3" x2="3" y2="5"/><line x1="19" y1="3" x2="21" y2="5"/></svg>';
var CENTER_COL_SELECTOR = '[data-pane="conversation"], [class*="centerCol"]';
var ACTIVATE_EVENT = "dsh-panel-activate";
function mountBoard(controller, transport, React, react_dom_client, components, sessions) {
  let root = null;
  let container = null;
  function ensure() {
    if (container) return;
    const column = document.querySelector(CENTER_COL_SELECTOR);
    if (!column) return;
    container = document.createElement("div");
    container.setAttribute(VIEW_ATTR, "");
    container.dataset.dshPlugin = "autoqueue";
    column.appendChild(container);
    root = react_dom_client.createRoot(container);
    root.render(React.createElement(components.Dashboard, { controller, transport, sessions }));
  }
  function applyActive() {
    const snap = controller.getSnapshot();
    if (snap.boardOpen) {
      for (const attr of document.documentElement.getAttributeNames()) {
        if (attr.endsWith("-active") && attr !== PANEL_ATTR) {
          document.documentElement.removeAttribute(attr);
        }
      }
      document.documentElement.setAttribute(PANEL_ATTR, "");
    } else {
      document.documentElement.removeAttribute(PANEL_ATTR);
    }
  }
  function onOtherActivate(event) {
    if (event.detail !== PANEL_NAME && controller.getSnapshot().boardOpen) {
      controller.closeBoard();
    }
  }
  const SIDEBAR_ROW_SELECTOR = '[class*="sessionRow"], [class*="projectRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"], [class*="newSession"]';
  function onClickSidebarRow(event) {
    if (!controller.getSnapshot().boardOpen) return;
    const target = event.target;
    if (!target) return;
    if (target.closest(SIDEBAR_ROW_SELECTOR)) controller.closeBoard();
  }
  const waitObserver = new MutationObserver(() => {
    ensure();
  });
  waitObserver.observe(document.body, { childList: true, subtree: true });
  const boardUnsub = controller.subscribe(applyActive);
  document.addEventListener(ACTIVATE_EVENT, onOtherActivate);
  document.addEventListener("click", onClickSidebarRow, true);
  ensure();
  let checkInterval = null;
  if (!container) {
    checkInterval = setInterval(() => {
      ensure();
      if (container) clearInterval(checkInterval);
    }, 500);
  }
  return () => {
    if (checkInterval) clearInterval(checkInterval);
    waitObserver.disconnect();
    boardUnsub();
    document.removeEventListener(ACTIVATE_EVENT, onOtherActivate);
    document.removeEventListener("click", onClickSidebarRow, true);
    if (root) root.unmount();
    if (container) container.remove();
  };
}
function sidebarRoot() {
  const column = document.querySelector('[data-pane="sidebar"], [class*="sidebarCol"]');
  if (column === null) return void 0;
  return column.querySelector('[class*="logoRow"]')?.parentElement ?? column.firstElementChild;
}
function newSessionButton(root) {
  const nested = root.querySelector('button[class*="newSession"]');
  if (nested !== null) return nested;
  for (const child of root.children) {
    if (child.tagName === "BUTTON") return child;
  }
  return void 0;
}
function createEntry(controller) {
  const entry = document.createElement("button");
  entry.type = "button";
  entry.setAttribute(ENTRY_ATTR, "");
  entry.setAttribute("data-dsh-plugin", "autoqueue");
  entry.setAttribute("data-dsh-part", "sidebar-entry");
  entry.className = "aq-sidebar-entry";
  entry.setAttribute("aria-label", "AutoQueue \u4EFB\u52A1\u961F\u5217");
  entry.setAttribute("title", "AutoQueue \u4EFB\u52A1\u961F\u5217");
  entry.innerHTML = '<span class="aq-sidebar-icon">' + SIDEBAR_ICON + '</span><span class="aq-sidebar-label">\u4EFB\u52A1\u961F\u5217</span>';
  const syncActive = () => {
    const snap = controller.getSnapshot();
    if (snap.boardOpen) entry.dataset.active = "true";
    else delete entry.dataset.active;
  };
  const unsub = controller.subscribe(syncActive);
  syncActive();
  entry._aqUnsub = unsub;
  entry.addEventListener("click", () => controller.toggleBoard());
  return entry;
}
function placeEntry(root, entry) {
  const button = newSessionButton(root);
  if (button === void 0) return false;
  if (entry.parentElement !== root) {
    const row = button.closest('[class*="logoRow"]');
    const base = row !== null && row.parentElement === root ? row : button;
    const family = Array.from(root.children).filter(
      (el) => el instanceof HTMLElement && el.matches(ENTRY_SELECTOR + ", [data-dsh-taskboard-entry], [data-dsh-ssh-entry]")
    );
    const anchor = family.length > 0 ? family[0] : base.nextElementSibling;
    root.insertBefore(entry, anchor);
  }
  return true;
}
function mountSidebarEntry(controller) {
  if (document.querySelector(ENTRY_SELECTOR) !== null) return () => {
  };
  const entry = createEntry(controller);
  let root = void 0;
  let placed = false;
  const tryPlace = () => {
    if (root !== void 0 && !root.isConnected) {
      rootObserver.disconnect();
      root = void 0;
      placed = false;
    }
    if (placed) {
      if (document.body.contains(entry)) return;
      rootObserver.disconnect();
      root = void 0;
      placed = false;
    }
    root = root ?? sidebarRoot();
    if (root === void 0) return;
    placed = placeEntry(root, entry);
    if (placed) {
      rootObserver.observe(root, { childList: true, subtree: true });
    }
  };
  const waitObserver = new MutationObserver(() => {
    tryPlace();
  });
  waitObserver.observe(document.body, { childList: true, subtree: true });
  const rootObserver = new MutationObserver(() => {
    if (root === void 0 || !root.isConnected) {
      placed = false;
      tryPlace();
      return;
    }
    if (!root.contains(entry)) placed = placeEntry(root, entry);
  });
  tryPlace();
  return () => {
    waitObserver.disconnect();
    rootObserver.disconnect();
    if (entry._aqUnsub) entry._aqUnsub();
    entry.remove();
  };
}

// src/client/index.js
window.__ModuleLoader__.load({
  id: "@alintever/dsh-plugin-autoqueue",
  factory: (require2) => {
    const React = require2("react");
    const react_dom_client = require2("react-dom/client");
    const components = createComponents(React);
    return {
      // 插件退出时静默清理
      dispose() {
      },
      // 在 Slot 上下文中调用，接收 Cordis ctx
      apply(ctx) {
        const sessions = ctx.get("sessions");
        const transport = createTransport();
        const controller = createController(transport);
        const boardDisposer = mountBoard(controller, transport, React, react_dom_client, components, sessions);
        controller.init();
        const styleId = "dsh-autoqueue-styles";
        if (!document.getElementById(styleId)) {
          const style = document.createElement("style");
          style.id = styleId;
          style.textContent = QUEUE_CSS;
          document.head.appendChild(style);
        }
        const sidebarDisposer = mountSidebarEntry(controller);
        return () => {
          boardDisposer();
          sidebarDisposer();
          controller.dispose();
        };
      }
    };
  }
});
