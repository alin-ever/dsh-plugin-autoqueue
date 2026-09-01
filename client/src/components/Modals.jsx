import { localDatetimeString, CRON_PRESETS, DEADLINE_PRESETS } from "../utils.js";
import { DialogShell } from "./DialogShell.jsx";

// The DSH module loader installs React inside the plugin factory. Keep this
// wrapper lazy so evaluating the production bundle never touches the Host
// React global before __ModuleLoader__.load has registered the plugin.
function h() { return React.createElement.apply(React, arguments); }

function numberOrUndefined(value) {
  return value === "" ? undefined : parseInt(value, 10);
}

function requestNotificationPermission() {
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;
  try { Notification.requestPermission(); } catch (error) {}
}

export function NewTaskModal(props) {
  var config = props.config || {};
  var valueOr = function (value, fallback) { return value === undefined || value === null ? fallback : value; };
  var key = React.useState("");
  var content = React.useState("");
  var priority = React.useState(String(valueOr(config.priority, 5)));
  var cron = React.useState("");
  var schedule = React.useState("");
  var deadline = React.useState(config.defaultDeadline || "");
  var maxGoalRounds = React.useState(String(valueOr(config.maxGoalRounds, 40)));
  var maxBlockedResumes = React.useState(String(valueOr(config.maxBlockedResumes, 3)));
  var timeoutMinutes = React.useState(String(Math.round(valueOr(config.taskTimeoutMs, 10800000) / 60000)));
  var maxAttempts = React.useState(String(valueOr(config.maxAttempts, 3)));
  var webhook = React.useState(config.webhook || "");
  var autoArchive = React.useState(config.autoArchive !== false);
  var enableNotifications = React.useState(config.enableNotifications === true);
  var advancedOpen = React.useState(false);
  var notifyOpen = React.useState(false);
  var error = React.useState("");
  var submitting = React.useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    if (!content[0].trim()) { error[1]("请填写任务内容"); return; }
    if (cron[0] && schedule[0]) { error[1]("循环调度和一次性定时不能同时设置"); return; }
    var data = {
      content: content[0].trim(), priority: parseInt(priority[0], 10),
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
    props.onCreate(data).catch(function (caught) {
      error[1](caught && caught.message ? caught.message : "创建失败");
    }).finally(function () { submitting[1](false); });
  }

  return h(DialogShell, { title: "新建无人值守任务", onClose: props.onClose, className: "wide" },
    h("form", { className: "aq-modal-content", onSubmit: handleSubmit },
      h("p", { className: "aq-modal-subtitle" }, "任务会进入隔离工作目录；当前台会话活跃时，后台自动让行。"),
      error[0] && h("div", { className: "aq-inline-error", role: "alert" }, error[0]),
      h("label", { htmlFor: "aq-new-content" }, "任务内容（Markdown）"),
      h("textarea", { id: "aq-new-content", "data-dialog-initial-focus": "", value: content[0], onChange: function (event) { content[1](event.target.value); }, placeholder: "例如：整理本周客户访谈，归纳三条产品机会并输出报告…", required: true }),
      h("div", { className: "aq-row" },
        h(Field, { label: "任务标识（可选）", help: "留空将自动生成" }, h("input", { value: key[0], onChange: function (event) { key[1](event.target.value); }, placeholder: "weekly-insight" })),
        h(Field, { label: "优先级（1-10）" }, h("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (event) { priority[1](event.target.value); } }))
      ),
      h("div", { className: "aq-row" },
        h(CronField, { label: "循环调度", value: cron[0], onChange: cron[1], presets: CRON_PRESETS, placeholder: "0 8 * * *" }),
        h(Field, { label: "一次性定时" }, h("input", { type: "datetime-local", value: schedule[0], onChange: function (event) { schedule[1](event.target.value); } }))
      ),
      h(CronField, { label: "执行截止窗口", value: deadline[0], onChange: deadline[1], presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" }),
      h(Disclosure, { title: "高级执行策略", hint: "轮数、超时与重试", open: advancedOpen[0], onToggle: function () { advancedOpen[1](!advancedOpen[0]); } },
        h("div", { className: "aq-row three" },
          h(Field, { label: "最大 Goal 轮数" }, h("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function (event) { maxGoalRounds[1](event.target.value); } })),
          h(Field, { label: "最大反阻塞" }, h("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function (event) { maxBlockedResumes[1](event.target.value); } })),
          h(Field, { label: "最长执行（分钟）" }, h("input", { type: "number", min: "10", max: "1440", value: timeoutMinutes[0], onChange: function (event) { timeoutMinutes[1](event.target.value); } }))
        ),
        h(Field, { label: "最大派发尝试（1-10）" }, h("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function (event) { maxAttempts[1](event.target.value); } })),
        h("div", { className: "aq-safety-note" }, h("strong", null, "隔离锁定"), " DSH rc.2 的模型、工作区和预设覆盖会改变宿主全局状态，因此本任务台不开放这些字段。")
      ),
      h(Disclosure, { title: "通知与回调", hint: "默认完全静默", open: notifyOpen[0], onToggle: function () { notifyOpen[1](!notifyOpen[0]); } },
        h(Field, { label: "Webhook URL" }, h("input", { type: "url", value: webhook[0], onChange: function (event) { webhook[1](event.target.value); }, placeholder: "https://example.com/hook" })),
        h(CheckField, { checked: autoArchive[0], onChange: autoArchive[1], label: "完成后自动归档（推荐）" }),
        h(CheckField, { checked: enableNotifications[0], onChange: function (checked) { enableNotifications[1](checked); if (checked) requestNotificationPermission(); }, label: "浏览器结果通知（仅在我主动开启后）" })
      ),
      h("div", { className: "aq-modal-actions" },
        h("button", { type: "button", className: "aq-btn", onClick: props.onClose, disabled: submitting[0] }, "取消"),
        h("button", { type: "submit", className: "aq-btn primary", disabled: submitting[0] }, submitting[0] ? "创建中…" : "创建任务")
      )
    )
  );
}

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

  function handleSubmit(event) {
    event.preventDefault();
    if (!content[0].trim()) { error[1]("任务内容不能为空"); return; }
    if (cron[0] && schedule[0]) { error[1]("循环调度和一次性定时不能同时设置"); return; }
    var patch = {};
    var add = function (name, next, previous) { if (next !== previous) patch[name] = next; };
    add("content", content[0], task.body || "");
    add("cron", cron[0], task.cron || "");
    var scheduleIso = schedule[0] ? new Date(schedule[0]).toISOString() : "";
    add("schedule", scheduleIso, task.schedule || "");
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
    props.onUpdate(task.key, patch).catch(function (caught) { error[1](caught.message || "保存失败"); }).finally(function () { submitting[1](false); });
  }

  return h(DialogShell, { title: "编辑任务 · " + task.key, onClose: props.onClose, className: "wide" },
    h("form", { className: "aq-modal-content", onSubmit: handleSubmit },
      h("p", { className: "aq-modal-subtitle" }, "仅待执行任务可编辑；运行中的任务请先停止。"),
      error[0] && h("div", { className: "aq-inline-error", role: "alert" }, error[0]),
      h("label", { htmlFor: "aq-edit-content" }, "任务内容（Markdown）"),
      h("textarea", { id: "aq-edit-content", "data-dialog-initial-focus": "", value: content[0], onChange: function (event) { content[1](event.target.value); } }),
      h("div", { className: "aq-row" },
        h(Field, { label: "优先级（1-10）" }, h("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (event) { priority[1](event.target.value); } })),
        h(CronField, { label: "循环调度", value: cron[0], onChange: cron[1], presets: CRON_PRESETS, placeholder: "0 8 * * *" })
      ),
      h("div", { className: "aq-row" },
        h(Field, { label: "一次性定时" }, h("input", { type: "datetime-local", value: schedule[0], onChange: function (event) { schedule[1](event.target.value); } })),
        h(CronField, { label: "执行截止窗口", value: deadline[0], onChange: deadline[1], presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" })
      ),
      h(Disclosure, { title: "高级执行策略", hint: "轮数、超时与重试", open: advancedOpen[0], onToggle: function () { advancedOpen[1](!advancedOpen[0]); } },
        h("div", { className: "aq-row three" },
          h(Field, { label: "最大 Goal 轮数" }, h("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function (event) { maxGoalRounds[1](event.target.value); }, placeholder: "默认 40" })),
          h(Field, { label: "最大反阻塞" }, h("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function (event) { maxBlockedResumes[1](event.target.value); }, placeholder: "默认 3" })),
          h(Field, { label: "最长执行（分钟）" }, h("input", { type: "number", min: "10", max: "1440", value: timeoutMinutes[0], onChange: function (event) { timeoutMinutes[1](event.target.value); }, placeholder: "默认 180" }))
        ),
        h(Field, { label: "最大派发尝试（1-10）" }, h("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function (event) { maxAttempts[1](event.target.value); }, placeholder: "默认 3" }))
      ),
      h(Disclosure, { title: "通知与回调", hint: "默认完全静默", open: notifyOpen[0], onToggle: function () { notifyOpen[1](!notifyOpen[0]); } },
        h(Field, { label: "Webhook URL" }, h("input", { type: "url", value: webhook[0], onChange: function (event) { webhook[1](event.target.value); }, placeholder: "https://example.com/hook" })),
        h(CheckField, { checked: autoArchive[0], onChange: autoArchive[1], label: "完成后自动归档" }),
        h(CheckField, { checked: enableNotifications[0], onChange: function (checked) { enableNotifications[1](checked); if (checked) requestNotificationPermission(); }, label: "浏览器结果通知" })
      ),
      h("div", { className: "aq-modal-actions" },
        h("button", { type: "button", className: "aq-btn", onClick: props.onClose, disabled: submitting[0] }, "取消"),
        h("button", { type: "submit", className: "aq-btn primary", disabled: submitting[0] }, submitting[0] ? "保存中…" : "保存")
      )
    )
  );
}

export function ConfigPanel(props) {
  var config = props.config || {};
  var valueOr = function (value, fallback) { return value === undefined || value === null ? fallback : value; };
  var maxConcurrent = React.useState(String(valueOr(config.maxConcurrent, 1)));
  var maxGoalRounds = React.useState(String(valueOr(config.maxGoalRounds, 40)));
  var maxBlockedResumes = React.useState(String(valueOr(config.maxBlockedResumes, 3)));
  var autoArchive = React.useState(config.autoArchive !== false);
  var unknownThreshold = React.useState(String(valueOr(config.unknownThreshold, 3)));
  var taskTimeoutMin = React.useState(String(Math.round(valueOr(config.taskTimeoutMs, 10800000) / 60000)));
  var maxAttempts = React.useState(String(valueOr(config.maxAttempts, 3)));
  var defaultDeadline = React.useState(config.defaultDeadline || "");
  var enableNotifications = React.useState(config.enableNotifications === true);
  var webhook = React.useState(config.webhook || "");
  var priority = React.useState(String(valueOr(config.priority, 5)));
  var backoffBaseSec = React.useState(String(Math.round(valueOr(config.retryBackoffBaseMs, 30000) / 1000)));
  var backoffMaxSec = React.useState(String(Math.round(valueOr(config.retryBackoffMaxMs, 300000) / 1000)));
  var saving = React.useState(false);
  var saveError = React.useState("");

  function handleSave(event) {
    event.preventDefault();
    var patch = {};
    var add = function (name, next, previous) { if (next !== previous) patch[name] = next; };
    add("maxGoalRounds", parseInt(maxGoalRounds[0], 10), valueOr(config.maxGoalRounds, 40));
    add("maxBlockedResumes", parseInt(maxBlockedResumes[0], 10), valueOr(config.maxBlockedResumes, 3));
    add("autoArchive", autoArchive[0], config.autoArchive !== false);
    add("unknownThreshold", parseInt(unknownThreshold[0], 10), valueOr(config.unknownThreshold, 3));
    add("taskTimeoutMs", parseInt(taskTimeoutMin[0], 10) * 60000, valueOr(config.taskTimeoutMs, 10800000));
    add("maxAttempts", parseInt(maxAttempts[0], 10), valueOr(config.maxAttempts, 3));
    add("defaultDeadline", defaultDeadline[0] || null, config.defaultDeadline || null);
    add("webhook", webhook[0].trim() || null, config.webhook || null);
    add("enableNotifications", enableNotifications[0], config.enableNotifications === true);
    add("priority", parseInt(priority[0], 10), valueOr(config.priority, 5));
    add("retryBackoffBaseMs", parseInt(backoffBaseSec[0], 10) * 1000, valueOr(config.retryBackoffBaseMs, 30000));
    add("retryBackoffMaxMs", parseInt(backoffMaxSec[0], 10) * 1000, valueOr(config.retryBackoffMaxMs, 300000));
    var operations = [];
    var concurrency = parseInt(maxConcurrent[0], 10);
    if (concurrency !== valueOr(config.maxConcurrent, 1)) operations.push(props.onSetConcurrency(concurrency));
    if (Object.keys(patch).length) operations.push(props.onUpdate(patch));
    if (!operations.length) { props.onClose(); return; }
    saving[1](true); saveError[1]("");
    Promise.all(operations).then(props.onClose).catch(function (caught) { saveError[1](caught.message || "保存失败"); }).finally(function () { saving[1](false); });
  }

  return h(DialogShell, { variant: "drawer", title: "运行时设置", onClose: props.onClose, className: "aq-config-panel",
    renderTitle: function (args) { return h("div", { className: "aq-d-hd" }, h("div", null, h("span", { className: "aq-eyebrow" }, "RUNTIME POLICY"), h("h3", { id: args.id }, args.title), h("p", null, "所有设置仅作用于 AutoQueue 自有任务")), h("button", { className: "aq-d-close", "aria-label": "关闭运行设置", onClick: props.onClose }, "×")); }
  },
    h("form", { className: "aq-config-body", onSubmit: handleSave },
      saveError[0] && h("div", { className: "aq-inline-error", role: "alert" }, saveError[0]),
      h("section", { className: "aq-config-contract" }, h("strong", null, "严格隔离已锁定"), h("p", null, "并发默认 1；前台活跃即持久化暂停后台 Goal 并取消其 turn；不修改宿主模型、工作区或预设。")),
      h(ConfigSection, { title: "资源边界" },
        h("div", { className: "aq-row" },
          h(Field, { label: "最大并发（1-8）" }, h("input", { "data-dialog-initial-focus": "", type: "number", min: "1", max: "8", value: maxConcurrent[0], onChange: function (event) { maxConcurrent[1](event.target.value); } })),
          h(Field, { label: "任务超时（分钟）" }, h("input", { type: "number", min: "10", max: "1440", value: taskTimeoutMin[0], onChange: function (event) { taskTimeoutMin[1](event.target.value); } }))
        ),
        h("div", { className: "aq-row" },
          h(Field, { label: "最大 Goal 轮数" }, h("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function (event) { maxGoalRounds[1](event.target.value); } })),
          h(Field, { label: "最大反阻塞" }, h("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function (event) { maxBlockedResumes[1](event.target.value); } }))
        )
      ),
      h(ConfigSection, { title: "失败与退避" },
        h("div", { className: "aq-row" },
          h(Field, { label: "最大派发尝试" }, h("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function (event) { maxAttempts[1](event.target.value); } })),
          h(Field, { label: "不可达阈值" }, h("input", { type: "number", min: "1", max: "10", value: unknownThreshold[0], onChange: function (event) { unknownThreshold[1](event.target.value); } }))
        ),
        h("div", { className: "aq-row" },
          h(Field, { label: "退避基数（秒）" }, h("input", { type: "number", min: "5", max: "600", value: backoffBaseSec[0], onChange: function (event) { backoffBaseSec[1](event.target.value); } })),
          h(Field, { label: "退避上限（秒）" }, h("input", { type: "number", min: "10", max: "3600", value: backoffMaxSec[0], onChange: function (event) { backoffMaxSec[1](event.target.value); } }))
        )
      ),
      h(ConfigSection, { title: "默认任务策略" },
        h("div", { className: "aq-row" },
          h(Field, { label: "默认优先级" }, h("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (event) { priority[1](event.target.value); } })),
          h(Field, { label: "默认截止 cron" }, h("input", { value: defaultDeadline[0], onChange: function (event) { defaultDeadline[1](event.target.value); }, placeholder: "0 21 * * *" }))
        ),
        h(Field, { label: "Webhook URL" }, h("input", { type: "url", value: webhook[0], onChange: function (event) { webhook[1](event.target.value); }, placeholder: "https://example.com/hook" })),
        h(CheckField, { checked: autoArchive[0], onChange: autoArchive[1], label: "终态自动归档" }),
        h(CheckField, { checked: enableNotifications[0], onChange: function (checked) { enableNotifications[1](checked); if (checked) requestNotificationPermission(); }, label: "浏览器结果通知" })
      ),
      h(ConfigSection, { title: "存储" },
        h(Field, { label: "收件箱目录", help: "启动参数，只读" }, h("input", { value: config.queueDir || "默认 ~/.dsh/queue/tasks", disabled: true, readOnly: true }))
      ),
      h("div", { className: "aq-d-actions aq-config-actions" },
        h("button", { type: "button", className: "aq-btn", onClick: props.onClose, disabled: saving[0] }, "取消"),
        h("button", { type: "submit", className: "aq-btn primary", disabled: saving[0] }, saving[0] ? "保存中…" : "保存设置")
      )
    )
  );
}

export function ConfirmModal(props) {
  return h(DialogShell, { title: props.title || "确认操作", onClose: props.onCancel, className: "aq-confirm", initialFocusSelector: "[data-confirm-cancel]" },
    h("div", { className: "aq-modal-content" },
      h("p", { className: "aq-confirm-message" }, props.message),
      h("div", { className: "aq-modal-actions" },
        h("button", { type: "button", className: "aq-btn", "data-confirm-cancel": "", onClick: props.onCancel }, "取消"),
        h("button", { type: "button", className: "aq-btn " + (props.tone || "danger"), onClick: props.onConfirm }, props.confirmLabel || "确认")
      )
    )
  );
}

function Field(props) {
  return h("div", { className: "aq-field" },
    props.label && h("label", null, props.label), props.children,
    props.help && h("p", { className: "aq-help" }, props.help)
  );
}

function CheckField(props) {
  return h("label", { className: "aq-check-row" },
    h("input", { type: "checkbox", checked: props.checked, onChange: function (event) { props.onChange(event.target.checked); } }),
    h("span", null, props.label)
  );
}

function Disclosure(props) {
  return h("section", { className: "aq-form-section" },
    h("button", { type: "button", onClick: props.onToggle, "aria-expanded": props.open },
      h("span", null, props.title), h("span", null, props.hint, "  ", props.open ? "−" : "+")
    ),
    props.open && h("div", { className: "aq-disclosure-body" }, props.children)
  );
}

function ConfigSection(props) {
  return h("section", { className: "aq-config-section" }, h("h4", null, props.title), props.children);
}

function CronField(props) {
  var selectValue = React.useState(function () {
    var match = (props.presets || []).find(function (preset) { return preset.value === props.value && preset.value !== "" && preset.value !== "__custom__"; });
    return match ? match.value : (props.value ? "__custom__" : "");
  });
  var custom = selectValue[0] === "__custom__";
  return h(Field, { label: props.label },
    h("div", { className: "aq-cron-field" },
      h("select", { value: selectValue[0], onChange: function (event) { var value = event.target.value; selectValue[1](value); props.onChange(value === "__custom__" ? "" : value); } },
        (props.presets || []).map(function (preset) { return h("option", { key: preset.value, value: preset.value }, preset.label); })
      ),
      h("input", { value: custom ? props.value : "", onChange: function (event) { props.onChange(event.target.value); }, placeholder: props.placeholder, disabled: !custom })
    )
  );
}
