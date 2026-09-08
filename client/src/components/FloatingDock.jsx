import { Transition } from "@headlessui/react";
import { Workstation } from "./Workstation.jsx";

function h() { return React.createElement.apply(React, arguments); }

export function FloatingDock(props) {
  var controller = props.controller;
  var transport = props.transport;
  var sessions = props.sessions;
  var state = React.useState(function () { return controller.getSnapshot(); });
  var snap = state[0];

  React.useEffect(function () {
    controller.init();
    return controller.subscribe(function () { state[1](controller.getSnapshot()); });
  }, []);

  var boardOpen = snap.boardOpen;
  var activeCount = (snap.counts.pending || 0) + (snap.counts.running || 0) + (snap.counts.interrupted || 0);
  var unreadCount = snap.unreadCount || 0;
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
          width: "min(840px, calc(100vw - 40px))",
          height: "min(80vh, 700px)",
          borderRadius: "16px",
          backgroundColor: "var(--aq-paper, #fff)",
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
        gap: "6px",
        padding: "8px 12px",
        borderRadius: "14px",
        backgroundColor: "var(--aq-paper, #fff)",
        border: "1px solid var(--aq-line, #e4e7ec)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative"
      },
      "aria-label": boardOpen ? "关闭任务队列" : "打开任务队列",
      title: boardOpen ? "关闭任务队列" : "打开任务队列"
    },
      h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0 } }),
      h("span", { style: { fontSize: "13px", fontWeight: "600", color: "var(--aq-ink, #344054)", lineHeight: 1 } }, "任务队列"),
      activeCount > 0 ? h("span", { style: { fontSize: "12px", fontWeight: "600", color: "var(--aq-blue, #155eef)", lineHeight: 1 } }, String(activeCount))
        : unreadCount > 0 ? h("span", { style: { fontSize: "12px", fontWeight: "600", color: "var(--aq-muted, #667085)", lineHeight: 1 } }, String(unreadCount))
        : null
    )
  );
}