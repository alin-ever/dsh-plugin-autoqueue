import { Checkbox, Field, Input } from "@headlessui/react";
import { iconHtml, isUnread, taskSummary, cronToHuman, STATUS_CONFIG } from "../utils.js";
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

  function toggleAll() {
    var selectable = visibleTasks.filter(function (t) { return t.status !== "running" && !t.archivedAt; });
    var allSelected = selectable.every(function (t) { return selected[0].indexOf(t.key) >= 0; });
    selected[1](allSelected ? [] : selectable.map(function (t) { return t.key; }));
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
    h(NavCategories, { snap: snap, onNav: function (v) { controller.setNavGroup(v); } }),
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
      snap: snap, tasks: visibleTasks, controller: controller, sessions: sessions,
      selected: selected[0], onSelect: toggleSelected, onSelectAll: toggleAll, onAction: handleAction
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
  return h("header", { className: "flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-aq-line bg-aq-paper" },
    h("div", { className: "flex items-center gap-2.5 mr-auto" },
      h("span", { className: "flex items-center gap-1.5 text-sm font-bold text-aq-ink" },
        h("span", { className: "w-4 h-4 flex-shrink-0", dangerouslySetInnerHTML: { __html: iconHtml("list") } }),
        "任务队列"
      )
    ),
    props.message && h("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-b-lg bg-aq-navy text-white text-xs shadow-lg z-50" }, props.message),
    h("button", { className: "aq-btn aq-btn-ghost h-7 text-xs", onClick: props.onScan, title: "立即扫描收件箱", dangerouslySetInnerHTML: { __html: iconHtml("scan") + " 扫描" } }),
    h("button", { className: "aq-btn aq-btn-ghost h-7 text-xs", onClick: props.onConfig, title: "运行设置", dangerouslySetInnerHTML: { __html: iconHtml("gear") } }),
    h("button", { className: "aq-btn aq-btn-ghost h-7 text-xs", onClick: props.onClose, dangerouslySetInnerHTML: { __html: iconHtml("close") + " 关闭" } })
  );
}

// ─── Category Navigation ─────────────────────────────────

function NavCategories(props) {
  var snap = props.snap;
  var all = snap.tasks || [];
  var active = all.filter(function (t) { return !t.archivedAt; });
  var archived = all.filter(function (t) { return !!t.archivedAt; });
  var cronTasks = active.filter(function (t) { return t.cron; });
  var manualTasks = active.filter(function (t) { return !t.cron; });
  var done24h = snap.metrics.done24h || 0;
  var cats = [
    ["all", "全部", active.length],
    ["cron", "定时任务", cronTasks.length],
    ["manual", "即时任务", manualTasks.length],
    ["archived", "归档", archived.length],
  ];

  return h("div", { className: "flex-shrink-0 flex items-center gap-0 px-4 py-1.5 border-b border-aq-line overflow-x-auto" },
    cats.map(function (c) {
      var isActive = snap.navGroup === c[0] || (snap.navGroup === "all" && c[0] === "all");
      return h("button", {
        key: c[0],
        className: "px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition " +
          (isActive ? "bg-aq-blue text-white" : "text-aq-muted hover:text-aq-ink hover:bg-aq-surface-alt"),
        onClick: function () { props.onNav(c[0]); }
      }, c[1], c[2] > 0 ? h("span", { className: "ml-1 opacity-70" }, c[2]) : null);
    }),
    done24h > 0 && h("span", { className: "ml-auto flex items-center gap-1.5 text-xs whitespace-nowrap" },
      h("span", { className: "w-1.5 h-1.5 rounded-full bg-aq-green" }),
      h("span", { className: "text-aq-faint" }, "24h完成"),
      h("span", { className: "font-bold text-aq-green" }, done24h)
    )
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

  return h("div", { className: "flex-shrink-0 flex flex-wrap items-center gap-2 px-4 py-1.5 border-b border-aq-line" },
    h("div", { className: "flex-1 min-w-[140px]" },
      h(Field, null,
        h(Input, {
          type: "search", value: props.query, onChange: function (e) { props.onQuery(e.target.value); },
          placeholder: "搜索任务…",
          className: "w-full h-8 px-3 rounded-lg border border-aq-line bg-aq-surface-alt text-sm text-aq-ink outline-none focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 placeholder:text-aq-faint"
        })
      )
    ),
    h("div", { className: "flex gap-0.5 p-0.5 rounded-lg bg-aq-surface-alt border border-aq-line flex-shrink-0" },
      tabs.map(function (t) {
        return h("button", {
          key: t[0],
          className: "px-2 py-1 rounded-md text-xs font-semibold transition " +
            (snap.filter === t[0] ? "bg-aq-paper text-aq-ink shadow-sm" : "text-aq-muted hover:text-aq-ink"),
          onClick: function () { props.onFilter(t[0]); }
        }, t[1], t[2] > 0 ? h("span", { className: "ml-1 opacity-60" }, t[2]) : null);
      })
    ),
    h("button", {
      className: "aq-btn aq-btn-primary flex-shrink-0",
      style: { height: "28px", fontSize: "12px", padding: "0 10px" },
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
  var selectableCount = props.tasks.filter(function (t) { return t.status !== "running" && !t.archivedAt; }).length;
  return h("div", { className: "flex-1 overflow-auto" },
    h("table", { className: "w-full table-fixed min-w-[560px]" },
      h("colgroup", null,
        h("col", { style: { width: "40px" } }),
        h("col", null),
        h("col", { style: { width: "120px" } }),
        h("col", { style: { width: "76px" } }),
        h("col", { style: { width: "168px" } })
      ),
      h("thead", null,
        h("tr", { className: "border-b border-aq-line bg-aq-surface-alt" },
          h("th", { className: "pl-4 py-1" },
            h(Checkbox, {
              checked: selectableCount > 0 && props.selected.length === selectableCount,
              indeterminate: props.selected.length > 0 && props.selected.length < selectableCount,
              onChange: props.onSelectAll,
              className: "group/box flex items-center" },
              h("span", { className: "flex h-4 w-4 items-center justify-center rounded border transition border-aq-line-2 bg-white cursor-pointer group-hover/box:border-aq-blue" },
                (props.selected.length === selectableCount && selectableCount > 0) && h("svg", { className: "h-3 w-3 text-aq-blue", viewBox: "0 0 12 12", fill: "none" },
                  h("path", { d: "M2.5 6l2.5 2.5 4.5-4.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })
                ),
                (props.selected.length > 0 && props.selected.length < selectableCount) && h("svg", { className: "h-3 w-3 text-aq-blue", viewBox: "0 0 12 12", fill: "none" },
                  h("line", { x1: "3", y1: "6", x2: "9", y2: "6", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
                )
              )
            )
          ),
          h("th", { className: "text-left py-1 text-xs font-semibold text-aq-faint uppercase tracking-wide" }, "任务"),
          h("th", { className: "py-1 text-xs font-semibold text-aq-faint uppercase tracking-wide text-center" }, "调度"),
          h("th", { className: "pr-4 py-1 text-xs font-semibold text-aq-faint uppercase tracking-wide text-right" }, "状态"),
          h("th", { className: "pr-4 py-1 text-xs font-semibold text-aq-faint uppercase tracking-wide" }, "操作")
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
            onSession: function (sid) { props.controller.closeBoard(); props.sessions.open(sid); }
          });
        })
      )
    )
  );
}

// ─── Task Row ────────────────────────────────────────────

var actionBtnStyle = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  height: "24px", padding: "0 8px", fontSize: "12px", fontWeight: "500",
  border: "none", borderRadius: "6px", background: "transparent",
  color: "var(--aq-faint, #667085)", cursor: "pointer", whiteSpace: "nowrap"
};

function TaskRow(props) {
  var task = props.task;
  var cfg = STATUS_CONFIG[task.status] || { label: task.status, color: "#596579" };
  var summary = task.title || task.summary || taskSummary(task.body);
  var attention = taskNeedsAttention(task);
  var selectable = task.status !== "running" && !task.archivedAt;
  var unread = isUnread(task);
  var sessionId = task.sessionId || task.lastSessionId || (task.executions && task.executions.length ? task.executions[task.executions.length - 1].sessionId : null);

  var plan = task.cron ? cronToHuman(task.cron) : "即时";
  if (task.cron && task.attempts > 1) plan = plan + " · 第" + task.attempts + "次";
  var statusColor = task.stopPending ? "#9a6700" : (task.foregroundPaused ? "#27776e" : cfg.color);
  var statusLabel = task.stopPending ? "停止中" : (task.foregroundPaused ? "已暂停" : cfg.label);

  function openRow() { props.onDetail(task.key); }

  return h("tr", {
    className: "hover:bg-aq-surface-alt cursor-pointer transition group align-top " +
      (props.selected ? "bg-aq-blue-soft" : "") +
      (unread ? " border-l-2 border-l-aq-blue" : ""),
    onClick: openRow
  },
    h("td", { className: "pl-4 pr-2 py-2.5 align-middle", onClick: function (e) { e.stopPropagation(); } },
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
    h("td", { className: "py-2.5 align-middle overflow-hidden", style: { fontSize: "13px", minWidth: "120px" } },
      h("div", { className: "flex items-center gap-1.5 min-w-0" },
        h("span", { className: "flex-shrink-0 w-1.5 h-1.5 rounded-full " + (unread ? "bg-aq-blue" : "bg-transparent"), title: unread ? "未读" : undefined }),
        h("span", { className: "font-semibold text-aq-ink leading-snug flex-shrink-0", style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" } }, attention ? "! " + task.key : task.key),
        summary && h("span", { className: "text-aq-muted leading-snug flex-1 min-w-0", style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, "· " + summary)
      )
    ),
    h("td", { className: "py-2.5 text-center align-middle", style: { fontSize: "12px" } },
      h("span", { className: "inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-aq-surface-alt text-aq-faint border border-aq-line whitespace-nowrap" }, plan)
    ),
    h("td", { className: "py-2.5 pr-4 text-right align-middle", style: { fontSize: "12px" } },
      h("span", {
        className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
        style: { backgroundColor: statusColor + "15", color: statusColor }
      },
        h("span", { className: "w-1 h-1 rounded-full", style: { backgroundColor: statusColor } }),
        statusLabel
      )
    ),
    h("td", { className: "py-2.5 pr-4 align-middle", style: { fontSize: "12px" } },
      h("div", { className: "flex items-center gap-1" },
        task.status === "running" && task.stopPending !== true && !task.archivedAt && h("button", { style: actionBtnStyle, className: "hover:bg-aq-red-soft", onClick: function (e) { e.stopPropagation(); props.onAction("stop", task.key); } }, "停止"),
        task.status === "pending" && !task.archivedAt && h("button", { style: actionBtnStyle, className: "hover:bg-aq-surface-alt", onClick: function (e) { e.stopPropagation(); props.onEdit(task.key); } }, "编辑"),
        ["done", "failed", "stopped", "interrupted"].indexOf(task.status) >= 0 && !task.archivedAt && h("button", { style: Object.assign({}, actionBtnStyle, { color: "var(--aq-green, #067647)" }), className: "hover:bg-aq-green-soft", onClick: function (e) { e.stopPropagation(); props.onAction("rerun", task.key); } }, "重跑"),
        task.status !== "running" && !task.archivedAt && h("button", { style: actionBtnStyle, className: "hover:bg-aq-surface-alt", onClick: function (e) { e.stopPropagation(); props.onAction("archive", task.key); } }, "归档"),
        task.archivedAt && h("button", { style: actionBtnStyle, className: "hover:bg-aq-surface-alt", onClick: function (e) { e.stopPropagation(); props.onAction("restore", task.key); } }, "还原"),
        task.status === "pending" && !task.archivedAt && h("button", { style: Object.assign({}, actionBtnStyle, { color: "var(--aq-red, #b42318)" }), className: "hover:bg-aq-red-soft", onClick: function (e) { e.stopPropagation(); props.onAction("delete", task.key); } }, "删除"),
        sessionId && !task.archivedAt && h("button", { style: actionBtnStyle, className: "hover:bg-aq-surface-alt", onClick: function (e) { e.stopPropagation(); if (props.onSession) props.onSession(sessionId); } }, "会话")
      )
    )
  );
}

function taskPrimaryAction(task) {
  if (task.archivedAt) return { label: "还原", handler: function () { /* handled by detail */ }, tone: "" };
  if (task.status === "running" && task.stopPending !== true) return null; // no hover action for running, stop is in detail
  if (task.status === "pending") return null; // edit/delete in detail
  if (["done", "failed", "stopped", "interrupted"].indexOf(task.status) >= 0) return null; // rerun in detail
  return null;
}

function taskNeedsAttention(task) {
  var phase = String(task.goalPhase || "");
  return task.status === "failed" || task.status === "interrupted" ||
    phase.indexOf("uncertain") >= 0 || phase.indexOf("containment") >= 0 ||
    !!task._goalAdmissionUncertain || !!task._promptAdmissionUncertain;
}