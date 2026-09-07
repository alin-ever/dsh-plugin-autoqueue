import tailwindCss from "./styles/tailwind-output.css";
import { createTransport } from "./transport.js";
import { createController } from "./controller.js";
import { FloatingDock } from "./components/FloatingDock.jsx";

// ─── 浮动面板挂载（直接挂到 body，不遮挡对话区）──────────

function mountFloatingPanel(controller, transport, React, reactDomClient, sessions) {
  var root = null;
  var container = document.createElement("div");
  container.id = "aq-floating-root";
  container.setAttribute("data-dsh-plugin", "autoqueue");
  document.body.appendChild(container);
  root = reactDomClient.createRoot(container);
  root.render(React.createElement(FloatingDock, { controller: controller, transport: transport, sessions: sessions }));

  return function () {
    if (root) root.unmount();
    if (container.isConnected) container.remove();
  };
}

// ─── 入口 ─────────────────────────────────────────────────

window.__ModuleLoader__.load({
  id: "@alintever/dsh-plugin-autoqueue",
  factory: function (require) {
    var previousReact = window.__React;
    var previousReactDOM = window.__ReactDOM;
    window.__React = require("react");
    window.__ReactDOM = require("react-dom/client");
    // Headless UI 通过 import from 'react' 解析，需要 window.React 全局
    if (!window.React) window.React = window.__React;
    if (!window.ReactDOM) window.ReactDOM = window.__ReactDOM;
    return {
      dispose: function () {},
      apply: function (ctx) {
        var sessions = ctx.get("sessions");
        var transport = createTransport();
        var controller = createController(transport);

        // 注入 Tailwind CSS
        var styleId = "dsh-autoqueue-styles";
        if (!document.getElementById(styleId)) {
          var style = document.createElement("style");
          style.id = styleId;
          style.textContent = tailwindCss;
          document.head.appendChild(style);
        }

        // 浮动面板
        var panelDisposer = mountFloatingPanel(controller, transport, window.__React, window.__ReactDOM, sessions);

        return function () {
          controller.closeBoard();
          panelDisposer();
          controller.dispose();
          var styleEl = document.getElementById(styleId);
          if (styleEl) styleEl.remove();
          if (previousReact === undefined) delete window.__React;
          else window.__React = previousReact;
          if (previousReactDOM === undefined) delete window.__ReactDOM;
          else window.__ReactDOM = previousReactDOM;
          if (!previousReact) delete window.React;
          if (!previousReactDOM) delete window.ReactDOM;
        };
      }
    };
  }
});