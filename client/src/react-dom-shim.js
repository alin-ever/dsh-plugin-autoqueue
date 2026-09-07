function _RD() {
  if (typeof window !== "undefined" && window.__ReactDOM) return window.__ReactDOM;
  if (!_RD._stub) _RD._stub = createStub();
  return _RD._stub;
}

function createStub() {
  return {
    createRoot: function () { return { render: function () {}, unmount: function () {} }; },
    hydrateRoot: function () { return { render: function () {}, unmount: function () {} }; },
    createPortal: function (children) { return children; },
    flushSync: function (fn) { return fn(); },
    version: "0.0.0-stub",
    findDOMNode: function () { return null; },
    render: function () {},
    hydrate: function () {},
    unmountComponentAtNode: function () { return false; },
    unstable_batchedUpdates: function (fn) { fn(); },
    __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {}
  };
}

export default _RD();
export var createRoot = _RD().createRoot;
export var hydrateRoot = _RD().hydrateRoot;
export var createPortal = _RD().createPortal;
export var flushSync = _RD().flushSync;
export var version = _RD().version;
export var findDOMNode = _RD().findDOMNode;
export var render = _RD().render;
export var hydrate = _RD().hydrate;
export var unmountComponentAtNode = _RD().unmountComponentAtNode;
export var unstable_batchedUpdates = _RD().unstable_batchedUpdates;