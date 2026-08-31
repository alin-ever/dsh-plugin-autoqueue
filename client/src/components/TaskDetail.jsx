import { iconHtml, cronToHuman, formatIso, STATUS_CONFIG } from "../utils.js";

export function TaskDetailPanel(props) {
  var task = props.task;
  var transport = props.transport;
  var controller = props.controller;
  var detail = React.useState(null);
  var loading = React.useState(true);
  var loaded = React.useRef(false);

  React.useEffect(function () {
    if (loaded.current) return;
    loaded.current = true;
    transport.detail(task.key).then(function (data) { detail[1](data); loading[1](false); }).catch(function () { loading[1](false); });
  }, [task.key]);

  var d = (detail[0] && detail[0].task) ? detail[0].task : task;
  var cfg = STATUS_CONFIG[d.status] || { label: d.status, color: "#6b7280" };

  function doAction(kind, key) { controller.doAction(kind, key); props.onClose(); }

  return React.createElement("div", {
    className: "aq-d-overlay",
    onClick: function (e) { if (e.target === e.currentTarget) props.onClose(); }
  },
    React.createElement("div", { className: "aq-d-panel" },
      React.createElement("div", { className: "aq-d-hd" },
        React.createElement("h3", null, d.key),
        React.createElement("button", { className: "aq-d-close", onClick: props.onClose }, "\u00D7")
      ),
      React.createElement("div", { className: "aq-d-body" },
        React.createElement("div", { className: "aq-d-section" },
          React.createElement("div", { className: "aq-d-section-title" }, "\u57FA\u672C\u4FE1\u606F"),
          React.createElement("div", { className: "aq-d-grid" },
            React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "\u72B6\u6001: "), React.createElement("span", { className: "dv", style: { color: cfg.color } }, cfg.label)),
            React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "\u4F18\u5148\u7EA7: "), React.createElement("span", { className: "dv" }, String(d.priority || 5))),
            d.attempts > 0 && React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "\u5C1D\u8BD5\u6B21\u6570: "), React.createElement("span", { className: "dv" }, String(d.attempts))),
            d.blockedResumes > 0 && React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "\u53CD\u963B\u585E: "), React.createElement("span", { className: "dv" }, String(d.blockedResumes))),
            d.cron && React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "cron: "), React.createElement("span", { className: "dv" }, cronToHuman(d.cron))),
            d.schedule && React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "\u5B9A\u65F6: "), React.createElement("span", { className: "dv" }, formatIso(d.schedule))),
            d.deadline && React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "\u622A\u6B62: "), React.createElement("span", { className: "dv" }, cronToHuman(d.deadline))),
            d.nextRunAt && React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "\u4E0B\u6B21\u6267\u884C: "), React.createElement("span", { className: "dv" }, formatIso(d.nextRunAt))),
            d.workspace && React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "\u5DE5\u4F5C\u533A: "), React.createElement("span", { className: "dv" }, String(d.workspace).slice(0, 12))),
            d.agentPreset && React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "Agent: "), React.createElement("span", { className: "dv" }, d.agentPreset)),
            d.maxGoalRounds && React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "\u6700\u5927\u8F6E\u6570: "), React.createElement("span", { className: "dv" }, String(d.maxGoalRounds))),
            d.createdAt && React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "\u521B\u5EFA: "), React.createElement("span", { className: "dv" }, formatIso(d.createdAt))),
            d.updatedAt && React.createElement("div", { className: "aq-d-item" }, React.createElement("span", { className: "dl" }, "\u66F4\u65B0: "), React.createElement("span", { className: "dv" }, formatIso(d.updatedAt)))
          )
        ),
        d.body && React.createElement("div", { className: "aq-d-section" },
          React.createElement("div", { className: "aq-d-section-title" }, "\u4EFB\u52A1\u5185\u5BB9"),
          React.createElement("div", { className: "aq-d-report" }, React.createElement("pre", null, d.body))
        ),
        loading[0] && React.createElement("div", { style: { textAlign: "center", padding: "20px", color: "#9ca3af" } }, "\u52A0\u8F7D\u4E2D..."),
        detail[0] && detail[0].task && detail[0].task.reports && (detail[0].task.reports.goal || detail[0].task.reports.result || detail[0].task.reports.report) && React.createElement("div", { className: "aq-d-section" },
          React.createElement("div", { className: "aq-d-section-title" }, "\u6267\u884C\u62A5\u544A"),
          detail[0].task.reports.goal && React.createElement("div", { className: "aq-d-report", style: { marginBottom: "8px" } }, React.createElement("pre", null, detail[0].task.reports.goal)),
          detail[0].task.reports.result && React.createElement("div", { className: "aq-d-report", style: { marginBottom: "8px" } }, React.createElement("pre", null, detail[0].task.reports.result)),
          detail[0].task.reports.report && React.createElement("div", { className: "aq-d-report" }, React.createElement("pre", null, detail[0].task.reports.report))
        ),
        d.executions && d.executions.length > 0 && React.createElement("div", { className: "aq-d-section" },
          React.createElement("div", { className: "aq-d-section-title" }, "\u6267\u884C\u8BB0\u5F55"),
          React.createElement("table", { className: "aq-d-exec-table" },
            React.createElement("thead", null,
              React.createElement("tr", null,
                React.createElement("th", null, "#"),
                React.createElement("th", null, "\u72B6\u6001"),
                React.createElement("th", null, "\u5F00\u59CB"),
                React.createElement("th", null, "\u7ED3\u675F"),
                React.createElement("th", null, "\u9519\u8BEF")
              )
            ),
            React.createElement("tbody", null,
              d.executions.map(function (ex, i) {
                return React.createElement("tr", { key: i },
                  React.createElement("td", null, String(ex.attempt || i + 1)),
                  React.createElement("td", null, ((STATUS_CONFIG[ex.result] || {}).label || ex.result || "-")),
                  React.createElement("td", null, ex.startedAt ? formatIso(ex.startedAt) : "-"),
                  React.createElement("td", null, ex.endedAt ? formatIso(ex.endedAt) : "-"),
                  React.createElement("td", null, ex.error ? String(ex.error).slice(0, 60) : "-")
                );
              })
            )
          )
        )
      ),
      React.createElement("div", { className: "aq-d-actions" },
        React.createElement("button", { className: "aq-btn", onClick: props.onClose }, "\u5173\u95ED"),
        d.status === "running" && React.createElement("button", { className: "aq-btn danger", onClick: function () { doAction("stop", d.key); } }, "\u505C\u6B62"),
        (d.status === "failed" || d.status === "stopped") && React.createElement("button", { className: "aq-btn success", onClick: function () { doAction("rerun", d.key); } }, "\u91CD\u65B0\u6267\u884C"),
        d.status !== "running" && !d.archivedAt && React.createElement("button", { className: "aq-btn warn", onClick: function () { doAction("archive", d.key); } }, "\u5F52\u6863"),
        d.archivedAt && React.createElement("button", { className: "aq-btn", onClick: function () { doAction("restore", d.key); } }, "\u8FD8\u539F"),
        d.sessionId && React.createElement("button", { className: "aq-btn", onClick: function () { props.onClose(); controller.closeBoard(); }, dangerouslySetInnerHTML: { __html: iconHtml("external") + " \u8DF3\u8F6C\u4F1A\u8BDD" } })
      )
    )
  );
}