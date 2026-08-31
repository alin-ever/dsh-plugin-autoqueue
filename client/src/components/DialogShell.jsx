var dialogStack = [];
var bodyLockCount = 0;
var savedBodyStyles = null;

var FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function appendClassName(base, extra) {
  return [base, extra].filter(Boolean).join(" ");
}

function isFocusable(element) {
  if (!element || typeof element.focus !== "function") return false;
  if (typeof element.matches === "function" && element.matches(":disabled")) return false;
  if (element.hidden || element.closest("[hidden],[inert],[aria-hidden='true']")) return false;
  var style = window.getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none" && element.getClientRects().length > 0;
}

function focusableElements(panel) {
  if (!panel) return [];
  return Array.prototype.filter.call(panel.querySelectorAll(FOCUSABLE_SELECTOR), isFocusable);
}

function lockBodyScroll() {
  if (bodyLockCount === 0 && document.body) {
    var scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    var computedPaddingRight = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
    savedBodyStyles = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight
    };
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = computedPaddingRight + scrollbarWidth + "px";
  }
  bodyLockCount += 1;
}

function unlockBodyScroll() {
  bodyLockCount = Math.max(0, bodyLockCount - 1);
  if (bodyLockCount === 0 && document.body && savedBodyStyles) {
    document.body.style.overflow = savedBodyStyles.overflow;
    document.body.style.paddingRight = savedBodyStyles.paddingRight;
    savedBodyStyles = null;
  }
}

function resolveInitialFocus(props, panel) {
  var target = props.initialFocusRef && props.initialFocusRef.current;
  if (!target && props.initialFocusSelector) target = panel.querySelector(props.initialFocusSelector);
  if (!target) target = panel.querySelector("[data-dialog-initial-focus],[autofocus]");
  if (!isFocusable(target)) target = focusableElements(panel)[0];
  return isFocusable(target) ? target : panel;
}

/**
 * Accessible modal/drawer shell.
 *
 * `renderTitle` can be used when the title belongs in a custom header:
 *   renderTitle={({ id, title }) => <header><h3 id={id}>{title}</h3></header>}
 *
 * Props:
 * - variant: "modal" (default) | "drawer"
 * - title: accessible dialog title (required unless ariaLabel is supplied)
 * - onClose(reason): reason is "escape" or "overlay"
 * - closeOnOverlay / closeOnEscape: default true
 * - initialFocusRef / initialFocusSelector: optional preferred initial focus
 * - className / overlayClassName: appended to the variant's default classes
 * - panelRef: optional object or callback ref
 */
export function DialogShell(props) {
  var variant = props.variant === "drawer" ? "drawer" : "modal";
  var generatedId = React.useId();
  var titleId = props.titleId || "aq-dialog-title-" + generatedId.replace(/:/g, "");
  var internalPanelRef = React.useRef(null);
  var openerRef = React.useRef(null);
  var stackTokenRef = React.useRef({});
  var onCloseRef = React.useRef(props.onClose);
  var closeOnEscapeRef = React.useRef(props.closeOnEscape);
  onCloseRef.current = props.onClose;
  closeOnEscapeRef.current = props.closeOnEscape;

  var setPanelRef = React.useCallback(function (node) {
    internalPanelRef.current = node;
    if (typeof props.panelRef === "function") props.panelRef(node);
    else if (props.panelRef && typeof props.panelRef === "object") props.panelRef.current = node;
  }, [props.panelRef]);

  React.useLayoutEffect(function () {
    var panel = internalPanelRef.current;
    if (!panel) return undefined;
    if (!openerRef.current) {
      openerRef.current = document.activeElement && typeof document.activeElement.focus === "function"
        ? document.activeElement
        : null;
    }
    resolveInitialFocus(props, panel).focus({ preventScroll: true });
    return undefined;
  }, []);

  React.useEffect(function () {
    var token = stackTokenRef.current;
    dialogStack.push(token);
    lockBodyScroll();
    var panel = internalPanelRef.current;
    var overlay = panel && panel.parentElement;
    var backgroundState = [];
    if (overlay && overlay.parentElement) {
      Array.prototype.forEach.call(overlay.parentElement.children, function (sibling) {
        if (sibling === overlay) return;
        backgroundState.push({
          element: sibling,
          inert: sibling.inert,
          ariaHidden: sibling.getAttribute("aria-hidden")
        });
        sibling.inert = true;
        sibling.setAttribute("aria-hidden", "true");
      });
    }

    function isTopmost() {
      return dialogStack[dialogStack.length - 1] === token;
    }

    function onKeyDown(event) {
      if (!isTopmost()) return;
      var panel = internalPanelRef.current;
      if (!panel) return;

      if (event.key === "Escape" && closeOnEscapeRef.current !== false) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (typeof onCloseRef.current === "function") onCloseRef.current("escape");
        return;
      }

      if (event.key !== "Tab") return;
      var focusables = focusableElements(panel);
      if (focusables.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }

      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      var active = document.activeElement;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return function () {
      document.removeEventListener("keydown", onKeyDown, true);
      var index = dialogStack.lastIndexOf(token);
      if (index !== -1) dialogStack.splice(index, 1);
      unlockBodyScroll();
      for (var stateIndex = 0; stateIndex < backgroundState.length; stateIndex += 1) {
        var state = backgroundState[stateIndex];
        state.element.inert = state.inert;
        if (state.ariaHidden === null) state.element.removeAttribute("aria-hidden");
        else state.element.setAttribute("aria-hidden", state.ariaHidden);
      }

      var opener = openerRef.current;
      queueMicrotask(function () {
        var mountedPanel = internalPanelRef.current;
        if (mountedPanel && mountedPanel.isConnected) return;
        if (opener && opener.isConnected && typeof opener.focus === "function") {
          opener.focus({ preventScroll: true });
        }
      });
    };
  }, []);

  var defaultOverlayClass = variant === "drawer" ? "aq-d-overlay" : "aq-m-overlay";
  var defaultPanelClass = variant === "drawer" ? "aq-d-panel" : "aq-modal";
  var overlayProps = Object.assign({}, props.overlayProps || {});
  var panelProps = Object.assign({}, props.panelProps || {});
  var externalOverlayClick = overlayProps.onClick;

  overlayProps.className = appendClassName(defaultOverlayClass, appendClassName(props.overlayClassName, overlayProps.className));
  overlayProps.onClick = function (event) {
    if (typeof externalOverlayClick === "function") externalOverlayClick(event);
    if (event.defaultPrevented || event.target !== event.currentTarget || props.closeOnOverlay === false) return;
    if (typeof props.onClose === "function") props.onClose("overlay");
  };

  panelProps.ref = setPanelRef;
  panelProps.className = appendClassName(defaultPanelClass, appendClassName(props.className, panelProps.className));
  panelProps.role = "dialog";
  panelProps["aria-modal"] = true;
  panelProps["aria-labelledby"] = props.ariaLabel ? undefined : titleId;
  panelProps["aria-label"] = props.ariaLabel;
  panelProps["aria-describedby"] = props.describedBy;
  panelProps.tabIndex = panelProps.tabIndex == null ? -1 : panelProps.tabIndex;
  panelProps["data-dialog-variant"] = variant;

  var titleNode = null;
  if (!props.ariaLabel) {
    if (typeof props.renderTitle === "function") {
      titleNode = props.renderTitle({ id: titleId, title: props.title, close: props.onClose });
    } else {
      titleNode = React.createElement(props.titleAs || "h3", {
        id: titleId,
        className: props.titleClassName
      }, props.title);
    }
  }

  var content = typeof props.children === "function"
    ? props.children({ titleId: titleId, close: props.onClose, panelRef: internalPanelRef })
    : props.children;

  return React.createElement("div", overlayProps,
    React.createElement("div", panelProps, titleNode, content)
  );
}
