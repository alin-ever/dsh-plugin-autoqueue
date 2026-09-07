import { Checkbox, Field, Input } from "@headlessui/react";
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
  var snap = state[0];

  React.useEffect(function () {
    return controller.subscribe(function () { state[1](controller.getSnapshot()); });
  }, []);

  var normalizedQuery = query[0].trim().toLowerCase();
  var visibleTasks = snap.filtered.filter(function (task) {
    if (!normalizedQuery) return true;
    return [task.key, task.summary, task.body, task.status].some(function (v) {
      return typeof v === "string" && v.toLowerCase().indexOf(normalizedQuery) >= 0;
    });
  });

  React.useEffect(function () {
    selected[1](function (keys) {
      return keys.filter(function (k) {
        return snap.tasks.some(function (t) { return t.key === k && !t.archivedAt && t.status !== "running"; });
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
      var prompt = kind === "delete" ? "确认删除这个待执行任务？此操作不可恢复。"
        : (kind === "stop" ? "确认停止运行中的任务？当前会话会安全结束。"
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
      return keys.indexOf(key) >= 0 ? keys.filter(function (x) { return x !== key; }) : keys.concat(key);
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
          var failed = results.filter(function (x) { return !x.ok; });
          var succeeded = results.length ? results.length - failed.length : keys.length;
          selected[1](failed.map(function (x) { return x.key; }));
          flash(failed.length ? "已归档 " + succeeded + " 个，" + failed.length + " 个未归档" : "已归档 " + succeeded + " 个任务");
        }).catch(function () {});
      }
    });
  }

  return h("div", { className: "flex flex-col h-full overflow-hidden" },
    h(CompactHeader, {
      snap: snap, message: message[0],
      onNewTask: function () { controller.openNewTask(); },
      onConfig: function () { controller.openConfig(); },
      onClose: function () { controller.closeBoard(); },
      onScan: function () { runAction("force-scan"); }
    }),
    h(QuickStats, { snap: snap }),
    h(CompactFilters, {
      snap: snap, query: query[0], onQuery: query[1],
      onFilter: function (v) { controller.setFilter(v); },
      onNewTask: function () { controller.openNewTask(); }
    }),
    selected[0].length > 0 && h("div", { className: "flex items-center gap-2 px-4 py-2 bg-aq-blue-soft border-b border-aq-blue/20" },
      h("span", { className: "text-xs font-semibold text-aq-blue mr-auto" }, "已选择 ", selected[0].length, " 个"),
      h("button", { className: "text-xs font-semibold text-aq-blue hover:underline", onClick: function () { selected[1]([]); } }, "取消"),
      h("button", { className: "aq-btn aq-btn-primary text-xs h-7 px-3", onClick: archiveSelected }, "批量归档")
    ),
    h(CompactTaskList, {
      snap: snap, tasks: visibleTasks, controller: controller,
      selected: selected[0], onSelect: toggleSelected, onAction: handleAction
    }),
    snap.showDetail && snap.detailTask && h(TaskDetailPanel, {
      key: snap.detailTask.key, task: snap.detailTask, transport: transport, controller: controller, sessions: sessions,
      onClose: function () { controller.closeDetail(); },
      onActionRequest: function (kind, key) { controller.closeDetail(); handleAction(kind, key); }
    }),
    snap.showNewTask && h(NewTaskModal, {
      transport: transport, options: snap.options, config: snap.config,
      onClose: function () { controller.closeNewTask(); },
      onCreate: function (data) {
        return controller.createTask(data).then(function (result) {
          var key = result && result.key ? result.key : (data.key || "新任务");
          var ts = result && result.taskState;
          var phase = "状态已同步";
          if (ts) {
            if (ts.archivedAt) phase = ts.status === "done" ? "已完成并归档" : "已结束并归档";
            else if (ts.status === "running") phase = "已开始执行";
            else if (ts.status === "done") phase = "已完成";
            else if (ts.status === "failed") phase = "执行失败，请查看详情";
            else if (ts.status === "pending") phase = data.schedule ? "已安排定时执行" : (data.cron ? "已启用循环调度" : "等待执行");
          }
          flash("已入队：" + key + " · " + (result.stateRefreshed === false ? "页面刷新失败" : phase));
          return result;
        });
      }
    }),
    snap.showEdit && snap.editTask && h(EditTaskModal, {
      task: snap.editTask, options: snap.options,
      onClose: function () { controller.closeEdit(); },
      onUpdate: function (key, patch) { return controller.updateTask(key, patch); }
    }),
    snap.showConfig && h(ConfigPanel, {
      config: snap.config, options: snap.options,
      onClose: function () { controller.closeConfig(); },
      onUpdate: function (patch) { return controller.updateConfig(patch); },
      onSetConcurrency: function (n) { return controller.setConcurrency(n); }
    }),
    confirm[0] && h(ConfirmModal, {
      title: confirm[0].title, message: confirm[0].message, confirmLabel: confirm[0].confirmLabel, tone: confirm[0].tone,
      onConfirm: confirm[0].onConfirm, onCancel: function () { confirm[1](null); }
    })
  );
}

// ─── Compact Header ──────────────────────────────────────

function CompactHeader(props) {
  var snap = props.snap;
  var running = snap.metrics.running || 0;
  var pending = snap.metrics.pending || 0;
  var total = snap.tasks.filter(function (t) { return !t.archivedAt; }).length;

  return h("header", { className: "flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-aq-line bg-aq-paper" },
    h("div", { className: "flex items-center gap-2.5 mr-auto" },
      h("span", { className: "flex items-center gap-1.5 text-sm font-bold text-aq-ink" },
        h("span", { className: "w-4 h-4 flex-shrink-0", dangerouslySetInnerHTML: { __html: iconHtml("list") } }),
        "任务队列"
      ),
      total > 0 && h("span", { className: "text-xs text-aq-muted" },
        running > 0 ? running + " 运行中" : (pending > 0 ? pending + " 等待中" : total + " 个任务")
      )
    ),
    props.message && h("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-b-lg bg-aq-navy text-white text-xs shadow-lg z-50" }, props.message),
    h("button", { className: "aq-btn aq-btn-ghost h-7 text-xs", onClick: props.onScan, title: "立即扫描收件箱", dangerouslySetInnerHTML: { __html: iconHtml("scan") + " 扫描" } }),
    h("button", { className: "aq-btn aq-btn-ghost h-7 text-xs", onClick: props.onConfig, title: "运行设置", dangerouslySetInnerHTML: { __html: iconHtml("gear") } }),
    h("button", { className: "aq-btn aq-btn-ghost h-7 text-xs", onClick: props.onClose, dangerouslySetInnerHTML: { __html: iconHtml("close") + " 关闭" } })
  );
}

// ─── Quick Stats Bar ─────────────────────────────────────

function QuickStats(props) {
  var snap = props.snap;
  var running = snap.metrics.running || 0;
  var pending = snap.metrics.pending || 0;
  var done24h = snap.metrics.done24h || 0;
  var isolation = snap.isolationHealth || {};

  return h("div", { className: "flex-shrink-0 grid grid-cols-4 border-b border-aq-line" },
    h(StatCell, { label: "运行中", value: String(running), color: running > 0 ? "text-aq-blue" : "text-aq-faint" }),
    h(StatCell, { label: "等待中", value: String(pending), color: pending > 0 ? "text-aq-muted" : "text-aq-faint" }),
    h(StatCell, { label: "24h 完成", value: String(done24h), color: done24h > 0 ? "text-aq-green" : "text-aq-faint" }),
    h(StatCell, { label: "隔离", value: isolation.verified ? "已启用" : "待确认", color: isolation.verified ? "text-aq-green" : "text-aq-amber" })
  );
}

function StatCell(props) {
  return h("div", { className: "flex flex-col items-center py-2 px-2 border-r border-aq-line last:border-r-0" },
    h("span", { className: "text-base font-bold leading-none " + props.color }, props.value),
    h("span", { className: "text-xs text-aq-faint mt-0.5" }, props.label)
  );
}

// ─── Compact Filters ─────────────────────────────────────

function CompactFilters(props) {
  var snap = props.snap;
  var sc = snap.scopeCounts || {};
  var tabs = [
    ["all", "全部", (snap.scoped || []).length],
    ["running", "运行中", sc.running || 0],
    ["pending", "待执行", sc.pending || 0],
    ["failed", "失败", sc.failed || 0],
    ["done", "已完成", sc.done || 0]
  ];

  return h("div", { className: "flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b border-aq-line" },
    h("div", { className: "flex-1" },
      h(Field, null,
        h(Input, {
          type: "search", value: props.query, onChange: function (e) { props.onQuery(e.target.value); },
          placeholder: "搜索任务…",
          className: "w-full h-8 px-3 rounded-lg border border-aq-line bg-aq-surface-alt text-sm text-aq-ink outline-none focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 placeholder:text-aq-faint"
        })
      )
    ),
    h("div", { className: "flex gap-0.5 p-0.5 rounded-lg bg-aq-surface-alt border border-aq-line" },
      tabs.map(function (t) {
        return h("button", {
          key: t[0],
          className: "px-2.5 py-1 rounded-md text-xs font-semibold transition " +
            (snap.filter === t[0] ? "bg-aq-paper text-aq-ink shadow-sm" : "text-aq-muted hover:text-aq-ink"),
          onClick: function () { props.onFilter(t[0]); }
        }, t[1], t[2] > 0 ? h("span", { className: "ml-1 opacity-60" }, t[2]) : null);
      })
    ),
    h("button", {
      className: "aq-btn aq-btn-primary h-7 text-xs flex-shrink-0",
      onClick: props.onNewTask,
      dangerouslySetInnerHTML: { __html: iconHtml("plus") + " 新建" }
    })
  );
}

// ─── Compact Task List ───────────────────────────────────

function CompactTaskList(props) {
  if (props.snap.loading) {
    return h("div", { className: "flex flex-col items-center justify-center flex-1 gap-3 py-12" },
      h("div", { className: "w-5 h-5 border-2 border-aq-line-2 border-t-aq-blue rounded-full animate-spin" }),
      h("span", { className: "text-sm text-aq-muted" }, "正在读取任务账本…")
    );
  }
  if (!props.tasks.length) {
    return h("div", { className: "flex flex-col items-center justify-center flex-1 py-12 gap-2" },
      h("p", { className: "text-sm text-aq-muted" }, "还没有任务"),
      h("button", { className: "aq-btn aq-btn-primary text-xs", onClick: function () { props.controller.openNewTask(); } }, "创建第一个任务")
    );
  }
  return h("div", { className: "flex-1 overflow-y-auto" },
    h("table", { className: "w-full table-fixed" },
      h("colgroup", null,
        h("col", { style: { width: "32px" } }),
        h("col", null),
        h("col", { style: { width: "48px" } }),
        h("col", { style: { width: "56px" } }),
        h("col", { style: { width: "130px" } }),
        h("col", { style: { width: "100px" } })
      ),
      h("thead", null,
        h("tr", { className: "border-b border-aq-line bg-aq-surface-alt" },
          h("th", { className: "pl-4 py-1.5 text-xs" }),
          h("th", { className: "text-left py-1.5 text-xs font-semibold text-aq-faint uppercase tracking-wide" }, "任务"),
          h("th", { className: "py-1.5 text-xs font-semibold text-aq-faint uppercase tracking-wide text-center" }, "类型"),
          h("th", { className: "py-1.5 text-xs font-semibold text-aq-faint uppercase tracking-wide text-center" }, "调度"),
          h("th", { className: "pr-4 py-1.5 text-xs font-semibold text-aq-faint uppercase tracking-wide text-right" }, "状态"),
          h("th", { className: "pr-4 py-1.5 text-xs font-semibold text-aq-faint uppercase tracking-wide text-right" }, "操作")
        )
      ),
      h("tbody", { className: "divide-y divide-aq-line" },
        props.tasks.map(function (task) {
          return h(TaskRow, {
            key: task.key, task: task, snap: props.snap,
            selected: props.selected.indexOf(task.key) >= 0,
            onSelect: props.onSelect, onAction: props.onAction,
            onDetail: function (k) { props.controller.openDetail(k); },
            onEdit: function (k) { props.controller.openEdit(k); },
            onUnread: function (k) { props.controller.markRead(k, false); },
            onSession: function (sid) { props.controller.closeBoard(); props.sessions.open(sid); }
          });
        })
      )
    )
  );
}

// ─── Task Row ────────────────────────────────────────────

function TaskRow(props) {
  var task = props.task;
  var cfg = STATUS_CONFIG[task.status] || { label: task.status, color: "#596579" };
  var summary = task.title || task.summary || taskSummary(task.body);
  var typeInfo = TASK_TYPE_LABELS[task.taskType] || TASK_TYPE_LABELS.manual;
  var attention = taskNeedsAttention(task);
  var selectable = task.status !== "running" && !task.archivedAt;
  var sessionId = task.sessionId || task.lastSessionId || (task.executions && task.executions.length ? task.executions[task.executions.length - 1].sessionId : null);

  var plan = task.cron ? cronToHuman(task.cron) : (task.schedule ? formatIso(task.schedule) : "即时");
  var nextRun = task.nextRunAt ? formatIso(task.nextRunAt) : null;

  var recentLine = task.status === "pending" ? pendingReasonCompact(task, props.snap)
    : (task.status === "running" ? (task.foregroundPaused ? "已暂停" : "第 " + (task.currentRound || 0) + " 轮 · " + elapseStr(task.startedAt))
    : (task.status === "done" ? (task.currentRound ? "第 " + task.currentRound + " 轮完成" : "已完成") + " · " + (task.updatedAt ? timeAgo(task.updatedAt) : "")
    : (task.status === "failed" ? (task.lastError ? String(task.lastError).slice(0, 40) : "已失败")
    : (task.status === "stopped" ? "已停止"
    : (task.lastError ? String(task.lastError).slice(0, 40) : (task.updatedAt ? timeAgo(task.updatedAt) : "-"))))));

  var actions = taskActions(task);
  var statusColor = task.stopPending ? "#9a6700" : (task.foregroundPaused ? "#27776e" : cfg.color);

  function openRow() { props.onDetail(task.key); }

  return h("tr", {
    className: "hover:bg-aq-surface-alt cursor-pointer transition group align-top " +
      (props.selected ? "bg-aq-blue-soft" : ""),
    onClick: openRow
  },
h("td", { className: "pl-4 py-1.5 align-top", onClick: function (e) { e.stopPropagation(); }, style: { fontSize: "12px" } },
      h(Checkbox, { checked: props.selected, disabled: !selectable, onChange: function () { props.onSelect(task.key); },
        className: "group/box flex items-center" },
        h("span", { className: "flex h-4 w-4 items-center justify-center rounded border transition " +
          (props.selected ? "border-aq-blue bg-aq-blue" : "border-aq-line-2 bg-white") +
          (!selectable ? " opacity-40" : " cursor-pointer group-hover/box:border-aq-blue") },
          props.selected && h("svg", { className: "h-3 w-3 text-white", viewBox: "0 0 12 12", fill: "none" },
            h("path", { d: "M2.5 6l2.5 2.5 4.5-4.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })
          )
        )
      )
    ),
    h("td", { className: "py-1.5 align-top break-words", style: { fontSize: "12px" } },
      h("div", { className: "flex items-center gap-1.5" },
        h("span", { className: "font-semibold text-aq-ink leading-snug" }, attention ? "! " + task.key : task.key),
        summary && h("span", { className: "text-aq-muted leading-snug" }, "· " + summary)
      )
    ),
    h("td", { className: "py-1.5 text-aq-faint text-center align-top", style: { fontSize: "12px" } }, typeInfo.label),
    h("td", { className: "py-1.5 text-aq-faint text-center align-top", style: { fontSize: "12px" } },
      plan,
      nextRun && h("div", { className: "text-aq-faint" }, nextRun)
    ),
    h("td", { className: "py-1.5 pr-4 text-right align-top " + (attention ? "text-aq-amber font-medium" : "text-aq-faint"), style: { fontSize: "12px" } },
      recentLine
    ),
h("td", { className: "py-1.5 pr-4 text-right align-top", style: { fontSize: "12px" } },
      h("div", { className: "flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition" },
        task.status === "running" && task.stopPending !== true && !task.archivedAt && h("button", { className: "aq-btn aq-btn-ghost h-6 px-2 text-xs text-aq-red", onClick: function (e) { e.stopPropagation(); props.onAction("stop", task.key); } }, "停止"),
        task.status === "pending" && !task.archivedAt && h("button", { className: "aq-btn aq-btn-ghost h-6 px-2 text-xs", onClick: function (e) { e.stopPropagation(); props.onEdit(task.key); } }, "编辑"),
        actions.indexOf("rerun") >= 0 && h("button", { className: "aq-btn aq-btn-ghost h-6 px-2 text-xs text-aq-green", onClick: function (e) { e.stopPropagation(); props.onAction("rerun", task.key); } }, "重跑"),
        actions.indexOf("archive") >= 0 && h("button", { className: "aq-btn aq-btn-ghost h-6 px-2 text-xs", onClick: function (e) { e.stopPropagation(); props.onAction("archive", task.key); } }, "归档"),
        task.archivedAt && h("button", { className: "aq-btn aq-btn-ghost h-6 px-2 text-xs", onClick: function (e) { e.stopPropagation(); props.onAction("restore", task.key); } }, "还原"),
        task.status === "pending" && !task.archivedAt && h("button", { className: "aq-btn aq-btn-ghost h-6 px-2 text-xs text-aq-red", onClick: function (e) { e.stopPropagation(); props.onAction("delete", task.key); } }, "删除"),
        sessionId && !task.archivedAt && h("button", { className: "aq-btn aq-btn-ghost h-6 px-2 text-xs", onClick: function (e) { e.stopPropagation(); props.controller.closeBoard(); props.sessions.open(sessionId); } }, "会话")
      )
    )
  );
}

function pendingReasonCompact(task, snap) {
  var now = Date.now();
  var retryAt = task.nextRetryAt ? new Date(task.nextRetryAt).getTime() : NaN;
  if (Number.isFinite(retryAt) && retryAt > now) return "等待重试";
  if (task.schedule && new Date(task.schedule).getTime() > now) return "等待定时";
  if (task.cron) return "等待调度";
  var running = snap && snap.metrics ? Number(snap.metrics.running || 0) : 0;
  var max = snap && snap.config ? Number(snap.config.maxConcurrent || 1) : 1;
  if (running >= max) return "排队中";
  return "等待执行";
}

function taskActions(task) {
  var a = [];
  if (["done", "failed", "stopped", "interrupted"].indexOf(task.status) >= 0 && !task.archivedAt) a.push("rerun");
  if (task.status !== "running" && !task.archivedAt) a.push("archive");
  return a;
}

function taskNeedsAttention(task) {
  var phase = String(task.goalPhase || "");
  return task.status === "failed" || task.status === "interrupted" ||
    phase.indexOf("uncertain") >= 0 || phase.indexOf("containment") >= 0 ||
    !!task._goalAdmissionUncertain || !!task._promptAdmissionUncertain;
}