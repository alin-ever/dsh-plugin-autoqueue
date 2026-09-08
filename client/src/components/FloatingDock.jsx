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

  var statusClass = hasAttention ? "bg-aq-amber" : (runningCount > 0 ? "bg-aq-blue" : "bg-aq-green");

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
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(760px, calc(100vw - 48px))",
          height: "min(80vh, 640px)",
          maxWidth: "calc(100vw - 48px)",
          borderRadius: "20px",
          backgroundColor: "var(--aq-paper, #fff)",
          boxShadow: "0 25px 80px rgba(16,24,40,0.32), 0 0 0 1px rgba(0,0,0,0.06)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          zIndex: 92
        }
      },
        h(Workstation, { controller: controller, transport: transport, sessions: sessions, compact: true })
      )
    ),
    // ─── 可拖拽 Dock 入口按钮 ─────────────────────────────
    h("div", { ref: containerRef, style: containerStyle },
      h("button", {
        onMouseDown: onPointerDown,
        style: {
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "10px 16px",
          borderRadius: "16px",
          backgroundColor: "var(--aq-paper, #fff)",
          border: "1px solid var(--aq-line, #e4e7ec)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)",
          cursor: "grab",
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
        h("span", {
          className: "flex-shrink-0 w-2.5 h-2.5 rounded-full " + statusClass,
          style: { boxShadow: "0 0 0 2px " + (hasAttention ? "rgba(147,55,13,0.15)" : (runningCount > 0 ? "rgba(21,94,239,0.15)" : "rgba(6,118,71,0.15)")) }
        }),
        h("span", { style: { fontSize: "14px", fontWeight: "600", color: "var(--aq-ink, #344054)", lineHeight: 1, userSelect: "none" } }, "任务队列"),
        runningCount > 0 && h("span", {
          className: "flex-shrink-0 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-bold text-white",
          style: { backgroundColor: "var(--aq-blue, #155eef)", fontSize: "11px" }
        }, String(runningCount))
      )
    )
  );
}
