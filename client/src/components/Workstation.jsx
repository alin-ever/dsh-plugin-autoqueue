import { iconHtml, isUnread, taskSummary, cronToHuman, elapseStr, formatIso, timeAgo, STATUS_CONFIG, TASK_TYPE_LABELS } from "../utils.js";
import { TaskDetailPanel } from "./TaskDetail.jsx";
import { NewTaskModal, EditTaskModal, ConfigPanel, ConfirmModal } from "./Modals.jsx";

export function Workstation(props) {
  var controller = props.controller;
  var transport = props.transport;
  var sessions = props.sessions;
  var state = React.useState(function () { return controller.getSnapshot(); });
  var setState = state[1];

  React.useEffect(function () {
    return controller.subscribe(function () {
      setState(controller.getSnapshot());
    });
  }, []);

  var snap = state[0];

  var confirm = React.useState(null);
  var msg = React.useState(null);

  function handleAction(kind, key) {
    if (kind === "delete") {
      confirm[1]({ message: "\u786E\u8BA4\u5220\u9664\u4EFB\u52A1\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002", onConfirm: function () { controller.doAction(kind, key); confirm[1](null); } });
    } else if (kind === "stop") {
      confirm[1]({ message: "\u786E\u8BA4\u505C\u6B62\u8FD0\u884C\u4E2D\u7684\u4EFB\u52A1\uFF1F", onConfirm: function () { controller.doAction(kind, key); confirm[1](null); } });
    } else if (kind === "force-scan") {
      controller.doAction(kind, key);
      msg[1]("\u6B63\u5728\u626B\u63CF\u6536\u4EF6\u7BB1...");
      setTimeout(function () { msg[1](null); }, 2500);
    } else {
      controller.doAction(kind, key);
    }
  }

  return React.createElement("div", { "data-dsh-autoqueue-view": "" },
    React.createElement("div", { className: "aq-ws" },
      React.createElement(Sidebar, { snap: snap, controller: controller }),
      React.createElement("div", { className: "aq-main" },
        React.createElement(Toolbar, { snap: snap, controller: controller, msg: msg[0] }),
        React.createElement(ErrorBanner, { error: snap.error || snap.transportError, onDismiss: function () { controller.clearError(); } }),
        React.createElement(KpiRow, { metrics: snap.metrics }),
        React.createElement(StatusTabs, { counts: snap.counts, filter: snap.filter, onFilter: function (f) { controller.setFilter(f); } }),
        React.createElement(TaskList, { snap: snap, controller: controller, sessions: sessions, onAction: handleAction })
      )
    ),
    snap.showDetail && snap.detailTask && React.createElement(TaskDetailPanel, { task: snap.detailTask, transport: transport, controller: controller, onClose: function () { controller.closeDetail(); } }),
    snap.showNewTask && React.createElement(NewTaskModal, { options: snap.options, onClose: function () { controller.closeNewTask(); }, onCreate: function (data) { controller.createTask(data); } }),
    snap.showEdit && snap.editTask && React.createElement(EditTaskModal, { task: snap.editTask, onClose: function () { controller.closeEdit(); }, onUpdate: function (key, patch) { controller.updateTask(key, patch); } }),
    snap.showConfig && React.createElement(ConfigPanel, { config: snap.config, options: snap.options, onClose: function () { controller.closeConfig(); }, onUpdate: function (patch) { controller.updateConfig(patch); }, onSetConcurrency: function (n) { controller.setConcurrency(n); } }),
    confirm[0] && React.createElement(ConfirmModal, { message: confirm[0].message, onConfirm: confirm[0].onConfirm, onCancel: function () { confirm[1](null); } })
  );
}

function Sidebar(props) {
  var snap = props.snap;
  var ctrl = props.controller;

  var navItems = [
    { key: "all", label: "\u5168\u90E8\u4EFB\u52A1", icon: "list", count: snap.tasks.filter(function (t) { return !t.archivedAt; }).length },
    { key: "active", label: "\u6D3B\u8DC3\u4EFB\u52A1", icon: "play", count: (snap.counts.pending || 0) + (snap.counts.running || 0) },
    { key: "cron", label: "\u5FAA\u73AF\u8C03\u5EA6", icon: "repeat", count: snap.tasks.filter(function (t) { return t.taskType === "cron" && !t.archivedAt; }).length },
    { key: "schedule", label: "\u5B9A\u65F6\u6267\u884C", icon: "clock", count: snap.tasks.filter(function (t) { return t.taskType === "schedule" && !t.archivedAt; }).length },
    { key: "manual", label: "\u624B\u52A8\u89E6\u53D1", icon: "play", count: snap.tasks.filter(function (t) { return t.taskType === "manual" && !t.archivedAt; }).length },
    { key: "archived", label: "\u5DF2\u5F52\u6863", icon: "archive", count: snap.tasks.filter(function (t) { return !!t.archivedAt; }).length }
  ];

  return React.createElement("div", { className: "aq-sb" },
    React.createElement("div", { className: "aq-sb-hd", dangerouslySetInnerHTML: { __html: iconHtml("inbox") + " \u4EFB\u52A1\u5DE5\u4F5C\u53F0" } }),
    navItems.map(function (item) {
      return React.createElement("button", {
        key: item.key,
        className: "aq-nav-item" + (snap.navGroup === item.key ? " sel" : ""),
        onClick: function () { ctrl.setNavGroup(item.key); ctrl.setFilter("all"); }
      },
        React.createElement("span", { className: "aq-nav-svg", dangerouslySetInnerHTML: { __html: iconHtml(item.icon) } }),
        item.label,
        React.createElement("span", { className: "aq-nav-badge" }, item.count)
      );
    })
  );
}

function Toolbar(props) {
  var snap = props.snap;
  var ctrl = props.controller;
  var navLabels = {
    all: "\u5168\u90E8\u4EFB\u52A1", active: "\u6D3B\u8DC3\u4EFB\u52A1", cron: "\u5FAA\u73AF\u8C03\u5EA6", schedule: "\u5B9A\u65F6\u6267\u884C", manual: "\u624B\u52A8\u89E6\u53D1", archived: "\u5DF2\u5F52\u6863"
  };
  var title = navLabels[snap.navGroup] || "\u4EFB\u52A1\u5DE5\u4F5C\u53F0";

  return React.createElement("div", { className: "aq-tbar" },
    React.createElement("button", { className: "aq-btn", onClick: function () { ctrl.closeBoard(); }, style: { fontSize: "16px", padding: "2px 8px", minWidth: "28px" }, dangerouslySetInnerHTML: { __html: "\u2039" }, title: "\u5173\u95ED\u5DE5\u4F5C\u53F0" }),
    React.createElement("span", { className: "aq-tbar-title" }, title),
    props.msg && React.createElement("span", { className: "aq-toast" }, props.msg),
    React.createElement("button", { className: "aq-btn", onClick: function () { ctrl.doAction("force-scan"); }, dangerouslySetInnerHTML: { __html: iconHtml("scan") + " \u7ACB\u5373\u626B\u63CF" } }),
    React.createElement("button", { className: "aq-btn", onClick: function () { ctrl.openConfig(); }, dangerouslySetInnerHTML: { __html: iconHtml("gear") + " \u914D\u7F6E" } }),
    React.createElement("button", { className: "aq-btn primary", onClick: function () { ctrl.openNewTask(); }, dangerouslySetInnerHTML: { __html: iconHtml("plus") + " \u65B0\u5EFA" } })
  );
}

function ErrorBanner(props) {
  if (!props.error) return null;
  return React.createElement("div", { className: "aq-err" },
    React.createElement("span", null, props.error),
    React.createElement("span", { className: "aq-err-dismiss", onClick: props.onDismiss, title: "\u5173\u95ED" }, "\u00D7")
  );
}

function KpiRow(props) {
  var m = props.metrics || {};
  return React.createElement("div", { className: "aq-kpi" },
    React.createElement("div", { className: "aq-kpi-card i" }, React.createElement("div", { className: "v" }, m.total || 0), React.createElement("div", { className: "l" }, "\u4EFB\u52A1\u603B\u6570")),
    React.createElement("div", { className: "aq-kpi-card" }, React.createElement("div", { className: "v" }, m.running || 0), React.createElement("div", { className: "l" }, "\u6267\u884C\u4E2D")),
    React.createElement("div", { className: "aq-kpi-card" }, React.createElement("div", { className: "v" }, m.pending || 0), React.createElement("div", { className: "l" }, "\u7B49\u5F85\u4E2D")),
    React.createElement("div", { className: "aq-kpi-card s" }, React.createElement("div", { className: "v" }, m.done || 0), React.createElement("div", { className: "l" }, "\u5DF2\u5B8C\u6210")),
    React.createElement("div", { className: "aq-kpi-card e" }, React.createElement("div", { className: "v" }, m.failed || 0), React.createElement("div", { className: "l" }, "\u5DF2\u5931\u8D25"))
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
  for (var k in counts) { total += counts[k]; }
  tabs[0].count = total;

  return React.createElement("div", { className: "aq-tabs" },
    tabs.map(function (tab) {
      return React.createElement("button", {
        key: tab.key,
        className: "aq-tab" + (filter === tab.key ? " sel" : ""),
        onClick: function () { props.onFilter(tab.key); }
      }, tab.label, React.createElement("span", { className: "aq-tab-count" }, tab.count));
    })
  );
}

function TaskList(props) {
  var snap = props.snap;
  if (snap.loading) return React.createElement("div", { className: "aq-loading" }, "\u52A0\u8F7D\u4E2D...");
  if (snap.filtered.length === 0) {
    return React.createElement("div", { className: "aq-empty" },
      React.createElement("div", { className: "aq-empty-icon" }, "\u{1F4CB}"),
      React.createElement("div", { className: "aq-empty-text" }, snap.filter === "all" ? "\u8FD8\u6CA1\u6709\u4EFB\u52A1" : "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u4EFB\u52A1"),
      snap.filter === "all" && snap.navGroup === "all" && React.createElement("button", { className: "aq-btn primary", onClick: function () { props.controller.openNewTask(); } }, "\u521B\u5EFA\u7B2C\u4E00\u4E2A\u4EFB\u52A1")
    );
  }
  return React.createElement("div", { className: "aq-list" },
    snap.filtered.map(function (task) {
      return React.createElement(TaskCard, {
        key: task.key, task: task, selected: snap.showDetail === task.key,
        onAction: props.onAction,
        onDetail: function (key) { props.controller.openDetail(key); },
        onEdit: function (key) { props.controller.openEdit(key); },
        onSession: function (sessionId) { props.controller.closeBoard(); props.sessions.open(sessionId); }
      });
    })
  );
}

function TaskCard(props) {
  var task = props.task;
  var cfg = STATUS_CONFIG[task.status] || { label: task.status, color: "#6b7280" };
  var unread = isUnread(task);
  var summary = taskSummary(task.body);
  var isRunning = task.status === "running";
  var typeInfo = TASK_TYPE_LABELS[task.taskType] || TASK_TYPE_LABELS.manual;

  var actions = [];
  if (task.status === "running") {
    actions.push(React.createElement("button", { key: "stop", className: "aq-btn danger", onClick: function (e) { e.stopPropagation(); props.onAction("stop", task.key); }, dangerouslySetInnerHTML: { __html: iconHtml("stop") } }));
  }
  if (task.status === "pending") {
    actions.push(React.createElement("button", { key: "edit", className: "aq-btn", onClick: function (e) { e.stopPropagation(); props.onEdit(task.key); }, dangerouslySetInnerHTML: { __html: iconHtml("edit") } }));
    actions.push(React.createElement("button", { key: "delete", className: "aq-btn danger", onClick: function (e) { e.stopPropagation(); props.onAction("delete", task.key); }, dangerouslySetInnerHTML: { __html: iconHtml("trash") } }));
  }
  if ((task.status === "done" || task.status === "failed" || task.status === "stopped") && !task.archivedAt) {
    actions.push(React.createElement("button", { key: "rerun", className: "aq-btn success", onClick: function (e) { e.stopPropagation(); props.onAction("rerun", task.key); }, dangerouslySetInnerHTML: { __html: iconHtml("repeat") } }));
    actions.push(React.createElement("button", { key: "archive", className: "aq-btn warn", onClick: function (e) { e.stopPropagation(); props.onAction("archive", task.key); }, dangerouslySetInnerHTML: { __html: iconHtml("archive") } }));
  }
  if (task.archivedAt) {
    actions.push(React.createElement("button", { key: "restore", className: "aq-btn", onClick: function (e) { e.stopPropagation(); props.onAction("restore", task.key); }, dangerouslySetInnerHTML: { __html: iconHtml("restore") } }));
  }
  var sessionId = task.sessionId || (task.executions && task.executions.length ? task.executions[task.executions.length - 1].sessionId : null);
  if (sessionId) {
    actions.push(React.createElement("button", { key: "session", className: "aq-btn", onClick: function (e) { e.stopPropagation(); props.onSession(sessionId); }, dangerouslySetInnerHTML: { __html: iconHtml("external") + " \u8DF3\u8F6C" } }));
  }

  var progressInfo = null;
  if (isRunning && task.maxGoalRounds) {
    var pct = Math.min(100, Math.round((task.currentRound || 0) / task.maxGoalRounds * 100));
    var phaseLabel = { active: "\u6267\u884C\u4E2D", running: "\u6267\u884C\u4E2D", blocked: "\u5DF2\u963B\u585E", paused: "\u5DF2\u6682\u505C", complete: "\u5DF2\u5B8C\u6210" }[task.goalPhase] || "";
    progressInfo = React.createElement("div", { className: "aq-progress" },
      React.createElement("div", { className: "aq-progress-bar" },
        React.createElement("div", { className: "aq-progress-fill", style: { width: pct + "%" } })
      ),
      React.createElement("div", { className: "aq-progress-info" },
        React.createElement("span", null, "\u8F6E " + (task.currentRound || 0) + "/" + task.maxGoalRounds + " \u00B7 " + elapseStr(task.startedAt)),
        phaseLabel && React.createElement("span", { className: "aq-goal-phase" }, phaseLabel)
      )
    );
  }

  return React.createElement("div", {
    className: "aq-card" + (props.selected ? " sel" : ""),
    onClick: function () { props.onDetail(task.key); }
  },
    React.createElement("span", { className: "aq-card-dot", style: { background: cfg.color } }),
    React.createElement("div", { className: "aq-card-body" },
      React.createElement("div", { className: "aq-card-hd" },
        React.createElement("span", { className: "aq-card-key" },
          unread && React.createElement("span", { className: "unread" }),
          task.key
        ),
        React.createElement("span", { className: "aq-card-type", dangerouslySetInnerHTML: { __html: iconHtml(typeInfo.icon) + " " + typeInfo.label } })
      ),
      summary && React.createElement("div", { className: "aq-card-summary" }, summary),
      React.createElement("div", { className: "aq-card-meta" },
        React.createElement("span", { className: "aq-card-meta-item", style: { color: cfg.color } }, cfg.label),
        task.cron && React.createElement("span", { className: "aq-card-meta-item", dangerouslySetInnerHTML: { __html: iconHtml("repeat") + " " + cronToHuman(task.cron) } }),
        task.schedule && React.createElement("span", { className: "aq-card-meta-item", dangerouslySetInnerHTML: { __html: iconHtml("clock") + " " + formatIso(task.schedule) } }),
        task.nextRunAt && React.createElement("span", { className: "aq-card-meta-item", dangerouslySetInnerHTML: { __html: iconHtml("clock") + " \u4E0B\u6B21: " + formatIso(task.nextRunAt) } }),
        task.attempts > 0 && React.createElement("span", { className: "aq-card-meta-item" }, "\u5C1D\u8BD5 " + task.attempts + " \u6B21"),
        task.blockedResumes > 0 && React.createElement("span", { className: "aq-card-meta-item" }, "\u53CD\u963B\u585E " + task.blockedResumes + " \u6B21"),
        task.updatedAt && React.createElement("span", { className: "aq-card-meta-item" }, timeAgo(task.updatedAt))
      ),
      progressInfo
    ),
    actions.length > 0 && React.createElement("div", { className: "aq-card-actions" }, actions)
  );
}