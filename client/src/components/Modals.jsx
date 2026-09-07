import { Switch } from "@headlessui/react";
import { localDatetimeString, CRON_PRESETS, DEADLINE_PRESETS } from "../utils.js";
import { DialogShell } from "./DialogShell.jsx";
import { TemplatePicker } from "./TemplatePicker.jsx";

function h() { return React.createElement.apply(React, arguments); }

function numberOrUndefined(value) { return value === "" ? undefined : parseInt(value, 10); }

function requestNotificationPermission() {
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;
  try { Notification.requestPermission(); } catch (error) {}
}

// ─── NewTaskModal ─────────────────────────────────────────

export function NewTaskModal(props) {
  var config = props.config || {};
  var transport = props.transport;
  var v = function (val, fallback) { return val === undefined || val === null ? fallback : val; };

  var stage = React.useState("template"); // "template" | "form"
  var fromTemplate = React.useState(null); // { name, content } 或 null
  var key = React.useState("");
  var content = React.useState("");
  var extraInstruction = React.useState("");
  var priority = React.useState(String(v(config.priority, 5)));
  var cron = React.useState("");
  var schedule = React.useState("");
  var deadline = React.useState(config.defaultDeadline || "");
  var maxGoalRounds = React.useState(String(v(config.maxGoalRounds, 40)));
  var maxBlockedResumes = React.useState(String(v(config.maxBlockedResumes, 3)));
  var timeoutMinutes = React.useState(String(Math.round(v(config.taskTimeoutMs, 10800000) / 60000)));
  var maxAttempts = React.useState(String(v(config.maxAttempts, 3)));
  var webhook = React.useState(config.webhook || "");
  var autoArchive = React.useState(config.autoArchive !== false);
  var enableNotifications = React.useState(config.enableNotifications === true);
  var advancedOpen = React.useState(false);
  var notifyOpen = React.useState(false);
  var error = React.useState("");
  var submitting = React.useState(false);

  function onTemplateSelect(result) {
    fromTemplate[1]({ name: result.name || result.templateName, content: result.content });
    content[1](result.content);
    if (!key[0].trim() && result.templateName) {
      var ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
      key[1](result.templateName + "-" + ts);
    }
    stage[1]("form");
  }

  function handleSubmit(e) {
    e.preventDefault();
    var finalContent = content[0].trim();
    if (extraInstruction[0].trim()) finalContent = finalContent + "\n\n---\n\n" + extraInstruction[0].trim();
    if (!finalContent) { error[1]("请填写任务内容"); return; }
    if (cron[0] && schedule[0]) { error[1]("循环调度和一次性定时不能同时设置"); return; }
    var data = {
      content: finalContent, priority: parseInt(priority[0], 10),
      autoArchive: autoArchive[0], enableNotifications: enableNotifications[0]
    };
    if (key[0].trim()) data.key = key[0].trim();
    if (cron[0]) data.cron = cron[0];
    if (schedule[0]) data.schedule = new Date(schedule[0]).toISOString();
    if (deadline[0]) data.deadline = deadline[0];
    if (maxGoalRounds[0]) data.maxGoalRounds = parseInt(maxGoalRounds[0], 10);
    if (maxBlockedResumes[0]) data.maxBlockedResumes = parseInt(maxBlockedResumes[0], 10);
    if (timeoutMinutes[0]) data.timeoutMs = parseInt(timeoutMinutes[0], 10) * 60000;
    if (maxAttempts[0]) data.maxAttempts = parseInt(maxAttempts[0], 10);
    if (webhook[0].trim()) data.webhook = webhook[0].trim();

    submitting[1](true); error[1]("");
    props.onCreate(data).catch(function (e) {
      error[1](e && e.message ? e.message : "创建失败");
    }).finally(function () { submitting[1](false); });
  }

  return h(DialogShell, { open: true, onClose: props.onClose, title: "新建无人值守任务", variant: "modal", className: "w-[min(1100px,94vw)]" },
    stage[0] === "template" && h(TemplatePicker, {
      transport: transport,
      onSelect: onTemplateSelect,
      onCancel: function () { stage[1]("form"); }
    }),
    stage[0] === "form" && h("form", { className: "px-6 pb-6", onSubmit: handleSubmit },
      // ── 头部：来源提示 + 切换入口 ──
      fromTemplate[0] ? h("div", { className: "flex items-center gap-2 py-3 mb-1" },
        h("span", { className: "aq-badge aq-badge-blue" }, fromTemplate[0].name),
        h("span", { className: "text-sm text-aq-muted" }, "已从模板填充内容"),
        h("button", { type: "button", className: "ml-auto text-sm text-aq-blue hover:underline", onClick: function () { stage[1]("template"); } }, "换模板")
      ) : h("div", { className: "flex items-center justify-between py-3 mb-1" },
        h("span", { className: "text-sm text-aq-muted" }, "直接填写任务内容"),
        h("button", { type: "button", className: "text-sm text-aq-blue hover:underline", onClick: function () { stage[1]("template"); } }, "从模板开始")
      ),

      error[0] && h("div", { className: "p-3 mb-4 rounded-lg bg-aq-red-soft text-sm text-aq-red" }, error[0]),

      // ── 从模板来：紧凑确认模式 ──
      fromTemplate[0] && h("div", null,
        h("div", { className: "mb-4 p-3 rounded-xl border border-aq-line bg-aq-surface-alt" },
          h("div", { className: "flex items-center gap-2 mb-2" },
            h("span", { className: "text-xs font-semibold text-aq-faint uppercase" }, "任务内容"),
            h("span", { className: "text-xs text-aq-muted" }, "由模板生成，可直接创建")
          ),
          h("pre", { className: "text-xs font-mono text-aq-ink-2 whitespace-pre-wrap break-words max-h-32 overflow-y-auto m-0" }, content[0])
        ),
        h("div", { className: "mb-4" },
          h("label", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" }, "补充说明（可选）"),
          h("textarea", {
            value: extraInstruction[0], onChange: function (e) { extraInstruction[1](e.target.value); },
            placeholder: "一句话补充，例如：重点关注移动端体验…",
            className: "w-full h-20 p-3 rounded-xl border border-aq-line-2 bg-aq-paper text-sm text-aq-ink resize-y focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none"
          })
        ),
        h("div", { className: "grid grid-cols-2 gap-3 mb-4" },
          h(Field, { label: "任务标识" },
            h("input", { value: key[0], onChange: function (e) { key[1](e.target.value); }, placeholder: "自动生成", className: "aq-input" })),
          h(Field, { label: "优先级" },
            h("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (e) { priority[1](e.target.value); }, className: "aq-input" }))
        )
      ),

      // ── 空白表单：完整模式 ──
      !fromTemplate[0] && h("div", null,
        h("label", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" }, "任务内容（Markdown）"),
        h("textarea", {
          value: content[0], onChange: function (e) { content[1](e.target.value); },
          placeholder: "例如：整理本周客户访谈，归纳三条产品机会并输出报告…",
          required: true,
          className: "w-full h-36 p-3 rounded-xl border border-aq-line-2 bg-aq-paper text-sm text-aq-ink resize-y focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none"
        }),
        h("div", { className: "grid grid-cols-2 gap-3 mt-4" },
          h(Field, { label: "任务标识（可选）", help: "留空将自动生成" },
            h("input", { value: key[0], onChange: function (e) { key[1](e.target.value); }, placeholder: "weekly-insight", className: "aq-input" })),
          h(Field, { label: "优先级（1-10）" },
            h("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (e) { priority[1](e.target.value); }, className: "aq-input" }))
        )
      ),

      // ── 调度（两种模式通用） ──
      h("div", { className: "grid grid-cols-2 gap-3 mt-4" },
        h(CronField, { label: "循环调度", value: cron[0], onChange: cron[1], presets: CRON_PRESETS, placeholder: "0 8 * * *" }),
        h(Field, { label: "一次性定时" },
          h("input", { type: "datetime-local", value: schedule[0], onChange: function (e) { schedule[1](e.target.value); }, className: "aq-input" }))
      ),
      h(CronField, { label: "执行截止时间", value: deadline[0], onChange: deadline[1], presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" }),

      // ── 高级设置 ──
      h("div", { className: "mt-4 pt-3 border-t border-aq-line" },
        h("button", { type: "button", className: "flex items-center justify-between w-full text-sm font-semibold text-aq-ink", onClick: function () { advancedOpen[1](!advancedOpen[0]); } },
          h("span", null, "更多设置"),
          h("span", { className: "text-aq-faint" }, advancedOpen[0] ? "−" : "+")
        ),
        advancedOpen[0] && h("div", { className: "mt-3 grid grid-cols-3 gap-3" },
          h(Field, { label: "最多推进轮数" }, h("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function (e) { maxGoalRounds[1](e.target.value); }, className: "aq-input" })),
          h(Field, { label: "最多自动恢复" }, h("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function (e) { maxBlockedResumes[1](e.target.value); }, className: "aq-input" })),
          h(Field, { label: "最长执行（分钟）" }, h("input", { type: "number", min: "10", max: "1440", value: timeoutMinutes[0], onChange: function (e) { timeoutMinutes[1](e.target.value); }, className: "aq-input" }))
        ),
        advancedOpen[0] && h("div", { className: "mt-3" },
          h(Field, { label: "最多启动尝试（1-10）" }, h("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function (e) { maxAttempts[1](e.target.value); }, className: "aq-input" }))
        ),
        advancedOpen[0] && h("div", { className: "mt-3 space-y-3" },
          h(Field, { label: "Webhook URL" }, h("input", { type: "url", value: webhook[0], onChange: function (e) { webhook[1](e.target.value); }, placeholder: "https://example.com/hook", className: "aq-input" })),
          h(ToggleField, { checked: autoArchive[0], onChange: autoArchive[1], label: "完成后自动归档" }),
          h(ToggleField, { checked: enableNotifications[0], onChange: function (v) { enableNotifications[1](v); if (v) requestNotificationPermission(); }, label: "浏览器结果通知" })
        )
      ),

      // ── 按钮 ──
      h("div", { className: "flex justify-end gap-3 mt-6 pt-4 border-t border-aq-line" },
        fromTemplate[0] && h("button", { type: "button", className: "aq-btn aq-btn-ghost", onClick: function () { stage[1]("template"); }, disabled: submitting[0] }, "返回模板"),
        !fromTemplate[0] && h("button", { type: "button", className: "aq-btn aq-btn-ghost", onClick: function () { stage[1]("template"); }, disabled: submitting[0] }, "从模板开始"),
        h("button", { type: "button", className: "aq-btn aq-btn-ghost", onClick: props.onClose, disabled: submitting[0] }, "取消"),
        h("button", { type: "submit", className: "aq-btn aq-btn-primary", disabled: submitting[0] }, submitting[0] ? "创建中…" : "创建任务")
      )
    )
  );
}

// ─── EditTaskModal ─────────────────────────────────────────

export function EditTaskModal(props) {
  var task = props.task;
  var content = React.useState(task.body || "");
  var cron = React.useState(task.cron || "");
  var deadline = React.useState(task.deadline || "");
  var schedule = React.useState(task.schedule ? localDatetimeString(task.schedule) : "");
  var priority = React.useState(String(task.priority || 5));
  var autoArchive = React.useState(task.autoArchive !== false);
  var enableNotifications = React.useState(task.enableNotifications === true);
  var maxGoalRounds = React.useState(task.maxGoalRounds == null ? "" : String(task.maxGoalRounds));
  var maxBlockedResumes = React.useState(task.maxBlockedResumes == null ? "" : String(task.maxBlockedResumes));
  var timeoutMinutes = React.useState(task.timeoutMs ? String(Math.round(task.timeoutMs / 60000)) : "");
  var maxAttempts = React.useState(task.maxAttempts == null ? "" : String(task.maxAttempts));
  var webhook = React.useState(task.webhook || "");
  var advancedOpen = React.useState(false);
  var notifyOpen = React.useState(false);
  var error = React.useState("");
  var submitting = React.useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!content[0].trim()) { error[1]("任务内容不能为空"); return; }
    if (cron[0] && schedule[0]) { error[1]("循环调度和一次性定时不能同时设置"); return; }
    var patch = {};
    var add = function (n, next, prev) { if (next !== prev) patch[n] = next; };
    add("content", content[0], task.body || "");
    add("cron", cron[0], task.cron || "");
    add("schedule", schedule[0] ? new Date(schedule[0]).toISOString() : "", task.schedule || "");
    add("deadline", deadline[0], task.deadline || "");
    add("priority", parseInt(priority[0], 10), task.priority || 5);
    add("autoArchive", autoArchive[0], task.autoArchive !== false);
    add("enableNotifications", enableNotifications[0], task.enableNotifications === true);
    add("maxGoalRounds", numberOrUndefined(maxGoalRounds[0]) ?? null, task.maxGoalRounds ?? null);
    add("maxBlockedResumes", numberOrUndefined(maxBlockedResumes[0]) ?? null, task.maxBlockedResumes ?? null);
    add("timeoutMs", timeoutMinutes[0] ? parseInt(timeoutMinutes[0], 10) * 60000 : null, task.timeoutMs ?? null);
    add("maxAttempts", numberOrUndefined(maxAttempts[0]) ?? null, task.maxAttempts ?? null);
    add("webhook", webhook[0].trim() || null, task.webhook || null);
    if (!Object.keys(patch).length) { props.onClose(); return; }
    submitting[1](true); error[1]("");
    props.onUpdate(task.key, patch).catch(function (e) { error[1](e.message || "保存失败"); }).finally(function () { submitting[1](false); });
  }

  return h(DialogShell, { open: true, onClose: props.onClose, title: "编辑任务 · " + task.key, variant: "modal", className: "w-[min(1100px,94vw)]" },
    h("form", { className: "px-6 pb-6", onSubmit: handleSubmit },
      h("p", { className: "text-sm text-aq-muted mb-4" }, "仅待执行任务可编辑；运行中的任务请先停止。"),
      error[0] && h("div", { className: "p-3 mb-4 rounded-lg bg-aq-red-soft text-sm text-aq-red" }, error[0]),

      h("label", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" }, "任务内容（Markdown）"),
      h("textarea", { value: content[0], onChange: function (e) { content[1](e.target.value); }, className: "w-full h-36 p-3 rounded-xl border border-aq-line-2 bg-aq-paper text-sm text-aq-ink resize-y focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none" }),

      h("div", { className: "grid grid-cols-2 gap-3 mt-4" },
        h(Field, { label: "优先级（1-10）" }, h("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (e) { priority[1](e.target.value); }, className: "aq-input" })),
        h(CronField, { label: "循环调度", value: cron[0], onChange: cron[1], presets: CRON_PRESETS, placeholder: "0 8 * * *" })
      ),
      h("div", { className: "grid grid-cols-2 gap-3 mt-4" },
        h(Field, { label: "一次性定时" }, h("input", { type: "datetime-local", value: schedule[0], onChange: function (e) { schedule[1](e.target.value); }, className: "aq-input" })),
        h(CronField, { label: "执行截止时间", value: deadline[0], onChange: deadline[1], presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" })
      ),

      h("div", { className: "mt-4 pt-3 border-t border-aq-line" },
        h("button", { type: "button", className: "flex items-center justify-between w-full text-sm font-semibold text-aq-ink", onClick: function () { advancedOpen[1](!advancedOpen[0]); } },
          h("span", null, "高级设置"), h("span", { className: "text-aq-faint" }, advancedOpen[0] ? "−" : "+")
        ),
        advancedOpen[0] && h("div", { className: "mt-3 grid grid-cols-3 gap-3" },
          h(Field, { label: "最多推进轮数" }, h("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function (e) { maxGoalRounds[1](e.target.value); }, placeholder: "默认 40", className: "aq-input" })),
          h(Field, { label: "最多自动恢复" }, h("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function (e) { maxBlockedResumes[1](e.target.value); }, placeholder: "默认 3", className: "aq-input" })),
          h(Field, { label: "最长执行（分钟）" }, h("input", { type: "number", min: "10", max: "1440", value: timeoutMinutes[0], onChange: function (e) { timeoutMinutes[1](e.target.value); }, placeholder: "默认 180", className: "aq-input" }))
        ),
        advancedOpen[0] && h("div", { className: "mt-3" },
          h(Field, { label: "最多启动尝试（1-10）" }, h("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function (e) { maxAttempts[1](e.target.value); }, placeholder: "默认 3", className: "aq-input" }))
        )
      ),

      h("div", { className: "mt-4 pt-3 border-t border-aq-line" },
        h("button", { type: "button", className: "flex items-center justify-between w-full text-sm font-semibold text-aq-ink", onClick: function () { notifyOpen[1](!notifyOpen[0]); } },
          h("span", null, "通知"), h("span", { className: "text-aq-faint" }, notifyOpen[0] ? "−" : "+")
        ),
        notifyOpen[0] && h("div", { className: "mt-3 space-y-3" },
          h(Field, { label: "Webhook URL" }, h("input", { type: "url", value: webhook[0], onChange: function (e) { webhook[1](e.target.value); }, placeholder: "https://example.com/hook", className: "aq-input" })),
          h(ToggleField, { checked: autoArchive[0], onChange: autoArchive[1], label: "完成后自动归档" }),
          h(ToggleField, { checked: enableNotifications[0], onChange: function (v) { enableNotifications[1](v); if (v) requestNotificationPermission(); }, label: "浏览器结果通知" })
        )
      ),

      h("div", { className: "flex justify-end gap-3 mt-6 pt-4 border-t border-aq-line" },
        h("button", { type: "button", className: "aq-btn aq-btn-ghost", onClick: props.onClose, disabled: submitting[0] }, "取消"),
        h("button", { type: "submit", className: "aq-btn aq-btn-primary", disabled: submitting[0] }, submitting[0] ? "保存中…" : "保存")
      )
    )
  );
}

// ─── ConfigPanel ─────────────────────────────────────────

export function ConfigPanel(props) {
  var config = props.config || {};
  var v = function (val, fallback) { return val === undefined || val === null ? fallback : val; };
  var maxConcurrent = React.useState(String(v(config.maxConcurrent, 1)));
  var maxGoalRounds = React.useState(String(v(config.maxGoalRounds, 40)));
  var maxBlockedResumes = React.useState(String(v(config.maxBlockedResumes, 3)));
  var autoArchive = React.useState(config.autoArchive !== false);
  var unknownThreshold = React.useState(String(v(config.unknownThreshold, 3)));
  var taskTimeoutMin = React.useState(String(Math.round(v(config.taskTimeoutMs, 10800000) / 60000)));
  var maxAttempts = React.useState(String(v(config.maxAttempts, 3)));
  var defaultDeadline = React.useState(config.defaultDeadline || "");
  var enableNotifications = React.useState(config.enableNotifications === true);
  var webhook = React.useState(config.webhook || "");
  var priority = React.useState(String(v(config.priority, 5)));
  var backoffBaseSec = React.useState(String(Math.round(v(config.retryBackoffBaseMs, 30000) / 1000)));
  var backoffMaxSec = React.useState(String(Math.round(v(config.retryBackoffMaxMs, 300000) / 1000)));
  var saving = React.useState(false);
  var saveError = React.useState("");

  function handleSave(e) {
    e.preventDefault();
    var patch = {};
    var add = function (n, next, prev) { if (next !== prev) patch[n] = next; };
    add("maxGoalRounds", parseInt(maxGoalRounds[0], 10), v(config.maxGoalRounds, 40));
    add("maxBlockedResumes", parseInt(maxBlockedResumes[0], 10), v(config.maxBlockedResumes, 3));
    add("autoArchive", autoArchive[0], config.autoArchive !== false);
    add("unknownThreshold", parseInt(unknownThreshold[0], 10), v(config.unknownThreshold, 3));
    add("taskTimeoutMs", parseInt(taskTimeoutMin[0], 10) * 60000, v(config.taskTimeoutMs, 10800000));
    add("maxAttempts", parseInt(maxAttempts[0], 10), v(config.maxAttempts, 3));
    add("defaultDeadline", defaultDeadline[0] || null, config.defaultDeadline || null);
    add("webhook", webhook[0].trim() || null, config.webhook || null);
    add("enableNotifications", enableNotifications[0], config.enableNotifications === true);
    add("priority", parseInt(priority[0], 10), v(config.priority, 5));
    add("retryBackoffBaseMs", parseInt(backoffBaseSec[0], 10) * 1000, v(config.retryBackoffBaseMs, 30000));
    add("retryBackoffMaxMs", parseInt(backoffMaxSec[0], 10) * 1000, v(config.retryBackoffMaxMs, 300000));
    var ops = [];
    var concurrency = parseInt(maxConcurrent[0], 10);
    if (concurrency !== v(config.maxConcurrent, 1)) ops.push(props.onSetConcurrency(concurrency));
    if (Object.keys(patch).length) ops.push(props.onUpdate(patch));
    if (!ops.length) { props.onClose(); return; }
    saving[1](true); saveError[1]("");
    Promise.all(ops).then(props.onClose).catch(function (e) { saveError[1](e.message || "保存失败"); }).finally(function () { saving[1](false); });
  }

  return h(DialogShell, { open: true, onClose: props.onClose, title: "运行设置", variant: "drawer", className: "w-[min(930px,96vw)]" },
    h("form", { className: "flex-1 min-h-0 px-6 pt-4 pb-0 overflow-y-auto", onSubmit: handleSave },
      saveError[0] && h("div", { className: "p-3 mb-4 rounded-lg bg-aq-red-soft text-sm text-aq-red" }, saveError[0]),

      h(Section, { title: "执行限制" },
        h("div", { className: "grid grid-cols-2 gap-3" },
          h(Field, { label: "最大并发（1-8）" }, h("input", { type: "number", min: "1", max: "8", value: maxConcurrent[0], onChange: function (e) { maxConcurrent[1](e.target.value); }, className: "aq-input" })),
          h(Field, { label: "任务超时（分钟）" }, h("input", { type: "number", min: "10", max: "1440", value: taskTimeoutMin[0], onChange: function (e) { taskTimeoutMin[1](e.target.value); }, className: "aq-input" }))
        ),
        h("div", { className: "grid grid-cols-2 gap-3 mt-3" },
          h(Field, { label: "最多推进轮数" }, h("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function (e) { maxGoalRounds[1](e.target.value); }, className: "aq-input" })),
          h(Field, { label: "最多自动恢复" }, h("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function (e) { maxBlockedResumes[1](e.target.value); }, className: "aq-input" }))
        )
      ),

      h(Section, { title: "失败与重试" },
        h("div", { className: "grid grid-cols-2 gap-3" },
          h(Field, { label: "最多启动尝试" }, h("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function (e) { maxAttempts[1](e.target.value); }, className: "aq-input" })),
          h(Field, { label: "连续状态异常次数" }, h("input", { type: "number", min: "1", max: "10", value: unknownThreshold[0], onChange: function (e) { unknownThreshold[1](e.target.value); }, className: "aq-input" }))
        ),
        h("div", { className: "grid grid-cols-2 gap-3 mt-3" },
          h(Field, { label: "首次重试等待（秒）" }, h("input", { type: "number", min: "5", max: "600", value: backoffBaseSec[0], onChange: function (e) { backoffBaseSec[1](e.target.value); }, className: "aq-input" })),
          h(Field, { label: "最长重试等待（秒）" }, h("input", { type: "number", min: "10", max: "3600", value: backoffMaxSec[0], onChange: function (e) { backoffMaxSec[1](e.target.value); }, className: "aq-input" }))
        )
      ),

      h(Section, { title: "任务默认值" },
        h("div", { className: "grid grid-cols-2 gap-3" },
          h(Field, { label: "默认优先级" }, h("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (e) { priority[1](e.target.value); }, className: "aq-input" })),
          h(Field, { label: "默认截止时间（cron）" }, h("input", { value: defaultDeadline[0], onChange: function (e) { defaultDeadline[1](e.target.value); }, placeholder: "0 21 * * *", className: "aq-input" }))
        ),
        h("div", { className: "mt-3" },
          h(Field, { label: "Webhook URL" }, h("input", { type: "url", value: webhook[0], onChange: function (e) { webhook[1](e.target.value); }, placeholder: "https://example.com/hook", className: "aq-input" }))
        ),
        h("div", { className: "mt-3 space-y-3" },
          h(ToggleField, { checked: autoArchive[0], onChange: autoArchive[1], label: "任务结束后自动归档" }),
          h(ToggleField, { checked: enableNotifications[0], onChange: function (v) { enableNotifications[1](v); if (v) requestNotificationPermission(); }, label: "浏览器结果通知" })
        )
      ),

      h(Section, { title: "存储" },
        h(Field, { label: "队列根目录", help: "只读，由启动配置决定" }, h("input", { value: config.queueDir || "由启动配置决定", disabled: true, className: "aq-input bg-aq-surface-alt text-aq-faint" })),
        h("div", { className: "mt-3" },
          h(Field, { label: "AI 直接操作队列", help: "只读，在插件启动配置中设置" }, h("input", { value: config.enableHostAiTools !== false ? "已启用" : "已关闭", disabled: true, className: "aq-input bg-aq-surface-alt text-aq-faint" }))
        )
      ),

      h("div", { className: "sticky bottom-0 flex justify-end gap-3 py-4 mt-2 border-t border-aq-line bg-aq-paper" },
        h("button", { type: "button", className: "aq-btn aq-btn-ghost", onClick: props.onClose, disabled: saving[0] }, "取消"),
        h("button", { type: "submit", className: "aq-btn aq-btn-primary", disabled: saving[0] }, saving[0] ? "保存中…" : "保存设置")
      )
    )
  );
}

// ─── ConfirmModal ─────────────────────────────────────────

export function ConfirmModal(props) {
  return h(DialogShell, { open: true, onClose: props.onCancel, title: props.title || "确认操作", variant: "modal", className: "w-[min(630px,94vw)]" },
    h("div", { className: "px-6 pb-6" },
      h("p", { className: "text-sm text-aq-ink-2 leading-relaxed" }, props.message),
      h("div", { className: "flex justify-end gap-3 mt-5 pt-4 border-t border-aq-line" },
        h("button", { className: "aq-btn aq-btn-ghost", onClick: props.onCancel }, "取消"),
        h("button", { className: "aq-btn " + (props.tone === "danger" ? "aq-btn-danger" : "aq-btn-primary"), onClick: props.onConfirm }, props.confirmLabel || "确认")
      )
    )
  );
}

// ─── Shared helpers ─────────────────────────────────────────

function Field(props) {
  return h("div", null,
    props.label && h("label", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" }, props.label),
    props.children,
    props.help && h("p", { className: "text-xs text-aq-faint mt-1" }, props.help)
  );
}

function ToggleField(props) {
  return h("label", { className: "flex items-center gap-3 cursor-pointer" },
    h(Switch, {
      checked: props.checked,
      onChange: props.onChange,
      className: "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-aq-blue/20 " +
        (props.checked ? "bg-aq-blue" : "bg-aq-line-2")
    },
      h("span", {
        "aria-hidden": "true",
        className: "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " +
          (props.checked ? "translate-x-4" : "translate-x-0")
      })
    ),
    h("span", { className: "text-sm text-aq-ink-2" }, props.label)
  );
}

function Section(props) {
  return h("div", { className: "mb-5 pb-5 border-b border-aq-line" },
    h("h4", { className: "text-sm font-bold text-aq-ink-2 mb-3" }, props.title),
    props.children
  );
}

function CronField(props) {
  var selectValue = React.useState(function () {
    var match = (props.presets || []).find(function (p) { return p.value === props.value && p.value !== "" && p.value !== "__custom__"; });
    return match ? match.value : (props.value ? "__custom__" : "");
  });
  var custom = selectValue[0] === "__custom__";
  return h("div", null,
    h("span", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" }, props.label),
    h("div", { className: "grid grid-cols-[minmax(120px,0.85fr)_minmax(0,1.15fr)] gap-2" },
      h("select", {
        value: selectValue[0],
        onChange: function (e) {
          var v = e.target.value;
          selectValue[1](v);
          if (v !== "__custom__") props.onChange(v);
        },
        className: "h-10 px-2 rounded-lg border border-aq-line-2 bg-aq-paper text-sm text-aq-ink focus:border-aq-blue outline-none cursor-pointer"
      },
        (props.presets || []).map(function (p) { return h("option", { key: p.value, value: p.value }, p.label); })
      ),
      h("input", {
        value: custom ? props.value : "",
        onChange: function (e) { props.onChange(e.target.value); },
        placeholder: props.placeholder,
        disabled: !custom,
        className: "h-10 px-3 rounded-lg border border-aq-line-2 bg-aq-paper text-sm text-aq-ink focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none disabled:bg-aq-surface-alt disabled:text-aq-faint"
      })
    )
  );
}