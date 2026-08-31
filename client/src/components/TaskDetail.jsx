import { iconHtml, cronToHuman, formatIso, STATUS_CONFIG, isUnread } from "../utils.js";
import { DialogShell } from "./DialogShell.jsx";

function h() { return React.createElement.apply(React, arguments); }

export function TaskDetailPanel(props) {
  var task = props.task;
  var transport = props.transport;
  var controller = props.controller;
  var detail = React.useState(null);
  var loading = React.useState(true);
  var tab = React.useState("overview");

  React.useEffect(function () {
    var cancelled = false;
    detail[1](null); loading[1](true);
    transport.detail(task.key).then(function (data) {
      if (cancelled) return;
      detail[1](data); loading[1](false);
    }).catch(function () { if (!cancelled) loading[1](false); });
    return function () { cancelled = true; };
  }, [task.key, transport]);

  var current = detail[0] && detail[0].task && detail[0].task.key === task.key ? detail[0] : null;
  var value = current ? current.task : task;
  var status = STATUS_CONFIG[value.status] || { label: value.status, color: "#596579" };
  var sessionId = value.sessionId || value.lastSessionId || (value.executions && value.executions.length ? value.executions[value.executions.length - 1].sessionId : null);
  var attention = needsAttention(value);
  var reports = current && current.task.reports ? current.task.reports : (value.reports || {});

  function doAction(kind) {
    controller.doAction(kind, value.key).catch(function () {});
    props.onClose();
  }

  function requestAction(kind) {
    if (props.onActionRequest) props.onActionRequest(kind, value.key);
    else doAction(kind);
  }

  function openEdit() {
    props.onClose();
    controller.openEdit(value.key);
  }

  return h(DialogShell, {
    variant: "drawer", title: value.key, onClose: props.onClose, className: "aq-task-inspector",
    renderTitle: function (args) {
      return h("div", { className: "aq-d-hd aq-inspector-hd" },
        h("div", null,
          h("span", { className: "aq-eyebrow" }, "TASK INSPECTOR"),
          h("h3", { id: args.id }, args.title),
          h("div", { className: "aq-inspector-status" },
            h("span", { className: "aq-status-pill", style: { "--status-color": attention || value.stopPending === true ? "#9a6700" : (value.foregroundPaused === true ? "#27776e" : status.color) } }, h("i"), attention ? "安全隔离 · 需关注" : (value.stopPending === true ? "停止收口中" : (value.foregroundPaused === true ? "前台让行 · 已暂停" : status.label))),
            value.updatedAt && h("small", null, "更新于 ", formatIso(value.updatedAt))
          )
        ),
        h("button", { className: "aq-d-close", "aria-label": "关闭任务详情", onClick: props.onClose, dangerouslySetInnerHTML: { __html: iconHtml("close") } })
      );
    }
  },
    h("div", { className: "aq-inspector-tabs", role: "tablist", "aria-label": "详情视图" },
      [["overview", "概览"], ["trace", "执行轨迹"], ["report", "报告"], ["policy", "策略"]].map(function (item) {
        return h("button", { key: item[0], role: "tab", "aria-selected": tab[0] === item[0], className: tab[0] === item[0] ? "sel" : "", onClick: function () { tab[1](item[0]); } }, item[1]);
      })
    ),
    h("div", { className: "aq-d-body" },
      loading[0] && h("div", { className: "aq-detail-loading", role: "status" }, "正在载入完整账本…"),
      tab[0] === "overview" && h(OverviewTab, { task: value, attention: attention, sessionId: sessionId }),
      tab[0] === "trace" && h(TraceTab, { task: value }),
      tab[0] === "report" && h(ReportTab, { reports: reports }),
      tab[0] === "policy" && h(PolicyTab, { task: value })
    ),
    h("div", { className: "aq-d-actions" },
      value.status === "pending" && h("button", { className: "aq-btn", onClick: openEdit, dangerouslySetInnerHTML: { __html: iconHtml("edit") + " 编辑" } }),
      value.status === "pending" && h("button", { className: "aq-btn danger", onClick: function () { requestAction("delete"); } }, "删除"),
      value.status === "running" && value.stopPending !== true && h("button", { className: "aq-btn danger", onClick: function () { requestAction("stop"); } }, "停止"),
      ["done", "failed", "stopped", "interrupted"].indexOf(value.status) >= 0 && !value.archivedAt && h("button", { className: "aq-btn success", onClick: function () { requestAction("rerun"); } }, "重新执行"),
      value.status !== "running" && !value.archivedAt && h("button", { className: "aq-btn", onClick: function () { doAction("archive"); } }, "归档"),
      value.archivedAt && h("button", { className: "aq-btn", onClick: function () { doAction("restore"); } }, "恢复"),
      ["done", "failed", "stopped", "interrupted"].indexOf(value.status) >= 0 && !value.archivedAt && h("button", { className: "aq-btn", disabled: isUnread(value), onClick: function () { controller.markRead(value.key, false); } }, isUnread(value) ? "已是未读" : "标为未读"),
      sessionId && h("button", { className: "aq-btn", onClick: function () { props.onClose(); controller.closeBoard(); if (props.sessions && props.sessions.open) props.sessions.open(sessionId); }, dangerouslySetInnerHTML: { __html: iconHtml("external") + " 跳转会话" } })
    )
  );
}

function OverviewTab(props) {
  var task = props.task;
  return h(React.Fragment, null,
    h("section", { className: "aq-isolation-state " + (props.attention ? "attention" : "safe") },
      h("span", { className: "aq-isolation-mark", "aria-hidden": "true" }, props.attention ? "!" : "✓"),
      h("div", null,
        h("strong", null, props.attention ? "任务已进入安全隔离" : (task.stopPending === true ? "正在安全停止 owned session" : (task.foregroundPaused === true ? "正在为 DSH 前台让行" : "隔离边界正常"))),
        h("p", null, props.attention ? isolationReason(task) : (task.stopPending === true ? "停止意图已持久化，等待会话双重 idle 确认后再结算" : (task.foregroundPaused === true ? "Goal 已持久化暂停；确认前台空闲后无提示续跑" : "插件自有会话 · 独立工作目录 · 宿主前台优先")))
      )
    ),
    h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "TASK FACTS"),
      h("div", { className: "aq-d-grid" },
        h(Fact, { label: "优先级", value: String(task.priority || 5) }),
        h(Fact, { label: "派发尝试", value: String(task.attempts || 0) }),
        h(Fact, { label: "反阻塞恢复", value: String(task.blockedResumes || 0) }),
        h(Fact, { label: "Goal 轮次", value: (task.currentRound || 0) + " / " + (task.maxGoalRounds || "-") }),
        h(Fact, { label: "创建时间", value: task.createdAt ? formatIso(task.createdAt) : "-" }),
        h(Fact, { label: "下一次运行", value: task.nextRunAt ? formatIso(task.nextRunAt) : "-" }),
        h(Fact, { label: "会话归属", value: props.sessionId ? "AutoQueue owned" : "尚未创建" }),
        h(Fact, { label: "当前阶段", value: task.goalPhase || task.status || "-" }),
        h(Fact, { label: "前台让行", value: task.foregroundPaused === true ? "已暂停，等待双重空闲确认" : "未触发" })
      )
    ),
    task.body && h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "TASK BRIEF"),
      h("div", { className: "aq-d-report" }, h("pre", null, task.body))
    ),
    task.lastError && h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "LATEST ERROR"),
      h("div", { className: "aq-error-detail" }, String(task.lastError))
    )
  );
}

function TraceTab(props) {
  var task = props.task;
  var executions = Array.isArray(task.executions) ? task.executions : [];
  return h(React.Fragment, null,
    task.status === "running" && h("section", { className: "aq-live-trace" },
      h("span", { className: "aq-eyebrow" }, "LIVE AUTONOMY PULSE"),
      h("div", { className: "aq-trace-line" },
        h(TracePoint, { label: "队列接收", done: true }), h("b", { className: "done" }),
        h(TracePoint, { label: task.stopPending === true ? "停止收口" : (task.foregroundPaused === true ? "前台让行" : "Goal 推进"), active: true }), h("b"),
        h(TracePoint, { label: "反阻塞", done: (task.blockedResumes || 0) > 0 }), h("b"),
        h(TracePoint, { label: "安全收口" })
      )
    ),
    h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "EXECUTION HISTORY"),
      executions.length === 0 ? h("p", { className: "aq-tab-empty" }, "还没有执行记录") :
        h("div", { className: "aq-execution-list" }, executions.slice().reverse().map(function (execution, index) {
          var cfg = STATUS_CONFIG[execution.result] || { label: execution.result || "执行中", color: "#596579" };
          return h("article", { key: String(execution.attempt || index) + (execution.startedAt || "") },
            h("span", { className: "aq-exec-index" }, String(execution.attempt || executions.length - index).padStart(2, "0")),
            h("div", null, h("strong", { style: { color: cfg.color } }, cfg.label), h("p", null, execution.startedAt ? formatIso(execution.startedAt) : "-", " → ", execution.endedAt ? formatIso(execution.endedAt) : "进行中"), execution.error && h("code", null, String(execution.error)))
          );
        }))
    )
  );
}

function ReportTab(props) {
  var entries = [["goal", "Goal 结果"], ["result", "执行结果"], ["report", "最终报告"]].filter(function (item) { return props.reports && props.reports[item[0]]; });
  if (!entries.length) return h("div", { className: "aq-tab-empty aq-large-empty" }, h("strong", null, "报告尚未生成"), h("p", null, "任务结束后，结果会在这里沉淀。"));
  return h(React.Fragment, null, entries.map(function (entry) {
    return h("section", { className: "aq-d-section", key: entry[0] }, h("div", { className: "aq-d-section-title" }, entry[1]), h("div", { className: "aq-d-report" }, h("pre", null, props.reports[entry[0]])));
  }));
}

function PolicyTab(props) {
  var task = props.task;
  return h(React.Fragment, null,
    h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "SCHEDULE"),
      h("div", { className: "aq-d-grid" },
        h(Fact, { label: "循环调度", value: task.cron ? cronToHuman(task.cron) : "未设置" }),
        h(Fact, { label: "一次性定时", value: task.schedule ? formatIso(task.schedule) : "未设置" }),
        h(Fact, { label: "截止窗口", value: task.deadline ? cronToHuman(task.deadline) : "未设置" }),
        h(Fact, { label: "运行模式", value: !task.agentPreset ? "派发时自动识别" : (task.agentPreset.indexOf("ptc") >= 0 ? "PTC · 自动识别" : "标准自治 · 自动识别") }),
        h(Fact, { label: "自动归档", value: task.autoArchive === false ? "关闭" : "开启" })
      )
    ),
    h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "RESILIENCE"),
      h("div", { className: "aq-d-grid" },
        h(Fact, { label: "最大 Goal 轮次", value: String(task.maxGoalRounds || "继承默认") }),
        h(Fact, { label: "最大反阻塞", value: String(task.maxBlockedResumes ?? "继承默认") }),
        h(Fact, { label: "任务超时", value: task.timeoutMs ? Math.round(task.timeoutMs / 60000) + " 分钟" : "继承默认" }),
        h(Fact, { label: "最大尝试", value: String(task.maxAttempts || "继承默认") }),
        h(Fact, { label: "浏览器通知", value: task.enableNotifications === true ? "开启" : (task.enableNotifications === false ? "静默" : "继承默认") }),
        h(Fact, { label: "Webhook", value: task.webhook || "未设置" })
      )
    ),
    h("section", { className: "aq-policy-lock" }, h("strong", null, "宿主隔离字段已锁定"), h("p", null, "任务只使用独立 cwd 和 AutoQueue 版本化专属预设；不切换 DSH 宿主模型、工作区或普通会话预设。检测到前台活动时，先持久化暂停 Goal，再取消后台 turn。"))
  );
}

function Fact(props) {
  return h("div", { className: "aq-d-item" }, h("span", { className: "dl" }, props.label), h("span", { className: "dv" }, props.value));
}

function TracePoint(props) {
  return h("span", { className: (props.done ? "done " : "") + (props.active ? "active" : "") }, h("i"), h("small", null, props.label));
}

function needsAttention(task) {
  var phase = String(task.goalPhase || "");
  return task.status === "failed" || task.status === "interrupted" || phase.indexOf("uncertain") >= 0 || phase.indexOf("containment") >= 0 || !!task._goalAdmissionUncertain || !!task._promptAdmissionUncertain;
}

function isolationReason(task) {
  if (task._goalAdmissionUncertain || String(task.goalPhase || "").indexOf("goal-admission") >= 0) return "Goal admission 结果不确定；任务不会自动重启，等待人工核验。";
  if (task._promptAdmissionUncertain || String(task.goalPhase || "").indexOf("prompt-admission") >= 0) return "Prompt admission 结果不确定；任务已永久隔离，避免重复执行。";
  if (task.status === "interrupted") return "宿主重启或会话中断；可检查执行轨迹后重新入队。";
  return task.lastError ? String(task.lastError) : "任务失败；请检查执行记录后决定是否重跑。";
}
