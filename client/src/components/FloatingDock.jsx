import { Transition } from "@headlessui/react";
import { Workstation } from "./Workstation.jsx";
import { iconHtml, STATUS_CONFIG } from "../utils.js";

function h() { return React.createElement.apply(React, arguments); }

export function FloatingDock(props) {
  var controller = props.controller;
  var transport = props.transport;
  var sessions = props.sessions;
  var state = React.useState(function () { return controller.getSnapshot(); });
  var snap = state[0];

  React.useEffect(function () {
    return controller.subscribe(function () { state[1](controller.getSnapshot()); });
  }, []);

  var boardOpen = snap.boardOpen;
  var activeCount = (snap.counts.pending || 0) + (snap.counts.running || 0) + (snap.counts.interrupted || 0);
  var unreadCount = snap.unreadCount || 0;
  var totalBadge = activeCount || unreadCount;
  var hasAttention = snap.tasks.some(function (t) {
    return t.status === "failed" || t.status === "interrupted" ||
      (t.goalPhase && (t.goalPhase.indexOf("uncertain") >= 0 || t.goalPhase.indexOf("containment") >= 0));
  });
  var dotColor = hasAttention ? "bg-aq-amber" : (snap.metrics.running > 0 ? "bg-aq-blue" : (activeCount > 0 ? "bg-aq-faint" : "bg-aq-green"));

  function toggle() { controller.toggleBoard(); }

  return h("div", {
    style: { position: "fixed", bottom: "20px", right: "20px", zIndex: 90 }
  },
    // 浮动面板（在按钮上方）
    h(Transition, {
      show: boardOpen,
      enter: "transition duration-300 ease-out",
      enterFrom: "opacity-0 translate-y-4 scale-95",
      enterTo: "opacity-100 translate-y-0 scale-100",
      leave: "transition duration-200 ease-in",
      leaveFrom: "opacity-100 translate-y-0 scale-100",
      leaveTo: "opacity-0 translate-y-4 scale-95"
    },
      h("div", {
        style: {
          position: "absolute",
          bottom: "calc(100% + 12px)",
          right: 0,
          width: "840px",
          maxHeight: "80vh",
          borderRadius: "16px",
          backgroundColor: "#fff",
          boxShadow: "0 25px 60px rgba(16,24,40,0.25), 0 0 0 1px rgba(0,0,0,0.04)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }
      },
        h(Workstation, { controller: controller, transport: transport, sessions: sessions, compact: true })
      )
    ),
    // 底部小图标（Dock）
    h("button", {
      onClick: toggle,
      style: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 14px",
        borderRadius: "16px",
        backgroundColor: "#fff",
        border: "1px solid #e4e7ec",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative"
      },
      "aria-label": boardOpen ? "关闭任务队列" : "打开任务队列",
      title: boardOpen ? "关闭任务队列" : "打开任务队列"
    },
      h("span", { style: { position: "relative", width: "12px", height: "12px" } },
        h("span", { style: { position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: dotColor, opacity: 0.75 } }),
        snap.metrics.running > 0 && h("span", { style: { position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: dotColor, opacity: 0.3, animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite" } })
      ),
      h("span", { style: { color: "#667085", transition: "color 0.2s" } },
        h("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", stroke: "currentColor", strokeWidth: "1.5", dangerouslySetInnerHTML: { __html: iconHtml("clock").replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "") } })
      ),
      h("span", { style: { fontSize: "14px", fontWeight: "600", color: "#344054", transition: "color 0.2s", display: "none" } }, boardOpen ? "关闭" : "任务队列"),
      totalBadge > 0 && h("span", {
        style: {
          position: "absolute",
          top: "-6px",
          right: "-6px",
          minWidth: "20px",
          height: "20px",
          padding: "0 4px",
          borderRadius: "10px",
          backgroundColor: "#155eef",
          color: "#fff",
          fontSize: "11px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      }, totalBadge > 99 ? "99+" : String(totalBadge))
    )
  );
}