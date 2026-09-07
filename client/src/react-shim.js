function _R() {
  if (typeof window !== "undefined" && window.__React) return window.__React;
  if (!_R._stub) _R._stub = createStub();
  return _R._stub;
}

function createStub() {
  var s = {};

  function hook(name, fallback) {
    s[name] = function () {
      var real = window.__React;
      if (real) return real[name].apply(real, arguments);
      return fallback ? fallback.apply(null, arguments) : undefined;
    };
  }

  hook("useState", function (init) { return [typeof init === "function" ? init() : init, function () {}]; });
  hook("useEffect");
  hook("useContext", function () { return undefined; });
  hook("useReducer", function (reducer, init) { return [typeof init === "function" ? init() : init, function () {}]; });
  hook("useCallback", function (fn) { return fn; });
  hook("useMemo", function (fn) { return fn(); });
  hook("useRef", function (v) { return { current: v }; });
  hook("useImperativeHandle");
  hook("useLayoutEffect");
  hook("useDebugValue");
  hook("useDeferredValue", function (v) { return v; });
  hook("useTransition", function () { return [false, function (cb) { cb(); }]; });
  hook("useId", function () { return "autoqueue-stub"; });
  hook("useSyncExternalStore", function (subscribe, getSnapshot) { return getSnapshot(); });
  hook("useInsertionEffect");
  hook("useActionState", function () { return [undefined, function () {}, false]; });
  hook("useOptimistic", function (v) { return v; });

  s.Fragment = (typeof Symbol !== "undefined" && Symbol.for) ? Symbol.for("react.fragment") : 0xeac7;
  s.createElement = function (type, config, children) {
    var ELEMENT = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("react.element") : 0xeac7;
    var props = {}, key = null, ref = null;
    if (config != null) {
      if (config.key !== undefined) { key = "" + config.key; }
      if (config.ref !== undefined) { ref = config.ref; }
      for (var k in config) {
        if (k !== "key" && k !== "ref" && Object.prototype.hasOwnProperty.call(config, k)) {
          props[k] = config[k];
        }
      }
    }
    var len = arguments.length - 2;
    if (len === 1) props.children = children;
    else if (len > 1) { var kids = new Array(len); for (var i = 0; i < len; i++) kids[i] = arguments[i + 2]; props.children = kids; }
    return { $$typeof: ELEMENT, type: type, key: key, ref: ref, props: props, _owner: null };
  };
  s.createContext = function (defaultValue) {
    var CONTEXT = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("react.context") : 0xeace;
    var PROVIDER = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("react.provider") : 0xeacd;
    var ctx = { $$typeof: CONTEXT, _currentValue: defaultValue, _currentValue2: defaultValue, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null };
    ctx.Provider = { $$typeof: PROVIDER, _context: ctx };
    ctx.Consumer = ctx;
    return ctx;
  };
  s.createRef = function () { return { current: null }; };
  s.forwardRef = function (render) {
    var FORWARD_REF = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("react.forward_ref") : 0xead0;
    return { $$typeof: FORWARD_REF, render: render };
  };
  s.lazy = function (loader) {
    var LAZY = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("react.lazy") : 0xead4;
    return { $$typeof: LAZY, _payload: { _status: -1, _result: loader }, _init: function (payload) { return payload._result(); } };
  };
  s.memo = function (type, compare) {
    var MEMO = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("react.memo") : 0xead3;
    return { $$typeof: MEMO, type: type, compare: compare || null };
  };
  s.startTransition = function (cb) { cb(); };
  s.Suspense = function () { return null; };
  s.Children = { map: function () { return []; }, forEach: function () {}, count: function () { return 0; }, toArray: function () { return []; } };
  s.Component = function () {};
  s.PureComponent = function () {};
  s.cloneElement = function (element, config, children) {
    var ELEMENT = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("react.element") : 0xeac7;
    var props = Object.assign({}, element.props);
    var key = element.key;
    var ref = element.ref;
    if (config != null) {
      if (config.key !== undefined) { key = "" + config.key; }
      if (config.ref !== undefined) { ref = config.ref; }
      for (var k in config) {
        if (k !== "key" && k !== "ref" && Object.prototype.hasOwnProperty.call(config, k)) {
          props[k] = config[k];
        }
      }
    }
    var len = arguments.length - 2;
    if (len === 1) props.children = children;
    else if (len > 1) { var kids = new Array(len); for (var i = 0; i < len; i++) kids[i] = arguments[i + 2]; props.children = kids; }
    return { $$typeof: ELEMENT, type: element.type, key: key, ref: ref, props: props, _owner: null };
  };
  s.createFactory = function () { return function () { return null; }; };
  s.isValidElement = function (obj) {
    var ELEMENT = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("react.element") : 0xeac7;
    return typeof obj === "object" && obj !== null && obj.$$typeof === ELEMENT;
  };
  s.version = "0.0.0-stub";

  return s;
}

export default _R();
export var Fragment = _R().Fragment;
export var createElement = _R().createElement;
export var createContext = _R().createContext;
export var createRef = _R().createRef;
export var forwardRef = _R().forwardRef;
export var lazy = _R().lazy;
export var memo = _R().memo;
export var startTransition = _R().startTransition;
export var Suspense = _R().Suspense;
export var Children = _R().Children;
export var Component = _R().Component;
export var PureComponent = _R().PureComponent;
export var cloneElement = _R().cloneElement;
export var createFactory = _R().createFactory;
export var isValidElement = _R().isValidElement;
export var version = _R().version;
export var useState = _R().useState;
export var useEffect = _R().useEffect;
export var useContext = _R().useContext;
export var useReducer = _R().useReducer;
export var useCallback = _R().useCallback;
export var useMemo = _R().useMemo;
export var useRef = _R().useRef;
export var useImperativeHandle = _R().useImperativeHandle;
export var useLayoutEffect = _R().useLayoutEffect;
export var useDebugValue = _R().useDebugValue;
export var useDeferredValue = _R().useDeferredValue;
export var useTransition = _R().useTransition;
export var useId = _R().useId;
export var useSyncExternalStore = _R().useSyncExternalStore;
export var useInsertionEffect = _R().useInsertionEffect;
export var useActionState = _R().useActionState;
export var useOptimistic = _R().useOptimistic;