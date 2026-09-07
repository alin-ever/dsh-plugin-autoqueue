function h() { return React.createElement.apply(React, arguments); }

/**
 * 模板驱动的任务创建入口。
 * 三阶段：浏览模板 → 填写参数 → 预览确认
 */
export function TemplatePicker(props) {
  var transport = props.transport;
  var stage = React.useState("browse");
  var templates = React.useState([]);
  var loading = React.useState(true);
  var loadError = React.useState("");
  var selected = React.useState(null);
  var paramValues = React.useState({});
  var resolved = React.useState("");
  var resolving = React.useState(false);
  var resolveError = React.useState("");

  React.useEffect(function () {
    var cancelled = false;
    transport.listTemplates().then(function (data) {
      if (cancelled) return;
      templates[1]((data && data.templates) || []);
      loading[1](false);
    }).catch(function (err) {
      if (!cancelled) { loadError[1](err.message || "加载失败"); loading[1](false); }
    });
    return function () { cancelled = true; };
  }, [transport]);

  function pick(tpl) {
    selected[1](tpl);
    var defs = {};
    (tpl.parameters || []).forEach(function (p) { if (p.default !== undefined) defs[p.key] = p.default; });
    paramValues[1](defs);
    stage[1]("params");
  }

  function setParam(key, value) {
    paramValues[1](Object.assign({}, paramValues[0], {}, { [key]: value }));
  }

  function doResolve(e) {
    e.preventDefault();
    var tpl = selected[0];
    if (!tpl) return;
    resolving[1](true); resolveError[1]("");
    transport.resolveTemplate(tpl.name, paramValues[0]).then(function (data) {
      resolved[1](data.content);
      stage[1]("preview");
      resolving[1](false);
    }).catch(function (err) {
      resolveError[1](err.message || "解析失败");
      resolving[1](false);
    });
  }

  function confirm() {
    if (props.onSelect) props.onSelect({
      name: selected[0].name,
      content: resolved[0],
      templateName: selected[0].name
    });
  }

  if (stage[0] === "browse") {
    return h(BrowseStage, { templates: templates[0], loading: loading[0], error: loadError[0], onPick: pick, onSkip: function () { props.onCancel(); } });
  }
  if (stage[0] === "params") {
    return h(ParamsStage, { template: selected[0], values: paramValues[0], onChange: setParam, onSubmit: doResolve, onBack: function () { stage[1]("browse"); }, resolving: resolving[0], error: resolveError[0] });
  }
  return h(PreviewStage, { template: selected[0], content: resolved[0], onConfirm: confirm, onBack: function () { stage[1]("params"); } });
}

function BrowseStage(props) {
  if (props.loading) {
    return h("div", { className: "flex flex-col items-center justify-center py-12 gap-3" },
      h("div", { className: "w-5 h-5 border-2 border-aq-line-2 border-t-aq-blue rounded-full animate-spin" }),
      h("p", { className: "text-sm text-aq-muted" }, "正在加载模板库…")
    );
  }
  if (props.error) {
    return h("div", { className: "text-center py-10" },
      h("p", { className: "text-sm text-aq-red mb-3" }, props.error),
      h("button", { className: "aq-btn aq-btn-primary", onClick: props.onSkip }, "使用空白表单")
    );
  }
  if (!props.templates.length) {
    return h("div", { className: "text-center py-10" },
      h("p", { className: "text-sm text-aq-muted mb-3" }, "模板库暂无可用模板"),
      h("button", { className: "aq-btn aq-btn-primary", onClick: props.onSkip }, "使用空白表单")
    );
  }

  var cats = {};
  props.templates.forEach(function (t) {
    var c = t.category || "其他";
    if (!cats[c]) cats[c] = [];
    cats[c].push(t);
  });

  return h("div", { className: "p-6" },
    h("div", { className: "mb-5" },
      h("h3", { className: "text-base font-bold text-aq-ink mb-1" }, "从模板开始"),
      h("p", { className: "text-sm text-aq-muted" }, "选择一个模板，填写参数后即可创建任务。"),
      h("button", { className: "mt-3 text-sm text-aq-blue hover:underline", onClick: props.onSkip }, "跳过，使用空白表单 →")
    ),
    Object.keys(cats).map(function (cat) {
      return h("div", { key: cat, className: "mb-5" },
        h("h4", { className: "text-xs font-semibold text-aq-faint uppercase tracking-wide mb-2" }, cat),
        h("div", { className: "grid grid-cols-2 gap-3" },
          cats[cat].map(function (tpl) {
            return h("button", {
              key: tpl.name, onClick: function () { props.onPick(tpl); },
              className: "text-left p-4 rounded-xl border border-aq-line hover:border-aq-blue hover:bg-aq-blue-soft/50 transition group"
            },
              h("div", { className: "text-sm font-semibold text-aq-ink group-hover:text-aq-blue transition mb-1" }, tpl.name),
              h("p", { className: "text-xs text-aq-muted line-clamp-2" }, tpl.description || "暂无描述"),
              (tpl.parameters || []).length > 0 && h("span", { className: "inline-block mt-2 text-xs text-aq-faint bg-aq-surface-alt px-2 py-0.5 rounded" }, (tpl.parameters || []).length, " 个参数")
            );
          })
        )
      );
    })
  );
}

function ParamsStage(props) {
  var tpl = props.template;
  var params = tpl.parameters || [];
  return h("div", { className: "p-6" },
    h("div", { className: "flex items-center justify-between mb-5" },
      h("div", null,
        h("h3", { className: "text-base font-bold text-aq-ink" }, tpl.name),
        tpl.description && h("p", { className: "text-sm text-aq-muted mt-0.5" }, tpl.description)
      ),
      h("button", { className: "text-sm text-aq-blue hover:underline", onClick: props.onBack }, "← 返回模板库")
    ),
    h("form", { onSubmit: props.onSubmit },
      props.error && h("div", { className: "p-3 mb-4 rounded-lg bg-aq-red-soft text-sm text-aq-red" }, props.error),
      params.length === 0 && h("p", { className: "text-sm text-aq-muted mb-4" }, "此模板无需参数，直接预览即可。"),
      params.map(function (p) {
        return h("div", { key: p.key, className: "mb-4" },
          h("label", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" },
            p.label || p.key,
            p.required ? h("span", { className: "text-aq-red ml-1" }, "*") : null
          ),
          p.description && h("p", { className: "text-xs text-aq-faint mb-1.5" }, p.description),
          h("input", {
            type: "text",
            value: props.values[p.key] || "",
            onChange: function (e) { props.onChange(p.key, e.target.value); },
            placeholder: p.default || "请输入 " + (p.label || p.key),
            className: "w-full h-10 px-3 rounded-lg border border-aq-line-2 bg-aq-paper text-sm text-aq-ink focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none"
          })
        );
      }),
      h("div", { className: "flex justify-between pt-4 border-t border-aq-line" },
        h("button", { type: "button", className: "aq-btn aq-btn-ghost", onClick: props.onBack }, "返回"),
        h("button", { type: "submit", className: "aq-btn aq-btn-primary", disabled: props.resolving }, props.resolving ? "解析中…" : "预览任务")
      )
    )
  );
}

function PreviewStage(props) {
  return h("div", { className: "p-6" },
    h("div", { className: "flex items-center justify-between mb-4" },
      h("div", null,
        h("h3", { className: "text-base font-bold text-aq-ink" }, "预览：", props.template.name),
        h("p", { className: "text-sm text-aq-muted mt-0.5" }, "确认任务内容后创建")
      ),
      h("button", { className: "text-sm text-aq-blue hover:underline", onClick: props.onBack }, "修改参数")
    ),
    h("div", { className: "max-h-80 overflow-auto p-4 rounded-xl border border-aq-line bg-aq-surface-alt" },
      h("pre", { className: "text-xs font-mono text-aq-ink-2 whitespace-pre-wrap break-words m-0" }, props.content || "（空内容）")
    ),
    h("div", { className: "flex justify-between pt-4 mt-4 border-t border-aq-line" },
      h("button", { className: "aq-btn aq-btn-ghost", onClick: props.onBack }, "返回修改"),
      h("button", { className: "aq-btn aq-btn-primary", onClick: props.onConfirm }, "确认创建")
    )
  );
}