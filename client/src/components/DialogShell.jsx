import { Dialog, DialogPanel, DialogTitle, DialogBackdrop, Transition } from "@headlessui/react";
import { iconHtml } from "../utils.js";

function h() { return React.createElement.apply(React, arguments); }

/**
 * 统一的弹窗/抽屉外壳，基于 Headless UI Dialog。
 *
 * Props:
 *  - variant:  "modal" (居中弹窗) | "drawer" (右侧滑出)
 *  - open:     是否打开
 *  - onClose:  关闭回调
 *  - title:    标题文字
 *  - className: 附加到面板的 class
 *  - children: 内容
 */
export function DialogShell(props) {
  var variant = props.variant === "drawer" ? "drawer" : "modal";
  var isDrawer = variant === "drawer";

  return h(Dialog, {
    open: props.open,
    onClose: props.onClose,
    className: "relative z-[100]"
  },
    h(DialogBackdrop, {
      transition: true,
      className: "fixed inset-0 bg-black/40 transition duration-200 ease-out data-[closed]:opacity-0"
    }),
    h("div", { className: isDrawer ? "fixed inset-0 flex justify-end" : "fixed inset-0 flex items-center justify-center p-4" },
      h(DialogPanel, {
        transition: true,
        className: (isDrawer
          ? "h-full w-[min(880px,94vw)] bg-aq-paper shadow-2xl transition duration-200 ease-out data-[closed]:translate-x-4 data-[closed]:opacity-0"
          : "w-[min(930px,94vw)] max-h-[min(88vh,900px)] overflow-y-auto rounded-2xl bg-aq-paper shadow-2xl border border-aq-line transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0"
        ) + (props.className ? " " + props.className : "")
      },
        isDrawer ? h(DrawerHeader, { title: props.title, onClose: props.onClose }) : h(ModalHeader, { title: props.title, onClose: props.onClose }),
        props.children
      )
    )
  );
}

function ModalHeader(props) {
  return h("div", { className: "flex items-center justify-between px-6 pt-5 pb-4 border-b border-aq-line" },
    h(DialogTitle, { className: "text-lg font-bold text-aq-ink" }, props.title),
    h(CloseButton, { onClose: props.onClose })
  );
}

function DrawerHeader(props) {
  return h("div", { className: "flex items-start gap-3 px-6 pt-5 pb-4 border-b border-aq-line bg-aq-paper" },
    h("div", { className: "flex-1 min-w-0" },
      h(DialogTitle, { className: "text-lg font-bold text-aq-ink break-words" }, props.title)
    ),
    h(CloseButton, { onClose: props.onClose })
  );
}

function CloseButton(props) {
  return h("button", {
    onClick: props.onClose,
    className: "grid w-9 h-9 flex-shrink-0 place-items-center rounded-lg border border-aq-line bg-aq-paper text-aq-muted hover:border-aq-line-2 hover:text-aq-ink transition",
    "aria-label": "关闭",
    dangerouslySetInnerHTML: { __html: iconHtml("close") }
  });
}