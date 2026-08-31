import quietOrbit from "../assets/quiet-orbit.png";
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
    if (kind === "delete" || kind === "stop") {
      var prompt = kind === "delete" ? "确认删除这个待执行任务？此操作不可恢复。" : "确认停止运行中的任务？当前会话会被安全收口。";
      confirm[1]({
        title: kind === "delete" ? "删除任务" : "停止任务",
        message: prompt,
        confirmLabel: kind === "delete" ? "删除" : "停止",
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
        controller.doAction("archive", null, { keys: keys }).then(function () {
          selected[1]([]);
          flash("已归档 " + keys.length + " 个任务");
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
          onAccess: function () { accessOpen[1](true); },
          onScan: function () { runAction("force-scan"); }
        }),
        h(ErrorBanner, { error: snap.error || snap.transportError, onDismiss: function () { controller.clearError(); } }),
        h("div", { className: "aq-canvas" },
          h(RuntimeContract, { snap: snap }),
          h(OperationalBand, { snap: snap }),
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
      onClose: function () { controller.closeDetail(); }
    }),
    snap.showNewTask && h(NewTaskModal, {
      options: snap.options, onClose: function () { controller.closeNewTask(); },
      onCreate: function (data) { return controller.createTask(data); }
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
    accessOpen[0] && h(ApiAccessPanel, { onClose: function () { accessOpen[1](false); }, onCopied: flash }),
    confirm[0] && h(ConfirmModal, {
      title: confirm[0].title, message: confirm[0].message, confirmLabel: confirm[0].confirmLabel,
      onConfirm: confirm[0].onConfirm, onCancel: function () { confirm[1](null); }
    })
  );
}

function Sidebar(props) {
  var snap = props.snap;
  var ctrl = props.controller;
  var active = (snap.counts.pending || 0) + (snap.counts.running || 0) + (snap.counts.interrupted || 0);
  var navItems = [
    { key: "all", label: "任务队列", icon: "list", count: snap.tasks.filter(function (task) { return !task.archivedAt; }).length },
    { key: "active", label: "正在推进", icon: "play", count: active },
    { key: "cron", label: "循环调度", icon: "repeat", count: snap.tasks.filter(function (task) { return task.taskType === "cron" && !task.archivedAt; }).length },
    { key: "schedule", label: "定时执行", icon: "clock", count: snap.tasks.filter(function (task) { return task.taskType === "schedule" && !task.archivedAt; }).length },
    { key: "archived", label: "执行记录", icon: "archive", count: snap.tasks.filter(function (task) { return !!task.archivedAt; }).length }
  ];

  return h("aside", { className: "aq-sb", "aria-label": "任务工作台导航" },
    h("div", { className: "aq-brand" },
      h("span", { className: "aq-brand-mark", "aria-hidden": "true" }, h("i"), h("i")),
      h("span", null, h("strong", null, "AUTOQUEUE"), h("small", null, "UNATTENDED OPS"))
    ),
    h("nav", { className: "aq-nav" },
      h("span", { className: "aq-nav-label" }, "工作区"),
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
      h("div", { className: "aq-host-state" }, h("span", { className: "aq-live-dot" }), h("span", null, "隔离守卫在线")),
      h("p", null, "前台忙碌时暂停后台 turn"),
      h("span", { className: "aq-version" }, "v0.3 · DSH rc.2")
    )
  );
}

function Header(props) {
  return h("header", { className: "aq-head" },
    h("button", { className: "aq-icon-btn aq-mobile-menu", onClick: props.onMenu, "aria-label": "打开导航", dangerouslySetInnerHTML: { __html: iconHtml("list") } }),
    h("div", { className: "aq-head-title" },
      h("span", { className: "aq-eyebrow" }, "UNATTENDED TASK CONTROL"),
      h("h1", null, "无人值守任务台"),
      h("p", null, "安静执行，边界清晰")
    ),
    props.message && h("div", { className: "aq-toast", role: "status" }, props.message),
    h("div", { className: "aq-head-actions" },
      h("button", { className: "aq-btn ghost aq-hide-mobile", onClick: props.onAccess }, "AI / API 接入"),
      h("button", { className: "aq-icon-btn", onClick: props.onScan, title: "立即扫描", "aria-label": "立即扫描", dangerouslySetInnerHTML: { __html: iconHtml("scan") } }),
      h("button", { className: "aq-icon-btn", onClick: function () { props.controller.openConfig(); }, title: "运行设置", "aria-label": "运行设置", dangerouslySetInnerHTML: { __html: iconHtml("gear") } }),
      h("button", { className: "aq-btn primary aq-create", onClick: function () { props.controller.openNewTask(); }, dangerouslySetInnerHTML: { __html: iconHtml("plus") + " 新建任务" } }),
      h("button", { className: "aq-icon-btn aq-close-board", onClick: function () { props.controller.closeBoard(); }, title: "关闭任务台", "aria-label": "关闭任务台", dangerouslySetInnerHTML: { __html: iconHtml("close") } })
    )
  );
}

function RuntimeContract(props) {
  var snap = props.snap;
  var running = snap.metrics.running || 0;
  var foregroundPaused = snap.tasks.filter(function (task) { return task.foregroundPaused === true; }).length;
  var maxConcurrent = snap.config.maxConcurrent || 1;
  return h("section", { className: "aq-contract", "aria-label": "运行契约" },
    h("div", { className: "aq-contract-title" },
      h("span", { className: "aq-shield", "aria-hidden": "true" }, "◇"),
      h("div", null, h("strong", null, "运行契约"), h("small", null, "STRICT ISOLATION"))
    ),
    h(ContractItem, { label: "静默运行", detail: "不询问 · 不弹审批", tone: "safe" }),
    h(ContractItem, {
      label: "主进程优先",
      detail: foregroundPaused > 0 ? foregroundPaused + " 个后台 turn 已暂停" : "前台活跃即暂停后台 turn",
      tone: "safe"
    }),
    h("div", { className: "aq-worker-meter" },
      h("span", null, "后台工作位"),
      h("strong", null, running, h("small", null, " / ", maxConcurrent)),
      h("div", { className: "aq-worker-track", role: "progressbar", "aria-label": "后台工作位", "aria-valuemin": "0", "aria-valuemax": String(maxConcurrent), "aria-valuenow": String(running) },
        h("i", { style: { width: Math.min(100, running / Math.max(1, maxConcurrent) * 100) + "%" } })
      )
    ),
    h("div", { className: "aq-orbit-mini", "aria-hidden": "true" }, h("i"), h("i"), h("b"))
  );
}

function ContractItem(props) {
  return h("div", { className: "aq-contract-item " + props.tone },
    h("span", { className: "aq-check", "aria-hidden": "true" }, "✓"),
    h("div", null, h("strong", null, props.label), h("small", null, props.detail))
  );
}

function OperationalBand(props) {
  var snap = props.snap;
  var metrics = snap.metrics || {};
  var attention = snap.tasks.filter(taskNeedsAttention).length;
  var items = [
    { label: "执行中", value: metrics.running || 0, tone: "blue" },
    { label: "待派发", value: metrics.pending || 0 },
    { label: "需关注", value: attention, tone: attention ? "amber" : "" },
    { label: "24h 完成", value: metrics.done24h || 0, tone: "green" },
    { label: "成功率", value: (metrics.successRate || 0) + "%" },
    { label: "未读结果", value: snap.unreadCount || 0, tone: snap.unreadCount ? "blue" : "" }
  ];
  return h("section", { className: "aq-kpi", "aria-label": "运行摘要" },
    items.map(function (item) {
      return h("div", { className: "aq-kpi-card " + (item.tone || ""), key: item.label },
        h("span", { className: "l" }, item.label), h("strong", { className: "v" }, item.value)
      );
    })
  );
}

function QueueControls(props) {
  var counts = props.snap.counts || {};
  var tabs = [
    ["all", "全部", Object.keys(counts).reduce(function (sum, key) { return sum + counts[key]; }, 0)],
    ["running", "运行中", counts.running || 0],
    ["pending", "待执行", counts.pending || 0],
    ["failed", "已失败", counts.failed || 0],
    ["interrupted", "已中断", counts.interrupted || 0],
    ["done", "已完成", counts.done || 0]
  ];
  return h("div", { className: "aq-queue-tools" },
    h("label", { className: "aq-search" },
      h("span", { className: "aq-search-icon", "aria-hidden": "true" }, "⌕"),
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
    return h("section", { className: "aq-empty" },
      h("img", { src: quietOrbit, alt: "任务沿受控轨道安全进入队列的抽象插图" }),
      h("div", null,
        h("span", { className: "aq-eyebrow" }, "QUEUE IS QUIET"),
        h("h2", null, props.snap.filter === "all" ? "队列现在很安静" : "没有符合条件的任务"),
        h("p", null, "创建任务后，它会在不打扰前台工作的前提下自动推进。"),
        props.snap.filter === "all" && props.snap.navGroup === "all" && h("button", { className: "aq-btn primary", onClick: function () { props.controller.openNewTask(); } }, "创建第一个任务")
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
          key: task.key, task: task, selected: props.selected.indexOf(task.key) >= 0,
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
  var recent = task.status === "running"
    ? (task.foregroundPaused === true
      ? "等待 DSH 前台完成 · Goal 已安全暂停"
      : "第 " + (task.currentRound || 0) + "/" + (task.maxGoalRounds || "—") + " 轮 · " + elapseStr(task.startedAt))
    : (task.lastError ? String(task.lastError).slice(0, 54) : (task.updatedAt ? timeAgo(task.updatedAt) : "—"));
  var actions = taskActions(task);

  function openRow() { props.onDetail(task.key); }

  return h("article", {
    className: "aq-card aq-task-row status-" + task.status + (attention ? " attention" : "") + (props.selected ? " selected" : ""),
    tabIndex: 0, role: "button", "aria-label": "查看任务 " + task.key,
    onClick: openRow,
    onKeyDown: function (event) { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openRow(); } }
  },
    h("label", { className: "aq-select", onClick: function (event) { event.stopPropagation(); } },
      h("span", { className: "sr-only" }, "选择 " + task.key),
      h("input", { type: "checkbox", checked: props.selected, disabled: !selectable, onChange: function () { props.onSelect(task.key); } })
    ),
    h("div", { className: "aq-task-main" },
      h("div", { className: "aq-card-key" },
        isUnread(task) && h("span", { className: "unread", title: "未读结果" }),
        h("strong", null, task.key),
        h("span", { className: "aq-card-type", dangerouslySetInnerHTML: { __html: iconHtml(typeInfo.icon) + " " + typeInfo.label } })
      ),
      h("p", { className: "aq-card-summary" }, summary || "未填写摘要"),
      task.status === "running" && h(PulseRail, { task: task })
    ),
    h("div", { className: "aq-task-status" },
      h("span", { className: "aq-status-pill", style: { "--status-color": task.foregroundPaused === true ? "#27776e" : cfg.color } }, h("i"), attention ? "需关注" : (task.foregroundPaused === true ? "前台让行" : cfg.label)),
      task.nextRetryAt && h("small", null, "计划重试")
    ),
    h("div", { className: "aq-task-plan" }, h("strong", null, plan), task.nextRunAt && h("small", null, "下次 ", formatIso(task.nextRunAt))),
    h("div", { className: "aq-priority" }, h("i", { className: Number(task.priority || 5) >= 8 ? "high" : "" }), h("span", null, Number(task.priority || 5) >= 8 ? "高" : (Number(task.priority || 5) <= 3 ? "低" : "中"))),
    h("div", { className: "aq-recent" }, h("strong", null, recent), task.attempts > 0 && h("small", null, "尝试 ", task.attempts, " 次")),
    h("div", { className: "aq-row-actions", onClick: function (event) { event.stopPropagation(); } },
      task.status === "running" && h(ActionButton, { label: "停止 " + task.key, icon: "stop", tone: "danger", onClick: function () { props.onAction("stop", task.key); } }),
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

function ActionButton(props) {
  return h("button", {
    className: "aq-row-action " + (props.tone || ""), title: props.label, "aria-label": props.label, onClick: props.onClick,
    dangerouslySetInnerHTML: props.icon ? { __html: iconHtml(props.icon) } : undefined
  }, props.icon ? undefined : props.text);
}

function PulseRail(props) {
  var task = props.task;
  var phase = String(task.goalPhase || "active");
  var blocked = phase === "blocked" || (task.blockedResumes || 0) > 0;
  if (task.foregroundPaused === true) {
    return h("div", { className: "aq-pulse", "aria-label": "已暂停后台执行，等待 DSH 前台" },
      h("span", { className: "done" }, h("i"), "接收"),
      h("b", { className: "done" }),
      h("span", { className: "active" }, h("i"), "前台让行"),
      h("b"),
      h("span", null, h("i"), "安全续跑")
    );
  }
  return h("div", { className: "aq-pulse", "aria-label": "自治执行轨迹" },
    h("span", { className: "done" }, h("i"), "接收"),
    h("b", { className: "done" }),
    h("span", { className: "active" }, h("i"), "推进"),
    h("b", { className: blocked ? "done" : "" }),
    h("span", { className: blocked ? "active" : "" }, h("i"), "反阻塞"),
    h("b"),
    h("span", null, h("i"), "收口")
  );
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
  var curl = "curl -H 'Authorization: Bearer $AUTOQUEUE_TOKEN' \\\n  '" + queueBase + "/state?archived=1&compact=1'";

  function copy(value, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(function () { props.onCopied(label + "已复制"); });
    }
  }

  return h(DialogShell, {
    variant: "drawer", title: "AI / API 接入", onClose: props.onClose, className: "aq-access-panel",
    renderTitle: function (args) {
      return h("div", { className: "aq-d-hd aq-access-hd" },
        h("div", null, h("span", { className: "aq-eyebrow" }, "EXTERNAL AUTOMATION"), h("h3", { id: args.id }, args.title), h("p", null, "给外部 AI 一份稳定、可发现的机器契约")),
        h("button", { className: "aq-d-close", onClick: props.onClose, "aria-label": "关闭接入面板", dangerouslySetInnerHTML: { __html: iconHtml("close") } })
      );
    }
  },
    h("div", { className: "aq-access-body" },
      h("img", { className: "aq-access-art", src: quietOrbit, alt: "受控任务入口与安全轨道抽象图" }),
      h("section", { className: "aq-access-intro" },
        h("span", { className: "aq-security-badge" }, "TOKEN REQUIRED"),
        h("h4", null, "HTTP 是外部 AI 的稳定边界"),
        h("p", null, "插件不会向页面回显 token。外部 Agent 可先读取 capabilities 或 OpenAPI，再按需调用任务与配置接口。")
      ),
      h(EndpointCard, { label: "Capabilities", value: discoveryBase + "/capabilities", onCopy: copy }),
      h(EndpointCard, { label: "OpenAPI 3.1", value: discoveryBase + "/openapi.json", onCopy: copy }),
      h("section", { className: "aq-code-block" },
        h("div", null, h("strong", null, "快速验证"), h("button", { onClick: function () { copy(curl, "curl "); } }, "复制")),
        h("pre", null, curl)
      ),
      h("section", { className: "aq-access-actions" },
        h("h4", null, "已暴露的能力"),
        h("div", null, ["创建 / 更新", "查询 / 详情", "停止 / 重跑", "归档 / 恢复", "强制扫描", "并发配置", "标记已读", "SSE 订阅"].map(function (label) { return h("span", { key: label }, label); }))
      ),
      h("p", { className: "aq-access-note" }, "隔离约束：DSH rc.2 不提供会话级模型切换，因此外部接口不会接受 model、workspace 或任意 preset 覆盖。")
    )
  );
}

function EndpointCard(props) {
  return h("section", { className: "aq-endpoint" },
    h("span", null, props.label), h("code", null, props.value),
    h("button", { onClick: function () { props.onCopy(props.value, props.label + " "); }, "aria-label": "复制 " + props.label }, "复制")
  );
}
