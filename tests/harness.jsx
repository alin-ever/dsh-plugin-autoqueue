import * as React from "react";
import { createRoot } from "react-dom/client";
import workstationCss from "../client/src/styles/workstation.css";
import { createTransport } from "../client/src/transport.js";
import { createController } from "../client/src/controller.js";

globalThis.React = React;
if (!globalThis.__keepNotificationForTests) {
  Object.defineProperty(globalThis, "Notification", { value: undefined, configurable: true });
}

globalThis.__eventSourceUrls = [];
globalThis.__eventSources = [];
class HarnessEventSource {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
    this.onerror = null;
    this.closed = false;
    globalThis.__eventSourceUrls.push(url);
    globalThis.__eventSources.push(this);
  }
  close() { this.closed = true; }
}
globalThis.EventSource = HarnessEventSource;

var style = document.createElement("style");
style.textContent = workstationCss;
document.head.appendChild(style);
document.documentElement.setAttribute("data-dsh-autoqueue-active", "");

// Product components intentionally consume the DSH-provided global React. Load
// them only after installing that global so the harness mirrors the host boot
// order (static ESM imports would evaluate their module scope too early).
globalThis.__aqBootstrap = import("../client/src/components/Workstation.jsx").then(function (module) {
  var transport = createTransport();
  var controller = createController(transport);
  var openedSessions = [];
  var sessions = { open: function (id) { openedSessions.push(id); } };
  var root = createRoot(document.getElementById("root"));
  root.render(React.createElement(module.Workstation, { controller: controller, transport: transport, sessions: sessions }));
  controller.openBoard();
  var ready = controller.init();

  globalThis.__aq = {
    controller: controller,
    transport: transport,
    createController: createController,
    openedSessions: openedSessions,
    ready: ready,
    dispose: function () { controller.dispose(); root.unmount(); },
  };
  return ready;
});
