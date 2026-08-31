import { localDatetimeString, CRON_PRESETS, DEADLINE_PRESETS } from "../utils.js";

export function NewTaskModal(props) {
  var options = props.options || {};
  var key = React.useState("");
  var content = React.useState("");
  var priority = React.useState("5");
  var cron = React.useState("");
  var schedule = React.useState("");
  var deadline = React.useState("");
  var maxGoalRounds = React.useState("");
  var maxBlockedResumes = React.useState("");
  var workspace = React.useState("");
  var agentPreset = React.useState("");
  var model = React.useState("");
  var autoArchive = React.useState(false);
  var enableNotifications = React.useState(true);
  var error = React.useState("");
  var submitting = React.useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!key[0].trim() || !content[0].trim()) { error[1]("\u8BF7\u586B\u5199\u4EFB\u52A1\u6807\u8BC6\u548C\u5185\u5BB9"); return; }
    submitting[1](true);
    error[1]("");
    var data = { key: key[0].trim(), content: content[0].trim(), priority: parseInt(priority[0], 10) || 5 };
    if (cron[0].trim()) data.cron = cron[0].trim();
    if (schedule[0].trim()) data.schedule = new Date(schedule[0].trim()).toISOString();
    if (deadline[0].trim()) data.deadline = deadline[0].trim();
    if (maxGoalRounds[0]) data.maxGoalRounds = parseInt(maxGoalRounds[0], 10);
    if (maxBlockedResumes[0]) data.maxBlockedResumes = parseInt(maxBlockedResumes[0], 10);
    if (workspace[0]) data.workspace = workspace[0];
    if (agentPreset[0]) data.agentPreset = agentPreset[0];
    if (model[0]) data.model = model[0];
    if (autoArchive[0]) data.autoArchive = true;
    if (!enableNotifications[0]) data.enableNotifications = false;
    props.onCreate(data).catch(function (err) { error[1](err.message); }).finally(function () { submitting[1](false); });
  }

  return React.createElement("div", { className: "aq-m-overlay", onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
    React.createElement("div", { className: "aq-modal" },
      React.createElement("h3", null, "\u65B0\u5EFA\u4EFB\u52A1"),
      error[0] && React.createElement("div", { style: { color: "#ef4444", fontSize: "13px", marginBottom: "8px" } }, error[0]),
      React.createElement("label", null, "\u4EFB\u52A1\u6807\u8BC6 (key)*"),
      React.createElement("input", { value: key[0], onChange: function (e) { key[1](e.target.value); }, placeholder: "\u4F8B\u5982: daily-report" }),
      React.createElement("label", null, "\u4EFB\u52A1\u5185\u5BB9 (Markdown)*"),
      React.createElement("textarea", { value: content[0], onChange: function (e) { content[1](e.target.value); }, placeholder: "# \u4EFB\u52A1\u6807\u9898\n\n\u4EFB\u52A1\u63CF\u8FF0..." }),
      React.createElement("div", { className: "aq-row" },
        React.createElement("div", null,
          React.createElement("label", null, "\u4F18\u5148\u7EA7 (1-10)"),
          React.createElement("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (e) { priority[1](e.target.value); } })
        ),
        React.createElement("div", null,
          React.createElement("label", null, "\u6700\u5927\u8F6E\u6570"),
          React.createElement("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function (e) { maxGoalRounds[1](e.target.value); }, placeholder: "\u9ED8\u8BA4 40" })
        ),
        React.createElement("div", null,
          React.createElement("label", null, "\u6700\u5927\u53CD\u963B\u585E"),
          React.createElement("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function (e) { maxBlockedResumes[1](e.target.value); }, placeholder: "\u9ED8\u8BA4 3" })
        )
      ),
      React.createElement(CronField, { label: "\u5FAA\u73AF\u8C03\u5EA6 (cron)", value: cron[0], onChange: function (v) { cron[1](v); }, presets: CRON_PRESETS, placeholder: "0 8 * * *" }),
      React.createElement("label", { style: { marginTop: "8px" } }, "\u4E00\u6B21\u6027\u5B9A\u65F6"),
      React.createElement("input", { type: "datetime-local", value: schedule[0], onChange: function (e) { schedule[1](e.target.value); } }),
      React.createElement(CronField, { label: "\u622A\u6B62\u65F6\u95F4 (deadline)", value: deadline[0], onChange: function (v) { deadline[1](v); }, presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" }),
      React.createElement("div", { className: "aq-row" },
        options.workspaces && options.workspaces.length > 0 && React.createElement("div", null,
          React.createElement("label", null, "\u5DE5\u4F5C\u533A"),
          React.createElement("select", { value: workspace[0], onChange: function (e) { workspace[1](e.target.value); } },
            React.createElement("option", { value: "" }, "\u81EA\u52A8\u521B\u5EFA"),
            options.workspaces.map(function (ws) { return React.createElement("option", { key: ws.workspaceId, value: ws.workspaceId }, ws.title || ws.path); })
          )
        ),
        options.presets && options.presets.length > 0 && React.createElement("div", null,
          React.createElement("label", null, "Agent \u9884\u8BBE"),
          React.createElement("select", { value: agentPreset[0], onChange: function (e) { agentPreset[1](e.target.value); } },
            React.createElement("option", { value: "" }, "\u9ED8\u8BA4"),
            options.presets.map(function (p) { return React.createElement("option", { key: p.id, value: p.id }, p.name || p.id); })
          )
        )
      ),
      React.createElement("div", { className: "aq-row" },
        React.createElement("div", null,
          React.createElement("label", null, "\u6A21\u578B"),
          React.createElement("select", { value: model[0], onChange: function (e) { model[1](e.target.value); } },
            React.createElement("option", { value: "" }, "\u9ED8\u8BA4"),
            (options.models || []).map(function (m) { return React.createElement("option", { key: m, value: m }, m); })
          )
        )
      ),
      React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" } },
        React.createElement("input", { type: "checkbox", checked: autoArchive[0], onChange: function (e) { autoArchive[1](e.target.checked); }, style: { width: "auto", margin: 0 } }),
        "\u5B8C\u6210\u540E\u81EA\u52A8\u5F52\u6863"
      ),
      React.createElement("div", { className: "aq-modal-actions" },
        React.createElement("button", { className: "aq-btn", onClick: props.onClose }, "\u53D6\u6D88"),
        React.createElement("button", { className: "aq-btn primary", onClick: handleSubmit, disabled: submitting[0] }, submitting[0] ? "\u63D0\u4EA4\u4E2D..." : "\u521B\u5EFA")
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
  var autoArchive = React.useState(!!task.autoArchive);
  var enableNotifications = React.useState(task.enableNotifications !== false);
  var maxGoalRounds = React.useState(task.maxGoalRounds ? String(task.maxGoalRounds) : "");
  var maxBlockedResumes = React.useState(task.maxBlockedResumes ? String(task.maxBlockedResumes) : "");
  var error = React.useState("");
  var submitting = React.useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    submitting[1](true);
    error[1]("");
    var patch = {};
    if (content[0] !== (task.body || "")) patch.content = content[0];
    if (cron[0] !== (task.cron || "")) patch.cron = cron[0];
    var scheduleIso = schedule[0] ? new Date(schedule[0]).toISOString() : "";
    if (scheduleIso !== (task.schedule || "")) patch.schedule = scheduleIso;
    if (deadline[0] !== (task.deadline || "")) patch.deadline = deadline[0];
    if (priority[0] !== String(task.priority || 5)) patch.priority = parseInt(priority[0], 10);
    if (autoArchive[0] !== !!task.autoArchive) patch.autoArchive = autoArchive[0];
    if (enableNotifications[0] !== (task.enableNotifications !== false)) patch.enableNotifications = enableNotifications[0];
    if (maxGoalRounds[0] !== (task.maxGoalRounds ? String(task.maxGoalRounds) : "")) patch.maxGoalRounds = maxGoalRounds[0] ? parseInt(maxGoalRounds[0], 10) : undefined;
    if (maxBlockedResumes[0] !== (task.maxBlockedResumes ? String(task.maxBlockedResumes) : "")) patch.maxBlockedResumes = maxBlockedResumes[0] ? parseInt(maxBlockedResumes[0], 10) : undefined;
    if (Object.keys(patch).length === 0) { props.onClose(); return; }
    props.onUpdate(task.key, patch).catch(function (err) { error[1](err.message); }).finally(function () { submitting[1](false); });
  }

  return React.createElement("div", { className: "aq-m-overlay", onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
    React.createElement("div", { className: "aq-modal" },
      React.createElement("h3", null, "\u7F16\u8F91\u4EFB\u52A1: " + task.key),
      error[0] && React.createElement("div", { style: { color: "#ef4444", fontSize: "13px", marginBottom: "8px" } }, error[0]),
      React.createElement("label", null, "\u4EFB\u52A1\u5185\u5BB9 (Markdown)"),
      React.createElement("textarea", { value: content[0], onChange: function (e) { content[1](e.target.value); }, style: { minHeight: "150px" } }),
      React.createElement("div", { className: "aq-row" },
        React.createElement("div", null,
          React.createElement("label", null, "\u4F18\u5148\u7EA7 (1-10)"),
          React.createElement("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (e) { priority[1](e.target.value); } })
        ),
        React.createElement("div", null,
          React.createElement("label", null, "\u6700\u5927\u8F6E\u6570"),
          React.createElement("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function (e) { maxGoalRounds[1](e.target.value); }, placeholder: "\u9ED8\u8BA4 40" })
        ),
        React.createElement("div", null,
          React.createElement("label", null, "\u6700\u5927\u53CD\u963B\u585E"),
          React.createElement("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function (e) { maxBlockedResumes[1](e.target.value); }, placeholder: "\u9ED8\u8BA4 3" })
        )
      ),
      React.createElement(CronField, { label: "\u5FAA\u73AF\u8C03\u5EA6 (cron)", value: cron[0], onChange: function (v) { cron[1](v); }, presets: CRON_PRESETS, placeholder: "0 8 * * *" }),
      React.createElement("label", { style: { marginTop: "8px" } }, "\u4E00\u6B21\u6027\u5B9A\u65F6"),
      React.createElement("input", { type: "datetime-local", value: schedule[0], onChange: function (e) { schedule[1](e.target.value); } }),
      React.createElement(CronField, { label: "\u622A\u6B62\u65F6\u95F4 (deadline)", value: deadline[0], onChange: function (v) { deadline[1](v); }, presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" }),
      React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" } },
        React.createElement("input", { type: "checkbox", checked: autoArchive[0], onChange: function (e) { autoArchive[1](e.target.checked); }, style: { width: "auto", margin: 0 } }),
        "\u5B8C\u6210\u540E\u81EA\u52A8\u5F52\u6863"
      ),
      React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" } },
        React.createElement("input", { type: "checkbox", checked: enableNotifications[0], onChange: function (e) { enableNotifications[1](e.target.checked); }, style: { width: "auto", margin: 0 } }),
        "\u4EFB\u52A1\u5B8C\u6210\u65F6\u901A\u77E5"
      ),
      React.createElement("div", { className: "aq-modal-actions" },
        React.createElement("button", { className: "aq-btn", onClick: props.onClose }, "\u53D6\u6D88"),
        React.createElement("button", { className: "aq-btn primary", onClick: handleSubmit, disabled: submitting[0] }, submitting[0] ? "\u63D0\u4EA4\u4E2D..." : "\u4FDD\u5B58")
      )
    )
  );
}

export function ConfigPanel(props) {
  var config = props.config || {};
  var options = props.options || {};
  var maxConcurrent = React.useState(String(config.maxConcurrent || 2));
  var maxGoalRounds = React.useState(String(config.maxGoalRounds || 60));
  var maxBlockedResumes = React.useState(String(config.maxBlockedResumes || 3));
  var autoArchive = React.useState(!!config.autoArchive);
  var unknownThreshold = React.useState(String(config.unknownThreshold || 3));
  var taskTimeoutMin = React.useState(String(Math.round((config.taskTimeoutMs || 10800000) / 60000)));
  var maxAttempts = React.useState(String(config.maxAttempts || 3));
  var defaultDeadline = React.useState(config.defaultDeadline || "");
  var queueDir = React.useState(config.queueDir || "");
  var enableNotifications = React.useState(config.enableNotifications !== false);
  var webhook = React.useState(config.webhook || "");
  var workspace = React.useState(config.workspace || "");
  var agentPreset = React.useState(config.agentPreset || "");
  var model = React.useState(config.model || "");
  var priority = React.useState(String(config.priority || 5));

  function handleSave() {
    var patch = {};
    patch.maxGoalRounds = parseInt(maxGoalRounds[0], 10);
    patch.maxBlockedResumes = parseInt(maxBlockedResumes[0], 10);
    patch.autoArchive = autoArchive[0];
    patch.unknownThreshold = parseInt(unknownThreshold[0], 10);
    patch.taskTimeoutMs = parseInt(taskTimeoutMin[0], 10) * 60000;
    patch.maxAttempts = parseInt(maxAttempts[0], 10);
    patch.defaultDeadline = defaultDeadline[0] || null;
    patch.webhook = webhook[0] || null;
    patch.workspace = workspace[0] || null;
    patch.queueDir = queueDir[0] || null;
    patch.enableNotifications = enableNotifications[0];
    patch.agentPreset = agentPreset[0] || null;
    patch.model = model[0] || null;
    patch.priority = parseInt(priority[0], 10) || 5;
    var newMc = parseInt(maxConcurrent[0], 10);
    if (newMc !== (config.maxConcurrent || 2)) props.onSetConcurrency(newMc);
    props.onUpdate(patch);
    props.onClose();
  }

  var tip = function (text) { return React.createElement("span", { className: "aq-tip", title: text }, "\u24D8"); };

  return React.createElement("div", { className: "aq-m-overlay", onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); } },
    React.createElement("div", { className: "aq-modal wide" },
      React.createElement("h3", null, "\u8FD0\u884C\u65F6\u914D\u7F6E"),
      React.createElement("div", { className: "aq-row" },
        React.createElement("div", null,
          React.createElement("label", null, "\u6700\u5927\u5E76\u53D1\u6570 (1-8)", tip("\u540C\u65F6\u8FD0\u884C\u7684\u6700\u5927\u4EFB\u52A1\u6570")),
          React.createElement("input", { type: "number", min: "1", max: "8", value: maxConcurrent[0], onChange: function (e) { maxConcurrent[1](e.target.value); } })
        ),
        React.createElement("div", null,
          React.createElement("label", null, "\u6700\u5927\u91CD\u8BD5 (1-10)", tip("\u4EFB\u52A1\u6D3E\u53D1\u5931\u8D25\u540E\u7684\u6700\u5927\u91CD\u8BD5\u6B21\u6570")),
          React.createElement("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function (e) { maxAttempts[1](e.target.value); } })
        )
      ),
      React.createElement("div", { className: "aq-row" },
        React.createElement("div", null,
          React.createElement("label", null, "\u6700\u5927 goal \u8F6E\u6570 (1-100)", tip("\u5355\u4E2A\u4EFB\u52A1\u81EA\u52A8\u7EED\u8DD1\u7684\u6700\u5927\u8F6E\u6570")),
          React.createElement("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function (e) { maxGoalRounds[1](e.target.value); } })
        ),
        React.createElement("div", null,
          React.createElement("label", null, "\u6700\u5927\u53CD\u963B\u585E (0-10)", tip("\u4EFB\u52A1\u5361\u4F4F\u65F6\u81EA\u52A8\u6062\u590D\u7684\u6700\u5927\u6B21\u6570")),
          React.createElement("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function (e) { maxBlockedResumes[1](e.target.value); } })
        )
      ),
      React.createElement("div", { className: "aq-row" },
        React.createElement("div", null,
          React.createElement("label", null, "\u4E0D\u53EF\u8FBE\u9608\u503C (1-10)", tip("\u8FDE\u7EED\u8F6E\u8BE2\u5931\u8D25\u540E\u5224\u5B9A\u4EFB\u52A1\u4E0D\u53EF\u8FBE")),
          React.createElement("input", { type: "number", min: "1", max: "10", value: unknownThreshold[0], onChange: function (e) { unknownThreshold[1](e.target.value); } })
        ),
        React.createElement("div", null,
          React.createElement("label", null, "\u4EFB\u52A1\u8D85\u65F6 (\u5206\u949F)", tip("\u5355\u4E2A\u4EFB\u52A1\u7684\u6700\u5927\u6267\u884C\u65F6\u95F4")),
          React.createElement("input", { type: "number", min: "10", max: "1440", value: taskTimeoutMin[0], onChange: function (e) { taskTimeoutMin[1](e.target.value); } })
        )
      ),
      React.createElement("div", { className: "aq-row" },
        React.createElement("div", null,
          React.createElement("label", null, "\u9ED8\u8BA4\u4F18\u5148\u7EA7 (1-10)"),
          React.createElement("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function (e) { priority[1](e.target.value); } })
        ),
        React.createElement("div", null,
          React.createElement("label", null, "\u9ED8\u8BA4\u622A\u6B62\u65F6\u95F4"),
          React.createElement("input", { value: defaultDeadline[0], onChange: function (e) { defaultDeadline[1](e.target.value); }, placeholder: "0 21 * * *" })
        )
      ),
      React.createElement("div", { className: "aq-row" },
        React.createElement("div", { style: { display: "flex", gap: "16px", alignItems: "center", paddingTop: "10px" } },
          React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", margin: 0, fontSize: "13px" } },
            React.createElement("input", { type: "checkbox", checked: autoArchive[0], onChange: function (e) { autoArchive[1](e.target.checked); }, style: { width: "auto", margin: 0 } }),
            "\u81EA\u52A8\u5F52\u6863"
          ),
          React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", margin: 0, fontSize: "13px" } },
            React.createElement("input", { type: "checkbox", checked: enableNotifications[0], onChange: function (e) { enableNotifications[1](e.target.checked); }, style: { width: "auto", margin: 0 } }),
            "\u4EFB\u52A1\u901A\u77E5"
          )
        )
      ),
      React.createElement("label", null, "Webhook URL", tip("\u4EFB\u52A1\u5B8C\u6210\u65F6\u56DE\u8C03\u7684 URL")),
      React.createElement("input", { value: webhook[0], onChange: function (e) { webhook[1](e.target.value); }, placeholder: "https://example.com/webhook" }),
      React.createElement("div", { className: "aq-row" },
        React.createElement("div", null,
          React.createElement("label", null, "\u6536\u4EF6\u7BB1\u76EE\u5F55"),
          React.createElement("input", { value: queueDir[0], onChange: function (e) { queueDir[1](e.target.value); }, placeholder: "\u9ED8\u8BA4 ~/.dsh/queue/tasks" })
        ),
        React.createElement("div", null,
          React.createElement("label", null, "\u9ED8\u8BA4 Agent \u9884\u8BBE"),
          options.presets && options.presets.length > 0
            ? React.createElement("select", { value: agentPreset[0], onChange: function (e) { agentPreset[1](e.target.value); } },
                React.createElement("option", { value: "" }, "\u81EA\u52A8\u5224\u5B9A"),
                options.presets.map(function (p) { return React.createElement("option", { key: p.id, value: p.id }, p.name || p.id); }))
            : React.createElement("input", { value: agentPreset[0], onChange: function (e) { agentPreset[1](e.target.value); }, placeholder: "\u4E0D\u8BBE\u7F6E\u5219\u81EA\u52A8\u5224\u5B9A" })
        )
      ),
      React.createElement("div", { className: "aq-row" },
        React.createElement("div", null,
          React.createElement("label", null, "\u9ED8\u8BA4\u6A21\u578B"),
          React.createElement("select", { value: model[0], onChange: function (e) { model[1](e.target.value); } },
            React.createElement("option", { value: "" }, "\u9ED8\u8BA4\uFF08\u5F53\u524D\u4F1A\u8BDD\u6A21\u578B\uFF09"),
            (options.models || []).map(function (m) { return React.createElement("option", { key: m, value: m }, m); })
          )
        )
      ),
      React.createElement("div", { className: "aq-modal-actions" },
        React.createElement("button", { className: "aq-btn", onClick: props.onClose }, "\u53D6\u6D88"),
        React.createElement("button", { className: "aq-btn primary", onClick: handleSave }, "\u4FDD\u5B58")
      )
    )
  );
}

export function ConfirmModal(props) {
  return React.createElement("div", { className: "aq-m-overlay", onClick: function (e) { if (e.target === e.currentTarget) props.onCancel(); } },
    React.createElement("div", { className: "aq-modal", style: { width: "380px" } },
      React.createElement("div", { style: { fontSize: "14px", marginBottom: "16px", lineHeight: "1.6" } }, props.message),
      React.createElement("div", { className: "aq-modal-actions" },
        React.createElement("button", { className: "aq-btn", onClick: props.onCancel }, "\u53D6\u6D88"),
        React.createElement("button", { className: "aq-btn danger", onClick: props.onConfirm }, "\u786E\u8BA4")
      )
    )
  );
}

function CronField(props) {
  var selectVal = React.useState(function () {
    var matched = (props.presets || []).find(function (p) { return p.value === props.value && p.value !== "" && p.value !== "__custom__"; });
    return matched ? matched.value : (props.value ? "__custom__" : "");
  });
  var isCustom = selectVal[0] === "__custom__";

  return React.createElement("div", null,
    React.createElement("label", null, props.label, props.tip ? React.createElement("span", { className: "aq-tip", title: props.tip }, "\u24D8") : null),
    React.createElement("div", { style: { display: "flex", gap: "8px", alignItems: "stretch", minWidth: 0 } },
      React.createElement("select", {
        value: selectVal[0],
        onChange: function (e) {
          var v = e.target.value;
          selectVal[1](v);
          if (v === "__custom__") return;
          props.onChange(v);
        },
        style: { width: "50%", flexShrink: 0 }
      },
        (props.presets || []).map(function (p) { return React.createElement("option", { key: p.value, value: p.value }, p.label); })
      ),
      React.createElement("input", {
        value: selectVal[0] === "" ? "" : props.value,
        onChange: function (e) { props.onChange(e.target.value); },
        placeholder: props.placeholder || "\u81EA\u5B9A\u4E49 cron \u8868\u8FBE\u5F0F",
        style: { flex: 1, minWidth: 0 },
        disabled: !isCustom && selectVal[0] !== ""
      })
    )
  );
}