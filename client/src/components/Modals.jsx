import { Switch } from "@headlessui/react";
import { CRON_PRESETS, DEADLINE_PRESETS } from "../utils.js";
import { DialogShell } from "./DialogShell.jsx";

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

  var showTemplates = React.useState(false);
  var templates = React.useState([]);
  var templatesLoading = React.useState(false);
  var fromTemplate = React.useState(null);
  var key = React.useState("");
  var content = React.useState("");
  var priority = React.useState(String(v(config.priority, 5)));
  var cron = React.useState("");
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

  function loadTemplates() {
    if (templates[0].length) { showTemplates[1](!showTemplates[0]); return; }
    templatesLoading[1](true);
    transport.listTemplates().then(function (data) {
      templates[1]((data && data.templates) || []);
      templatesLoading[1](false);
      showTemplates[1](true);
    }).catch(function () { templatesLoading[1](false); });
  }

  function onTemplateSelect(tpl) {
    fromTemplate[1](tpl);
    content[1](tpl.body || "");
    if (!key[0].trim()) {
      var ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
      key[1]((tpl.name || "task") + "-" + ts);
    }
    showTemplates[1](false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    var finalContent = content[0].trim();
    if (!finalContent) { error[1]("请填写任务内容"); return; }
    var data = {
      content: finalContent, priority: parseInt(priority[0], 10),
      autoArchive: autoArchive[0], enableNotifications: enableNotifications[0]
    };
    if (key[0].trim()) data.key = key[0].trim();
    if (cron[0]) data.cron = cron[0];
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

  return h(DialogShell, { open: true, onClose: props.onClose, title: "新建无人值守任务", variant: "modal", size: "lg" },
    h("form", { className: "flex flex-col flex-1 min-h-0 px-6 pb-6", onSubmit: handleSubmit },
      showTemplates[0] && h(TemplatePickerInline, {
        templates: templates[0], loading: templatesLoading[0],
        onSelect: onTemplateSelect, onClose: function () { showTemplates[1](false); }
      }),
      !showTemplates[0] && h("div", { className: "flex-1 min-h-0 overflow-y-auto py-4", style: { overscrollBehaviorY: "contain" } },
        error[0] && h("div", { className: "p-3 mb-4 rounded-lg bg-aq-red-soft text-sm text-aq-red" }, error[0]),

        fromTemplate[0] && h("div", { className: "flex items-center gap-2 py-2 mb-1" },
          h("span", { className: "aq-badge aq-badge-blue" }, fromTemplate[0].name),
          h("span", { className: "text-sm text-aq-muted" }, "已从模板填充"),
          h("button", { type: "button", className: "ml-auto text-sm text-aq-blue hover:underline", onClick: loadTemplates }, "换模板")
        ),

        h("div", { className: "flex items-center justify-between mb-1.5" },
          h("label", { className: "text-sm font-semibold text-aq-ink-2" }, "任务内容（Markdown）"),
          !fromTemplate[0] && h("button", { type: "button", className: "text-sm text-aq-blue hover:underline", onClick: loadTemplates }, "从模板开始")
        ),
        h("textarea", { value: content[0], onChange: function (e) { content[1](e.target.value); }, placeholder: "例如：整理本周客户访谈，归纳三条产品机会并输出报告…", required: true,
          className: "w-full h-36 p-3 rounded-xl border border-aq-line-2 bg-aq-paper text-sm text-aq-ink resize-y focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none" }),
        h("div", { className: "grid grid-cols-2 gap-3 mt-4" },
          h(Field, { label: "任务标识（可选）", help: "留空将自动生成" },
            h("input", { value: key[0], onChange: function (e) { key[1](e.target.value); }, placeholder: "weekly-insight", className: "aq-input" })),
          h(Field, { label: "优先级（1-10）" },
            h("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (e) { priority[1](e.target.value); }, className: "aq-input" }))
        ),

        // 调度
        h("div", { className: "mt-4 space-y-4" },
          h(CronField, { label: "定时调度", value: cron[0], onChange: cron[1], presets: CRON_PRESETS, placeholder: "0 8 * * *" }),
          h(CronField, { label: "执行截止时间", value: deadline[0], onChange: deadline[1], presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" })
        ),

        // 高级设置
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
        )
      ),

      h("div", { className: "flex justify-end gap-3 pt-4 border-t border-aq-line flex-shrink-0" },
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
    var patch = {};
    var add = function (n, next, prev) { if (next !== prev) patch[n] = next; };
    add("content", content[0], task.body || "");
    add("cron", cron[0], task.cron || "");
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

  return h(DialogShell, { open: true, onClose: props.onClose, title: "编辑任务 · " + task.key, variant: "modal", size: "lg" },
    h("form", { className: "flex flex-col flex-1 min-h-0 px-6 pb-6", onSubmit: handleSubmit },
      h("p", { className: "text-sm text-aq-muted py-3" }, "仅待执行任务可编辑；运行中的任务请先停止。"),
      error[0] && h("div", { className: "p-3 mb-4 rounded-lg bg-aq-red-soft text-sm text-aq-red" }, error[0]),

      h("label", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" }, "任务内容（Markdown）"),
      h("textarea", { value: content[0], onChange: function (e) { content[1](e.target.value); }, className: "w-full h-36 p-3 rounded-xl border border-aq-line-2 bg-aq-paper text-sm text-aq-ink resize-y focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none" }),

      h("div", { className: "grid grid-cols-2 gap-3 mt-4" },
        h(Field, { label: "优先级（1-10）" }, h("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (e) { priority[1](e.target.value); }, className: "aq-input" })),
        h(CronField, { label: "定时调度", value: cron[0], onChange: cron[1], presets: CRON_PRESETS, placeholder: "0 8 * * *" })
      ),
      h("div", { className: "mt-4" },
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

      h("div", { className: "flex justify-end gap-3 pt-4 border-t border-aq-line flex-shrink-0" },
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

  return h(DialogShell, { open: true, onClose: props.onClose, title: "运行设置", variant: "drawer" },
    h("form", { className: "flex-1 min-h-0 px-6 pt-4 pb-0 overflow-y-auto", style: { overscrollBehaviorY: "contain" }, onSubmit: handleSave },
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
  return h(DialogShell, { open: true, onClose: props.onCancel, title: props.title || "确认操作", variant: "modal", size: "sm" },
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

// ─── Inline Template Picker ──────────────────────────────

function TemplatePickerInline(props) {
  if (props.loading) {
    return h("div", { className: "py-4 text-center" },
      h("div", { className: "w-5 h-5 mx-auto border-2 border-aq-line-2 border-t-aq-blue rounded-full animate-spin" }),
      h("p", { className: "text-sm text-aq-muted mt-2" }, "加载模板…")
    );
  }
  if (!props.templates.length) {
    return h("div", { className: "py-4 text-center" },
      h("p", { className: "text-sm text-aq-muted" }, "模板库暂无可用模板"),
      h("button", { className: "text-sm text-aq-blue hover:underline mt-1", onClick: props.onClose }, "关闭")
    );
  }
  return h("div", { className: "py-3" },
    h("div", { className: "flex items-center justify-between mb-3" },
      h("span", { className: "text-sm font-semibold text-aq-ink" }, "从模板开始"),
      h("button", { className: "text-sm text-aq-blue hover:underline", onClick: props.onClose }, "关闭")
    ),
    h("div", { className: "grid grid-cols-2 gap-2" },
      props.templates.map(function (tpl) {
        return h("button", {
          key: tpl.name, type: "button",
          onClick: function () { props.onSelect(tpl); },
          className: "text-left p-3 rounded-lg border border-aq-line hover:border-aq-blue hover:bg-aq-blue-soft/50 transition"
        },
          h("div", { className: "text-sm font-semibold text-aq-ink" }, tpl.name),
          h("p", { className: "text-xs text-aq-muted mt-0.5 line-clamp-2" }, tpl.description || "暂无描述")
        );
      })
    )
  );
}

// ─── TemplateManager ─────────────────────────────────────

export function TemplateManager(props) {
  var transport = props.transport;
  var templates = React.useState([]);
  var loading = React.useState(true);
  var error = React.useState("");
  var editing = React.useState(null);
  var form = React.useState({ name: "", description: "", category: "", body: "" });
  var saving = React.useState(false);
  var saveError = React.useState("");

  function load() {
    loading[1](true); error[1]("");
    transport.listTemplates().then(function (data) {
      templates[1]((data && data.templates) || []);
      loading[1](false);
    }).catch(function (err) {
      error[1](err.message || "加载失败");
      loading[1](false);
    });
  }
  React.useEffect(load, []);

  function startEdit(tpl) {
    editing[1](tpl ? tpl.name : null);
    form[1](tpl ? { name: tpl.name, description: tpl.description || "", category: tpl.category || "", body: tpl.body || "" } : { name: "", description: "", category: "", body: "" });
  }

  function handleSave(e) {
    e.preventDefault();
    var data = form[0];
    if (!data.name.trim() || !data.body.trim()) { saveError[1]("名称和内容为必填"); return; }
    saving[1](true); saveError[1]("");
    var params = [];
    var promise;
    if (editing[0]) {
      promise = transport.updateTemplate(editing[0], data);
    } else {
      promise = transport.createTemplate(data);
    }
    promise.then(function () {
      editing[1](null);
      load();
      saving[1](false);
    }).catch(function (err) {
      saveError[1](err.message || "保存失败");
      saving[1](false);
    });
  }

  function handleDelete(name) {
    if (!confirm("确认删除模板 \"" + name + "\"？此操作不可恢复。")) return;
    transport.deleteTemplate(name).then(load).catch(function (err) { error[1](err.message || "删除失败"); });
  }

  return h(DialogShell, { open: true, onClose: props.onClose, title: "模板管理", variant: "drawer" },
    h("div", { className: "flex flex-col h-full" },
      editing[0] !== null
        ? h("form", { className: "flex-1 overflow-y-auto px-6 py-4", style: { overscrollBehaviorY: "contain" }, onSubmit: handleSave },
            saveError[0] && h("div", { className: "p-3 mb-4 rounded-lg bg-aq-red-soft text-sm text-aq-red" }, saveError[0]),
            h(Field, { label: "模板名称" }, h("input", { value: form[0].name, onChange: function (e) { form[1](Object.assign({}, form[0], { name: e.target.value })); }, className: "aq-input" })),
            h("div", { className: "grid grid-cols-2 gap-3 mt-3" },
              h(Field, { label: "分类" }, h("input", { value: form[0].category, onChange: function (e) { form[1](Object.assign({}, form[0], { category: e.target.value })); }, placeholder: "开发", className: "aq-input" })),
              h(Field, { label: "描述" }, h("input", { value: form[0].description, onChange: function (e) { form[1](Object.assign({}, form[0], { description: e.target.value })); }, className: "aq-input" }))
            ),
            h("div", { className: "mt-3" },
              h("label", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" }, "模板内容（Markdown）"),
              h("textarea", { value: form[0].body, onChange: function (e) { form[1](Object.assign({}, form[0], { body: e.target.value })); }, className: "w-full h-48 p-3 rounded-xl border border-aq-line-2 bg-aq-paper text-sm text-aq-ink resize-y focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none font-mono" })
            ),
            h("p", { className: "text-xs text-aq-faint mt-1" }, "使用 YAML frontmatter 定义参数。支持 {{key}} 占位符语法。"),
            h("div", { className: "flex justify-end gap-3 mt-4 pt-4 border-t border-aq-line" },
              h("button", { type: "button", className: "aq-btn aq-btn-ghost", onClick: function () { editing[1](null); }, disabled: saving[0] }, "取消"),
              h("button", { type: "submit", className: "aq-btn aq-btn-primary", disabled: saving[0] }, saving[0] ? "保存中…" : "保存")
            )
          )
        : h("div", { className: "flex-1 overflow-y-auto px-6 py-4", style: { overscrollBehaviorY: "contain" } },
            h("div", { className: "flex items-center justify-between mb-4" },
              h("span", { className: "text-sm font-semibold text-aq-ink" }, "模板列表"),
              h("button", { className: "aq-btn aq-btn-primary text-xs h-7", onClick: function () { startEdit(null); } }, "新建模板")
            ),
            loading[0] && h("div", { className: "text-center py-8 text-sm text-aq-muted" }, "加载中…"),
            error[0] && h("div", { className: "p-3 rounded-lg bg-aq-red-soft text-sm text-aq-red mb-3" }, error[0]),
            !loading[0] && !templates[0].length && h("p", { className: "text-sm text-aq-muted py-4" }, "暂无模板"),
            templates[0].map(function (tpl) {
              return h("div", { key: tpl.name, className: "flex items-center justify-between py-3 border-b border-aq-line last:border-b-0" },
                h("div", { className: "flex-1 min-w-0" },
                  h("div", { className: "text-sm font-semibold text-aq-ink" }, tpl.name),
                  h("div", { className: "text-xs text-aq-faint mt-0.5" }, tpl.description || "暂无描述"),
                  tpl.category && h("span", { className: "inline-block mt-1 text-xs text-aq-muted bg-aq-surface-alt px-1.5 py-0.5 rounded" }, tpl.category)
                ),
                h("div", { className: "flex items-center gap-1 flex-shrink-0 ml-3" },
                  h("button", { className: "aq-btn aq-btn-ghost h-6 px-2 text-xs", onClick: function () { startEdit(tpl); } }, "编辑"),
                  h("button", { className: "aq-btn aq-btn-ghost h-6 px-2 text-xs text-aq-red", onClick: function () { handleDelete(tpl.name); } }, "删除")
                )
              );
            })
          )
    )
  );
}