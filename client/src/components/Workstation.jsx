import { iconHtml, isUnread, taskSummary, cronToHuman, elapseStr, formatIso, timeAgo, STATUS_CONFIG, TASK_TYPE_LABELS } from "../utils.js";
import { TaskDetailPanel } from "./TaskDetail.jsx";
import { NewTaskModal, EditTaskModal, ConfigPanel, ConfirmModal } from "./Modals.jsx";
import { DialogShell } from "./DialogShell.jsx";

function h() { return React.createElement.apply(React, arguments); }

export function Workstation(props) {
  var controller = props.controller;
  var transport = props.transport;
  var sessions = props.sessions;
  var state = React.useState(function () { return controller.getSnapshot(); });
  var confirm = React.useState(null);
  var message = React.useState(null);
  var query = React.useState("");
  var selected = React.useState([]);
  var sidebarOpen = React.useState(false);
  var accessOpen = React.useState(false);

  React.useEffect(function () {
    return controller.subscribe(function () { state[1](controller.getSnapshot()); });
  }, []);

  var snap = state[0];
  var normalizedQuery = query[0].trim().toLowerCase();
  var visibleTasks = snap.filtered.filter(function (task) {
    if (!normalizedQuery) return true;
    return [task.key, task.summary, task.body, task.status].some(function (value) {
      return typeof value === "string" && value.toLowerCase().indexOf(normalizedQuery) >= 0;
    });
  });

  React.useEffect(function () {
    selected[1](function (keys) {
      return keys.filter(function (key) {
        return snap.tasks.some(function (task) { return task.key === key && !task.archivedAt && task.status !== "running"; });
      });
    });
  }, [snap.revision]);

  function flash(text) {
    message[1](text);
    setTimeout(function () { message[1](null); }, 2400);
  }

  function runAction(kind, key, opts) {
    return controller.doAction(kind, key, opts).then(function () {
      var labels = { archive: "已归档", restore: "已恢复", rerun: "已重新入队", stop: "停止指令已提交", delete: "已删除", "force-scan": "扫描完成" };
      if (labels[kind]) flash(labels[kind]);
    }).catch(function () {});
  }

  function handleAction(kind, key) {
    if (kind === "delete" || kind === "stop" || kind === "rerun") {
      var prompt = kind === "delete"
        ? "确认删除这个待执行任务？此操作不可恢复。"
        : (kind === "stop"
          ? "确认停止运行中的任务？当前会话会安全结束。"
          : "确认重新执行这个任务？这会创建新的独立会话，并再次消耗模型与工具资源。");
      confirm[1]({
        title: kind === "delete" ? "删除任务" : (kind === "stop" ? "停止任务" : "重新执行任务"),
        message: prompt,
        confirmLabel: kind === "delete" ? "删除" : (kind === "stop" ? "停止" : "重新执行"),
        tone: kind === "rerun" ? "warn" : "danger",
        onConfirm: function () { confirm[1](null); runAction(kind, key); }
      });
      return;
    }
    runAction(kind, key);
  }

  function toggleSelected(key) {
    selected[1](function (keys) {
      return keys.indexOf(key) >= 0 ? keys.filter(function (item) { return item !== key; }) : keys.concat(key);
    });
  }

  function archiveSelected() {
    var keys = selected[0].slice();
    if (!keys.length) return;
    confirm[1]({
      title: "批量归档",
      message: "确认归档已选择的 " + keys.length + " 个任务？随时可以从归档区恢复。",
      confirmLabel: "归档",
      onConfirm: function () {
        confirm[1](null);
        controller.doAction("archive", null, { keys: keys }).then(function (result) {
          var results = result && Array.isArray(result.results) ? result.results : [];
          var failed = results.filter(function (item) { return !item.ok; });
          var succeeded = results.length ? results.length - failed.length : keys.length;
          selected[1](failed.map(function (item) { return item.key; }));
          if (failed.length) flash("已归档 " + succeeded + " 个，" + failed.length + " 个未归档并保留选择");
          else flash("已归档 " + succeeded + " 个任务");
        }).catch(function () {});
      }
    });
  }

  return h("div", { "data-dsh-autoqueue-view": "" },
    h("div", { className: "aq-ws" + (sidebarOpen[0] ? " nav-open" : "") },
      h(Sidebar, { snap: snap, controller: controller, onNavigate: function () { sidebarOpen[1](false); } }),
      h("button", { className: "aq-nav-scrim", "aria-label": "关闭导航", onClick: function () { sidebarOpen[1](false); } }),
      h("main", { className: "aq-main" },
        h(Header, {
          snap: snap, controller: controller, message: message[0],
          onMenu: function () { sidebarOpen[1](true); },
          onAccess: function () { accessOpen[1](true); }
        }),
        h(ErrorBanner, { error: snap.error || snap.transportError, onDismiss: function () { controller.clearError(); } }),
        h("div", { className: "aq-canvas" },
          h(WorkspaceHeader, {
            snap: snap,
            onCreate: function () { controller.openNewTask(); },
            onScan: function () { runAction("force-scan"); },
            onReturn: function () { controller.setNavGroup("all"); controller.setFilter("all"); }
          }),
          h(SafetyStatusBar, { snap: snap }),
          h(QueueControls, {
            snap: snap, query: query[0], onQuery: query[1],
            onFilter: function (value) { controller.setFilter(value); },
            onAccess: function () { accessOpen[1](true); }
          }),
          selected[0].length > 0 && h("div", { className: "aq-batch", role: "status" },
            h("span", null, "已选择 ", h("strong", null, selected[0].length), " 个任务"),
            h("button", { className: "aq-btn", onClick: function () { selected[1]([]); } }, "取消选择"),
            h("button", { className: "aq-btn primary", onClick: archiveSelected }, "批量归档")
          ),
          h(TaskList, {
            snap: snap, tasks: visibleTasks, controller: controller, sessions: sessions,
            selected: selected[0], onSelect: toggleSelected, onAction: handleAction
          })
        )
      )
    ),
    snap.showDetail && snap.detailTask && h(TaskDetailPanel, {
      key: snap.detailTask.key, task: snap.detailTask, transport: transport, controller: controller, sessions: sessions,
      onClose: function () { controller.closeDetail(); },
      onActionRequest: function (kind, key) { controller.closeDetail(); handleAction(kind, key); }
    }),
    snap.showNewTask && h(NewTaskModal, {
      options: snap.options, config: snap.config, onClose: function () { controller.closeNewTask(); },
      onCreate: function (data) {
        return controller.createTask(data).then(function (result) {
          var key = result && result.key ? result.key : (data.key || "新任务");
          var taskState = result && result.taskState;
          var phase = "状态已同步";
          if (taskState) {
            if (taskState.archivedAt) phase = taskState.status === "done" ? "已完成并归档" : "已结束并归档";
            else if (taskState.status === "running") phase = "已开始执行";
            else if (taskState.status === "done") phase = "已完成";
            else if (taskState.status === "failed") phase = "执行失败，请查看详情";
            else if (taskState.status === "pending") phase = data.schedule ? "已安排定时执行" : (data.cron ? "已启用循环调度" : "等待执行");
          }
          flash("已入队：" + key + " · " + (result.stateRefreshed === false ? "页面刷新失败，请点击扫描" : phase));
          return result;
        });
      }
    }),
    snap.showEdit && snap.editTask && h(EditTaskModal, {
      task: snap.editTask, options: snap.options, onClose: function () { controller.closeEdit(); },
      onUpdate: function (key, patch) { return controller.updateTask(key, patch); }
    }),
    snap.showConfig && h(ConfigPanel, {
      config: snap.config, options: snap.options, onClose: function () { controller.closeConfig(); },
      onUpdate: function (patch) { return controller.updateConfig(patch); },
      onSetConcurrency: function (number) { return controller.setConcurrency(number); }
    }),
    accessOpen[0] && h(ApiAccessPanel, { transport: transport, snap: snap, onClose: function () { accessOpen[1](false); }, onCopied: flash }),
    confirm[0] && h(ConfirmModal, {
      title: confirm[0].title, message: confirm[0].message, confirmLabel: confirm[0].confirmLabel, tone: confirm[0].tone,
      onConfirm: confirm[0].onConfirm, onCancel: function () { confirm[1](null); }
    })
  );
}

function Sidebar(props) {
  var snap = props.snap;
  var ctrl = props.controller;
  var runtime = snap.runtimeHealth || {};
  var active = (snap.counts.pending || 0) + (snap.counts.running || 0) + (snap.counts.interrupted || 0);
  var navItems = [
    { key: "all", label: "任务队列", icon: "list", count: snap.tasks.filter(function (task) { return !task.archivedAt; }).length },
    { key: "active", label: "正在推进", icon: "play", count: active },
    { key: "cron", label: "循环调度", icon: "repeat", count: snap.tasks.filter(function (task) { return task.taskType === "cron" && !task.archivedAt; }).length },
    { key: "schedule", label: "定时执行", icon: "clock", count: snap.tasks.filter(function (task) { return task.taskType === "schedule" && !task.archivedAt; }).length },
    { key: "archived", label: "归档记录", icon: "archive", count: snap.tasks.filter(function (task) { return !!task.archivedAt; }).length }
  ];
  var connectionLabel = runtime.connected
    ? "实时通道已连接"
    : (runtime.reconnecting ? "实时通道重连中" : (runtime.status === "connecting" ? "实时通道连接中" : "实时通道未连接"));
  var healthTone = runtime.connected ? "safe" : (runtime.reconnecting ? "attention" : "unknown");

  return h("aside", { className: "aq-sb", "aria-label": "任务工作台导航" },
    h("div", { className: "aq-brand" },
      h("span", { className: "aq-brand-mark", "aria-hidden": "true", dangerouslySetInnerHTML: { __html: iconHtml("list") } }),
      h("strong", null, "任务队列")
    ),
    h("nav", { className: "aq-nav" },
      navItems.map(function (item) {
        return h("button", {
          key: item.key, className: "aq-nav-item" + (snap.navGroup === item.key ? " sel" : ""),
          onClick: function () { ctrl.setNavGroup(item.key); ctrl.setFilter("all"); props.onNavigate(); }
        },
          h("span", { className: "aq-nav-svg", dangerouslySetInnerHTML: { __html: iconHtml(item.icon) } }),
          h("span", { className: "aq-nav-text" }, item.label),
          h("span", { className: "aq-nav-badge" }, item.count)
        );
      })
    ),
    h("div", { className: "aq-sb-foot" },
      h("div", { className: "aq-host-state " + healthTone }, h("span", { className: "aq-live-dot" }), h("span", null, connectionLabel))
    )
  );
}

function Header(props) {
  return h("header", { className: "aq-head" },
    h("button", { className: "aq-icon-btn aq-mobile-menu", onClick: props.onMenu, "aria-label": "打开导航", dangerouslySetInnerHTML: { __html: iconHtml("list") } }),
    h("div", { className: "aq-head-title" },
      h("h1", null, "无人值守任务台")
    ),
    props.message && h("div", { className: "aq-toast", role: "status" }, props.message),
    h("div", { className: "aq-head-actions" },
      h("button", { className: "aq-btn ghost aq-hide-mobile", onClick: props.onAccess }, "AI / API 接入"),
      h("button", { className: "aq-icon-btn", onClick: function () { props.controller.openConfig(); }, title: "运行设置", "aria-label": "运行设置", dangerouslySetInnerHTML: { __html: iconHtml("gear") } }),
      h("button", { className: "aq-btn primary aq-create", onClick: function () { props.controller.openNewTask(); }, dangerouslySetInnerHTML: { __html: iconHtml("plus") + " 新建任务" } }),
      h("button", { className: "aq-icon-btn aq-close-board", onClick: function () { props.controller.closeBoard(); }, title: "关闭任务台", "aria-label": "关闭任务台", dangerouslySetInnerHTML: { __html: iconHtml("close") } })
    )
  );
}

var WORKSPACE_COPY = {
  all: {
    title: "任务队列",
    description: "查看和管理全部未归档任务。"
  },
  active: {
    title: "正在推进",
    description: "查看待执行、执行中和中断任务，以及 DSH 运行状态。"
  },
  cron: {
    title: "循环调度",
    description: "管理周期任务和下一次执行时间。"
  },
  schedule: {
    title: "定时执行",
    description: "管理一次性定时任务。"
  },
  archived: {
    title: "归档记录",
    description: "查看已归档任务；完整执行记录仍保留在任务详情中。"
  }
};

function WorkspaceHeader(props) {
  var snap = props.snap;
  var meta = WORKSPACE_COPY[snap.navGroup] || WORKSPACE_COPY.all;
  var actionLabel;
  var action;
  if (snap.navGroup === "active") {
    actionLabel = "立即检查任务";
    action = props.onScan;
  } else if (snap.navGroup === "cron") {
    actionLabel = "新建循环任务";
    action = props.onCreate;
  } else if (snap.navGroup === "schedule") {
    actionLabel = "新建定时任务";
    action = props.onCreate;
  } else if (snap.navGroup === "archived") {
    actionLabel = "返回任务队列";
    action = props.onReturn;
  } else {
    actionLabel = "立即检查任务";
    action = props.onScan;
  }

  return h("section", { className: "aq-workspace-head", "aria-labelledby": "aq-workspace-title" },
    h("div", { className: "aq-workspace-copy" },
      h("h2", { id: "aq-workspace-title" }, meta.title),
      h("p", null, meta.description)
    ),
    h("button", { className: "aq-btn ghost aq-workspace-action", onClick: action }, actionLabel),
    snap.navGroup === "active" && h(RuntimeObservation, { runtime: snap.runtimeObservation })
  );
}

function RuntimeObservation(props) {
  var runtime = props.runtime;
  if (!runtime) return h("div", { className: "aq-runtime-pending", role: "status" }, "正在同步 DSH 运行状态…");
  var latestSync = mostRecentTimestamp([runtime.lastNativeEventAt, runtime.lastPollAt, runtime.lastScanAt]);
  var values = [
    ["前台状态", foregroundGateLabel(runtime.foregroundGate)],
    ["监控方式", runtimeMonitorLabel(runtime.monitorMode)],
    ["最近同步", latestSync ? formatIso(latestSync) : "等待首次同步"]
  ];
  var diagnostics = [
    ["监控方式", runtimeMonitorLabel(runtime.monitorMode)],
    ["前台状态", foregroundGateLabel(runtime.foregroundGate)],
    ["会话列表", runtime.sessionListKnown === false ? "待确认" : "已同步"],
    ["最近事件", runtime.lastNativeEventAt ? formatIso(runtime.lastNativeEventAt) : "暂无"],
    ["最近状态校验", runtime.lastPollAt ? formatIso(runtime.lastPollAt) : "暂无"],
    ["最近队列扫描", runtime.lastScanAt ? formatIso(runtime.lastScanAt) : "暂无"],
    ["兜底检查", runtime.watchdogMs ? "每 " + Math.round(runtime.watchdogMs / 1000) + " 秒" : "未启用"]
  ];
  return h("section", { className: "aq-runtime-observation", "aria-label": "DSH 运行监控" },
    h("div", { className: "aq-runtime-summary" },
      values.map(function (item) { return h("div", { key: item[0] }, h("span", null, item[0]), h("strong", null, item[1])); })
    ),
    h("details", { className: "aq-runtime-diagnostics" },
      h("summary", null, "运行诊断"),
      h("dl", null, diagnostics.map(function (item) {
        return h("div", { key: item[0] }, h("dt", null, item[0]), h("dd", null, item[1]));
      }))
    )
  );
}

function mostRecentTimestamp(values) {
  return values.filter(Boolean).sort(function (a, b) { return new Date(b).getTime() - new Date(a).getTime(); })[0] || null;
}

function runtimeMonitorLabel(mode) {
  if (mode === "native-events+authoritative-reconcile" || mode === "native-event-reconcile") return "事件驱动，定时校验";
  return mode ? "运行监控已启用" : "等待首次同步";
}

function foregroundGateLabel(gate) {
  if (gate === true || gate === "foreground-active" || gate === "closed" || gate === "busy") return "DSH 使用中，队列已暂停";
  if (gate === false || gate === "foreground-idle" || gate === "open") return "DSH 空闲，可以执行";
  if (gate === "unknown") return "正在确认 DSH 状态";
  if (gate && typeof gate === "object") {
    if (gate.blocked === true || gate.foregroundActive === true) return "DSH 使用中，队列已暂停";
    if (gate.blocked === false || gate.foregroundActive === false) return "DSH 空闲，可以执行";
  }
  return "正在确认 DSH 状态";
}

function SafetyStatusBar(props) {
  var snap = props.snap;
  var running = snap.metrics.running || 0;
  var foregroundPaused = snap.tasks.filter(function (task) { return task.foregroundPaused === true; }).length;
  var maxConcurrent = snap.config.maxConcurrent || 1;
  var isolation = snap.isolationHealth || { status: "unknown", message: "正在确认隔离状态" };
  var isolationTone = isolation.verified ? "safe" : (isolation.status === "error" || isolation.status === "unsafe" ? "danger" : "warn");
  return h("section", { className: "aq-safety-bar " + isolationTone, "aria-label": "运行安全状态" },
    h(StatusItem, {
      label: isolation.verified ? "隔离已启用" : "隔离待确认",
      detail: isolation.message || "正在确认隔离状态",
      tone: isolationTone
    }),
    h(StatusItem, {
      label: "前台优先",
      detail: foregroundPaused > 0
        ? "已暂停 " + foregroundPaused + " 个后台任务"
        : "使用 DSH 时自动暂停后台任务",
      tone: "safe"
    }),
    h(StatusItem, { label: "并发占用", detail: running + " / " + maxConcurrent, tone: running > 0 ? "active" : "neutral" })
  );
}

function StatusItem(props) {
  return h("div", { className: "aq-safety-item " + props.tone },
    h("span", { className: "aq-state-mark", "aria-hidden": "true" }, props.tone === "safe" || props.tone === "active" || props.tone === "neutral" ? "✓" : "!"),
    h("div", null, h("strong", null, props.label), h("small", null, props.detail))
  );
}

function QueueControls(props) {
  var counts = props.snap.scopeCounts || {};
  var byGroup = {
    active: [["running", "运行中"], ["pending", "待执行"], ["interrupted", "已中断"]],
    archived: [["done", "已完成"], ["failed", "已失败"], ["stopped", "已停止"], ["interrupted", "已中断"]]
  };
  var definitions = byGroup[props.snap.navGroup] || [
    ["running", "运行中"], ["pending", "待执行"], ["failed", "已失败"],
    ["stopped", "已停止"], ["interrupted", "已中断"], ["done", "已完成"]
  ];
  var tabs = [["all", "全部", (props.snap.scoped || []).length]].concat(definitions.map(function (item) {
    return [item[0], item[1], counts[item[0]] || 0];
  }));
  return h("div", { className: "aq-queue-tools" },
    h("label", { className: "aq-search" },
      h("span", { className: "aq-search-icon", "aria-hidden": "true", dangerouslySetInnerHTML: { __html: iconHtml("search") } }),
      h("span", { className: "sr-only" }, "搜索任务"),
      h("input", { type: "search", value: props.query, onChange: function (event) { props.onQuery(event.target.value); }, placeholder: "搜索任务名称或关键词" })
    ),
    h("div", { className: "aq-tabs", role: "tablist", "aria-label": "任务状态" },
      tabs.map(function (tab) {
        return h("button", {
          key: tab[0], role: "tab", "aria-selected": props.snap.filter === tab[0],
          className: "aq-tab" + (props.snap.filter === tab[0] ? " sel" : ""),
          onClick: function () { props.onFilter(tab[0]); }
        }, tab[1], h("span", { className: "aq-tab-count" }, tab[2]));
      })
    ),
    h("button", { className: "aq-btn ghost aq-mobile-access", onClick: props.onAccess }, "接入")
  );
}

function TaskList(props) {
  if (props.snap.loading) return h("div", { className: "aq-loading", role: "status" }, h("span", { className: "aq-loader" }), "正在读取任务账本…");
  if (!props.tasks.length) {
    var emptyByGroup = {
      all: { title: "还没有任务", body: "创建任务后，队列会在 DSH 空闲时自动执行。", action: "创建任务" },
      active: { title: "没有正在推进的任务", body: "待执行、执行中和中断的任务会显示在这里。", action: "创建任务" },
      cron: { title: "还没有循环任务", body: "创建循环任务后，可在这里查看下一次执行时间。", action: "创建循环任务" },
      schedule: { title: "还没有定时任务", body: "创建一次性定时任务后，可在这里查看执行时间。", action: "创建定时任务" },
      archived: { title: "归档区为空", body: "归档后的任务会保留状态和详情。", action: "返回任务队列" }
    };
    var empty = emptyByGroup[props.snap.navGroup] || emptyByGroup.all;
    if (props.snap.filter !== "all") empty = { title: "没有符合条件的任务", body: "可以切换状态或修改搜索关键词。", action: "查看全部状态" };
    var onEmptyAction = function () {
      if (props.snap.filter !== "all") props.controller.setFilter("all");
      else if (props.snap.navGroup === "archived") props.controller.setNavGroup("all");
      else props.controller.openNewTask();
    };
    return h("section", { className: "aq-empty" },
      h("div", null,
        h("h2", null, empty.title),
        h("p", null, empty.body),
        h("button", { className: "aq-btn primary", onClick: onEmptyAction }, empty.action)
      )
    );
  }
  return h("section", { className: "aq-list-shell", "aria-label": "任务队列" },
    h("div", { className: "aq-list-head", "aria-hidden": "true" },
      h("span"), h("span", null, "任务"), h("span", null, "状态"), h("span", null, "计划"), h("span", null, "优先级"), h("span", null, "最新进展"), h("span", null, "操作")
    ),
    h("div", { className: "aq-list" },
      props.tasks.map(function (task) {
        return h(TaskRow, {
          key: task.key, task: task, snap: props.snap, selected: props.selected.indexOf(task.key) >= 0,
          onSelect: props.onSelect, onAction: props.onAction,
          onDetail: function (key) { props.controller.openDetail(key); },
          onEdit: function (key) { props.controller.openEdit(key); },
          onUnread: function (key) { props.controller.markRead(key, false); },
          onSession: function (sessionId) { props.controller.closeBoard(); props.sessions.open(sessionId); }
        });
      })
    )
  );
}

function TaskRow(props) {
  var task = props.task;
  var cfg = STATUS_CONFIG[task.status] || { label: task.status, color: "#596579" };
  var summary = task.summary || taskSummary(task.body);
  var typeInfo = TASK_TYPE_LABELS[task.taskType] || TASK_TYPE_LABELS.manual;
  var attention = taskNeedsAttention(task);
  var selectable = task.status !== "running" && !task.archivedAt;
  var sessionId = task.sessionId || task.lastSessionId || (task.executions && task.executions.length ? task.executions[task.executions.length - 1].sessionId : null);
  var plan = task.cron ? cronToHuman(task.cron) : (task.schedule ? formatIso(task.schedule) : "即时派发");
  var recent = task.status === "pending"
    ? pendingReason(task, props.snap)
    : (task.status === "running"
    ? (task.stopPending === true
      ? "正在确认任务已完全停止"
      : (task.foregroundPaused === true
      ? "DSH 使用中，后台任务已暂停"
      : "第 " + (task.currentRound || 0) + "/" + (task.maxGoalRounds || "-") + " 轮 · " + elapseStr(task.startedAt)))
    : (task.lastError ? String(task.lastError).slice(0, 54) : (task.updatedAt ? timeAgo(task.updatedAt) : "-")));
  var actions = taskActions(task);

  function openRow() { props.onDetail(task.key); }

  return h("article", {
    className: "aq-card aq-task-row status-" + task.status + (attention ? " attention" : "") + (props.selected ? " selected" : ""),
    onClick: openRow
  },
    h("label", { className: "aq-select", onClick: function (event) { event.stopPropagation(); } },
      h("span", { className: "sr-only" }, "选择 " + task.key),
      h("input", { type: "checkbox", checked: props.selected, disabled: !selectable, onChange: function () { props.onSelect(task.key); } })
    ),
    h("div", { className: "aq-task-main" },
      h("div", { className: "aq-card-key" },
        isUnread(task) && h("span", { className: "unread", title: "未读结果" }),
        h("button", { type: "button", className: "aq-task-open", onClick: function (event) { event.stopPropagation(); openRow(); }, "aria-label": "查看任务 " + task.key }, h("strong", null, task.key)),
        h("span", { className: "aq-card-type", dangerouslySetInnerHTML: { __html: iconHtml(typeInfo.icon) + " " + typeInfo.label } })
      ),
      h("p", { className: "aq-card-summary" }, summary || "未填写摘要"),
      task.status === "running" && h("span", { className: "aq-running-detail" }, task.foregroundPaused === true ? "已暂停，等待 DSH 空闲" : "正在执行第 " + (task.currentRound || 0) + " 轮")
    ),
    h("div", { className: "aq-task-status" },
      h("span", { className: "aq-status-pill", style: { "--status-color": task.stopPending === true ? "#9a6700" : (task.foregroundPaused === true ? "#27776e" : cfg.color) } }, h("i"), attention ? "需关注" : (task.stopPending === true ? "正在停止" : (task.foregroundPaused === true ? "已暂停" : cfg.label))),
      task.nextRetryAt && h("small", null, "计划重试")
    ),
    h("div", { className: "aq-task-plan" }, h("strong", null, plan), task.nextRunAt && h("small", null, "下次 ", formatIso(task.nextRunAt))),
    h("div", { className: "aq-priority" }, h("i", { className: Number(task.priority || 5) >= 8 ? "high" : "" }), h("span", null, Number(task.priority || 5) >= 8 ? "高" : (Number(task.priority || 5) <= 3 ? "低" : "中"))),
    h("div", { className: "aq-recent" }, h("strong", null, recent), task.attempts > 0 && h("small", null, "尝试 ", task.attempts, " 次")),
    h("div", { className: "aq-row-actions", onClick: function (event) { event.stopPropagation(); } },
      task.status === "running" && task.stopPending !== true && h(ActionButton, { label: "停止 " + task.key, icon: "stop", tone: "danger", onClick: function () { props.onAction("stop", task.key); } }),
      task.status === "pending" && h(ActionButton, { label: "编辑 " + task.key, icon: "edit", onClick: function () { props.onEdit(task.key); } }),
      actions.indexOf("rerun") >= 0 && h(ActionButton, { label: "重新执行 " + task.key, icon: "repeat", tone: "success", onClick: function () { props.onAction("rerun", task.key); } }),
      actions.indexOf("archive") >= 0 && h(ActionButton, { label: "归档 " + task.key, icon: "archive", onClick: function () { props.onAction("archive", task.key); } }),
      task.archivedAt && h(ActionButton, { label: "还原 " + task.key, icon: "restore", onClick: function () { props.onAction("restore", task.key); } }),
      ["done", "failed", "stopped", "interrupted"].indexOf(task.status) >= 0 && !isUnread(task) && !task.archivedAt && h(ActionButton, { label: "标记未读 " + task.key, icon: "inbox", onClick: function () { props.onUnread(task.key); } }),
      task.status === "pending" && h(ActionButton, { label: "删除 " + task.key, icon: "trash", tone: "danger", onClick: function () { props.onAction("delete", task.key); } }),
      sessionId && h(ActionButton, { label: "跳转会话 " + task.key, icon: "external", onClick: function () { props.onSession(sessionId); } })
    )
  );
}

function pendingReason(task, snap) {
  var now = Date.now();
  var retryAt = task.nextRetryAt ? new Date(task.nextRetryAt).getTime() : NaN;
  if (Number.isFinite(retryAt) && retryAt > now) return "等待重试，" + formatIso(task.nextRetryAt) + " 后继续";
  var scheduledAt = task.schedule ? new Date(task.schedule).getTime() : NaN;
  if (Number.isFinite(scheduledAt) && scheduledAt > now) return "计划于 " + formatIso(task.schedule) + " 执行";
  if (task.cron && task.nextRunAt) return "下次于 " + formatIso(task.nextRunAt) + " 执行";
  var runtime = snap && snap.runtimeObservation;
  var gate = runtime && runtime.foregroundGate;
  if (gate === true || gate === "foreground-active" || gate === "closed" || gate === "busy" ||
      (gate && typeof gate === "object" && (gate.blocked === true || gate.foregroundActive === true))) {
    return "DSH 使用中，队列已暂停";
  }
  if (runtime && (runtime.sessionListKnown === false || gate === "unknown")) return "正在确认 DSH 状态";
  var running = snap && snap.metrics ? Number(snap.metrics.running || 0) : 0;
  var maxConcurrent = snap && snap.config ? Number(snap.config.maxConcurrent || 1) : 1;
  if (running >= maxConcurrent) return "后台任务已满，正在排队";
  return "已入队，等待执行";
}

function ActionButton(props) {
  return h("button", {
    className: "aq-row-action " + (props.tone || ""), title: props.label, "aria-label": props.label, onClick: props.onClick,
    dangerouslySetInnerHTML: props.icon ? { __html: iconHtml(props.icon) } : undefined
  }, props.icon ? undefined : props.text);
}

function taskActions(task) {
  var actions = [];
  if (["done", "failed", "stopped", "interrupted"].indexOf(task.status) >= 0 && !task.archivedAt) actions.push("rerun");
  if (task.status !== "running" && !task.archivedAt) actions.push("archive");
  return actions;
}

function taskNeedsAttention(task) {
  var phase = String(task.goalPhase || "");
  return task.status === "failed" || task.status === "interrupted" ||
    phase.indexOf("uncertain") >= 0 || phase.indexOf("containment") >= 0 ||
    !!task._goalAdmissionUncertain || !!task._promptAdmissionUncertain;
}

function ErrorBanner(props) {
  if (!props.error) return null;
  return h("div", { className: "aq-err", role: "alert" },
    h("strong", null, "需要处理"), h("span", null, props.error),
    h("button", { className: "aq-err-dismiss", onClick: props.onDismiss, "aria-label": "关闭错误提示" }, "×")
  );
}

function ApiAccessPanel(props) {
  var origin = typeof location === "undefined" ? "http://127.0.0.1:3080" : location.origin;
  var queueBase = origin + "/api/queue";
  var discoveryBase = origin + "/api/autoqueue";
  var compactStateUrl = queueBase + "/state?archived=1&compact=1";
  var curl = "curl -H \"<按部署要求填写认证信息>\" \\\n  '" + compactStateUrl + "'";
  var capability = React.useState({ status: "loading", data: null, error: null });
  var retry = React.useState(0);

  React.useEffect(function () {
    var cancelled = false;
    capability[1]({ status: "loading", data: null, error: null });
    props.transport.capabilities().then(function (data) {
      if (!cancelled) capability[1]({ status: "ready", data: data, error: null });
    }).catch(function (error) {
      if (!cancelled) capability[1]({ status: "error", data: null, error: error.message || "Capabilities 读取失败" });
    });
    return function () { cancelled = true; };
  }, [props.transport, retry[0]]);

  function copy(value, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () { props.onCopied(label + "已复制"); });
    }
  }

  var data = capability[0].data;
  var features = data && data.features && typeof data.features === "object" ? data.features : {};
  var resources = data && data.resources && typeof data.resources === "object" ? data.resources : {};
  var limits = data && data.limits && typeof data.limits === "object" ? data.limits : {};
  var tools = data && Array.isArray(data.aiTools) ? data.aiTools : [];
  var aliases = data && Array.isArray(data.aliases) ? data.aliases : [];
  var registration = data && data.aiToolRegistration ? data.aiToolRegistration : null;
  var authentication = data && data.authentication && typeof data.authentication === "object" ? data.authentication : null;
  var authSchemes = authentication && Array.isArray(authentication.schemes) ? authentication.schemes : [];
  var localDirect = authentication && authentication.loopbackDirectAccess === true;
  var authRequired = authentication && !localDirect && authSchemes.length > 0;
  var bearerScheme = authSchemes.find(function (scheme) { return String(scheme).indexOf("Authorization: Bearer") === 0; });
  var tokenScheme = authSchemes.find(function (scheme) { return String(scheme).indexOf("X-Autoqueue-Token:") === 0; });
  if (localDirect) curl = "curl '" + compactStateUrl + "'";
  else if (bearerScheme) curl = "curl -H \"Authorization: Bearer $AUTOQUEUE_TOKEN\" \\\n  '" + compactStateUrl + "'";
  else if (tokenScheme) curl = "curl -H \"X-Autoqueue-Token: $AUTOQUEUE_TOKEN\" \\\n  '" + compactStateUrl + "'";
  var isolation = props.snap.isolationHealth || { status: "unknown", verified: false, message: "隔离策略待验证" };

  return h(DialogShell, {
    variant: "drawer", title: "AI / API 接入", onClose: props.onClose, className: "aq-access-panel",
    renderTitle: function (args) {
      return h("div", { className: "aq-d-hd aq-access-hd" },
        h("div", null, h("h3", { id: args.id }, args.title), h("p", null, "外部 AI 的调用地址、认证方式和可用能力")),
        h("button", { className: "aq-d-close", onClick: props.onClose, "aria-label": "关闭接入面板", dangerouslySetInnerHTML: { __html: iconHtml("close") } })
      );
    }
  },
    h("div", { className: "aq-access-body" },
      capability[0].status === "loading" && h("section", { className: "aq-cap-loading", role: "status" },
        h("span"), h("span"), h("span"), h("p", null, "正在读取可用能力")
      ),
      capability[0].status === "error" && h("section", { className: "aq-cap-error", role: "alert" },
        h("strong", null, "Capabilities 暂不可用"),
        h("p", null, capability[0].error),
        h("button", { className: "aq-btn", onClick: function () { retry[1](retry[0] + 1); } }, "重新读取")
      ),
      capability[0].status === "ready" && h(React.Fragment, null,
        h("section", { className: "aq-access-intro" },
          h("span", { className: "aq-security-badge" }, localDirect ? "本机直连" : (authRequired ? "需要认证" : "认证待确认")),
          h("h4", null, data.displayName || "任务队列"),
          h("p", null, aliases.length ? "也可以叫：" + aliases.join("、") + "。工具调用仍使用 autoqueue_* 正式名称。" : "工具调用使用 autoqueue_* 正式名称。"),
          h("p", { className: "aq-auth-note" }, localDirect
            ? "本机可直接访问；远程访问必须携带 token。"
            : (authRequired ? "认证方式：" + authSchemes.join("；") : "未提供认证方式，请检查部署设置。"))
        ),
        h("section", { className: "aq-cap-summary", "aria-label": "AI 接入摘要" },
          h(CapabilityFact, { label: "API 版本", value: data.apiVersion || "未知" }),
          h(CapabilityFact, { label: "AI 工具", value: tools.length + " 个" }),
          h(CapabilityFact, { label: "默认注册", value: registration ? (registration.defaultEnabled ? "开启" : "关闭") : "未知" }),
          h(CapabilityFact, { label: "自然语言别称", value: aliases.length ? aliases.join("、") : "未声明" })
        ),
        registration && h("p", { className: "aq-cap-optin" }, "AI 工具启用项：", h("code", null, registration.optInConfig || "未声明")),
        h("section", { className: "aq-cap-section" },
          h("h4", null, "核心能力"),
          h("div", { className: "aq-cap-tags" }, Object.keys(features).filter(function (key) {
            return features[key] === true || Array.isArray(features[key]);
          }).map(function (key) {
            return h("span", { key: key }, capabilityLabel(key), Array.isArray(features[key]) ? "：" + formatFeatureValues(features[key]) : "");
          }))
        ),
        h("section", { className: "aq-cap-section" },
          h("h4", null, "资源与限制"),
          h("div", { className: "aq-cap-columns" },
            h(CapabilityList, { title: "资源", values: resources }),
            h(CapabilityList, { title: "限制", values: limits })
          )
        ),
        h("section", { className: "aq-cap-isolation " + isolation.status },
          h("div", null,
            h("strong", null, isolation.verified ? "隔离设置已确认" : "隔离设置待确认"),
            h("p", null, isolation.message)
          ),
          h("dl", null,
            h("div", null, h("dt", null, "会话隔离"), h("dd", null, isolationSettingLabel("sandbox", features.sessionSandboxMode))),
            h("div", null, h("dt", null, "审批方式"), h("dd", null, isolationSettingLabel("approval", features.sessionApprovalPolicy))),
            h("div", null, h("dt", null, "前台优先"), h("dd", null, features.foregroundPreemption === true ? "开启" : "未声明")),
            h("div", null, h("dt", null, "禁止覆盖"), h("dd", null, isolation.locks ? isolation.locks.map(isolationLockLabel).join(" / ") : "待确认"))
          )
        ),
        h("details", { className: "aq-tool-catalog" },
          h("summary", null, "查看 " + tools.length + " 个工具正式名称"),
          h("div", null, tools.map(function (name) { return h("code", { key: name }, name); }))
        )
      ),
      h(EndpointCard, { label: "Capabilities", value: discoveryBase + "/capabilities", onCopy: copy }),
      h(EndpointCard, { label: "OpenAPI 3.1", value: discoveryBase + "/openapi.json", onCopy: copy }),
      h("section", { className: "aq-code-block" },
        h("div", null, h("strong", null, "快速验证"), h("button", { onClick: function () { copy(curl, "curl "); } }, "复制")),
        h("pre", null, curl)
      ),
      h("p", { className: "aq-access-note" }, "外部 AI 建议先读取 Capabilities 和 OpenAPI，再读取精简状态。页面不会显示 token，也不允许覆盖 DSH 的模型、工作区或预设。")
    )
  );
}

function CapabilityFact(props) {
  return h("div", null, h("span", null, props.label), h("strong", null, props.value));
}

function CapabilityList(props) {
  var keys = Object.keys(props.values || {});
  return h("div", { className: "aq-cap-list" },
    h("strong", null, props.title),
    keys.length ? keys.map(function (key) {
      return h("div", { key: key }, h("span", null, capabilityEntryLabel(key)), h("code", null, formatCapabilityValue(props.values[key])));
    }) : h("p", null, "未声明")
  );
}

function formatCapabilityValue(value) {
  if (Array.isArray(value)) return value.join(" / ");
  if (value === true) return "是";
  if (value === false) return "否";
  return String(value == null ? "未知" : value);
}

function capabilityEntryLabel(key) {
  var labels = {
    state: "队列状态", task: "任务", action: "任务操作", detail: "任务详情",
    options: "可选项", config: "运行设置", markRead: "已读状态", events: "实时事件",
    taskContentBytes: "单任务内容上限", taskKeyCharacters: "任务标识长度",
    requestIdCharacters: "请求标识长度", batchArchiveTasks: "单次批量归档",
    maxConcurrent: "最大并发", sseConnections: "实时连接数"
  };
  return labels[key] || key;
}

function formatFeatureValues(values) {
  var labels = {
    immediate: "立即执行", schedule: "定时执行", cron: "循环执行", deadline: "截止时间"
  };
  return values.map(function (value) { return labels[value] || value; }).join(" / ");
}

function isolationSettingLabel(kind, value) {
  if (!value) return "未知";
  if (kind === "sandbox" && value === "workspace-write") return "独立工作目录（workspace-write）";
  if (kind === "approval" && value === "never") return "无需人工审批（never）";
  return value;
}

function isolationLockLabel(value) {
  var labels = { workspace: "工作区", agentPreset: "任务预设", model: "模型" };
  return labels[value] || value;
}

function capabilityLabel(key) {
  var labels = {
    unattendedExecution: "无人值守执行", markdownInbox: "Markdown 收件箱", scheduling: "调度",
    antiBlock: "自动恢复", retries: "失败重试", webhook: "Webhook", serverSentEvents: "SSE 实时事件",
    batchArchive: "批量归档", readTracking: "已读追踪", externalAiHttpApi: "外部 AI HTTP",
    strictHostIsolation: "严格宿主隔离", foregroundPreemption: "前台优先",
    nativeRuntimeMonitoring: "原生 Runtime 监控"
  };
  return labels[key] || key;
}

function EndpointCard(props) {
  return h("section", { className: "aq-endpoint" },
    h("span", null, props.label), h("code", null, props.value),
    h("button", { onClick: function () { props.onCopy(props.value, props.label + " "); }, "aria-label": "复制 " + props.label }, "复制")
  );
}
