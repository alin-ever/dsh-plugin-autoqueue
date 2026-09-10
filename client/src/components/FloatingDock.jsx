import { Transition } from "@headlessui/react";
import { Workstation } from "./Workstation.jsx";

function h() { return React.createElement.apply(React, arguments); }

export function FloatingDock(props) {
  var controller = props.controller;
  var transport = props.transport;
  var sessions = props.sessions;
  var state = React.useState(function () { return controller.getSnapshot(); });
  var snap = state[0];
  var containerRef = React.useRef(null);

  // 读取保存的位置
  var savedPos = React.useState(function () {
    try {
      var raw = localStorage.getItem("aq-dock-pos");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  });

  React.useEffect(function () {
    controller.init();
    return controller.subscribe(function () { state[1](controller.getSnapshot()); });
  }, []);

  var boardOpen = snap.boardOpen;
  var runningCount = snap.metrics.running || 0;
  var hasAttention = snap.tasks.some(function (t) {
    return t.status === "failed" || t.status === "interrupted" ||
      (t.goalPhase && (t.goalPhase.indexOf("uncertain") >= 0 || t.goalPhase.indexOf("containment") >= 0));
  });

  var statusColor = hasAttention ? "#f79009" : (runningCount > 0 ? "#155eef" : "#067647");

  function toggle() { controller.toggleBoard(); }

  // ─── 拖拽逻辑 ───────────────────────────────────────────
  var dragRef = React.useRef({ dragging: false, startX: 0, startY: 0, moved: false });

  function onPointerDown(e) {
    if (e.button !== 0) return;
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, moved: false };
    var el = containerRef.current;
    if (!el) return;
    e.preventDefault();

    var rect = el.getBoundingClientRect();
    var offsetX = e.clientX - rect.left;
    var offsetY = e.clientY - rect.top;

    function onMove(ev) {
      var dx = Math.abs(ev.clientX - dragRef.current.startX);
      var dy = Math.abs(ev.clientY - dragRef.current.startY);
      if (dx > 3 || dy > 3) dragRef.current.moved = true;
      if (!dragRef.current.moved) return;

      var left = ev.clientX - offsetX;
      var top = ev.clientY - offsetY;
      left = Math.max(4, Math.min(window.innerWidth - rect.width - 4, left));
      top = Math.max(4, Math.min(window.innerHeight - rect.height - 4, top));
      el.style.left = left + "px";
      el.style.top = top + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      dragRef.current.dragging = false;
      if (!dragRef.current.moved) {
        toggle();
      } else {
        try {
          var r = el.getBoundingClientRect();
          localStorage.setItem("aq-dock-pos", JSON.stringify({ left: r.left, top: r.top }));
        } catch (e) {}
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  var containerStyle = { position: "fixed", zIndex: boardOpen ? 80 : 90 };
  if (savedPos[0]) {
    containerStyle.left = savedPos[0].left + "px";
    containerStyle.top = savedPos[0].top + "px";
  } else {
    containerStyle.right = "20px";
    containerStyle.bottom = "20px";
  }

  return h(React.Fragment, null,
    // ─── 居中弹窗面板 ──────────────────────────────────────
    boardOpen && h("div", {
      style: {
        position: "fixed", inset: 0, zIndex: 88,
        backgroundColor: "rgba(16,24,40,0.35)",
        transition: "opacity 0.2s ease"
      },
      onClick: toggle
    }),
    h(Transition, {
      show: boardOpen,
      enter: "transition duration-300 ease-out",
      enterFrom: "opacity-0 scale-95",
      enterTo: "opacity-100 scale-100",
      leave: "transition duration-200 ease-in",
      leaveFrom: "opacity-100 scale-100",
      leaveTo: "opacity-0 scale-95"
    },
      h("div", {
        style: {
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          zIndex: 92,
          pointerEvents: "none"
        }
      },
        h("div", {
          style: {
            width: "min(912px, calc(100vw - 48px))",
            height: "min(80vh, 640px)",
            maxWidth: "calc(100vw - 48px)",
            borderRadius: "20px",
            backgroundColor: "var(--aq-paper, #fff)",
            boxShadow: "0 25px 80px rgba(16,24,40,0.32), 0 0 0 1px rgba(0,0,0,0.06)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            pointerEvents: "auto"
          }
        },
          h(Workstation, { controller: controller, transport: transport, sessions: sessions, compact: true })
        )
      )
    ),
    // ─── 可拖拽 Dock 入口按钮 ─────────────────────────────
    !boardOpen && h("div", { ref: containerRef, style: containerStyle },
      h("button", {
        onMouseDown: onPointerDown,
        title: runningCount > 0 ? "任务队列 · " + runningCount + " 个运行中" : "任务队列",
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          backgroundColor: "var(--aq-paper, #fff)",
          border: "1px solid var(--aq-line, #e4e7ec)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)",
          cursor: "pointer",
          transition: "box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s",
          position: "relative",
          fontFamily: "inherit",
          userSelect: "none"
        },
        onMouseEnter: function (e) {
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.06)";
          e.currentTarget.style.transform = "translateY(-1px)";
        },
        onMouseLeave: function (e) {
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)";
          e.currentTarget.style.transform = "translateY(0)";
        }
      },
        // 列表图标
        h("svg", {
          width: "18", height: "18", viewBox: "0 0 24 24",
          fill: "none", stroke: "currentColor", strokeWidth: "2",
          strokeLinecap: "round", strokeLinejoin: "round",
          style: { color: "var(--aq-ink, #344054)" }
        },
          h("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
          h("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
          h("line", { x1: "4", y1: "18", x2: "14", y2: "18" })
        ),
        // 状态角标
        h("span", {
          style: {
            position: "absolute", top: "-3px", right: "-3px",
            width: "10px", height: "10px", borderRadius: "50%",
            backgroundColor: statusColor,
            border: "2px solid var(--aq-paper, #fff)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.06)"
          }
        }),
        // 运行中数量角标
        runningCount > 0 && h("span", {
          style: {
            position: "absolute", bottom: "-3px", right: "-3px",
            minWidth: "16px", height: "16px", padding: "0 4px",
            borderRadius: "8px", backgroundColor: "var(--aq-blue, #155eef)",
            color: "#fff", fontSize: "10px", fontWeight: "700",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid var(--aq-paper, #fff)",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.06)"
          }
        }, String(runningCount))
      )
    )
  );
}
