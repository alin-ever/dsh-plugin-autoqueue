(() => {
  // client/src/styles/workstation.css
  var workstation_default = `[data-dsh-autoqueue-view]{position:absolute;inset:0;z-index:10;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#111827);display:none;font-family:system-ui,sans-serif;font-size:13px;line-height:1.5}
[data-dsh-autoqueue-active] [data-dsh-autoqueue-view]{display:flex}
[data-dsh-autoqueue-active] [data-pane="conversation"]>*:not([data-dsh-autoqueue-view]){display:none!important}
.aq-ws{display:flex;height:100%;width:100%}
.aq-sb{width:200px;flex-shrink:0;border-right:1px solid var(--dsw-alias-border-l1,#e5e7eb);background:var(--dsw-alias-bg-layer-1,#f9fafb);display:flex;flex-direction:column;overflow-y:auto}
.aq-sb-hd{padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7eb);font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px}
.aq-sb-hd svg{width:16px;height:16px;opacity:.6;flex-shrink:0}
.aq-nav-item{display:flex;align-items:center;gap:8px;padding:7px 16px;cursor:pointer;border:none;background:none;width:100%;text-align:left;font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);font-family:inherit;transition:background .1s}
.aq-nav-item:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f4f6)}
.aq-nav-item.sel{color:var(--dsw-alias-brand-primary,#3b82f6);font-weight:600;background:var(--dsw-alias-interactive-bg-active,#eff6ff)}
.aq-nav-item .aq-nav-svg{width:15px;height:15px;flex-shrink:0;opacity:.7}
.aq-nav-item .aq-nav-badge{margin-left:auto;font-size:10px;padding:1px 6px;border-radius:10px;background:var(--dsw-alias-border-l1,#e5e7eb);color:var(--dsw-alias-label-secondary,#6b7280);font-weight:500}
.aq-main{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.aq-tbar{display:flex;align-items:center;gap:8px;padding:10px 16px;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7eb);flex-shrink:0}
.aq-tbar-title{font-weight:600;font-size:14px;flex:1}
.aq-btn{padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;border:1px solid var(--dsw-alias-border-l1,#d1d5db);background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#111827);white-space:nowrap;font-family:inherit;display:inline-flex;align-items:center;gap:4px;transition:background .1s}
.aq-btn:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f4f6)}
.aq-btn.primary{background:var(--dsw-alias-brand-primary,#3b82f6);color:#fff;border-color:var(--dsw-alias-brand-primary,#3b82f6)}
.aq-btn.primary:hover{filter:brightness(.9)}
.aq-btn.danger{color:var(--dsw-alias-state-error-primary,#ef4444);border-color:var(--dsw-alias-state-error-primary,#ef4444)}
.aq-btn.danger:hover{background:#fef2f2}
.aq-btn.warn{color:var(--dsw-alias-state-warn-primary,#f59e0b);border-color:var(--dsw-alias-state-warn-primary,#f59e0b)}
.aq-btn.warn:hover{background:#fffbeb}
.aq-btn.success{color:var(--dsw-alias-state-success-primary,#10b981);border-color:var(--dsw-alias-state-success-primary,#10b981)}
.aq-btn.success:hover{background:#f0fdf4}
.aq-btn:disabled{opacity:.5;cursor:default}
.aq-btn svg{width:13px;height:13px;flex-shrink:0}
.aq-kpi{display:flex;gap:10px;padding:10px 16px;flex-shrink:0;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7eb)}
.aq-kpi-card{flex:1;padding:10px 14px;border-radius:8px;background:var(--dsw-alias-bg-layer-1,#f9fafb);border:1px solid var(--dsw-alias-border-l1,#e5e7eb)}
.aq-kpi-card .v{font-size:20px;font-weight:700;line-height:1.2}
.aq-kpi-card .l{font-size:10px;color:var(--dsw-alias-label-tertiary,#9ca3af);margin-top:2px}
.aq-kpi-card.e .v{color:var(--dsw-alias-state-error-primary,#ef4444)}
.aq-kpi-card.s .v{color:var(--dsw-alias-state-success-primary,#10b981)}
.aq-kpi-card.i .v{color:var(--dsw-alias-brand-primary,#3b82f6)}
.aq-tabs{display:flex;padding:0 16px;flex-shrink:0;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7eb)}
.aq-tab{padding:7px 14px;cursor:pointer;border:none;background:none;font-size:12px;font-weight:500;color:var(--dsw-alias-label-secondary,#6b7280);border-bottom:2px solid transparent;font-family:inherit;transition:color .1s,border-color .1s;white-space:nowrap}
.aq-tab:hover{color:var(--dsw-alias-label-primary,#111827)}
.aq-tab.sel{color:var(--dsw-alias-brand-primary,#3b82f6);border-bottom-color:var(--dsw-alias-brand-primary,#3b82f6)}
.aq-tab-count{font-size:10px;margin-left:3px;opacity:.7}
.aq-list{flex:1;overflow-y:auto;padding:8px 16px}
.aq-card{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:1px solid var(--dsw-alias-border-l1,#e5e7eb);border-radius:10px;margin-bottom:8px;cursor:pointer;transition:box-shadow .1s,border-color .1s;background:var(--dsw-alias-bg-base,#fff)}
.aq-card:hover{border-color:var(--dsw-alias-brand-primary,#3b82f6);box-shadow:0 1px 6px rgba(0,0,0,.06)}
.aq-card.sel{border-color:var(--dsw-alias-brand-primary,#3b82f6);background:var(--dsw-alias-interactive-bg-active,#eff6ff)}
.aq-card-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:3px}
.aq-card-body{flex:1;min-width:0}
.aq-card-hd{display:flex;align-items:center;gap:8px;margin-bottom:3px}
.aq-card-key{font-weight:600;font-size:13px;display:flex;align-items:center;gap:5px}
.aq-card-key .unread{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary,#3b82f6);flex-shrink:0}
.aq-card-type{font-size:10px;padding:1px 6px;border-radius:4px;background:var(--dsw-alias-bg-layer-1,#f3f4f6);color:var(--dsw-alias-label-tertiary,#9ca3af);white-space:nowrap}
.aq-card-summary{font-size:12px;color:var(--dsw-alias-label-secondary,#6b7280);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px}
.aq-card-meta{font-size:11px;color:var(--dsw-alias-label-tertiary,#9ca3af);display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.aq-card-meta-item{display:inline-flex;align-items:center;gap:3px}
.aq-card-meta-item svg{width:12px;height:12px;opacity:.6}
.aq-card-actions{display:flex;gap:3px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
.aq-card-actions .aq-btn{font-size:10px;padding:3px 7px}
.aq-progress{margin-top:6px}
.aq-progress-bar{height:4px;border-radius:2px;background:var(--dsw-alias-border-l1,#e5e7eb);overflow:hidden}
.aq-progress-fill{height:100%;border-radius:2px;background:var(--dsw-alias-brand-primary,#3b82f6);transition:width .5s}
.aq-progress-info{font-size:10px;color:var(--dsw-alias-label-tertiary,#9ca3af);margin-top:3px;display:flex;justify-content:space-between}
.aq-progress-info .aq-goal-phase{color:var(--dsw-alias-brand-primary,#3b82f6);font-weight:500}
.aq-empty{text-align:center;padding:80px 20px;color:var(--dsw-alias-label-tertiary,#9ca3af)}
.aq-empty-icon{font-size:36px;margin-bottom:12px;opacity:.25}
.aq-empty-text{font-size:14px;margin-bottom:12px}
.aq-loading{text-align:center;padding:80px;color:var(--dsw-alias-label-tertiary,#9ca3af);font-size:13px}
.aq-err{padding:8px 16px;color:var(--dsw-alias-state-error-primary,#ef4444);font-size:12px;background:#fef2f2;border-bottom:1px solid #fecaca;display:flex;align-items:center;gap:8px;flex-shrink:0}
.aq-err-dismiss{margin-left:auto;cursor:pointer;opacity:.6;font-size:16px;padding:0 4px}
.aq-err-dismiss:hover{opacity:1}
.aq-toast{padding:6px 16px;font-size:12px;color:#059669;background:#ecfdf5;border-bottom:1px solid #a7f3d0;text-align:center;flex-shrink:0}
.aq-d-overlay{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.2);display:flex;justify-content:flex-end}
.aq-d-panel{width:480px;max-width:90vw;background:var(--dsw-alias-bg-base,#fff);height:100%;overflow-y:auto;box-shadow:-4px 0 20px rgba(0,0,0,.1);animation:aq-slide-in .2s ease-out}
@keyframes aq-slide-in{from{transform:translateX(100%)}to{transform:translateX(0)}}
.aq-d-hd{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7eb);position:sticky;top:0;background:var(--dsw-alias-bg-base,#fff);z-index:2}
.aq-d-hd h3{margin:0;font-size:15px;font-weight:600;flex:1}
.aq-d-close{border:none;background:none;cursor:pointer;font-size:20px;color:var(--dsw-alias-label-secondary,#6b7280);padding:4px 8px;border-radius:6px}
.aq-d-close:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f4f6)}
.aq-d-body{padding:16px 20px}
.aq-d-section{margin-bottom:16px}
.aq-d-section-title{font-size:10px;font-weight:600;color:var(--dsw-alias-label-tertiary,#9ca3af);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.aq-d-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 16px}
.aq-d-item{font-size:12px}
.aq-d-item .dl{color:var(--dsw-alias-label-tertiary,#9ca3af)}
.aq-d-item .dv{font-weight:500}
.aq-d-report{background:var(--dsw-alias-bg-layer-1,#f9fafb);border-radius:6px;padding:10px 14px;max-height:180px;overflow-y:auto}
.aq-d-report pre{margin:0;font-size:11px;white-space:pre-wrap;word-break:break-all;font-family:Consolas,monospace}
.aq-d-exec-table{width:100%;font-size:11px;border-collapse:collapse}
.aq-d-exec-table th,.aq-d-exec-table td{padding:4px 8px;text-align:left;border-bottom:1px solid var(--dsw-alias-border-l1,#e5e7eb)}
.aq-d-exec-table th{font-weight:600;color:var(--dsw-alias-label-tertiary,#9ca3af);font-size:10px}
.aq-d-actions{display:flex;gap:6px;padding:12px 20px;border-top:1px solid var(--dsw-alias-border-l1,#e5e7eb);position:sticky;bottom:0;background:var(--dsw-alias-bg-base,#fff)}
.aq-m-overlay{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}
.aq-modal{background:var(--dsw-alias-bg-base,#fff);border-radius:12px;padding:24px;width:520px;max-width:90vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 30px rgba(0,0,0,.15)}
.aq-modal.wide{width:640px}
.aq-modal h3{margin:0 0 16px;font-size:16px;font-weight:600}
.aq-modal label{display:block;font-size:12px;font-weight:500;margin-bottom:4px;margin-top:10px;color:var(--dsw-alias-label-secondary,#6b7280)}
.aq-modal label:first-of-type{margin-top:0}
.aq-modal input,.aq-modal textarea,.aq-modal select{width:100%;padding:7px 10px;border:1px solid var(--dsw-alias-border-l1,#d1d5db);border-radius:6px;font-size:13px;margin-bottom:6px;box-sizing:border-box;font-family:inherit;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#111827)}
.aq-modal textarea{resize:vertical;min-height:100px}
.aq-modal select{cursor:pointer;appearance:none;padding:7px 36px 7px 10px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
.aq-modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
.aq-row{display:flex;gap:12px}
.aq-row>*{flex:1;min-width:0}
.aq-help{font-size:11px;color:var(--dsw-alias-label-tertiary,#9ca3af);margin-top:-4px;margin-bottom:6px}
.aq-tip{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:var(--dsw-alias-border-l1,#e5e7eb);color:var(--dsw-alias-label-tertiary,#9ca3af);font-size:10px;line-height:1;margin-left:4px;cursor:help;flex-shrink:0}
.aq-tip:hover{background:var(--dsw-alias-label-tertiary,#9ca3af);color:var(--dsw-alias-bg-base,#fff)}
.aq-sidebar-entry{box-sizing:border-box;width:100%;height:36px;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;white-space:nowrap;background:none;border:none;border-radius:8px;align-items:center;gap:8px;padding:0 10px;font-size:13px;display:flex;font-family:inherit}
.aq-sidebar-entry:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f4f6);color:var(--dsw-alias-label-primary,#111827)}
.aq-sidebar-entry[data-active]{background:var(--dsw-alias-interactive-bg-active,#e5e7eb);color:var(--dsw-alias-label-primary,#111827);font-weight:600}
.aq-sidebar-icon{flex:none;justify-content:center;align-items:center;width:24px;height:24px;display:inline-flex}
.aq-sidebar-icon svg{width:18px;height:18px;display:block}
.aq-sidebar-label{text-overflow:ellipsis;overflow:hidden}
[data-sidebar-collapsed] .aq-sidebar-entry{border-radius:50%;justify-content:center;width:36px;height:36px;margin:0 auto 12px;padding:0}
[data-sidebar-collapsed] .aq-sidebar-label{display:none}`;

  // client/src/transport.js
  var API_PREFIX = "/api/queue";
  var REQUEST_TIMEOUT_MS = 15e3;
  function readJson(response) {
    if (!response.ok) {
      return response.text().then(function(text) {
        throw new Error(text || "HTTP " + response.status);
      });
    }
    return response.json();
  }
  function request(url, init) {
    var controller = new AbortController();
    var timeout = setTimeout(function() {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    return fetch(API_PREFIX + url, Object.assign({}, init, { signal: controller.signal })).then(readJson).finally(function() {
      clearTimeout(timeout);
    });
  }
  function createTransport() {
    return {
      state: function() {
        return request("/state");
      },
      detail: function(key) {
        return request("/detail?key=" + encodeURIComponent(key));
      },
      options: function() {
        return request("/options");
      },
      getConfig: function() {
        return request("/config");
      },
      setConfig: function(patch) {
        return request("/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
      },
      createTask: function(data) {
        return request("/task", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      },
      action: function(kind, key, opts) {
        return request("/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ requestId: crypto.randomUUID(), action: Object.assign({ kind, key }, opts || {}) })
        });
      },
      markRead: function(key, read) {
        return request("/mark-read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, read: read !== false }) });
      },
      subscribe: function(listener) {
        var events = new EventSource(API_PREFIX + "/events");
        events.onmessage = function(message) {
          try {
            var parsed = JSON.parse(message.data);
            if (parsed && typeof parsed === "object" && typeof parsed.revision === "number") listener(parsed);
          } catch (e) {
          }
        };
        events.onerror = function() {
        };
        var onVisible = function() {
          if (document.visibilityState === "visible") listener(null);
        };
        document.addEventListener("visibilitychange", onVisible);
        return function() {
          document.removeEventListener("visibilitychange", onVisible);
          events.close();
        };
      }
    };
  }

  // client/src/controller.js
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
    return tasks.filter(function(t) {
      return isUnread(t);
    }).length;
  }
  function createController(transport) {
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
      if (filter !== "all") filtered = filtered.filter(function(t) {
        return t.status === filter;
      });
      if (navGroup === "cron") filtered = filtered.filter(function(t) {
        return t.taskType === "cron";
      });
      else if (navGroup === "schedule") filtered = filtered.filter(function(t) {
        return t.taskType === "schedule";
      });
      else if (navGroup === "manual") filtered = filtered.filter(function(t) {
        return t.taskType === "manual";
      });
      else if (navGroup === "archived") filtered = filtered.filter(function(t) {
        return !!t.archivedAt;
      });
      else if (navGroup === "active") filtered = filtered.filter(function(t) {
        return !t.archivedAt;
      });
      var detailTask = showDetail ? tasks.find(function(t) {
        return t.key === showDetail;
      }) : null;
      var editTask = showEdit ? tasks.find(function(t) {
        return t.key === showEdit;
      }) : null;
      return {
        tasks,
        filtered,
        counts,
        metrics,
        boardOpen,
        filter,
        navGroup,
        showDetail,
        showNewTask,
        showEdit,
        showConfig,
        loading,
        error,
        revision,
        config,
        options,
        transportError,
        detailTask,
        editTask,
        unreadCount: countUnread(tasks)
      };
    }
    function subscribe(fn) {
      listeners.push(fn);
      return function() {
        listeners = listeners.filter(function(x) {
          return x !== fn;
        });
      };
    }
    async function loadState() {
      loading = true;
      notif();
      try {
        var data = await transport.state();
        tasks = data.tasks || [];
        revision = data.revision || 0;
        config = data.config || { maxConcurrent: 2 };
        if (data.metrics) getSnapshot().metrics = data.metrics;
        transportError = null;
        error = null;
      } catch (err) {
        transportError = err.message;
      }
      loading = false;
      notif();
    }
    async function loadOptions() {
      try {
        options = await transport.options();
      } catch (e) {
      }
    }
    function startSSE() {
      if (sseDisposer) return;
      sseDisposer = transport.subscribe(function(data) {
        if (data && data.revision !== void 0) {
          var newTasks = data.tasks || [];
          for (var i = 0; i < newTasks.length; i++) {
            var t = newTasks[i];
            var prev = prevStatuses[t.key];
            if (prev !== void 0 && prev !== t.status && TERMINAL[t.status] && t.enableNotifications !== false !== false) {
              var label = (STATUS_CONFIG[t.status] || {}).label || t.status;
              try {
                if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("autoqueue", { body: t.key + " \u2192 " + label, tag: t.key });
              } catch (e) {
              }
            }
          }
          prevStatuses = {};
          for (var j = 0; j < newTasks.length; j++) prevStatuses[newTasks[j].key] = newTasks[j].status;
          tasks = newTasks;
          revision = data.revision;
          config = data.config || { maxConcurrent: 2 };
          if (data.metrics) getSnapshot().metrics = data.metrics;
          transportError = null;
          if (showDetail && !tasks.find(function(t2) {
            return t2.key === showDetail;
          })) showDetail = null;
          if (showEdit && !tasks.find(function(t2) {
            return t2.key === showEdit;
          })) showEdit = null;
        } else if (data === null) {
          loadState();
        }
        notif();
      });
    }
    function stopSSE() {
      if (sseDisposer) {
        sseDisposer();
        sseDisposer = null;
      }
    }
    async function init() {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        try {
          Notification.requestPermission();
        } catch (e) {
        }
      }
      await Promise.all([loadState(), loadOptions()]);
      startSSE();
    }
    function openBoard() {
      document.dispatchEvent(new CustomEvent("dsh-panel-activate", { detail: "ssh" }));
      boardOpen = true;
      filter = "all";
      navGroup = "all";
      notif();
      document.dispatchEvent(new CustomEvent("dsh-panel-activate", { detail: "autoqueue" }));
    }
    function closeBoard() {
      if (!boardOpen) return;
      boardOpen = false;
      showDetail = null;
      showEdit = null;
      showNewTask = false;
      showConfig = false;
      notif();
    }
    function toggleBoard() {
      if (boardOpen) closeBoard();
      else openBoard();
    }
    function setFilter(f) {
      filter = f;
      notif();
    }
    function setNavGroup(g) {
      navGroup = g;
      notif();
    }
    function openDetail(key) {
      showDetail = key;
      var t = tasks.find(function(x) {
        return x.key === key;
      });
      if (t && isUnread(t)) markRead(key);
      notif();
    }
    function closeDetail() {
      showDetail = null;
      notif();
    }
    function openEdit(key) {
      showEdit = key;
      notif();
    }
    function closeEdit() {
      showEdit = null;
      notif();
    }
    function openNewTask() {
      showNewTask = true;
      notif();
    }
    function closeNewTask() {
      showNewTask = false;
      notif();
    }
    function openConfig() {
      showConfig = true;
      notif();
    }
    function closeConfig() {
      showConfig = false;
      notif();
    }
    async function createTask(data) {
      try {
        var result = await transport.createTask({ requestId: crypto.randomUUID(), key: data.key, content: data.content, priority: data.priority, cron: data.cron, schedule: data.schedule, deadline: data.deadline, maxGoalRounds: data.maxGoalRounds, maxBlockedResumes: data.maxBlockedResumes, workspace: data.workspace, agentPreset: data.agentPreset, model: data.model, autoArchive: data.autoArchive, enableNotifications: data.enableNotifications });
        if (result.ok) {
          showNewTask = false;
          await loadState();
        } else {
          error = result.error || "\u521B\u5EFA\u5931\u8D25";
          notif();
        }
      } catch (err) {
        error = err.message;
        notif();
      }
    }
    async function markRead(key, read) {
      try {
        await transport.markRead(key, read !== false);
        await loadState();
      } catch (err) {
        error = err.message;
        notif();
      }
    }
    async function doAction(kind, key, opts) {
      try {
        var result = await transport.action(kind, key, opts);
        if (!result.ok) {
          error = result.error || kind + " \u5931\u8D25";
          notif();
        }
        await loadState();
      } catch (err) {
        error = err.message;
        notif();
      }
    }
    async function updateTask(key, patch) {
      try {
        var result = await transport.action("update", key, patch);
        if (result.ok) {
          showEdit = null;
          await loadState();
        } else {
          error = result.error || "\u66F4\u65B0\u5931\u8D25";
          notif();
        }
      } catch (err) {
        error = err.message;
        notif();
      }
    }
    async function setConcurrency(n) {
      try {
        await transport.action("set-concurrency", null, { maxConcurrent: n });
        await loadState();
      } catch (err) {
        error = err.message;
        notif();
      }
    }
    async function updateConfig(patch) {
      try {
        await transport.setConfig(patch);
        await loadState();
      } catch (err) {
        error = err.message;
        notif();
      }
    }
    function clearError() {
      error = null;
      notif();
    }
    function dispose() {
      stopSSE();
      listeners = [];
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
      setNavGroup,
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
      clearError,
      loadState
    };
  }

  // client/src/utils.js
  var STATUS_CONFIG2 = {
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
  function timeAgo(iso) {
    if (!iso) return "";
    var d = Date.now() - new Date(iso).getTime();
    var m = Math.floor(d / 6e4);
    if (m < 1) return "\u521A\u521A";
    if (m < 60) return m + " \u5206\u949F\u524D";
    var h = Math.floor(m / 60);
    if (h < 24) return h + " \u5C0F\u65F6\u524D";
    return Math.floor(h / 24) + " \u5929\u524D";
  }
  function formatIso(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  }
  function localDatetimeString(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var p = function(n) {
      return String(n).padStart(2, "0");
    };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function taskSummary(body) {
    if (!body) return "";
    return body.split("\n")[0] ? body.split("\n")[0].replace(/^#+\s*/, "").trim() : "";
  }
  function cronToHuman(cron) {
    if (!cron) return "";
    var parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return cron;
    var min = parts[0], hour = parts[1], dom = parts[2], month = parts[3], dow = parts[4];
    var time = hour.padStart(2, "0") + ":" + min.padStart(2, "0");
    if (dom === "*" && month === "*" && dow === "*") return "\u6BCF\u5929 " + time;
    if (dom === "*" && month === "*" && dow === "1-5") return "\u5DE5\u4F5C\u65E5 " + time;
    var DOW_MAP = { 0: "\u65E5", 1: "\u4E00", 2: "\u4E8C", 3: "\u4E09", 4: "\u56DB", 5: "\u4E94", 6: "\u516D" };
    if (dom === "*" && month === "*" && /^\d$/.test(dow) && DOW_MAP[dow]) return "\u6BCF\u5468" + DOW_MAP[dow] + " " + time;
    if (/^\d+$/.test(dom) && month === "*" && dow === "*") return "\u6BCF\u6708" + parseInt(dom, 10) + "\u65E5 " + time;
    if (min.indexOf("*/") === 0) return "\u6BCF" + min.slice(2) + "\u5206\u949F";
    return cron;
  }
  function elapseStr(startedAt) {
    if (!startedAt) return "";
    var ms = Date.now() - new Date(startedAt).getTime();
    var s = Math.floor(ms / 1e3);
    if (s < 60) return s + "s";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m " + s % 60 + "s";
    return Math.floor(m / 60) + "h " + m % 60 + "m";
  }
  function isUnread2(task) {
    if (task.status !== "done" && task.status !== "failed" && task.status !== "stopped") return false;
    if (task.archivedAt) return false;
    if (!task.readAt) return true;
    return task.updatedAt > task.readAt;
  }
  var ICONS = {
    clock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.5"/><polyline points="8 4.5 8 8 11 10"/></svg>',
    repeat: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.5 8a6.5 6.5 0 0 1 11.7-3.5M14.5 8a6.5 6.5 0 0 1-11.7 3.5"/><polyline points="10.5 1.5 13.2 4.5 10.5 7"/><polyline points="5.5 14.5 2.8 11.5 5.5 9"/></svg>',
    play: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5a.5.5 0 0 1 .8-.4l8 5.5a.5.5 0 0 1 0 .8l-8 5.5a.5.5 0 0 1-.8-.4z"/></svg>',
    plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>',
    gear: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/></svg>',
    scan: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1.5a6.5 6.5 0 1 1-4.6 1.9"/><polyline points="5.5 1.5 8 1.5 8 4"/></svg>',
    stop: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="2"/></svg>',
    archive: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3.5h12v2H2z"/><path d="M3 5.5v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7"/><line x1="6" y1="8" x2="10" y2="8"/></svg>',
    restore: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.5 4v4h4"/><path d="M3 8.5a6.5 6.5 0 1 0 1.5-5.5"/></svg>',
    trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12"/><path d="M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4"/><path d="M3.5 4l1 9.5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1l1-9.5"/></svg>',
    edit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11.5 1.5l3 3L5 14l-3.5.5L2 11z"/></svg>',
    external: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2h5v5"/><path d="M14 2L8 8"/><path d="M10 9v3.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1H7"/></svg>',
    inbox: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6v6.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6"/><path d="M1.5 2.5l3.5 4.5h6l3.5-4.5"/><path d="M1.5 2.5h13v3.5H9.5L8 8l-1.5-2H1.5z"/></svg>',
    list: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>'
  };
  function iconHtml(name) {
    return ICONS[name] || "";
  }
  var TASK_TYPE_LABELS = {
    cron: { label: "\u5FAA\u73AF", icon: "repeat" },
    schedule: { label: "\u5B9A\u65F6", icon: "clock" },
    manual: { label: "\u624B\u52A8", icon: "play" }
  };

  // client/src/components/TaskDetail.jsx
  function TaskDetailPanel(props) {
    var task = props.task;
    var transport = props.transport;
    var controller = props.controller;
    var detail = window.__React.useState(null);
    var loading = window.__React.useState(true);
    var loaded = window.__React.useRef(false);
    window.__React.useEffect(function() {
      if (loaded.current) return;
      loaded.current = true;
      transport.detail(task.key).then(function(data) {
        detail[1](data);
        loading[1](false);
      }).catch(function() {
        loading[1](false);
      });
    }, [task.key]);
    var d = detail[0] && detail[0].task ? detail[0].task : task;
    var cfg = STATUS_CONFIG2[d.status] || { label: d.status, color: "#6b7280" };
    function doAction(kind, key) {
      controller.doAction(kind, key);
      props.onClose();
    }
    return window.__React.createElement(
      "div",
      {
        className: "aq-d-overlay",
        onClick: function(e) {
          if (e.target === e.currentTarget) props.onClose();
        }
      },
      window.__React.createElement(
        "div",
        { className: "aq-d-panel" },
        window.__React.createElement(
          "div",
          { className: "aq-d-hd" },
          window.__React.createElement("h3", null, d.key),
          window.__React.createElement("button", { className: "aq-d-close", onClick: props.onClose }, "\xD7")
        ),
        window.__React.createElement(
          "div",
          { className: "aq-d-body" },
          window.__React.createElement(
            "div",
            { className: "aq-d-section" },
            window.__React.createElement("div", { className: "aq-d-section-title" }, "\u57FA\u672C\u4FE1\u606F"),
            window.__React.createElement(
              "div",
              { className: "aq-d-grid" },
              window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "\u72B6\u6001: "), window.__React.createElement("span", { className: "dv", style: { color: cfg.color } }, cfg.label)),
              window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "\u4F18\u5148\u7EA7: "), window.__React.createElement("span", { className: "dv" }, String(d.priority || 5))),
              d.attempts > 0 && window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "\u5C1D\u8BD5\u6B21\u6570: "), window.__React.createElement("span", { className: "dv" }, String(d.attempts))),
              d.blockedResumes > 0 && window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "\u53CD\u963B\u585E: "), window.__React.createElement("span", { className: "dv" }, String(d.blockedResumes))),
              d.cron && window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "cron: "), window.__React.createElement("span", { className: "dv" }, cronToHuman(d.cron))),
              d.schedule && window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "\u5B9A\u65F6: "), window.__React.createElement("span", { className: "dv" }, formatIso(d.schedule))),
              d.deadline && window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "\u622A\u6B62: "), window.__React.createElement("span", { className: "dv" }, cronToHuman(d.deadline))),
              d.nextRunAt && window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "\u4E0B\u6B21\u6267\u884C: "), window.__React.createElement("span", { className: "dv" }, formatIso(d.nextRunAt))),
              d.workspace && window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "\u5DE5\u4F5C\u533A: "), window.__React.createElement("span", { className: "dv" }, String(d.workspace).slice(0, 12))),
              d.agentPreset && window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "Agent: "), window.__React.createElement("span", { className: "dv" }, d.agentPreset)),
              d.maxGoalRounds && window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "\u6700\u5927\u8F6E\u6570: "), window.__React.createElement("span", { className: "dv" }, String(d.maxGoalRounds))),
              d.createdAt && window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "\u521B\u5EFA: "), window.__React.createElement("span", { className: "dv" }, formatIso(d.createdAt))),
              d.updatedAt && window.__React.createElement("div", { className: "aq-d-item" }, window.__React.createElement("span", { className: "dl" }, "\u66F4\u65B0: "), window.__React.createElement("span", { className: "dv" }, formatIso(d.updatedAt)))
            )
          ),
          d.body && window.__React.createElement(
            "div",
            { className: "aq-d-section" },
            window.__React.createElement("div", { className: "aq-d-section-title" }, "\u4EFB\u52A1\u5185\u5BB9"),
            window.__React.createElement("div", { className: "aq-d-report" }, window.__React.createElement("pre", null, d.body))
          ),
          loading[0] && window.__React.createElement("div", { style: { textAlign: "center", padding: "20px", color: "#9ca3af" } }, "\u52A0\u8F7D\u4E2D..."),
          detail[0] && detail[0].task && detail[0].task.reports && (detail[0].task.reports.goal || detail[0].task.reports.result || detail[0].task.reports.report) && window.__React.createElement(
            "div",
            { className: "aq-d-section" },
            window.__React.createElement("div", { className: "aq-d-section-title" }, "\u6267\u884C\u62A5\u544A"),
            detail[0].task.reports.goal && window.__React.createElement("div", { className: "aq-d-report", style: { marginBottom: "8px" } }, window.__React.createElement("pre", null, detail[0].task.reports.goal)),
            detail[0].task.reports.result && window.__React.createElement("div", { className: "aq-d-report", style: { marginBottom: "8px" } }, window.__React.createElement("pre", null, detail[0].task.reports.result)),
            detail[0].task.reports.report && window.__React.createElement("div", { className: "aq-d-report" }, window.__React.createElement("pre", null, detail[0].task.reports.report))
          ),
          d.executions && d.executions.length > 0 && window.__React.createElement(
            "div",
            { className: "aq-d-section" },
            window.__React.createElement("div", { className: "aq-d-section-title" }, "\u6267\u884C\u8BB0\u5F55"),
            window.__React.createElement(
              "table",
              { className: "aq-d-exec-table" },
              window.__React.createElement(
                "thead",
                null,
                window.__React.createElement(
                  "tr",
                  null,
                  window.__React.createElement("th", null, "#"),
                  window.__React.createElement("th", null, "\u72B6\u6001"),
                  window.__React.createElement("th", null, "\u5F00\u59CB"),
                  window.__React.createElement("th", null, "\u7ED3\u675F"),
                  window.__React.createElement("th", null, "\u9519\u8BEF")
                )
              ),
              window.__React.createElement(
                "tbody",
                null,
                d.executions.map(function(ex, i) {
                  return window.__React.createElement(
                    "tr",
                    { key: i },
                    window.__React.createElement("td", null, String(ex.attempt || i + 1)),
                    window.__React.createElement("td", null, (STATUS_CONFIG2[ex.result] || {}).label || ex.result || "-"),
                    window.__React.createElement("td", null, ex.startedAt ? formatIso(ex.startedAt) : "-"),
                    window.__React.createElement("td", null, ex.endedAt ? formatIso(ex.endedAt) : "-"),
                    window.__React.createElement("td", null, ex.error ? String(ex.error).slice(0, 60) : "-")
                  );
                })
              )
            )
          )
        ),
        window.__React.createElement(
          "div",
          { className: "aq-d-actions" },
          window.__React.createElement("button", { className: "aq-btn", onClick: props.onClose }, "\u5173\u95ED"),
          d.status === "running" && window.__React.createElement("button", { className: "aq-btn danger", onClick: function() {
            doAction("stop", d.key);
          } }, "\u505C\u6B62"),
          (d.status === "failed" || d.status === "stopped") && window.__React.createElement("button", { className: "aq-btn success", onClick: function() {
            doAction("rerun", d.key);
          } }, "\u91CD\u65B0\u6267\u884C"),
          d.status !== "running" && !d.archivedAt && window.__React.createElement("button", { className: "aq-btn warn", onClick: function() {
            doAction("archive", d.key);
          } }, "\u5F52\u6863"),
          d.archivedAt && window.__React.createElement("button", { className: "aq-btn", onClick: function() {
            doAction("restore", d.key);
          } }, "\u8FD8\u539F"),
          d.sessionId && window.__React.createElement("button", { className: "aq-btn", onClick: function() {
            props.onClose();
            controller.closeBoard();
          }, dangerouslySetInnerHTML: { __html: iconHtml("external") + " \u8DF3\u8F6C\u4F1A\u8BDD" } })
        )
      )
    );
  }

  // client/src/components/Modals.jsx
  function NewTaskModal(props) {
    var options = props.options || {};
    var key = window.__React.useState("");
    var content = window.__React.useState("");
    var priority = window.__React.useState("5");
    var cron = window.__React.useState("");
    var schedule = window.__React.useState("");
    var deadline = window.__React.useState("");
    var maxGoalRounds = window.__React.useState("");
    var maxBlockedResumes = window.__React.useState("");
    var workspace = window.__React.useState("");
    var agentPreset = window.__React.useState("");
    var model = window.__React.useState("");
    var autoArchive = window.__React.useState(false);
    var enableNotifications = window.__React.useState(true);
    var error = window.__React.useState("");
    var submitting = window.__React.useState(false);
    function handleSubmit(e) {
      e.preventDefault();
      if (!key[0].trim() || !content[0].trim()) {
        error[1]("\u8BF7\u586B\u5199\u4EFB\u52A1\u6807\u8BC6\u548C\u5185\u5BB9");
        return;
      }
      submitting[1](true);
      error[1]("");
      var data = { key: key[0].trim(), content: content[0].trim(), priority: parseInt(priority[0], 10) || 5 };
      if (cron[0].trim()) data.cron = cron[0].trim();
      if (schedule[0].trim()) data.schedule = new Date(schedule[0].trim()).toISOString();
      if (deadline[0].trim()) data.deadline = deadline[0].trim();
      if (maxGoalRounds[0]) data.maxGoalRounds = parseInt(maxGoalRounds[0], 10);
      if (maxBlockedResumes[0]) data.maxBlockedResumes = parseInt(maxBlockedResumes[0], 10);
      if (workspace[0]) data.workspace = workspace[0];
      if (agentPreset[0]) data.agentPreset = agentPreset[0];
      if (model[0]) data.model = model[0];
      if (autoArchive[0]) data.autoArchive = true;
      if (!enableNotifications[0]) data.enableNotifications = false;
      props.onCreate(data).catch(function(err) {
        error[1](err.message);
      }).finally(function() {
        submitting[1](false);
      });
    }
    return window.__React.createElement(
      "div",
      { className: "aq-m-overlay", onClick: function(e) {
        if (e.target === e.currentTarget) props.onClose();
      } },
      window.__React.createElement(
        "div",
        { className: "aq-modal" },
        window.__React.createElement("h3", null, "\u65B0\u5EFA\u4EFB\u52A1"),
        error[0] && window.__React.createElement("div", { style: { color: "#ef4444", fontSize: "13px", marginBottom: "8px" } }, error[0]),
        window.__React.createElement("label", null, "\u4EFB\u52A1\u6807\u8BC6 (key)*"),
        window.__React.createElement("input", { value: key[0], onChange: function(e) {
          key[1](e.target.value);
        }, placeholder: "\u4F8B\u5982: daily-report" }),
        window.__React.createElement("label", null, "\u4EFB\u52A1\u5185\u5BB9 (Markdown)*"),
        window.__React.createElement("textarea", { value: content[0], onChange: function(e) {
          content[1](e.target.value);
        }, placeholder: "# \u4EFB\u52A1\u6807\u9898\n\n\u4EFB\u52A1\u63CF\u8FF0..." }),
        window.__React.createElement(
          "div",
          { className: "aq-row" },
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u4F18\u5148\u7EA7 (1-10)"),
            window.__React.createElement("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function(e) {
              priority[1](e.target.value);
            } })
          ),
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u6700\u5927\u8F6E\u6570"),
            window.__React.createElement("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function(e) {
              maxGoalRounds[1](e.target.value);
            }, placeholder: "\u9ED8\u8BA4 40" })
          ),
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u6700\u5927\u53CD\u963B\u585E"),
            window.__React.createElement("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function(e) {
              maxBlockedResumes[1](e.target.value);
            }, placeholder: "\u9ED8\u8BA4 3" })
          )
        ),
        window.__React.createElement(CronField, { label: "\u5FAA\u73AF\u8C03\u5EA6 (cron)", value: cron[0], onChange: function(v) {
          cron[1](v);
        }, presets: CRON_PRESETS, placeholder: "0 8 * * *" }),
        window.__React.createElement("label", { style: { marginTop: "8px" } }, "\u4E00\u6B21\u6027\u5B9A\u65F6"),
        window.__React.createElement("input", { type: "datetime-local", value: schedule[0], onChange: function(e) {
          schedule[1](e.target.value);
        } }),
        window.__React.createElement(CronField, { label: "\u622A\u6B62\u65F6\u95F4 (deadline)", value: deadline[0], onChange: function(v) {
          deadline[1](v);
        }, presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" }),
        window.__React.createElement(
          "div",
          { className: "aq-row" },
          options.workspaces && options.workspaces.length > 0 && window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u5DE5\u4F5C\u533A"),
            window.__React.createElement(
              "select",
              { value: workspace[0], onChange: function(e) {
                workspace[1](e.target.value);
              } },
              window.__React.createElement("option", { value: "" }, "\u81EA\u52A8\u521B\u5EFA"),
              options.workspaces.map(function(ws) {
                return window.__React.createElement("option", { key: ws.workspaceId, value: ws.workspaceId }, ws.title || ws.path);
              })
            )
          ),
          options.presets && options.presets.length > 0 && window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "Agent \u9884\u8BBE"),
            window.__React.createElement(
              "select",
              { value: agentPreset[0], onChange: function(e) {
                agentPreset[1](e.target.value);
              } },
              window.__React.createElement("option", { value: "" }, "\u9ED8\u8BA4"),
              options.presets.map(function(p) {
                return window.__React.createElement("option", { key: p.id, value: p.id }, p.name || p.id);
              })
            )
          )
        ),
        window.__React.createElement(
          "div",
          { className: "aq-row" },
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u6A21\u578B"),
            window.__React.createElement(
              "select",
              { value: model[0], onChange: function(e) {
                model[1](e.target.value);
              } },
              window.__React.createElement("option", { value: "" }, "\u9ED8\u8BA4"),
              (options.models || []).map(function(m) {
                return window.__React.createElement("option", { key: m, value: m }, m);
              })
            )
          )
        ),
        window.__React.createElement(
          "label",
          { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" } },
          window.__React.createElement("input", { type: "checkbox", checked: autoArchive[0], onChange: function(e) {
            autoArchive[1](e.target.checked);
          }, style: { width: "auto", margin: 0 } }),
          "\u5B8C\u6210\u540E\u81EA\u52A8\u5F52\u6863"
        ),
        window.__React.createElement(
          "div",
          { className: "aq-modal-actions" },
          window.__React.createElement("button", { className: "aq-btn", onClick: props.onClose }, "\u53D6\u6D88"),
          window.__React.createElement("button", { className: "aq-btn primary", onClick: handleSubmit, disabled: submitting[0] }, submitting[0] ? "\u63D0\u4EA4\u4E2D..." : "\u521B\u5EFA")
        )
      )
    );
  }
  function EditTaskModal(props) {
    var task = props.task;
    var content = window.__React.useState(task.body || "");
    var cron = window.__React.useState(task.cron || "");
    var deadline = window.__React.useState(task.deadline || "");
    var schedule = window.__React.useState(task.schedule ? localDatetimeString(task.schedule) : "");
    var priority = window.__React.useState(String(task.priority || 5));
    var autoArchive = window.__React.useState(!!task.autoArchive);
    var enableNotifications = window.__React.useState(task.enableNotifications !== false);
    var maxGoalRounds = window.__React.useState(task.maxGoalRounds ? String(task.maxGoalRounds) : "");
    var maxBlockedResumes = window.__React.useState(task.maxBlockedResumes ? String(task.maxBlockedResumes) : "");
    var error = window.__React.useState("");
    var submitting = window.__React.useState(false);
    function handleSubmit(e) {
      e.preventDefault();
      submitting[1](true);
      error[1]("");
      var patch = {};
      if (content[0] !== (task.body || "")) patch.content = content[0];
      if (cron[0] !== (task.cron || "")) patch.cron = cron[0];
      var scheduleIso = schedule[0] ? new Date(schedule[0]).toISOString() : "";
      if (scheduleIso !== (task.schedule || "")) patch.schedule = scheduleIso;
      if (deadline[0] !== (task.deadline || "")) patch.deadline = deadline[0];
      if (priority[0] !== String(task.priority || 5)) patch.priority = parseInt(priority[0], 10);
      if (autoArchive[0] !== !!task.autoArchive) patch.autoArchive = autoArchive[0];
      if (enableNotifications[0] !== (task.enableNotifications !== false)) patch.enableNotifications = enableNotifications[0];
      if (maxGoalRounds[0] !== (task.maxGoalRounds ? String(task.maxGoalRounds) : "")) patch.maxGoalRounds = maxGoalRounds[0] ? parseInt(maxGoalRounds[0], 10) : void 0;
      if (maxBlockedResumes[0] !== (task.maxBlockedResumes ? String(task.maxBlockedResumes) : "")) patch.maxBlockedResumes = maxBlockedResumes[0] ? parseInt(maxBlockedResumes[0], 10) : void 0;
      if (Object.keys(patch).length === 0) {
        props.onClose();
        return;
      }
      props.onUpdate(task.key, patch).catch(function(err) {
        error[1](err.message);
      }).finally(function() {
        submitting[1](false);
      });
    }
    return window.__React.createElement(
      "div",
      { className: "aq-m-overlay", onClick: function(e) {
        if (e.target === e.currentTarget) props.onClose();
      } },
      window.__React.createElement(
        "div",
        { className: "aq-modal" },
        window.__React.createElement("h3", null, "\u7F16\u8F91\u4EFB\u52A1: " + task.key),
        error[0] && window.__React.createElement("div", { style: { color: "#ef4444", fontSize: "13px", marginBottom: "8px" } }, error[0]),
        window.__React.createElement("label", null, "\u4EFB\u52A1\u5185\u5BB9 (Markdown)"),
        window.__React.createElement("textarea", { value: content[0], onChange: function(e) {
          content[1](e.target.value);
        }, style: { minHeight: "150px" } }),
        window.__React.createElement(
          "div",
          { className: "aq-row" },
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u4F18\u5148\u7EA7 (1-10)"),
            window.__React.createElement("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function(e) {
              priority[1](e.target.value);
            } })
          ),
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u6700\u5927\u8F6E\u6570"),
            window.__React.createElement("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function(e) {
              maxGoalRounds[1](e.target.value);
            }, placeholder: "\u9ED8\u8BA4 40" })
          ),
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u6700\u5927\u53CD\u963B\u585E"),
            window.__React.createElement("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function(e) {
              maxBlockedResumes[1](e.target.value);
            }, placeholder: "\u9ED8\u8BA4 3" })
          )
        ),
        window.__React.createElement(CronField, { label: "\u5FAA\u73AF\u8C03\u5EA6 (cron)", value: cron[0], onChange: function(v) {
          cron[1](v);
        }, presets: CRON_PRESETS, placeholder: "0 8 * * *" }),
        window.__React.createElement("label", { style: { marginTop: "8px" } }, "\u4E00\u6B21\u6027\u5B9A\u65F6"),
        window.__React.createElement("input", { type: "datetime-local", value: schedule[0], onChange: function(e) {
          schedule[1](e.target.value);
        } }),
        window.__React.createElement(CronField, { label: "\u622A\u6B62\u65F6\u95F4 (deadline)", value: deadline[0], onChange: function(v) {
          deadline[1](v);
        }, presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" }),
        window.__React.createElement(
          "label",
          { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" } },
          window.__React.createElement("input", { type: "checkbox", checked: autoArchive[0], onChange: function(e) {
            autoArchive[1](e.target.checked);
          }, style: { width: "auto", margin: 0 } }),
          "\u5B8C\u6210\u540E\u81EA\u52A8\u5F52\u6863"
        ),
        window.__React.createElement(
          "label",
          { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" } },
          window.__React.createElement("input", { type: "checkbox", checked: enableNotifications[0], onChange: function(e) {
            enableNotifications[1](e.target.checked);
          }, style: { width: "auto", margin: 0 } }),
          "\u4EFB\u52A1\u5B8C\u6210\u65F6\u901A\u77E5"
        ),
        window.__React.createElement(
          "div",
          { className: "aq-modal-actions" },
          window.__React.createElement("button", { className: "aq-btn", onClick: props.onClose }, "\u53D6\u6D88"),
          window.__React.createElement("button", { className: "aq-btn primary", onClick: handleSubmit, disabled: submitting[0] }, submitting[0] ? "\u63D0\u4EA4\u4E2D..." : "\u4FDD\u5B58")
        )
      )
    );
  }
  function ConfigPanel(props) {
    var config = props.config || {};
    var options = props.options || {};
    var maxConcurrent = window.__React.useState(String(config.maxConcurrent || 2));
    var maxGoalRounds = window.__React.useState(String(config.maxGoalRounds || 60));
    var maxBlockedResumes = window.__React.useState(String(config.maxBlockedResumes || 3));
    var autoArchive = window.__React.useState(!!config.autoArchive);
    var unknownThreshold = window.__React.useState(String(config.unknownThreshold || 3));
    var taskTimeoutMin = window.__React.useState(String(Math.round((config.taskTimeoutMs || 108e5) / 6e4)));
    var maxAttempts = window.__React.useState(String(config.maxAttempts || 3));
    var defaultDeadline = window.__React.useState(config.defaultDeadline || "");
    var queueDir = window.__React.useState(config.queueDir || "");
    var enableNotifications = window.__React.useState(config.enableNotifications !== false);
    var webhook = window.__React.useState(config.webhook || "");
    var workspace = window.__React.useState(config.workspace || "");
    var agentPreset = window.__React.useState(config.agentPreset || "");
    var model = window.__React.useState(config.model || "");
    var priority = window.__React.useState(String(config.priority || 5));
    function handleSave() {
      var patch = {};
      patch.maxGoalRounds = parseInt(maxGoalRounds[0], 10);
      patch.maxBlockedResumes = parseInt(maxBlockedResumes[0], 10);
      patch.autoArchive = autoArchive[0];
      patch.unknownThreshold = parseInt(unknownThreshold[0], 10);
      patch.taskTimeoutMs = parseInt(taskTimeoutMin[0], 10) * 6e4;
      patch.maxAttempts = parseInt(maxAttempts[0], 10);
      patch.defaultDeadline = defaultDeadline[0] || null;
      patch.webhook = webhook[0] || null;
      patch.workspace = workspace[0] || null;
      patch.queueDir = queueDir[0] || null;
      patch.enableNotifications = enableNotifications[0];
      patch.agentPreset = agentPreset[0] || null;
      patch.model = model[0] || null;
      patch.priority = parseInt(priority[0], 10) || 5;
      var newMc = parseInt(maxConcurrent[0], 10);
      if (newMc !== (config.maxConcurrent || 2)) props.onSetConcurrency(newMc);
      props.onUpdate(patch);
      props.onClose();
    }
    var tip = function(text) {
      return window.__React.createElement("span", { className: "aq-tip", title: text }, "\u24D8");
    };
    return window.__React.createElement(
      "div",
      { className: "aq-m-overlay", onClick: function(e) {
        if (e.target === e.currentTarget) props.onClose();
      } },
      window.__React.createElement(
        "div",
        { className: "aq-modal wide" },
        window.__React.createElement("h3", null, "\u8FD0\u884C\u65F6\u914D\u7F6E"),
        window.__React.createElement(
          "div",
          { className: "aq-row" },
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u6700\u5927\u5E76\u53D1\u6570 (1-8)", tip("\u540C\u65F6\u8FD0\u884C\u7684\u6700\u5927\u4EFB\u52A1\u6570")),
            window.__React.createElement("input", { type: "number", min: "1", max: "8", value: maxConcurrent[0], onChange: function(e) {
              maxConcurrent[1](e.target.value);
            } })
          ),
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u6700\u5927\u91CD\u8BD5 (1-10)", tip("\u4EFB\u52A1\u6D3E\u53D1\u5931\u8D25\u540E\u7684\u6700\u5927\u91CD\u8BD5\u6B21\u6570")),
            window.__React.createElement("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function(e) {
              maxAttempts[1](e.target.value);
            } })
          )
        ),
        window.__React.createElement(
          "div",
          { className: "aq-row" },
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u6700\u5927 goal \u8F6E\u6570 (1-100)", tip("\u5355\u4E2A\u4EFB\u52A1\u81EA\u52A8\u7EED\u8DD1\u7684\u6700\u5927\u8F6E\u6570")),
            window.__React.createElement("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function(e) {
              maxGoalRounds[1](e.target.value);
            } })
          ),
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u6700\u5927\u53CD\u963B\u585E (0-10)", tip("\u4EFB\u52A1\u5361\u4F4F\u65F6\u81EA\u52A8\u6062\u590D\u7684\u6700\u5927\u6B21\u6570")),
            window.__React.createElement("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function(e) {
              maxBlockedResumes[1](e.target.value);
            } })
          )
        ),
        window.__React.createElement(
          "div",
          { className: "aq-row" },
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u4E0D\u53EF\u8FBE\u9608\u503C (1-10)", tip("\u8FDE\u7EED\u8F6E\u8BE2\u5931\u8D25\u540E\u5224\u5B9A\u4EFB\u52A1\u4E0D\u53EF\u8FBE")),
            window.__React.createElement("input", { type: "number", min: "1", max: "10", value: unknownThreshold[0], onChange: function(e) {
              unknownThreshold[1](e.target.value);
            } })
          ),
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u4EFB\u52A1\u8D85\u65F6 (\u5206\u949F)", tip("\u5355\u4E2A\u4EFB\u52A1\u7684\u6700\u5927\u6267\u884C\u65F6\u95F4")),
            window.__React.createElement("input", { type: "number", min: "10", max: "1440", value: taskTimeoutMin[0], onChange: function(e) {
              taskTimeoutMin[1](e.target.value);
            } })
          )
        ),
        window.__React.createElement(
          "div",
          { className: "aq-row" },
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u9ED8\u8BA4\u4F18\u5148\u7EA7 (1-10)"),
            window.__React.createElement("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function(e) {
              priority[1](e.target.value);
            } })
          ),
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u9ED8\u8BA4\u622A\u6B62\u65F6\u95F4"),
            window.__React.createElement("input", { value: defaultDeadline[0], onChange: function(e) {
              defaultDeadline[1](e.target.value);
            }, placeholder: "0 21 * * *" })
          )
        ),
        window.__React.createElement(
          "div",
          { className: "aq-row" },
          window.__React.createElement(
            "div",
            { style: { display: "flex", gap: "16px", alignItems: "center", paddingTop: "10px" } },
            window.__React.createElement(
              "label",
              { style: { display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", margin: 0, fontSize: "13px" } },
              window.__React.createElement("input", { type: "checkbox", checked: autoArchive[0], onChange: function(e) {
                autoArchive[1](e.target.checked);
              }, style: { width: "auto", margin: 0 } }),
              "\u81EA\u52A8\u5F52\u6863"
            ),
            window.__React.createElement(
              "label",
              { style: { display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", margin: 0, fontSize: "13px" } },
              window.__React.createElement("input", { type: "checkbox", checked: enableNotifications[0], onChange: function(e) {
                enableNotifications[1](e.target.checked);
              }, style: { width: "auto", margin: 0 } }),
              "\u4EFB\u52A1\u901A\u77E5"
            )
          )
        ),
        window.__React.createElement("label", null, "Webhook URL", tip("\u4EFB\u52A1\u5B8C\u6210\u65F6\u56DE\u8C03\u7684 URL")),
        window.__React.createElement("input", { value: webhook[0], onChange: function(e) {
          webhook[1](e.target.value);
        }, placeholder: "https://example.com/webhook" }),
        window.__React.createElement(
          "div",
          { className: "aq-row" },
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u6536\u4EF6\u7BB1\u76EE\u5F55"),
            window.__React.createElement("input", { value: queueDir[0], onChange: function(e) {
              queueDir[1](e.target.value);
            }, placeholder: "\u9ED8\u8BA4 ~/.dsh/queue/tasks" })
          ),
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u9ED8\u8BA4 Agent \u9884\u8BBE"),
            options.presets && options.presets.length > 0 ? window.__React.createElement(
              "select",
              { value: agentPreset[0], onChange: function(e) {
                agentPreset[1](e.target.value);
              } },
              window.__React.createElement("option", { value: "" }, "\u81EA\u52A8\u5224\u5B9A"),
              options.presets.map(function(p) {
                return window.__React.createElement("option", { key: p.id, value: p.id }, p.name || p.id);
              })
            ) : window.__React.createElement("input", { value: agentPreset[0], onChange: function(e) {
              agentPreset[1](e.target.value);
            }, placeholder: "\u4E0D\u8BBE\u7F6E\u5219\u81EA\u52A8\u5224\u5B9A" })
          )
        ),
        window.__React.createElement(
          "div",
          { className: "aq-row" },
          window.__React.createElement(
            "div",
            null,
            window.__React.createElement("label", null, "\u9ED8\u8BA4\u6A21\u578B"),
            window.__React.createElement(
              "select",
              { value: model[0], onChange: function(e) {
                model[1](e.target.value);
              } },
              window.__React.createElement("option", { value: "" }, "\u9ED8\u8BA4\uFF08\u5F53\u524D\u4F1A\u8BDD\u6A21\u578B\uFF09"),
              (options.models || []).map(function(m) {
                return window.__React.createElement("option", { key: m, value: m }, m);
              })
            )
          )
        ),
        window.__React.createElement(
          "div",
          { className: "aq-modal-actions" },
          window.__React.createElement("button", { className: "aq-btn", onClick: props.onClose }, "\u53D6\u6D88"),
          window.__React.createElement("button", { className: "aq-btn primary", onClick: handleSave }, "\u4FDD\u5B58")
        )
      )
    );
  }
  function ConfirmModal(props) {
    return window.__React.createElement(
      "div",
      { className: "aq-m-overlay", onClick: function(e) {
        if (e.target === e.currentTarget) props.onCancel();
      } },
      window.__React.createElement(
        "div",
        { className: "aq-modal", style: { width: "380px" } },
        window.__React.createElement("div", { style: { fontSize: "14px", marginBottom: "16px", lineHeight: "1.6" } }, props.message),
        window.__React.createElement(
          "div",
          { className: "aq-modal-actions" },
          window.__React.createElement("button", { className: "aq-btn", onClick: props.onCancel }, "\u53D6\u6D88"),
          window.__React.createElement("button", { className: "aq-btn danger", onClick: props.onConfirm }, "\u786E\u8BA4")
        )
      )
    );
  }
  function CronField(props) {
    var selectVal = window.__React.useState(function() {
      var matched = (props.presets || []).find(function(p) {
        return p.value === props.value && p.value !== "" && p.value !== "__custom__";
      });
      return matched ? matched.value : props.value ? "__custom__" : "";
    });
    var isCustom = selectVal[0] === "__custom__";
    return window.__React.createElement(
      "div",
      null,
      window.__React.createElement("label", null, props.label, props.tip ? window.__React.createElement("span", { className: "aq-tip", title: props.tip }, "\u24D8") : null),
      window.__React.createElement(
        "div",
        { style: { display: "flex", gap: "8px", alignItems: "stretch", minWidth: 0 } },
        window.__React.createElement(
          "select",
          {
            value: selectVal[0],
            onChange: function(e) {
              var v = e.target.value;
              selectVal[1](v);
              if (v === "__custom__") return;
              props.onChange(v);
            },
            style: { width: "50%", flexShrink: 0 }
          },
          (props.presets || []).map(function(p) {
            return window.__React.createElement("option", { key: p.value, value: p.value }, p.label);
          })
        ),
        window.__React.createElement("input", {
          value: selectVal[0] === "" ? "" : props.value,
          onChange: function(e) {
            props.onChange(e.target.value);
          },
          placeholder: props.placeholder || "\u81EA\u5B9A\u4E49 cron \u8868\u8FBE\u5F0F",
          style: { flex: 1, minWidth: 0 },
          disabled: !isCustom && selectVal[0] !== ""
        })
      )
    );
  }

  // client/src/components/Workstation.jsx
  function Workstation(props) {
    var controller = props.controller;
    var transport = props.transport;
    var sessions = props.sessions;
    var state = window.__React.useState(function() {
      return controller.getSnapshot();
    });
    var setState = state[1];
    window.__React.useEffect(function() {
      return controller.subscribe(function() {
        setState(controller.getSnapshot());
      });
    }, []);
    var snap = state[0];
    var confirm = window.__React.useState(null);
    var msg = window.__React.useState(null);
    function handleAction(kind, key) {
      if (kind === "delete") {
        confirm[1]({ message: "\u786E\u8BA4\u5220\u9664\u4EFB\u52A1\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002", onConfirm: function() {
          controller.doAction(kind, key);
          confirm[1](null);
        } });
      } else if (kind === "stop") {
        confirm[1]({ message: "\u786E\u8BA4\u505C\u6B62\u8FD0\u884C\u4E2D\u7684\u4EFB\u52A1\uFF1F", onConfirm: function() {
          controller.doAction(kind, key);
          confirm[1](null);
        } });
      } else if (kind === "force-scan") {
        controller.doAction(kind, key);
        msg[1]("\u6B63\u5728\u626B\u63CF\u6536\u4EF6\u7BB1...");
        setTimeout(function() {
          msg[1](null);
        }, 2500);
      } else {
        controller.doAction(kind, key);
      }
    }
    return window.__React.createElement(
      "div",
      { "data-dsh-autoqueue-view": "" },
      window.__React.createElement(
        "div",
        { className: "aq-ws" },
        window.__React.createElement(Sidebar, { snap, controller }),
        window.__React.createElement(
          "div",
          { className: "aq-main" },
          window.__React.createElement(Toolbar, { snap, controller, msg: msg[0] }),
          window.__React.createElement(ErrorBanner, { error: snap.error || snap.transportError, onDismiss: function() {
            controller.clearError();
          } }),
          window.__React.createElement(KpiRow, { metrics: snap.metrics }),
          window.__React.createElement(StatusTabs, { counts: snap.counts, filter: snap.filter, onFilter: function(f) {
            controller.setFilter(f);
          } }),
          window.__React.createElement(TaskList, { snap, controller, sessions, onAction: handleAction })
        )
      ),
      snap.showDetail && snap.detailTask && window.__React.createElement(TaskDetailPanel, { task: snap.detailTask, transport, controller, onClose: function() {
        controller.closeDetail();
      } }),
      snap.showNewTask && window.__React.createElement(NewTaskModal, { options: snap.options, onClose: function() {
        controller.closeNewTask();
      }, onCreate: function(data) {
        controller.createTask(data);
      } }),
      snap.showEdit && snap.editTask && window.__React.createElement(EditTaskModal, { task: snap.editTask, onClose: function() {
        controller.closeEdit();
      }, onUpdate: function(key, patch) {
        controller.updateTask(key, patch);
      } }),
      snap.showConfig && window.__React.createElement(ConfigPanel, { config: snap.config, options: snap.options, onClose: function() {
        controller.closeConfig();
      }, onUpdate: function(patch) {
        controller.updateConfig(patch);
      }, onSetConcurrency: function(n) {
        controller.setConcurrency(n);
      } }),
      confirm[0] && window.__React.createElement(ConfirmModal, { message: confirm[0].message, onConfirm: confirm[0].onConfirm, onCancel: function() {
        confirm[1](null);
      } })
    );
  }
  function Sidebar(props) {
    var snap = props.snap;
    var ctrl = props.controller;
    var navItems = [
      { key: "all", label: "\u5168\u90E8\u4EFB\u52A1", icon: "list", count: snap.tasks.filter(function(t) {
        return !t.archivedAt;
      }).length },
      { key: "active", label: "\u6D3B\u8DC3\u4EFB\u52A1", icon: "play", count: (snap.counts.pending || 0) + (snap.counts.running || 0) },
      { key: "cron", label: "\u5FAA\u73AF\u8C03\u5EA6", icon: "repeat", count: snap.tasks.filter(function(t) {
        return t.taskType === "cron" && !t.archivedAt;
      }).length },
      { key: "schedule", label: "\u5B9A\u65F6\u6267\u884C", icon: "clock", count: snap.tasks.filter(function(t) {
        return t.taskType === "schedule" && !t.archivedAt;
      }).length },
      { key: "manual", label: "\u624B\u52A8\u89E6\u53D1", icon: "play", count: snap.tasks.filter(function(t) {
        return t.taskType === "manual" && !t.archivedAt;
      }).length },
      { key: "archived", label: "\u5DF2\u5F52\u6863", icon: "archive", count: snap.tasks.filter(function(t) {
        return !!t.archivedAt;
      }).length }
    ];
    return window.__React.createElement(
      "div",
      { className: "aq-sb" },
      window.__React.createElement("div", { className: "aq-sb-hd", dangerouslySetInnerHTML: { __html: iconHtml("inbox") + " \u4EFB\u52A1\u5DE5\u4F5C\u53F0" } }),
      navItems.map(function(item) {
        return window.__React.createElement(
          "button",
          {
            key: item.key,
            className: "aq-nav-item" + (snap.navGroup === item.key ? " sel" : ""),
            onClick: function() {
              ctrl.setNavGroup(item.key);
              ctrl.setFilter("all");
            }
          },
          window.__React.createElement("span", { className: "aq-nav-svg", dangerouslySetInnerHTML: { __html: iconHtml(item.icon) } }),
          item.label,
          window.__React.createElement("span", { className: "aq-nav-badge" }, item.count)
        );
      })
    );
  }
  function Toolbar(props) {
    var snap = props.snap;
    var ctrl = props.controller;
    var navLabels = {
      all: "\u5168\u90E8\u4EFB\u52A1",
      active: "\u6D3B\u8DC3\u4EFB\u52A1",
      cron: "\u5FAA\u73AF\u8C03\u5EA6",
      schedule: "\u5B9A\u65F6\u6267\u884C",
      manual: "\u624B\u52A8\u89E6\u53D1",
      archived: "\u5DF2\u5F52\u6863"
    };
    var title = navLabels[snap.navGroup] || "\u4EFB\u52A1\u5DE5\u4F5C\u53F0";
    return window.__React.createElement(
      "div",
      { className: "aq-tbar" },
      window.__React.createElement("button", { className: "aq-btn", onClick: function() {
        ctrl.closeBoard();
      }, style: { fontSize: "16px", padding: "2px 8px", minWidth: "28px" }, dangerouslySetInnerHTML: { __html: "\u2039" }, title: "\u5173\u95ED\u5DE5\u4F5C\u53F0" }),
      window.__React.createElement("span", { className: "aq-tbar-title" }, title),
      props.msg && window.__React.createElement("span", { className: "aq-toast" }, props.msg),
      window.__React.createElement("button", { className: "aq-btn", onClick: function() {
        ctrl.doAction("force-scan");
      }, dangerouslySetInnerHTML: { __html: iconHtml("scan") + " \u7ACB\u5373\u626B\u63CF" } }),
      window.__React.createElement("button", { className: "aq-btn", onClick: function() {
        ctrl.openConfig();
      }, dangerouslySetInnerHTML: { __html: iconHtml("gear") + " \u914D\u7F6E" } }),
      window.__React.createElement("button", { className: "aq-btn primary", onClick: function() {
        ctrl.openNewTask();
      }, dangerouslySetInnerHTML: { __html: iconHtml("plus") + " \u65B0\u5EFA" } })
    );
  }
  function ErrorBanner(props) {
    if (!props.error) return null;
    return window.__React.createElement(
      "div",
      { className: "aq-err" },
      window.__React.createElement("span", null, props.error),
      window.__React.createElement("span", { className: "aq-err-dismiss", onClick: props.onDismiss, title: "\u5173\u95ED" }, "\xD7")
    );
  }
  function KpiRow(props) {
    var m = props.metrics || {};
    return window.__React.createElement(
      "div",
      { className: "aq-kpi" },
      window.__React.createElement("div", { className: "aq-kpi-card i" }, window.__React.createElement("div", { className: "v" }, m.total || 0), window.__React.createElement("div", { className: "l" }, "\u4EFB\u52A1\u603B\u6570")),
      window.__React.createElement("div", { className: "aq-kpi-card" }, window.__React.createElement("div", { className: "v" }, m.running || 0), window.__React.createElement("div", { className: "l" }, "\u6267\u884C\u4E2D")),
      window.__React.createElement("div", { className: "aq-kpi-card" }, window.__React.createElement("div", { className: "v" }, m.pending || 0), window.__React.createElement("div", { className: "l" }, "\u7B49\u5F85\u4E2D")),
      window.__React.createElement("div", { className: "aq-kpi-card s" }, window.__React.createElement("div", { className: "v" }, m.done || 0), window.__React.createElement("div", { className: "l" }, "\u5DF2\u5B8C\u6210")),
      window.__React.createElement("div", { className: "aq-kpi-card e" }, window.__React.createElement("div", { className: "v" }, m.failed || 0), window.__React.createElement("div", { className: "l" }, "\u5DF2\u5931\u8D25"))
    );
  }
  function StatusTabs(props) {
    var counts = props.counts || {};
    var filter = props.filter;
    var tabs = [
      { key: "all", label: "\u5168\u90E8", count: 0 },
      { key: "pending", label: "\u5F85\u6267\u884C", count: counts.pending || 0 },
      { key: "running", label: "\u6267\u884C\u4E2D", count: counts.running || 0 },
      { key: "done", label: "\u5DF2\u5B8C\u6210", count: counts.done || 0 },
      { key: "failed", label: "\u5DF2\u5931\u8D25", count: counts.failed || 0 },
      { key: "stopped", label: "\u5DF2\u505C\u6B62", count: counts.stopped || 0 }
    ];
    var total = 0;
    for (var k in counts) {
      total += counts[k];
    }
    tabs[0].count = total;
    return window.__React.createElement(
      "div",
      { className: "aq-tabs" },
      tabs.map(function(tab) {
        return window.__React.createElement("button", {
          key: tab.key,
          className: "aq-tab" + (filter === tab.key ? " sel" : ""),
          onClick: function() {
            props.onFilter(tab.key);
          }
        }, tab.label, window.__React.createElement("span", { className: "aq-tab-count" }, tab.count));
      })
    );
  }
  function TaskList(props) {
    var snap = props.snap;
    if (snap.loading) return window.__React.createElement("div", { className: "aq-loading" }, "\u52A0\u8F7D\u4E2D...");
    if (snap.filtered.length === 0) {
      return window.__React.createElement(
        "div",
        { className: "aq-empty" },
        window.__React.createElement("div", { className: "aq-empty-icon" }, "\u{1F4CB}"),
        window.__React.createElement("div", { className: "aq-empty-text" }, snap.filter === "all" ? "\u8FD8\u6CA1\u6709\u4EFB\u52A1" : "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u4EFB\u52A1"),
        snap.filter === "all" && snap.navGroup === "all" && window.__React.createElement("button", { className: "aq-btn primary", onClick: function() {
          props.controller.openNewTask();
        } }, "\u521B\u5EFA\u7B2C\u4E00\u4E2A\u4EFB\u52A1")
      );
    }
    return window.__React.createElement(
      "div",
      { className: "aq-list" },
      snap.filtered.map(function(task) {
        return window.__React.createElement(TaskCard, {
          key: task.key,
          task,
          selected: snap.showDetail === task.key,
          onAction: props.onAction,
          onDetail: function(key) {
            props.controller.openDetail(key);
          },
          onEdit: function(key) {
            props.controller.openEdit(key);
          },
          onSession: function(sessionId) {
            props.controller.closeBoard();
            props.sessions.open(sessionId);
          }
        });
      })
    );
  }
  function TaskCard(props) {
    var task = props.task;
    var cfg = STATUS_CONFIG2[task.status] || { label: task.status, color: "#6b7280" };
    var unread = isUnread2(task);
    var summary = taskSummary(task.body);
    var isRunning = task.status === "running";
    var typeInfo = TASK_TYPE_LABELS[task.taskType] || TASK_TYPE_LABELS.manual;
    var actions = [];
    if (task.status === "running") {
      actions.push(window.__React.createElement("button", { key: "stop", className: "aq-btn danger", onClick: function(e) {
        e.stopPropagation();
        props.onAction("stop", task.key);
      }, dangerouslySetInnerHTML: { __html: iconHtml("stop") } }));
    }
    if (task.status === "pending") {
      actions.push(window.__React.createElement("button", { key: "edit", className: "aq-btn", onClick: function(e) {
        e.stopPropagation();
        props.onEdit(task.key);
      }, dangerouslySetInnerHTML: { __html: iconHtml("edit") } }));
      actions.push(window.__React.createElement("button", { key: "delete", className: "aq-btn danger", onClick: function(e) {
        e.stopPropagation();
        props.onAction("delete", task.key);
      }, dangerouslySetInnerHTML: { __html: iconHtml("trash") } }));
    }
    if ((task.status === "done" || task.status === "failed" || task.status === "stopped") && !task.archivedAt) {
      actions.push(window.__React.createElement("button", { key: "rerun", className: "aq-btn success", onClick: function(e) {
        e.stopPropagation();
        props.onAction("rerun", task.key);
      }, dangerouslySetInnerHTML: { __html: iconHtml("repeat") } }));
      actions.push(window.__React.createElement("button", { key: "archive", className: "aq-btn warn", onClick: function(e) {
        e.stopPropagation();
        props.onAction("archive", task.key);
      }, dangerouslySetInnerHTML: { __html: iconHtml("archive") } }));
    }
    if (task.archivedAt) {
      actions.push(window.__React.createElement("button", { key: "restore", className: "aq-btn", onClick: function(e) {
        e.stopPropagation();
        props.onAction("restore", task.key);
      }, dangerouslySetInnerHTML: { __html: iconHtml("restore") } }));
    }
    var sessionId = task.sessionId || (task.executions && task.executions.length ? task.executions[task.executions.length - 1].sessionId : null);
    if (sessionId) {
      actions.push(window.__React.createElement("button", { key: "session", className: "aq-btn", onClick: function(e) {
        e.stopPropagation();
        props.onSession(sessionId);
      }, dangerouslySetInnerHTML: { __html: iconHtml("external") + " \u8DF3\u8F6C" } }));
    }
    var progressInfo = null;
    if (isRunning && task.maxGoalRounds) {
      var pct = Math.min(100, Math.round((task.currentRound || 0) / task.maxGoalRounds * 100));
      var phaseLabel = { active: "\u6267\u884C\u4E2D", running: "\u6267\u884C\u4E2D", blocked: "\u5DF2\u963B\u585E", paused: "\u5DF2\u6682\u505C", complete: "\u5DF2\u5B8C\u6210" }[task.goalPhase] || "";
      progressInfo = window.__React.createElement(
        "div",
        { className: "aq-progress" },
        window.__React.createElement(
          "div",
          { className: "aq-progress-bar" },
          window.__React.createElement("div", { className: "aq-progress-fill", style: { width: pct + "%" } })
        ),
        window.__React.createElement(
          "div",
          { className: "aq-progress-info" },
          window.__React.createElement("span", null, "\u8F6E " + (task.currentRound || 0) + "/" + task.maxGoalRounds + " \xB7 " + elapseStr(task.startedAt)),
          phaseLabel && window.__React.createElement("span", { className: "aq-goal-phase" }, phaseLabel)
        )
      );
    }
    return window.__React.createElement(
      "div",
      {
        className: "aq-card" + (props.selected ? " sel" : ""),
        onClick: function() {
          props.onDetail(task.key);
        }
      },
      window.__React.createElement("span", { className: "aq-card-dot", style: { background: cfg.color } }),
      window.__React.createElement(
        "div",
        { className: "aq-card-body" },
        window.__React.createElement(
          "div",
          { className: "aq-card-hd" },
          window.__React.createElement(
            "span",
            { className: "aq-card-key" },
            unread && window.__React.createElement("span", { className: "unread" }),
            task.key
          ),
          window.__React.createElement("span", { className: "aq-card-type", dangerouslySetInnerHTML: { __html: iconHtml(typeInfo.icon) + " " + typeInfo.label } })
        ),
        summary && window.__React.createElement("div", { className: "aq-card-summary" }, summary),
        window.__React.createElement(
          "div",
          { className: "aq-card-meta" },
          window.__React.createElement("span", { className: "aq-card-meta-item", style: { color: cfg.color } }, cfg.label),
          task.cron && window.__React.createElement("span", { className: "aq-card-meta-item", dangerouslySetInnerHTML: { __html: iconHtml("repeat") + " " + cronToHuman(task.cron) } }),
          task.schedule && window.__React.createElement("span", { className: "aq-card-meta-item", dangerouslySetInnerHTML: { __html: iconHtml("clock") + " " + formatIso(task.schedule) } }),
          task.nextRunAt && window.__React.createElement("span", { className: "aq-card-meta-item", dangerouslySetInnerHTML: { __html: iconHtml("clock") + " \u4E0B\u6B21: " + formatIso(task.nextRunAt) } }),
          task.attempts > 0 && window.__React.createElement("span", { className: "aq-card-meta-item" }, "\u5C1D\u8BD5 " + task.attempts + " \u6B21"),
          task.blockedResumes > 0 && window.__React.createElement("span", { className: "aq-card-meta-item" }, "\u53CD\u963B\u585E " + task.blockedResumes + " \u6B21"),
          task.updatedAt && window.__React.createElement("span", { className: "aq-card-meta-item" }, timeAgo(task.updatedAt))
        ),
        progressInfo
      ),
      actions.length > 0 && window.__React.createElement("div", { className: "aq-card-actions" }, actions)
    );
  }

  // client/src/index.jsx
  var PANEL_ATTR = "data-dsh-autoqueue-active";
  var VIEW_ATTR = "data-dsh-autoqueue-view";
  var PANEL_NAME = "autoqueue";
  var ENTRY_SELECTOR = "[data-dsh-autoqueue-entry]";
  var ENTRY_ATTR = "data-dsh-autoqueue-entry";
  var SIDEBAR_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 15 15"/><line x1="5" y1="3" x2="3" y2="5"/><line x1="19" y1="3" x2="21" y2="5"/></svg>';
  var CENTER_COL_SELECTOR = '[data-pane="conversation"], [class*="centerCol"]';
  var ACTIVATE_EVENT = "dsh-panel-activate";
  function mountBoard(controller, transport, React2, reactDomClient, sessions) {
    var root = null;
    var container = null;
    function ensure() {
      if (container) return;
      var column = document.querySelector(CENTER_COL_SELECTOR);
      if (!column) return;
      container = document.createElement("div");
      container.setAttribute(VIEW_ATTR, "");
      container.dataset.dshPlugin = "autoqueue";
      column.appendChild(container);
      root = reactDomClient.createRoot(container);
      root.render(React2.createElement(Workstation, { controller, transport, sessions }));
    }
    function applyActive() {
      var snap = controller.getSnapshot();
      if (snap.boardOpen) {
        var attrs = document.documentElement.getAttributeNames();
        for (var i = 0; i < attrs.length; i++) {
          if (attrs[i].endsWith("-active") && attrs[i] !== PANEL_ATTR) {
            document.documentElement.removeAttribute(attrs[i]);
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
    var SIDEBAR_ROW_SELECTOR = '[class*="sessionRow"], [class*="projectRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"], [class*="newSession"]';
    function onClickSidebarRow(event) {
      if (!controller.getSnapshot().boardOpen) return;
      var target = event.target;
      if (!target) return;
      if (target.closest(SIDEBAR_ROW_SELECTOR)) controller.closeBoard();
    }
    var waitObserver = new MutationObserver(function() {
      ensure();
    });
    waitObserver.observe(document.body, { childList: true, subtree: true });
    var boardUnsub = controller.subscribe(applyActive);
    document.addEventListener(ACTIVATE_EVENT, onOtherActivate);
    document.addEventListener("click", onClickSidebarRow, true);
    ensure();
    var checkInterval = null;
    if (!container) {
      checkInterval = setInterval(function() {
        ensure();
        if (container) clearInterval(checkInterval);
      }, 500);
    }
    return function() {
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
    var column = document.querySelector('[data-pane="sidebar"], [class*="sidebarCol"]');
    if (column === null) return void 0;
    return column.querySelector('[class*="logoRow"]') ? column.querySelector('[class*="logoRow"]').parentElement : column.firstElementChild;
  }
  function newSessionButton(rt) {
    var nested = rt.querySelector('button[class*="newSession"]');
    if (nested !== null) return nested;
    for (var i = 0; i < rt.children.length; i++) {
      if (rt.children[i].tagName === "BUTTON") return rt.children[i];
    }
    return void 0;
  }
  function createEntry(controller) {
    var entry = document.createElement("button");
    entry.type = "button";
    entry.setAttribute(ENTRY_ATTR, "");
    entry.setAttribute("data-dsh-plugin", "autoqueue");
    entry.setAttribute("data-dsh-part", "sidebar-entry");
    entry.className = "aq-sidebar-entry";
    entry.setAttribute("aria-label", "AutoQueue \u4EFB\u52A1\u5DE5\u4F5C\u53F0");
    entry.setAttribute("title", "AutoQueue \u4EFB\u52A1\u5DE5\u4F5C\u53F0");
    entry.innerHTML = '<span class="aq-sidebar-icon">' + SIDEBAR_ICON + '</span><span class="aq-sidebar-label">\u4EFB\u52A1\u5DE5\u4F5C\u53F0</span>';
    var syncActive = function() {
      var snap = controller.getSnapshot();
      if (snap.boardOpen) entry.dataset.active = "true";
      else delete entry.dataset.active;
    };
    var unsub = controller.subscribe(syncActive);
    syncActive();
    entry._aqUnsub = unsub;
    entry.addEventListener("click", function() {
      controller.toggleBoard();
    });
    return entry;
  }
  function placeEntry(rt, entry) {
    var button = newSessionButton(rt);
    if (button === void 0) return false;
    if (entry.parentElement !== rt) {
      var row = button.closest('[class*="logoRow"]');
      var base = row !== null && row.parentElement === rt ? row : button;
      var family = [];
      for (var i = 0; i < rt.children.length; i++) {
        if (rt.children[i] instanceof HTMLElement && rt.children[i].matches(ENTRY_SELECTOR + ", [data-dsh-taskboard-entry], [data-dsh-ssh-entry]")) {
          family.push(rt.children[i]);
        }
      }
      var anchor = family.length > 0 ? family[0] : base.nextElementSibling;
      rt.insertBefore(entry, anchor);
    }
    return true;
  }
  function mountSidebarEntry(controller) {
    if (document.querySelector(ENTRY_SELECTOR) !== null) return function() {
    };
    var entry = createEntry(controller);
    var rt = void 0;
    var placed = false;
    var tryPlace = function() {
      if (rt !== void 0 && !rt.isConnected) {
        rootObserver.disconnect();
        rt = void 0;
        placed = false;
      }
      if (placed) {
        if (document.body.contains(entry)) return;
        rootObserver.disconnect();
        rt = void 0;
        placed = false;
      }
      rt = rt || sidebarRoot();
      if (rt === void 0) return;
      placed = placeEntry(rt, entry);
      if (placed) {
        rootObserver.observe(rt, { childList: true, subtree: true });
      }
    };
    var waitObserver = new MutationObserver(function() {
      tryPlace();
    });
    waitObserver.observe(document.body, { childList: true, subtree: true });
    var rootObserver = new MutationObserver(function() {
      if (rt === void 0 || !rt.isConnected) {
        placed = false;
        tryPlace();
        return;
      }
      if (!rt.contains(entry)) placed = placeEntry(rt, entry);
    });
    tryPlace();
    return function() {
      waitObserver.disconnect();
      rootObserver.disconnect();
      if (entry._aqUnsub) entry._aqUnsub();
      entry.remove();
    };
  }
  window.__ModuleLoader__.load({
    id: "@alintever/dsh-plugin-autoqueue",
    factory: function(require2) {
      window.__React = require2("react");
      window.__ReactDOM = require2("react-dom/client");
      return {
        dispose: function() {
        },
        apply: function(ctx) {
          var sessions = ctx.get("sessions");
          var transport = createTransport();
          var controller = createController(transport);
          var boardDisposer = mountBoard(controller, transport, window.__React, window.__ReactDOM, sessions);
          controller.init();
          var styleId = "dsh-autoqueue-styles";
          if (!document.getElementById(styleId)) {
            var style = document.createElement("style");
            style.id = styleId;
            style.textContent = workstation_default;
            document.head.appendChild(style);
          }
          var sidebarDisposer = mountSidebarEntry(controller);
          return function() {
            controller.closeBoard();
            boardDisposer();
            sidebarDisposer();
            controller.dispose();
            document.documentElement.removeAttribute(PANEL_ATTR);
            delete window.__React;
            delete window.__ReactDOM;
          };
        }
      };
    }
  });
})();
