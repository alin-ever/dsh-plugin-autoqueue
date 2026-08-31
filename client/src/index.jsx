import workstationCss from "./styles/workstation.css";
import { createTransport } from "./transport.js";
import { createController } from "./controller.js";
import { Workstation } from "./components/Workstation.jsx";

var PANEL_ATTR = "data-dsh-autoqueue-active";
var VIEW_ATTR = "data-dsh-autoqueue-view";
var PANEL_NAME = "autoqueue";
var ENTRY_SELECTOR = "[data-dsh-autoqueue-entry]";
var ENTRY_ATTR = "data-dsh-autoqueue-entry";
var SIDEBAR_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 15 15"/><line x1="5" y1="3" x2="3" y2="5"/><line x1="19" y1="3" x2="21" y2="5"/></svg>';
var CENTER_COL_SELECTOR = '[data-pane="conversation"], [class*="centerCol"]';
var ACTIVATE_EVENT = "dsh-panel-activate";

function mountBoard(controller, transport, React, reactDomClient, sessions) {
  var root = null;
  var container = null;

  function ensure() {
    if (container) return;
    var column = document.querySelector(CENTER_COL_SELECTOR);
    if (!column) return;
    container = document.createElement("div");
    container.setAttribute(VIEW_ATTR, "");
    container.dataset.dshPlugin = "autoqueue";
    column.appendChild(container);
    root = reactDomClient.createRoot(container);
    root.render(React.createElement(Workstation, { controller: controller, transport: transport, sessions: sessions }));
  }

  function applyActive() {
    var snap = controller.getSnapshot();
    if (snap.boardOpen) {
      var attrs = document.documentElement.getAttributeNames();
      for (var i = 0; i < attrs.length; i++) {
        if (attrs[i].endsWith("-active") && attrs[i] !== PANEL_ATTR) {
          document.documentElement.removeAttribute(attrs[i]);
        }
      }
      document.documentElement.setAttribute(PANEL_ATTR, "");
    } else {
      document.documentElement.removeAttribute(PANEL_ATTR);
    }
  }

  function onOtherActivate(event) {
    if (event.detail !== PANEL_NAME && controller.getSnapshot().boardOpen) {
      controller.closeBoard();
    }
  }

  var SIDEBAR_ROW_SELECTOR = '[class*="sessionRow"], [class*="projectRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"], [class*="newSession"]';
  function onClickSidebarRow(event) {
    if (!controller.getSnapshot().boardOpen) return;
    var target = event.target;
    if (!target) return;
    if (target.closest(SIDEBAR_ROW_SELECTOR)) controller.closeBoard();
  }

  var waitObserver = new MutationObserver(function () { ensure(); });
  waitObserver.observe(document.body, { childList: true, subtree: true });
  var boardUnsub = controller.subscribe(applyActive);
  document.addEventListener(ACTIVATE_EVENT, onOtherActivate);
  document.addEventListener("click", onClickSidebarRow, true);
  ensure();
  var checkInterval = null;
  if (!container) {
    checkInterval = setInterval(function () {
      ensure();
      if (container) clearInterval(checkInterval);
    }, 500);
  }
  return function () {
    if (checkInterval) clearInterval(checkInterval);
    waitObserver.disconnect();
    boardUnsub();
    document.removeEventListener(ACTIVATE_EVENT, onOtherActivate);
    document.removeEventListener("click", onClickSidebarRow, true);
    if (root) root.unmount();
    if (container) container.remove();
  };
}

function sidebarRoot() {
  var column = document.querySelector('[data-pane="sidebar"], [class*="sidebarCol"]');
  if (column === null) return undefined;
  return column.querySelector('[class*="logoRow"]') ? column.querySelector('[class*="logoRow"]').parentElement : column.firstElementChild;
}

function newSessionButton(rt) {
  var nested = rt.querySelector('button[class*="newSession"]');
  if (nested !== null) return nested;
  for (var i = 0; i < rt.children.length; i++) {
    if (rt.children[i].tagName === "BUTTON") return rt.children[i];
  }
  return undefined;
}

function createEntry(controller) {
  var entry = document.createElement("button");
  entry.type = "button";
  entry.setAttribute(ENTRY_ATTR, "");
  entry.setAttribute("data-dsh-plugin", "autoqueue");
  entry.setAttribute("data-dsh-part", "sidebar-entry");
  entry.className = "aq-sidebar-entry";
  entry.setAttribute("aria-label", "AutoQueue \u4EFB\u52A1\u5DE5\u4F5C\u53F0");
  entry.setAttribute("title", "AutoQueue \u4EFB\u52A1\u5DE5\u4F5C\u53F0");
  entry.innerHTML = '<span class="aq-sidebar-icon">' + SIDEBAR_ICON + '</span><span class="aq-sidebar-label">\u4EFB\u52A1\u5DE5\u4F5C\u53F0</span>';
  var syncActive = function () {
    var snap = controller.getSnapshot();
    if (snap.boardOpen) entry.dataset.active = "true";
    else delete entry.dataset.active;
  };
  var unsub = controller.subscribe(syncActive);
  syncActive();
  entry._aqUnsub = unsub;
  entry.addEventListener("click", function () { controller.toggleBoard(); });
  return entry;
}

function placeEntry(rt, entry) {
  var button = newSessionButton(rt);
  if (button === undefined) return false;
  if (entry.parentElement !== rt) {
    var row = button.closest('[class*="logoRow"]');
    var base = row !== null && row.parentElement === rt ? row : button;
    var family = [];
    for (var i = 0; i < rt.children.length; i++) {
      if (rt.children[i] instanceof HTMLElement && rt.children[i].matches(ENTRY_SELECTOR + ", [data-dsh-taskboard-entry], [data-dsh-ssh-entry]")) {
        family.push(rt.children[i]);
      }
    }
    var anchor = family.length > 0 ? family[0] : base.nextElementSibling;
    rt.insertBefore(entry, anchor);
  }
  return true;
}

function mountSidebarEntry(controller) {
  if (document.querySelector(ENTRY_SELECTOR) !== null) return function () {};
  var entry = createEntry(controller);
  var rt = undefined;
  var placed = false;
  var tryPlace = function () {
    if (rt !== undefined && !rt.isConnected) { rootObserver.disconnect(); rt = undefined; placed = false; }
    if (placed) {
      if (document.body.contains(entry)) return;
      rootObserver.disconnect(); rt = undefined; placed = false;
    }
    rt = rt || sidebarRoot();
    if (rt === undefined) return;
    placed = placeEntry(rt, entry);
    if (placed) { rootObserver.observe(rt, { childList: true, subtree: true }); }
  };
  var waitObserver = new MutationObserver(function () { tryPlace(); });
  waitObserver.observe(document.body, { childList: true, subtree: true });
  var rootObserver = new MutationObserver(function () {
    if (rt === undefined || !rt.isConnected) { placed = false; tryPlace(); return; }
    if (!rt.contains(entry)) placed = placeEntry(rt, entry);
  });
  tryPlace();
  return function () {
    waitObserver.disconnect();
    rootObserver.disconnect();
    if (entry._aqUnsub) entry._aqUnsub();
    entry.remove();
  };
}

window.__ModuleLoader__.load({
  id: "@alintever/dsh-plugin-autoqueue",
  factory: function (require) {
    var previousReact = window.__React;
    var previousReactDOM = window.__ReactDOM;
    window.__React = require("react");
    window.__ReactDOM = require("react-dom/client");
    return {
      dispose: function () {},
      apply: function (ctx) {
        var sessions = ctx.get("sessions");
        var transport = createTransport();
        var controller = createController(transport);
        var boardDisposer = mountBoard(controller, transport, window.__React, window.__ReactDOM, sessions);
        var styleId = "dsh-autoqueue-styles";
        var ownedStyle = null;
        if (!document.getElementById(styleId)) {
          var style = document.createElement("style");
          style.id = styleId;
          style.textContent = workstationCss;
          document.head.appendChild(style);
          ownedStyle = style;
        }
        var sidebarDisposer = mountSidebarEntry(controller);
        return function () {
          controller.closeBoard();
          boardDisposer();
          sidebarDisposer();
          controller.dispose();
          document.documentElement.removeAttribute(PANEL_ATTR);
          if (ownedStyle && ownedStyle.isConnected) ownedStyle.remove();
          if (previousReact === undefined) delete window.__React;
          else window.__React = previousReact;
          if (previousReactDOM === undefined) delete window.__ReactDOM;
          else window.__ReactDOM = previousReactDOM;
        };
      }
    };
  }
});
