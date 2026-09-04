import { iconHtml, cronToHuman, formatIso, STATUS_CONFIG, isUnread } from "../utils.js";
import { DialogShell } from "./DialogShell.jsx";

function h() { return React.createElement.apply(React, arguments); }

export function TaskDetailPanel(props) {
  var task = props.task;
  var transport = props.transport;
  var controller = props.controller;
  var detail = React.useState(null);
  var loading = React.useState(true);
  var detailError = React.useState("");
  var retry = React.useState(0);
  var tab = React.useState("overview");

  React.useEffect(function () {
    var cancelled = false;
    detail[1](null); detailError[1](""); loading[1](true);
    transport.detail(task.key).then(function (data) {
      if (cancelled) return;
      detail[1](data); loading[1](false);
    }).catch(function (error) {
      if (!cancelled) {
        detailError[1](error && error.message ? error.message : "无法读取任务详情");
        loading[1](false);
      }
    });
    return function () { cancelled = true; };
  }, [task.key, transport, retry[0]]);

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
          h("h3", { id: args.id }, args.title),
          h("div", { className: "aq-inspector-status" },
            h("span", { className: "aq-status-pill", style: { "--status-color": attention || value.stopPending === true ? "#9a6700" : (value.foregroundPaused === true ? "#27776e" : status.color) } }, h("i"), attention ? "需关注" : (value.stopPending === true ? "正在停止" : (value.foregroundPaused === true ? "已暂停" : status.label))),
            value.updatedAt && h("small", null, "更新于 ", formatIso(value.updatedAt))
          )
        ),
        h("button", { className: "aq-d-close", "aria-label": "关闭任务详情", onClick: props.onClose, dangerouslySetInnerHTML: { __html: iconHtml("close") } })
      );
    }
  },
    h("div", { className: "aq-inspector-tabs", role: "tablist", "aria-label": "详情视图" },
      [["overview", "概览"], ["trace", "执行轨迹"], ["report", "报告"], ["policy", "策略"]].map(function (item) {
        return h("button", {
          key: item[0], id: "aq-detail-tab-" + item[0], role: "tab", "aria-selected": tab[0] === item[0],
          "aria-controls": "aq-detail-panel", tabIndex: tab[0] === item[0] ? 0 : -1,
          className: tab[0] === item[0] ? "sel" : "", onClick: function () { tab[1](item[0]); }
        }, item[1]);
      })
    ),
    h("div", { className: "aq-d-body", id: "aq-detail-panel", role: "tabpanel", "aria-labelledby": "aq-detail-tab-" + tab[0] },
      loading[0] && h("div", { className: "aq-detail-loading", role: "status" }, "正在载入完整账本…"),
      detailError[0] && h("div", { className: "aq-detail-error", role: "alert" },
        h("strong", null, "无法加载任务详情"), h("p", null, detailError[0]),
        h("button", { className: "aq-btn", onClick: function () { retry[1](retry[0] + 1); } }, "重新加载")
      ),
      !loading[0] && !detailError[0] && tab[0] === "overview" && h(OverviewTab, { task: value, attention: attention, sessionId: sessionId }),
      !loading[0] && !detailError[0] && tab[0] === "trace" && h(TraceTab, { task: value }),
      !loading[0] && !detailError[0] && tab[0] === "report" && h(ReportTab, { reports: reports }),
      !loading[0] && !detailError[0] && tab[0] === "policy" && h(PolicyTab, { task: value })
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
  var showStateNotice = props.attention || task.stopPending === true || task.foregroundPaused === true;
  return h(React.Fragment, null,
    showStateNotice && h("section", { className: "aq-isolation-state attention" },
      h("span", { className: "aq-isolation-mark", "aria-hidden": "true" }, "!"),
      h("div", null,
        h("strong", null, props.attention ? "任务已暂停，需要检查" : (task.stopPending === true ? "正在停止任务" : "任务已暂停")),
        h("p", null, props.attention ? isolationReason(task) : (task.stopPending === true ? "停止指令已提交，确认会话结束后更新状态。" : "你正在使用 DSH，空闲后任务会自动继续。"))
      )
    ),
    h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "任务信息"),
      h("div", { className: "aq-d-grid" },
        h(Fact, { label: "优先级", value: String(task.priority || 5) }),
        h(Fact, { label: "派发尝试", value: String(task.attempts || 0) }),
        h(Fact, { label: "自动恢复", value: String(task.blockedResumes || 0) + " 次" }),
        h(Fact, { label: "推进轮次", value: (task.currentRound || 0) + " / " + (task.maxGoalRounds || "-") }),
        h(Fact, { label: "创建时间", value: task.createdAt ? formatIso(task.createdAt) : "-" }),
        h(Fact, { label: "下一次运行", value: task.nextRunAt ? formatIso(task.nextRunAt) : "-" }),
        h(Fact, { label: "任务会话", value: props.sessionId ? "已创建" : "尚未创建" }),
        h(Fact, { label: "当前阶段", value: taskPhaseLabel(task.goalPhase, task.status) }),
        h(Fact, { label: "前台优先", value: task.foregroundPaused === true ? "已暂停，等待 DSH 空闲" : "正常" })
      )
    ),
    task.body && h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "任务内容"),
      h("div", { className: "aq-d-report" }, h("pre", null, task.body))
    ),
    task.lastError && h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "最近错误"),
      h("div", { className: "aq-error-detail" }, String(task.lastError))
    )
  );
}

function TraceTab(props) {
  var task = props.task;
  var executions = Array.isArray(task.executions) ? task.executions : [];
  return h(React.Fragment, null,
    task.status === "running" && h("section", { className: "aq-runtime-note" },
      h("strong", null, "当前状态"),
      h("span", null, task.stopPending === true ? "正在停止" : (task.foregroundPaused === true ? "已暂停，等待 DSH 空闲" : taskPhaseLabel(task.goalPhase, task.status)))
    ),
    h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "执行记录"),
      executions.length === 0 ? h("p", { className: "aq-tab-empty" }, "还没有执行记录") :
        h("div", { className: "aq-execution-list" }, executions.slice().reverse().map(function (execution, index) {
          var cfg = STATUS_CONFIG[execution.result] || { label: execution.result || "执行中", color: "#596579" };
          return h("article", { key: String(execution.attempt || index) + (execution.startedAt || "") },
            h("span", { className: "aq-exec-index" }, String(execution.attempt || executions.length - index).padStart(2, "0")),
            h("div", null, h("strong", { style: { color: cfg.color } }, cfg.label), h("p", null, execution.startedAt ? formatIso(execution.startedAt) : "-", " 至 ", execution.endedAt ? formatIso(execution.endedAt) : "进行中"), execution.error && h("code", null, String(execution.error)))
          );
        }))
    )
  );
}

function ReportTab(props) {
  var entries = [["goal", "推进结果"], ["result", "执行结果"], ["report", "最终报告"]].filter(function (item) { return props.reports && props.reports[item[0]]; });
  if (!entries.length) return h("div", { className: "aq-tab-empty" }, h("strong", null, "报告尚未生成"), h("p", null, "任务结束后，结果会显示在这里。"));
  return h(React.Fragment, null, entries.map(function (entry) {
    return h("section", { className: "aq-d-section", key: entry[0] }, h("div", { className: "aq-d-section-title" }, entry[1]), h("div", { className: "aq-d-report" }, h("pre", null, props.reports[entry[0]])));
  }));
}

function PolicyTab(props) {
  var task = props.task;
  return h(React.Fragment, null,
    h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "调度"),
      h("div", { className: "aq-d-grid" },
        h(Fact, { label: "循环调度", value: task.cron ? cronToHuman(task.cron) : "未设置" }),
        task.cron && h(Fact, { label: "复用会话", value: task.reuseSession !== false ? "开启" : "关闭" }),
        h(Fact, { label: "一次性定时", value: task.schedule ? formatIso(task.schedule) : "未设置" }),
        h(Fact, { label: "截止窗口", value: task.deadline ? cronToHuman(task.deadline) : "未设置" }),
        h(Fact, { label: "运行模式", value: !task.agentPreset ? "派发时自动识别" : (task.agentPreset.indexOf("ptc") >= 0 ? "PTC · 自动识别" : "标准自治 · 自动识别") }),
        h(Fact, { label: "自动归档", value: task.autoArchive === false ? "关闭" : "开启" })
      )
    ),
    h("section", { className: "aq-d-section" },
      h("div", { className: "aq-d-section-title" }, "失败处理"),
      h("div", { className: "aq-d-grid" },
        h(Fact, { label: "最多推进轮数", value: String(task.maxGoalRounds || "继承默认") }),
        h(Fact, { label: "最多自动恢复", value: String(task.maxBlockedResumes ?? "继承默认") }),
        h(Fact, { label: "任务超时", value: task.timeoutMs ? Math.round(task.timeoutMs / 60000) + " 分钟" : "继承默认" }),
        h(Fact, { label: "最大尝试", value: String(task.maxAttempts || "继承默认") }),
        h(Fact, { label: "浏览器通知", value: task.enableNotifications === true ? "开启" : (task.enableNotifications === false ? "静默" : "继承默认") }),
        h(Fact, { label: "Webhook", value: task.webhook || "未设置" })
      )
    ),
    h("section", { className: "aq-policy-lock" }, h("strong", null, "不会修改 DSH 设置"), h("p", null, "任务使用独立工作目录；你使用 DSH 时，后台任务会自动暂停。"))
  );
}

function Fact(props) {
  return h("div", { className: "aq-d-item" }, h("span", { className: "dl" }, props.label), h("span", { className: "dv" }, props.value));
}

function taskPhaseLabel(phase, status) {
  var value = String(phase || "");
  if (value === "active" || value === "goal-admitted") return "执行中";
  if (value === "complete") return "已完成";
  if (value === "stopped" || value === "disposed") return "已结束";
  if (value === "rate-limited") return "等待重试";
  if (value.indexOf("foreground-paused") >= 0) return "已暂停，等待 DSH 空闲";
  if (value.indexOf("cancel-pending") >= 0 || value.indexOf("cleanup-pending") >= 0) return "正在停止";
  if (value.indexOf("launch") >= 0 || value.indexOf("admission-pending") >= 0) return "正在启动";
  if (value.indexOf("uncertain") >= 0 || value.indexOf("containment") >= 0 || value === "unknown") return "状态待确认";
  var cfg = STATUS_CONFIG[status];
  return cfg ? cfg.label : (status || "未知");
}

function needsAttention(task) {
  var phase = String(task.goalPhase || "");
  return task.status === "failed" || task.status === "interrupted" || phase.indexOf("uncertain") >= 0 || phase.indexOf("containment") >= 0 || !!task._goalAdmissionUncertain || !!task._promptAdmissionUncertain;
}

function isolationReason(task) {
  if (task._goalAdmissionUncertain || String(task.goalPhase || "").indexOf("goal-admission") >= 0) return "任务是否成功启动无法确认。为避免重复执行，任务不会自动重启。";
  if (task._promptAdmissionUncertain || String(task.goalPhase || "").indexOf("prompt-admission") >= 0) return "任务指令是否送达无法确认。为避免重复执行，任务已暂停。";
  if (task.status === "interrupted") return "DSH 重启或会话中断。检查执行记录后可以重新执行。";
  return task.lastError ? String(task.lastError) : "任务失败。请检查执行记录后决定是否重新执行。";
}
