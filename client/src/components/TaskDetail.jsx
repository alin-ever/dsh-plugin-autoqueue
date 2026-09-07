import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { iconHtml, cronToHuman, formatIso, STATUS_CONFIG, isUnread } from "../utils.js";
import { DialogShell } from "./DialogShell.jsx";
import { renderMarkdown } from "./MarkdownRenderer.jsx";

function h() { return React.createElement.apply(React, arguments); }

export function TaskDetailPanel(props) {
  var task = props.task;
  var transport = props.transport;
  var controller = props.controller;
  var detail = React.useState(null);
  var loading = React.useState(true);
  var detailError = React.useState("");
  var retry = React.useState(0);

  React.useEffect(function () {
    var cancelled = false;
    detail[1](null); detailError[1](""); loading[1](true);
    transport.detail(task.key).then(function (data) {
      if (cancelled) return;
      detail[1](data); loading[1](false);
    }).catch(function (err) {
      if (!cancelled) {
        detailError[1](err && err.message ? err.message : "无法读取任务详情");
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

  return h(DialogShell, {
    variant: "drawer", open: true, onClose: props.onClose, title: value.key,
    className: "w-[min(840px,94vw)]"
  },
    h("div", { className: "flex flex-col h-full" },
      // 状态条
      h("div", { className: "flex items-center gap-3 px-6 py-3 bg-aq-surface-alt border-b border-aq-line" },
        h("span", { className: "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold",
          style: { backgroundColor: (attention || value.stopPending ? "#9a6700" : (value.foregroundPaused ? "#27776e" : status.color)) + "15", color: attention || value.stopPending ? "#9a6700" : (value.foregroundPaused ? "#27776e" : status.color) }
        },
          h("span", { className: "w-1.5 h-1.5 rounded-full", style: { backgroundColor: "currentColor" } }),
          attention ? "需关注" : (value.stopPending ? "正在停止" : (value.foregroundPaused ? "已暂停" : status.label))
        ),
        value.updatedAt && h("span", { className: "text-xs text-aq-faint" }, "更新于 ", formatIso(value.updatedAt))
      ),

      // Tabs
      h(TabGroup, { className: "flex flex-col flex-1 min-h-0" },
        h(TabList, { className: "flex flex-shrink-0 gap-0 px-6 border-b border-aq-line" },
          ["概览", "执行轨迹", "报告", "策略"].map(function (name) {
            return h(Tab, {
              key: name,
              className: "px-4 py-2.5 text-sm font-semibold text-aq-muted border-b-2 border-transparent transition data-[selected]:text-aq-blue data-[selected]:border-aq-blue outline-none"
            }, name);
          })
        ),
        h(TabPanels, { className: "flex-1 overflow-y-auto px-6 py-4" },
          h(TabPanel, null,
            loading[0] ? h(LoadingView) :
            detailError[0] ? h(ErrorView, { error: detailError[0], onRetry: function () { retry[1](retry[0] + 1); } }) :
            h(OverviewTab, { task: value, attention: attention, sessionId: sessionId })
          ),
          h(TabPanel, null,
            loading[0] ? h(LoadingView) :
            detailError[0] ? h(ErrorView, { error: detailError[0], onRetry: function () { retry[1](retry[0] + 1); } }) :
            h(TraceTab, { task: value })
          ),
          h(TabPanel, null,
            loading[0] ? h(LoadingView) :
            detailError[0] ? h(ErrorView, { error: detailError[0], onRetry: function () { retry[1](retry[0] + 1); } }) :
            h(ReportTab, { reports: reports })
          ),
          h(TabPanel, null,
            loading[0] ? h(LoadingView) :
            detailError[0] ? h(ErrorView, { error: detailError[0], onRetry: function () { retry[1](retry[0] + 1); } }) :
            h(PolicyTab, { task: value })
          )
        )
      ),

      // 底部操作栏
      h("div", { className: "flex-shrink-0 flex gap-2 px-6 py-3 border-t border-aq-line bg-aq-paper" },
        value.status === "pending" && h("button", { className: "aq-btn aq-btn-ghost text-xs", onClick: function () { props.onClose(); controller.openEdit(value.key); } }, "编辑"),
        value.status === "pending" && h("button", { className: "aq-btn aq-btn-ghost text-xs text-aq-red", onClick: function () { requestAction("delete"); } }, "删除"),
        value.status === "running" && value.stopPending !== true && h("button", { className: "aq-btn aq-btn-ghost text-xs text-aq-red", onClick: function () { requestAction("stop"); } }, "停止"),
        ["done", "failed", "stopped", "interrupted"].indexOf(value.status) >= 0 && !value.archivedAt && h("button", { className: "aq-btn aq-btn-ghost text-xs text-aq-green", onClick: function () { requestAction("rerun"); } }, "重新执行"),
        value.status !== "running" && !value.archivedAt && h("button", { className: "aq-btn aq-btn-ghost text-xs", onClick: function () { doAction("archive"); } }, "归档"),
        value.archivedAt && h("button", { className: "aq-btn aq-btn-ghost text-xs", onClick: function () { doAction("restore"); } }, "恢复"),
        h("span", { className: "flex-1" }),
        sessionId && h("button", { className: "aq-btn aq-btn-primary text-xs", onClick: function () { props.onClose(); controller.closeBoard(); if (props.sessions && props.sessions.open) props.sessions.open(sessionId); }, dangerouslySetInnerHTML: { __html: iconHtml("external") + " 跳转会话" } })
      )
    )
  );
}

function LoadingView() {
  return h("div", { className: "flex flex-col items-center justify-center py-12 gap-3" },
    h("div", { className: "w-5 h-5 border-2 border-aq-line-2 border-t-aq-blue rounded-full animate-spin" }),
    h("span", { className: "text-sm text-aq-muted" }, "正在载入任务详情…")
  );
}

function ErrorView(props) {
  return h("div", { className: "text-center py-10" },
    h("p", { className: "text-sm text-aq-red mb-3" }, props.error),
    h("button", { className: "aq-btn aq-btn-primary text-xs", onClick: props.onRetry }, "重新加载")
  );
}

// ─── Overview Tab ────────────────────────────────────────

function OverviewTab(props) {
  var task = props.task;
  var showNotice = props.attention || task.stopPending === true || task.foregroundPaused === true;

  return h("div", { className: "space-y-4" },
    showNotice && h("div", { className: "flex items-start gap-3 p-3 rounded-xl bg-aq-amber-soft" },
      h("span", { className: "flex-shrink-0 grid w-5 h-5 place-items-center rounded-full border border-aq-amber text-aq-amber text-xs font-bold" }, "!"),
      h("div", null,
        h("p", { className: "text-sm font-semibold text-aq-amber" }, props.attention ? "任务已暂停，需要检查" : (task.stopPending ? "正在停止" : "已暂停")),
        h("p", { className: "text-xs text-aq-amber/70 mt-0.5" }, props.attention ? isolationReason(task) : "任务状态变更中，请稍候。")
      )
    ),

    h(Section, { title: "任务信息" },
      h(Grid, null,
        h(Fact, { label: "优先级", value: String(task.priority || 5) }),
        h(Fact, { label: "派发尝试", value: String(task.attempts || 0) }),
        h(Fact, { label: "自动恢复", value: String(task.blockedResumes || 0) + " 次" }),
        h(Fact, { label: "推进轮次", value: (task.currentRound || 0) + " / " + (task.maxGoalRounds || "-") }),
        h(Fact, { label: "创建时间", value: task.createdAt ? formatIso(task.createdAt) : "-" }),
        h(Fact, { label: "下次运行", value: task.nextRunAt ? formatIso(task.nextRunAt) : "-" }),
        h(Fact, { label: "任务会话", value: props.sessionId ? "已创建" : "尚未创建" }),
        h(Fact, { label: "当前阶段", value: taskPhaseLabel(task.goalPhase, task.status) })
      )
    ),

    task.body && h(Section, { title: "任务内容" },
      h("div", { className: "max-h-60 overflow-auto p-3 rounded-xl border border-aq-line bg-aq-surface-alt" },
        h("pre", { className: "text-xs font-mono text-aq-ink-2 whitespace-pre-wrap break-words m-0" }, task.body)
      )
    ),

    task.lastError && h(Section, { title: "最近错误" },
      h("div", { className: "p-3 rounded-xl border-l-[3px] border-l-aq-red bg-aq-red-soft text-sm text-aq-red font-mono break-words" }, String(task.lastError))
    )
  );
}

// ─── Trace Tab ───────────────────────────────────────────

function TraceTab(props) {
  var task = props.task;
  var executions = Array.isArray(task.executions) ? task.executions : [];

  return h("div", { className: "space-y-4" },
    task.status === "running" && h("div", { className: "flex items-center justify-between p-3 rounded-xl bg-aq-blue-soft" },
      h("span", { className: "text-sm font-semibold text-aq-blue" }, "当前状态"),
      h("span", { className: "text-sm text-aq-blue" }, task.stopPending ? "正在停止" : (task.foregroundPaused ? "已暂停" : taskPhaseLabel(task.goalPhase, task.status)))
    ),

    h(Section, { title: "执行记录" },
      executions.length === 0 ? h("p", { className: "text-sm text-aq-muted py-4 text-center" }, "还没有执行记录") :
        h("div", { className: "space-y-0" },
          executions.slice().reverse().map(function (ex, i) {
            var cfg = STATUS_CONFIG[ex.result] || { label: ex.result || "执行中", color: "#596579" };
            return h("div", { key: String(ex.attempt || i) + (ex.startedAt || ""), className: "flex gap-3 py-3 border-b border-aq-line last:border-b-0" },
              h("span", { className: "flex-shrink-0 grid w-7 h-7 place-items-center rounded-full border border-aq-line-2 text-xs font-mono font-semibold text-aq-faint" },
                String(ex.attempt || executions.length - i).padStart(2, "0")
              ),
              h("div", { className: "flex-1 min-w-0" },
                h("span", { className: "text-sm font-semibold", style: { color: cfg.color } }, cfg.label),
                h("p", { className: "text-xs text-aq-faint mt-0.5" },
                  ex.startedAt ? formatIso(ex.startedAt) : "-", " → ", ex.endedAt ? formatIso(ex.endedAt) : "进行中"
                ),
                ex.error && h("code", { className: "block mt-1 text-xs text-aq-red font-mono break-words" }, String(ex.error))
              )
            );
          })
        )
    )
  );
}

// ─── Report Tab (Markdown 渲染) ──────────────────────────

function ReportTab(props) {
  var entries = [["goal", "推进结果"], ["result", "执行结果"], ["report", "最终报告"]].filter(function (e) { return props.reports && props.reports[e[0]]; });

  if (!entries.length) {
    return h("div", { className: "flex flex-col items-center justify-center py-12 gap-2" },
      h("p", { className: "text-sm font-semibold text-aq-ink" }, "报告尚未生成"),
      h("p", { className: "text-xs text-aq-muted" }, "任务结束后，结果会显示在这里。")
    );
  }

  return h("div", { className: "space-y-5" },
    entries.map(function (entry) {
      var raw = props.reports[entry[0]];
      return h("div", { key: entry[0] },
        h("h4", { className: "text-sm font-bold text-aq-ink-2 mb-2" }, entry[1]),
        h(ReportBlock, { raw: raw })
      );
    })
  );
}

function ReportBlock(props) {
  var raw = props.raw;
  var parsed = parseReportJSON(raw);

  if (parsed && typeof parsed === "object") {
    // 检测是否为结构化 JSON 报告（有 result/output 等字段）
    var isStructured = parsed.result != null || parsed.output != null;
    if (isStructured) {
      return h("div", { className: "aq-prose space-y-4" },
        parsed.result && h(Fact, { label: "结果", value: parsed.result }),
        parsed.attempts != null && h(Fact, { label: "尝试次数", value: String(parsed.attempts) }),
        parsed.blockedResumes != null && h(Fact, { label: "自动恢复", value: String(parsed.blockedResumes) }),
        parsed.finishedAt && h(Fact, { label: "完成时间", value: formatIso(parsed.finishedAt) }),
        parsed.error && h("div", { className: "p-3 rounded-xl border-l-[3px] border-l-aq-red bg-aq-red-soft text-sm text-aq-red font-mono break-words" }, String(parsed.error)),
        parsed.output && h("div", { className: "mt-3" },
          h("div", { className: "text-xs font-bold text-aq-faint uppercase tracking-wide mb-1" }, "输出内容"),
          h("div", { dangerouslySetInnerHTML: { __html: renderMarkdown(parsed.output) } })
        )
      );
    }

    // 普通键值对报告（如 goal 字段）
    return h("div", { className: "aq-prose space-y-3" },
      Object.keys(parsed).map(function (key) {
        var val = parsed[key];
        if (val == null) return null;
        var displayKey = key;
        var displayVal = String(val);
        // 如果值包含 "字段名: 内容" 格式，分离标签和内容
        var colonIdx = displayVal.indexOf(":");
        if (colonIdx > 0 && colonIdx < 20) {
          var prefix = displayVal.substring(0, colonIdx).trim();
          var suffix = displayVal.substring(colonIdx + 1).trim();
          if (prefix && suffix) {
            displayKey = prefix;
            displayVal = suffix;
          }
        }
        return h("div", { key: key },
          h("div", { className: "text-xs font-bold text-aq-faint uppercase tracking-wide mb-1" }, displayKey),
          h("p", { className: "aq-mk-p" }, displayVal)
        );
      }).filter(function (x) { return x; })
    );
  }

  // 纯文本报告（如 goal 字段）- 按行解析为层级结构
  if (typeof raw === "string" && raw.indexOf("\n") >= 0) {
    var lines = raw.split("\n");
    var sections = [];
    var currentSection = null;
    var currentContent = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      // 检测标题行（以 # 开头，且不是 "字段名: # 内容" 格式）
      var isTitle = /^#{1,6}\s/.test(line);
      // 排除 "字段名: # 内容" 格式中的 # 内容部分
      var colonLineMatch = line.match(/^([^:：]+)[:：](.*)/);
      if (colonLineMatch && /^#{1,6}\s/.test(colonLineMatch[2].trim())) {
        // 这是 "字段名: # 内容" 格式，不作为标题处理
        isTitle = false;
      }
        if (isTitle) {
          if (currentSection) {
            sections.push({ title: currentSection, content: currentContent.join("\n") });
          }
          currentSection = line.replace(/^#{1,6}\s*/, "");
          currentContent = [];
          continue;
        }

        // 检测 "字段名: 内容" 格式
        var colonMatch = line.match(/^([^:：]+)[:：](.*)/);
        if (colonMatch) {
          var label = colonMatch[1].trim();
          var content = colonMatch[2].trim();
           // 如果是已知字段名，作为小标题
           if (["目标", "结果", "时间", "结论", "分析", "步骤"].indexOf(label) >= 0) {
             if (currentSection) {
               sections.push({ title: currentSection, content: currentContent.join("\n") });
             }
             currentSection = label;
             // 如果内容以 # 开头，去掉前缀作为普通文本
             var cleanContent = content.replace(/^#{1,6}\s+/, "");
             currentContent = [cleanContent];
             continue;
           }
          // 普通键值对
          currentContent.push(h("div", { key: i + "-" + label },
            h("div", { className: "text-xs font-bold text-aq-faint uppercase tracking-wide mb-0.5" }, label),
            h("p", { className: "aq-mk-p" }, content)
          ));
          continue;
        }

      currentContent.push(line);
    }

    if (currentSection) {
      sections.push({ title: currentSection, content: currentContent.join("\n") });
    }

    if (sections.length > 0) {
      return h("div", { className: "aq-prose space-y-4" },
        sections.map(function (s, i) {
          return h("div", { key: i },
            h("h3", { className: "aq-mk-h3" }, s.title),
            s.content ? h("div", { className: "mt-1" },
              h("div", { dangerouslySetInnerHTML: { __html: renderMarkdown(s.content) } })
            ) : null
          );
        })
      );
    }
  }

  return h("div", {
    className: "aq-prose",
    dangerouslySetInnerHTML: { __html: renderMarkdown(raw) }
  });
}

function parseReportJSON(text) {
  if (!text) return null;
  try {
    var obj = JSON.parse(text);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
  } catch (e) {}
  return null;
}

// ─── Policy Tab ──────────────────────────────────────────

function PolicyTab(props) {
  var task = props.task;
  return h("div", { className: "space-y-4" },
    h(Section, { title: "调度" },
      h(Grid, null,
        h(Fact, { label: "循环调度", value: task.cron ? cronToHuman(task.cron) : "未设置" }),
        h(Fact, { label: "一次性定时", value: task.schedule ? formatIso(task.schedule) : "未设置" }),
        h(Fact, { label: "截止窗口", value: task.deadline ? cronToHuman(task.deadline) : "未设置" }),
        h(Fact, { label: "自动归档", value: task.autoArchive === false ? "关闭" : "开启" })
      )
    ),
    h(Section, { title: "失败处理" },
      h(Grid, null,
        h(Fact, { label: "最多推进轮数", value: String(task.maxGoalRounds || "继承默认") }),
        h(Fact, { label: "最多自动恢复", value: String(task.maxBlockedResumes ?? "继承默认") }),
        h(Fact, { label: "任务超时", value: task.timeoutMs ? Math.round(task.timeoutMs / 60000) + " 分钟" : "继承默认" }),
        h(Fact, { label: "最大尝试", value: String(task.maxAttempts || "继承默认") }),
        h(Fact, { label: "浏览器通知", value: task.enableNotifications === true ? "开启" : (task.enableNotifications === false ? "静默" : "继承默认") }),
        h(Fact, { label: "Webhook", value: task.webhook || "未设置" })
      )
    ),
    h("div", { className: "p-3 rounded-xl border-l-[3px] border-l-aq-blue bg-aq-blue-soft" },
      h("p", { className: "text-sm font-semibold text-aq-blue" }, "不会修改 DSH 设置"),
      h("p", { className: "text-xs text-aq-blue/70 mt-0.5" }, "任务使用独立工作目录；你使用 DSH 时，后台任务会自动暂停。")
    )
  );
}

// ─── Shared Components ───────────────────────────────────

function Section(props) {
  return h("div", null,
    h("h4", { className: "text-xs font-bold text-aq-ink-2 uppercase tracking-wide mb-2" }, props.title),
    props.children
  );
}

function Grid(props) {
  return h("div", { className: "grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-aq-line bg-aq-line" },
    (props.children && props.children.length ? props.children : [props.children]).map(function (child, i) {
      return h("div", { key: i, className: "p-3 bg-aq-paper" }, child);
    })
  );
}

function Fact(props) {
  return h("div", null,
    h("span", { className: "block text-xs text-aq-faint mb-0.5" }, props.label),
    h("span", { className: "block text-sm font-semibold text-aq-ink-2 break-words" }, props.value)
  );
}

function taskPhaseLabel(phase, status) {
  var v = String(phase || "");
  if (v === "active" || v === "goal-admitted") return "执行中";
  if (v === "complete") return "已完成";
  if (v === "stopped" || v === "disposed") return "已结束";
  if (v === "rate-limited") return "等待重试";
  if (v.indexOf("foreground-paused") >= 0) return "已暂停";
  if (v.indexOf("cancel-pending") >= 0 || v.indexOf("cleanup-pending") >= 0) return "正在停止";
  if (v.indexOf("launch") >= 0 || v.indexOf("admission-pending") >= 0) return "正在启动";
  if (v.indexOf("uncertain") >= 0 || v.indexOf("containment") >= 0 || v === "unknown") return "状态待确认";
  var cfg = STATUS_CONFIG[status];
  return cfg ? cfg.label : (status || "未知");
}

function needsAttention(task) {
  var phase = String(task.goalPhase || "");
  return task.status === "failed" || task.status === "interrupted" || phase.indexOf("uncertain") >= 0 || phase.indexOf("containment") >= 0 || !!task._goalAdmissionUncertain || !!task._promptAdmissionUncertain;
}

function isolationReason(task) {
  if (task._goalAdmissionUncertain || String(task.goalPhase || "").indexOf("goal-admission") >= 0) return "任务是否成功启动无法确认。";
  if (task._promptAdmissionUncertain || String(task.goalPhase || "").indexOf("prompt-admission") >= 0) return "任务指令是否送达无法确认。";
  if (task.status === "interrupted") return "DSH 重启或会话中断。";
  return task.lastError ? String(task.lastError) : "任务失败。";
}