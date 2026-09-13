import { iconHtml } from "../utils.js";

function h() { return React.createElement.apply(React, arguments); }

var SIZE_MAP = { sm: 576, md: 768, lg: 960 };
var HEIGHT_MAP = { sm: "220px", md: "480px", lg: "80vh" };

export function DialogShell(props) {
  var variant = props.variant === "drawer" ? "drawer" : "modal";
  var isDrawer = variant === "drawer";
  var size = props.size || "lg";
  var width = SIZE_MAP[size] || 1116;
  var height = HEIGHT_MAP[size] || "640px";

  // ESC 关闭 + 焦点锁定
  React.useEffect(function () {
    function onEsc(e) {
      if (e.key === "Escape") props.onClose();
    }
    document.addEventListener("keydown", onEsc);
    return function () { document.removeEventListener("keydown", onEsc); };
  }, [props.onClose]);

  React.useEffect(function () {
    var panel = document.querySelector('[data-aq-dialog-panel="true"]');
    if (!panel) return;
    var focusables = Array.from(panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(function (el) {
      return !el.disabled && el.offsetParent !== null;
    });
    var previous = document.activeElement;
    if (focusables[0]) focusables[0].focus();

    function onTab(e) {
      if (e.key !== "Tab" || focusables.length === 0) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    panel.addEventListener("keydown", onTab);
    return function () {
      panel.removeEventListener("keydown", onTab);
      if (previous && previous.focus) previous.focus();
    };
  }, []);

  return h("div", { style: { position: "relative", zIndex: 100 } },
    // Backdrop
    h("div", {
      className: "fixed inset-0 bg-black/40 transition-opacity duration-200",
      style: { zIndex: 100 },
      onClick: props.onClose
    }),
    // Panel container
    h("div", {
      className: isDrawer ? "fixed inset-0 flex justify-end" : "fixed inset-0 flex items-center justify-center p-4",
      style: { zIndex: 101, overscrollBehaviorY: "contain" }
    },
      h("div", {
        "data-aq-dialog-panel": "true",
        className: (isDrawer
          ? "h-full w-[min(1056px,94vw)] bg-aq-paper shadow-2xl flex flex-col"
          : "rounded-2xl bg-aq-paper shadow-2xl border border-aq-line flex flex-col overflow-hidden"
        ) + (props.className ? " " + props.className : ""),
        style: isDrawer ? {} : Object.assign({ maxHeight: height, width: "min(" + width + "px, 94vw)" }, (props.style || {}))
      },
        isDrawer ? h(DrawerHeader, { title: props.title, onClose: props.onClose }) : h(ModalHeader, { title: props.title, onClose: props.onClose }),
        h("div", { className: "flex-1 min-h-0 overflow-hidden flex flex-col" }, props.children)
      )
    )
  );
}

function ModalHeader(props) {
  return h("div", { className: "flex items-center justify-between px-6 pt-5 pb-4 border-b border-aq-line" },
    h("h2", { className: "text-lg font-bold text-aq-ink" }, props.title),
    h(CloseButton, { onClose: props.onClose })
  );
}

function DrawerHeader(props) {
  return h("div", { className: "flex items-start gap-3 px-6 pt-5 pb-4 border-b border-aq-line bg-aq-paper" },
    h("div", { className: "flex-1 min-w-0" },
      h("h2", { className: "text-lg font-bold text-aq-ink break-words" }, props.title)
    ),
    h(CloseButton, { onClose: props.onClose })
  );
}

function CloseButton(props) {
  return h("button", {
    onClick: props.onClose,
    className: "grid w-7 h-7 flex-shrink-0 place-items-center rounded-lg border border-aq-line bg-aq-paper text-aq-muted hover:border-aq-line-2 hover:text-aq-ink transition",
    "aria-label": "关闭",
    dangerouslySetInnerHTML: { __html: iconHtml("close") }
  });
}
