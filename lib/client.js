window.React=window.React||window.__React;window.ReactDOM=window.ReactDOM||window.__ReactDOM;
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e7) {
      throw err = [e7], e7;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e7) {
      throw mod = 0, e7;
    }
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // client/src/react-shim.js
  var react_shim_exports = {};
  __export(react_shim_exports, {
    Children: () => Children,
    Component: () => Component,
    Fragment: () => Fragment,
    PureComponent: () => PureComponent,
    Suspense: () => Suspense,
    cloneElement: () => cloneElement,
    createContext: () => createContext,
    createElement: () => createElement,
    createFactory: () => createFactory,
    createRef: () => createRef,
    default: () => react_shim_default,
    forwardRef: () => forwardRef,
    isValidElement: () => isValidElement,
    lazy: () => lazy,
    memo: () => memo,
    startTransition: () => startTransition,
    useActionState: () => useActionState,
    useCallback: () => useCallback,
    useContext: () => useContext,
    useDebugValue: () => useDebugValue,
    useDeferredValue: () => useDeferredValue,
    useEffect: () => useEffect,
    useId: () => useId,
    useImperativeHandle: () => useImperativeHandle,
    useInsertionEffect: () => useInsertionEffect,
    useLayoutEffect: () => useLayoutEffect,
    useMemo: () => useMemo,
    useOptimistic: () => useOptimistic,
    useReducer: () => useReducer,
    useRef: () => useRef,
    useState: () => useState,
    useSyncExternalStore: () => useSyncExternalStore,
    useTransition: () => useTransition,
    version: () => version
  });
  function _R() {
    if (typeof window !== "undefined" && window.__React) return window.__React;
    if (!_R._stub) _R._stub = createStub();
    return _R._stub;
  }
  function createStub() {
    var s12 = {};
    function hook(name, fallback) {
      s12[name] = function() {
        var real = window.__React;
        if (real) return real[name].apply(real, arguments);
        return fallback ? fallback.apply(null, arguments) : void 0;
      };
    }
    hook("useState", function(init) {
      return [typeof init === "function" ? init() : init, function() {
      }];
    });
    hook("useEffect");
    hook("useContext", function() {
      return void 0;
    });
    hook("useReducer", function(reducer, init) {
      return [typeof init === "function" ? init() : init, function() {
      }];
    });
    hook("useCallback", function(fn) {
      return fn;
    });
    hook("useMemo", function(fn) {
      return fn();
    });
    hook("useRef", function(v3) {
      return { current: v3 };
    });
    hook("useImperativeHandle");
    hook("useLayoutEffect");
    hook("useDebugValue");
    hook("useDeferredValue", function(v3) {
      return v3;
    });
    hook("useTransition", function() {
      return [false, function(cb) {
        cb();
      }];
    });
    hook("useId", function() {
      return "autoqueue-stub";
    });
    hook("useSyncExternalStore", function(subscribe, getSnapshot) {
      return getSnapshot();
    });
    hook("useInsertionEffect");
    hook("useActionState", function() {
      return [void 0, function() {
      }, false];
    });
    hook("useOptimistic", function(v3) {
      return v3;
    });
    s12.Fragment = typeof Symbol !== "undefined" && Symbol.for ? /* @__PURE__ */ Symbol.for("react.fragment") : 60103;
    s12.createElement = function(type, config, children) {
      var ELEMENT = typeof Symbol !== "undefined" && Symbol.for ? /* @__PURE__ */ Symbol.for("react.element") : 60103;
      var props = {}, key = null, ref = null;
      if (config != null) {
        if (config.key !== void 0) {
          key = "" + config.key;
        }
        if (config.ref !== void 0) {
          ref = config.ref;
        }
        for (var k5 in config) {
          if (k5 !== "key" && k5 !== "ref" && Object.prototype.hasOwnProperty.call(config, k5)) {
            props[k5] = config[k5];
          }
        }
      }
      var len = arguments.length - 2;
      if (len === 1) props.children = children;
      else if (len > 1) {
        var kids = new Array(len);
        for (var i7 = 0; i7 < len; i7++) kids[i7] = arguments[i7 + 2];
        props.children = kids;
      }
      return { $$typeof: ELEMENT, type, key, ref, props, _owner: null };
    };
    s12.createContext = function(defaultValue) {
      var CONTEXT = typeof Symbol !== "undefined" && Symbol.for ? /* @__PURE__ */ Symbol.for("react.context") : 60110;
      var PROVIDER = typeof Symbol !== "undefined" && Symbol.for ? /* @__PURE__ */ Symbol.for("react.provider") : 60109;
      var ctx = { $$typeof: CONTEXT, _currentValue: defaultValue, _currentValue2: defaultValue, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null };
      ctx.Provider = { $$typeof: PROVIDER, _context: ctx };
      ctx.Consumer = ctx;
      return ctx;
    };
    s12.createRef = function() {
      return { current: null };
    };
    s12.forwardRef = function(render2) {
      var FORWARD_REF = typeof Symbol !== "undefined" && Symbol.for ? /* @__PURE__ */ Symbol.for("react.forward_ref") : 60112;
      return { $$typeof: FORWARD_REF, render: render2 };
    };
    s12.lazy = function(loader) {
      var LAZY = typeof Symbol !== "undefined" && Symbol.for ? /* @__PURE__ */ Symbol.for("react.lazy") : 60116;
      return { $$typeof: LAZY, _payload: { _status: -1, _result: loader }, _init: function(payload) {
        return payload._result();
      } };
    };
    s12.memo = function(type, compare) {
      var MEMO = typeof Symbol !== "undefined" && Symbol.for ? /* @__PURE__ */ Symbol.for("react.memo") : 60115;
      return { $$typeof: MEMO, type, compare: compare || null };
    };
    s12.startTransition = function(cb) {
      cb();
    };
    s12.Suspense = function() {
      return null;
    };
    s12.Children = { map: function() {
      return [];
    }, forEach: function() {
    }, count: function() {
      return 0;
    }, toArray: function() {
      return [];
    } };
    s12.Component = function() {
    };
    s12.PureComponent = function() {
    };
    s12.cloneElement = function(element, config, children) {
      var ELEMENT = typeof Symbol !== "undefined" && Symbol.for ? /* @__PURE__ */ Symbol.for("react.element") : 60103;
      var props = Object.assign({}, element.props);
      var key = element.key;
      var ref = element.ref;
      if (config != null) {
        if (config.key !== void 0) {
          key = "" + config.key;
        }
        if (config.ref !== void 0) {
          ref = config.ref;
        }
        for (var k5 in config) {
          if (k5 !== "key" && k5 !== "ref" && Object.prototype.hasOwnProperty.call(config, k5)) {
            props[k5] = config[k5];
          }
        }
      }
      var len = arguments.length - 2;
      if (len === 1) props.children = children;
      else if (len > 1) {
        var kids = new Array(len);
        for (var i7 = 0; i7 < len; i7++) kids[i7] = arguments[i7 + 2];
        props.children = kids;
      }
      return { $$typeof: ELEMENT, type: element.type, key, ref, props, _owner: null };
    };
    s12.createFactory = function() {
      return function() {
        return null;
      };
    };
    s12.isValidElement = function(obj) {
      var ELEMENT = typeof Symbol !== "undefined" && Symbol.for ? /* @__PURE__ */ Symbol.for("react.element") : 60103;
      return typeof obj === "object" && obj !== null && obj.$$typeof === ELEMENT;
    };
    s12.version = "0.0.0-stub";
    return s12;
  }
  var react_shim_default, Fragment, createElement, createContext, createRef, forwardRef, lazy, memo, startTransition, Suspense, Children, Component, PureComponent, cloneElement, createFactory, isValidElement, version, useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef, useImperativeHandle, useLayoutEffect, useDebugValue, useDeferredValue, useTransition, useId, useSyncExternalStore, useInsertionEffect, useActionState, useOptimistic;
  var init_react_shim = __esm({
    "client/src/react-shim.js"() {
      react_shim_default = _R();
      Fragment = _R().Fragment;
      createElement = _R().createElement;
      createContext = _R().createContext;
      createRef = _R().createRef;
      forwardRef = _R().forwardRef;
      lazy = _R().lazy;
      memo = _R().memo;
      startTransition = _R().startTransition;
      Suspense = _R().Suspense;
      Children = _R().Children;
      Component = _R().Component;
      PureComponent = _R().PureComponent;
      cloneElement = _R().cloneElement;
      createFactory = _R().createFactory;
      isValidElement = _R().isValidElement;
      version = _R().version;
      useState = _R().useState;
      useEffect = _R().useEffect;
      useContext = _R().useContext;
      useReducer = _R().useReducer;
      useCallback = _R().useCallback;
      useMemo = _R().useMemo;
      useRef = _R().useRef;
      useImperativeHandle = _R().useImperativeHandle;
      useLayoutEffect = _R().useLayoutEffect;
      useDebugValue = _R().useDebugValue;
      useDeferredValue = _R().useDeferredValue;
      useTransition = _R().useTransition;
      useId = _R().useId;
      useSyncExternalStore = _R().useSyncExternalStore;
      useInsertionEffect = _R().useInsertionEffect;
      useActionState = _R().useActionState;
      useOptimistic = _R().useOptimistic;
    }
  });

  // node_modules/use-sync-external-store/cjs/use-sync-external-store-with-selector.development.js
  var require_use_sync_external_store_with_selector_development = __commonJS({
    "node_modules/use-sync-external-store/cjs/use-sync-external-store-with-selector.development.js"(exports) {
      "use strict";
      (function() {
        function is(x7, y4) {
          return x7 === y4 && (0 !== x7 || 1 / x7 === 1 / y4) || x7 !== x7 && y4 !== y4;
        }
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
        var React2 = (init_react_shim(), __toCommonJS(react_shim_exports)), objectIs = "function" === typeof Object.is ? Object.is : is, useSyncExternalStore2 = React2.useSyncExternalStore, useRef2 = React2.useRef, useEffect2 = React2.useEffect, useMemo2 = React2.useMemo, useDebugValue2 = React2.useDebugValue;
        exports.useSyncExternalStoreWithSelector = function(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
          var instRef = useRef2(null);
          if (null === instRef.current) {
            var inst = { hasValue: false, value: null };
            instRef.current = inst;
          } else inst = instRef.current;
          instRef = useMemo2(
            function() {
              function memoizedSelector(nextSnapshot) {
                if (!hasMemo) {
                  hasMemo = true;
                  memoizedSnapshot = nextSnapshot;
                  nextSnapshot = selector(nextSnapshot);
                  if (void 0 !== isEqual && inst.hasValue) {
                    var currentSelection = inst.value;
                    if (isEqual(currentSelection, nextSnapshot))
                      return memoizedSelection = currentSelection;
                  }
                  return memoizedSelection = nextSnapshot;
                }
                currentSelection = memoizedSelection;
                if (objectIs(memoizedSnapshot, nextSnapshot))
                  return currentSelection;
                var nextSelection = selector(nextSnapshot);
                if (void 0 !== isEqual && isEqual(currentSelection, nextSelection))
                  return memoizedSnapshot = nextSnapshot, currentSelection;
                memoizedSnapshot = nextSnapshot;
                return memoizedSelection = nextSelection;
              }
              var hasMemo = false, memoizedSnapshot, memoizedSelection, maybeGetServerSnapshot = void 0 === getServerSnapshot ? null : getServerSnapshot;
              return [
                function() {
                  return memoizedSelector(getSnapshot());
                },
                null === maybeGetServerSnapshot ? void 0 : function() {
                  return memoizedSelector(maybeGetServerSnapshot());
                }
              ];
            },
            [getSnapshot, getServerSnapshot, selector, isEqual]
          );
          var value = useSyncExternalStore2(subscribe, instRef[0], instRef[1]);
          useEffect2(
            function() {
              inst.hasValue = true;
              inst.value = value;
            },
            [value]
          );
          useDebugValue2(value);
          return value;
        };
        "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
      })();
    }
  });

  // node_modules/use-sync-external-store/with-selector.js
  var require_with_selector = __commonJS({
    "node_modules/use-sync-external-store/with-selector.js"(exports, module) {
      "use strict";
      if (false) {
        module.exports = null;
      } else {
        module.exports = require_use_sync_external_store_with_selector_development();
      }
    }
  });

  // client/src/styles/tailwind-output.css
  var tailwind_output_default = '/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */\n@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before,:after,::backdrop{--tw-translate-x:0;--tw-translate-y:0;--tw-translate-z:0;--tw-scale-x:1;--tw-scale-y:1;--tw-scale-z:1;--tw-rotate-x:initial;--tw-rotate-y:initial;--tw-rotate-z:initial;--tw-skew-x:initial;--tw-skew-y:initial;--tw-space-y-reverse:0;--tw-divide-y-reverse:0;--tw-border-style:solid;--tw-leading:initial;--tw-font-weight:initial;--tw-tracking:initial;--tw-shadow:0 0 #0000;--tw-shadow-color:initial;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-color:initial;--tw-inset-shadow-alpha:100%;--tw-ring-color:initial;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-color:initial;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-inset:initial;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-outline-style:solid;--tw-blur:initial;--tw-brightness:initial;--tw-contrast:initial;--tw-grayscale:initial;--tw-hue-rotate:initial;--tw-invert:initial;--tw-opacity:initial;--tw-saturate:initial;--tw-sepia:initial;--tw-drop-shadow:initial;--tw-drop-shadow-color:initial;--tw-drop-shadow-alpha:100%;--tw-drop-shadow-size:initial;--tw-duration:initial;--tw-ease:initial}}}@layer theme{:root,:host{--font-sans:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";--font-mono:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;--color-black:#000;--color-white:#fff;--spacing:.25rem;--text-xs:.75rem;--text-xs--line-height:calc(1 / .75);--text-sm:.875rem;--text-sm--line-height:calc(1.25 / .875);--text-base:1rem;--text-base--line-height:calc(1.5 / 1);--text-lg:1.125rem;--text-lg--line-height:calc(1.75 / 1.125);--font-weight-medium:500;--font-weight-semibold:600;--font-weight-bold:700;--tracking-wide:.025em;--leading-snug:1.375;--leading-relaxed:1.625;--radius-md:.375rem;--radius-lg:.5rem;--radius-xl:.75rem;--radius-2xl:1rem;--ease-in:cubic-bezier(.4, 0, 1, 1);--ease-out:cubic-bezier(0, 0, .2, 1);--ease-in-out:cubic-bezier(.4, 0, .2, 1);--animate-spin:spin 1s linear infinite;--animate-ping:ping 1s cubic-bezier(0, 0, .2, 1) infinite;--default-transition-duration:.15s;--default-transition-timing-function:cubic-bezier(.4, 0, .2, 1);--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono);--color-aq-canvas:#f5f7fa;--color-aq-paper:#fff;--color-aq-surface-alt:#f8fafc;--color-aq-ink:#182230;--color-aq-ink-2:#344054;--color-aq-muted:#475467;--color-aq-faint:#667085;--color-aq-line:#e4e7ec;--color-aq-line-2:#d0d5dd;--color-aq-navy:#17212f;--color-aq-blue:#155eef;--color-aq-blue-soft:#eff4ff;--color-aq-green:#067647;--color-aq-green-soft:#ecfdf3;--color-aq-amber:#93370d;--color-aq-amber-soft:#fffaeb;--color-aq-red:#b42318;--color-aq-red-soft:#fef3f2;--font-family-aq-mono:"SFMono-Regular", Consolas, "Liberation Mono", monospace}}@layer base{*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}::file-selector-button{box-sizing:border-box;border:0 solid;margin:0;padding:0}html,:host{-webkit-text-size-adjust:100%;tab-size:4;line-height:1.5;font-family:var(--default-font-family,-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-webkit-tap-highlight-color:transparent}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:var(--default-mono-font-family,ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-variation-settings:var(--default-mono-font-variation-settings,normal);font-size:1em}small{font-size:80%}sub,sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}:-moz-focusring:where(:not(iframe)){outline:auto}progress{vertical-align:baseline}summary{display:list-item}ol,ul,menu{list-style:none}img,svg,video,canvas,audio,iframe,embed,object{vertical-align:middle;display:block}img,video{max-width:100%;height:auto}button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}::file-selector-button{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}:where(select:is([multiple],[size])) optgroup{font-weight:bolder}:where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}::file-selector-button{margin-inline-end:4px}::placeholder{opacity:1}@supports (not ((-webkit-appearance:-apple-pay-button))) or (contain-intrinsic-size:1px){::placeholder{color:currentColor}@supports (color:color-mix(in lab, red, red)){::placeholder{color:color-mix(in oklab, currentcolor 50%, transparent)}}}textarea{resize:vertical}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-datetime-edit{padding-block:0}::-webkit-datetime-edit-year-field{padding-block:0}::-webkit-datetime-edit-month-field{padding-block:0}::-webkit-datetime-edit-day-field{padding-block:0}::-webkit-datetime-edit-hour-field{padding-block:0}::-webkit-datetime-edit-minute-field{padding-block:0}::-webkit-datetime-edit-second-field{padding-block:0}::-webkit-datetime-edit-millisecond-field{padding-block:0}::-webkit-datetime-edit-meridiem-field{padding-block:0}::-webkit-calendar-picker-indicator{line-height:1}:-moz-ui-invalid{box-shadow:none}button,input:where([type=button],[type=reset],[type=submit]){appearance:button}::file-selector-button{appearance:button}::-webkit-inner-spin-button{height:auto}::-webkit-outer-spin-button{height:auto}[hidden]:where(:not([hidden=until-found])){display:none!important}}@layer components;@layer utilities{.\\@container{container-type:inline-size}.pointer-events-none{pointer-events:none}.collapse{visibility:collapse}.visible{visibility:visible}.sr-only{clip-path:inset(50%);white-space:nowrap;border-width:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}.absolute{position:absolute}.fixed{position:fixed}.relative{position:relative}.static{position:static}.sticky{position:sticky}.inset-0{inset:0}.-top-1{top:calc(var(--spacing) * -1)}.top-0{top:0}.top-0\\.5{top:calc(var(--spacing) * .5)}.top-1{top:var(--spacing)}.-right-1{right:calc(var(--spacing) * -1)}.right-0{right:0}.right-5{right:calc(var(--spacing) * 5)}.bottom-0{bottom:0}.bottom-5{bottom:calc(var(--spacing) * 5)}.bottom-full{bottom:100%}.left-0{left:0}.left-0\\.5{left:calc(var(--spacing) * .5)}.left-1{left:var(--spacing)}.left-1\\/2{left:50%}.left-3{left:calc(var(--spacing) * 3)}.isolate{isolation:isolate}.z-50{z-index:50}.z-\\[100\\]{z-index:100}.container{width:100%}@media (min-width:40rem){.container{max-width:40rem}}@media (min-width:48rem){.container{max-width:48rem}}@media (min-width:64rem){.container{max-width:64rem}}@media (min-width:80rem){.container{max-width:80rem}}@media (min-width:96rem){.container{max-width:96rem}}.m-0{margin:0}.mx-auto{margin-inline:auto}.my-4{margin-block:calc(var(--spacing) * 4)}.mt-0{margin-top:0}.mt-0\\.5{margin-top:calc(var(--spacing) * .5)}.mt-1{margin-top:var(--spacing)}.mt-2{margin-top:calc(var(--spacing) * 2)}.mt-3{margin-top:calc(var(--spacing) * 3)}.mt-4{margin-top:calc(var(--spacing) * 4)}.mt-5{margin-top:calc(var(--spacing) * 5)}.mt-6{margin-top:calc(var(--spacing) * 6)}.mr-auto{margin-right:auto}.mb-0{margin-bottom:0}.mb-0\\.5{margin-bottom:calc(var(--spacing) * .5)}.mb-1{margin-bottom:var(--spacing)}.mb-1\\.5{margin-bottom:calc(var(--spacing) * 1.5)}.mb-2{margin-bottom:calc(var(--spacing) * 2)}.mb-3{margin-bottom:calc(var(--spacing) * 3)}.mb-4{margin-bottom:calc(var(--spacing) * 4)}.mb-5{margin-bottom:calc(var(--spacing) * 5)}.ml-1{margin-left:var(--spacing)}.ml-3{margin-left:calc(var(--spacing) * 3)}.ml-auto{margin-left:auto}.line-clamp-2{-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.block{display:block}.contents{display:contents}.flex{display:flex}.grid{display:grid}.hidden{display:none}.inline{display:inline}.inline-block{display:inline-block}.inline-flex{display:inline-flex}.table{display:table}.h-1{height:var(--spacing)}.h-1\\.5{height:calc(var(--spacing) * 1.5)}.h-2{height:calc(var(--spacing) * 2)}.h-3{height:calc(var(--spacing) * 3)}.h-4{height:calc(var(--spacing) * 4)}.h-5{height:calc(var(--spacing) * 5)}.h-6{height:calc(var(--spacing) * 6)}.h-7{height:calc(var(--spacing) * 7)}.h-8{height:calc(var(--spacing) * 8)}.h-9{height:calc(var(--spacing) * 9)}.h-10{height:calc(var(--spacing) * 10)}.h-20{height:calc(var(--spacing) * 20)}.h-36{height:calc(var(--spacing) * 36)}.h-48{height:calc(var(--spacing) * 48)}.h-full{height:100%}.h-screen{height:100vh}.max-h-32{max-height:calc(var(--spacing) * 32)}.max-h-60{max-height:calc(var(--spacing) * 60)}.max-h-80{max-height:calc(var(--spacing) * 80)}.min-h-0{min-height:0}.w-1{width:var(--spacing)}.w-1\\.5{width:calc(var(--spacing) * 1.5)}.w-2{width:calc(var(--spacing) * 2)}.w-3{width:calc(var(--spacing) * 3)}.w-4{width:calc(var(--spacing) * 4)}.w-5{width:calc(var(--spacing) * 5)}.w-7{width:calc(var(--spacing) * 7)}.w-8{width:calc(var(--spacing) * 8)}.w-9{width:calc(var(--spacing) * 9)}.w-\\[800px\\]{width:800px}.w-\\[min\\(840px\\,94vw\\)\\]{width:min(840px,94vw)}.w-\\[min\\(880px\\,94vw\\)\\]{width:min(880px,94vw)}.w-full{width:100%}.min-w-0{min-width:0}.min-w-\\[140px\\]{min-width:140px}.min-w-\\[560px\\]{min-width:560px}.flex-1{flex:1}.flex-shrink{flex-shrink:1}.flex-shrink-0{flex-shrink:0}.grow{flex-grow:1}.table-fixed{table-layout:fixed}.-translate-x-1{--tw-translate-x:calc(var(--spacing) * -1);translate:var(--tw-translate-x) var(--tw-translate-y)}.-translate-x-1\\/2{--tw-translate-x:calc(calc(1 / 2 * 100%) * -1);translate:var(--tw-translate-x) var(--tw-translate-y)}.translate-x-0{--tw-translate-x:0px;translate:var(--tw-translate-x) var(--tw-translate-y)}.translate-x-4{--tw-translate-x:calc(var(--spacing) * 4);translate:var(--tw-translate-x) var(--tw-translate-y)}.-translate-y-1{--tw-translate-y:calc(var(--spacing) * -1);translate:var(--tw-translate-x) var(--tw-translate-y)}.translate-y-0{--tw-translate-y:0px;translate:var(--tw-translate-x) var(--tw-translate-y)}.translate-y-4{--tw-translate-y:calc(var(--spacing) * 4);translate:var(--tw-translate-x) var(--tw-translate-y)}.scale-95{--tw-scale-x:95%;--tw-scale-y:95%;--tw-scale-z:95%;scale:var(--tw-scale-x) var(--tw-scale-y)}.scale-100{--tw-scale-x:100%;--tw-scale-y:100%;--tw-scale-z:100%;scale:var(--tw-scale-x) var(--tw-scale-y)}.transform{transform:var(--tw-rotate-x,) var(--tw-rotate-y,) var(--tw-rotate-z,) var(--tw-skew-x,) var(--tw-skew-y,)}.animate-ping{animation:var(--animate-ping)}.animate-spin{animation:var(--animate-spin)}.cursor-pointer{cursor:pointer}.resize{resize:both}.resize-y{resize:vertical}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}.grid-cols-\\[minmax\\(120px\\,0\\.85fr\\)_minmax\\(0\\,1\\.15fr\\)\\]{grid-template-columns:minmax(120px,.85fr) minmax(0,1.15fr)}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.place-items-center{place-items:center}.items-center{align-items:center}.items-end{align-items:flex-end}.items-start{align-items:flex-start}.justify-between{justify-content:space-between}.justify-center{justify-content:center}.justify-end{justify-content:flex-end}.gap-0{gap:0}.gap-0\\.5{gap:calc(var(--spacing) * .5)}.gap-1{gap:var(--spacing)}.gap-1\\.5{gap:calc(var(--spacing) * 1.5)}.gap-2{gap:calc(var(--spacing) * 2)}.gap-2\\.5{gap:calc(var(--spacing) * 2.5)}.gap-3{gap:calc(var(--spacing) * 3)}.gap-4{gap:calc(var(--spacing) * 4)}.gap-px{gap:1px}:where(.space-y-0>:not(:last-child)){--tw-space-y-reverse:0;margin-block:0}:where(.space-y-3>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing) * 3) * var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing) * 3) * calc(1 - var(--tw-space-y-reverse)))}:where(.space-y-4>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing) * 4) * var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing) * 4) * calc(1 - var(--tw-space-y-reverse)))}:where(.space-y-5>:not(:last-child)){--tw-space-y-reverse:0;margin-block-start:calc(calc(var(--spacing) * 5) * var(--tw-space-y-reverse));margin-block-end:calc(calc(var(--spacing) * 5) * calc(1 - var(--tw-space-y-reverse)))}:where(.divide-y>:not(:last-child)){--tw-divide-y-reverse:0;border-bottom-style:var(--tw-border-style);border-top-style:var(--tw-border-style);border-top-width:calc(1px * var(--tw-divide-y-reverse));border-bottom-width:calc(1px * calc(1 - var(--tw-divide-y-reverse)))}:where(.divide-aq-line>:not(:last-child)){border-color:var(--color-aq-line)}.truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.overflow-auto{overflow:auto}.overflow-hidden{overflow:hidden}.overflow-x-auto{overflow-x:auto}.overflow-y-auto{overflow-y:auto}.rounded{border-radius:.25rem}.rounded-2xl{border-radius:var(--radius-2xl)}.rounded-full{border-radius:3.40282e38px}.rounded-lg{border-radius:var(--radius-lg)}.rounded-md{border-radius:var(--radius-md)}.rounded-xl{border-radius:var(--radius-xl)}.rounded-b-lg{border-bottom-right-radius:var(--radius-lg);border-bottom-left-radius:var(--radius-lg)}.border{border-style:var(--tw-border-style);border-width:1px}.border-2{border-style:var(--tw-border-style);border-width:2px}.border-t{border-top-style:var(--tw-border-style);border-top-width:1px}.border-r{border-right-style:var(--tw-border-style);border-right-width:1px}.border-b{border-bottom-style:var(--tw-border-style);border-bottom-width:1px}.border-b-2{border-bottom-style:var(--tw-border-style);border-bottom-width:2px}.border-l-2{border-left-style:var(--tw-border-style);border-left-width:2px}.border-l-\\[3px\\]{border-left-style:var(--tw-border-style);border-left-width:3px}.border-aq-amber{border-color:var(--color-aq-amber)}.border-aq-blue{border-color:var(--color-aq-blue)}.border-aq-blue\\/20{border-color:#155eef33}@supports (color:color-mix(in lab, red, red)){.border-aq-blue\\/20{border-color:color-mix(in oklab, var(--color-aq-blue) 20%, transparent)}}.border-aq-line{border-color:var(--color-aq-line)}.border-aq-line-2{border-color:var(--color-aq-line-2)}.border-transparent{border-color:#0000}.border-t-aq-blue{border-top-color:var(--color-aq-blue)}.border-l-aq-amber{border-left-color:var(--color-aq-amber)}.border-l-aq-blue{border-left-color:var(--color-aq-blue)}.border-l-aq-red{border-left-color:var(--color-aq-red)}.bg-aq-amber{background-color:var(--color-aq-amber)}.bg-aq-amber-soft{background-color:var(--color-aq-amber-soft)}.bg-aq-blue{background-color:var(--color-aq-blue)}.bg-aq-blue-soft{background-color:var(--color-aq-blue-soft)}.bg-aq-faint{background-color:var(--color-aq-faint)}.bg-aq-green{background-color:var(--color-aq-green)}.bg-aq-line{background-color:var(--color-aq-line)}.bg-aq-line-2{background-color:var(--color-aq-line-2)}.bg-aq-navy{background-color:var(--color-aq-navy)}.bg-aq-paper{background-color:var(--color-aq-paper)}.bg-aq-red-soft{background-color:var(--color-aq-red-soft)}.bg-aq-surface-alt{background-color:var(--color-aq-surface-alt)}.bg-black{background-color:var(--color-black)}.bg-black\\/40{background-color:#0006}@supports (color:color-mix(in lab, red, red)){.bg-black\\/40{background-color:color-mix(in oklab, var(--color-black) 40%, transparent)}}.bg-transparent{background-color:#0000}.bg-white{background-color:var(--color-white)}.p-0{padding:0}.p-0\\.5{padding:calc(var(--spacing) * .5)}.p-3{padding:calc(var(--spacing) * 3)}.p-4{padding:calc(var(--spacing) * 4)}.p-6{padding:calc(var(--spacing) * 6)}.px-1{padding-inline:var(--spacing)}.px-1\\.5{padding-inline:calc(var(--spacing) * 1.5)}.px-2{padding-inline:calc(var(--spacing) * 2)}.px-2\\.5{padding-inline:calc(var(--spacing) * 2.5)}.px-3{padding-inline:calc(var(--spacing) * 3)}.px-4{padding-inline:calc(var(--spacing) * 4)}.px-6{padding-inline:calc(var(--spacing) * 6)}.py-0{padding-block:0}.py-0\\.5{padding-block:calc(var(--spacing) * .5)}.py-1{padding-block:var(--spacing)}.py-1\\.5{padding-block:calc(var(--spacing) * 1.5)}.py-2{padding-block:calc(var(--spacing) * 2)}.py-2\\.5{padding-block:calc(var(--spacing) * 2.5)}.py-3{padding-block:calc(var(--spacing) * 3)}.py-4{padding-block:calc(var(--spacing) * 4)}.py-8{padding-block:calc(var(--spacing) * 8)}.py-10{padding-block:calc(var(--spacing) * 10)}.py-12{padding-block:calc(var(--spacing) * 12)}.pt-3{padding-top:calc(var(--spacing) * 3)}.pt-4{padding-top:calc(var(--spacing) * 4)}.pt-5{padding-top:calc(var(--spacing) * 5)}.pr-2{padding-right:calc(var(--spacing) * 2)}.pr-3{padding-right:calc(var(--spacing) * 3)}.pr-4{padding-right:calc(var(--spacing) * 4)}.pb-0{padding-bottom:0}.pb-4{padding-bottom:calc(var(--spacing) * 4)}.pb-5{padding-bottom:calc(var(--spacing) * 5)}.pb-6{padding-bottom:calc(var(--spacing) * 6)}.pl-0{padding-left:0}.pl-4{padding-left:calc(var(--spacing) * 4)}.pl-9{padding-left:calc(var(--spacing) * 9)}.text-center{text-align:center}.text-left{text-align:left}.text-right{text-align:right}.align-middle{vertical-align:middle}.align-top{vertical-align:top}.font-mono{font-family:var(--font-mono)}.text-base{font-size:var(--text-base);line-height:var(--tw-leading,var(--text-base--line-height))}.text-lg{font-size:var(--text-lg);line-height:var(--tw-leading,var(--text-lg--line-height))}.text-sm{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}.text-xs{font-size:var(--text-xs);line-height:var(--tw-leading,var(--text-xs--line-height))}.leading-none{--tw-leading:1;line-height:1}.leading-relaxed{--tw-leading:var(--leading-relaxed);line-height:var(--leading-relaxed)}.leading-snug{--tw-leading:var(--leading-snug);line-height:var(--leading-snug)}.font-bold{--tw-font-weight:var(--font-weight-bold);font-weight:var(--font-weight-bold)}.font-medium{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.font-semibold{--tw-font-weight:var(--font-weight-semibold);font-weight:var(--font-weight-semibold)}.tracking-wide{--tw-tracking:var(--tracking-wide);letter-spacing:var(--tracking-wide)}.break-words{overflow-wrap:break-word}.whitespace-nowrap{white-space:nowrap}.whitespace-pre-wrap{white-space:pre-wrap}.text-aq-amber{color:var(--color-aq-amber)}.text-aq-amber\\/70{color:#93370db3}@supports (color:color-mix(in lab, red, red)){.text-aq-amber\\/70{color:color-mix(in oklab, var(--color-aq-amber) 70%, transparent)}}.text-aq-blue{color:var(--color-aq-blue)}.text-aq-blue\\/70{color:#155eefb3}@supports (color:color-mix(in lab, red, red)){.text-aq-blue\\/70{color:color-mix(in oklab, var(--color-aq-blue) 70%, transparent)}}.text-aq-faint{color:var(--color-aq-faint)}.text-aq-green{color:var(--color-aq-green)}.text-aq-ink{color:var(--color-aq-ink)}.text-aq-ink-2{color:var(--color-aq-ink-2)}.text-aq-muted{color:var(--color-aq-muted)}.text-aq-red{color:var(--color-aq-red)}.text-white{color:var(--color-white)}.lowercase{text-transform:lowercase}.uppercase{text-transform:uppercase}.opacity-0{opacity:0}.opacity-30{opacity:.3}.opacity-40{opacity:.4}.opacity-60{opacity:.6}.opacity-70{opacity:.7}.opacity-75{opacity:.75}.opacity-100{opacity:1}.shadow{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a), 0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-2xl{--tw-shadow:0 25px 50px -12px var(--tw-shadow-color,#00000040);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-lg{--tw-shadow:0 10px 15px -3px var(--tw-shadow-color,#0000001a), 0 4px 6px -4px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-sm{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a), 0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.ring-0{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(0px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.outline{outline-style:var(--tw-outline-style);outline-width:1px}.blur{--tw-blur:blur(8px);filter:var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)}.filter{filter:var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)}.transition{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to,opacity,box-shadow,transform,translate,scale,rotate,filter,-webkit-backdrop-filter,backdrop-filter,display,content-visibility,overlay,pointer-events;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-all{transition-property:all;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-colors{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.transition-transform{transition-property:transform,translate,scale,rotate;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.duration-200{--tw-duration:.2s;transition-duration:.2s}.duration-300{--tw-duration:.3s;transition-duration:.3s}.ease-in{--tw-ease:var(--ease-in);transition-timing-function:var(--ease-in)}.ease-in-out{--tw-ease:var(--ease-in-out);transition-timing-function:var(--ease-in-out)}.ease-out{--tw-ease:var(--ease-out);transition-timing-function:var(--ease-out)}.outline-none{--tw-outline-style:none;outline-style:none}@media (hover:hover){.group-hover\\:text-aq-blue:is(:where(.group):hover *){color:var(--color-aq-blue)}.group-hover\\/box\\:border-aq-blue:is(:where(.group\\/box):hover *){border-color:var(--color-aq-blue)}}.placeholder\\:text-aq-faint::placeholder{color:var(--color-aq-faint)}.last\\:border-b-0:last-child{border-bottom-style:var(--tw-border-style);border-bottom-width:0}@media (hover:hover){.hover\\:border-aq-blue:hover{border-color:var(--color-aq-blue)}.hover\\:border-aq-line-2:hover{border-color:var(--color-aq-line-2)}.hover\\:bg-aq-blue-soft\\/50:hover{background-color:#eff4ff80}@supports (color:color-mix(in lab, red, red)){.hover\\:bg-aq-blue-soft\\/50:hover{background-color:color-mix(in oklab, var(--color-aq-blue-soft) 50%, transparent)}}.hover\\:bg-aq-green-soft:hover{background-color:var(--color-aq-green-soft)}.hover\\:bg-aq-red-soft:hover{background-color:var(--color-aq-red-soft)}.hover\\:bg-aq-surface-alt:hover{background-color:var(--color-aq-surface-alt)}.hover\\:text-aq-ink:hover{color:var(--color-aq-ink)}.hover\\:underline:hover{text-decoration-line:underline}}.focus\\:border-aq-blue:focus{border-color:var(--color-aq-blue)}.focus\\:ring-2:focus{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.focus\\:ring-aq-blue\\/10:focus{--tw-ring-color:#155eef1a}@supports (color:color-mix(in lab, red, red)){.focus\\:ring-aq-blue\\/10:focus{--tw-ring-color:color-mix(in oklab, var(--color-aq-blue) 10%, transparent)}}.focus\\:ring-aq-blue\\/20:focus{--tw-ring-color:#155eef33}@supports (color:color-mix(in lab, red, red)){.focus\\:ring-aq-blue\\/20:focus{--tw-ring-color:color-mix(in oklab, var(--color-aq-blue) 20%, transparent)}}.focus\\:outline-none:focus{--tw-outline-style:none;outline-style:none}.disabled\\:bg-aq-surface-alt:disabled{background-color:var(--color-aq-surface-alt)}.disabled\\:text-aq-faint:disabled{color:var(--color-aq-faint)}.disabled\\:opacity-40:disabled{opacity:.4}.data-\\[closed\\]\\:translate-x-4[data-closed]{--tw-translate-x:calc(var(--spacing) * 4);translate:var(--tw-translate-x) var(--tw-translate-y)}.data-\\[closed\\]\\:scale-95[data-closed]{--tw-scale-x:95%;--tw-scale-y:95%;--tw-scale-z:95%;scale:var(--tw-scale-x) var(--tw-scale-y)}.data-\\[closed\\]\\:opacity-0[data-closed]{opacity:0}.data-\\[selected\\]\\:border-aq-blue[data-selected]{border-color:var(--color-aq-blue)}.data-\\[selected\\]\\:text-aq-blue[data-selected]{color:var(--color-aq-blue)}.\\[data-chat-flow-kind\\]\\:visible:is(data-chat-flow-kind),.\\[role\\=\\"listbox\\"\\]\\:visible:is(){visibility:visible}}#aq-floating-root .aq-btn{border:1px solid var(--color-aq-line-2);background:var(--color-aq-paper);height:36px;color:var(--color-aq-ink-2);cursor:pointer;white-space:nowrap;border-radius:8px;justify-content:center;align-items:center;gap:6px;padding:0 12px;font-size:13px;font-weight:600;transition:all .15s;display:inline-flex}#aq-floating-root .aq-btn:hover{border-color:var(--color-aq-faint);background:var(--color-aq-surface-alt);color:var(--color-aq-ink)}#aq-floating-root .aq-btn:disabled{opacity:.4;cursor:not-allowed}#aq-floating-root .aq-btn svg{flex-shrink:0;width:14px;height:14px}#aq-floating-root .aq-btn-primary:hover{background:#004eeb;border-color:#004eeb}#aq-floating-root .aq-btn-ghost{background:0 0;border-color:#0000}#aq-floating-root .aq-btn-ghost:hover{border-color:var(--color-aq-line);background:var(--color-aq-surface-alt)}#aq-floating-root .aq-btn-danger{border-color:#b423184d}@supports (color:color-mix(in lab, red, red)){#aq-floating-root .aq-btn-danger{border-color:color-mix(in srgb, var(--color-aq-red) 30%, transparent)}}#aq-floating-root .aq-btn-danger{color:var(--color-aq-red)}#aq-floating-root .aq-btn-danger:hover{background:var(--color-aq-red-soft)}#aq-floating-root .aq-btn-success{border-color:#0676474d}@supports (color:color-mix(in lab, red, red)){#aq-floating-root .aq-btn-success{border-color:color-mix(in srgb, var(--color-aq-green) 30%, transparent)}}#aq-floating-root .aq-btn-success{color:var(--color-aq-green)}#aq-floating-root .aq-btn-success:hover{background:var(--color-aq-green-soft)}#aq-floating-root .aq-input{border:1px solid var(--color-aq-line-2);background:var(--color-aq-paper);width:100%;height:40px;color:var(--color-aq-ink);border-radius:8px;outline:none;padding:0 12px;font-size:14px;transition:border-color .15s,box-shadow .15s}#aq-floating-root .aq-input:focus{border-color:var(--color-aq-blue);box-shadow:0 0 0 3px #155eef1a}@supports (color:color-mix(in lab, red, red)){#aq-floating-root .aq-input:focus{box-shadow:0 0 0 3px color-mix(in srgb, var(--color-aq-blue) 10%, transparent)}}#aq-floating-root .aq-input:disabled{background:var(--color-aq-surface-alt);color:var(--color-aq-faint);cursor:not-allowed}#aq-floating-root .aq-input::placeholder{color:var(--color-aq-faint)}#aq-floating-root .aq-prose{color:var(--color-aq-ink-2);font-size:14px;line-height:1.7}#aq-floating-root .aq-prose .aq-mk-h1{color:var(--color-aq-ink);margin:20px 0 8px;font-size:20px;font-weight:700}#aq-floating-root .aq-prose .aq-mk-h2{color:var(--color-aq-ink);margin:16px 0 6px;font-size:18px;font-weight:700}#aq-floating-root .aq-prose .aq-mk-h3{color:var(--color-aq-ink);margin:14px 0 6px;font-size:16px;font-weight:700}#aq-floating-root .aq-prose .aq-mk-h4,#aq-floating-root .aq-prose .aq-mk-h5,#aq-floating-root .aq-prose .aq-mk-h6{color:var(--color-aq-ink);margin:12px 0 4px;font-size:14px;font-weight:600}#aq-floating-root .aq-prose .aq-mk-p{margin-bottom:10px}#aq-floating-root .aq-prose .aq-mk-ul,#aq-floating-root .aq-prose .aq-mk-ol{margin-bottom:10px;padding-left:20px}#aq-floating-root .aq-prose .aq-mk-ul{list-style:outside}#aq-floating-root .aq-prose .aq-mk-ol{list-style:decimal}#aq-floating-root .aq-prose .aq-mk-ul li,#aq-floating-root .aq-prose .aq-mk-ol li{margin-bottom:4px}#aq-floating-root .aq-prose .aq-mk-code{background:var(--color-aq-blue-soft);color:var(--color-aq-blue);font-size:12px;font-family:var(--font-family-aq-mono);border-radius:4px;padding:2px 6px}#aq-floating-root .aq-prose .aq-mk-pre{background:var(--color-aq-navy);border-radius:12px;margin:12px 0;padding:12px;overflow:auto}#aq-floating-root .aq-prose .aq-mk-pre code{color:#c2ccda;font-size:12px;font-family:var(--font-family-aq-mono);white-space:pre-wrap;word-break:break-word}#aq-floating-root .aq-prose .aq-mk-blockquote{border-left:3px solid var(--color-aq-blue);background:#eff4ff80;margin:12px 0;padding:8px 12px}@supports (color:color-mix(in lab, red, red)){#aq-floating-root .aq-prose .aq-mk-blockquote{background:color-mix(in srgb, var(--color-aq-blue-soft) 50%, transparent)}}#aq-floating-root .aq-prose .aq-mk-blockquote{color:var(--color-aq-muted)}#aq-floating-root .aq-prose .aq-mk-blockquote p{margin:0}#aq-floating-root .aq-prose .aq-mk-hr{border-color:var(--color-aq-line);margin:16px 0}#aq-floating-root .aq-prose .aq-mk-a{color:var(--color-aq-blue);text-decoration:underline}#aq-floating-root .aq-prose .aq-mk-a:hover{text-decoration:none}#aq-floating-root .aq-prose strong{color:var(--color-aq-ink);font-weight:700}#aq-floating-root .aq-prose em{font-style:italic}.aq-sidebar-entry{box-sizing:border-box;width:100%;height:36px;color:var(--dsw-alias-label-secondary,#475467);cursor:pointer;white-space:nowrap;background:0 0;border:0;border-radius:8px;align-items:center;gap:8px;padding:0 10px;font-family:inherit;font-size:13px;display:flex}.aq-sidebar-entry:hover{background:var(--dsw-alias-interactive-bg-hover,#f2f4f7);color:var(--dsw-alias-label-primary,#182230)}.aq-sidebar-entry[data-active]{background:var(--dsw-alias-interactive-bg-active,#eaecf0);color:var(--dsw-alias-label-primary,#182230);font-weight:600}.aq-sidebar-icon{flex:none;justify-content:center;align-items:center;width:24px;height:24px;display:inline-flex}.aq-sidebar-icon svg{width:18px;height:18px;display:block}.aq-sidebar-label{text-overflow:ellipsis;overflow:hidden}[data-sidebar-collapsed] .aq-sidebar-entry{border-radius:50%;justify-content:center;width:36px;height:36px;margin:0 auto 12px;padding:0}[data-sidebar-collapsed] .aq-sidebar-label{display:none}[data-theme=dark] [data-dsh-autoqueue-view],[data-color-mode=dark] [data-dsh-autoqueue-view],.dark [data-dsh-autoqueue-view],[data-theme=dark] #aq-floating-root,[data-color-mode=dark] #aq-floating-root,.dark #aq-floating-root{--color-aq-canvas:#111820;--color-aq-paper:#18212b;--color-aq-surface-alt:#1d2834;--color-aq-ink:#f2f4f7;--color-aq-ink-2:#e4e7ec;--color-aq-muted:#c0c8d2;--color-aq-faint:#aeb8c5;--color-aq-line:#344054;--color-aq-line-2:#475467;--color-aq-navy:#0d141c;--color-aq-blue:#84adff;--color-aq-blue-soft:#1d2d4c;--color-aq-green:#75e0a7;--color-aq-green-soft:#16352a;--color-aq-amber:#fec84b;--color-aq-amber-soft:#3a3018;--color-aq-red:#fda29b;--color-aq-red-soft:#3d2423}#aq-floating-root .aq-btn-primary{border-color:var(--color-aq-blue);background:var(--color-aq-blue);color:#fff}[data-theme=dark] #aq-floating-root .aq-btn-primary,[data-color-mode=dark] #aq-floating-root .aq-btn-primary,.dark #aq-floating-root .aq-btn-primary{color:#fff;background:#2459b8;border-color:#528bff}@media (max-width:640px){#aq-floating-root>div>div:first-child{border-radius:16px!important;width:calc(100vw - 20px)!important;max-height:70vh!important;bottom:70px!important;left:10px!important;right:10px!important}}@media (prefers-reduced-motion:reduce){#aq-floating-root *,#aq-floating-root :before,#aq-floating-root :after{scroll-behavior:auto!important;transition-duration:.01ms!important;animation-duration:.01ms!important;animation-iteration-count:1!important}}@property --tw-translate-x{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-y{syntax:"*";inherits:false;initial-value:0}@property --tw-translate-z{syntax:"*";inherits:false;initial-value:0}@property --tw-scale-x{syntax:"*";inherits:false;initial-value:1}@property --tw-scale-y{syntax:"*";inherits:false;initial-value:1}@property --tw-scale-z{syntax:"*";inherits:false;initial-value:1}@property --tw-rotate-x{syntax:"*";inherits:false}@property --tw-rotate-y{syntax:"*";inherits:false}@property --tw-rotate-z{syntax:"*";inherits:false}@property --tw-skew-x{syntax:"*";inherits:false}@property --tw-skew-y{syntax:"*";inherits:false}@property --tw-space-y-reverse{syntax:"*";inherits:false;initial-value:0}@property --tw-divide-y-reverse{syntax:"*";inherits:false;initial-value:0}@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-leading{syntax:"*";inherits:false}@property --tw-font-weight{syntax:"*";inherits:false}@property --tw-tracking{syntax:"*";inherits:false}@property --tw-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-shadow-color{syntax:"*";inherits:false}@property --tw-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-inset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-shadow-color{syntax:"*";inherits:false}@property --tw-inset-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-ring-color{syntax:"*";inherits:false}@property --tw-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-inset-ring-color{syntax:"*";inherits:false}@property --tw-inset-ring-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-ring-inset{syntax:"*";inherits:false}@property --tw-ring-offset-width{syntax:"<length>";inherits:false;initial-value:0}@property --tw-ring-offset-color{syntax:"*";inherits:false;initial-value:#fff}@property --tw-ring-offset-shadow{syntax:"*";inherits:false;initial-value:0 0 #0000}@property --tw-outline-style{syntax:"*";inherits:false;initial-value:solid}@property --tw-blur{syntax:"*";inherits:false}@property --tw-brightness{syntax:"*";inherits:false}@property --tw-contrast{syntax:"*";inherits:false}@property --tw-grayscale{syntax:"*";inherits:false}@property --tw-hue-rotate{syntax:"*";inherits:false}@property --tw-invert{syntax:"*";inherits:false}@property --tw-opacity{syntax:"*";inherits:false}@property --tw-saturate{syntax:"*";inherits:false}@property --tw-sepia{syntax:"*";inherits:false}@property --tw-drop-shadow{syntax:"*";inherits:false}@property --tw-drop-shadow-color{syntax:"*";inherits:false}@property --tw-drop-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-drop-shadow-size{syntax:"*";inherits:false}@property --tw-duration{syntax:"*";inherits:false}@property --tw-ease{syntax:"*";inherits:false}@keyframes spin{to{transform:rotate(360deg)}}@keyframes ping{75%,to{opacity:0;transform:scale(2)}}';

  // client/src/transport.js
  var API_PREFIX = "/api/queue";
  var REQUEST_TIMEOUT_MS = 15e3;
  var SSE_MAX_RETRIES = 5;
  var SSE_RETRY_BASE_MS = 2e3;
  var SSE_RETRY_MAX_MS = 3e4;
  function randomUUID() {
    try {
      return crypto.randomUUID();
    } catch (e7) {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c11) {
        var r10 = Math.random() * 16 | 0;
        return (c11 === "x" ? r10 : r10 & 3 | 8).toString(16);
      });
    }
  }
  function readJson(response) {
    return response.text().then(function(text) {
      var body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch (e7) {
        throw new Error("HTTP " + response.status + " \u8FD4\u56DE\u4E86\u65E0\u6548 JSON");
      }
      if (!response.ok) {
        throw new Error(body && body.error || text || "HTTP " + response.status);
      }
      return body;
    });
  }
  function requestAt(url, init) {
    var controller = new AbortController();
    var timeout = setTimeout(function() {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    return fetch(url, Object.assign({}, init, { signal: controller.signal })).then(readJson).finally(function() {
      clearTimeout(timeout);
    });
  }
  function request(url, init) {
    return requestAt(API_PREFIX + url, init);
  }
  function createTransport() {
    return {
      // The workstation owns both the active and archived views. Always request
      // the complete projection so an SSE refresh cannot make archived rows
      // disappear after the initial load.
      state: function() {
        return request("/state?archived=1");
      },
      detail: function(key) {
        return request("/detail?key=" + encodeURIComponent(key));
      },
      options: function() {
        return request("/options");
      },
      capabilities: function() {
        return requestAt("/api/autoqueue/capabilities");
      },
      getConfig: function() {
        return request("/config");
      },
      setConfig: function(patch) {
        return request("/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
      },
      createTask: function(data) {
        return request("/task", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      },
      action: function(kind, key, opts) {
        var action = Object.assign({}, opts || {}, { kind });
        if (key !== void 0 && key !== null) action.key = key;
        return request("/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ requestId: randomUUID(), action })
        });
      },
      listTemplates: function() {
        return request("/templates");
      },
      getTemplate: function(name) {
        return request("/templates?name=" + encodeURIComponent(name));
      },
      resolveTemplate: function(name, params) {
        return request("/templates/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, params: params || {} }) });
      },
      createTemplate: function(data) {
        return request("/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      },
      updateTemplate: function(name, data) {
        return request("/templates?name=" + encodeURIComponent(name), { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      },
      deleteTemplate: function(name) {
        return request("/templates?name=" + encodeURIComponent(name), { method: "DELETE" });
      },
      markRead: function(key, read) {
        return request("/mark-read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, read: read !== false }) });
      },
      subscribe: function(listener, healthListener) {
        var events = new EventSource(API_PREFIX + "/events?archived=1");
        var health = {
          status: "connecting",
          connected: false,
          reconnecting: false,
          lastEventAt: null,
          revision: null
        };
        var retryCount = 0;
        var retryDelay = SSE_RETRY_BASE_MS;
        var closed = false;
        var reportHealth = function(patch) {
          health = Object.assign({}, health, patch || {});
          if (typeof healthListener === "function") healthListener(health);
        };
        reportHealth();
        events.onopen = function() {
          retryCount = 0;
          retryDelay = SSE_RETRY_BASE_MS;
          reportHealth({ status: "connected", connected: true, reconnecting: false });
        };
        events.onmessage = function(message) {
          try {
            var parsed = JSON.parse(message.data);
            if (parsed && typeof parsed === "object" && typeof parsed.revision === "number") {
              reportHealth({
                status: "connected",
                connected: true,
                reconnecting: false,
                lastEventAt: (/* @__PURE__ */ new Date()).toISOString(),
                revision: parsed.revision
              });
              listener(parsed);
            }
          } catch (e7) {
            if (typeof console !== "undefined" && console.warn) console.warn("autoqueue SSE parse error:", e7);
          }
        };
        events.onerror = function() {
          events.close();
          if (closed) return;
          if (retryCount >= SSE_MAX_RETRIES) {
            reportHealth({ status: "permanent-failure", connected: false, reconnecting: false });
            return;
          }
          retryCount++;
          reportHealth({ status: "reconnecting", connected: false, reconnecting: true });
          setTimeout(function() {
            if (closed) return;
            events = new EventSource(API_PREFIX + "/events?archived=1");
            events.onopen = onopen;
            events.onmessage = onmessage;
            events.onerror = onerror;
          }, retryDelay);
          retryDelay = Math.min(retryDelay * 2, SSE_RETRY_MAX_MS);
        };
        var onopen = events.onopen;
        var onmessage = events.onmessage;
        var onerror = events.onerror;
        var onVisible = function() {
          if (document.visibilityState === "visible") listener(null);
        };
        document.addEventListener("visibilitychange", onVisible);
        return function() {
          closed = true;
          document.removeEventListener("visibilitychange", onVisible);
          events.close();
          reportHealth({ status: "disconnected", connected: false, reconnecting: false });
        };
      }
    };
  }

  // client/src/utils.js
  var STATUS_CONFIG = {
    pending: { label: "\u5F85\u6267\u884C", color: "#596579" },
    running: { label: "\u6267\u884C\u4E2D", color: "#175cd3" },
    done: { label: "\u5DF2\u5B8C\u6210", color: "#067647" },
    failed: { label: "\u5DF2\u5931\u8D25", color: "#b42318" },
    stopped: { label: "\u5DF2\u505C\u6B62", color: "#9a6700" },
    interrupted: { label: "\u5DF2\u4E2D\u65AD", color: "#7a5af8" }
  };
  var CRON_PRESETS = [
    { label: "\u4E0D\u914D\u7F6E", value: "" },
    { label: "\u81EA\u5B9A\u4E49", value: "__custom__" },
    { label: "\u6BCF\u5929 08:00", value: "0 8 * * *" },
    { label: "\u6BCF\u5929 20:00", value: "0 20 * * *" },
    { label: "\u5DE5\u4F5C\u65E5 08:00", value: "0 8 * * 1-5" },
    { label: "\u5DE5\u4F5C\u65E5 20:00", value: "0 20 * * 1-5" },
    { label: "\u6BCF 30 \u5206\u949F", value: "*/30 * * * *" },
    { label: "\u6BCF\u5C0F\u65F6", value: "0 * * * *" },
    { label: "\u6BCF\u5468\u4E00 08:00", value: "0 8 * * 1" },
    { label: "\u6BCF\u6708 1 \u65E5 08:00", value: "0 8 1 * *" }
  ];
  var DEADLINE_PRESETS = [
    { label: "\u4E0D\u914D\u7F6E", value: "" },
    { label: "\u81EA\u5B9A\u4E49", value: "__custom__" },
    { label: "\u6BCF\u5929 09:00", value: "0 9 * * *" },
    { label: "\u6BCF\u5929 21:00", value: "0 21 * * *" },
    { label: "\u6BCF\u5929 23:00", value: "0 23 * * *" },
    { label: "\u5DE5\u4F5C\u65E5 09:00", value: "0 9 * * 1-5" },
    { label: "\u5DE5\u4F5C\u65E5 21:00", value: "0 21 * * 1-5" },
    { label: "\u5DE5\u4F5C\u65E5 23:00", value: "0 23 * * 1-5" }
  ];
  function timeAgo(iso) {
    if (!iso) return "";
    var d5 = Date.now() - new Date(iso).getTime();
    var m6 = Math.floor(d5 / 6e4);
    if (m6 < 1) return "\u521A\u521A";
    if (m6 < 60) return m6 + " \u5206\u949F\u524D";
    var h12 = Math.floor(m6 / 60);
    if (h12 < 24) return h12 + " \u5C0F\u65F6\u524D";
    return Math.floor(h12 / 24) + " \u5929\u524D";
  }
  function formatIso(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  }
  function taskSummary(body) {
    if (!body) return "";
    var text = body;
    if (/^---\r?\n/.test(text)) {
      var end = text.indexOf("\n---\n", 3);
      if (end >= 0) text = text.substring(end + 4);
    }
    var lines = text.split("\n");
    for (var i7 = 0; i7 < lines.length; i7++) {
      var line = lines[i7].trim();
      if (line && !/^<!--/.test(line)) return line.replace(/^#+\s*/, "").trim();
    }
    return "";
  }
  function cronToHuman(cron) {
    if (!cron) return "";
    var parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return cron;
    var min = parts[0], hour = parts[1], dom = parts[2], month = parts[3], dow = parts[4];
    var hasComma = min.indexOf(",") >= 0 || hour.indexOf(",") >= 0 || dom.indexOf(",") >= 0 || dow.indexOf(",") >= 0;
    var hasRange = min.indexOf("-") >= 0 || hour.indexOf("-") >= 0 || dom.indexOf("-") >= 0 || dow.indexOf("-") >= 0;
    if (hasComma || hasRange) return cron;
    if (min === "*" && hour === "*" && dom === "*" && month === "*" && dow === "*") return "\u6BCF\u5206\u949F";
    if (min.indexOf("*/") === 0 && hour === "*" && dom === "*" && month === "*" && dow === "*") return "\u6BCF" + min.slice(2) + "\u5206\u949F";
    if (min === "0" && hour.indexOf("*/") === 0 && dom === "*" && month === "*" && dow === "*") return "\u6BCF" + hour.slice(2) + "\u5C0F\u65F6";
    var time = (hour !== "*" ? hour.padStart(2, "0") : "*") + ":" + (min !== "*" ? min.padStart(2, "0") : "*");
    if (dom === "*" && month === "*" && dow === "*") {
      if (hour === "*") return "\u6BCF\u5C0F\u65F6" + min.padStart(2, "0") + "\u5206";
      if (min === "*") return "\u6BCF\u5929" + hour.padStart(2, "0") + ":00";
      return "\u6BCF\u5929 " + time;
    }
    if (dom === "*" && month === "*" && dow === "1-5") return "\u5DE5\u4F5C\u65E5 " + time;
    var DOW_MAP = { 0: "\u65E5", 1: "\u4E00", 2: "\u4E8C", 3: "\u4E09", 4: "\u56DB", 5: "\u4E94", 6: "\u516D" };
    if (dom === "*" && month === "*" && /^\d$/.test(dow) && DOW_MAP[dow]) return "\u6BCF\u5468" + DOW_MAP[dow] + " " + time;
    if (/^\d+$/.test(dom) && month === "*" && dow === "*") return "\u6BCF\u6708" + parseInt(dom, 10) + "\u65E5 " + time;
    return cron;
  }
  function elapseStr(startedAt) {
    if (!startedAt) return "";
    var ms = Date.now() - new Date(startedAt).getTime();
    var s12 = Math.floor(ms / 1e3);
    if (s12 < 60) return s12 + "s";
    var m6 = Math.floor(s12 / 60);
    if (m6 < 60) return m6 + "m " + s12 % 60 + "s";
    return Math.floor(m6 / 60) + "h " + m6 % 60 + "m";
  }
  function isUnread(task) {
    if (task.status !== "done" && task.status !== "failed" && task.status !== "stopped" && task.status !== "interrupted") return false;
    if (task.archivedAt) return false;
    if (!task.readAt) return true;
    return task.updatedAt > task.readAt;
  }
  var ICONS = {
    search: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>',
    clock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.5"/><polyline points="8 4.5 8 8 11 10"/></svg>',
    repeat: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.5 8a6.5 6.5 0 0 1 11.7-3.5M14.5 8a6.5 6.5 0 0 1-11.7 3.5"/><polyline points="10.5 1.5 13.2 4.5 10.5 7"/><polyline points="5.5 14.5 2.8 11.5 5.5 9"/></svg>',
    play: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5a.5.5 0 0 1 .8-.4l8 5.5a.5.5 0 0 1 0 .8l-8 5.5a.5.5 0 0 1-.8-.4z"/></svg>',
    plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    scan: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1.5a6.5 6.5 0 1 1-4.6 1.9"/><polyline points="5.5 1.5 8 1.5 8 4"/></svg>',
    stop: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="2"/></svg>',
    archive: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3.5h12v2H2z"/><path d="M3 5.5v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7"/><line x1="6" y1="8" x2="10" y2="8"/></svg>',
    restore: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.5 4v4h4"/><path d="M3 8.5a6.5 6.5 0 1 0 1.5-5.5"/></svg>',
    trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12"/><path d="M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4"/><path d="M3.5 4l1 9.5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1l1-9.5"/></svg>',
    edit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11.5 1.5l3 3L5 14l-3.5.5L2 11z"/></svg>',
    external: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2h5v5"/><path d="M14 2L8 8"/><path d="M10 9v3.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1H7"/></svg>',
    inbox: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6v6.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6"/><path d="M1.5 2.5l3.5 4.5h6l3.5-4.5"/><path d="M1.5 2.5h13v3.5H9.5L8 8l-1.5-2H1.5z"/></svg>',
    list: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>'
  };
  function iconHtml(name) {
    return ICONS[name] || "";
  }
  var TASK_TYPE_LABELS = {
    cron: { label: "\u5FAA\u73AF", icon: "repeat" },
    manual: { label: "\u624B\u52A8", icon: "play" }
  };

  // client/src/controller.js
  function countUnread(tasks) {
    return tasks.filter(function(t6) {
      return isUnread(t6);
    }).length;
  }
  function createController(transport) {
    var tasks = [];
    var boardOpen = false;
    var filter = "all";
    var navGroup = "all";
    var showDetail = null;
    var showNewTask = false;
    var showEdit = null;
    var editTaskData = null;
    var showConfig = false;
    var showTemplates = false;
    var loading = true;
    var error = null;
    var revision = 0;
    var config = { maxConcurrent: 1 };
    var metrics = { total: 0, running: 0, pending: 0, done24h: 0, failed24h: 0, successRate: 0 };
    var options = { workspaces: [], presets: [], models: [], isolation: null };
    var optionsStatus = "idle";
    var runtimeHealth = {
      status: "idle",
      connected: false,
      reconnecting: false,
      lastEventAt: null,
      revision: null
    };
    var runtimeObservation = null;
    var sseDisposer = null;
    var disposed = false;
    var prevStatuses = {};
    var TERMINAL = { done: 1, failed: 1, stopped: 1, interrupted: 1 };
    var disposed = false;
    var lifecycle = 0;
    var initPromise = null;
    var listeners = [];
    function notif() {
      for (var i7 = 0; i7 < listeners.length; i7++) listeners[i7]();
    }
    function getSnapshot() {
      var counts = {};
      var activeTasks = tasks.filter(function(t6) {
        return !t6.archivedAt;
      });
      for (var i7 = 0; i7 < activeTasks.length; i7++) {
        var s12 = activeTasks[i7].status;
        counts[s12] = (counts[s12] || 0) + 1;
      }
      var scoped = tasks;
      if (navGroup === "archived") {
        scoped = scoped.filter(function(t6) {
          return !!t6.archivedAt;
        });
      } else {
        scoped = scoped.filter(function(t6) {
          return !t6.archivedAt;
        });
        if (navGroup === "cron") scoped = scoped.filter(function(t6) {
          return !!t6.cron;
        });
        else if (navGroup === "manual") scoped = scoped.filter(function(t6) {
          return !t6.cron;
        });
      }
      var scopeCounts = {};
      for (var s12 = 0; s12 < scoped.length; s12++) scopeCounts[scoped[s12].status] = (scopeCounts[scoped[s12].status] || 0) + 1;
      var filtered = filter === "all" ? scoped : scoped.filter(function(t6) {
        return t6.status === filter;
      });
      var detailTask = showDetail ? tasks.find(function(t6) {
        return t6.key === showDetail;
      }) : null;
      var editTask = showEdit ? editTaskData && editTaskData.key === showEdit ? editTaskData : tasks.find(function(t6) {
        return t6.key === showEdit;
      }) : null;
      return {
        tasks,
        scoped,
        filtered,
        counts,
        scopeCounts,
        scopeMetrics: deriveMetrics(scoped.map(function(task) {
          return Object.assign({}, task, { archivedAt: null });
        })),
        metrics,
        boardOpen,
        filter,
        navGroup,
        showDetail,
        showNewTask,
        showEdit,
        showConfig,
        showTemplates,
        loading,
        error,
        revision,
        config,
        options,
        optionsStatus,
        runtimeHealth,
        runtimeObservation,
        detailTask,
        editTask,
        unreadCount: countUnread(tasks)
      };
    }
    function subscribe(fn) {
      listeners.push(fn);
      return function() {
        listeners = listeners.filter(function(x7) {
          return x7 !== fn;
        });
      };
    }
    function mergeConfig(next) {
      if (next && typeof next === "object") config = Object.assign({}, config, next);
    }
    function deriveMetrics(nextTasks) {
      var visible = (nextTasks || []).filter(function(t6) {
        return !t6.archivedAt;
      });
      var now = Date.now();
      var done24h = visible.filter(function(t6) {
        return t6.status === "done" && t6.updatedAt && now - new Date(t6.updatedAt).getTime() < 864e5;
      }).length;
      var failed24h = visible.filter(function(t6) {
        return t6.status === "failed" && t6.updatedAt && now - new Date(t6.updatedAt).getTime() < 864e5;
      }).length;
      var total24h = done24h + failed24h;
      return {
        total: visible.length,
        running: visible.filter(function(t6) {
          return t6.status === "running";
        }).length,
        pending: visible.filter(function(t6) {
          return t6.status === "pending";
        }).length,
        done24h,
        failed24h,
        successRate: total24h ? Math.round(done24h / total24h * 100) : 0
      };
    }
    function applyState(data, notifyTransitions) {
      var incomingRevision = Number(data.revision);
      if (Number.isFinite(incomingRevision) && incomingRevision < revision) return false;
      var newTasks = data.tasks || [];
      var effectiveConfig = Object.assign({}, config, data.config || {});
      if (notifyTransitions) {
        for (var i7 = 0; i7 < newTasks.length; i7++) {
          var t6 = newTasks[i7];
          var prev = prevStatuses[t6.key];
          var notificationsEnabled = t6.enableNotifications === true || t6.enableNotifications == null && effectiveConfig.enableNotifications === true;
          if (prev !== void 0 && prev !== t6.status && TERMINAL[t6.status] && notificationsEnabled) {
            var label = (STATUS_CONFIG[t6.status] || {}).label || t6.status;
            try {
              if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("autoqueue", { body: t6.key + " \u2192 " + label, tag: t6.key });
            } catch (e7) {
            }
          }
        }
      }
      prevStatuses = {};
      for (var j7 = 0; j7 < newTasks.length; j7++) prevStatuses[newTasks[j7].key] = newTasks[j7].status;
      tasks = newTasks;
      if (Number.isFinite(incomingRevision)) revision = incomingRevision;
      runtimeHealth = Object.assign({}, runtimeHealth, { revision });
      if (data.runtime && typeof data.runtime === "object") runtimeObservation = data.runtime;
      mergeConfig(data.config);
      metrics = Object.assign(deriveMetrics(newTasks), data.metrics || {});
      error = null;
      if (showDetail && !tasks.find(function(t7) {
        return t7.key === showDetail;
      })) {
        showDetail = null;
        error = '\u4EFB\u52A1 "' + showDetail + '" \u5DF2\u88AB\u5220\u9664\u6216\u79FB\u9664';
      }
      if (showEdit && !tasks.find(function(t7) {
        return t7.key === showEdit;
      })) {
        showEdit = null;
        editTaskData = null;
        error = '\u4EFB\u52A1 "' + showEdit + '" \u5DF2\u88AB\u5220\u9664\u6216\u79FB\u9664';
      }
      return true;
    }
    async function loadState() {
      loading = true;
      notif();
      var refreshed = false;
      try {
        var data = await transport.state();
        applyState(data, false);
        refreshed = true;
      } catch (err) {
        error = err.message;
      }
      loading = false;
      notif();
      return refreshed;
    }
    async function loadOptions() {
      optionsStatus = "loading";
      try {
        var loaded = await transport.options();
        options = loaded && typeof loaded === "object" ? loaded : { workspaces: [], presets: [], models: [], isolation: null };
        optionsStatus = "ready";
      } catch (err) {
        optionsStatus = "error";
        error = err.message || "\u9694\u79BB\u7B56\u7565\u8BFB\u53D6\u5931\u8D25";
      }
      notif();
    }
    async function loadConfig() {
      try {
        mergeConfig(await transport.getConfig());
      } catch (err) {
        error = err.message;
      }
    }
    function startSSE() {
      if (disposed || sseDisposer) return;
      runtimeHealth = Object.assign({}, runtimeHealth, { status: "connecting", connected: false, reconnecting: false });
      notif();
      sseDisposer = transport.subscribe(function(data) {
        if (disposed) return;
        if (data && data.revision !== void 0) {
          if (!applyState(data, true)) return;
        } else if (data === null) {
          loadState();
        }
        notif();
      }, function(health) {
        if (disposed) return;
        var previousRevision = Number(runtimeHealth.revision);
        var incomingHealthRevision = Number(health && health.revision);
        runtimeHealth = Object.assign({}, runtimeHealth, health || {});
        if (Number.isFinite(previousRevision) || Number.isFinite(incomingHealthRevision) || Number.isFinite(revision)) {
          runtimeHealth.revision = Math.max(
            Number.isFinite(previousRevision) ? previousRevision : 0,
            Number.isFinite(incomingHealthRevision) ? incomingHealthRevision : 0,
            Number.isFinite(revision) ? revision : 0
          );
        }
        notif();
      });
    }
    function stopSSE() {
      if (sseDisposer) {
        sseDisposer();
        sseDisposer = null;
      }
    }
    async function init() {
      if (disposed) return;
      if (initPromise) return initPromise;
      var token = ++lifecycle;
      initPromise = Promise.all([loadState(), loadOptions(), loadConfig()]).then(function() {
        if (!disposed && token === lifecycle) startSSE();
      });
      return initPromise;
    }
    function openBoard() {
      boardOpen = true;
      filter = "all";
      navGroup = "all";
      notif();
      document.dispatchEvent(new CustomEvent("dsh-panel-activate", { detail: "autoqueue" }));
      init();
    }
    function closeBoard() {
      if (!boardOpen) return;
      boardOpen = false;
      showDetail = null;
      showEdit = null;
      editTaskData = null;
      showNewTask = false;
      showConfig = false;
      showTemplates = false;
      notif();
    }
    function toggleBoard() {
      if (boardOpen) closeBoard();
      else openBoard();
    }
    function setFilter(f11) {
      filter = f11;
      notif();
    }
    function setNavGroup(g3) {
      navGroup = g3;
      notif();
    }
    function openDetail(key) {
      showDetail = key;
      var t6 = tasks.find(function(x7) {
        return x7.key === key;
      });
      if (t6 && isUnread(t6)) markRead(key);
      notif();
    }
    function closeDetail() {
      showDetail = null;
      notif();
    }
    async function openEdit(key) {
      try {
        var detail = await transport.detail(key);
        if (!detail || !detail.ok || !detail.task) throw new Error(detail && detail.error || "\u52A0\u8F7D\u4EFB\u52A1\u8BE6\u60C5\u5931\u8D25");
        showEdit = key;
        editTaskData = detail.task;
        notif();
      } catch (err) {
        error = err.message;
        notif();
      }
    }
    function closeEdit() {
      showEdit = null;
      editTaskData = null;
      notif();
    }
    function openNewTask() {
      showNewTask = true;
      notif();
    }
    function closeNewTask() {
      showNewTask = false;
      notif();
    }
    function openConfig() {
      showConfig = true;
      notif();
    }
    function closeConfig() {
      showConfig = false;
      notif();
    }
    function openTemplates() {
      showTemplates = true;
      notif();
    }
    function closeTemplates() {
      showTemplates = false;
      notif();
    }
    async function createTask(data) {
      try {
        var result = await transport.createTask({
          requestId: crypto.randomUUID ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c11) {
            var r10 = Math.random() * 16 | 0;
            return (c11 === "x" ? r10 : r10 & 3 | 8).toString(16);
          }),
          key: data.key,
          content: data.content,
          priority: data.priority,
          cron: data.cron,
          deadline: data.deadline,
          maxGoalRounds: data.maxGoalRounds,
          maxBlockedResumes: data.maxBlockedResumes,
          timeoutMs: data.timeoutMs,
          maxAttempts: data.maxAttempts,
          webhook: data.webhook,
          autoArchive: data.autoArchive,
          enableNotifications: data.enableNotifications
        });
        if (!result.ok) throw new Error(result.error || "\u521B\u5EFA\u5931\u8D25");
        showNewTask = false;
        error = null;
        var stateRefreshed = await loadState();
        var createdTask = stateRefreshed ? tasks.find(function(task) {
          return task.key === result.key;
        }) : null;
        return Object.assign({}, result, {
          stateRefreshed,
          taskState: createdTask ? { status: createdTask.status, archivedAt: createdTask.archivedAt || null } : null
        });
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    async function markRead(key, read) {
      try {
        var result = await transport.markRead(key, read !== false);
        await loadState();
        return result;
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    async function doAction(kind, key, opts) {
      try {
        var result = await transport.action(kind, key, opts);
        var isBatchArchive = kind === "archive" && opts && Array.isArray(opts.keys) && Array.isArray(result && result.results);
        if (!result.ok && !isBatchArchive) throw new Error(result.error || kind + " \u5931\u8D25");
        error = null;
        await loadState();
        return result;
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    async function updateTask(key, patch) {
      try {
        var result = await transport.action("update", key, patch);
        if (!result.ok) throw new Error(result.error || "\u66F4\u65B0\u5931\u8D25");
        showEdit = null;
        editTaskData = null;
        error = null;
        await loadState();
        return result;
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    async function setConcurrency(n8) {
      try {
        var result = await transport.action("set-concurrency", null, { maxConcurrent: n8 });
        if (!result.ok) throw new Error(result.error || "\u8BBE\u7F6E\u5E76\u53D1\u6570\u5931\u8D25");
        error = null;
        await loadState();
        return result;
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    async function updateConfig(patch) {
      try {
        var result = await transport.setConfig(patch);
        mergeConfig(result);
        error = null;
        await loadState();
        return result;
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    function clearError() {
      error = null;
      notif();
    }
    function dispose() {
      disposed = true;
      lifecycle++;
      stopSSE();
      listeners = [];
      initPromise = null;
    }
    return {
      getSnapshot,
      subscribe,
      init,
      dispose,
      openBoard,
      closeBoard,
      toggleBoard,
      setFilter,
      setNavGroup,
      openDetail,
      closeDetail,
      openEdit,
      closeEdit,
      openNewTask,
      closeNewTask,
      openConfig,
      closeConfig,
      openTemplates,
      closeTemplates,
      createTask,
      doAction,
      updateTask,
      markRead,
      setConcurrency,
      updateConfig,
      clearError,
      loadState
    };
  }

  // node_modules/react-aria/dist/private/utils/domHelpers.mjs
  var $d447af545b77c9f1$export$b204af158042fbac = (target) => {
    if ($d447af545b77c9f1$var$isWindow(target)) return target.document;
    if ($d447af545b77c9f1$export$62858bae88b53fd0(target)) return target;
    return target?.ownerDocument ?? (typeof document !== "undefined" ? document : void 0);
  };
  var $d447af545b77c9f1$export$f21a1ffae260145a = (target) => {
    let ownerDocument = $d447af545b77c9f1$export$b204af158042fbac(target);
    return ownerDocument?.defaultView ?? (typeof window !== "undefined" ? window : void 0);
  };
  function $d447af545b77c9f1$export$8ee0fc9ee280b4ee(value) {
    return value !== null && typeof value === "object" && "nodeType" in value && typeof value.nodeType === "number";
  }
  function $d447af545b77c9f1$var$isWindow(value) {
    return typeof value === "object" && value != null && "window" in value && value.window === value;
  }
  function $d447af545b77c9f1$export$62858bae88b53fd0(value) {
    return $d447af545b77c9f1$export$8ee0fc9ee280b4ee(value) && value.nodeType === 9;
  }
  function $d447af545b77c9f1$export$af51f0f06c0f328a(value) {
    return $d447af545b77c9f1$export$8ee0fc9ee280b4ee(value) && value.nodeType === 11 && "host" in value;
  }
  function $d447af545b77c9f1$export$f531f92e2a15358f(target, event, listener, options) {
    if (listener == null || target == null) return () => {
    };
    let eventTargets = Array.isArray(target) ? target : [
      target
    ];
    for (let eventTarget of eventTargets) eventTarget.addEventListener(event, listener, options);
    return () => {
      for (let eventTarget of eventTargets) eventTarget.removeEventListener(event, listener, options);
    };
  }
  function $d447af545b77c9f1$export$37a5fde709c1db82(target, property, value, priority) {
    if (target == null) return () => {
    };
    let restore = new Array();
    let styleTargets = Array.isArray(target) ? target : [
      target
    ];
    for (let styleTarget of styleTargets) {
      let initialValue = styleTarget.style.getPropertyValue(property);
      let initialPriority = styleTarget.style.getPropertyPriority(property);
      styleTarget.style.setProperty(property, value, priority);
      restore.unshift(() => {
        if (initialValue) styleTarget.style.setProperty(property, initialValue, initialPriority);
        else styleTarget.style.removeProperty(property);
      });
    }
    return () => {
      for (let cleanup of restore) cleanup();
    };
  }

  // node_modules/react-stately/dist/private/flags/flags.mjs
  var $6a20a7989e6c817a$var$_tableNestedRows = false;
  var $6a20a7989e6c817a$var$_shadowDOM = false;
  function $6a20a7989e6c817a$export$d9d8a0f82de49530() {
    $6a20a7989e6c817a$var$_tableNestedRows = true;
  }
  function $6a20a7989e6c817a$export$1b00cb14a96194e6() {
    return $6a20a7989e6c817a$var$_tableNestedRows;
  }
  function $6a20a7989e6c817a$export$12b151d9882e9985() {
    $6a20a7989e6c817a$var$_shadowDOM = true;
  }
  function $6a20a7989e6c817a$export$98658e8c59125e6a() {
    return $6a20a7989e6c817a$var$_shadowDOM;
  }

  // node_modules/react-aria/dist/private/utils/shadowdom/DOMFunctions.mjs
  function $23f2114a1b82827e$export$4282f70798064fe0(node, otherNode) {
    if (!(0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) return otherNode && node ? node.contains(otherNode) : false;
    if (!node || !otherNode) return false;
    let currentNode = otherNode;
    while (currentNode !== null) {
      if (currentNode === node) return true;
      if (typeof currentNode.assignedElements !== "function" && currentNode.assignedSlot?.parentNode)
        currentNode = currentNode.assignedSlot.parentNode;
      else if ((0, $d447af545b77c9f1$export$af51f0f06c0f328a)(currentNode))
        currentNode = currentNode.host;
      else currentNode = currentNode.parentNode;
    }
    return false;
  }
  var $23f2114a1b82827e$export$cd4e5573fbe2b576 = (doc = document) => {
    if (!(0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) return doc.activeElement;
    let activeElement = doc.activeElement;
    while (activeElement && "shadowRoot" in activeElement && activeElement.shadowRoot?.activeElement) activeElement = activeElement.shadowRoot.activeElement;
    return activeElement;
  };
  function $23f2114a1b82827e$export$e58f029f0fbfdb29(event) {
    if ((0, $6a20a7989e6c817a$export$98658e8c59125e6a)() && event.target instanceof Element && event.target.shadowRoot) {
      if ("composedPath" in event) return event.composedPath()[0] ?? null;
      else if ("composedPath" in event.nativeEvent) return event.nativeEvent.composedPath()[0] ?? null;
    }
    return event.target;
  }
  function $23f2114a1b82827e$export$da7af4355d792141(from, to) {
    if (to === null) return [];
    to = to ?? (0, $d447af545b77c9f1$export$f21a1ffae260145a)(from);
    let targets = [
      to
    ];
    if (!(0, $6a20a7989e6c817a$export$98658e8c59125e6a)() || !from || from === to) return targets;
    let toRoot = "getRootNode" in to ? to.getRootNode() : null;
    let current = from.getRootNode() ?? null;
    while ((0, $d447af545b77c9f1$export$af51f0f06c0f328a)(current) && current !== toRoot) {
      targets.push(current);
      current = current.host.getRootNode();
    }
    return targets;
  }
  function $23f2114a1b82827e$export$b4f377a2b6254582(node) {
    if (!node) return false;
    let root = node.getRootNode();
    let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(node);
    if (!(root instanceof ownerWindow.Document || root instanceof ownerWindow.ShadowRoot)) return false;
    let activeElement = root.activeElement;
    return activeElement != null && node.contains(activeElement);
  }

  // node_modules/react-aria/dist/private/utils/shadowdom/ShadowTreeWalker.mjs
  var $654b97e09f2a30c1$export$63eb3ababa9c55c4 = class {
    constructor(doc, root, whatToShow, filter) {
      this._walkerStack = [];
      this._currentSetFor = /* @__PURE__ */ new Set();
      this._acceptNode = (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const shadowRoot2 = node.shadowRoot;
          if (shadowRoot2) {
            const walker = this._doc.createTreeWalker(shadowRoot2, this.whatToShow, {
              acceptNode: this._acceptNode
            });
            this._walkerStack.unshift(walker);
            return NodeFilter.FILTER_ACCEPT;
          } else {
            if (typeof this.filter === "function") return this.filter(node);
            else if (this.filter?.acceptNode) return this.filter.acceptNode(node);
            else if (this.filter === null) return NodeFilter.FILTER_ACCEPT;
          }
        }
        return NodeFilter.FILTER_SKIP;
      };
      this._doc = doc;
      this.root = root;
      this.filter = filter ?? null;
      this.whatToShow = whatToShow ?? NodeFilter.SHOW_ALL;
      this._currentNode = root;
      this._walkerStack.unshift(doc.createTreeWalker(root, whatToShow, this._acceptNode));
      const shadowRoot = root.shadowRoot;
      if (shadowRoot) {
        const walker = this._doc.createTreeWalker(shadowRoot, this.whatToShow, {
          acceptNode: this._acceptNode
        });
        this._walkerStack.unshift(walker);
      }
    }
    get currentNode() {
      return this._currentNode;
    }
    set currentNode(node) {
      if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(this.root, node)) throw new Error("Cannot set currentNode to a node that is not contained by the root node.");
      const walkers = [];
      let curNode = node;
      let currentWalkerCurrentNode = node;
      this._currentNode = node;
      while (curNode && curNode !== this.root) if (curNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        const shadowRoot = curNode;
        const walker2 = this._doc.createTreeWalker(shadowRoot, this.whatToShow, {
          acceptNode: this._acceptNode
        });
        walkers.push(walker2);
        walker2.currentNode = currentWalkerCurrentNode;
        this._currentSetFor.add(walker2);
        curNode = currentWalkerCurrentNode = shadowRoot.host;
      } else curNode = curNode.parentNode;
      const walker = this._doc.createTreeWalker(this.root, this.whatToShow, {
        acceptNode: this._acceptNode
      });
      walkers.push(walker);
      walker.currentNode = currentWalkerCurrentNode;
      this._currentSetFor.add(walker);
      this._walkerStack = walkers;
    }
    get doc() {
      return this._doc;
    }
    firstChild() {
      let currentNode = this.currentNode;
      let newNode = this.nextNode();
      if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(currentNode, newNode)) {
        this.currentNode = currentNode;
        return null;
      }
      if (newNode) this.currentNode = newNode;
      return newNode;
    }
    lastChild() {
      let walker = this._walkerStack[0];
      let newNode = walker.lastChild();
      if (newNode) this.currentNode = newNode;
      return newNode;
    }
    nextNode() {
      const nextNode = this._walkerStack[0].nextNode();
      if (nextNode) {
        const shadowRoot = nextNode.shadowRoot;
        if (shadowRoot) {
          let nodeResult;
          if (typeof this.filter === "function") nodeResult = this.filter(nextNode);
          else if (this.filter?.acceptNode) nodeResult = this.filter.acceptNode(nextNode);
          if (nodeResult === NodeFilter.FILTER_ACCEPT) {
            this.currentNode = nextNode;
            return nextNode;
          }
          let newNode = this.nextNode();
          if (newNode) this.currentNode = newNode;
          return newNode;
        }
        if (nextNode) this.currentNode = nextNode;
        return nextNode;
      } else {
        if (this._walkerStack.length > 1) {
          this._walkerStack.shift();
          let newNode = this.nextNode();
          if (newNode) this.currentNode = newNode;
          return newNode;
        } else return null;
      }
    }
    previousNode() {
      const currentWalker = this._walkerStack[0];
      if (currentWalker.currentNode === currentWalker.root) {
        if (this._currentSetFor.has(currentWalker)) {
          this._currentSetFor.delete(currentWalker);
          if (this._walkerStack.length > 1) {
            this._walkerStack.shift();
            let newNode = this.previousNode();
            if (newNode) this.currentNode = newNode;
            return newNode;
          } else return null;
        }
        return null;
      }
      const previousNode = currentWalker.previousNode();
      if (previousNode) {
        const shadowRoot = previousNode.shadowRoot;
        if (shadowRoot) {
          let nodeResult;
          if (typeof this.filter === "function") nodeResult = this.filter(previousNode);
          else if (this.filter?.acceptNode) nodeResult = this.filter.acceptNode(previousNode);
          if (nodeResult === NodeFilter.FILTER_ACCEPT) {
            if (previousNode) this.currentNode = previousNode;
            return previousNode;
          }
          let newNode = this.lastChild();
          if (newNode) this.currentNode = newNode;
          return newNode;
        }
        if (previousNode) this.currentNode = previousNode;
        return previousNode;
      } else {
        if (this._walkerStack.length > 1) {
          this._walkerStack.shift();
          let newNode = this.previousNode();
          if (newNode) this.currentNode = newNode;
          return newNode;
        } else return null;
      }
    }
    /**
    * @deprecated
    */
    nextSibling() {
      return null;
    }
    /**
    * @deprecated
    */
    previousSibling() {
      return null;
    }
    /**
    * @deprecated
    */
    parentNode() {
      return null;
    }
  };
  function $654b97e09f2a30c1$export$4d0f8be8b12a7ef6(doc, root, whatToShow, filter) {
    if ((0, $6a20a7989e6c817a$export$98658e8c59125e6a)()) return new $654b97e09f2a30c1$export$63eb3ababa9c55c4(doc, root, whatToShow, filter);
    return doc.createTreeWalker(root, whatToShow, filter);
  }

  // node_modules/react-aria/dist/private/utils/focusWithoutScrolling.mjs
  function $1969ac565cfec8d0$export$de79e2c695e052f3(element) {
    if ($1969ac565cfec8d0$var$supportsPreventScroll()) element.focus({
      preventScroll: true
    });
    else {
      let scrollableElements = $1969ac565cfec8d0$var$getScrollableElements(element);
      element.focus();
      $1969ac565cfec8d0$var$restoreScrollPosition(scrollableElements);
    }
  }
  var $1969ac565cfec8d0$var$supportsPreventScrollCached = null;
  function $1969ac565cfec8d0$var$supportsPreventScroll() {
    if ($1969ac565cfec8d0$var$supportsPreventScrollCached == null) {
      $1969ac565cfec8d0$var$supportsPreventScrollCached = false;
      try {
        let focusElem = document.createElement("div");
        focusElem.focus({
          get preventScroll() {
            $1969ac565cfec8d0$var$supportsPreventScrollCached = true;
            return true;
          }
        });
      } catch {
      }
    }
    return $1969ac565cfec8d0$var$supportsPreventScrollCached;
  }
  function $1969ac565cfec8d0$var$getScrollableElements(element) {
    let parent = element.parentNode;
    let scrollableElements = [];
    let rootScrollingElement = document.scrollingElement || document.documentElement;
    while (parent instanceof HTMLElement && parent !== rootScrollingElement) {
      if (parent.offsetHeight < parent.scrollHeight || parent.offsetWidth < parent.scrollWidth) scrollableElements.push({
        element: parent,
        scrollTop: parent.scrollTop,
        scrollLeft: parent.scrollLeft
      });
      parent = parent.parentNode;
    }
    if (rootScrollingElement instanceof HTMLElement) scrollableElements.push({
      element: rootScrollingElement,
      scrollTop: rootScrollingElement.scrollTop,
      scrollLeft: rootScrollingElement.scrollLeft
    });
    return scrollableElements;
  }
  function $1969ac565cfec8d0$var$restoreScrollPosition(scrollableElements) {
    for (let { element, scrollTop, scrollLeft } of scrollableElements) {
      element.scrollTop = scrollTop;
      element.scrollLeft = scrollLeft;
    }
  }

  // node_modules/react-aria/dist/private/utils/isElementVisible.mjs
  var $ae77152785188400$var$supportsCheckVisibility = typeof Element !== "undefined" && "checkVisibility" in Element.prototype;
  function $ae77152785188400$var$isStyleVisible(element) {
    const windowObject = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
    if (!(element instanceof windowObject.HTMLElement) && !(element instanceof windowObject.SVGElement)) return false;
    let { display, visibility } = element.style;
    let isVisible = display !== "none" && visibility !== "hidden" && visibility !== "collapse";
    if (isVisible) {
      const { getComputedStyle } = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
      let { display: computedDisplay, visibility: computedVisibility } = getComputedStyle(element);
      isVisible = computedDisplay !== "none" && computedVisibility !== "hidden" && computedVisibility !== "collapse";
    }
    return isVisible;
  }
  function $ae77152785188400$var$isAttributeVisible(element, childElement) {
    return !element.hasAttribute("hidden") && // Ignore HiddenSelect when tree walking.
    !element.hasAttribute("data-react-aria-prevent-focus") && (element.nodeName === "DETAILS" && childElement && childElement.nodeName !== "SUMMARY" ? element.hasAttribute("open") : true);
  }
  function $ae77152785188400$export$e989c0fffaa6b27a(element, childElement) {
    if ($ae77152785188400$var$supportsCheckVisibility) return element.checkVisibility({
      visibilityProperty: true
    }) && !element.closest("[data-react-aria-prevent-focus]");
    return element.nodeName !== "#comment" && $ae77152785188400$var$isStyleVisible(element) && $ae77152785188400$var$isAttributeVisible(element, childElement) && (!element.parentElement || $ae77152785188400$export$e989c0fffaa6b27a(element.parentElement, element));
  }

  // node_modules/react-aria/dist/private/utils/isFocusable.mjs
  var $3b8b240c1bf84ab9$var$focusableElements = [
    "input:not([disabled]):not([type=hidden])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "button:not([disabled])",
    "a[href]",
    "area[href]",
    "summary",
    "iframe",
    "object",
    "embed",
    "audio[controls]",
    "video[controls]",
    '[contenteditable]:not([contenteditable^="false"])',
    "permission"
  ];
  var $3b8b240c1bf84ab9$var$FOCUSABLE_ELEMENT_SELECTOR = $3b8b240c1bf84ab9$var$focusableElements.join(":not([hidden]),") + ",[tabindex]:not([disabled]):not([hidden])";
  $3b8b240c1bf84ab9$var$focusableElements.push('[tabindex]:not([tabindex="-1"]):not([disabled])');
  var $3b8b240c1bf84ab9$var$TABBABLE_ELEMENT_SELECTOR = $3b8b240c1bf84ab9$var$focusableElements.join(':not([hidden]):not([tabindex="-1"]),');
  function $3b8b240c1bf84ab9$export$4c063cf1350e6fed(element, options) {
    return element.matches($3b8b240c1bf84ab9$var$FOCUSABLE_ELEMENT_SELECTOR) && !$3b8b240c1bf84ab9$var$isInert(element) && (options?.skipVisibilityCheck || (0, $ae77152785188400$export$e989c0fffaa6b27a)(element));
  }
  function $3b8b240c1bf84ab9$export$bebd5a1431fec25d(element) {
    return element.matches($3b8b240c1bf84ab9$var$TABBABLE_ELEMENT_SELECTOR) && (0, $ae77152785188400$export$e989c0fffaa6b27a)(element) && !$3b8b240c1bf84ab9$var$isInert(element);
  }
  function $3b8b240c1bf84ab9$var$isInert(element) {
    let node = element;
    while (node != null) {
      if (node instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(node).HTMLElement && node.inert) return true;
      node = node.parentElement;
    }
    return false;
  }

  // node_modules/react-aria/dist/private/utils/useLayoutEffect.mjs
  init_react_shim();
  var $c4867b2f328c2698$export$e5c5a5f917a5871c = typeof document !== "undefined" ? (0, react_shim_default).useLayoutEffect : () => {
  };

  // node_modules/react-aria/dist/private/interactions/utils.mjs
  init_react_shim();
  function $a92dc41f639950be$export$525bc4921d56d4a(nativeEvent) {
    let event = nativeEvent;
    event.nativeEvent = nativeEvent;
    event.isDefaultPrevented = () => event.defaultPrevented;
    event.isPropagationStopped = () => event.cancelBubble;
    event.persist = () => {
    };
    return event;
  }
  function $a92dc41f639950be$export$c2b7abe5d61ec696(event, target) {
    Object.defineProperty(event, "target", {
      value: target
    });
    Object.defineProperty(event, "currentTarget", {
      value: target
    });
  }
  function $a92dc41f639950be$export$715c682d09d639cc(onBlur) {
    let stateRef = (0, useRef)({
      isFocused: false,
      observer: null
    });
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      const state = stateRef.current;
      return () => {
        if (state.observer) {
          state.observer.disconnect();
          state.observer = null;
        }
      };
    }, []);
    return (0, useCallback)((e7) => {
      let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
      if (eventTarget instanceof HTMLButtonElement || eventTarget instanceof HTMLInputElement || eventTarget instanceof HTMLTextAreaElement || eventTarget instanceof HTMLSelectElement) {
        stateRef.current.isFocused = true;
        let target = eventTarget;
        let onBlurHandler = (e8) => {
          stateRef.current.isFocused = false;
          if (target.disabled) {
            let event = $a92dc41f639950be$export$525bc4921d56d4a(e8);
            onBlur?.(event);
          }
          if (stateRef.current.observer) {
            stateRef.current.observer.disconnect();
            stateRef.current.observer = null;
          }
        };
        target.addEventListener("focusout", onBlurHandler, {
          once: true
        });
        stateRef.current.observer = new MutationObserver(() => {
          if (stateRef.current.isFocused && target.disabled) {
            stateRef.current.observer?.disconnect();
            let relatedTargetEl = target === (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)() ? null : (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
            target.dispatchEvent(new FocusEvent("blur", {
              relatedTarget: relatedTargetEl
            }));
            target.dispatchEvent(new FocusEvent("focusout", {
              bubbles: true,
              relatedTarget: relatedTargetEl
            }));
          }
        });
        stateRef.current.observer.observe(target, {
          attributes: true,
          attributeFilter: [
            "disabled"
          ]
        });
      }
    }, [
      onBlur
    ]);
  }
  var $a92dc41f639950be$export$fda7da73ab5d4c48 = false;
  function $a92dc41f639950be$export$cabe61c495ee3649(target) {
    while (target && !(0, $3b8b240c1bf84ab9$export$4c063cf1350e6fed)(target, {
      skipVisibilityCheck: true
    })) target = target.parentElement;
    let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(target);
    let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerWindow.document);
    if (!activeElement || activeElement === target) return;
    let targetRoot = target?.getRootNode();
    let root = targetRoot != null && (0, $d447af545b77c9f1$export$af51f0f06c0f328a)(targetRoot) ? targetRoot : (0, $d447af545b77c9f1$export$f21a1ffae260145a)(target);
    let isFocusMovingToTarget = (focusTarget) => focusTarget === target || focusTarget != null && (0, $23f2114a1b82827e$export$4282f70798064fe0)(target, focusTarget);
    let isBlurFromActiveElement = (eventTarget) => eventTarget === activeElement || activeElement != null && eventTarget != null && (0, $23f2114a1b82827e$export$4282f70798064fe0)(activeElement, eventTarget);
    $a92dc41f639950be$export$fda7da73ab5d4c48 = true;
    let isRefocusing = false;
    let onBlur = (e7) => {
      if (isBlurFromActiveElement((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7)) || isRefocusing) e7.stopImmediatePropagation();
    };
    let onFocusOut = (e7) => {
      if (isBlurFromActiveElement((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7)) || isRefocusing) {
        e7.stopImmediatePropagation();
        if (!target && !isRefocusing) {
          isRefocusing = true;
          (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(activeElement);
          cleanup();
        }
      }
    };
    let onFocus = (e7) => {
      if (isFocusMovingToTarget((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7)) || isRefocusing) e7.stopImmediatePropagation();
    };
    let onFocusIn = (e7) => {
      if (isFocusMovingToTarget((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7)) || isRefocusing) {
        e7.stopImmediatePropagation();
        if (!isRefocusing) {
          isRefocusing = true;
          (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(activeElement);
          cleanup();
        }
      }
    };
    root.addEventListener("blur", onBlur, true);
    root.addEventListener("focusout", onFocusOut, true);
    root.addEventListener("focusin", onFocusIn, true);
    root.addEventListener("focus", onFocus, true);
    let cleanup = () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("blur", onBlur, true);
      root.removeEventListener("focusout", onFocusOut, true);
      root.removeEventListener("focusin", onFocusIn, true);
      root.removeEventListener("focus", onFocus, true);
      $a92dc41f639950be$export$fda7da73ab5d4c48 = false;
      isRefocusing = false;
    };
    let raf = requestAnimationFrame(cleanup);
    return cleanup;
  }

  // node_modules/react-aria/dist/private/utils/platform.mjs
  function $2add3ce32c6007eb$var$testUserAgent(re2) {
    if (typeof window === "undefined" || window.navigator == null) return false;
    let brands = window.navigator["userAgentData"]?.brands;
    return Array.isArray(brands) && brands.some((brand) => re2.test(brand.brand)) || re2.test(window.navigator.userAgent);
  }
  function $2add3ce32c6007eb$var$testPlatform(re2) {
    return typeof window !== "undefined" && window.navigator != null ? re2.test(window.navigator["userAgentData"]?.platform || window.navigator.platform) : false;
  }
  function $2add3ce32c6007eb$var$cached(fn) {
    if (false) return fn;
    let res = null;
    return () => {
      if (res == null) res = fn();
      return res;
    };
  }
  var $2add3ce32c6007eb$export$9ac100e40613ea10 = $2add3ce32c6007eb$var$cached(function() {
    return $2add3ce32c6007eb$var$testPlatform(/^Mac/i);
  });
  var $2add3ce32c6007eb$export$186c6964ca17d99 = $2add3ce32c6007eb$var$cached(function() {
    return $2add3ce32c6007eb$var$testPlatform(/^iPhone/i);
  });
  var $2add3ce32c6007eb$export$7bef049ce92e4224 = $2add3ce32c6007eb$var$cached(function() {
    return $2add3ce32c6007eb$var$testPlatform(/^iPad/i) || // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
    $2add3ce32c6007eb$export$9ac100e40613ea10() && navigator.maxTouchPoints > 1;
  });
  var $2add3ce32c6007eb$export$fedb369cb70207f1 = $2add3ce32c6007eb$var$cached(function() {
    return $2add3ce32c6007eb$export$186c6964ca17d99() || $2add3ce32c6007eb$export$7bef049ce92e4224();
  });
  var $2add3ce32c6007eb$export$e1865c3bedcd822b = $2add3ce32c6007eb$var$cached(function() {
    return $2add3ce32c6007eb$export$9ac100e40613ea10() || $2add3ce32c6007eb$export$fedb369cb70207f1();
  });
  var $2add3ce32c6007eb$export$78551043582a6a98 = $2add3ce32c6007eb$var$cached(function() {
    return $2add3ce32c6007eb$var$testUserAgent(/AppleWebKit/i) && ($2add3ce32c6007eb$export$fedb369cb70207f1() || !$2add3ce32c6007eb$export$6446a186d09e379e());
  });
  var $2add3ce32c6007eb$export$95df08bae54cb4df = $2add3ce32c6007eb$var$cached(function() {
    return $2add3ce32c6007eb$export$78551043582a6a98() && !$2add3ce32c6007eb$export$6446a186d09e379e() && !$2add3ce32c6007eb$export$b7d78993b74f766d();
  });
  var $2add3ce32c6007eb$export$6446a186d09e379e = $2add3ce32c6007eb$var$cached(function() {
    return $2add3ce32c6007eb$var$testUserAgent(/Chrome|CriOS|CrMo/i);
  });
  var $2add3ce32c6007eb$export$a11b0059900ceec8 = $2add3ce32c6007eb$var$cached(function() {
    return $2add3ce32c6007eb$var$testUserAgent(/Android/i);
  });
  var $2add3ce32c6007eb$export$b7d78993b74f766d = $2add3ce32c6007eb$var$cached(function() {
    return $2add3ce32c6007eb$var$testUserAgent(/(Firefox|FxiOS)/i);
  });

  // node_modules/react-aria/dist/private/utils/isVirtualEvent.mjs
  function $b5c62b033c25b96d$export$60278871457622de(event) {
    if (event.pointerType === "" && event.isTrusted) return true;
    if ((0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && event.pointerType) return event.type === "click" && event.buttons === 1;
    return event.detail === 0 && !event.pointerType;
  }
  function $b5c62b033c25b96d$export$29bf1b5f2c56cf63(event) {
    return !(0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && event.width === 0 && event.height === 0 || (0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && event.width === 1 && event.height === 1 && event.pressure === 0 && event.detail === 0 && event.pointerType === "mouse";
  }

  // node_modules/react-aria/dist/private/utils/openLink.mjs
  init_react_shim();
  var $caaf0dd3060ed57c$var$RouterContext = /* @__PURE__ */ (0, createContext)({
    isNative: true,
    open: $caaf0dd3060ed57c$var$openSyntheticLink,
    useHref: (href) => href
  });
  function $caaf0dd3060ed57c$export$323e4fc2fa4753fb(props) {
    let { children, navigate, useHref } = props;
    let ctx = (0, useMemo)(() => ({
      isNative: false,
      open: (target, modifiers, href, routerOptions) => {
        $caaf0dd3060ed57c$var$getSyntheticLink(target, (link) => {
          if ($caaf0dd3060ed57c$export$efa8c9099e530235(link, modifiers)) navigate(href, routerOptions);
          else $caaf0dd3060ed57c$export$95185d699e05d4d7(link, modifiers);
        });
      },
      useHref: useHref || ((href) => href)
    }), [
      navigate,
      useHref
    ]);
    return /* @__PURE__ */ (0, react_shim_default).createElement($caaf0dd3060ed57c$var$RouterContext.Provider, {
      value: ctx
    }, children);
  }
  function $caaf0dd3060ed57c$export$9a302a45f65d0572() {
    return (0, useContext)($caaf0dd3060ed57c$var$RouterContext);
  }
  function $caaf0dd3060ed57c$export$efa8c9099e530235(link, modifiers) {
    let target = link.getAttribute("target");
    return (!target || target === "_self") && link.origin === location.origin && !link.hasAttribute("download") && !modifiers.metaKey && // open in new tab (mac)
    !modifiers.ctrlKey && // open in new tab (windows)
    !modifiers.altKey && // download
    !modifiers.shiftKey;
  }
  function $caaf0dd3060ed57c$export$95185d699e05d4d7(target, modifiers, setOpening = true) {
    let { metaKey, ctrlKey, altKey, shiftKey } = modifiers;
    if (!(0, $2add3ce32c6007eb$export$78551043582a6a98)() && (0, $2add3ce32c6007eb$export$b7d78993b74f766d)() && window.event?.type?.startsWith("key") && target.target === "_blank") {
      if ((0, $2add3ce32c6007eb$export$9ac100e40613ea10)()) metaKey = true;
      else ctrlKey = true;
    }
    let event = (0, $2add3ce32c6007eb$export$78551043582a6a98)() && (0, $2add3ce32c6007eb$export$9ac100e40613ea10)() && !(0, $2add3ce32c6007eb$export$7bef049ce92e4224)() && true ? new KeyboardEvent("keydown", {
      keyIdentifier: "Enter",
      metaKey,
      ctrlKey,
      altKey,
      shiftKey
    }) : new MouseEvent("click", {
      metaKey,
      ctrlKey,
      altKey,
      shiftKey,
      detail: 1,
      bubbles: true,
      cancelable: true
    });
    $caaf0dd3060ed57c$export$95185d699e05d4d7.isOpening = setOpening;
    (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(target);
    target.dispatchEvent(event);
    $caaf0dd3060ed57c$export$95185d699e05d4d7.isOpening = false;
  }
  $caaf0dd3060ed57c$export$95185d699e05d4d7.isOpening = false;
  function $caaf0dd3060ed57c$var$getSyntheticLink(target, open) {
    if (target instanceof HTMLAnchorElement) open(target);
    else if (target.hasAttribute("data-href")) {
      let link = document.createElement("a");
      link.href = target.getAttribute("data-href");
      if (target.hasAttribute("data-target")) link.target = target.getAttribute("data-target");
      if (target.hasAttribute("data-rel")) link.rel = target.getAttribute("data-rel");
      if (target.hasAttribute("data-download")) link.download = target.getAttribute("data-download");
      if (target.hasAttribute("data-ping")) link.ping = target.getAttribute("data-ping");
      if (target.hasAttribute("data-referrer-policy")) link.referrerPolicy = target.getAttribute("data-referrer-policy");
      target.appendChild(link);
      open(link);
      target.removeChild(link);
    }
  }
  function $caaf0dd3060ed57c$var$openSyntheticLink(target, modifiers) {
    $caaf0dd3060ed57c$var$getSyntheticLink(target, (link) => $caaf0dd3060ed57c$export$95185d699e05d4d7(link, modifiers));
  }
  function $caaf0dd3060ed57c$export$bdc77b0c0a3a85d6(props) {
    let router = $caaf0dd3060ed57c$export$9a302a45f65d0572();
    const href = router.useHref(props.href ?? "");
    return {
      "data-href": props.href ? href : void 0,
      "data-target": props.target,
      "data-rel": props.rel,
      "data-download": props.download,
      "data-ping": props.ping,
      "data-referrer-policy": props.referrerPolicy
    };
  }
  function $caaf0dd3060ed57c$export$51437d503373d223(props) {
    return {
      "data-href": props.href,
      "data-target": props.target,
      "data-rel": props.rel,
      "data-download": props.download,
      "data-ping": props.ping,
      "data-referrer-policy": props.referrerPolicy
    };
  }
  function $caaf0dd3060ed57c$export$7e924b3091a3bd18(props) {
    let router = $caaf0dd3060ed57c$export$9a302a45f65d0572();
    const href = router.useHref(props?.href ?? "");
    let linkProps = {};
    if (props) {
      for (let key of [
        "href",
        "target",
        "rel",
        "download",
        "ping",
        "referrerPolicy"
      ]) if (key in props && props[key] !== void 0) linkProps[key] = key === "href" ? href : props[key];
    }
    return linkProps;
  }
  function $caaf0dd3060ed57c$export$13aea1a3cb5e3f1f(e7, router, href, routerOptions) {
    if (!router.isNative && e7.currentTarget instanceof HTMLAnchorElement && e7.currentTarget.href && // If props are applied to a router Link component, it may have already prevented default.
    !e7.isDefaultPrevented() && $caaf0dd3060ed57c$export$efa8c9099e530235(e7.currentTarget, e7) && href) {
      e7.preventDefault();
      router.open(e7.currentTarget, e7, href, routerOptions);
    }
  }

  // node_modules/react-aria/dist/private/ssr/SSRProvider.mjs
  init_react_shim();
  var $c7eafbbe1ea5834e$var$defaultContext = {
    prefix: String(Math.round(Math.random() * 1e10)),
    current: 0
  };
  var $c7eafbbe1ea5834e$var$SSRContext = /* @__PURE__ */ (0, react_shim_default).createContext($c7eafbbe1ea5834e$var$defaultContext);
  var $c7eafbbe1ea5834e$var$IsSSRContext = /* @__PURE__ */ (0, react_shim_default).createContext(false);
  function $c7eafbbe1ea5834e$var$LegacySSRProvider(props) {
    let cur = (0, useContext)($c7eafbbe1ea5834e$var$SSRContext);
    let counter = $c7eafbbe1ea5834e$var$useCounter(cur === $c7eafbbe1ea5834e$var$defaultContext);
    let [isSSR, setIsSSR] = (0, useState)(true);
    let value = (0, useMemo)(() => ({
      // If this is the first SSRProvider, start with an empty string prefix, otherwise
      // append and increment the counter.
      prefix: cur === $c7eafbbe1ea5834e$var$defaultContext ? "" : `${cur.prefix}-${counter}`,
      current: 0
    }), [
      cur,
      counter
    ]);
    if (typeof document !== "undefined")
      (0, useLayoutEffect)(() => {
        setIsSSR(false);
      }, []);
    return /* @__PURE__ */ (0, react_shim_default).createElement($c7eafbbe1ea5834e$var$SSRContext.Provider, {
      value
    }, /* @__PURE__ */ (0, react_shim_default).createElement($c7eafbbe1ea5834e$var$IsSSRContext.Provider, {
      value: isSSR
    }, props.children));
  }
  var $c7eafbbe1ea5834e$var$warnedAboutSSRProvider = false;
  function $c7eafbbe1ea5834e$export$9f8ac96af4b1b2ae(props) {
    if (typeof (0, react_shim_default)["useId"] === "function") {
      if (!$c7eafbbe1ea5834e$var$warnedAboutSSRProvider) {
        console.warn("In React 18, SSRProvider is not necessary and is a noop. You can remove it from your app.");
        $c7eafbbe1ea5834e$var$warnedAboutSSRProvider = true;
      }
      return /* @__PURE__ */ (0, react_shim_default).createElement((0, react_shim_default).Fragment, null, props.children);
    }
    return /* @__PURE__ */ (0, react_shim_default).createElement($c7eafbbe1ea5834e$var$LegacySSRProvider, props);
  }
  var $c7eafbbe1ea5834e$var$canUseDOM = Boolean(typeof window !== "undefined" && window.document && window.document.createElement);
  var $c7eafbbe1ea5834e$var$componentIds = /* @__PURE__ */ new WeakMap();
  function $c7eafbbe1ea5834e$var$useCounter(isDisabled = false) {
    let ctx = (0, useContext)($c7eafbbe1ea5834e$var$SSRContext);
    let ref = (0, useRef)(null);
    if (ref.current === null && !isDisabled) {
      let currentOwner = (
        // @ts-ignore
        (0, react_shim_default).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentOwner?.current
      );
      if (currentOwner) {
        let prevComponentValue = $c7eafbbe1ea5834e$var$componentIds.get(currentOwner);
        if (prevComponentValue == null)
          $c7eafbbe1ea5834e$var$componentIds.set(currentOwner, {
            id: ctx.current,
            state: currentOwner.memoizedState
          });
        else if (currentOwner.memoizedState !== prevComponentValue.state) {
          ctx.current = prevComponentValue.id;
          $c7eafbbe1ea5834e$var$componentIds.delete(currentOwner);
        }
      }
      ref.current = ++ctx.current;
    }
    return ref.current;
  }
  function $c7eafbbe1ea5834e$var$useLegacySSRSafeId(defaultId) {
    let ctx = (0, useContext)($c7eafbbe1ea5834e$var$SSRContext);
    if (ctx === $c7eafbbe1ea5834e$var$defaultContext && !$c7eafbbe1ea5834e$var$canUseDOM && true) console.warn("When server rendering, you must wrap your application in an <SSRProvider> to ensure consistent ids are generated between the client and server.");
    let counter = $c7eafbbe1ea5834e$var$useCounter(!!defaultId);
    let prefix = ctx === $c7eafbbe1ea5834e$var$defaultContext && false ? "react-aria" : `react-aria${ctx.prefix}`;
    return defaultId || `${prefix}-${counter}`;
  }
  function $c7eafbbe1ea5834e$var$useModernSSRSafeId(defaultId) {
    let id = (0, react_shim_default).useId();
    let [didSSR] = (0, useState)($c7eafbbe1ea5834e$export$535bd6ca7f90a273());
    let prefix = didSSR || false ? "react-aria" : `react-aria${$c7eafbbe1ea5834e$var$defaultContext.prefix}`;
    return defaultId || `${prefix}-${id}`;
  }
  var $c7eafbbe1ea5834e$export$619500959fc48b26 = typeof (0, react_shim_default)["useId"] === "function" ? $c7eafbbe1ea5834e$var$useModernSSRSafeId : $c7eafbbe1ea5834e$var$useLegacySSRSafeId;
  function $c7eafbbe1ea5834e$var$getSnapshot() {
    return false;
  }
  function $c7eafbbe1ea5834e$var$getServerSnapshot() {
    return true;
  }
  function $c7eafbbe1ea5834e$var$subscribe(onStoreChange) {
    return () => {
    };
  }
  function $c7eafbbe1ea5834e$export$535bd6ca7f90a273() {
    if (typeof (0, react_shim_default)["useSyncExternalStore"] === "function")
      return (0, react_shim_default)["useSyncExternalStore"]($c7eafbbe1ea5834e$var$subscribe, $c7eafbbe1ea5834e$var$getSnapshot, $c7eafbbe1ea5834e$var$getServerSnapshot);
    return (0, useContext)($c7eafbbe1ea5834e$var$IsSSRContext);
  }

  // node_modules/react-aria/dist/private/interactions/useFocusVisible.mjs
  init_react_shim();
  var $8f5a2122b0992be3$var$currentModality = null;
  var $8f5a2122b0992be3$var$currentPointerType = "keyboard";
  var $8f5a2122b0992be3$export$901e90a13c50a14e = /* @__PURE__ */ new Set();
  var $8f5a2122b0992be3$export$d90243b58daecda7 = /* @__PURE__ */ new Map();
  var $8f5a2122b0992be3$var$hasEventBeforeFocus = false;
  var $8f5a2122b0992be3$var$hasBlurredWindowRecently = false;
  var $8f5a2122b0992be3$var$FOCUS_VISIBLE_INPUT_KEYS = {
    Tab: true,
    Escape: true
  };
  function $8f5a2122b0992be3$var$triggerChangeHandlers(modality, e7) {
    for (let handler of $8f5a2122b0992be3$export$901e90a13c50a14e) handler(modality, e7);
  }
  function $8f5a2122b0992be3$var$isValidKey(e7) {
    return !(e7.metaKey || !(0, $2add3ce32c6007eb$export$9ac100e40613ea10)() && e7.altKey || e7.ctrlKey || e7.key === "Control" || e7.key === "Shift" || e7.key === "Meta");
  }
  function $8f5a2122b0992be3$var$handleKeyboardEvent(e7) {
    $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
    if (!(0, $caaf0dd3060ed57c$export$95185d699e05d4d7).isOpening && $8f5a2122b0992be3$var$isValidKey(e7)) {
      $8f5a2122b0992be3$var$currentModality = "keyboard";
      $8f5a2122b0992be3$var$currentPointerType = "keyboard";
      $8f5a2122b0992be3$var$triggerChangeHandlers("keyboard", e7);
    }
  }
  function $8f5a2122b0992be3$var$handlePointerEvent(e7) {
    $8f5a2122b0992be3$var$currentModality = "pointer";
    $8f5a2122b0992be3$var$currentPointerType = "pointerType" in e7 ? e7.pointerType : "mouse";
    if (e7.type === "mousedown" || e7.type === "pointerdown") {
      $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
      $8f5a2122b0992be3$var$triggerChangeHandlers("pointer", e7);
    }
  }
  function $8f5a2122b0992be3$var$handleClickEvent(e7) {
    if (!(0, $caaf0dd3060ed57c$export$95185d699e05d4d7).isOpening && (0, $b5c62b033c25b96d$export$60278871457622de)(e7)) {
      $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
      $8f5a2122b0992be3$var$currentModality = "virtual";
      $8f5a2122b0992be3$var$currentPointerType = "virtual";
    }
  }
  function $8f5a2122b0992be3$var$handleFocusEvent(e7) {
    if (0, $a92dc41f639950be$export$fda7da73ab5d4c48) return;
    let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
    let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(target);
    let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(target);
    if (target === ownerWindow) {
      $8f5a2122b0992be3$var$hasBlurredWindowRecently = true;
      return;
    }
    if (target === ownerDocument || !e7.isTrusted) return;
    if (!$8f5a2122b0992be3$var$hasEventBeforeFocus && !$8f5a2122b0992be3$var$hasBlurredWindowRecently) {
      $8f5a2122b0992be3$var$currentModality = "virtual";
      $8f5a2122b0992be3$var$currentPointerType = "virtual";
      $8f5a2122b0992be3$var$triggerChangeHandlers("virtual", e7);
    }
    $8f5a2122b0992be3$var$hasEventBeforeFocus = false;
    $8f5a2122b0992be3$var$hasBlurredWindowRecently = false;
  }
  function $8f5a2122b0992be3$var$handleWindowBlur() {
    if (0, $a92dc41f639950be$export$fda7da73ab5d4c48) return;
    $8f5a2122b0992be3$var$hasEventBeforeFocus = false;
    $8f5a2122b0992be3$var$hasBlurredWindowRecently = true;
  }
  function $8f5a2122b0992be3$var$setupGlobalFocusEvents(element) {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const windowObject = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
    const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
    if ($8f5a2122b0992be3$export$d90243b58daecda7.get(windowObject)) return;
    let focus = windowObject.HTMLElement.prototype.focus;
    Reflect.defineProperty(windowObject.HTMLElement.prototype, "focus", {
      configurable: true,
      writable: true,
      value: function() {
        $8f5a2122b0992be3$var$hasEventBeforeFocus = true;
        focus.apply(this, arguments);
      }
    });
    documentObject.addEventListener("keydown", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
    documentObject.addEventListener("keyup", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
    documentObject.addEventListener("click", $8f5a2122b0992be3$var$handleClickEvent, true);
    windowObject.addEventListener("focus", $8f5a2122b0992be3$var$handleFocusEvent, true);
    windowObject.addEventListener("blur", $8f5a2122b0992be3$var$handleWindowBlur, false);
    if (typeof PointerEvent !== "undefined") {
      documentObject.addEventListener("pointerdown", $8f5a2122b0992be3$var$handlePointerEvent, true);
      documentObject.addEventListener("pointermove", $8f5a2122b0992be3$var$handlePointerEvent, true);
      documentObject.addEventListener("pointerup", $8f5a2122b0992be3$var$handlePointerEvent, true);
    } else if (false) {
      documentObject.addEventListener("mousedown", $8f5a2122b0992be3$var$handlePointerEvent, true);
      documentObject.addEventListener("mousemove", $8f5a2122b0992be3$var$handlePointerEvent, true);
      documentObject.addEventListener("mouseup", $8f5a2122b0992be3$var$handlePointerEvent, true);
    }
    windowObject.addEventListener("beforeunload", () => {
      $8f5a2122b0992be3$var$tearDownWindowFocusTracking(element);
    }, {
      once: true
    });
    $8f5a2122b0992be3$export$d90243b58daecda7.set(windowObject, {
      focus
    });
  }
  var $8f5a2122b0992be3$var$tearDownWindowFocusTracking = (element, loadListener) => {
    const windowObject = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
    const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
    if (loadListener) documentObject.removeEventListener("DOMContentLoaded", loadListener);
    if (!$8f5a2122b0992be3$export$d90243b58daecda7.has(windowObject)) return;
    Reflect.defineProperty(windowObject.HTMLElement.prototype, "focus", {
      configurable: true,
      writable: true,
      value: $8f5a2122b0992be3$export$d90243b58daecda7.get(windowObject).focus
    });
    documentObject.removeEventListener("keydown", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
    documentObject.removeEventListener("keyup", $8f5a2122b0992be3$var$handleKeyboardEvent, true);
    documentObject.removeEventListener("click", $8f5a2122b0992be3$var$handleClickEvent, true);
    windowObject.removeEventListener("focus", $8f5a2122b0992be3$var$handleFocusEvent, true);
    windowObject.removeEventListener("blur", $8f5a2122b0992be3$var$handleWindowBlur, false);
    if (typeof PointerEvent !== "undefined") {
      documentObject.removeEventListener("pointerdown", $8f5a2122b0992be3$var$handlePointerEvent, true);
      documentObject.removeEventListener("pointermove", $8f5a2122b0992be3$var$handlePointerEvent, true);
      documentObject.removeEventListener("pointerup", $8f5a2122b0992be3$var$handlePointerEvent, true);
    } else if (false) {
      documentObject.removeEventListener("mousedown", $8f5a2122b0992be3$var$handlePointerEvent, true);
      documentObject.removeEventListener("mousemove", $8f5a2122b0992be3$var$handlePointerEvent, true);
      documentObject.removeEventListener("mouseup", $8f5a2122b0992be3$var$handlePointerEvent, true);
    }
    $8f5a2122b0992be3$export$d90243b58daecda7.delete(windowObject);
  };
  function $8f5a2122b0992be3$export$2f1888112f558a7d(element) {
    const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
    let loadListener;
    if (documentObject.readyState !== "loading") $8f5a2122b0992be3$var$setupGlobalFocusEvents(element);
    else {
      loadListener = () => {
        $8f5a2122b0992be3$var$setupGlobalFocusEvents(element);
      };
      documentObject.addEventListener("DOMContentLoaded", loadListener);
    }
    return () => $8f5a2122b0992be3$var$tearDownWindowFocusTracking(element, loadListener);
  }
  if (typeof document !== "undefined") $8f5a2122b0992be3$export$2f1888112f558a7d();
  function $8f5a2122b0992be3$export$b9b3dfddab17db27() {
    return $8f5a2122b0992be3$var$currentModality !== "pointer";
  }
  function $8f5a2122b0992be3$export$630ff653c5ada6a9() {
    return $8f5a2122b0992be3$var$currentModality;
  }
  function $8f5a2122b0992be3$export$8397ddfc504fdb9a(modality) {
    $8f5a2122b0992be3$var$currentModality = modality;
    $8f5a2122b0992be3$var$currentPointerType = modality === "pointer" ? "mouse" : modality;
    $8f5a2122b0992be3$var$triggerChangeHandlers(modality, null);
  }
  function $8f5a2122b0992be3$export$887a228355cf7d95() {
    return $8f5a2122b0992be3$var$currentPointerType;
  }
  function $8f5a2122b0992be3$export$98e20ec92f614cfe() {
    $8f5a2122b0992be3$var$setupGlobalFocusEvents();
    let [modality, setModality] = (0, useState)($8f5a2122b0992be3$var$currentModality);
    (0, useEffect)(() => {
      let handler = () => {
        setModality($8f5a2122b0992be3$var$currentModality);
      };
      $8f5a2122b0992be3$export$901e90a13c50a14e.add(handler);
      return () => {
        $8f5a2122b0992be3$export$901e90a13c50a14e.delete(handler);
      };
    }, []);
    return (0, $c7eafbbe1ea5834e$export$535bd6ca7f90a273)() ? null : modality;
  }
  var $8f5a2122b0992be3$var$nonTextInputTypes = /* @__PURE__ */ new Set([
    "checkbox",
    "radio",
    "range",
    "color",
    "file",
    "image",
    "button",
    "submit",
    "reset"
  ]);
  function $8f5a2122b0992be3$var$isKeyboardFocusEvent(isTextInput, modality, e7) {
    let eventTarget = e7 ? (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7) : void 0;
    let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(eventTarget);
    let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(eventTarget);
    const IHTMLInputElement = typeof ownerWindow !== "undefined" ? ownerWindow.HTMLInputElement : HTMLInputElement;
    const IHTMLTextAreaElement = typeof ownerWindow !== "undefined" ? ownerWindow.HTMLTextAreaElement : HTMLTextAreaElement;
    const IHTMLElement = typeof ownerWindow !== "undefined" ? ownerWindow.HTMLElement : HTMLElement;
    const IKeyboardEvent = typeof ownerWindow !== "undefined" ? ownerWindow.KeyboardEvent : KeyboardEvent;
    let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
    isTextInput = isTextInput || activeElement instanceof IHTMLInputElement && !$8f5a2122b0992be3$var$nonTextInputTypes.has(activeElement.type) || activeElement instanceof IHTMLTextAreaElement || activeElement instanceof IHTMLElement && activeElement.isContentEditable;
    return !(isTextInput && modality === "keyboard" && e7 instanceof IKeyboardEvent && !$8f5a2122b0992be3$var$FOCUS_VISIBLE_INPUT_KEYS[e7.key]);
  }
  function $8f5a2122b0992be3$export$ffd9e5021c1fb2d6(props = {}) {
    let { isTextInput, autoFocus } = props;
    let [isFocusVisibleState, setFocusVisible] = (0, useState)(autoFocus || $8f5a2122b0992be3$export$b9b3dfddab17db27());
    $8f5a2122b0992be3$export$ec71b4b83ac08ec3((isFocusVisible) => {
      setFocusVisible(isFocusVisible);
    }, [
      isTextInput
    ], {
      isTextInput
    });
    return {
      isFocusVisible: isFocusVisibleState
    };
  }
  function $8f5a2122b0992be3$export$ec71b4b83ac08ec3(fn, deps, opts) {
    $8f5a2122b0992be3$var$setupGlobalFocusEvents();
    (0, useEffect)(() => {
      if (opts?.enabled === false) return;
      let handler = (modality, e7) => {
        if (!$8f5a2122b0992be3$var$isKeyboardFocusEvent(!!opts?.isTextInput, modality, e7)) return;
        fn($8f5a2122b0992be3$export$b9b3dfddab17db27());
      };
      $8f5a2122b0992be3$export$901e90a13c50a14e.add(handler);
      return () => {
        $8f5a2122b0992be3$export$901e90a13c50a14e.delete(handler);
      };
    }, deps);
  }

  // node_modules/react-aria/dist/private/utils/runAfterTransition.mjs
  var $081cb5757e08788e$var$transitionsByElement = /* @__PURE__ */ new Map();
  var $081cb5757e08788e$var$transitionCallbacks = /* @__PURE__ */ new Set();
  function $081cb5757e08788e$var$setupGlobalEvents() {
    if (typeof window === "undefined") return;
    function isTransitionEvent(event) {
      return "propertyName" in event;
    }
    let onTransitionStart = (e7) => {
      let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
      if (!isTransitionEvent(e7) || !eventTarget) return;
      let transitions = $081cb5757e08788e$var$transitionsByElement.get(eventTarget);
      if (!transitions) {
        transitions = /* @__PURE__ */ new Set();
        $081cb5757e08788e$var$transitionsByElement.set(eventTarget, transitions);
        eventTarget.addEventListener("transitioncancel", onTransitionEnd, {
          once: true
        });
      }
      transitions.add(e7.propertyName);
    };
    let onTransitionEnd = (e7) => {
      let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
      if (!isTransitionEvent(e7) || !eventTarget) return;
      let properties = $081cb5757e08788e$var$transitionsByElement.get(eventTarget);
      if (!properties) return;
      properties.delete(e7.propertyName);
      if (properties.size === 0) {
        eventTarget.removeEventListener("transitioncancel", onTransitionEnd);
        $081cb5757e08788e$var$transitionsByElement.delete(eventTarget);
      }
      if ($081cb5757e08788e$var$transitionsByElement.size === 0) {
        for (let cb of $081cb5757e08788e$var$transitionCallbacks) cb();
        $081cb5757e08788e$var$transitionCallbacks.clear();
      }
    };
    document.body.addEventListener("transitionrun", onTransitionStart);
    document.body.addEventListener("transitionend", onTransitionEnd);
  }
  if (typeof document !== "undefined") {
    if (document.readyState !== "loading") $081cb5757e08788e$var$setupGlobalEvents();
    else document.addEventListener("DOMContentLoaded", $081cb5757e08788e$var$setupGlobalEvents);
  }
  function $081cb5757e08788e$var$cleanupDetachedElements() {
    for (const [eventTarget] of $081cb5757e08788e$var$transitionsByElement)
      if ("isConnected" in eventTarget && !eventTarget.isConnected) $081cb5757e08788e$var$transitionsByElement.delete(eventTarget);
  }
  function $081cb5757e08788e$export$24490316f764c430(fn) {
    requestAnimationFrame(() => {
      $081cb5757e08788e$var$cleanupDetachedElements();
      if ($081cb5757e08788e$var$transitionsByElement.size === 0) fn();
      else $081cb5757e08788e$var$transitionCallbacks.add(fn);
    });
  }

  // node_modules/react-aria/dist/private/interactions/focusSafely.mjs
  function $f192c2f16961cbe0$export$80f3e147d781571c(element) {
    if (!element.isConnected) return;
    const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
    if ((0, $8f5a2122b0992be3$export$630ff653c5ada6a9)() === "virtual") {
      let lastFocusedElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
      (0, $081cb5757e08788e$export$24490316f764c430)(() => {
        const activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
        if ((activeElement === lastFocusedElement || activeElement === ownerDocument.body) && element.isConnected) (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(element);
      });
    } else (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(element);
  }

  // node_modules/react-aria/dist/private/focus/FocusScope.mjs
  init_react_shim();
  var $535772f9d2c1f38d$var$FocusContext = /* @__PURE__ */ (0, react_shim_default).createContext(null);
  var $535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT = "react-aria-focus-scope-restore";
  var $535772f9d2c1f38d$var$activeScope = null;
  function $535772f9d2c1f38d$export$20e40289641fbbb6(props) {
    let { children, contain, restoreFocus, autoFocus } = props;
    let startRef = (0, useRef)(null);
    let endRef = (0, useRef)(null);
    let scopeRef = (0, useRef)([]);
    let { parentNode } = (0, useContext)($535772f9d2c1f38d$var$FocusContext) || {};
    let node = (0, useMemo)(() => new $535772f9d2c1f38d$var$TreeNode({
      scopeRef
    }), [
      scopeRef
    ]);
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      let parent = parentNode || $535772f9d2c1f38d$export$d06fae2ee68b101e.root;
      if ($535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(parent.scopeRef) && $535772f9d2c1f38d$var$activeScope && !$535772f9d2c1f38d$var$isAncestorScope($535772f9d2c1f38d$var$activeScope, parent.scopeRef)) {
        let activeNode = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode($535772f9d2c1f38d$var$activeScope);
        if (activeNode) parent = activeNode;
      }
      parent.addChild(node);
      $535772f9d2c1f38d$export$d06fae2ee68b101e.addNode(node);
    }, [
      node,
      parentNode
    ]);
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      let node2 = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
      if (node2) node2.contain = !!contain;
    }, [
      contain
    ]);
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      let node2 = startRef.current?.nextSibling;
      let nodes = [];
      let stopPropagation = (e7) => e7.stopPropagation();
      while (node2 && node2 !== endRef.current) {
        nodes.push(node2);
        node2.addEventListener($535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT, stopPropagation);
        node2 = node2.nextSibling;
      }
      scopeRef.current = nodes;
      return () => {
        for (let node3 of nodes) node3.removeEventListener($535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT, stopPropagation);
      };
    }, [
      children
    ]);
    $535772f9d2c1f38d$var$useActiveScopeTracker(scopeRef, restoreFocus, contain);
    $535772f9d2c1f38d$var$useFocusContainment(scopeRef, contain);
    $535772f9d2c1f38d$var$useRestoreFocus(scopeRef, restoreFocus, contain);
    $535772f9d2c1f38d$var$useAutoFocus(scopeRef, autoFocus);
    (0, useEffect)(() => {
      const activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0));
      let scope = null;
      if ($535772f9d2c1f38d$var$isElementInScope(activeElement, scopeRef.current)) {
        for (let node2 of $535772f9d2c1f38d$export$d06fae2ee68b101e.traverse()) if (node2.scopeRef && $535772f9d2c1f38d$var$isElementInScope(activeElement, node2.scopeRef.current)) scope = node2;
        if (scope === $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef)) $535772f9d2c1f38d$var$activeScope = scope.scopeRef;
      }
    }, [
      scopeRef
    ]);
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      return () => {
        let parentScope = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef)?.parent?.scopeRef ?? null;
        if ((scopeRef === $535772f9d2c1f38d$var$activeScope || $535772f9d2c1f38d$var$isAncestorScope(scopeRef, $535772f9d2c1f38d$var$activeScope)) && (!parentScope || $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(parentScope))) $535772f9d2c1f38d$var$activeScope = parentScope;
        $535772f9d2c1f38d$export$d06fae2ee68b101e.removeTreeNode(scopeRef);
      };
    }, [
      scopeRef
    ]);
    let focusManager = (0, useMemo)(() => $535772f9d2c1f38d$var$createFocusManagerForScope(scopeRef), []);
    let value = (0, useMemo)(() => ({
      focusManager,
      parentNode: node
    }), [
      node,
      focusManager
    ]);
    return /* @__PURE__ */ (0, react_shim_default).createElement($535772f9d2c1f38d$var$FocusContext.Provider, {
      value
    }, /* @__PURE__ */ (0, react_shim_default).createElement("span", {
      "data-focus-scope-start": true,
      hidden: true,
      ref: startRef
    }), children, /* @__PURE__ */ (0, react_shim_default).createElement("span", {
      "data-focus-scope-end": true,
      hidden: true,
      ref: endRef
    }));
  }
  function $535772f9d2c1f38d$export$10c5169755ce7bd7() {
    return (0, useContext)($535772f9d2c1f38d$var$FocusContext)?.focusManager;
  }
  function $535772f9d2c1f38d$var$createFocusManagerForScope(scopeRef) {
    return {
      focusNext(opts = {}) {
        let scope = scopeRef.current;
        let { from, tabbable, wrap, accept } = opts;
        let node = from || (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)(scope[0] ?? void 0));
        let sentinel = scope[0].previousElementSibling;
        let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
        let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
          tabbable,
          accept
        }, scope);
        walker.currentNode = $535772f9d2c1f38d$var$isElementInScope(node, scope) ? node : sentinel;
        let nextNode = walker.nextNode();
        if (!nextNode && wrap) {
          walker.currentNode = sentinel;
          nextNode = walker.nextNode();
        }
        if (nextNode) $535772f9d2c1f38d$var$focusElement(nextNode, true);
        return nextNode;
      },
      focusPrevious(opts = {}) {
        let scope = scopeRef.current;
        let { from, tabbable, wrap, accept } = opts;
        let node = from || (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)(scope[0] ?? void 0));
        let sentinel = scope[scope.length - 1].nextElementSibling;
        let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
        let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
          tabbable,
          accept
        }, scope);
        walker.currentNode = $535772f9d2c1f38d$var$isElementInScope(node, scope) ? node : sentinel;
        let previousNode = walker.previousNode();
        if (!previousNode && wrap) {
          walker.currentNode = sentinel;
          previousNode = walker.previousNode();
        }
        if (previousNode) $535772f9d2c1f38d$var$focusElement(previousNode, true);
        return previousNode;
      },
      focusFirst(opts = {}) {
        let scope = scopeRef.current;
        let { tabbable, accept } = opts;
        let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
        let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
          tabbable,
          accept
        }, scope);
        walker.currentNode = scope[0].previousElementSibling;
        let nextNode = walker.nextNode();
        if (nextNode) $535772f9d2c1f38d$var$focusElement(nextNode, true);
        return nextNode;
      },
      focusLast(opts = {}) {
        let scope = scopeRef.current;
        let { tabbable, accept } = opts;
        let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
        let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
          tabbable,
          accept
        }, scope);
        walker.currentNode = scope[scope.length - 1].nextElementSibling;
        let previousNode = walker.previousNode();
        if (previousNode) $535772f9d2c1f38d$var$focusElement(previousNode, true);
        return previousNode;
      }
    };
  }
  function $535772f9d2c1f38d$var$getScopeRoot(scope) {
    return scope[0].parentElement;
  }
  function $535772f9d2c1f38d$var$shouldContainFocus(scopeRef) {
    let scope = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode($535772f9d2c1f38d$var$activeScope);
    while (scope && scope.scopeRef !== scopeRef) {
      if (scope.contain) return false;
      scope = scope.parent;
    }
    return true;
  }
  function $535772f9d2c1f38d$var$getRadiosInGroup(element) {
    if (!element.form)
      return Array.from((0, $d447af545b77c9f1$export$b204af158042fbac)(element).querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`)).filter((radio) => !radio.form);
    const radioList = element.form.elements.namedItem(element.name);
    let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element);
    if (radioList instanceof ownerWindow.RadioNodeList) return Array.from(radioList).filter((el) => el instanceof ownerWindow.HTMLInputElement);
    if (radioList instanceof ownerWindow.HTMLInputElement) return [
      radioList
    ];
    return [];
  }
  function $535772f9d2c1f38d$var$isTabbableRadio(element) {
    if (element.checked) return true;
    const radios = $535772f9d2c1f38d$var$getRadiosInGroup(element);
    return radios.length > 0 && !radios.some((radio) => radio.checked);
  }
  function $535772f9d2c1f38d$var$useFocusContainment(scopeRef, contain) {
    let focusedNode = (0, useRef)(void 0);
    let raf = (0, useRef)(void 0);
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      let scope = scopeRef.current;
      if (!contain) {
        if (raf.current) {
          cancelAnimationFrame(raf.current);
          raf.current = void 0;
        }
        return;
      }
      const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scope ? scope[0] : void 0);
      let onKeyDown = (e7) => {
        if (e7.key !== "Tab" || e7.altKey || e7.ctrlKey || e7.metaKey || !$535772f9d2c1f38d$var$shouldContainFocus(scopeRef) || e7.isComposing) return;
        let focusedElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
        let scope2 = scopeRef.current;
        if (!scope2 || !$535772f9d2c1f38d$var$isElementInScope(focusedElement, scope2)) return;
        let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope2);
        let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
          tabbable: true
        }, scope2);
        if (!focusedElement) return;
        walker.currentNode = focusedElement;
        let nextElement = e7.shiftKey ? walker.previousNode() : walker.nextNode();
        if (!nextElement) {
          walker.currentNode = e7.shiftKey ? scope2[scope2.length - 1].nextElementSibling : scope2[0].previousElementSibling;
          nextElement = e7.shiftKey ? walker.previousNode() : walker.nextNode();
        }
        e7.preventDefault();
        if (nextElement) {
          $535772f9d2c1f38d$var$focusElement(nextElement, true);
          if (nextElement instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(nextElement).HTMLInputElement) nextElement.select();
        }
      };
      let onFocus = (e7) => {
        if ((!$535772f9d2c1f38d$var$activeScope || $535772f9d2c1f38d$var$isAncestorScope($535772f9d2c1f38d$var$activeScope, scopeRef)) && $535772f9d2c1f38d$var$isElementInScope((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7), scopeRef.current)) {
          $535772f9d2c1f38d$var$activeScope = scopeRef;
          focusedNode.current = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
        } else if ($535772f9d2c1f38d$var$shouldContainFocus(scopeRef) && !$535772f9d2c1f38d$var$isElementInChildScope((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7), scopeRef)) {
          if (focusedNode.current) $535772f9d2c1f38d$var$focusElement(focusedNode.current);
          else if ($535772f9d2c1f38d$var$activeScope && $535772f9d2c1f38d$var$activeScope.current) $535772f9d2c1f38d$var$focusFirstInScope($535772f9d2c1f38d$var$activeScope.current);
        } else if ($535772f9d2c1f38d$var$shouldContainFocus(scopeRef)) focusedNode.current = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
      };
      let onBlur = (e7) => {
        if (raf.current) cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(() => {
          let modality = (0, $8f5a2122b0992be3$export$630ff653c5ada6a9)();
          let shouldSkipFocusRestore = (modality === "virtual" || modality === null) && (0, $2add3ce32c6007eb$export$a11b0059900ceec8)() && (0, $2add3ce32c6007eb$export$6446a186d09e379e)();
          let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
          if (!shouldSkipFocusRestore && activeElement && $535772f9d2c1f38d$var$shouldContainFocus(scopeRef) && !$535772f9d2c1f38d$var$isElementInChildScope(activeElement, scopeRef)) {
            $535772f9d2c1f38d$var$activeScope = scopeRef;
            let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
            if (target && target.isConnected) {
              focusedNode.current = target;
              $535772f9d2c1f38d$var$focusElement(focusedNode.current);
            } else if ($535772f9d2c1f38d$var$activeScope.current) $535772f9d2c1f38d$var$focusFirstInScope($535772f9d2c1f38d$var$activeScope.current);
          }
        });
      };
      ownerDocument.addEventListener("keydown", onKeyDown, false);
      ownerDocument.addEventListener("focusin", onFocus, false);
      scope?.forEach((element) => element.addEventListener("focusin", onFocus, false));
      scope?.forEach((element) => element.addEventListener("focusout", onBlur, false));
      return () => {
        ownerDocument.removeEventListener("keydown", onKeyDown, false);
        ownerDocument.removeEventListener("focusin", onFocus, false);
        scope?.forEach((element) => element.removeEventListener("focusin", onFocus, false));
        scope?.forEach((element) => element.removeEventListener("focusout", onBlur, false));
      };
    }, [
      scopeRef,
      contain
    ]);
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      return () => {
        if (raf.current) cancelAnimationFrame(raf.current);
      };
    }, [
      raf
    ]);
  }
  function $535772f9d2c1f38d$var$isElementInAnyScope(element) {
    return $535772f9d2c1f38d$var$isElementInChildScope(element);
  }
  function $535772f9d2c1f38d$var$isElementInScope(element, scope) {
    if (!element) return false;
    if (!scope) return false;
    return scope.some((node) => (0, $23f2114a1b82827e$export$4282f70798064fe0)(node, element));
  }
  function $535772f9d2c1f38d$var$isElementInChildScope(element, scope = null) {
    if (element instanceof Element && element.closest("[data-react-aria-top-layer]")) return true;
    for (let { scopeRef: s12 } of $535772f9d2c1f38d$export$d06fae2ee68b101e.traverse($535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scope))) {
      if (s12 && $535772f9d2c1f38d$var$isElementInScope(element, s12.current)) return true;
    }
    return false;
  }
  function $535772f9d2c1f38d$export$1258395f99bf9cbf(element) {
    return $535772f9d2c1f38d$var$isElementInChildScope(element, $535772f9d2c1f38d$var$activeScope);
  }
  function $535772f9d2c1f38d$var$isAncestorScope(ancestor, scope) {
    let parent = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scope)?.parent;
    while (parent) {
      if (parent.scopeRef === ancestor) return true;
      parent = parent.parent;
    }
    return false;
  }
  function $535772f9d2c1f38d$var$focusElement(element, scroll = false) {
    if (element != null && !scroll) try {
      (0, $f192c2f16961cbe0$export$80f3e147d781571c)(element);
    } catch {
    }
    else if (element != null) try {
      element.focus();
    } catch {
    }
  }
  function $535772f9d2c1f38d$var$getFirstInScope(scope, tabbable = true) {
    let sentinel = scope[0].previousElementSibling;
    let scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
    let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
      tabbable
    }, scope);
    walker.currentNode = sentinel;
    let nextNode = walker.nextNode();
    if (tabbable && !nextNode) {
      scopeRoot = $535772f9d2c1f38d$var$getScopeRoot(scope);
      walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(scopeRoot, {
        tabbable: false
      }, scope);
      walker.currentNode = sentinel;
      nextNode = walker.nextNode();
    }
    return nextNode;
  }
  function $535772f9d2c1f38d$var$focusFirstInScope(scope, tabbable = true) {
    $535772f9d2c1f38d$var$focusElement($535772f9d2c1f38d$var$getFirstInScope(scope, tabbable));
  }
  function $535772f9d2c1f38d$var$useAutoFocus(scopeRef, autoFocus) {
    const autoFocusRef = (0, react_shim_default).useRef(autoFocus);
    (0, useEffect)(() => {
      if (autoFocusRef.current) {
        $535772f9d2c1f38d$var$activeScope = scopeRef;
        const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0);
        if (!$535772f9d2c1f38d$var$isElementInScope((0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument), $535772f9d2c1f38d$var$activeScope.current) && scopeRef.current) $535772f9d2c1f38d$var$focusFirstInScope(scopeRef.current);
      }
      autoFocusRef.current = false;
    }, [
      scopeRef
    ]);
  }
  function $535772f9d2c1f38d$var$useActiveScopeTracker(scopeRef, restore, contain) {
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      if (restore || contain) return;
      let scope = scopeRef.current;
      const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scope ? scope[0] : void 0);
      let onFocus = (e7) => {
        let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
        if ($535772f9d2c1f38d$var$isElementInScope(target, scopeRef.current)) $535772f9d2c1f38d$var$activeScope = scopeRef;
        else if (!$535772f9d2c1f38d$var$isElementInAnyScope(target)) $535772f9d2c1f38d$var$activeScope = null;
      };
      ownerDocument.addEventListener("focusin", onFocus, false);
      scope?.forEach((element) => element.addEventListener("focusin", onFocus, false));
      return () => {
        ownerDocument.removeEventListener("focusin", onFocus, false);
        scope?.forEach((element) => element.removeEventListener("focusin", onFocus, false));
      };
    }, [
      scopeRef,
      restore,
      contain
    ]);
  }
  function $535772f9d2c1f38d$var$shouldRestoreFocus(scopeRef) {
    let scope = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode($535772f9d2c1f38d$var$activeScope);
    while (scope && scope.scopeRef !== scopeRef) {
      if (scope.nodeToRestore) return false;
      scope = scope.parent;
    }
    return scope?.scopeRef === scopeRef;
  }
  function $535772f9d2c1f38d$var$useRestoreFocus(scopeRef, restoreFocus, contain) {
    const nodeToRestoreRef = (0, useRef)(typeof document !== "undefined" ? (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(
      // oxlint-disable-next-line react/react-compiler
      (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0)
    ) : null);
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      let scope = scopeRef.current;
      const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scope ? scope[0] : void 0);
      if (!restoreFocus || contain) return;
      let onFocus = () => {
        if ((!$535772f9d2c1f38d$var$activeScope || $535772f9d2c1f38d$var$isAncestorScope($535772f9d2c1f38d$var$activeScope, scopeRef)) && $535772f9d2c1f38d$var$isElementInScope((0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument), scopeRef.current)) $535772f9d2c1f38d$var$activeScope = scopeRef;
      };
      ownerDocument.addEventListener("focusin", onFocus, false);
      scope?.forEach((element) => element.addEventListener("focusin", onFocus, false));
      return () => {
        ownerDocument.removeEventListener("focusin", onFocus, false);
        scope?.forEach((element) => element.removeEventListener("focusin", onFocus, false));
      };
    }, [
      scopeRef,
      contain
    ]);
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0);
      if (!restoreFocus) return;
      let onKeyDown = (e7) => {
        if (e7.key !== "Tab" || e7.altKey || e7.ctrlKey || e7.metaKey || !$535772f9d2c1f38d$var$shouldContainFocus(scopeRef) || e7.isComposing) return;
        let focusedElement = ownerDocument.activeElement;
        if (!$535772f9d2c1f38d$var$isElementInChildScope(focusedElement, scopeRef) || !$535772f9d2c1f38d$var$shouldRestoreFocus(scopeRef)) return;
        let treeNode = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
        if (!treeNode) return;
        let nodeToRestore = treeNode.nodeToRestore;
        let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(ownerDocument.body, {
          tabbable: true
        });
        walker.currentNode = focusedElement;
        let nextElement = e7.shiftKey ? walker.previousNode() : walker.nextNode();
        if (!nodeToRestore || !nodeToRestore.isConnected || nodeToRestore === ownerDocument.body) {
          nodeToRestore = void 0;
          treeNode.nodeToRestore = void 0;
        }
        if ((!nextElement || !$535772f9d2c1f38d$var$isElementInChildScope(nextElement, scopeRef)) && nodeToRestore) {
          walker.currentNode = nodeToRestore;
          do
            nextElement = e7.shiftKey ? walker.previousNode() : walker.nextNode();
          while ($535772f9d2c1f38d$var$isElementInChildScope(nextElement, scopeRef));
          e7.preventDefault();
          e7.stopPropagation();
          if (nextElement) $535772f9d2c1f38d$var$focusElement(nextElement, true);
          else if (!$535772f9d2c1f38d$var$isElementInAnyScope(nodeToRestore)) focusedElement.blur();
          else $535772f9d2c1f38d$var$focusElement(nodeToRestore, true);
        }
      };
      if (!contain) ownerDocument.addEventListener("keydown", onKeyDown, true);
      return () => {
        if (!contain) ownerDocument.removeEventListener("keydown", onKeyDown, true);
      };
    }, [
      scopeRef,
      restoreFocus,
      contain
    ]);
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(scopeRef.current ? scopeRef.current[0] : void 0);
      if (!restoreFocus) return;
      let treeNode = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
      if (!treeNode) return;
      treeNode.nodeToRestore = nodeToRestoreRef.current ?? void 0;
      return () => {
        let treeNode2 = $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(scopeRef);
        if (!treeNode2) return;
        let nodeToRestore = treeNode2.nodeToRestore;
        let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
        if (restoreFocus && nodeToRestore && (activeElement && $535772f9d2c1f38d$var$isElementInChildScope(activeElement, scopeRef) || activeElement === ownerDocument.body && $535772f9d2c1f38d$var$shouldRestoreFocus(scopeRef))) {
          let clonedTree = $535772f9d2c1f38d$export$d06fae2ee68b101e.clone();
          requestAnimationFrame(() => {
            if (ownerDocument.activeElement === ownerDocument.body) {
              let treeNode3 = clonedTree.getTreeNode(scopeRef);
              while (treeNode3) {
                if (treeNode3.nodeToRestore && treeNode3.nodeToRestore.isConnected) {
                  $535772f9d2c1f38d$var$restoreFocusToElement(treeNode3.nodeToRestore);
                  return;
                }
                treeNode3 = treeNode3.parent;
              }
              treeNode3 = clonedTree.getTreeNode(scopeRef);
              while (treeNode3) {
                if (treeNode3.scopeRef && // TODO: this is probably a false positive based on naming, it's not a real ref, rename.
                // oxlint-disable-next-line react-hooks/exhaustive-deps
                treeNode3.scopeRef.current && $535772f9d2c1f38d$export$d06fae2ee68b101e.getTreeNode(treeNode3.scopeRef)) {
                  let node = $535772f9d2c1f38d$var$getFirstInScope(treeNode3.scopeRef.current, true);
                  if (node) {
                    $535772f9d2c1f38d$var$restoreFocusToElement(node);
                    return;
                  }
                }
                treeNode3 = treeNode3.parent;
              }
            }
          });
        }
      };
    }, [
      scopeRef,
      restoreFocus
    ]);
  }
  function $535772f9d2c1f38d$var$restoreFocusToElement(node) {
    if (node.dispatchEvent(new CustomEvent($535772f9d2c1f38d$var$RESTORE_FOCUS_EVENT, {
      bubbles: true,
      cancelable: true
    }))) $535772f9d2c1f38d$var$focusElement(node);
  }
  function $535772f9d2c1f38d$export$2d6ec8fc375ceafa(root, opts, scope) {
    let filter = opts?.tabbable ? (0, $3b8b240c1bf84ab9$export$bebd5a1431fec25d) : (0, $3b8b240c1bf84ab9$export$4c063cf1350e6fed);
    let rootElement = root?.nodeType === Node.ELEMENT_NODE ? root : null;
    let doc = (0, $d447af545b77c9f1$export$b204af158042fbac)(rootElement);
    let walker = (0, $654b97e09f2a30c1$export$4d0f8be8b12a7ef6)(doc, root || doc, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if ((0, $23f2114a1b82827e$export$4282f70798064fe0)(opts?.from, node)) return NodeFilter.FILTER_REJECT;
        if (opts?.tabbable && node.tagName === "INPUT" && node.getAttribute("type") === "radio") {
          if (!$535772f9d2c1f38d$var$isTabbableRadio(node)) return NodeFilter.FILTER_REJECT;
          if (walker.currentNode.tagName === "INPUT" && walker.currentNode.type === "radio" && walker.currentNode.name === node.name) return NodeFilter.FILTER_REJECT;
        }
        if (filter(node) && (!scope || $535772f9d2c1f38d$var$isElementInScope(node, scope)) && (!opts?.accept || opts.accept(node))) return NodeFilter.FILTER_ACCEPT;
        return NodeFilter.FILTER_SKIP;
      }
    });
    if (opts?.from) walker.currentNode = opts.from;
    return walker;
  }
  function $535772f9d2c1f38d$export$c5251b9e124bf29(ref, defaultOptions = {}) {
    return {
      focusNext(opts = {}) {
        let root = ref.current;
        if (!root) return null;
        let { from, tabbable = defaultOptions.tabbable, wrap = defaultOptions.wrap, accept = defaultOptions.accept } = opts;
        let node = from || (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)(root));
        let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(root, {
          tabbable,
          accept
        });
        if ((0, $23f2114a1b82827e$export$4282f70798064fe0)(root, node)) walker.currentNode = node;
        let nextNode = walker.nextNode();
        if (!nextNode && wrap) {
          walker.currentNode = root;
          nextNode = walker.nextNode();
        }
        if (nextNode) $535772f9d2c1f38d$var$focusElement(nextNode, true);
        return nextNode;
      },
      focusPrevious(opts = defaultOptions) {
        let root = ref.current;
        if (!root) return null;
        let { from, tabbable = defaultOptions.tabbable, wrap = defaultOptions.wrap, accept = defaultOptions.accept } = opts;
        let node = from || (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)((0, $d447af545b77c9f1$export$b204af158042fbac)(root));
        let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(root, {
          tabbable,
          accept
        });
        if ((0, $23f2114a1b82827e$export$4282f70798064fe0)(root, node)) walker.currentNode = node;
        else {
          let next = $535772f9d2c1f38d$var$last(walker);
          if (next) $535772f9d2c1f38d$var$focusElement(next, true);
          return next ?? null;
        }
        let previousNode = walker.previousNode();
        if (!previousNode && wrap) {
          walker.currentNode = root;
          let lastNode = $535772f9d2c1f38d$var$last(walker);
          if (!lastNode)
            return null;
          previousNode = lastNode;
        }
        if (previousNode) $535772f9d2c1f38d$var$focusElement(previousNode, true);
        return previousNode ?? null;
      },
      focusFirst(opts = defaultOptions) {
        let root = ref.current;
        if (!root) return null;
        let { tabbable = defaultOptions.tabbable, accept = defaultOptions.accept } = opts;
        let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(root, {
          tabbable,
          accept
        });
        let nextNode = walker.nextNode();
        if (nextNode) $535772f9d2c1f38d$var$focusElement(nextNode, true);
        return nextNode;
      },
      focusLast(opts = defaultOptions) {
        let root = ref.current;
        if (!root) return null;
        let { tabbable = defaultOptions.tabbable, accept = defaultOptions.accept } = opts;
        let walker = $535772f9d2c1f38d$export$2d6ec8fc375ceafa(root, {
          tabbable,
          accept
        });
        let next = $535772f9d2c1f38d$var$last(walker);
        if (next) $535772f9d2c1f38d$var$focusElement(next, true);
        return next ?? null;
      }
    };
  }
  function $535772f9d2c1f38d$var$last(walker) {
    let next = void 0;
    let last;
    do {
      last = walker.lastChild();
      if (last) next = last;
    } while (last);
    return next;
  }
  var $535772f9d2c1f38d$var$Tree = class _$535772f9d2c1f38d$var$Tree {
    constructor() {
      this.fastMap = /* @__PURE__ */ new Map();
      this.root = new $535772f9d2c1f38d$var$TreeNode({
        scopeRef: null
      });
      this.fastMap.set(null, this.root);
    }
    get size() {
      return this.fastMap.size;
    }
    getTreeNode(data) {
      return this.fastMap.get(data);
    }
    addTreeNode(scopeRef, parent, nodeToRestore) {
      let parentNode = this.fastMap.get(parent ?? null);
      if (!parentNode) return;
      let node = new $535772f9d2c1f38d$var$TreeNode({
        scopeRef
      });
      parentNode.addChild(node);
      node.parent = parentNode;
      this.fastMap.set(scopeRef, node);
      if (nodeToRestore) node.nodeToRestore = nodeToRestore;
    }
    addNode(node) {
      this.fastMap.set(node.scopeRef, node);
    }
    removeTreeNode(scopeRef) {
      if (scopeRef === null) return;
      let node = this.fastMap.get(scopeRef);
      if (!node) return;
      let parentNode = node.parent;
      for (let current of this.traverse()) if (current !== node && node.nodeToRestore && current.nodeToRestore && node.scopeRef && node.scopeRef.current && $535772f9d2c1f38d$var$isElementInScope(current.nodeToRestore, node.scopeRef.current)) current.nodeToRestore = node.nodeToRestore;
      let children = node.children;
      if (parentNode) {
        parentNode.removeChild(node);
        if (children.size > 0) children.forEach((child) => parentNode && parentNode.addChild(child));
      }
      this.fastMap.delete(node.scopeRef);
    }
    // Pre Order Depth First
    *traverse(node = this.root) {
      if (node.scopeRef != null) yield node;
      if (node.children.size > 0) for (let child of node.children) yield* this.traverse(child);
    }
    clone() {
      let newTree = new _$535772f9d2c1f38d$var$Tree();
      for (let node of this.traverse()) newTree.addTreeNode(node.scopeRef, node.parent?.scopeRef ?? null, node.nodeToRestore);
      return newTree;
    }
  };
  var $535772f9d2c1f38d$var$TreeNode = class {
    constructor(props) {
      this.children = /* @__PURE__ */ new Set();
      this.contain = false;
      this.scopeRef = props.scopeRef;
    }
    addChild(node) {
      this.children.add(node);
      node.parent = this;
    }
    removeChild(node) {
      this.children.delete(node);
      node.parent = void 0;
    }
  };
  var $535772f9d2c1f38d$export$d06fae2ee68b101e = new $535772f9d2c1f38d$var$Tree();

  // node_modules/react-aria/dist/private/utils/chain.mjs
  function $a4e76a5424781910$export$e08e3b67e392101e(...callbacks) {
    return (...args) => {
      for (let callback of callbacks) if (typeof callback === "function") callback(...args);
    };
  }

  // node_modules/react-aria/dist/private/utils/useValueEffect.mjs
  init_react_shim();
  function $1a716630a9e3a599$export$14d238f342723f25(defaultValue) {
    let [value, setValue] = (0, useState)(defaultValue);
    let currValue = (0, useRef)(value);
    let effect = (0, useRef)(null);
    let nextRef = (0, useRef)(() => {
      if (!effect.current) return;
      let newValue = effect.current.next();
      if (newValue.done) {
        effect.current = null;
        return;
      }
      if (currValue.current === newValue.value) nextRef.current();
      else setValue(newValue.value);
    });
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      currValue.current = value;
      if (effect.current) nextRef.current();
    });
    let queue = (0, useCallback)((fn) => {
      effect.current = fn(currValue.current);
      nextRef.current();
    }, [
      nextRef
    ]);
    return [
      value,
      queue
    ];
  }

  // node_modules/react-aria/dist/private/utils/useId.mjs
  init_react_shim();
  var $390e54f620492c70$var$canUseDOM = Boolean(typeof window !== "undefined" && window.document && window.document.createElement);
  var $390e54f620492c70$export$d41a04c74483c6ef = /* @__PURE__ */ new Map();
  var $390e54f620492c70$var$registry;
  if (typeof FinalizationRegistry !== "undefined") $390e54f620492c70$var$registry = new FinalizationRegistry((heldValue) => {
    $390e54f620492c70$export$d41a04c74483c6ef.delete(heldValue);
  });
  var $390e54f620492c70$var$registeredIds = /* @__PURE__ */ new WeakMap();
  function $390e54f620492c70$export$f680877a34711e37(defaultId) {
    let [value, setValue] = (0, useState)(defaultId);
    let nextId = (0, useRef)(null);
    let res = (0, $c7eafbbe1ea5834e$export$619500959fc48b26)(value);
    let cleanupRef = (0, useRef)(null);
    let registeredId = $390e54f620492c70$var$registeredIds.get(cleanupRef);
    if ($390e54f620492c70$var$registry && registeredId !== res) {
      if (registeredId != null)
        $390e54f620492c70$var$registry.unregister(cleanupRef);
      $390e54f620492c70$var$registry.register(cleanupRef, res, cleanupRef);
      $390e54f620492c70$var$registeredIds.set(cleanupRef, res);
    }
    if ($390e54f620492c70$var$canUseDOM) {
      const cacheIdRef = $390e54f620492c70$export$d41a04c74483c6ef.get(res);
      if (cacheIdRef && !cacheIdRef.includes(nextId))
        cacheIdRef.push(nextId);
      else
        $390e54f620492c70$export$d41a04c74483c6ef.set(res, [
          nextId
        ]);
    }
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      let r10 = res;
      return () => {
        if ($390e54f620492c70$var$registry) {
          $390e54f620492c70$var$registry.unregister(cleanupRef);
          $390e54f620492c70$var$registeredIds.delete(cleanupRef);
        }
        $390e54f620492c70$export$d41a04c74483c6ef.delete(r10);
      };
    }, [
      res
    ]);
    (0, useEffect)(() => {
      let newId = nextId.current;
      if (newId) setValue(newId);
      return () => {
        if (newId) nextId.current = null;
      };
    });
    return res;
  }
  function $390e54f620492c70$export$cd8c9cb68f842629(idA, idB) {
    if (idA === idB) return idA;
    let setIdsA = $390e54f620492c70$export$d41a04c74483c6ef.get(idA);
    if (setIdsA) {
      setIdsA.forEach((ref) => ref.current = idB);
      return idB;
    }
    let setIdsB = $390e54f620492c70$export$d41a04c74483c6ef.get(idB);
    if (setIdsB) {
      setIdsB.forEach((ref) => ref.current = idA);
      return idA;
    }
    return idB;
  }
  function $390e54f620492c70$export$b4cc09c592e8fdb8(depArray = []) {
    let id = $390e54f620492c70$export$f680877a34711e37();
    let [resolvedId, setResolvedId] = (0, $1a716630a9e3a599$export$14d238f342723f25)(id);
    let updateId = (0, useCallback)(() => {
      setResolvedId(function* () {
        yield id;
        yield document.getElementById(id) ? id : void 0;
      });
    }, [
      id,
      setResolvedId
    ]);
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(updateId, [
      id,
      updateId,
      ...depArray
    ]);
    return resolvedId;
  }

  // node_modules/react-aria/dist/private/utils/mergeRefs.mjs
  function $4064df0d6f9620e1$export$c9058316764c140e(...refs) {
    if (refs.length === 1 && refs[0]) return refs[0];
    return (value) => {
      let hasCleanup = false;
      const cleanups = refs.map((ref) => {
        const cleanup = $4064df0d6f9620e1$var$setRef(ref, value);
        hasCleanup ||= typeof cleanup == "function";
        return cleanup;
      });
      if (hasCleanup) return () => {
        cleanups.forEach((cleanup, i7) => {
          if (typeof cleanup === "function") cleanup();
          else $4064df0d6f9620e1$var$setRef(refs[i7], null);
        });
      };
    };
  }
  function $4064df0d6f9620e1$var$setRef(ref, value) {
    if (typeof ref === "function") return ref(value);
    else if (ref != null) ref.current = value;
  }

  // node_modules/clsx/dist/clsx.mjs
  function r(e7) {
    var t6, f11, n8 = "";
    if ("string" == typeof e7 || "number" == typeof e7) n8 += e7;
    else if ("object" == typeof e7) if (Array.isArray(e7)) {
      var o9 = e7.length;
      for (t6 = 0; t6 < o9; t6++) e7[t6] && (f11 = r(e7[t6])) && (n8 && (n8 += " "), n8 += f11);
    } else for (f11 in e7) e7[f11] && (n8 && (n8 += " "), n8 += f11);
    return n8;
  }
  function clsx() {
    for (var e7, t6, f11 = 0, n8 = "", o9 = arguments.length; f11 < o9; f11++) (e7 = arguments[f11]) && (t6 = r(e7)) && (n8 && (n8 += " "), n8 += t6);
    return n8;
  }
  var clsx_default = clsx;

  // node_modules/react-aria/dist/private/utils/mergeProps.mjs
  function $bbaa08b3cd72f041$export$9d1611c77c2fe928(...args) {
    let result = {
      ...args[0]
    };
    for (let i7 = 1; i7 < args.length; i7++) {
      let props = args[i7];
      for (let key in props) {
        let a15 = result[key];
        let b5 = props[key];
        if (typeof a15 === "function" && typeof b5 === "function" && // This is a lot faster than a regex.
        key[0] === "o" && key[1] === "n" && key.charCodeAt(2) >= /* 'A' */
        65 && key.charCodeAt(2) <= /* 'Z' */
        90) result[key] = (0, $a4e76a5424781910$export$e08e3b67e392101e)(a15, b5);
        else if ((key === "className" || key === "UNSAFE_className") && typeof a15 === "string" && typeof b5 === "string") result[key] = (0, clsx_default)(a15, b5);
        else if (key === "id" && a15 && b5) result.id = (0, $390e54f620492c70$export$cd8c9cb68f842629)(a15, b5);
        else if (key === "ref" && a15 && b5) result.ref = (0, $4064df0d6f9620e1$export$c9058316764c140e)(a15, b5);
        else result[key] = b5 !== void 0 ? b5 : a15;
      }
    }
    return result;
  }

  // node_modules/react-aria/dist/private/interactions/useFocus.mjs
  init_react_shim();
  function $1e74c67db218ce67$export$f8168d8dd8fd66e6(props) {
    let { isDisabled, onFocus: onFocusProp, onBlur: onBlurProp, onFocusChange } = props;
    const onBlur = (0, useCallback)((e7) => {
      if ((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7) === e7.currentTarget) {
        if (onBlurProp) onBlurProp(e7);
        if (onFocusChange) onFocusChange(false);
        return true;
      }
    }, [
      onBlurProp,
      onFocusChange
    ]);
    const onSyntheticFocus = (0, $a92dc41f639950be$export$715c682d09d639cc)(onBlur);
    const onFocus = (0, useCallback)((e7) => {
      let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
      const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(eventTarget);
      const activeElement = ownerDocument ? (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument) : (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)();
      if (eventTarget === e7.currentTarget && eventTarget === activeElement) {
        if (onFocusProp) onFocusProp(e7);
        if (onFocusChange) onFocusChange(true);
        onSyntheticFocus(e7);
      }
    }, [
      onFocusChange,
      onFocusProp,
      onSyntheticFocus
    ]);
    return {
      focusProps: {
        onFocus: !isDisabled && (onFocusProp || onFocusChange || onBlurProp) ? onFocus : void 0,
        onBlur: !isDisabled && (onBlurProp || onFocusChange) ? onBlur : void 0
      }
    };
  }

  // node_modules/react-aria/dist/private/utils/useGlobalListeners.mjs
  init_react_shim();
  function $48a7d519b337145d$export$4eaf04e54aa8eed6() {
    let globalListeners = (0, useRef)(/* @__PURE__ */ new Map());
    let addGlobalListener = (0, useCallback)((eventTarget, type, listener, options) => {
      let fn = options?.once ? (...args) => {
        globalListeners.current.delete(listener);
        listener(...args);
      } : listener;
      globalListeners.current.set(listener, {
        type,
        eventTarget,
        fn,
        options
      });
      eventTarget.addEventListener(type, fn, options);
    }, []);
    let removeGlobalListener = (0, useCallback)((eventTarget, type, listener, options) => {
      let fn = globalListeners.current.get(listener)?.fn || listener;
      eventTarget.removeEventListener(type, fn, options);
      globalListeners.current.delete(listener);
    }, []);
    let removeAllGlobalListeners = (0, useCallback)(() => {
      globalListeners.current.forEach((value, key) => {
        removeGlobalListener(value.eventTarget, value.type, key, value.options);
      });
    }, [
      removeGlobalListener
    ]);
    (0, useEffect)(() => {
      return removeAllGlobalListeners;
    }, [
      removeAllGlobalListeners
    ]);
    return {
      addGlobalListener,
      removeGlobalListener,
      removeAllGlobalListeners
    };
  }

  // node_modules/react-aria/dist/private/interactions/useFocusWithin.mjs
  init_react_shim();
  function $2c9edc598a03d523$export$420e68273165f4ec(props) {
    let { isDisabled, onBlurWithin, onFocusWithin, onFocusWithinChange } = props;
    let state = (0, useRef)({
      isFocusWithin: false
    });
    let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
    let onBlur = (0, useCallback)((e7) => {
      if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
      if (state.current.isFocusWithin && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, e7.relatedTarget)) {
        state.current.isFocusWithin = false;
        removeAllGlobalListeners();
        if (onBlurWithin) onBlurWithin(e7);
        if (onFocusWithinChange) onFocusWithinChange(false);
      }
    }, [
      onBlurWithin,
      onFocusWithinChange,
      state,
      removeAllGlobalListeners
    ]);
    let onSyntheticFocus = (0, $a92dc41f639950be$export$715c682d09d639cc)(onBlur);
    let onFocus = (0, useCallback)((e7) => {
      if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
      let eventTarget = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
      const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(eventTarget);
      const activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(ownerDocument);
      if (!state.current.isFocusWithin && activeElement === eventTarget) {
        if (onFocusWithin) onFocusWithin(e7);
        if (onFocusWithinChange) onFocusWithinChange(true);
        state.current.isFocusWithin = true;
        onSyntheticFocus(e7);
        let currentTarget = e7.currentTarget;
        addGlobalListener(ownerDocument, "focus", (e8) => {
          let eventTarget2 = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e8);
          if (state.current.isFocusWithin && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(currentTarget, eventTarget2)) {
            let nativeEvent = new ownerDocument.defaultView.FocusEvent("blur", {
              relatedTarget: eventTarget2
            });
            (0, $a92dc41f639950be$export$c2b7abe5d61ec696)(nativeEvent, currentTarget);
            let event = (0, $a92dc41f639950be$export$525bc4921d56d4a)(nativeEvent);
            onBlur(event);
          }
        }, {
          capture: true
        });
      }
    }, [
      onFocusWithin,
      onFocusWithinChange,
      onSyntheticFocus,
      addGlobalListener,
      onBlur
    ]);
    if (isDisabled) return {
      focusWithinProps: {
        // These cannot be null, that would conflict in mergeProps
        onFocus: void 0,
        onBlur: void 0
      }
    };
    return {
      focusWithinProps: {
        onFocus,
        onBlur
      }
    };
  }

  // node_modules/react-aria/dist/private/focus/useFocusRing.mjs
  init_react_shim();
  function $0c4a58759813079a$export$4e328f61c538687f(props = {}) {
    let { autoFocus = false, isTextInput, within } = props;
    let state = (0, useRef)({
      isFocused: false,
      isFocusVisible: autoFocus || (0, $8f5a2122b0992be3$export$b9b3dfddab17db27)()
    });
    let [isFocused, setFocused] = (0, useState)(false);
    let [isFocusVisibleState, setFocusVisible] = (0, useState)(
      // oxlint-disable-next-line react/react-compiler
      () => state.current.isFocused && state.current.isFocusVisible
    );
    let updateState = (0, useCallback)(() => setFocusVisible(state.current.isFocused && state.current.isFocusVisible), []);
    let onFocusChange = (0, useCallback)((isFocused2) => {
      state.current.isFocused = isFocused2;
      state.current.isFocusVisible = (0, $8f5a2122b0992be3$export$b9b3dfddab17db27)();
      setFocused(isFocused2);
      updateState();
    }, [
      updateState
    ]);
    (0, $8f5a2122b0992be3$export$ec71b4b83ac08ec3)((isFocusVisible) => {
      state.current.isFocusVisible = isFocusVisible;
      updateState();
    }, [
      isTextInput,
      isFocused
    ], {
      enabled: isFocused,
      isTextInput
    });
    let { focusProps } = (0, $1e74c67db218ce67$export$f8168d8dd8fd66e6)({
      isDisabled: within,
      onFocusChange
    });
    let { focusWithinProps } = (0, $2c9edc598a03d523$export$420e68273165f4ec)({
      isDisabled: !within,
      onFocusWithinChange: onFocusChange
    });
    return {
      isFocused,
      isFocusVisible: isFocusVisibleState,
      focusProps: within ? focusWithinProps : focusProps
    };
  }

  // node_modules/react-aria/dist/private/focus/FocusRing.mjs
  init_react_shim();
  function $aeb8be23c2978fc5$export$1a38b4ad7f578e1d(props) {
    let { children, focusClass, focusRingClass } = props;
    let { isFocused, isFocusVisible, focusProps } = (0, $0c4a58759813079a$export$4e328f61c538687f)(props);
    let child = (0, react_shim_default).Children.only(children);
    return /* @__PURE__ */ (0, react_shim_default).cloneElement(child, (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(child.props, {
      ...focusProps,
      className: (0, clsx_default)({
        [focusClass || ""]: isFocused,
        [focusRingClass || ""]: isFocusVisible
      })
    }));
  }

  // node_modules/react-aria/dist/private/focus/useHasTabbableChild.mjs
  init_react_shim();
  function $bf14c9739fda2eb3$export$eac1895992b9f3d6(ref, options) {
    let isDisabled = options?.isDisabled;
    let [hasTabbableChild, setHasTabbableChild] = (0, useState)(false);
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      if (ref?.current && !isDisabled) {
        let update = () => {
          if (ref.current) {
            let walker = (0, $535772f9d2c1f38d$export$2d6ec8fc375ceafa)(ref.current, {
              tabbable: true
            });
            setHasTabbableChild(!!walker.nextNode());
          }
        };
        update();
        let observer = new MutationObserver(update);
        observer.observe(ref.current, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: [
            "tabIndex",
            "disabled"
          ]
        });
        return () => {
          observer.disconnect();
        };
      }
    });
    return isDisabled ? false : hasTabbableChild;
  }

  // node_modules/react-aria/dist/private/focus/virtualFocus.mjs
  function $b72f3f7b3b5f42c6$export$76e4e37e5339496d(to) {
    let from = $b72f3f7b3b5f42c6$export$759df0d867455a91((0, $d447af545b77c9f1$export$b204af158042fbac)(to));
    if (from !== to) {
      if (from) $b72f3f7b3b5f42c6$export$6c5dc7e81d2cc29a(from, to);
      if (to) $b72f3f7b3b5f42c6$export$2b35b76d2e30e129(to, from);
    }
  }
  function $b72f3f7b3b5f42c6$export$6c5dc7e81d2cc29a(from, to) {
    from.dispatchEvent(new FocusEvent("blur", {
      relatedTarget: to
    }));
    from.dispatchEvent(new FocusEvent("focusout", {
      bubbles: true,
      relatedTarget: to
    }));
  }
  function $b72f3f7b3b5f42c6$export$2b35b76d2e30e129(to, from) {
    to.dispatchEvent(new FocusEvent("focus", {
      relatedTarget: from
    }));
    to.dispatchEvent(new FocusEvent("focusin", {
      bubbles: true,
      relatedTarget: from
    }));
  }
  function $b72f3f7b3b5f42c6$export$759df0d867455a91(document2) {
    let activeElement = (0, $23f2114a1b82827e$export$cd4e5573fbe2b576)(document2);
    let activeDescendant = activeElement?.getAttribute("aria-activedescendant");
    if (activeDescendant) return document2.getElementById(activeDescendant) || activeElement;
    return activeElement;
  }

  // node_modules/react-aria/dist/private/interactions/createEventHandler.mjs
  function $8dba16319206abb6$export$48d1ea6320830260(handler) {
    if (!handler) return void 0;
    return (e7) => {
      let shouldStopPropagation = true;
      let event = {
        ...e7,
        preventDefault() {
          e7.preventDefault();
        },
        isDefaultPrevented() {
          return e7.isDefaultPrevented();
        },
        stopPropagation() {
          if (shouldStopPropagation && true) console.error("stopPropagation is now the default behavior for events in React Spectrum. You can use continuePropagation() to revert this behavior.");
          else shouldStopPropagation = true;
        },
        continuePropagation() {
          shouldStopPropagation = false;
          if (typeof e7.continuePropagation === "function") e7.continuePropagation();
        },
        isPropagationStopped() {
          return shouldStopPropagation;
        }
      };
      handler(event);
      if (shouldStopPropagation && !(typeof e7.isPropagationStopped === "function" && e7.isPropagationStopped())) e7.stopPropagation();
    };
  }

  // node_modules/react-aria/dist/private/interactions/createKeyboardShortcutHandler.mjs
  var $cbf729ad7eb217b0$var$MODIFIER_NAMES = /* @__PURE__ */ new Set([
    "shift",
    "alt",
    "control",
    "meta",
    "mod"
    // OS dependent - Cmd on Mac, Control on Windows/Linux
  ]);
  var $cbf729ad7eb217b0$var$CANONICAL_MODIFIER_ORDER = [
    "Alt",
    "Control",
    "Meta",
    "Shift"
  ];
  function $cbf729ad7eb217b0$export$9932402e211e7315(parsed) {
    let set = /* @__PURE__ */ new Set();
    if (parsed.alt) set.add("Alt");
    if (parsed.shift) set.add("Shift");
    if (parsed.ctrl) set.add("Control");
    if (parsed.meta) set.add("Meta");
    if (parsed.mod) set.add((0, $2add3ce32c6007eb$export$9ac100e40613ea10)() ? "Meta" : "Control");
    return set;
  }
  function $cbf729ad7eb217b0$export$bf26c410e1f8fe6d(e7) {
    let set = /* @__PURE__ */ new Set();
    if (e7.altKey) set.add("Alt");
    if (e7.ctrlKey) set.add("Control");
    if (e7.metaKey) set.add("Meta");
    if (e7.shiftKey) set.add("Shift");
    return set;
  }
  function $cbf729ad7eb217b0$var$sortedModifierTokens(set) {
    return $cbf729ad7eb217b0$var$CANONICAL_MODIFIER_ORDER.filter((name) => set.has(name));
  }
  function $cbf729ad7eb217b0$export$d636f01a2eaffd51(spec) {
    let parts = spec.split("+").reduce((prev, part) => {
      let lower = part.toLowerCase();
      if ($cbf729ad7eb217b0$var$MODIFIER_NAMES.has(lower)) {
        if (lower === "shift") prev.shift = true;
        else if (lower === "alt") prev.alt = true;
        else if (lower === "control") prev.ctrl = true;
        else if (lower === "meta") prev.meta = true;
        else if (lower === "mod") prev.mod = true;
      } else prev.key = part;
      return prev;
    }, {
      shift: false,
      alt: false,
      ctrl: false,
      meta: false,
      mod: false,
      key: ""
    });
    if (parts.key === "") throw new Error(`Invalid keyboard shortcut: "${spec}". Must include exactly one non-modifier key (e.g. "a", "Enter", "ArrowDown"). Combine any of Shift, Alt, Ctrl, Meta, and Mod.`);
    return parts;
  }
  function $cbf729ad7eb217b0$var$normalizeEventKey(key) {
    return key.toLowerCase();
  }
  var $cbf729ad7eb217b0$var$KEY_ALIASES = {
    space: " ",
    esc: "escape",
    del: "delete",
    ins: "insert",
    left: "arrowleft",
    right: "arrowright",
    up: "arrowup",
    down: "arrowdown",
    pageup: "pageup",
    pagedown: "pagedown"
  };
  function $cbf729ad7eb217b0$var$canonicalKeyFromSpecKey(specKey) {
    let k5 = $cbf729ad7eb217b0$var$normalizeEventKey(specKey);
    let aliased = $cbf729ad7eb217b0$var$KEY_ALIASES[k5];
    return aliased != null ? aliased : k5;
  }
  function $cbf729ad7eb217b0$export$6cfa2ace150c84a5(parsed) {
    let mods = $cbf729ad7eb217b0$var$sortedModifierTokens($cbf729ad7eb217b0$export$9932402e211e7315(parsed));
    let key = $cbf729ad7eb217b0$var$canonicalKeyFromSpecKey(parsed.key);
    return mods.length > 0 ? `${mods.join("+")}+${key}` : key;
  }
  function $cbf729ad7eb217b0$export$786304bda41dd69f(e7) {
    let mods = $cbf729ad7eb217b0$var$sortedModifierTokens($cbf729ad7eb217b0$export$bf26c410e1f8fe6d(e7));
    let key = $cbf729ad7eb217b0$var$normalizeEventKey(e7.key);
    let prefix = mods.length > 0 ? `${mods.join("+")}+` : "";
    return prefix + key;
  }
  function $cbf729ad7eb217b0$export$2fd1fc8039383ae1(bindings) {
    let map = /* @__PURE__ */ new Map();
    for (let [spec, action] of Object.entries(bindings)) {
      let parsed = $cbf729ad7eb217b0$export$d636f01a2eaffd51(spec);
      map.set($cbf729ad7eb217b0$export$6cfa2ace150c84a5(parsed), action);
    }
    return (e7) => {
      let canonical = $cbf729ad7eb217b0$export$786304bda41dd69f(e7);
      let action = map.get(canonical);
      let result = action?.(e7);
      if (result === void 0 && action !== void 0) result = {
        shouldContinuePropagation: false,
        shouldPreventDefault: true
      };
      else if (typeof result === "boolean") result = {
        shouldContinuePropagation: !result,
        shouldPreventDefault: result
      };
      if (result?.shouldPreventDefault) e7.preventDefault();
      if (!action || result?.shouldContinuePropagation) e7.continuePropagation();
    };
  }

  // node_modules/react-aria/dist/private/interactions/useKeyboard.mjs
  function $8296dad1a4c5e0dc$export$8f71654801c2f7cd(props) {
    let { shortcuts, allowRepeats = false, allowComposing = false } = props;
    let onKeyDown;
    let onKeyUp;
    if (shortcuts) {
      let shortcutHandler = (0, $cbf729ad7eb217b0$export$2fd1fc8039383ae1)(shortcuts);
      let shortcutOnKeyDown = (0, $8dba16319206abb6$export$48d1ea6320830260)((e7) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) {
          e7.continuePropagation();
          return;
        }
        if (e7.nativeEvent?.repeat && !allowRepeats || e7.nativeEvent?.isComposing && !allowComposing) {
          e7.continuePropagation();
          return;
        }
        shortcutHandler(e7);
      });
      let shortcutOnKeyUp = (0, $8dba16319206abb6$export$48d1ea6320830260)((e7) => {
        if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) {
          e7.continuePropagation();
          return;
        }
        if (e7.nativeEvent?.repeat && !allowRepeats || e7.nativeEvent?.isComposing && !allowComposing) {
          e7.continuePropagation();
          return;
        }
        e7.continuePropagation();
      });
      onKeyDown = props.onKeyDown ? (0, $a4e76a5424781910$export$e08e3b67e392101e)(props.onKeyDown, shortcutOnKeyDown) : shortcutOnKeyDown;
      onKeyUp = props.onKeyUp ? (0, $a4e76a5424781910$export$e08e3b67e392101e)(props.onKeyUp, shortcutOnKeyUp) : shortcutOnKeyUp;
    } else {
      onKeyDown = (0, $8dba16319206abb6$export$48d1ea6320830260)(props.onKeyDown);
      onKeyUp = (0, $8dba16319206abb6$export$48d1ea6320830260)(props.onKeyUp);
    }
    return {
      keyboardProps: props.isDisabled ? {} : {
        onKeyDown,
        onKeyUp
      }
    };
  }

  // node_modules/react-aria/dist/private/utils/useObjectRef.mjs
  init_react_shim();
  function $03e8ab2d84d7657a$export$4338b53315abf666(ref) {
    const objRef = (0, useRef)(null);
    const cleanupRef = (0, useRef)(void 0);
    const refEffect = (0, useCallback)((instance) => {
      if (typeof ref === "function") {
        const refCallback = ref;
        const refCleanup = refCallback(instance);
        return () => {
          if (typeof refCleanup === "function") refCleanup();
          else refCallback(null);
        };
      } else if (ref) {
        ref.current = instance;
        return () => {
          ref.current = null;
        };
      }
    }, [
      ref
    ]);
    return (0, useMemo)(
      () => ({
        get current() {
          return objRef.current;
        },
        set current(value) {
          objRef.current = value;
          if (cleanupRef.current) {
            cleanupRef.current();
            cleanupRef.current = void 0;
          }
          if (value != null) cleanupRef.current = refEffect(value);
        }
      }),
      // oxlint-disable-next-line react/react-compiler
      [
        refEffect
      ]
    );
  }

  // node_modules/react-aria/dist/private/utils/useSyncRef.mjs
  function $b7115c395c64f7b5$export$4debdb1a3f0fa79e(context, ref) {
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      if (context && context.ref && ref) {
        context.ref.current = ref.current;
        return () => {
          if (context.ref)
            context.ref.current = null;
        };
      }
    });
  }

  // node_modules/react-aria/dist/private/interactions/useFocusable.mjs
  init_react_shim();
  var $d1116acdf220c2da$export$f9762fab77588ecb = /* @__PURE__ */ (0, react_shim_default).createContext(null);
  function $d1116acdf220c2da$var$useFocusableContext(ref) {
    let context = (0, useContext)($d1116acdf220c2da$export$f9762fab77588ecb) || {};
    (0, $b7115c395c64f7b5$export$4debdb1a3f0fa79e)(context, ref);
    let { ref: _5, ...otherProps } = context;
    return otherProps;
  }
  var $d1116acdf220c2da$export$13f3202a3e5ddd5 = /* @__PURE__ */ (0, react_shim_default).forwardRef(function FocusableProvider(props, ref) {
    let { children, ...otherProps } = props;
    let objRef = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(ref);
    let context = {
      ...otherProps,
      ref: objRef
    };
    return /* @__PURE__ */ (0, react_shim_default).createElement($d1116acdf220c2da$export$f9762fab77588ecb.Provider, {
      value: context
    }, children);
  });
  function $d1116acdf220c2da$export$4c014de7c8940b4c(props, domRef) {
    let { focusProps } = (0, $1e74c67db218ce67$export$f8168d8dd8fd66e6)(props);
    let { keyboardProps } = (0, $8296dad1a4c5e0dc$export$8f71654801c2f7cd)(props);
    let interactions = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(focusProps, keyboardProps);
    let domProps = $d1116acdf220c2da$var$useFocusableContext(domRef);
    let interactionProps = props.isDisabled ? {} : domProps;
    let autoFocusRef = (0, useRef)(props.autoFocus);
    (0, useEffect)(() => {
      if (autoFocusRef.current && domRef.current) (0, $f192c2f16961cbe0$export$80f3e147d781571c)(domRef.current);
      autoFocusRef.current = false;
    }, [
      domRef
    ]);
    let tabIndex = props.excludeFromTabOrder ? -1 : 0;
    if (props.isDisabled) tabIndex = void 0;
    return {
      focusableProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)({
        ...interactions,
        tabIndex
      }, interactionProps)
    };
  }
  var $d1116acdf220c2da$export$35a3bebf7ef2d934 = /* @__PURE__ */ (0, forwardRef)(({ children, ...props }, ref) => {
    ref = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(ref);
    let { focusableProps } = $d1116acdf220c2da$export$4c014de7c8940b4c(props, ref);
    let child = (0, react_shim_default).Children.only(children);
    (0, useEffect)(() => {
      if (false) return;
      let el = ref.current;
      if (!el || !(el instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(el).Element)) {
        console.error("<Focusable> child must forward its ref to a DOM element.");
        return;
      }
      if (!props.isDisabled && !(0, $3b8b240c1bf84ab9$export$4c063cf1350e6fed)(el)) {
        console.warn("<Focusable> child must be focusable. Please ensure the tabIndex prop is passed through.");
        return;
      }
      if (el.localName !== "button" && el.localName !== "input" && el.localName !== "select" && el.localName !== "textarea" && el.localName !== "a" && el.localName !== "area" && el.localName !== "summary" && el.localName !== "img" && el.localName !== "svg") {
        let role = el.getAttribute("role");
        if (!role) console.warn("<Focusable> child must have an interactive ARIA role.");
        else if (
          // https://w3c.github.io/aria/#widget_roles
          role !== "application" && role !== "button" && role !== "checkbox" && role !== "combobox" && role !== "gridcell" && role !== "link" && role !== "menuitem" && role !== "menuitemcheckbox" && role !== "menuitemradio" && role !== "option" && role !== "radio" && role !== "searchbox" && role !== "separator" && role !== "slider" && role !== "spinbutton" && role !== "switch" && role !== "tab" && role !== "tabpanel" && role !== "textbox" && role !== "treeitem" && // aria-describedby is also announced on these roles
          role !== "img" && role !== "meter" && role !== "progressbar"
        ) console.warn(`<Focusable> child must have an interactive ARIA role. Got "${role}".`);
      }
    }, [
      ref,
      props.isDisabled
    ]);
    let childRef = parseInt((0, react_shim_default).version, 10) < 19 ? child.ref : child.props.ref;
    return /* @__PURE__ */ (0, react_shim_default).cloneElement(child, {
      ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(focusableProps, child.props),
      // @ts-ignore
      // oxlint-disable-next-line react/react-compiler
      ref: (0, $4064df0d6f9620e1$export$c9058316764c140e)(childRef, ref)
    });
  });

  // node_modules/react-aria/dist/private/interactions/textSelection.mjs
  var $cbf007e418543821$var$state = "default";
  var $cbf007e418543821$var$savedUserSelect = "";
  var $cbf007e418543821$var$modifiedElementMap = /* @__PURE__ */ new WeakMap();
  function $cbf007e418543821$export$16a4697467175487(target) {
    if ((0, $2add3ce32c6007eb$export$fedb369cb70207f1)() && (0, $2add3ce32c6007eb$export$78551043582a6a98)()) {
      if ($cbf007e418543821$var$state === "default") {
        const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(target);
        $cbf007e418543821$var$savedUserSelect = documentObject.documentElement.style.webkitUserSelect;
        documentObject.documentElement.style.webkitUserSelect = "none";
      }
      $cbf007e418543821$var$state = "disabled";
    } else if (target instanceof HTMLElement || target instanceof SVGElement) {
      let property = "userSelect" in target.style ? "userSelect" : "webkitUserSelect";
      $cbf007e418543821$var$modifiedElementMap.set(target, target.style[property]);
      target.style[property] = "none";
    }
  }
  function $cbf007e418543821$export$b0d6fa1ab32e3295(target) {
    if ((0, $2add3ce32c6007eb$export$fedb369cb70207f1)() && (0, $2add3ce32c6007eb$export$78551043582a6a98)()) {
      if ($cbf007e418543821$var$state !== "disabled") return;
      $cbf007e418543821$var$state = "restoring";
      setTimeout(() => {
        (0, $081cb5757e08788e$export$24490316f764c430)(() => {
          if ($cbf007e418543821$var$state === "restoring") {
            const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(target);
            if (documentObject.documentElement.style.webkitUserSelect === "none") documentObject.documentElement.style.webkitUserSelect = $cbf007e418543821$var$savedUserSelect || "";
            $cbf007e418543821$var$savedUserSelect = "";
            $cbf007e418543821$var$state = "default";
          }
        });
      }, 300);
    } else if (target instanceof HTMLElement || target instanceof SVGElement) {
      if (target && $cbf007e418543821$var$modifiedElementMap.has(target)) {
        let targetOldUserSelect = $cbf007e418543821$var$modifiedElementMap.get(target);
        let property = "userSelect" in target.style ? "userSelect" : "webkitUserSelect";
        if (target.style[property] === "none") target.style[property] = targetOldUserSelect;
        if (target.getAttribute("style") === "") target.removeAttribute("style");
        $cbf007e418543821$var$modifiedElementMap.delete(target);
      }
    }
  }

  // node_modules/react-aria/dist/private/utils/getMetaValue.mjs
  function $7096878c21af5e66$export$a929f3f93e2cc67e(key, doc) {
    let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(doc);
    let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(doc);
    if (ownerDocument == null || ownerWindow == null) return;
    let content = void 0;
    let selector = `meta[name="${CSS.escape(key)}"], meta[property="${CSS.escape(key)}"]`;
    let meta = ownerDocument.querySelector(selector);
    if (meta && meta instanceof ownerWindow.HTMLMetaElement) {
      if (key === "csp-nonce" && meta.nonce) content ??= meta.nonce || void 0;
      if (meta.content) content ??= meta.content || void 0;
    }
    if (key === "csp-nonce") content ??= ownerWindow.__webpack_nonce__ || globalThis.__webpack_nonce__ || void 0;
    return content;
  }

  // node_modules/react-aria/dist/private/utils/getNonce.mjs
  var $2b2d34ff061957fb$var$nonceCache = /* @__PURE__ */ new WeakMap();
  function $2b2d34ff061957fb$export$88b319273f3705b4() {
    $2b2d34ff061957fb$var$nonceCache = /* @__PURE__ */ new WeakMap();
  }
  function $2b2d34ff061957fb$export$2b85b721e524d74b(doc) {
    let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(doc);
    let nonce = $2b2d34ff061957fb$var$nonceCache.get(ownerDocument);
    nonce ??= (0, $7096878c21af5e66$export$a929f3f93e2cc67e)("csp-nonce", ownerDocument);
    if (nonce !== void 0) $2b2d34ff061957fb$var$nonceCache.set(ownerDocument, nonce);
    return nonce;
  }

  // node_modules/react-aria/dist/private/interactions/context.mjs
  init_react_shim();
  var $24f9a20f226ad820$export$5165eccb35aaadb5 = (0, react_shim_default).createContext({
    register: () => {
    }
  });
  $24f9a20f226ad820$export$5165eccb35aaadb5.displayName = "PressResponderContext";

  // node_modules/react-aria/dist/private/utils/useEffectEvent.mjs
  init_react_shim();
  var $fe16bffc7a557bf0$var$useEarlyEffect = (0, react_shim_default)["useInsertionEffect"] ?? (0, $c4867b2f328c2698$export$e5c5a5f917a5871c);
  function $fe16bffc7a557bf0$export$7f54fc3180508a52(fn) {
    const ref = (0, useRef)(null);
    $fe16bffc7a557bf0$var$useEarlyEffect(() => {
      ref.current = fn;
    }, [
      fn
    ]);
    return (0, useCallback)((...args) => {
      const f11 = ref.current;
      return f11?.(...args);
    }, []);
  }

  // client/src/react-dom-shim.js
  function _RD() {
    if (typeof window !== "undefined" && window.__ReactDOM) return window.__ReactDOM;
    if (!_RD._stub) _RD._stub = createStub2();
    return _RD._stub;
  }
  function createStub2() {
    return {
      createRoot: function() {
        return { render: function() {
        }, unmount: function() {
        } };
      },
      hydrateRoot: function() {
        return { render: function() {
        }, unmount: function() {
        } };
      },
      createPortal: function(children) {
        return children;
      },
      flushSync: function(fn) {
        return fn();
      },
      version: "0.0.0-stub",
      findDOMNode: function() {
        return null;
      },
      render: function() {
      },
      hydrate: function() {
      },
      unmountComponentAtNode: function() {
        return false;
      },
      unstable_batchedUpdates: function(fn) {
        fn();
      },
      __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {}
    };
  }
  var react_dom_shim_default = _RD();
  var createRoot = _RD().createRoot;
  var hydrateRoot = _RD().hydrateRoot;
  var createPortal = _RD().createPortal;
  var flushSync = _RD().flushSync;
  var version2 = _RD().version;
  var findDOMNode = _RD().findDOMNode;
  var render = _RD().render;
  var hydrate = _RD().hydrate;
  var unmountComponentAtNode = _RD().unmountComponentAtNode;
  var unstable_batchedUpdates = _RD().unstable_batchedUpdates;

  // node_modules/react-aria/dist/private/interactions/usePress.mjs
  init_react_shim();
  function $d27d541f9569d26d$var$usePressResponderContext(props) {
    let context = (0, useContext)((0, $24f9a20f226ad820$export$5165eccb35aaadb5));
    if (context) {
      let { register, ref, ...contextProps } = context;
      props = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(contextProps, props);
      register();
    }
    (0, $b7115c395c64f7b5$export$4debdb1a3f0fa79e)(context, props.ref);
    return props;
  }
  var $d27d541f9569d26d$var$PressEvent = class {
    #shouldStopPropagation;
    constructor(type, pointerType, originalEvent, state) {
      this.#shouldStopPropagation = true;
      let currentTarget = state?.target ?? originalEvent.currentTarget;
      const rect = currentTarget?.getBoundingClientRect();
      let x7, y4 = 0;
      let clientX, clientY = null;
      if (originalEvent.clientX != null && originalEvent.clientY != null) {
        clientX = originalEvent.clientX;
        clientY = originalEvent.clientY;
      }
      if (rect) {
        if (clientX != null && clientY != null) {
          x7 = clientX - rect.left;
          y4 = clientY - rect.top;
        } else {
          x7 = rect.width / 2;
          y4 = rect.height / 2;
        }
      }
      this.type = type;
      this.pointerType = pointerType;
      this.target = originalEvent.currentTarget;
      this.shiftKey = originalEvent.shiftKey;
      this.metaKey = originalEvent.metaKey;
      this.ctrlKey = originalEvent.ctrlKey;
      this.altKey = originalEvent.altKey;
      this.x = x7;
      this.y = y4;
      this.key = originalEvent.key;
    }
    continuePropagation() {
      this.#shouldStopPropagation = false;
    }
    get shouldStopPropagation() {
      return this.#shouldStopPropagation;
    }
  };
  var $d27d541f9569d26d$var$LINK_CLICKED = /* @__PURE__ */ Symbol("linkClicked");
  var $d27d541f9569d26d$var$STYLE_ID = "react-aria-pressable-style";
  var $d27d541f9569d26d$var$PRESSABLE_ATTRIBUTE = "data-react-aria-pressable";
  function $d27d541f9569d26d$export$45712eceda6fad21(props) {
    let { onPress, onPressChange, onPressStart, onPressEnd, onPressUp, onClick, isDisabled, isPressed: isPressedProp, preventFocusOnPress, shouldCancelOnPointerExit, allowTextSelectionOnPress, ref: domRef, ...domProps } = $d27d541f9569d26d$var$usePressResponderContext(props);
    let [isPressed, setPressed] = (0, useState)(false);
    let ref = (0, useRef)({
      isPressed: false,
      ignoreEmulatedMouseEvents: false,
      didFirePressStart: false,
      isTriggeringEvent: false,
      activePointerId: null,
      target: null,
      isOverTarget: false,
      pointerType: null,
      disposables: []
    });
    let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
    let triggerPressStart = (0, useCallback)((originalEvent, pointerType) => {
      let state = ref.current;
      if (isDisabled || state.didFirePressStart) return false;
      let shouldStopPropagation = true;
      state.isTriggeringEvent = true;
      if (onPressStart) {
        let event = new $d27d541f9569d26d$var$PressEvent("pressstart", pointerType, originalEvent);
        onPressStart(event);
        shouldStopPropagation = event.shouldStopPropagation;
      }
      if (onPressChange) onPressChange(true);
      state.isTriggeringEvent = false;
      state.didFirePressStart = true;
      setPressed(true);
      return shouldStopPropagation;
    }, [
      isDisabled,
      onPressStart,
      onPressChange
    ]);
    let triggerPressEnd = (0, useCallback)((originalEvent, pointerType, wasPressed = true) => {
      let state = ref.current;
      if (!state.didFirePressStart) return false;
      state.didFirePressStart = false;
      state.isTriggeringEvent = true;
      let shouldStopPropagation = true;
      if (onPressEnd) {
        let event = new $d27d541f9569d26d$var$PressEvent("pressend", pointerType, originalEvent);
        onPressEnd(event);
        shouldStopPropagation = event.shouldStopPropagation;
      }
      if (onPressChange) onPressChange(false);
      setPressed(false);
      if (onPress && wasPressed && !isDisabled) {
        let event = new $d27d541f9569d26d$var$PressEvent("press", pointerType, originalEvent);
        onPress(event);
        shouldStopPropagation &&= event.shouldStopPropagation;
      }
      state.isTriggeringEvent = false;
      return shouldStopPropagation;
    }, [
      isDisabled,
      onPressEnd,
      onPressChange,
      onPress
    ]);
    let triggerPressEndEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(triggerPressEnd);
    let triggerPressUp = (0, useCallback)((originalEvent, pointerType) => {
      let state = ref.current;
      if (isDisabled) return false;
      if (onPressUp) {
        state.isTriggeringEvent = true;
        let event = new $d27d541f9569d26d$var$PressEvent("pressup", pointerType, originalEvent);
        onPressUp(event);
        state.isTriggeringEvent = false;
        return event.shouldStopPropagation;
      }
      return true;
    }, [
      isDisabled,
      onPressUp
    ]);
    let triggerPressUpEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(triggerPressUp);
    let cancel = (0, useCallback)((e7) => {
      let state = ref.current;
      if (state.isPressed && state.target) {
        if (state.didFirePressStart && state.pointerType != null) triggerPressEnd($d27d541f9569d26d$var$createEvent(state.target, e7), state.pointerType, false);
        state.isPressed = false;
        state.isOverTarget = false;
        state.activePointerId = null;
        state.pointerType = null;
        removeAllGlobalListeners();
        if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$b0d6fa1ab32e3295)(state.target);
        for (let dispose of state.disposables) dispose();
        state.disposables = [];
      }
    }, [
      allowTextSelectionOnPress,
      removeAllGlobalListeners,
      triggerPressEnd
    ]);
    let cancelEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(cancel);
    (0, useEffect)(() => {
      if (isDisabled && ref.current.isPressed) cancelEvent({
        currentTarget: ref.current.target,
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false
      });
    }, [
      isDisabled
    ]);
    let cancelOnPointerExit = (0, useCallback)((e7) => {
      if (shouldCancelOnPointerExit) cancel(e7);
    }, [
      shouldCancelOnPointerExit,
      cancel
    ]);
    let triggerClick = (0, useCallback)((e7) => {
      if (isDisabled) return;
      onClick?.(e7);
    }, [
      isDisabled,
      onClick
    ]);
    let triggerSyntheticClick = (0, useCallback)((e7, target) => {
      if (isDisabled) return;
      if (onClick) {
        let event = new MouseEvent("click", e7);
        (0, $a92dc41f639950be$export$c2b7abe5d61ec696)(event, target);
        onClick((0, $a92dc41f639950be$export$525bc4921d56d4a)(event));
      }
    }, [
      isDisabled,
      onClick
    ]);
    let pressProps = (0, useMemo)(() => {
      let state = ref.current;
      let pressProps2 = {
        onKeyDown(e7) {
          if ($d27d541f9569d26d$var$isValidKeyboardEvent(e7.nativeEvent, e7.currentTarget) && (0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) {
            if ($d27d541f9569d26d$var$shouldPreventDefaultKeyboard((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7), e7.key)) e7.preventDefault();
            let shouldStopPropagation = true;
            if (!state.isPressed && !e7.repeat) {
              state.target = e7.currentTarget;
              state.isPressed = true;
              state.pointerType = "keyboard";
              shouldStopPropagation = triggerPressStart(e7, "keyboard");
            }
            let originalTarget = e7.currentTarget;
            let pressUp = (e8) => {
              if ($d27d541f9569d26d$var$isValidKeyboardEvent(e8, originalTarget) && !e8.repeat && (0, $23f2114a1b82827e$export$4282f70798064fe0)(originalTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e8)) && state.target) triggerPressUpEvent($d27d541f9569d26d$var$createEvent(state.target, e8), "keyboard");
            };
            addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e7.currentTarget), "keyup", (0, $a4e76a5424781910$export$e08e3b67e392101e)(pressUp, onKeyUp), true);
            if (shouldStopPropagation) e7.stopPropagation();
            if (e7.metaKey && (0, $2add3ce32c6007eb$export$9ac100e40613ea10)()) state.metaKeyEvents?.set(e7.key, e7.nativeEvent);
          } else if (e7.key === "Meta") state.metaKeyEvents = /* @__PURE__ */ new Map();
        },
        onClick(e7) {
          if (e7 && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          if (e7 && e7.button === 0 && !state.isTriggeringEvent && !(0, $caaf0dd3060ed57c$export$95185d699e05d4d7).isOpening) {
            let shouldStopPropagation = true;
            if (isDisabled) e7.preventDefault();
            if (!state.ignoreEmulatedMouseEvents && !state.isPressed && (state.pointerType === "virtual" || (0, $b5c62b033c25b96d$export$60278871457622de)(e7.nativeEvent))) {
              let stopPressStart = triggerPressStart(e7, "virtual");
              let stopPressUp = triggerPressUpEvent(e7, "virtual");
              let stopPressEnd = triggerPressEndEvent(e7, "virtual");
              triggerClick(e7);
              shouldStopPropagation = stopPressStart && stopPressUp && stopPressEnd;
            } else if (state.isPressed && state.pointerType !== "keyboard") {
              let pointerType = state.pointerType || e7.nativeEvent.pointerType || "virtual";
              let stopPressUp = triggerPressUpEvent($d27d541f9569d26d$var$createEvent(e7.currentTarget, e7), pointerType);
              let stopPressEnd = triggerPressEndEvent($d27d541f9569d26d$var$createEvent(e7.currentTarget, e7), pointerType, true);
              shouldStopPropagation = stopPressUp && stopPressEnd;
              state.isOverTarget = false;
              triggerClick(e7);
              cancelEvent(e7);
            }
            state.ignoreEmulatedMouseEvents = false;
            if (shouldStopPropagation) e7.stopPropagation();
          }
        }
      };
      let onKeyUp = (e7) => {
        if (state.isPressed && state.target && $d27d541f9569d26d$var$isValidKeyboardEvent(e7, state.target)) {
          if ($d27d541f9569d26d$var$shouldPreventDefaultKeyboard((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7), e7.key)) e7.preventDefault();
          let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
          let wasPressed = (0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, target);
          triggerPressEndEvent($d27d541f9569d26d$var$createEvent(state.target, e7), "keyboard", wasPressed);
          if (wasPressed) triggerSyntheticClick(e7, state.target);
          removeAllGlobalListeners();
          if (e7.key !== "Enter" && $d27d541f9569d26d$var$isHTMLAnchorLink(state.target) && (0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, target) && !e7[$d27d541f9569d26d$var$LINK_CLICKED]) {
            e7[$d27d541f9569d26d$var$LINK_CLICKED] = true;
            (0, $caaf0dd3060ed57c$export$95185d699e05d4d7)(state.target, e7, false);
          }
          state.isPressed = false;
          state.metaKeyEvents?.delete(e7.key);
        } else if (e7.key === "Meta" && state.metaKeyEvents?.size) {
          let events = state.metaKeyEvents;
          state.metaKeyEvents = void 0;
          for (let event of events.values()) state.target?.dispatchEvent(new KeyboardEvent("keyup", event));
        }
      };
      if (typeof PointerEvent !== "undefined") {
        pressProps2.onPointerDown = (e7) => {
          if (e7.button !== 0 || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          if ((0, $b5c62b033c25b96d$export$29bf1b5f2c56cf63)(e7.nativeEvent)) {
            state.pointerType = "virtual";
            return;
          }
          state.pointerType = e7.pointerType;
          let shouldStopPropagation = true;
          if (!state.isPressed) {
            state.isPressed = true;
            state.isOverTarget = true;
            state.activePointerId = e7.pointerId;
            state.target = e7.currentTarget;
            if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$16a4697467175487)(state.target);
            shouldStopPropagation = triggerPressStart(e7, state.pointerType);
            let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7);
            if ("releasePointerCapture" in target) {
              if ("hasPointerCapture" in target) {
                if (target.hasPointerCapture(e7.pointerId)) target.releasePointerCapture(e7.pointerId);
              } else target.releasePointerCapture(e7.pointerId);
            }
            addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e7.currentTarget), "pointerup", onPointerUp, false);
            addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e7.currentTarget), "pointercancel", onPointerCancel, false);
          }
          if (shouldStopPropagation) e7.stopPropagation();
        };
        pressProps2.onMouseDown = (e7) => {
          if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          if (e7.button === 0) {
            if (preventFocusOnPress) {
              let dispose = (0, $a92dc41f639950be$export$cabe61c495ee3649)(e7.target);
              if (dispose) state.disposables.push(dispose);
            }
            e7.stopPropagation();
          }
        };
        pressProps2.onPointerUp = (e7) => {
          if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7)) || state.pointerType === "virtual") return;
          if (e7.button === 0 && !state.isPressed) triggerPressUpEvent(e7, state.pointerType || e7.pointerType);
        };
        pressProps2.onPointerEnter = (e7) => {
          if (e7.pointerId === state.activePointerId && state.target && !state.isOverTarget && state.pointerType != null) {
            state.isOverTarget = true;
            triggerPressStart($d27d541f9569d26d$var$createEvent(state.target, e7), state.pointerType);
          }
        };
        pressProps2.onPointerLeave = (e7) => {
          if (e7.pointerId === state.activePointerId && state.target && state.isOverTarget && state.pointerType != null) {
            state.isOverTarget = false;
            triggerPressEndEvent($d27d541f9569d26d$var$createEvent(state.target, e7), state.pointerType, false);
            cancelOnPointerExit(e7);
          }
        };
        let onPointerUp = (e7) => {
          if (e7.pointerId === state.activePointerId && state.isPressed && e7.button === 0 && state.target) {
            if ((0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7)) && state.pointerType != null) {
              let clicked = false;
              let timeout = setTimeout(() => {
                if (state.isPressed && state.target instanceof HTMLElement) {
                  if (clicked) cancelEvent(e7);
                  else {
                    (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(state.target);
                    state.target.click();
                  }
                }
              }, 80);
              addGlobalListener(e7.currentTarget, "click", () => clicked = true, true);
              state.disposables.push(() => clearTimeout(timeout));
            } else cancelEvent(e7);
            state.isOverTarget = false;
          }
        };
        let onPointerCancel = (e7) => {
          cancelEvent(e7);
        };
        pressProps2.onDragStart = (e7) => {
          if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          cancelEvent(e7);
        };
      } else if (false) {
        pressProps2.onMouseDown = (e7) => {
          if (e7.button !== 0 || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          if (state.ignoreEmulatedMouseEvents) {
            e7.stopPropagation();
            return;
          }
          state.isPressed = true;
          state.isOverTarget = true;
          state.target = e7.currentTarget;
          state.pointerType = (0, $b5c62b033c25b96d$export$60278871457622de)(e7.nativeEvent) ? "virtual" : "mouse";
          let shouldStopPropagation = (0, flushSync)(() => triggerPressStart(e7, state.pointerType));
          if (shouldStopPropagation) e7.stopPropagation();
          if (preventFocusOnPress) {
            let dispose = (0, $a92dc41f639950be$export$cabe61c495ee3649)(e7.target);
            if (dispose) state.disposables.push(dispose);
          }
          addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)(e7.currentTarget), "mouseup", onMouseUp, false);
        };
        pressProps2.onMouseEnter = (e7) => {
          if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          let shouldStopPropagation = true;
          if (state.isPressed && !state.ignoreEmulatedMouseEvents && state.pointerType != null) {
            state.isOverTarget = true;
            shouldStopPropagation = triggerPressStart(e7, state.pointerType);
          }
          if (shouldStopPropagation) e7.stopPropagation();
        };
        pressProps2.onMouseLeave = (e7) => {
          if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          let shouldStopPropagation = true;
          if (state.isPressed && !state.ignoreEmulatedMouseEvents && state.pointerType != null) {
            state.isOverTarget = false;
            shouldStopPropagation = triggerPressEndEvent(e7, state.pointerType, false);
            cancelOnPointerExit(e7);
          }
          if (shouldStopPropagation) e7.stopPropagation();
        };
        pressProps2.onMouseUp = (e7) => {
          if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          if (!state.ignoreEmulatedMouseEvents && e7.button === 0 && !state.isPressed) triggerPressUpEvent(e7, state.pointerType || "mouse");
        };
        let onMouseUp = (e7) => {
          if (e7.button !== 0) return;
          if (state.ignoreEmulatedMouseEvents) {
            state.ignoreEmulatedMouseEvents = false;
            return;
          }
          if (state.target && (0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7)) && state.pointerType != null) ;
          else cancelEvent(e7);
          state.isOverTarget = false;
        };
        pressProps2.onTouchStart = (e7) => {
          if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          let touch = $d27d541f9569d26d$var$getTouchFromEvent(e7.nativeEvent);
          if (!touch) return;
          state.activePointerId = touch.identifier;
          state.ignoreEmulatedMouseEvents = true;
          state.isOverTarget = true;
          state.isPressed = true;
          state.target = e7.currentTarget;
          state.pointerType = "touch";
          if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$16a4697467175487)(state.target);
          let shouldStopPropagation = triggerPressStart($d27d541f9569d26d$var$createTouchEvent(state.target, e7), state.pointerType);
          if (shouldStopPropagation) e7.stopPropagation();
          addGlobalListener((0, $d447af545b77c9f1$export$f21a1ffae260145a)(e7.currentTarget), "scroll", onScroll, true);
        };
        pressProps2.onTouchMove = (e7) => {
          if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          if (!state.isPressed) {
            e7.stopPropagation();
            return;
          }
          let touch = $d27d541f9569d26d$var$getTouchById(e7.nativeEvent, state.activePointerId);
          let shouldStopPropagation = true;
          if (touch && $d27d541f9569d26d$var$isOverTarget(touch, e7.currentTarget)) {
            if (!state.isOverTarget && state.pointerType != null) {
              state.isOverTarget = true;
              shouldStopPropagation = triggerPressStart($d27d541f9569d26d$var$createTouchEvent(state.target, e7), state.pointerType);
            }
          } else if (state.isOverTarget && state.pointerType != null) {
            state.isOverTarget = false;
            shouldStopPropagation = triggerPressEndEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e7), state.pointerType, false);
            cancelOnPointerExit($d27d541f9569d26d$var$createTouchEvent(state.target, e7));
          }
          if (shouldStopPropagation) e7.stopPropagation();
        };
        pressProps2.onTouchEnd = (e7) => {
          if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          if (!state.isPressed) {
            e7.stopPropagation();
            return;
          }
          let touch = $d27d541f9569d26d$var$getTouchById(e7.nativeEvent, state.activePointerId);
          let shouldStopPropagation = true;
          if (touch && $d27d541f9569d26d$var$isOverTarget(touch, e7.currentTarget) && state.pointerType != null) {
            triggerPressUpEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e7), state.pointerType);
            shouldStopPropagation = triggerPressEndEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e7), state.pointerType);
            triggerSyntheticClick(e7.nativeEvent, state.target);
          } else if (state.isOverTarget && state.pointerType != null) shouldStopPropagation = triggerPressEndEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e7), state.pointerType, false);
          if (shouldStopPropagation) e7.stopPropagation();
          state.isPressed = false;
          state.activePointerId = null;
          state.isOverTarget = false;
          state.ignoreEmulatedMouseEvents = true;
          if (state.target && !allowTextSelectionOnPress) (0, $cbf007e418543821$export$b0d6fa1ab32e3295)(state.target);
          removeAllGlobalListeners();
        };
        pressProps2.onTouchCancel = (e7) => {
          if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          e7.stopPropagation();
          if (state.isPressed) cancelEvent($d27d541f9569d26d$var$createTouchEvent(state.target, e7));
        };
        let onScroll = (e7) => {
          if (state.isPressed && (0, $23f2114a1b82827e$export$4282f70798064fe0)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7), state.target)) cancelEvent({
            currentTarget: state.target,
            shiftKey: false,
            ctrlKey: false,
            metaKey: false,
            altKey: false
          });
        };
        pressProps2.onDragStart = (e7) => {
          if (!(0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) return;
          cancelEvent(e7);
        };
      }
      return pressProps2;
    }, [
      addGlobalListener,
      isDisabled,
      preventFocusOnPress,
      removeAllGlobalListeners,
      allowTextSelectionOnPress,
      cancelOnPointerExit,
      triggerPressStart,
      triggerClick,
      triggerSyntheticClick
    ]);
    (0, useEffect)(() => {
      if (!domRef || false) return;
      const ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(domRef.current);
      if (!ownerDocument || !ownerDocument.head || ownerDocument.getElementById($d27d541f9569d26d$var$STYLE_ID)) return;
      const style = ownerDocument.createElement("style");
      style.id = $d27d541f9569d26d$var$STYLE_ID;
      let nonce = (0, $2b2d34ff061957fb$export$2b85b721e524d74b)(ownerDocument);
      if (nonce) style.nonce = nonce;
      style.textContent = `
@layer {
  [${$d27d541f9569d26d$var$PRESSABLE_ATTRIBUTE}] {
    touch-action: pan-x pan-y pinch-zoom;
  }
}
    `.trim();
      ownerDocument.head.prepend(style);
    }, [
      domRef
    ]);
    (0, useEffect)(() => {
      let state = ref.current;
      return () => {
        if (!allowTextSelectionOnPress) (0, $cbf007e418543821$export$b0d6fa1ab32e3295)(state.target ?? void 0);
        for (let dispose of state.disposables) dispose();
        state.disposables = [];
      };
    }, [
      allowTextSelectionOnPress
    ]);
    return {
      isPressed: isPressedProp || isPressed,
      // oxlint-disable-next-line react/react-compiler
      pressProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(domProps, pressProps, {
        [$d27d541f9569d26d$var$PRESSABLE_ATTRIBUTE]: true
      })
    };
  }
  function $d27d541f9569d26d$var$isHTMLAnchorLink(target) {
    return target.tagName === "A" && target.hasAttribute("href");
  }
  function $d27d541f9569d26d$var$isValidKeyboardEvent(event, currentTarget) {
    const { key, code } = event;
    const element = currentTarget;
    const role = element.getAttribute("role");
    return (key === "Enter" || key === " " || key === "Spacebar" || code === "Space") && !(element instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element).HTMLInputElement && !$d27d541f9569d26d$var$isValidInputKey(element, key) || element instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(element).HTMLTextAreaElement || element.isContentEditable) && // Links should only trigger with Enter key
    !((role === "link" || !role && $d27d541f9569d26d$var$isHTMLAnchorLink(element)) && key !== "Enter");
  }
  function $d27d541f9569d26d$var$getTouchFromEvent(event) {
    const { targetTouches } = event;
    if (targetTouches.length > 0) return targetTouches[0];
    return null;
  }
  function $d27d541f9569d26d$var$getTouchById(event, pointerId) {
    const changedTouches = event.changedTouches;
    for (let i7 = 0; i7 < changedTouches.length; i7++) {
      const touch = changedTouches[i7];
      if (touch.identifier === pointerId) return touch;
    }
    return null;
  }
  function $d27d541f9569d26d$var$createTouchEvent(target, e7) {
    let clientX = 0;
    let clientY = 0;
    if (e7.targetTouches && e7.targetTouches.length === 1) {
      clientX = e7.targetTouches[0].clientX;
      clientY = e7.targetTouches[0].clientY;
    }
    return {
      currentTarget: target,
      shiftKey: e7.shiftKey,
      ctrlKey: e7.ctrlKey,
      metaKey: e7.metaKey,
      altKey: e7.altKey,
      clientX,
      clientY
    };
  }
  function $d27d541f9569d26d$var$createEvent(target, e7) {
    let clientX = e7.clientX;
    let clientY = e7.clientY;
    return {
      currentTarget: target,
      shiftKey: e7.shiftKey,
      ctrlKey: e7.ctrlKey,
      metaKey: e7.metaKey,
      altKey: e7.altKey,
      clientX,
      clientY,
      key: e7.key
    };
  }
  function $d27d541f9569d26d$var$getPointClientRect(point) {
    let offsetX = 0;
    let offsetY = 0;
    if (point.width !== void 0) offsetX = point.width / 2;
    else if (point.radiusX !== void 0) offsetX = point.radiusX;
    if (point.height !== void 0) offsetY = point.height / 2;
    else if (point.radiusY !== void 0) offsetY = point.radiusY;
    return {
      top: point.clientY - offsetY,
      right: point.clientX + offsetX,
      bottom: point.clientY + offsetY,
      left: point.clientX - offsetX
    };
  }
  function $d27d541f9569d26d$var$areRectanglesOverlapping(a15, b5) {
    if (a15.left > b5.right || b5.left > a15.right) return false;
    if (a15.top > b5.bottom || b5.top > a15.bottom) return false;
    return true;
  }
  function $d27d541f9569d26d$var$isOverTarget(point, target) {
    let rect = target.getBoundingClientRect();
    let pointRect = $d27d541f9569d26d$var$getPointClientRect(point);
    return $d27d541f9569d26d$var$areRectanglesOverlapping(rect, pointRect);
  }
  function $d27d541f9569d26d$var$shouldPreventDefaultUp(target) {
    if (target instanceof HTMLInputElement) return false;
    if (target instanceof HTMLButtonElement) return target.type !== "submit" && target.type !== "reset";
    if ($d27d541f9569d26d$var$isHTMLAnchorLink(target)) return false;
    return true;
  }
  function $d27d541f9569d26d$var$shouldPreventDefaultKeyboard(target, key) {
    if ((0, $2add3ce32c6007eb$export$9ac100e40613ea10)() && key === "Enter") return false;
    if (target instanceof HTMLInputElement) {
      if (key === "Enter" && (target.type === "checkbox" || target.type === "radio"))
        return false;
      return !$d27d541f9569d26d$var$isValidInputKey(target, key);
    }
    return $d27d541f9569d26d$var$shouldPreventDefaultUp(target);
  }
  var $d27d541f9569d26d$var$nonTextInputTypes = /* @__PURE__ */ new Set([
    "checkbox",
    "radio",
    "range",
    "color",
    "file",
    "image",
    "button",
    "submit",
    "reset"
  ]);
  function $d27d541f9569d26d$var$isValidInputKey(target, key) {
    return target.type === "checkbox" || target.type === "radio" ? key === " " : $d27d541f9569d26d$var$nonTextInputTypes.has(target.type);
  }

  // node_modules/react-aria/dist/private/interactions/Pressable.mjs
  init_react_shim();
  var $15e7830bf6471d45$export$27c701ed9e449e99 = /* @__PURE__ */ (0, react_shim_default).forwardRef(({ children, ...props }, ref) => {
    ref = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(ref);
    let { pressProps } = (0, $d27d541f9569d26d$export$45712eceda6fad21)({
      ...props,
      ref
    });
    let { focusableProps } = (0, $d1116acdf220c2da$export$4c014de7c8940b4c)(props, ref);
    let child = (0, react_shim_default).Children.only(children);
    (0, useEffect)(() => {
      if (false) return;
      let el = ref.current;
      if (!el || !(el instanceof (0, $d447af545b77c9f1$export$f21a1ffae260145a)(el).Element)) {
        console.error("<Pressable> child must forward its ref to a DOM element.");
        return;
      }
      if (!props.isDisabled && !(0, $3b8b240c1bf84ab9$export$4c063cf1350e6fed)(el)) {
        console.warn("<Pressable> child must be focusable. Please ensure the tabIndex prop is passed through.");
        return;
      }
      if (el.localName !== "button" && el.localName !== "input" && el.localName !== "select" && el.localName !== "textarea" && el.localName !== "a" && el.localName !== "area" && el.localName !== "summary") {
        let role = el.getAttribute("role");
        if (!role) console.warn("<Pressable> child must have an interactive ARIA role.");
        else if (
          // https://w3c.github.io/aria/#widget_roles
          role !== "application" && role !== "button" && role !== "checkbox" && role !== "combobox" && role !== "gridcell" && role !== "link" && role !== "menuitem" && role !== "menuitemcheckbox" && role !== "menuitemradio" && role !== "option" && role !== "radio" && role !== "searchbox" && role !== "separator" && role !== "slider" && role !== "spinbutton" && role !== "switch" && role !== "tab" && role !== "textbox" && role !== "treeitem"
        ) console.warn(`<Pressable> child must have an interactive ARIA role. Got "${role}".`);
      }
    }, [
      ref,
      props.isDisabled
    ]);
    let childRef = parseInt((0, react_shim_default).version, 10) < 19 ? child.ref : child.props.ref;
    return /* @__PURE__ */ (0, react_shim_default).cloneElement(child, {
      ...(0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(pressProps, focusableProps, child.props),
      // @ts-ignore
      // oxlint-disable-next-line react/react-compiler
      ref: (0, $4064df0d6f9620e1$export$c9058316764c140e)(childRef, ref)
    });
  });

  // node_modules/react-aria/dist/private/interactions/PressResponder.mjs
  init_react_shim();
  var $0d47b37c475c5231$export$3351871ee4b288b8 = /* @__PURE__ */ (0, react_shim_default).forwardRef(({ children, ...props }, ref) => {
    let isRegistered = (0, useRef)(false);
    let prevContext = (0, useContext)((0, $24f9a20f226ad820$export$5165eccb35aaadb5));
    let context = (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(prevContext || {}, {
      ...props,
      register() {
        isRegistered.current = true;
        if (prevContext) prevContext.register();
      }
    });
    context.ref = (0, $03e8ab2d84d7657a$export$4338b53315abf666)(ref || prevContext?.ref);
    (0, $b7115c395c64f7b5$export$4debdb1a3f0fa79e)(prevContext, context.ref);
    (0, useEffect)(() => {
      if (!isRegistered.current) {
        if (true) console.warn("A PressResponder was rendered without a pressable child. Either call the usePress hook, or wrap your DOM node with <Pressable> component.");
        isRegistered.current = true;
      }
    }, []);
    return /* @__PURE__ */ (0, react_shim_default).createElement((0, $24f9a20f226ad820$export$5165eccb35aaadb5).Provider, {
      value: context
    }, children);
  });
  function $0d47b37c475c5231$export$cf75428e0b9ed1ea({ children }) {
    let context = (0, useMemo)(() => ({
      register: () => {
      }
    }), []);
    return /* @__PURE__ */ (0, react_shim_default).createElement((0, $24f9a20f226ad820$export$5165eccb35aaadb5).Provider, {
      value: context
    }, children);
  }

  // node_modules/react-aria/dist/private/interactions/useHover.mjs
  init_react_shim();
  var $e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents = false;
  var $e969f22b6713ca4a$var$hoverCount = 0;
  function $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents() {
    $e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents = true;
    setTimeout(() => {
      $e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents = false;
    }, 500);
  }
  function $e969f22b6713ca4a$var$handleGlobalPointerEvent(e7) {
    if (e7.pointerType === "touch") $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents();
  }
  function $e969f22b6713ca4a$var$setupGlobalTouchEvents() {
    let ownerDocument = (0, $d447af545b77c9f1$export$b204af158042fbac)(null);
    if (typeof ownerDocument === "undefined") return;
    if ($e969f22b6713ca4a$var$hoverCount === 0) {
      if (typeof PointerEvent !== "undefined") ownerDocument.addEventListener("pointerup", $e969f22b6713ca4a$var$handleGlobalPointerEvent);
      else if (false) ownerDocument.addEventListener("touchend", $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents);
    }
    $e969f22b6713ca4a$var$hoverCount++;
    return () => {
      $e969f22b6713ca4a$var$hoverCount--;
      if ($e969f22b6713ca4a$var$hoverCount > 0) return;
      if (typeof PointerEvent !== "undefined") ownerDocument.removeEventListener("pointerup", $e969f22b6713ca4a$var$handleGlobalPointerEvent);
      else if (false) ownerDocument.removeEventListener("touchend", $e969f22b6713ca4a$var$setGlobalIgnoreEmulatedMouseEvents);
    };
  }
  function $e969f22b6713ca4a$export$ae780daf29e6d456(props) {
    let { onHoverStart, onHoverChange, onHoverEnd, isDisabled } = props;
    let [isHovered, setHovered] = (0, useState)(false);
    let state = (0, useRef)({
      isHovered: false,
      ignoreEmulatedMouseEvents: false,
      pointerType: "",
      target: null
    }).current;
    (0, useEffect)($e969f22b6713ca4a$var$setupGlobalTouchEvents, []);
    let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
    let { hoverProps, triggerHoverEnd } = (0, useMemo)(() => {
      let triggerHoverStart = (event, pointerType) => {
        state.pointerType = pointerType;
        if (isDisabled || pointerType === "touch" || state.isHovered || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(event.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(event))) return;
        state.isHovered = true;
        let target = event.currentTarget;
        state.target = target;
        addGlobalListener((0, $d447af545b77c9f1$export$b204af158042fbac)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(event)), "pointerover", (e7) => {
          if (state.isHovered && state.target && !(0, $23f2114a1b82827e$export$4282f70798064fe0)(state.target, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7)))
            triggerHoverEnd2(e7, e7.pointerType);
        }, {
          capture: true
        });
        if (onHoverStart) onHoverStart({
          type: "hoverstart",
          target,
          pointerType
        });
        if (onHoverChange) onHoverChange(true);
        setHovered(true);
      };
      let triggerHoverEnd2 = (event, pointerType) => {
        let target = state.target;
        state.pointerType = "";
        state.target = null;
        if (pointerType === "touch" || !state.isHovered || !target) return;
        state.isHovered = false;
        removeAllGlobalListeners();
        if (onHoverEnd) onHoverEnd({
          type: "hoverend",
          target,
          pointerType
        });
        if (onHoverChange) onHoverChange(false);
        setHovered(false);
      };
      let hoverProps2 = {};
      if (typeof PointerEvent !== "undefined") {
        hoverProps2.onPointerEnter = (e7) => {
          if ($e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents && e7.pointerType === "mouse") return;
          triggerHoverStart(e7, e7.pointerType);
        };
        hoverProps2.onPointerLeave = (e7) => {
          if (!isDisabled && (0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) triggerHoverEnd2(e7, e7.pointerType);
        };
      } else if (false) {
        hoverProps2.onTouchStart = () => {
          state.ignoreEmulatedMouseEvents = true;
        };
        hoverProps2.onMouseEnter = (e7) => {
          if (!state.ignoreEmulatedMouseEvents && !$e969f22b6713ca4a$var$globalIgnoreEmulatedMouseEvents) triggerHoverStart(e7, "mouse");
          state.ignoreEmulatedMouseEvents = false;
        };
        hoverProps2.onMouseLeave = (e7) => {
          if (!isDisabled && (0, $23f2114a1b82827e$export$4282f70798064fe0)(e7.currentTarget, (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7))) triggerHoverEnd2(e7, "mouse");
        };
      }
      return {
        hoverProps: hoverProps2,
        triggerHoverEnd: triggerHoverEnd2
      };
    }, [
      onHoverStart,
      onHoverChange,
      onHoverEnd,
      isDisabled,
      state,
      addGlobalListener,
      removeAllGlobalListeners
    ]);
    (0, useEffect)(() => {
      if (isDisabled) triggerHoverEnd({
        currentTarget: state.target
      }, state.pointerType);
    }, [
      isDisabled
    ]);
    return {
      hoverProps,
      isHovered
    };
  }

  // node_modules/react-aria/dist/private/interactions/useInteractOutside.mjs
  init_react_shim();
  function $e260d131964da0f9$export$872b660ac5a1ff98(props) {
    let { ref, onInteractOutside, isDisabled, onInteractOutsideStart } = props;
    let stateRef = (0, useRef)({
      isPointerDown: false,
      ignoreEmulatedMouseEvents: false
    });
    let onPointerDown = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)((e7) => {
      if (onInteractOutside && $e260d131964da0f9$var$isValidEvent(e7, ref)) {
        if (onInteractOutsideStart) onInteractOutsideStart(e7);
        stateRef.current.isPointerDown = true;
      }
    });
    let triggerInteractOutside = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)((e7) => {
      if (onInteractOutside) onInteractOutside(e7);
    });
    (0, useEffect)(() => {
      let state = stateRef.current;
      if (isDisabled) return;
      const element = ref.current;
      const documentObject = (0, $d447af545b77c9f1$export$b204af158042fbac)(element);
      if (typeof PointerEvent !== "undefined") {
        let onClick = (e7) => {
          if (state.isPointerDown && $e260d131964da0f9$var$isValidEvent(e7, ref)) triggerInteractOutside(e7);
          state.isPointerDown = false;
        };
        documentObject.addEventListener("pointerdown", onPointerDown, true);
        documentObject.addEventListener("click", onClick, true);
        return () => {
          documentObject.removeEventListener("pointerdown", onPointerDown, true);
          documentObject.removeEventListener("click", onClick, true);
        };
      } else if (false) {
        let onMouseUp = (e7) => {
          if (state.ignoreEmulatedMouseEvents) state.ignoreEmulatedMouseEvents = false;
          else if (state.isPointerDown && $e260d131964da0f9$var$isValidEvent(e7, ref)) triggerInteractOutside(e7);
          state.isPointerDown = false;
        };
        let onTouchEnd = (e7) => {
          state.ignoreEmulatedMouseEvents = true;
          if (state.isPointerDown && $e260d131964da0f9$var$isValidEvent(e7, ref)) triggerInteractOutside(e7);
          state.isPointerDown = false;
        };
        documentObject.addEventListener("mousedown", onPointerDown, true);
        documentObject.addEventListener("mouseup", onMouseUp, true);
        documentObject.addEventListener("touchstart", onPointerDown, true);
        documentObject.addEventListener("touchend", onTouchEnd, true);
        return () => {
          documentObject.removeEventListener("mousedown", onPointerDown, true);
          documentObject.removeEventListener("mouseup", onMouseUp, true);
          documentObject.removeEventListener("touchstart", onPointerDown, true);
          documentObject.removeEventListener("touchend", onTouchEnd, true);
        };
      }
    }, [
      ref,
      isDisabled
    ]);
  }
  function $e260d131964da0f9$var$isValidEvent(event, ref) {
    if (event.button > 0) return false;
    let target = (0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(event);
    if (target) {
      const ownerDocument = target.ownerDocument;
      if (!ownerDocument || !(0, $23f2114a1b82827e$export$4282f70798064fe0)(ownerDocument.documentElement, target)) return false;
      if (target.closest("[data-react-aria-top-layer]")) return false;
    }
    if (!ref.current) return false;
    return !event.composedPath().includes(ref.current);
  }

  // node_modules/react-aria/dist/private/interactions/useMove.mjs
  init_react_shim();
  function $1dfdc54e7eb53ba0$export$36da96379f79f245(props) {
    let { onMoveStart, onMove, onMoveEnd } = props;
    let state = (0, useRef)({
      didMove: false,
      lastPosition: null,
      id: null
    });
    let { addGlobalListener, removeGlobalListener } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
    let move = (0, useCallback)((originalEvent, pointerType, deltaX, deltaY) => {
      if (deltaX === 0 && deltaY === 0) return;
      if (!state.current.didMove) {
        state.current.didMove = true;
        onMoveStart?.({
          type: "movestart",
          pointerType,
          shiftKey: originalEvent.shiftKey,
          metaKey: originalEvent.metaKey,
          ctrlKey: originalEvent.ctrlKey,
          altKey: originalEvent.altKey
        });
      }
      onMove?.({
        type: "move",
        pointerType,
        deltaX,
        deltaY,
        shiftKey: originalEvent.shiftKey,
        metaKey: originalEvent.metaKey,
        ctrlKey: originalEvent.ctrlKey,
        altKey: originalEvent.altKey
      });
    }, [
      onMoveStart,
      onMove,
      state
    ]);
    let moveEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(move);
    let end = (0, useCallback)((originalEvent, pointerType) => {
      (0, $cbf007e418543821$export$b0d6fa1ab32e3295)();
      if (state.current.didMove) onMoveEnd?.({
        type: "moveend",
        pointerType,
        shiftKey: originalEvent.shiftKey,
        metaKey: originalEvent.metaKey,
        ctrlKey: originalEvent.ctrlKey,
        altKey: originalEvent.altKey
      });
    }, [
      onMoveEnd,
      state
    ]);
    let endEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(end);
    let moveProps = (0, useMemo)(() => {
      let moveProps2 = {};
      let start = () => {
        (0, $cbf007e418543821$export$16a4697467175487)();
        state.current.didMove = false;
      };
      if (typeof PointerEvent === "undefined" && false) {
        let onMouseMove = (e7) => {
          if (e7.button === 0) {
            moveEvent(e7, "mouse", e7.pageX - (state.current.lastPosition?.pageX ?? 0), e7.pageY - (state.current.lastPosition?.pageY ?? 0));
            state.current.lastPosition = {
              pageX: e7.pageX,
              pageY: e7.pageY
            };
          }
        };
        let onMouseUp = (e7) => {
          if (e7.button === 0) {
            endEvent(e7, "mouse");
            let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7));
            removeGlobalListener(ownerWindow, "mousemove", onMouseMove, false);
            removeGlobalListener(ownerWindow, "mouseup", onMouseUp, false);
          }
        };
        moveProps2.onMouseDown = (e7) => {
          if (e7.button === 0) {
            start();
            e7.stopPropagation();
            e7.preventDefault();
            state.current.lastPosition = {
              pageX: e7.pageX,
              pageY: e7.pageY
            };
            let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7));
            addGlobalListener(ownerWindow, "mousemove", onMouseMove, false);
            addGlobalListener(ownerWindow, "mouseup", onMouseUp, false);
          }
        };
        let onTouchMove = (e7) => {
          let touch = [
            ...e7.changedTouches
          ].findIndex(({ identifier }) => identifier === state.current.id);
          if (touch >= 0) {
            let { pageX, pageY } = e7.changedTouches[touch];
            moveEvent(e7, "touch", pageX - (state.current.lastPosition?.pageX ?? 0), pageY - (state.current.lastPosition?.pageY ?? 0));
            state.current.lastPosition = {
              pageX,
              pageY
            };
          }
        };
        let onTouchEnd = (e7) => {
          let touch = [
            ...e7.changedTouches
          ].findIndex(({ identifier }) => identifier === state.current.id);
          if (touch >= 0) {
            endEvent(e7, "touch");
            state.current.id = null;
            let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7));
            removeGlobalListener(ownerWindow, "touchmove", onTouchMove);
            removeGlobalListener(ownerWindow, "touchend", onTouchEnd);
            removeGlobalListener(ownerWindow, "touchcancel", onTouchEnd);
          }
        };
        moveProps2.onTouchStart = (e7) => {
          if (e7.changedTouches.length === 0 || state.current.id != null) return;
          let { pageX, pageY, identifier } = e7.changedTouches[0];
          start();
          e7.stopPropagation();
          e7.preventDefault();
          state.current.lastPosition = {
            pageX,
            pageY
          };
          state.current.id = identifier;
          let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7));
          addGlobalListener(ownerWindow, "touchmove", onTouchMove, false);
          addGlobalListener(ownerWindow, "touchend", onTouchEnd, false);
          addGlobalListener(ownerWindow, "touchcancel", onTouchEnd, false);
        };
      } else {
        let onPointerMove = (e7) => {
          if (e7.pointerId === state.current.id) {
            let pointerType = e7.pointerType || "mouse";
            moveEvent(e7, pointerType, e7.pageX - (state.current.lastPosition?.pageX ?? 0), e7.pageY - (state.current.lastPosition?.pageY ?? 0));
            state.current.lastPosition = {
              pageX: e7.pageX,
              pageY: e7.pageY
            };
          }
        };
        let onPointerUp = (e7) => {
          if (e7.pointerId === state.current.id) {
            let pointerType = e7.pointerType || "mouse";
            endEvent(e7, pointerType);
            state.current.id = null;
            let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7));
            removeGlobalListener(ownerWindow, "pointermove", onPointerMove, false);
            removeGlobalListener(ownerWindow, "pointerup", onPointerUp, false);
            removeGlobalListener(ownerWindow, "pointercancel", onPointerUp, false);
          }
        };
        moveProps2.onPointerDown = (e7) => {
          if (e7.button === 0 && state.current.id == null) {
            start();
            e7.stopPropagation();
            e7.preventDefault();
            state.current.lastPosition = {
              pageX: e7.pageX,
              pageY: e7.pageY
            };
            state.current.id = e7.pointerId;
            let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)((0, $23f2114a1b82827e$export$e58f029f0fbfdb29)(e7));
            addGlobalListener(ownerWindow, "pointermove", onPointerMove, false);
            addGlobalListener(ownerWindow, "pointerup", onPointerUp, false);
            addGlobalListener(ownerWindow, "pointercancel", onPointerUp, false);
          }
        };
      }
      let triggerKeyboardMove = (e7, deltaX, deltaY) => {
        start();
        moveEvent(e7, "keyboard", deltaX, deltaY);
        endEvent(e7, "keyboard");
      };
      moveProps2.onKeyDown = (e7) => {
        switch (e7.key) {
          case "Left":
          case "ArrowLeft":
            e7.preventDefault();
            e7.stopPropagation();
            triggerKeyboardMove(e7, -1, 0);
            break;
          case "Right":
          case "ArrowRight":
            e7.preventDefault();
            e7.stopPropagation();
            triggerKeyboardMove(e7, 1, 0);
            break;
          case "Up":
          case "ArrowUp":
            e7.preventDefault();
            e7.stopPropagation();
            triggerKeyboardMove(e7, 0, -1);
            break;
          case "Down":
          case "ArrowDown":
            e7.preventDefault();
            e7.stopPropagation();
            triggerKeyboardMove(e7, 0, 1);
            break;
        }
      };
      return moveProps2;
    }, [
      addGlobalListener,
      removeGlobalListener,
      state
    ]);
    return {
      moveProps
    };
  }

  // node_modules/react-aria/dist/private/utils/useEvent.mjs
  init_react_shim();
  function $600b3cf69ae46262$export$90fc3a17d93f704c(ref, event, listener, options) {
    let handleEvent = (0, $fe16bffc7a557bf0$export$7f54fc3180508a52)(listener);
    let isDisabled = listener == null;
    (0, useEffect)(() => {
      if (isDisabled || ref.current == null) return;
      return (0, $d447af545b77c9f1$export$f531f92e2a15358f)(ref.current, event, handleEvent, options);
    }, [
      ref,
      event,
      options,
      isDisabled
    ]);
  }

  // node_modules/react-aria/dist/private/interactions/useScrollWheel.mjs
  init_react_shim();
  function $14554ba6a2007b17$export$2123ff2b87c81ca(props, ref) {
    let { onScroll, isDisabled } = props;
    let onScrollHandler = (0, useCallback)((e7) => {
      if (e7.ctrlKey) return;
      e7.preventDefault();
      e7.stopPropagation();
      if (onScroll) onScroll({
        deltaX: e7.deltaX,
        deltaY: e7.deltaY
      });
    }, [
      onScroll
    ]);
    (0, $600b3cf69ae46262$export$90fc3a17d93f704c)(ref, "wheel", isDisabled ? void 0 : onScrollHandler);
  }

  // node_modules/react-aria/dist/private/utils/useDescription.mjs
  init_react_shim();
  var $121970af65029459$var$descriptionId = 0;
  var $121970af65029459$var$descriptionNodes = /* @__PURE__ */ new Map();
  function $121970af65029459$export$f8aeda7b10753fa1(description) {
    let [id, setId] = (0, useState)();
    (0, $c4867b2f328c2698$export$e5c5a5f917a5871c)(() => {
      if (!description) return;
      let desc = $121970af65029459$var$descriptionNodes.get(description);
      if (!desc) {
        let id2 = `react-aria-description-${$121970af65029459$var$descriptionId++}`;
        setId(id2);
        let node = document.createElement("div");
        node.id = id2;
        node.style.display = "none";
        node.textContent = description;
        document.body.appendChild(node);
        desc = {
          refCount: 0,
          element: node
        };
        $121970af65029459$var$descriptionNodes.set(description, desc);
      } else setId(desc.element.id);
      desc.refCount++;
      return () => {
        if (desc && --desc.refCount === 0) {
          desc.element.remove();
          $121970af65029459$var$descriptionNodes.delete(description);
        }
      };
    }, [
      description
    ]);
    return {
      "aria-describedby": description ? id : void 0
    };
  }

  // node_modules/react-aria/dist/private/interactions/useLongPress.mjs
  init_react_shim();
  var $7b01448eaad0fe7c$var$DEFAULT_THRESHOLD = 500;
  function $7b01448eaad0fe7c$export$c24ed0104d07eab9(props) {
    let { isDisabled, pointerType, onLongPressStart, onLongPressEnd, onLongPress, threshold = $7b01448eaad0fe7c$var$DEFAULT_THRESHOLD, accessibilityDescription } = props;
    const timeRef = (0, useRef)(void 0);
    let { addGlobalListener, removeAllGlobalListeners } = (0, $48a7d519b337145d$export$4eaf04e54aa8eed6)();
    let isAcceptedPointerType = (e7) => pointerType ? e7.pointerType === pointerType : e7.pointerType === "mouse" || e7.pointerType === "touch";
    let { pressProps } = (0, $d27d541f9569d26d$export$45712eceda6fad21)({
      isDisabled,
      onPressStart(e7) {
        e7.continuePropagation();
        if (isAcceptedPointerType(e7)) {
          if (onLongPressStart) onLongPressStart({
            ...e7,
            type: "longpressstart"
          });
          timeRef.current = setTimeout(() => {
            e7.target.dispatchEvent(new PointerEvent("pointercancel", {
              bubbles: true
            }));
            addGlobalListener(e7.target, "click", (e8) => e8.preventDefault(), {
              once: true
            });
            if ((0, $d447af545b77c9f1$export$b204af158042fbac)(e7.target).activeElement !== e7.target) (0, $1969ac565cfec8d0$export$de79e2c695e052f3)(e7.target);
            if (onLongPress) onLongPress({
              ...e7,
              type: "longpress"
            });
            timeRef.current = void 0;
          }, threshold);
          if (e7.pointerType === "touch") addGlobalListener(e7.target, "contextmenu", (e8) => e8.preventDefault(), {
            once: true
          });
          let ownerWindow = (0, $d447af545b77c9f1$export$f21a1ffae260145a)(e7.target);
          addGlobalListener(ownerWindow, "pointerup", () => {
            setTimeout(() => {
              removeAllGlobalListeners();
            }, 100);
          }, {
            once: true
          });
        }
      },
      onPressEnd(e7) {
        if (timeRef.current) clearTimeout(timeRef.current);
        if (onLongPressEnd && isAcceptedPointerType(e7)) onLongPressEnd({
          ...e7,
          type: "longpressend"
        });
      }
    });
    let descriptionProps = (0, $121970af65029459$export$f8aeda7b10753fa1)(onLongPress && !isDisabled ? accessibilityDescription : void 0);
    return {
      longPressProps: (0, $bbaa08b3cd72f041$export$9d1611c77c2fe928)(pressProps, descriptionProps)
    };
  }

  // node_modules/@headlessui/react/dist/utils/env.js
  var i = Object.defineProperty;
  var d = (t6, e7, n8) => e7 in t6 ? i(t6, e7, { enumerable: true, configurable: true, writable: true, value: n8 }) : t6[e7] = n8;
  var r2 = (t6, e7, n8) => (d(t6, typeof e7 != "symbol" ? e7 + "" : e7, n8), n8);
  var o = class {
    constructor() {
      r2(this, "current", this.detect());
      r2(this, "handoffState", "pending");
      r2(this, "currentId", 0);
    }
    set(e7) {
      this.current !== e7 && (this.handoffState = "pending", this.currentId = 0, this.current = e7);
    }
    reset() {
      this.set(this.detect());
    }
    nextId() {
      return ++this.currentId;
    }
    get isServer() {
      return this.current === "server";
    }
    get isClient() {
      return this.current === "client";
    }
    detect() {
      return typeof window == "undefined" || typeof document == "undefined" ? "server" : "client";
    }
    handoff() {
      this.handoffState === "pending" && (this.handoffState = "complete");
    }
    get isHandoffComplete() {
      return this.handoffState === "complete";
    }
  };
  var s = new o();

  // node_modules/@headlessui/react/dist/utils/owner.js
  function l(n8) {
    var u11;
    return s.isServer ? null : n8 == null ? document : (u11 = n8 == null ? void 0 : n8.ownerDocument) != null ? u11 : document;
  }
  function r3(n8) {
    var u11, o9;
    return s.isServer ? null : n8 == null ? document : (o9 = (u11 = n8 == null ? void 0 : n8.getRootNode) == null ? void 0 : u11.call(n8)) != null ? o9 : document;
  }
  function e(n8) {
    var u11, o9;
    return (o9 = (u11 = r3(n8)) == null ? void 0 : u11.activeElement) != null ? o9 : null;
  }
  function d2(n8) {
    return e(n8) === n8;
  }

  // node_modules/@headlessui/react/dist/utils/micro-task.js
  function t(e7) {
    typeof queueMicrotask == "function" ? queueMicrotask(e7) : Promise.resolve().then(e7).catch((o9) => setTimeout(() => {
      throw o9;
    }));
  }

  // node_modules/@headlessui/react/dist/utils/disposables.js
  function o2() {
    let s12 = [], r10 = { addEventListener(e7, t6, n8, i7) {
      return e7.addEventListener(t6, n8, i7), r10.add(() => e7.removeEventListener(t6, n8, i7));
    }, requestAnimationFrame(...e7) {
      let t6 = requestAnimationFrame(...e7);
      return r10.add(() => cancelAnimationFrame(t6));
    }, nextFrame(...e7) {
      return r10.requestAnimationFrame(() => r10.requestAnimationFrame(...e7));
    }, setTimeout(...e7) {
      let t6 = setTimeout(...e7);
      return r10.add(() => clearTimeout(t6));
    }, microTask(...e7) {
      let t6 = { current: true };
      return t(() => {
        t6.current && e7[0]();
      }), r10.add(() => {
        t6.current = false;
      });
    }, style(e7, t6, n8) {
      let i7 = e7.style.getPropertyValue(t6);
      return Object.assign(e7.style, { [t6]: n8 }), this.add(() => {
        Object.assign(e7.style, { [t6]: i7 });
      });
    }, group(e7) {
      let t6 = o2();
      return e7(t6), this.add(() => t6.dispose());
    }, add(e7) {
      return s12.includes(e7) || s12.push(e7), () => {
        let t6 = s12.indexOf(e7);
        if (t6 >= 0) for (let n8 of s12.splice(t6, 1)) n8();
      };
    }, dispose() {
      for (let e7 of s12.splice(0)) e7();
    } };
    return r10;
  }

  // node_modules/@headlessui/react/dist/hooks/use-disposables.js
  init_react_shim();
  function p() {
    let [e7] = useState(o2);
    return useEffect(() => () => e7.dispose(), [e7]), e7;
  }

  // node_modules/@headlessui/react/dist/hooks/use-iso-morphic-effect.js
  init_react_shim();
  var n = (e7, t6) => {
    s.isServer ? useEffect(e7, t6) : useLayoutEffect(e7, t6);
  };

  // node_modules/@headlessui/react/dist/hooks/use-latest-value.js
  init_react_shim();
  function s2(e7) {
    let r10 = useRef(e7);
    return n(() => {
      r10.current = e7;
    }, [e7]), r10;
  }

  // node_modules/@headlessui/react/dist/hooks/use-event.js
  init_react_shim();
  var o3 = function(t6) {
    let e7 = s2(t6);
    return react_shim_default.useCallback((...r10) => e7.current(...r10), [e7]);
  };

  // node_modules/@headlessui/react/dist/hooks/use-active-press.js
  init_react_shim();
  function E(e7) {
    let t6 = e7.width / 2, n8 = e7.height / 2;
    return { top: e7.clientY - n8, right: e7.clientX + t6, bottom: e7.clientY + n8, left: e7.clientX - t6 };
  }
  function P(e7, t6) {
    return !(!e7 || !t6 || e7.right < t6.left || e7.left > t6.right || e7.bottom < t6.top || e7.top > t6.bottom);
  }
  function w({ disabled: e7 = false } = {}) {
    let t6 = useRef(null), [n8, l8] = useState(false), r10 = p(), o9 = o3(() => {
      t6.current = null, l8(false), r10.dispose();
    }), f11 = o3((s12) => {
      if (r10.dispose(), t6.current === null) {
        t6.current = s12.currentTarget, l8(true);
        {
          let i7 = l(s12.currentTarget);
          r10.addEventListener(i7, "pointerup", o9, false), r10.addEventListener(i7, "pointermove", (c11) => {
            if (t6.current) {
              let p6 = E(c11);
              l8(P(p6, t6.current.getBoundingClientRect()));
            }
          }, false), r10.addEventListener(i7, "pointercancel", o9, false);
        }
      }
    });
    return { pressed: n8, pressProps: e7 ? {} : { onPointerDown: f11, onPointerUp: o9, onClick: o9 } };
  }

  // node_modules/@headlessui/react/dist/hooks/use-slot.js
  init_react_shim();
  function n2(e7) {
    return useMemo(() => e7, Object.values(e7));
  }

  // node_modules/@headlessui/react/dist/internal/disabled.js
  init_react_shim();
  var e2 = createContext(void 0);
  function a() {
    return useContext(e2);
  }
  function l2({ value: t6, children: o9 }) {
    return react_shim_default.createElement(e2.Provider, { value: t6 }, o9);
  }

  // node_modules/@headlessui/react/dist/utils/class-names.js
  function t2(...r10) {
    return Array.from(new Set(r10.flatMap((n8) => typeof n8 == "string" ? n8.split(" ") : []))).filter(Boolean).join(" ");
  }

  // node_modules/@headlessui/react/dist/utils/match.js
  function u(r10, n8, ...a15) {
    if (r10 in n8) {
      let e7 = n8[r10];
      return typeof e7 == "function" ? e7(...a15) : e7;
    }
    let t6 = new Error(`Tried to handle "${r10}" but there is no handler defined. Only defined handlers are: ${Object.keys(n8).map((e7) => `"${e7}"`).join(", ")}.`);
    throw Error.captureStackTrace && Error.captureStackTrace(t6, u), t6;
  }

  // node_modules/@headlessui/react/dist/utils/render.js
  init_react_shim();
  var A = ((a15) => (a15[a15.None = 0] = "None", a15[a15.RenderStrategy = 1] = "RenderStrategy", a15[a15.Static = 2] = "Static", a15))(A || {}), C = ((t6) => (t6[t6.Unmount = 0] = "Unmount", t6[t6.Hidden = 1] = "Hidden", t6))(C || {});
  function K() {
    let e7 = I();
    return useCallback((r10) => U({ mergeRefs: e7, ...r10 }), [e7]);
  }
  function U({ ourProps: e7, theirProps: r10, slot: t6, defaultTag: a15, features: o9, visible: n8 = true, name: i7, mergeRefs: l8 }) {
    l8 = l8 != null ? l8 : H;
    let s12 = P2(r10, e7);
    if (n8) return F(s12, t6, a15, i7, l8);
    let y4 = o9 != null ? o9 : 0;
    if (y4 & 2) {
      let { static: f11 = false, ...u11 } = s12;
      if (f11) return F(u11, t6, a15, i7, l8);
    }
    if (y4 & 1) {
      let { unmount: f11 = true, ...u11 } = s12;
      return u(f11 ? 0 : 1, { [0]() {
        return null;
      }, [1]() {
        return F({ ...u11, hidden: true, style: { display: "none" } }, t6, a15, i7, l8);
      } });
    }
    return F(s12, t6, a15, i7, l8);
  }
  function F(e7, r10 = {}, t6, a15, o9) {
    let { as: n8 = t6, children: i7, refName: l8 = "ref", ...s12 } = h(e7, ["unmount", "static"]), y4 = e7.ref !== void 0 ? { [l8]: e7.ref } : {}, f11 = typeof i7 == "function" ? i7(r10) : i7;
    f11 = E2(f11), "className" in s12 && s12.className && typeof s12.className == "function" && (s12.className = s12.className(r10)), s12["aria-labelledby"] && s12["aria-labelledby"] === s12.id && (s12["aria-labelledby"] = void 0);
    let u11 = {};
    if (r10) {
      let d5 = false, p6 = [];
      for (let [c11, T5] of Object.entries(r10)) typeof T5 == "boolean" && (d5 = true), T5 === true && p6.push(c11.replace(/([A-Z])/g, (g3) => `-${g3.toLowerCase()}`));
      if (d5) {
        u11["data-headlessui-state"] = p6.join(" ");
        for (let c11 of p6) u11[`data-${c11}`] = "";
      }
    }
    if (b(n8) && (Object.keys(m(s12)).length > 0 || Object.keys(m(u11)).length > 0)) if (!isValidElement(f11) || Array.isArray(f11) && f11.length > 1 || L(f11)) {
      if (Object.keys(m(s12)).length > 0) throw new Error(['Passing props on "Fragment"!', "", `The current component <${a15} /> is rendering a "Fragment".`, "However we need to passthrough the following props:", Object.keys(m(s12)).concat(Object.keys(m(u11))).map((d5) => `  - ${d5}`).join(`
`), "", "You can apply a few solutions:", ['Add an `as="..."` prop, to ensure that we render an actual element instead of a "Fragment".', "Render a single element as the child so that we can forward the props onto that element."].map((d5) => `  - ${d5}`).join(`
`)].join(`
`));
    } else {
      let d5 = f11.props, p6 = d5 == null ? void 0 : d5.className, c11 = typeof p6 == "function" ? (...R2) => t2(p6(...R2), s12.className) : t2(p6, s12.className), T5 = c11 ? { className: c11 } : {}, g3 = P2(f11.props, m(h(s12, ["ref"])));
      for (let R2 in u11) R2 in g3 && delete u11[R2];
      return cloneElement(f11, Object.assign({}, g3, u11, y4, { ref: o9(D(f11), y4.ref) }, T5));
    }
    return createElement(n8, Object.assign({}, h(s12, ["ref"]), !b(n8) && y4, !b(n8) && u11), f11);
  }
  function I() {
    let e7 = useRef([]), r10 = useCallback((t6) => {
      for (let a15 of e7.current) a15 != null && (typeof a15 == "function" ? a15(t6) : a15.current = t6);
    }, []);
    return (...t6) => {
      if (!t6.every((a15) => a15 == null)) return e7.current = t6, r10;
    };
  }
  function H(...e7) {
    return e7.every((r10) => r10 == null) ? void 0 : (r10) => {
      for (let t6 of e7) t6 != null && (typeof t6 == "function" ? t6(r10) : t6.current = r10);
    };
  }
  function P2(...e7) {
    var a15;
    if (e7.length === 0) return {};
    if (e7.length === 1) return e7[0];
    let r10 = {}, t6 = {};
    for (let o9 of e7) for (let n8 in o9) n8.startsWith("on") && typeof o9[n8] == "function" ? ((a15 = t6[n8]) != null || (t6[n8] = []), t6[n8].push(o9[n8])) : r10[n8] = o9[n8];
    if (r10.disabled || r10["aria-disabled"]) for (let o9 in t6) /^(on(?:Click|Pointer|Mouse|Key)(?:Down|Up|Press)?)$/.test(o9) && (t6[o9] = [(n8) => {
      var i7;
      return (i7 = n8 == null ? void 0 : n8.preventDefault) == null ? void 0 : i7.call(n8);
    }]);
    for (let o9 in t6) Object.assign(r10, { [o9](n8, ...i7) {
      let l8 = t6[o9];
      for (let s12 of l8) {
        if ((n8 instanceof Event || (n8 == null ? void 0 : n8.nativeEvent) instanceof Event) && n8.defaultPrevented) return;
        s12(n8, ...i7);
      }
    } });
    return r10;
  }
  function V(...e7) {
    var a15;
    if (e7.length === 0) return {};
    if (e7.length === 1) return e7[0];
    let r10 = {}, t6 = {};
    for (let o9 of e7) for (let n8 in o9) n8.startsWith("on") && typeof o9[n8] == "function" ? ((a15 = t6[n8]) != null || (t6[n8] = []), t6[n8].push(o9[n8])) : r10[n8] = o9[n8];
    for (let o9 in t6) Object.assign(r10, { [o9](...n8) {
      let i7 = t6[o9];
      for (let l8 of i7) l8 == null || l8(...n8);
    } });
    return r10;
  }
  function Y(e7) {
    var r10;
    return Object.assign(forwardRef(e7), { displayName: (r10 = e7.displayName) != null ? r10 : e7.name });
  }
  function m(e7) {
    let r10 = Object.assign({}, e7);
    for (let t6 in r10) r10[t6] === void 0 && delete r10[t6];
    return r10;
  }
  function h(e7, r10 = []) {
    let t6 = Object.assign({}, e7);
    for (let a15 of r10) a15 in t6 && delete t6[a15];
    return t6;
  }
  function D(e7) {
    return react_shim_default.version.split(".")[0] >= "19" ? e7.props.ref : e7.ref;
  }
  function E2(e7) {
    if (e7 != null && e7.$$typeof === /* @__PURE__ */ Symbol.for("react.lazy")) {
      let r10 = e7._payload;
      if (r10 != null && r10.status === "fulfilled") return E2(r10.value);
    }
    return e7;
  }
  function b(e7) {
    return e7 === Fragment || e7 === /* @__PURE__ */ Symbol.for("react.fragment");
  }
  function L(e7) {
    return b(e7.type);
  }

  // node_modules/@headlessui/react/dist/hooks/use-controllable.js
  init_react_shim();
  function b2(l8, r10, c11) {
    let [i7, s12] = useState(c11), e7 = l8 !== void 0, t6 = useRef(e7), u11 = useRef(false), d5 = useRef(false);
    return e7 && !t6.current && !u11.current ? (u11.current = true, t6.current = e7, console.error("A component is changing from uncontrolled to controlled. This may be caused by the value changing from undefined to a defined value, which should not happen.")) : !e7 && t6.current && !d5.current && (d5.current = true, t6.current = e7, console.error("A component is changing from controlled to uncontrolled. This may be caused by the value changing from a defined value to undefined, which should not happen.")), [e7 ? l8 : i7, o3((n8) => (e7 || flushSync(() => s12(n8)), r10 == null ? void 0 : r10(n8)))];
  }

  // node_modules/@headlessui/react/dist/hooks/use-default-value.js
  init_react_shim();
  function l3(e7) {
    let [t6] = useState(e7);
    return t6;
  }

  // node_modules/@headlessui/react/dist/hooks/use-id.js
  init_react_shim();

  // node_modules/@headlessui/react/dist/utils/form.js
  init_react_shim();
  function p2(t6 = {}, i7 = null, n8 = []) {
    for (let [e7, o9] of Object.entries(t6)) s3(n8, r4(i7, e7), o9);
    return n8;
  }
  function r4(t6, i7) {
    return t6 ? t6 + "[" + i7 + "]" : i7;
  }
  function s3(t6, i7, n8) {
    if (Array.isArray(n8)) for (let [e7, o9] of n8.entries()) s3(t6, r4(i7, e7.toString()), o9);
    else n8 instanceof Date ? t6.push([i7, n8.toISOString()]) : typeof n8 == "boolean" ? t6.push([i7, n8 ? "1" : "0"]) : typeof n8 == "string" ? t6.push([i7, n8]) : typeof n8 == "number" ? t6.push([i7, `${n8}`]) : n8 == null ? t6.push([i7, ""]) : c(n8) && !isValidElement(n8) && p2(n8, i7, t6);
  }
  function g(t6) {
    var n8, e7;
    let i7 = (n8 = t6 == null ? void 0 : t6.form) != null ? n8 : t6.closest("form");
    if (i7) {
      for (let o9 of i7.elements) if (o9 !== t6 && (o9.tagName === "INPUT" && o9.type === "submit" || o9.tagName === "BUTTON" && o9.type === "submit" || o9.nodeName === "INPUT" && o9.type === "image")) {
        o9.click();
        return;
      }
      (e7 = i7.requestSubmit) == null || e7.call(i7);
    }
  }
  function c(t6) {
    if (Object.prototype.toString.call(t6) !== "[object Object]") return false;
    let i7 = Object.getPrototypeOf(t6);
    return i7 === null || Object.getPrototypeOf(i7) === null;
  }

  // node_modules/@headlessui/react/dist/internal/hidden.js
  var a2 = "span";
  var s4 = ((e7) => (e7[e7.None = 1] = "None", e7[e7.Focusable = 2] = "Focusable", e7[e7.Hidden = 4] = "Hidden", e7))(s4 || {});
  function l4(t6, r10) {
    var n8;
    let { features: d5 = 1, ...e7 } = t6, o9 = { ref: r10, "aria-hidden": (d5 & 2) === 2 ? true : (n8 = e7["aria-hidden"]) != null ? n8 : void 0, hidden: (d5 & 4) === 4 ? true : void 0, style: { position: "fixed", top: 1, left: 1, width: 1, height: 0, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0, 0, 0, 0)", whiteSpace: "nowrap", borderWidth: "0", ...(d5 & 4) === 4 && (d5 & 2) !== 2 && { display: "none" } } };
    return K()({ ourProps: o9, theirProps: e7, slot: {}, defaultTag: a2, name: "Hidden" });
  }
  var f = Y(l4);

  // node_modules/@headlessui/react/dist/internal/form-fields.js
  init_react_shim();
  var f2 = createContext(null);
  function W(t6) {
    let [e7, r10] = useState(null);
    return react_shim_default.createElement(f2.Provider, { value: { target: e7 } }, t6.children, react_shim_default.createElement(f, { features: s4.Hidden, ref: r10 }));
  }
  function c2({ children: t6 }) {
    let e7 = useContext(f2);
    if (!e7) return react_shim_default.createElement(react_shim_default.Fragment, null, t6);
    let { target: r10 } = e7;
    return r10 ? createPortal(react_shim_default.createElement(react_shim_default.Fragment, null, t6), r10) : null;
  }
  function j({ data: t6, form: e7, disabled: r10, onReset: n8, overrides: F2 }) {
    let [i7, a15] = useState(null), p6 = p();
    return useEffect(() => {
      if (n8 && i7) return p6.addEventListener(i7, "reset", n8);
    }, [i7, e7, n8]), react_shim_default.createElement(c2, null, react_shim_default.createElement(C2, { setForm: a15, formId: e7 }), p2(t6).map(([s12, v3]) => react_shim_default.createElement(f, { features: s4.Hidden, ...m({ key: s12, as: "input", type: "hidden", hidden: true, readOnly: true, form: e7, disabled: r10, name: s12, value: v3, ...F2 }) })));
  }
  function C2({ setForm: t6, formId: e7 }) {
    return useEffect(() => {
      if (e7) {
        let r10 = document.getElementById(e7);
        r10 && t6(r10);
      }
    }, [t6, e7]), e7 ? null : react_shim_default.createElement(f, { features: s4.Hidden, as: "input", type: "hidden", hidden: true, readOnly: true, ref: (r10) => {
      if (!r10) return;
      let n8 = r10.closest("form");
      n8 && t6(n8);
    } });
  }

  // node_modules/@headlessui/react/dist/internal/id.js
  init_react_shim();
  var e3 = createContext(void 0);
  function u2() {
    return useContext(e3);
  }
  function f3({ id: t6, children: r10 }) {
    return react_shim_default.createElement(e3.Provider, { value: t6 }, r10);
  }

  // node_modules/@headlessui/react/dist/utils/dom.js
  function o4(e7) {
    return typeof e7 != "object" || e7 === null ? false : "nodeType" in e7;
  }
  function t3(e7) {
    return o4(e7) && "tagName" in e7;
  }
  function n3(e7) {
    return t3(e7) && "accessKey" in e7;
  }
  function i2(e7) {
    return t3(e7) && "tabIndex" in e7;
  }
  function r5(e7) {
    return t3(e7) && "style" in e7;
  }
  function u3(e7) {
    return n3(e7) && e7.nodeName === "IFRAME";
  }
  function l5(e7) {
    return n3(e7) && e7.nodeName === "INPUT";
  }
  function s5(e7) {
    return n3(e7) && e7.nodeName === "TEXTAREA";
  }
  function m2(e7) {
    return n3(e7) && e7.nodeName === "LABEL";
  }
  function a3(e7) {
    return n3(e7) && e7.nodeName === "FIELDSET";
  }
  function E3(e7) {
    return n3(e7) && e7.nodeName === "LEGEND";
  }
  function L2(e7) {
    return t3(e7) ? e7.matches('a[href],audio[controls],button,details,embed,iframe,img[usemap],input:not([type="hidden"]),label,select,textarea,video[controls]') : false;
  }

  // node_modules/@headlessui/react/dist/utils/bugs.js
  function s6(l8) {
    let e7 = l8.parentElement, t6 = null;
    for (; e7 && !a3(e7); ) E3(e7) && (t6 = e7), e7 = e7.parentElement;
    let i7 = (e7 == null ? void 0 : e7.getAttribute("disabled")) === "";
    return i7 && r6(t6) ? false : i7;
  }
  function r6(l8) {
    if (!l8) return false;
    let e7 = l8.previousElementSibling;
    for (; e7 !== null; ) {
      if (E3(e7)) return false;
      e7 = e7.previousElementSibling;
    }
    return true;
  }

  // node_modules/@headlessui/react/dist/hooks/use-sync-refs.js
  init_react_shim();
  var u4 = /* @__PURE__ */ Symbol();
  function T(t6, n8 = true) {
    return Object.assign(t6, { [u4]: n8 });
  }
  function y(...t6) {
    let n8 = useRef(t6);
    useEffect(() => {
      n8.current = t6;
    }, [t6]);
    let c11 = o3((e7) => {
      for (let o9 of n8.current) o9 != null && (typeof o9 == "function" ? o9(e7) : o9.current = e7);
    });
    return t6.every((e7) => e7 == null || (e7 == null ? void 0 : e7[u4])) ? void 0 : c11;
  }

  // node_modules/@headlessui/react/dist/components/description/description.js
  init_react_shim();
  var a4 = createContext(null);
  a4.displayName = "DescriptionContext";
  function f4() {
    let r10 = useContext(a4);
    if (r10 === null) {
      let e7 = new Error("You used a <Description /> component, but it is not inside a relevant parent.");
      throw Error.captureStackTrace && Error.captureStackTrace(e7, f4), e7;
    }
    return r10;
  }
  function w2() {
    var r10, e7;
    return (e7 = (r10 = useContext(a4)) == null ? void 0 : r10.value) != null ? e7 : void 0;
  }
  function H2() {
    let [r10, e7] = useState([]);
    return [r10.length > 0 ? r10.join(" ") : void 0, useMemo(() => function(t6) {
      let i7 = o3((n8) => (e7((o9) => [...o9, n8]), () => e7((o9) => {
        let s12 = o9.slice(), p6 = s12.indexOf(n8);
        return p6 !== -1 && s12.splice(p6, 1), s12;
      }))), l8 = useMemo(() => ({ register: i7, slot: t6.slot, name: t6.name, props: t6.props, value: t6.value }), [i7, t6.slot, t6.name, t6.props, t6.value]);
      return react_shim_default.createElement(a4.Provider, { value: l8 }, t6.children);
    }, [e7])];
  }
  var I2 = "p";
  function C3(r10, e7) {
    let c11 = useId(), t6 = a(), { id: i7 = `headlessui-description-${c11}`, ...l8 } = r10, n8 = f4(), o9 = y(e7);
    n(() => n8.register(i7), [i7, n8.register]);
    let s12 = n2({ ...n8.slot, disabled: t6 || false }), p6 = { ref: o9, ...n8.props, id: i7 };
    return K()({ ourProps: p6, theirProps: l8, slot: s12, defaultTag: I2, name: n8.name || "Description" });
  }
  var _ = Y(C3), M = Object.assign(_, {});

  // node_modules/@headlessui/react/dist/components/keyboard.js
  var o5 = ((r10) => (r10.Space = " ", r10.Enter = "Enter", r10.Escape = "Escape", r10.Backspace = "Backspace", r10.Delete = "Delete", r10.ArrowLeft = "ArrowLeft", r10.ArrowUp = "ArrowUp", r10.ArrowRight = "ArrowRight", r10.ArrowDown = "ArrowDown", r10.Home = "Home", r10.End = "End", r10.PageUp = "PageUp", r10.PageDown = "PageDown", r10.Tab = "Tab", r10))(o5 || {});

  // node_modules/@headlessui/react/dist/components/label/label.js
  init_react_shim();
  var L3 = createContext(null);
  L3.displayName = "LabelContext";
  function C4() {
    let n8 = useContext(L3);
    if (n8 === null) {
      let l8 = new Error("You used a <Label /> component, but it is not inside a relevant parent.");
      throw Error.captureStackTrace && Error.captureStackTrace(l8, C4), l8;
    }
    return n8;
  }
  function N(n8) {
    var a15, e7, o9;
    let l8 = (e7 = (a15 = useContext(L3)) == null ? void 0 : a15.value) != null ? e7 : void 0;
    return ((o9 = n8 == null ? void 0 : n8.length) != null ? o9 : 0) > 0 ? [l8, ...n8].filter(Boolean).join(" ") : l8;
  }
  function V2({ inherit: n8 = false } = {}) {
    let l8 = N(), [a15, e7] = useState([]), o9 = n8 ? [l8, ...a15].filter(Boolean) : a15;
    return [o9.length > 0 ? o9.join(" ") : void 0, useMemo(() => function(t6) {
      let p6 = o3((i7) => (e7((u11) => [...u11, i7]), () => e7((u11) => {
        let d5 = u11.slice(), f11 = d5.indexOf(i7);
        return f11 !== -1 && d5.splice(f11, 1), d5;
      }))), b5 = useMemo(() => ({ register: p6, slot: t6.slot, name: t6.name, props: t6.props, value: t6.value }), [p6, t6.slot, t6.name, t6.props, t6.value]);
      return react_shim_default.createElement(L3.Provider, { value: b5 }, t6.children);
    }, [e7])];
  }
  var G = "label";
  function U2(n8, l8) {
    var y4;
    let a15 = useId(), e7 = C4(), o9 = u2(), T5 = a(), { id: t6 = `headlessui-label-${a15}`, htmlFor: p6 = o9 != null ? o9 : (y4 = e7.props) == null ? void 0 : y4.htmlFor, passive: b5 = false, ...i7 } = n8, u11 = y(l8);
    n(() => e7.register(t6), [t6, e7.register]);
    let d5 = o3((s12) => {
      let g3 = s12.currentTarget;
      if (!(s12.target !== s12.currentTarget && L2(s12.target)) && (m2(g3) && s12.preventDefault(), e7.props && "onClick" in e7.props && typeof e7.props.onClick == "function" && e7.props.onClick(s12), m2(g3))) {
        let r10 = document.getElementById(g3.htmlFor);
        if (r10) {
          let E7 = r10.getAttribute("disabled");
          if (E7 === "true" || E7 === "") return;
          let x7 = r10.getAttribute("aria-disabled");
          if (x7 === "true" || x7 === "") return;
          (l5(r10) && (r10.type === "file" || r10.type === "radio" || r10.type === "checkbox") || r10.role === "radio" || r10.role === "checkbox" || r10.role === "switch") && r10.click(), r10.focus({ preventScroll: true });
        }
      }
    }), f11 = n2({ ...e7.slot, disabled: T5 || false }), c11 = { ref: u11, ...e7.props, id: t6, htmlFor: p6, onClick: d5 };
    return b5 && ("onClick" in c11 && (delete c11.htmlFor, delete c11.onClick), "onClick" in i7 && delete i7.onClick), K()({ ourProps: c11, theirProps: i7, slot: f11, defaultTag: p6 ? G : "div", name: e7.name || "Label" });
  }
  var j2 = Y(U2), Z = Object.assign(j2, {});

  // node_modules/@headlessui/react/dist/components/checkbox/checkbox.js
  init_react_shim();
  var de = "span";
  function pe(u11, b5) {
    let f11 = useId(), y4 = u2(), T5 = a(), { id: h12 = y4 || `headlessui-checkbox-${f11}`, disabled: o9 = T5 || false, autoFocus: i7 = false, checked: C9, defaultChecked: k5, onChange: x7, name: d5, value: g3, form: E7, indeterminate: l8 = false, tabIndex: v3 = 0, ...P4 } = u11, r10 = l3(k5), [a15, t6] = b2(C9, x7, r10 != null ? r10 : false), D4 = N(), R2 = w2(), A4 = p(), [F2, p6] = useState(false), c11 = o3(() => {
      p6(true), t6 == null || t6(!a15), A4.nextFrame(() => {
        p6(false);
      });
    }), K3 = o3((e7) => {
      if (s6(e7.currentTarget)) return e7.preventDefault();
      e7.preventDefault(), c11();
    }), _5 = o3((e7) => {
      e7.key === o5.Space ? (e7.preventDefault(), c11()) : e7.key === o5.Enter && g(e7.currentTarget);
    }), H4 = o3((e7) => e7.preventDefault()), { isFocusVisible: B2, focusProps: I7 } = $0c4a58759813079a$export$4e328f61c538687f({ autoFocus: i7 }), { isHovered: L4, hoverProps: M4 } = $e969f22b6713ca4a$export$ae780daf29e6d456({ isDisabled: o9 }), { pressed: U3, pressProps: O3 } = w({ disabled: o9 }), S6 = V({ ref: b5, id: h12, role: "checkbox", "aria-checked": l8 ? "mixed" : a15 ? "true" : "false", "aria-labelledby": D4, "aria-describedby": R2, "aria-disabled": o9 ? true : void 0, indeterminate: l8 ? "true" : void 0, tabIndex: o9 ? void 0 : v3, onKeyUp: o9 ? void 0 : _5, onKeyPress: o9 ? void 0 : H4, onClick: o9 ? void 0 : K3 }, I7, M4, O3), X4 = n2({ checked: a15, disabled: o9, hover: L4, focus: B2, active: U3, indeterminate: l8, changing: F2, autofocus: i7 }), G4 = useCallback(() => {
      if (r10 !== void 0) return t6 == null ? void 0 : t6(r10);
    }, [t6, r10]), W3 = K();
    return react_shim_default.createElement(react_shim_default.Fragment, null, d5 != null && react_shim_default.createElement(j, { disabled: o9, data: { [d5]: g3 || "on" }, overrides: { type: "checkbox", checked: a15 }, form: E7, onReset: G4 }), W3({ ourProps: S6, theirProps: P4, slot: X4, defaultTag: de, name: "Checkbox" }));
  }
  var Ke = Y(pe);

  // node_modules/@headlessui/react/dist/internal/close-provider.js
  init_react_shim();
  var e4 = createContext(() => {
  });
  function u5() {
    return useContext(e4);
  }
  function C5({ value: t6, children: o9 }) {
    return react_shim_default.createElement(e4.Provider, { value: t6 }, o9);
  }

  // node_modules/@headlessui/react/dist/utils/default-map.js
  var a5 = class extends Map {
    constructor(t6) {
      super();
      this.factory = t6;
    }
    get(t6) {
      let e7 = super.get(t6);
      return e7 === void 0 && (e7 = this.factory(t6), this.set(t6, e7)), e7;
    }
  };

  // node_modules/@headlessui/react/dist/machine.js
  var h2 = Object.defineProperty;
  var v = (t6, e7, r10) => e7 in t6 ? h2(t6, e7, { enumerable: true, configurable: true, writable: true, value: r10 }) : t6[e7] = r10;
  var S = (t6, e7, r10) => (v(t6, typeof e7 != "symbol" ? e7 + "" : e7, r10), r10), b3 = (t6, e7, r10) => {
    if (!e7.has(t6)) throw TypeError("Cannot " + r10);
  };
  var i3 = (t6, e7, r10) => (b3(t6, e7, "read from private field"), r10 ? r10.call(t6) : e7.get(t6)), c3 = (t6, e7, r10) => {
    if (e7.has(t6)) throw TypeError("Cannot add the same private member more than once");
    e7 instanceof WeakSet ? e7.add(t6) : e7.set(t6, r10);
  }, u6 = (t6, e7, r10, s12) => (b3(t6, e7, "write to private field"), s12 ? s12.call(t6, r10) : e7.set(t6, r10), r10);
  var n4, a6, o6;
  var T2 = class {
    constructor(e7) {
      c3(this, n4, {});
      c3(this, a6, new a5(() => /* @__PURE__ */ new Set()));
      c3(this, o6, /* @__PURE__ */ new Set());
      S(this, "disposables", o2());
      u6(this, n4, e7), s.isServer && this.disposables.microTask(() => {
        this.dispose();
      });
    }
    dispose() {
      this.disposables.dispose();
    }
    get state() {
      return i3(this, n4);
    }
    subscribe(e7, r10) {
      if (s.isServer) return () => {
      };
      let s12 = { selector: e7, callback: r10, current: e7(i3(this, n4)) };
      return i3(this, o6).add(s12), this.disposables.add(() => {
        i3(this, o6).delete(s12);
      });
    }
    on(e7, r10) {
      return s.isServer ? () => {
      } : (i3(this, a6).get(e7).add(r10), this.disposables.add(() => {
        i3(this, a6).get(e7).delete(r10);
      }));
    }
    send(e7) {
      let r10 = this.reduce(i3(this, n4), e7);
      if (r10 !== i3(this, n4)) {
        u6(this, n4, r10);
        for (let s12 of i3(this, o6)) {
          let l8 = s12.selector(i3(this, n4));
          j3(s12.current, l8) || (s12.current = l8, s12.callback(l8));
        }
        for (let s12 of i3(this, a6).get(e7.type)) s12(i3(this, n4), e7);
      }
    }
  };
  n4 = /* @__PURE__ */ new WeakMap(), a6 = /* @__PURE__ */ new WeakMap(), o6 = /* @__PURE__ */ new WeakMap();
  function j3(t6, e7) {
    return Object.is(t6, e7) ? true : typeof t6 != "object" || t6 === null || typeof e7 != "object" || e7 === null ? false : Array.isArray(t6) && Array.isArray(e7) ? t6.length !== e7.length ? false : f5(t6[Symbol.iterator](), e7[Symbol.iterator]()) : t6 instanceof Map && e7 instanceof Map || t6 instanceof Set && e7 instanceof Set ? t6.size !== e7.size ? false : f5(t6.entries(), e7.entries()) : p3(t6) && p3(e7) ? f5(Object.entries(t6)[Symbol.iterator](), Object.entries(e7)[Symbol.iterator]()) : false;
  }
  function f5(t6, e7) {
    do {
      let r10 = t6.next(), s12 = e7.next();
      if (r10.done && s12.done) return true;
      if (r10.done || s12.done || !Object.is(r10.value, s12.value)) return false;
    } while (true);
  }
  function p3(t6) {
    if (Object.prototype.toString.call(t6) !== "[object Object]") return false;
    let e7 = Object.getPrototypeOf(t6);
    return e7 === null || Object.getPrototypeOf(e7) === null;
  }
  function k(t6) {
    let [e7, r10] = t6(), s12 = o2();
    return (...l8) => {
      e7(...l8), s12.dispose(), s12.microTask(r10);
    };
  }

  // node_modules/@headlessui/react/dist/machines/stack-machine.js
  var a7 = Object.defineProperty;
  var r7 = (e7, c11, t6) => c11 in e7 ? a7(e7, c11, { enumerable: true, configurable: true, writable: true, value: t6 }) : e7[c11] = t6;
  var p4 = (e7, c11, t6) => (r7(e7, typeof c11 != "symbol" ? c11 + "" : c11, t6), t6);
  var k2 = ((t6) => (t6[t6.Push = 0] = "Push", t6[t6.Pop = 1] = "Pop", t6))(k2 || {});
  var y2 = { [0](e7, c11) {
    let t6 = c11.id, s12 = e7.stack, i7 = e7.stack.indexOf(t6);
    if (i7 !== -1) {
      let n8 = e7.stack.slice();
      return n8.splice(i7, 1), n8.push(t6), s12 = n8, { ...e7, stack: s12 };
    }
    return { ...e7, stack: [...e7.stack, t6] };
  }, [1](e7, c11) {
    let t6 = c11.id, s12 = e7.stack.indexOf(t6);
    if (s12 === -1) return e7;
    let i7 = e7.stack.slice();
    return i7.splice(s12, 1), { ...e7, stack: i7 };
  } };
  var o7 = class _o extends T2 {
    constructor() {
      super(...arguments);
      p4(this, "actions", { push: (t6) => this.send({ type: 0, id: t6 }), pop: (t6) => this.send({ type: 1, id: t6 }) });
      p4(this, "selectors", { isTop: (t6, s12) => t6.stack[t6.stack.length - 1] === s12, inStack: (t6, s12) => t6.stack.includes(s12) });
    }
    static new() {
      return new _o({ stack: [] });
    }
    reduce(t6, s12) {
      return u(s12.type, y2, t6, s12);
    }
  };
  var x = new a5(() => o7.new());

  // node_modules/@headlessui/react/dist/react-glue.js
  var import_with_selector = __toESM(require_with_selector(), 1);
  function S2(e7, n8, r10 = j3) {
    return (0, import_with_selector.useSyncExternalStoreWithSelector)(o3((i7) => e7.subscribe(s7, i7)), o3(() => e7.state), o3(() => e7.state), o3(n8), r10);
  }
  function s7(e7) {
    return e7;
  }

  // node_modules/@headlessui/react/dist/hooks/use-is-top-layer.js
  init_react_shim();
  function I3(o9, s12) {
    let t6 = useId(), r10 = x.get(s12), [i7, c11] = S2(r10, useCallback((e7) => [r10.selectors.isTop(e7, t6), r10.selectors.inStack(e7, t6)], [r10, t6]));
    return n(() => {
      if (o9) return r10.actions.push(t6), () => r10.actions.pop(t6);
    }, [r10, o9, t6]), o9 ? c11 ? i7 : true : false;
  }

  // node_modules/@headlessui/react/dist/hooks/use-inert-others.js
  var f6 = /* @__PURE__ */ new Map(), u7 = /* @__PURE__ */ new Map();
  function h3(t6) {
    var e7;
    let r10 = (e7 = u7.get(t6)) != null ? e7 : 0;
    return u7.set(t6, r10 + 1), r10 !== 0 ? () => m3(t6) : (f6.set(t6, { "aria-hidden": t6.getAttribute("aria-hidden"), inert: t6.inert }), t6.setAttribute("aria-hidden", "true"), t6.inert = true, () => m3(t6));
  }
  function m3(t6) {
    var i7;
    let r10 = (i7 = u7.get(t6)) != null ? i7 : 1;
    if (r10 === 1 ? u7.delete(t6) : u7.set(t6, r10 - 1), r10 !== 1) return;
    let e7 = f6.get(t6);
    e7 && (e7["aria-hidden"] === null ? t6.removeAttribute("aria-hidden") : t6.setAttribute("aria-hidden", e7["aria-hidden"]), t6.inert = e7.inert, f6.delete(t6));
  }
  function y3(t6, { allowed: r10, disallowed: e7 } = {}) {
    let i7 = I3(t6, "inert-others");
    n(() => {
      var d5, c11;
      if (!i7) return;
      let a15 = o2();
      for (let n8 of (d5 = e7 == null ? void 0 : e7()) != null ? d5 : []) n8 && a15.add(h3(n8));
      let s12 = (c11 = r10 == null ? void 0 : r10()) != null ? c11 : [];
      for (let n8 of s12) {
        if (!n8) continue;
        let l8 = l(n8);
        if (!l8) continue;
        let o9 = n8.parentElement;
        for (; o9 && o9 !== l8.body; ) {
          for (let p6 of o9.children) s12.some((E7) => p6.contains(E7)) || a15.add(h3(p6));
          o9 = o9.parentElement;
        }
      }
      return a15.dispose;
    }, [i7, r10, e7]);
  }

  // node_modules/@headlessui/react/dist/hooks/use-on-disappear.js
  init_react_shim();
  function p5(s12, n8, o9) {
    let i7 = s2((t6) => {
      let e7 = t6.getBoundingClientRect();
      e7.x === 0 && e7.y === 0 && e7.width === 0 && e7.height === 0 && o9();
    });
    useEffect(() => {
      if (!s12) return;
      let t6 = n8 === null ? null : n3(n8) ? n8 : n8.current;
      if (!t6) return;
      let e7 = o2();
      if (typeof ResizeObserver != "undefined") {
        let r10 = new ResizeObserver(() => i7.current(t6));
        r10.observe(t6), e7.add(() => r10.disconnect());
      }
      if (typeof IntersectionObserver != "undefined") {
        let r10 = new IntersectionObserver(() => i7.current(t6));
        r10.observe(t6), e7.add(() => r10.disconnect());
      }
      return () => e7.dispose();
    }, [n8, i7, s12]);
  }

  // node_modules/@headlessui/react/dist/utils/focus-management.js
  var E4 = ["[contentEditable=true]", "[tabindex]", "a[href]", "area[href]", "button:not([disabled])", "iframe", "input:not([disabled])", "select:not([disabled])", "details>summary", "textarea:not([disabled])"].map((e7) => `${e7}:not([tabindex='-1'])`).join(","), S3 = ["[data-autofocus]"].map((e7) => `${e7}:not([tabindex='-1'])`).join(",");
  var T3 = ((o9) => (o9[o9.First = 1] = "First", o9[o9.Previous = 2] = "Previous", o9[o9.Next = 4] = "Next", o9[o9.Last = 8] = "Last", o9[o9.WrapAround = 16] = "WrapAround", o9[o9.NoScroll = 32] = "NoScroll", o9[o9.AutoFocus = 64] = "AutoFocus", o9))(T3 || {}), A2 = ((n8) => (n8[n8.Error = 0] = "Error", n8[n8.Overflow = 1] = "Overflow", n8[n8.Success = 2] = "Success", n8[n8.Underflow = 3] = "Underflow", n8))(A2 || {}), O = ((t6) => (t6[t6.Previous = -1] = "Previous", t6[t6.Next = 1] = "Next", t6))(O || {});
  function x2(e7 = document.body) {
    return e7 == null ? [] : Array.from(e7.querySelectorAll(E4)).sort((r10, t6) => Math.sign((r10.tabIndex || Number.MAX_SAFE_INTEGER) - (t6.tabIndex || Number.MAX_SAFE_INTEGER)));
  }
  function h4(e7 = document.body) {
    return e7 == null ? [] : Array.from(e7.querySelectorAll(S3)).sort((r10, t6) => Math.sign((r10.tabIndex || Number.MAX_SAFE_INTEGER) - (t6.tabIndex || Number.MAX_SAFE_INTEGER)));
  }
  var I4 = ((t6) => (t6[t6.Strict = 0] = "Strict", t6[t6.Loose = 1] = "Loose", t6))(I4 || {});
  function H3(e7, r10 = 0) {
    var t6;
    return e7 === ((t6 = l(e7)) == null ? void 0 : t6.body) ? false : u(r10, { [0]() {
      return e7.matches(E4);
    }, [1]() {
      let l8 = e7;
      for (; l8 !== null; ) {
        if (l8.matches(E4)) return true;
        l8 = l8.parentElement;
      }
      return false;
    } });
  }
  function K2(e7) {
    o2().nextFrame(() => {
      let r10 = e(e7);
      r10 && i2(r10) && !H3(r10, 0) && w3(e7);
    });
  }
  var g2 = ((t6) => (t6[t6.Keyboard = 0] = "Keyboard", t6[t6.Mouse = 1] = "Mouse", t6))(g2 || {});
  typeof window != "undefined" && typeof document != "undefined" && (document.addEventListener("keydown", (e7) => {
    e7.metaKey || e7.altKey || e7.ctrlKey || (document.documentElement.dataset.headlessuiFocusVisible = "");
  }, true), document.addEventListener("click", (e7) => {
    e7.detail === 1 ? delete document.documentElement.dataset.headlessuiFocusVisible : e7.detail === 0 && (document.documentElement.dataset.headlessuiFocusVisible = "");
  }, true));
  function w3(e7) {
    e7 == null || e7.focus({ preventScroll: true });
  }
  var _2 = ["textarea", "input"].join(",");
  function P3(e7) {
    var r10, t6;
    return (t6 = (r10 = e7 == null ? void 0 : e7.matches) == null ? void 0 : r10.call(e7, _2)) != null ? t6 : false;
  }
  function G2(e7, r10 = (t6) => t6) {
    return e7.slice().sort((t6, l8) => {
      let n8 = r10(t6), a15 = r10(l8);
      if (n8 === null || a15 === null) return 0;
      let u11 = n8.compareDocumentPosition(a15);
      return u11 & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : u11 & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
    });
  }
  function R(e7, r10, t6 = e7 === null ? document.body : r3(e7)) {
    return v2(x2(t6), r10, { relativeTo: e7 });
  }
  function v2(e7, r10, { sorted: t6 = true, relativeTo: l8 = null, skipElements: n8 = [] } = {}) {
    let a15 = Array.isArray(e7) ? e7.length > 0 ? r3(e7[0]) : document : r3(e7), u11 = Array.isArray(e7) ? t6 ? G2(e7) : e7 : r10 & 64 ? h4(e7) : x2(e7);
    n8.length > 0 && u11.length > 1 && (u11 = u11.filter((i7) => !n8.some((d5) => d5 != null && "current" in d5 ? (d5 == null ? void 0 : d5.current) === i7 : d5 === i7))), l8 = l8 != null ? l8 : a15 == null ? void 0 : a15.activeElement;
    let o9 = (() => {
      if (r10 & 5) return 1;
      if (r10 & 10) return -1;
      throw new Error("Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last");
    })(), M4 = (() => {
      if (r10 & 1) return 0;
      if (r10 & 2) return Math.max(0, u11.indexOf(l8)) - 1;
      if (r10 & 4) return Math.max(0, u11.indexOf(l8)) + 1;
      if (r10 & 8) return u11.length - 1;
      throw new Error("Missing Focus.First, Focus.Previous, Focus.Next or Focus.Last");
    })(), N3 = r10 & 32 ? { preventScroll: true } : {}, m6 = 0, c11 = u11.length, s12;
    do {
      if (m6 >= c11 || m6 + c11 <= 0) return 0;
      let i7 = M4 + m6;
      if (r10 & 16) i7 = (i7 + c11) % c11;
      else {
        if (i7 < 0) return 3;
        if (i7 >= c11) return 1;
      }
      s12 = u11[i7], s12 == null || s12.focus(N3), m6 += o9;
    } while (s12 !== e(s12));
    return r10 & 6 && P3(s12) && s12.select(), 2;
  }

  // node_modules/@headlessui/react/dist/utils/platform.js
  function t4() {
    return /iPhone/gi.test(window.navigator.platform) || /Mac/gi.test(window.navigator.platform) && window.navigator.maxTouchPoints > 0;
  }
  function i4() {
    return /Android/gi.test(window.navigator.userAgent);
  }
  function n5() {
    return t4() || i4();
  }

  // node_modules/@headlessui/react/dist/hooks/use-document-event.js
  init_react_shim();
  function i5(t6, e7, o9, n8) {
    let u11 = s2(o9);
    useEffect(() => {
      if (!t6) return;
      function r10(m6) {
        u11.current(m6);
      }
      return document.addEventListener(e7, r10, n8), () => document.removeEventListener(e7, r10, n8);
    }, [t6, e7, n8]);
  }

  // node_modules/@headlessui/react/dist/hooks/use-window-event.js
  init_react_shim();
  function s8(t6, e7, o9, n8) {
    let i7 = s2(o9);
    useEffect(() => {
      if (!t6) return;
      function r10(d5) {
        i7.current(d5);
      }
      return window.addEventListener(e7, r10, n8), () => window.removeEventListener(e7, r10, n8);
    }, [t6, e7, n8]);
  }

  // node_modules/@headlessui/react/dist/hooks/use-outside-click.js
  init_react_shim();
  var C6 = 30;
  function k3(o9, f11, h12) {
    let m6 = s2(h12), s12 = useCallback(function(e7, c11) {
      if (e7.defaultPrevented) return;
      let r10 = c11(e7);
      if (r10 === null || !r10.getRootNode().contains(r10) || !r10.isConnected) return;
      let M4 = (function u11(n8) {
        return typeof n8 == "function" ? u11(n8()) : Array.isArray(n8) || n8 instanceof Set ? n8 : [n8];
      })(f11);
      for (let u11 of M4) if (u11 !== null && (u11.contains(r10) || e7.composed && e7.composedPath().includes(u11))) return;
      return !H3(r10, I4.Loose) && r10.tabIndex !== -1 && e7.preventDefault(), m6.current(e7, r10);
    }, [m6, f11]), i7 = useRef(null);
    i5(o9, "pointerdown", (t6) => {
      var e7, c11;
      n5() || (i7.current = ((c11 = (e7 = t6.composedPath) == null ? void 0 : e7.call(t6)) == null ? void 0 : c11[0]) || t6.target);
    }, true), i5(o9, "pointerup", (t6) => {
      if (n5() || !i7.current) return;
      let e7 = i7.current;
      return i7.current = null, s12(t6, () => e7);
    }, true);
    let l8 = useRef({ x: 0, y: 0 });
    i5(o9, "touchstart", (t6) => {
      l8.current.x = t6.touches[0].clientX, l8.current.y = t6.touches[0].clientY;
    }, true), i5(o9, "touchend", (t6) => {
      let e7 = { x: t6.changedTouches[0].clientX, y: t6.changedTouches[0].clientY };
      if (!(Math.abs(e7.x - l8.current.x) >= C6 || Math.abs(e7.y - l8.current.y) >= C6)) return s12(t6, () => i2(t6.target) ? t6.target : null);
    }, true), s8(o9, "blur", (t6) => s12(t6, () => u3(window.document.activeElement) ? window.document.activeElement : null), true);
  }

  // node_modules/@headlessui/react/dist/hooks/use-owner.js
  init_react_shim();
  function u8(...e7) {
    return useMemo(() => l(...e7), [...e7]);
  }
  function c4(...e7) {
    return useMemo(() => r3(...e7), [...e7]);
  }

  // node_modules/@headlessui/react/dist/hooks/use-event-listener.js
  init_react_shim();
  function E5(n8, e7, a15, t6) {
    let i7 = s2(a15);
    useEffect(() => {
      n8 = n8 != null ? n8 : window;
      function r10(o9) {
        i7.current(o9);
      }
      return n8.addEventListener(e7, r10, t6), () => n8.removeEventListener(e7, r10, t6);
    }, [n8, e7, t6]);
  }

  // node_modules/@headlessui/react/dist/hooks/use-resolve-button-type.js
  init_react_shim();
  function e5(t6, u11) {
    return useMemo(() => {
      var n8;
      if (t6.type) return t6.type;
      let r10 = (n8 = t6.as) != null ? n8 : "button";
      if (typeof r10 == "string" && r10.toLowerCase() === "button" || (u11 == null ? void 0 : u11.tagName) === "BUTTON" && !u11.hasAttribute("type")) return "button";
    }, [t6.type, t6.as, u11]);
  }

  // node_modules/@headlessui/react/dist/hooks/use-store.js
  init_react_shim();
  function o8(t6) {
    return useSyncExternalStore(t6.subscribe, t6.getSnapshot, t6.getSnapshot);
  }

  // node_modules/@headlessui/react/dist/utils/store.js
  function a9(o9, r10) {
    let t6 = o9(), n8 = /* @__PURE__ */ new Set();
    return { getSnapshot() {
      return t6;
    }, subscribe(e7) {
      return n8.add(e7), () => n8.delete(e7);
    }, dispatch(e7, ...s12) {
      let i7 = r10[e7].call(t6, ...s12);
      i7 && (t6 = i7, n8.forEach((c11) => c11()));
    } };
  }

  // node_modules/@headlessui/react/dist/hooks/document-overflow/adjust-scrollbar-padding.js
  function d3() {
    let r10;
    return { before({ doc: e7 }) {
      var l8;
      let o9 = e7.documentElement, t6 = (l8 = e7.defaultView) != null ? l8 : window;
      r10 = Math.max(0, t6.innerWidth - o9.clientWidth);
    }, after({ doc: e7, d: o9 }) {
      let t6 = e7.documentElement, l8 = Math.max(0, t6.clientWidth - t6.offsetWidth), n8 = Math.max(0, r10 - l8);
      o9.style(t6, "paddingRight", `${n8}px`);
    } };
  }

  // node_modules/@headlessui/react/dist/hooks/document-overflow/handle-ios-locking.js
  function w4() {
    return t4() ? { before({ doc: o9, d: r10, meta: m6 }) {
      function a15(s12) {
        for (let l8 of m6().containers) for (let c11 of l8()) if (c11.contains(s12)) return true;
        return false;
      }
      r10.microTask(() => {
        var c11;
        if (window.getComputedStyle(o9.documentElement).scrollBehavior !== "auto") {
          let t6 = o2();
          t6.style(o9.documentElement, "scrollBehavior", "auto"), r10.add(() => r10.microTask(() => t6.dispose()));
        }
        let s12 = (c11 = window.scrollY) != null ? c11 : window.pageYOffset, l8 = null;
        r10.addEventListener(o9, "click", (t6) => {
          if (i2(t6.target)) try {
            let e7 = t6.target.closest("a");
            if (!e7) return;
            let { hash: n8 } = new URL(e7.href), f11 = o9.querySelector(n8);
            i2(f11) && !a15(f11) && (l8 = f11);
          } catch {
          }
        }, true), r10.group((t6) => {
          r10.addEventListener(o9, "touchstart", (e7) => {
            if (t6.dispose(), i2(e7.target) && r5(e7.target)) if (a15(e7.target)) {
              let n8 = e7.target;
              for (; n8.parentElement && a15(n8.parentElement); ) n8 = n8.parentElement;
              t6.style(n8, "overscrollBehavior", "contain");
            } else t6.style(e7.target, "touchAction", "none");
          });
        }), r10.addEventListener(o9, "touchmove", (t6) => {
          if (i2(t6.target)) {
            if (l5(t6.target)) return;
            if (a15(t6.target)) {
              let e7 = t6.target;
              for (; e7.parentElement && e7.dataset.headlessuiPortal !== "" && !(e7.scrollHeight > e7.clientHeight || e7.scrollWidth > e7.clientWidth); ) e7 = e7.parentElement;
              e7.dataset.headlessuiPortal === "" && t6.preventDefault();
            } else t6.preventDefault();
          }
        }, { passive: false }), r10.add(() => {
          var e7;
          let t6 = (e7 = window.scrollY) != null ? e7 : window.pageYOffset;
          s12 !== t6 && window.scrollTo(0, s12), l8 && l8.isConnected && (l8.scrollIntoView({ block: "nearest" }), l8 = null);
        });
      });
    } } : {};
  }

  // node_modules/@headlessui/react/dist/hooks/document-overflow/prevent-scroll.js
  function r8() {
    return { before({ doc: e7, d: o9 }) {
      o9.style(e7.documentElement, "overflow", "hidden");
    } };
  }

  // node_modules/@headlessui/react/dist/hooks/document-overflow/overflow-store.js
  function r9(e7) {
    let o9 = {};
    for (let t6 of e7) Object.assign(o9, t6(o9));
    return o9;
  }
  var c5 = a9(() => /* @__PURE__ */ new Map(), { PUSH(e7, o9) {
    var n8;
    let t6 = (n8 = this.get(e7)) != null ? n8 : { doc: e7, count: 0, d: o2(), meta: /* @__PURE__ */ new Set(), computedMeta: {} };
    return t6.count++, t6.meta.add(o9), t6.computedMeta = r9(t6.meta), this.set(e7, t6), this;
  }, POP(e7, o9) {
    let t6 = this.get(e7);
    return t6 && (t6.count--, t6.meta.delete(o9), t6.computedMeta = r9(t6.meta)), this;
  }, SCROLL_PREVENT(e7) {
    let o9 = { doc: e7.doc, d: e7.d, meta() {
      return e7.computedMeta;
    } }, t6 = [w4(), d3(), r8()];
    t6.forEach(({ before: n8 }) => n8 == null ? void 0 : n8(o9)), t6.forEach(({ after: n8 }) => n8 == null ? void 0 : n8(o9));
  }, SCROLL_ALLOW({ d: e7 }) {
    e7.dispose();
  }, TEARDOWN({ doc: e7 }) {
    this.delete(e7);
  } });
  c5.subscribe(() => {
    let e7 = c5.getSnapshot(), o9 = /* @__PURE__ */ new Map();
    for (let [t6] of e7) o9.set(t6, t6.documentElement.style.overflow);
    for (let t6 of e7.values()) {
      let n8 = o9.get(t6.doc) === "hidden", a15 = t6.count !== 0;
      (a15 && !n8 || !a15 && n8) && c5.dispatch(t6.count > 0 ? "SCROLL_PREVENT" : "SCROLL_ALLOW", t6), t6.count === 0 && c5.dispatch("TEARDOWN", t6);
    }
  });

  // node_modules/@headlessui/react/dist/hooks/document-overflow/use-document-overflow.js
  function a10(r10, e7, n8 = () => ({ containers: [] })) {
    let f11 = o8(c5), o9 = e7 ? f11.get(e7) : void 0, i7 = o9 ? o9.count > 0 : false;
    return n(() => {
      if (!(!e7 || !r10)) return c5.dispatch("PUSH", e7, n8), () => c5.dispatch("POP", e7, n8);
    }, [r10, e7]), i7;
  }

  // node_modules/@headlessui/react/dist/hooks/use-scroll-lock.js
  function f7(e7, c11, n8 = () => [document.body]) {
    let r10 = I3(e7, "scroll-lock");
    a10(r10, c11, (t6) => {
      var o9;
      return { containers: [...(o9 = t6.containers) != null ? o9 : [], n8] };
    });
  }

  // node_modules/@headlessui/react/dist/hooks/use-flags.js
  init_react_shim();
  function c6(u11 = 0) {
    let [r10, a15] = useState(u11), g3 = useCallback((e7) => a15(e7), []), s12 = useCallback((e7) => a15((l8) => l8 | e7), []), m6 = useCallback((e7) => (r10 & e7) === e7, [r10]), n8 = useCallback((e7) => a15((l8) => l8 & ~e7), []), F2 = useCallback((e7) => a15((l8) => l8 ^ e7), []);
    return { flags: r10, setFlag: g3, addFlag: s12, hasFlag: m6, removeFlag: n8, toggleFlag: F2 };
  }

  // node_modules/@headlessui/react/dist/hooks/use-transition.js
  init_react_shim();
  var T4, S4;
  typeof process != "undefined" && typeof globalThis != "undefined" && typeof Element != "undefined" && ((T4 = process == null ? void 0 : process.env) == null ? void 0 : T4["NODE_ENV"]) === "test" && typeof ((S4 = Element == null ? void 0 : Element.prototype) == null ? void 0 : S4.getAnimations) == "undefined" && (Element.prototype.getAnimations = function() {
    return console.warn(["Headless UI has polyfilled `Element.prototype.getAnimations` for your tests.", "Please install a proper polyfill e.g. `jsdom-testing-mocks`, to silence these warnings.", "", "Example usage:", "```js", "import { mockAnimationsApi } from 'jsdom-testing-mocks'", "mockAnimationsApi()", "```"].join(`
`)), [];
  });
  var A3 = ((i7) => (i7[i7.None = 0] = "None", i7[i7.Closed = 1] = "Closed", i7[i7.Enter = 2] = "Enter", i7[i7.Leave = 4] = "Leave", i7))(A3 || {});
  function x3(e7) {
    let r10 = {};
    for (let t6 in e7) e7[t6] === true && (r10[`data-${t6}`] = "");
    return r10;
  }
  function N2(e7, r10, t6, n8) {
    let [i7, a15] = useState(t6), { hasFlag: s12, addFlag: o9, removeFlag: l8 } = c6(e7 && i7 ? 3 : 0), u11 = useRef(false), f11 = useRef(false), E7 = p();
    return n(() => {
      var d5;
      if (e7) {
        if (t6 && a15(true), !r10) {
          t6 && o9(3);
          return;
        }
        return (d5 = n8 == null ? void 0 : n8.start) == null || d5.call(n8, t6), C7(r10, { inFlight: u11, prepare() {
          f11.current ? f11.current = false : f11.current = u11.current, u11.current = true, !f11.current && (t6 ? (o9(3), l8(4)) : (o9(4), l8(2)));
        }, run() {
          f11.current ? t6 ? (l8(3), o9(4)) : (l8(4), o9(3)) : t6 ? l8(1) : o9(1);
        }, done() {
          var p6;
          f11.current && D2(r10) || (u11.current = false, l8(7), t6 || a15(false), (p6 = n8 == null ? void 0 : n8.end) == null || p6.call(n8, t6));
        } });
      }
    }, [e7, t6, r10, E7]), e7 ? [i7, { closed: s12(1), enter: s12(2), leave: s12(4), transition: s12(2) || s12(4) }] : [t6, { closed: void 0, enter: void 0, leave: void 0, transition: void 0 }];
  }
  function C7(e7, { prepare: r10, run: t6, done: n8, inFlight: i7 }) {
    let a15 = o2();
    return j4(e7, { prepare: r10, inFlight: i7 }), a15.nextFrame(() => {
      t6(), a15.requestAnimationFrame(() => {
        a15.add(M2(e7, n8));
      });
    }), a15.dispose;
  }
  function M2(e7, r10) {
    var a15, s12;
    let t6 = o2();
    if (!e7) return t6.dispose;
    let n8 = false;
    t6.add(() => {
      n8 = true;
    });
    let i7 = (s12 = (a15 = e7.getAnimations) == null ? void 0 : a15.call(e7).filter((o9) => o9 instanceof CSSTransition)) != null ? s12 : [];
    return i7.length === 0 ? (r10(), t6.dispose) : (Promise.allSettled(i7.map((o9) => o9.finished)).then(() => {
      n8 || r10();
    }), t6.dispose);
  }
  function j4(e7, { inFlight: r10, prepare: t6 }) {
    if (r10 != null && r10.current) {
      t6();
      return;
    }
    let n8 = e7.style.transition;
    e7.style.transition = "none", t6(), e7.offsetHeight, e7.style.transition = n8;
  }
  function D2(e7) {
    var t6, n8;
    return ((n8 = (t6 = e7.getAnimations) == null ? void 0 : t6.call(e7)) != null ? n8 : []).some((i7) => i7 instanceof CSSTransition && i7.playState !== "finished");
  }

  // node_modules/@headlessui/react/dist/hooks/use-watch.js
  init_react_shim();
  function m4(u11, t6) {
    let e7 = useRef([]), r10 = o3(u11);
    useEffect(() => {
      let o9 = [...e7.current];
      for (let [a15, l8] of t6.entries()) if (e7.current[a15] !== l8) {
        let n8 = r10(t6, o9);
        return e7.current = t6, n8;
      }
    }, [r10, ...t6]);
  }

  // node_modules/@headlessui/react/dist/internal/open-closed.js
  init_react_shim();
  var n6 = createContext(null);
  n6.displayName = "OpenClosedContext";
  var i6 = ((e7) => (e7[e7.Open = 1] = "Open", e7[e7.Closed = 2] = "Closed", e7[e7.Closing = 4] = "Closing", e7[e7.Opening = 8] = "Opening", e7))(i6 || {});
  function u9() {
    return useContext(n6);
  }
  function c7({ value: o9, children: t6 }) {
    return react_shim_default.createElement(n6.Provider, { value: o9 }, t6);
  }
  function s9({ children: o9 }) {
    return react_shim_default.createElement(n6.Provider, { value: null }, o9);
  }

  // node_modules/@headlessui/react/dist/utils/document-ready.js
  function t5(n8) {
    function e7() {
      document.readyState !== "loading" && (n8(), document.removeEventListener("DOMContentLoaded", e7));
    }
    typeof window != "undefined" && typeof document != "undefined" && (document.addEventListener("DOMContentLoaded", e7), e7());
  }

  // node_modules/@headlessui/react/dist/utils/active-element-history.js
  var n7 = [];
  t5(() => {
    function e7(t6) {
      if (!i2(t6.target) || t6.target === document.body || n7[0] === t6.target) return;
      let r10 = t6.target;
      r10 = r10.closest(E4), n7.unshift(r10 != null ? r10 : t6.target), n7 = n7.filter((o9) => o9 != null && o9.isConnected), n7.splice(10);
    }
    window.addEventListener("click", e7, { capture: true }), window.addEventListener("mousedown", e7, { capture: true }), window.addEventListener("focus", e7, { capture: true }), document.body.addEventListener("click", e7, { capture: true }), document.body.addEventListener("mousedown", e7, { capture: true }), document.body.addEventListener("focus", e7, { capture: true });
  });

  // node_modules/@headlessui/react/dist/hooks/use-on-unmount.js
  init_react_shim();
  function c8(t6) {
    let r10 = o3(t6), e7 = useRef(false);
    useEffect(() => (e7.current = false, () => {
      e7.current = true, t(() => {
        e7.current && r10();
      });
    }), [r10]);
  }

  // node_modules/@headlessui/react/dist/hooks/use-server-handoff-complete.js
  init_react_shim();
  function s10() {
    let r10 = typeof document == "undefined";
    return "useSyncExternalStore" in react_shim_exports ? ((o9) => o9.useSyncExternalStore)(react_shim_exports)(() => () => {
    }, () => false, () => !r10) : false;
  }
  function l6() {
    let r10 = s10(), [e7, n8] = useState(s.isHandoffComplete);
    return e7 && s.isHandoffComplete === false && n8(false), useEffect(() => {
      e7 !== true && n8(true);
    }, [e7]), useEffect(() => s.handoff(), []), r10 ? false : e7;
  }

  // node_modules/@headlessui/react/dist/internal/portal-force-root.js
  init_react_shim();
  var e6 = createContext(false);
  function a11() {
    return useContext(e6);
  }
  function l7(o9) {
    return react_shim_default.createElement(e6.Provider, { value: o9.force }, o9.children);
  }

  // node_modules/@headlessui/react/dist/components/portal/portal.js
  init_react_shim();
  function j5(e7) {
    let o9 = a11(), l8 = useContext(c9), [r10, p6] = useState(() => {
      var s12;
      if (!o9 && l8 !== null) return (s12 = l8.current) != null ? s12 : null;
      if (s.isServer) return null;
      let t6 = e7 == null ? void 0 : e7.getElementById("headlessui-portal-root");
      if (t6) return t6;
      if (e7 === null) return null;
      let n8 = e7.createElement("div");
      return n8.setAttribute("id", "headlessui-portal-root"), e7.body.appendChild(n8);
    });
    return useEffect(() => {
      r10 !== null && (e7 != null && e7.body.contains(r10) || e7 == null || e7.body.appendChild(r10));
    }, [r10, e7]), useEffect(() => {
      o9 || l8 !== null && p6(l8.current);
    }, [l8, p6, o9]), r10;
  }
  var _3 = Fragment, I5 = Y(function(o9, l8) {
    let { ownerDocument: r10 = null, ...p6 } = o9, t6 = useRef(null), n8 = y(T((a15) => {
      t6.current = a15;
    }), l8), s12 = u8(t6.current), C9 = r10 != null ? r10 : s12, u11 = j5(C9), y4 = useContext(m5), g3 = p(), v3 = l6(), M4 = K();
    return c8(() => {
      var a15;
      u11 && u11.childNodes.length <= 0 && ((a15 = u11.parentElement) == null || a15.removeChild(u11));
    }), !u11 || !v3 ? null : createPortal(react_shim_default.createElement("div", { "data-headlessui-portal": "", ref: (a15) => {
      g3.dispose(), y4 && a15 && g3.add(y4.register(a15));
    } }, M4({ ourProps: { ref: n8 }, theirProps: p6, slot: {}, defaultTag: _3, name: "Portal" })), u11);
  });
  function D3(e7, o9) {
    let l8 = y(o9), { enabled: r10 = true, ownerDocument: p6, ...t6 } = e7, n8 = K();
    return r10 ? react_shim_default.createElement(I5, { ...t6, ownerDocument: p6, ref: l8 }) : n8({ ourProps: { ref: l8 }, theirProps: t6, slot: {}, defaultTag: _3, name: "Portal" });
  }
  var J = Fragment, c9 = createContext(null);
  function X(e7, o9) {
    let { target: l8, ...r10 } = e7, t6 = { ref: y(o9) }, n8 = K();
    return react_shim_default.createElement(c9.Provider, { value: l8 }, n8({ ourProps: t6, theirProps: r10, defaultTag: J, name: "Popover.Group" }));
  }
  var m5 = createContext(null);
  function oe() {
    let e7 = useContext(m5), o9 = useRef([]), l8 = o3((t6) => (o9.current.push(t6), e7 && e7.register(t6), () => r10(t6))), r10 = o3((t6) => {
      let n8 = o9.current.indexOf(t6);
      n8 !== -1 && o9.current.splice(n8, 1), e7 && e7.unregister(t6);
    }), p6 = useMemo(() => ({ register: l8, unregister: r10, portals: o9 }), [l8, r10, o9]);
    return [o9, useMemo(() => function({ children: n8 }) {
      return react_shim_default.createElement(m5.Provider, { value: p6 }, n8);
    }, [p6])];
  }
  var k4 = Y(D3), B = Y(X), le = Object.assign(k4, { Group: B });

  // node_modules/@headlessui/react/dist/hooks/use-escape.js
  function a12(o9, r10 = typeof document != "undefined" ? document.defaultView : null, t6) {
    let n8 = I3(o9, "escape");
    E5(r10, "keydown", (e7) => {
      n8 && (e7.defaultPrevented || e7.key === o5.Escape && t6(e7));
    });
  }

  // node_modules/@headlessui/react/dist/hooks/use-is-touch-device.js
  init_react_shim();
  function f8() {
    var t6;
    let [e7] = useState(() => typeof window != "undefined" && typeof window.matchMedia == "function" ? window.matchMedia("(pointer: coarse)") : null), [o9, c11] = useState((t6 = e7 == null ? void 0 : e7.matches) != null ? t6 : false);
    return n(() => {
      if (!e7) return;
      function n8(r10) {
        c11(r10.matches);
      }
      return e7.addEventListener("change", n8), () => e7.removeEventListener("change", n8);
    }, [e7]), o9;
  }

  // node_modules/@headlessui/react/dist/hooks/use-root-containers.js
  init_react_shim();
  function S5({ defaultContainers: l8 = [], portals: n8, mainTreeNode: o9 } = {}) {
    let c11 = o3(() => {
      var r10, u11;
      let i7 = l(o9), t6 = [];
      for (let e7 of l8) e7 !== null && (t3(e7) ? t6.push(e7) : "current" in e7 && t3(e7.current) && t6.push(e7.current));
      if (n8 != null && n8.current) for (let e7 of n8.current) t6.push(e7);
      for (let e7 of (r10 = i7 == null ? void 0 : i7.querySelectorAll("html > *, body > *")) != null ? r10 : []) e7 !== document.body && e7 !== document.head && t3(e7) && e7.id !== "headlessui-portal-root" && (o9 && (e7.contains(o9) || e7.contains((u11 = o9 == null ? void 0 : o9.getRootNode()) == null ? void 0 : u11.host)) || t6.some((E7) => e7.contains(E7)) || t6.push(e7));
      return t6;
    });
    return { resolveContainers: c11, contains: o3((i7) => c11().some((t6) => t6.contains(i7))) };
  }
  var d4 = createContext(null);
  function j6({ children: l8, node: n8 }) {
    let [o9, c11] = useState(null), i7 = x4(n8 != null ? n8 : o9);
    return react_shim_default.createElement(d4.Provider, { value: i7 }, l8, i7 === null && react_shim_default.createElement(f, { features: s4.Hidden, ref: (t6) => {
      var r10, u11;
      if (t6) {
        for (let e7 of (u11 = (r10 = l(t6)) == null ? void 0 : r10.querySelectorAll("html > *, body > *")) != null ? u11 : []) if (e7 !== document.body && e7 !== document.head && t3(e7) && e7 != null && e7.contains(t6)) {
          c11(e7);
          break;
        }
      }
    } }));
  }
  function x4(l8 = null) {
    var n8;
    return (n8 = useContext(d4)) != null ? n8 : l8;
  }

  // node_modules/@headlessui/react/dist/hooks/use-is-mounted.js
  init_react_shim();
  function f9() {
    let e7 = useRef(false);
    return n(() => (e7.current = true, () => {
      e7.current = false;
    }), []), e7;
  }

  // node_modules/@headlessui/react/dist/hooks/use-tab-direction.js
  init_react_shim();
  var a13 = ((r10) => (r10[r10.Forwards = 0] = "Forwards", r10[r10.Backwards = 1] = "Backwards", r10))(a13 || {});
  function u10() {
    let e7 = useRef(0);
    return s8(true, "keydown", (r10) => {
      r10.key === "Tab" && (e7.current = r10.shiftKey ? 1 : 0);
    }, true), e7;
  }

  // node_modules/@headlessui/react/dist/components/focus-trap/focus-trap.js
  init_react_shim();
  function x5(o9) {
    if (!o9) return /* @__PURE__ */ new Set();
    if (typeof o9 == "function") return new Set(o9());
    let t6 = /* @__PURE__ */ new Set();
    for (let e7 of o9.current) t3(e7.current) && t6.add(e7.current);
    return t6;
  }
  var $ = "div";
  var G3 = ((n8) => (n8[n8.None = 0] = "None", n8[n8.InitialFocus = 1] = "InitialFocus", n8[n8.TabLock = 2] = "TabLock", n8[n8.FocusLock = 4] = "FocusLock", n8[n8.RestoreFocus = 8] = "RestoreFocus", n8[n8.AutoFocus = 16] = "AutoFocus", n8))(G3 || {});
  function w5(o9, t6) {
    let e7 = useRef(null), r10 = y(e7, t6), { initialFocus: u11, initialFocusFallback: a15, containers: n8, features: s12 = 15, ...f11 } = o9;
    l6() || (s12 = 0);
    let l8 = u8(e7.current);
    re(s12, { ownerDocument: l8 });
    let T5 = ne(s12, { ownerDocument: l8, container: e7, initialFocus: u11, initialFocusFallback: a15 });
    oe2(s12, { ownerDocument: l8, container: e7, containers: n8, previousActiveElement: T5 });
    let g3 = u10(), A4 = o3((c11) => {
      if (!n3(e7.current)) return;
      let E7 = e7.current;
      ((V5) => V5())(() => {
        u(g3.current, { [a13.Forwards]: () => {
          v2(E7, T3.First, { skipElements: [c11.relatedTarget, a15] });
        }, [a13.Backwards]: () => {
          v2(E7, T3.Last, { skipElements: [c11.relatedTarget, a15] });
        } });
      });
    }), v3 = I3(!!(s12 & 2), "focus-trap#tab-lock"), N3 = p(), b5 = useRef(false), k5 = { ref: r10, onKeyDown(c11) {
      c11.key == "Tab" && (b5.current = true, N3.requestAnimationFrame(() => {
        b5.current = false;
      }));
    }, onBlur(c11) {
      if (!(s12 & 4)) return;
      let E7 = x5(n8);
      n3(e7.current) && E7.add(e7.current);
      let L4 = c11.relatedTarget;
      i2(L4) && L4.dataset.headlessuiFocusGuard !== "true" && (I6(E7, L4) || (b5.current ? v2(e7.current, u(g3.current, { [a13.Forwards]: () => T3.Next, [a13.Backwards]: () => T3.Previous }) | T3.WrapAround, { relativeTo: c11.target }) : i2(c11.target) && w3(c11.target)));
    } }, B2 = K();
    return react_shim_default.createElement(react_shim_default.Fragment, null, v3 && react_shim_default.createElement(f, { as: "button", type: "button", "data-headlessui-focus-guard": true, onFocus: A4, features: s4.Focusable }), B2({ ourProps: k5, theirProps: f11, defaultTag: $, name: "FocusTrap" }), v3 && react_shim_default.createElement(f, { as: "button", type: "button", "data-headlessui-focus-guard": true, onFocus: A4, features: s4.Focusable }));
  }
  var ee = Y(w5), ge = Object.assign(ee, { features: G3 });
  function te(o9 = true) {
    let t6 = useRef(n7.slice());
    return m4(([e7], [r10]) => {
      r10 === true && e7 === false && t(() => {
        t6.current.splice(0);
      }), r10 === false && e7 === true && (t6.current = n7.slice());
    }, [o9, n7, t6]), o3(() => {
      var e7;
      return (e7 = t6.current.find((r10) => r10 != null && r10.isConnected)) != null ? e7 : null;
    });
  }
  function re(o9, { ownerDocument: t6 }) {
    let e7 = !!(o9 & 8), r10 = te(e7);
    m4(() => {
      e7 || d2(t6 == null ? void 0 : t6.body) && w3(r10());
    }, [e7]), c8(() => {
      e7 && w3(r10());
    });
  }
  function ne(o9, { ownerDocument: t6, container: e7, initialFocus: r10, initialFocusFallback: u11 }) {
    let a15 = useRef(null), n8 = I3(!!(o9 & 1), "focus-trap#initial-focus"), s12 = f9();
    return m4(() => {
      if (o9 === 0) return;
      if (!n8) {
        u11 != null && u11.current && w3(u11.current);
        return;
      }
      let f11 = e7.current;
      f11 && t(() => {
        if (!s12.current) return;
        let l8 = t6 == null ? void 0 : t6.activeElement;
        if (r10 != null && r10.current) {
          if ((r10 == null ? void 0 : r10.current) === l8) {
            a15.current = l8;
            return;
          }
        } else if (f11.contains(l8)) {
          a15.current = l8;
          return;
        }
        if (r10 != null && r10.current) w3(r10.current);
        else {
          if (o9 & 16) {
            if (v2(f11, T3.First | T3.AutoFocus) !== A2.Error) return;
          } else if (v2(f11, T3.First) !== A2.Error) return;
          if (u11 != null && u11.current && (w3(u11.current), (t6 == null ? void 0 : t6.activeElement) === u11.current)) return;
          console.warn("There are no focusable elements inside the <FocusTrap />");
        }
        a15.current = t6 == null ? void 0 : t6.activeElement;
      });
    }, [u11, n8, o9]), a15;
  }
  function oe2(o9, { ownerDocument: t6, container: e7, containers: r10, previousActiveElement: u11 }) {
    let a15 = f9(), n8 = !!(o9 & 4);
    E5(t6 == null ? void 0 : t6.defaultView, "focus", (s12) => {
      if (!n8 || !a15.current) return;
      let f11 = x5(r10);
      n3(e7.current) && f11.add(e7.current);
      let l8 = u11.current;
      if (!l8) return;
      let T5 = s12.target;
      n3(T5) ? I6(f11, T5) ? (u11.current = T5, w3(T5)) : (s12.preventDefault(), s12.stopPropagation(), w3(l8)) : w3(u11.current);
    }, true);
  }
  function I6(o9, t6) {
    for (let e7 of o9) if (e7.contains(t6)) return true;
    return false;
  }

  // node_modules/@headlessui/react/dist/components/transition/transition.js
  init_react_shim();
  function ue(e7) {
    var t6;
    return !!(e7.enter || e7.enterFrom || e7.enterTo || e7.leave || e7.leaveFrom || e7.leaveTo) || !b((t6 = e7.as) != null ? t6 : de2) || react_shim_default.Children.count(e7.children) === 1;
  }
  var V3 = createContext(null);
  V3.displayName = "TransitionContext";
  var De = ((n8) => (n8.Visible = "visible", n8.Hidden = "hidden", n8))(De || {});
  function He() {
    let e7 = useContext(V3);
    if (e7 === null) throw new Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
    return e7;
  }
  function Ae() {
    let e7 = useContext(w6);
    if (e7 === null) throw new Error("A <Transition.Child /> is used but it is missing a parent <Transition /> or <Transition.Root />.");
    return e7;
  }
  var w6 = createContext(null);
  w6.displayName = "NestingContext";
  function M3(e7) {
    return "children" in e7 ? M3(e7.children) : e7.current.filter(({ el: t6 }) => t6.current !== null).filter(({ state: t6 }) => t6 === "visible").length > 0;
  }
  function Te(e7, t6) {
    let n8 = s2(e7), l8 = useRef([]), S6 = f9(), R2 = p(), d5 = o3((o9, i7 = C.Hidden) => {
      let a15 = l8.current.findIndex(({ el: s12 }) => s12 === o9);
      a15 !== -1 && (u(i7, { [C.Unmount]() {
        l8.current.splice(a15, 1);
      }, [C.Hidden]() {
        l8.current[a15].state = "hidden";
      } }), R2.microTask(() => {
        var s12;
        !M3(l8) && S6.current && ((s12 = n8.current) == null || s12.call(n8));
      }));
    }), y4 = o3((o9) => {
      let i7 = l8.current.find(({ el: a15 }) => a15 === o9);
      return i7 ? i7.state !== "visible" && (i7.state = "visible") : l8.current.push({ el: o9, state: "visible" }), () => d5(o9, C.Unmount);
    }), C9 = useRef([]), p6 = useRef(Promise.resolve()), h12 = useRef({ enter: [], leave: [] }), g3 = o3((o9, i7, a15) => {
      C9.current.splice(0), t6 && (t6.chains.current[i7] = t6.chains.current[i7].filter(([s12]) => s12 !== o9)), t6 == null || t6.chains.current[i7].push([o9, new Promise((s12) => {
        C9.current.push(s12);
      })]), t6 == null || t6.chains.current[i7].push([o9, new Promise((s12) => {
        Promise.all(h12.current[i7].map(([r10, f11]) => f11)).then(() => s12());
      })]), i7 === "enter" ? p6.current = p6.current.then(() => t6 == null ? void 0 : t6.wait.current).then(() => a15(i7)) : a15(i7);
    }), v3 = o3((o9, i7, a15) => {
      Promise.all(h12.current[i7].splice(0).map(([s12, r10]) => r10)).then(() => {
        var s12;
        (s12 = C9.current.shift()) == null || s12();
      }).then(() => a15(i7));
    });
    return useMemo(() => ({ children: l8, register: y4, unregister: d5, onStart: g3, onStop: v3, wait: p6, chains: h12 }), [y4, d5, l8, g3, v3, h12, p6]);
  }
  var de2 = Fragment, fe = A.RenderStrategy;
  function Fe(e7, t6) {
    var ee2, te2;
    let { transition: n8 = true, beforeEnter: l8, afterEnter: S6, beforeLeave: R2, afterLeave: d5, enter: y4, enterFrom: C9, enterTo: p6, entered: h12, leave: g3, leaveFrom: v3, leaveTo: o9, ...i7 } = e7, [a15, s12] = useState(null), r10 = useRef(null), f11 = ue(e7), U3 = y(...f11 ? [r10, t6, s12] : t6 === null ? [] : [t6]), H4 = (ee2 = i7.unmount) == null || ee2 ? C.Unmount : C.Hidden, { show: u11, appear: z3, initial: K3 } = He(), [m6, j7] = useState(u11 ? "visible" : "hidden"), Q2 = Ae(), { register: A4, unregister: F2 } = Q2;
    n(() => A4(r10), [A4, r10]), n(() => {
      if (H4 === C.Hidden && r10.current) {
        if (u11 && m6 !== "visible") {
          j7("visible");
          return;
        }
        return u(m6, { ["hidden"]: () => F2(r10), ["visible"]: () => A4(r10) });
      }
    }, [m6, r10, A4, F2, u11, H4]);
    let G4 = l6();
    n(() => {
      if (f11 && G4 && m6 === "visible" && r10.current === null) throw new Error("Did you forget to passthrough the `ref` to the actual DOM node?");
    }, [r10, m6, G4, f11]);
    let ce = K3 && !z3, Y2 = z3 && u11 && K3, B2 = useRef(false), I7 = Te(() => {
      B2.current || (j7("hidden"), F2(r10));
    }, Q2), Z2 = o3((W3) => {
      B2.current = true;
      let L4 = W3 ? "enter" : "leave";
      I7.onStart(r10, L4, (_5) => {
        _5 === "enter" ? l8 == null || l8() : _5 === "leave" && (R2 == null || R2());
      });
    }), $2 = o3((W3) => {
      let L4 = W3 ? "enter" : "leave";
      B2.current = false, I7.onStop(r10, L4, (_5) => {
        _5 === "enter" ? S6 == null || S6() : _5 === "leave" && (d5 == null || d5());
      }), L4 === "leave" && !M3(I7) && (j7("hidden"), F2(r10));
    });
    useEffect(() => {
      f11 && n8 || (Z2(u11), $2(u11));
    }, [u11, f11, n8]);
    let pe2 = /* @__PURE__ */ (() => !(!n8 || !f11 || !G4 || ce))(), [, T5] = N2(pe2, a15, u11, { start: Z2, end: $2 }), Ce3 = m({ ref: U3, className: ((te2 = t2(i7.className, Y2 && y4, Y2 && C9, T5.enter && y4, T5.enter && T5.closed && C9, T5.enter && !T5.closed && p6, T5.leave && g3, T5.leave && !T5.closed && v3, T5.leave && T5.closed && o9, !T5.transition && u11 && h12)) == null ? void 0 : te2.trim()) || void 0, ...x3(T5) }), N3 = 0;
    m6 === "visible" && (N3 |= i6.Open), m6 === "hidden" && (N3 |= i6.Closed), u11 && m6 === "hidden" && (N3 |= i6.Opening), !u11 && m6 === "visible" && (N3 |= i6.Closing);
    let he2 = K();
    return react_shim_default.createElement(w6.Provider, { value: I7 }, react_shim_default.createElement(c7, { value: N3 }, he2({ ourProps: Ce3, theirProps: i7, defaultTag: de2, features: fe, visible: m6 === "visible", name: "Transition.Child" })));
  }
  function Ie(e7, t6) {
    let { show: n8, appear: l8 = false, unmount: S6 = true, ...R2 } = e7, d5 = useRef(null), y4 = ue(e7), C9 = y(...y4 ? [d5, t6] : t6 === null ? [] : [t6]);
    l6();
    let p6 = u9();
    if (n8 === void 0 && p6 !== null && (n8 = (p6 & i6.Open) === i6.Open), n8 === void 0) throw new Error("A <Transition /> is used but it is missing a `show={true | false}` prop.");
    let [h12, g3] = useState(n8 ? "visible" : "hidden"), v3 = Te(() => {
      n8 || g3("hidden");
    }), [o9, i7] = useState(true), a15 = useRef([n8]);
    n(() => {
      o9 !== false && a15.current[a15.current.length - 1] !== n8 && (a15.current.push(n8), i7(false));
    }, [a15, n8]);
    let s12 = useMemo(() => ({ show: n8, appear: l8, initial: o9 }), [n8, l8, o9]);
    n(() => {
      n8 ? g3("visible") : !M3(v3) && d5.current !== null && g3("hidden");
    }, [n8, v3]);
    let r10 = { unmount: S6 }, f11 = o3(() => {
      var u11;
      o9 && i7(false), (u11 = e7.beforeEnter) == null || u11.call(e7);
    }), U3 = o3(() => {
      var u11;
      o9 && i7(false), (u11 = e7.beforeLeave) == null || u11.call(e7);
    }), H4 = K();
    return react_shim_default.createElement(w6.Provider, { value: v3 }, react_shim_default.createElement(V3.Provider, { value: s12 }, H4({ ourProps: { ...r10, as: Fragment, children: react_shim_default.createElement(me, { ref: C9, ...r10, ...R2, beforeEnter: f11, beforeLeave: U3 }) }, theirProps: {}, defaultTag: Fragment, features: fe, visible: h12 === "visible", name: "Transition" })));
  }
  function Le(e7, t6) {
    let n8 = useContext(V3) !== null, l8 = u9() !== null;
    return react_shim_default.createElement(react_shim_default.Fragment, null, !n8 && l8 ? react_shim_default.createElement(X2, { ref: t6, ...e7 }) : react_shim_default.createElement(me, { ref: t6, ...e7 }));
  }
  var X2 = Y(Ie), me = Y(Fe), Oe = Y(Le), Ke2 = Object.assign(X2, { Child: Oe, Root: X2 });

  // node_modules/@headlessui/react/dist/components/dialog/dialog.js
  init_react_shim();
  var we = ((o9) => (o9[o9.Open = 0] = "Open", o9[o9.Closed = 1] = "Closed", o9))(we || {}), Be = ((t6) => (t6[t6.SetTitleId = 0] = "SetTitleId", t6))(Be || {});
  var Ue = { [0](e7, t6) {
    return e7.titleId === t6.id ? e7 : { ...e7, titleId: t6.id };
  } }, w7 = createContext(null);
  w7.displayName = "DialogContext";
  function O2(e7) {
    let t6 = useContext(w7);
    if (t6 === null) {
      let o9 = new Error(`<${e7} /> is missing a parent <Dialog /> component.`);
      throw Error.captureStackTrace && Error.captureStackTrace(o9, O2), o9;
    }
    return t6;
  }
  function He2(e7, t6) {
    return u(t6.type, Ue, e7, t6);
  }
  var z = Y(function(t6, o9) {
    let a15 = useId(), { id: n8 = `headlessui-dialog-${a15}`, open: i7, onClose: p6, initialFocus: d5, role: s12 = "dialog", autoFocus: f11 = true, __demoMode: u11 = false, unmount: y4 = false, ...S6 } = t6, R2 = useRef(false);
    s12 = (function() {
      return s12 === "dialog" || s12 === "alertdialog" ? s12 : (R2.current || (R2.current = true, console.warn(`Invalid role [${s12}] passed to <Dialog />. Only \`dialog\` and and \`alertdialog\` are supported. Using \`dialog\` instead.`)), "dialog");
    })();
    let g3 = u9();
    i7 === void 0 && g3 !== null && (i7 = (g3 & i6.Open) === i6.Open);
    let T5 = useRef(null), I7 = y(T5, o9), F2 = u8(T5.current), c11 = i7 ? 0 : 1, [b5, Q2] = useReducer(He2, { titleId: null, descriptionId: null, panelRef: createRef() }), m6 = o3(() => p6(false)), B2 = o3((r10) => Q2({ type: 0, id: r10 })), D4 = l6() ? c11 === 0 : false, [Z2, ee2] = oe(), te2 = { get current() {
      var r10;
      return (r10 = b5.panelRef.current) != null ? r10 : T5.current;
    } }, v3 = x4(), { resolveContainers: M4 } = S5({ mainTreeNode: v3, portals: Z2, defaultContainers: [te2] }), U3 = g3 !== null ? (g3 & i6.Closing) === i6.Closing : false;
    y3(u11 || U3 ? false : D4, { allowed: o3(() => {
      var r10, W3;
      return [(W3 = (r10 = T5.current) == null ? void 0 : r10.closest("[data-headlessui-portal]")) != null ? W3 : null];
    }), disallowed: o3(() => {
      var r10;
      return [(r10 = v3 == null ? void 0 : v3.closest("body > *:not(#headlessui-portal-root)")) != null ? r10 : null];
    }) });
    let P4 = x.get(null);
    n(() => {
      if (D4) return P4.actions.push(n8), () => P4.actions.pop(n8);
    }, [P4, n8, D4]);
    let H4 = S2(P4, useCallback((r10) => P4.selectors.isTop(r10, n8), [P4, n8]));
    k3(H4, M4, (r10) => {
      r10.preventDefault(), m6();
    }), a12(H4, F2 == null ? void 0 : F2.defaultView, (r10) => {
      r10.preventDefault(), r10.stopPropagation(), document.activeElement && "blur" in document.activeElement && typeof document.activeElement.blur == "function" && document.activeElement.blur(), m6();
    }), f7(u11 || U3 ? false : D4, F2, M4), p5(D4, T5, m6);
    let [oe3, ne2] = H2(), re2 = useMemo(() => [{ dialogState: c11, close: m6, setTitleId: B2, unmount: y4 }, b5], [c11, m6, B2, y4, b5]), N3 = n2({ open: c11 === 0 }), le2 = { ref: I7, id: n8, role: s12, tabIndex: -1, "aria-modal": u11 ? void 0 : c11 === 0 ? true : void 0, "aria-labelledby": b5.titleId, "aria-describedby": oe3, unmount: y4 }, ae = !f8(), E7 = G3.None;
    D4 && !u11 && (E7 |= G3.RestoreFocus, E7 |= G3.TabLock, f11 && (E7 |= G3.AutoFocus), ae && (E7 |= G3.InitialFocus));
    let ie = K();
    return react_shim_default.createElement(s9, null, react_shim_default.createElement(l7, { force: true }, react_shim_default.createElement(le, null, react_shim_default.createElement(w7.Provider, { value: re2 }, react_shim_default.createElement(B, { target: T5 }, react_shim_default.createElement(l7, { force: false }, react_shim_default.createElement(ne2, { slot: N3 }, react_shim_default.createElement(ee2, null, react_shim_default.createElement(ge, { initialFocus: d5, initialFocusFallback: T5, containers: M4, features: E7 }, react_shim_default.createElement(C5, { value: m6 }, ie({ ourProps: le2, theirProps: S6, slot: N3, defaultTag: Ne, features: We, visible: c11 === 0, name: "Dialog" })))))))))));
  }), Ne = "div", We = A.RenderStrategy | A.Static;
  function $e(e7, t6) {
    let { transition: o9 = false, open: a15, ...n8 } = e7, i7 = u9(), p6 = e7.hasOwnProperty("open") || i7 !== null, d5 = e7.hasOwnProperty("onClose");
    if (!p6 && !d5) throw new Error("You have to provide an `open` and an `onClose` prop to the `Dialog` component.");
    if (!p6) throw new Error("You provided an `onClose` prop to the `Dialog`, but forgot an `open` prop.");
    if (!d5) throw new Error("You provided an `open` prop to the `Dialog`, but forgot an `onClose` prop.");
    if (!i7 && typeof e7.open != "boolean") throw new Error(`You provided an \`open\` prop to the \`Dialog\`, but the value is not a boolean. Received: ${e7.open}`);
    if (typeof e7.onClose != "function") throw new Error(`You provided an \`onClose\` prop to the \`Dialog\`, but the value is not a function. Received: ${e7.onClose}`);
    return (a15 !== void 0 || o9) && !n8.static ? react_shim_default.createElement(j6, null, react_shim_default.createElement(Ke2, { show: a15, transition: o9, unmount: n8.unmount }, react_shim_default.createElement(z, { ref: t6, ...n8 }))) : react_shim_default.createElement(j6, null, react_shim_default.createElement(z, { ref: t6, open: a15, ...n8 }));
  }
  var je = "div";
  function Ye(e7, t6) {
    let o9 = useId(), { id: a15 = `headlessui-dialog-panel-${o9}`, transition: n8 = false, ...i7 } = e7, [{ dialogState: p6, unmount: d5 }, s12] = O2("Dialog.Panel"), f11 = y(t6, s12.panelRef), u11 = n2({ open: p6 === 0 }), y4 = o3((I7) => {
      I7.stopPropagation();
    }), S6 = { ref: f11, id: a15, onClick: y4 }, R2 = n8 ? Oe : Fragment, g3 = n8 ? { unmount: d5 } : {}, T5 = K();
    return react_shim_default.createElement(R2, { ...g3 }, T5({ ourProps: S6, theirProps: i7, slot: u11, defaultTag: je, name: "Dialog.Panel" }));
  }
  var Je = "div";
  function Ke3(e7, t6) {
    let { transition: o9 = false, ...a15 } = e7, [{ dialogState: n8, unmount: i7 }] = O2("Dialog.Backdrop"), p6 = n2({ open: n8 === 0 }), d5 = { ref: t6, "aria-hidden": true }, s12 = o9 ? Oe : Fragment, f11 = o9 ? { unmount: i7 } : {}, u11 = K();
    return react_shim_default.createElement(s12, { ...f11 }, u11({ ourProps: d5, theirProps: a15, slot: p6, defaultTag: Je, name: "Dialog.Backdrop" }));
  }
  var Xe = "h2";
  function Ve(e7, t6) {
    let o9 = useId(), { id: a15 = `headlessui-dialog-title-${o9}`, ...n8 } = e7, [{ dialogState: i7, setTitleId: p6 }] = O2("Dialog.Title"), d5 = y(t6);
    useEffect(() => (p6(a15), () => p6(null)), [a15, p6]);
    let s12 = n2({ open: i7 === 0 }), f11 = { ref: d5, id: a15 };
    return K()({ ourProps: f11, theirProps: n8, slot: s12, defaultTag: Xe, name: "Dialog.Title" });
  }
  var qe = Y($e), ze = Y(Ye), Lt = Y(Ke3), Qe = Y(Ve), xt = M, ht = Object.assign(qe, { Panel: ze, Title: Qe, Description: M });

  // node_modules/@headlessui/react/dist/components/field/field.js
  init_react_shim();
  var _4 = "div";
  function c10(d5, l8) {
    let t6 = `headlessui-control-${useId()}`, [p6, n8] = V2(), [s12, a15] = H2(), m6 = a(), { disabled: r10 = m6 || false, ...o9 } = d5, i7 = n2({ disabled: r10 }), f11 = { ref: l8, disabled: r10 || void 0, "aria-disabled": r10 || void 0 }, F2 = K();
    return react_shim_default.createElement(l2, { value: r10 }, react_shim_default.createElement(n8, { value: p6 }, react_shim_default.createElement(a15, { value: s12 }, react_shim_default.createElement(f3, { id: t6 }, F2({ ourProps: f11, theirProps: { ...o9, children: react_shim_default.createElement(W, null, typeof o9.children == "function" ? o9.children(i7) : o9.children) }, slot: i7, defaultTag: _4, name: "Field" })))));
  }
  var W2 = Y(c10);

  // node_modules/@headlessui/react/dist/components/input/input.js
  var x6 = "input";
  function h5(r10, p6) {
    let n8 = useId(), s12 = u2(), a15 = a(), { id: l8 = s12 || `headlessui-input-${n8}`, disabled: e7 = a15 || false, autoFocus: o9 = false, invalid: t6 = false, ...i7 } = r10, d5 = N(), u11 = w2(), { isFocused: f11, focusProps: m6 } = $0c4a58759813079a$export$4e328f61c538687f({ autoFocus: o9 }), { isHovered: T5, hoverProps: b5 } = $e969f22b6713ca4a$export$ae780daf29e6d456({ isDisabled: e7 }), y4 = V({ ref: p6, id: l8, "aria-labelledby": d5, "aria-describedby": u11, "aria-invalid": t6 ? "true" : void 0, disabled: e7 || void 0, autoFocus: o9 }, m6, b5), I7 = n2({ disabled: e7, invalid: t6, hover: T5, focus: f11, autofocus: o9 });
    return K()({ ourProps: y4, theirProps: i7, slot: I7, defaultTag: x6, name: "Input" });
  }
  var X3 = Y(h5);

  // node_modules/@headlessui/react/dist/components/switch/switch.js
  init_react_shim();
  var E6 = createContext(null);
  E6.displayName = "GroupContext";
  var ve = Fragment;
  function xe(n8) {
    var c11;
    let [t6, a15] = useState(null), [f11, h12] = V2(), [b5, o9] = H2(), s12 = useMemo(() => ({ switch: t6, setSwitch: a15 }), [t6, a15]), T5 = {}, y4 = n8, p6 = K();
    return react_shim_default.createElement(o9, { name: "Switch.Description", value: b5 }, react_shim_default.createElement(h12, { name: "Switch.Label", value: f11, props: { htmlFor: (c11 = s12.switch) == null ? void 0 : c11.id, onClick(u11) {
      t6 && (m2(u11.currentTarget) && u11.preventDefault(), t6.click(), t6.focus({ preventScroll: true }));
    } } }, react_shim_default.createElement(E6.Provider, { value: s12 }, p6({ ourProps: T5, theirProps: y4, slot: {}, defaultTag: ve, name: "Switch.Group" }))));
  }
  var Ce = "button";
  function Le2(n8, t6) {
    var g3;
    let a15 = useId(), f11 = u2(), h12 = a(), { id: b5 = f11 || `headlessui-switch-${a15}`, disabled: o9 = h12 || false, checked: s12, defaultChecked: T5, onChange: y4, name: p6, value: c11, form: u11, autoFocus: S6 = false, ...C9 } = n8, _5 = useContext(E6), [L4, R2] = useState(null), G4 = useRef(null), A4 = y(G4, t6, _5 === null ? null : _5.setSwitch, R2), l8 = l3(T5), [d5, r10] = b2(s12, y4, l8 != null ? l8 : false), F2 = p(), [H4, P4] = useState(false), D4 = o3(() => {
      P4(true), r10 == null || r10(!d5), F2.nextFrame(() => {
        P4(false);
      });
    }), k5 = o3((e7) => {
      if (s6(e7.currentTarget)) return e7.preventDefault();
      e7.preventDefault(), D4();
    }), M4 = o3((e7) => {
      e7.key === o5.Space ? (e7.preventDefault(), D4()) : e7.key === o5.Enter && g(e7.currentTarget);
    }), U3 = o3((e7) => e7.preventDefault()), I7 = N(), B2 = w2(), { isFocusVisible: K3, focusProps: O3 } = $0c4a58759813079a$export$4e328f61c538687f({ autoFocus: S6 }), { isHovered: W3, hoverProps: N3 } = $e969f22b6713ca4a$export$ae780daf29e6d456({ isDisabled: o9 }), { pressed: J2, pressProps: V5 } = w({ disabled: o9 }), X4 = n2({ checked: d5, disabled: o9, hover: W3, focus: K3, active: J2, autofocus: S6, changing: H4 }), j7 = V({ id: b5, ref: A4, role: "switch", type: e5(n8, L4), tabIndex: n8.tabIndex === -1 ? 0 : (g3 = n8.tabIndex) != null ? g3 : 0, "aria-checked": d5, "aria-labelledby": I7, "aria-describedby": B2, disabled: o9 || void 0, autoFocus: S6, onClick: k5, onKeyUp: M4, onKeyPress: U3 }, O3, N3, V5), $2 = useCallback(() => {
      if (l8 !== void 0) return r10 == null ? void 0 : r10(l8);
    }, [r10, l8]), q = K();
    return react_shim_default.createElement(react_shim_default.Fragment, null, p6 != null && react_shim_default.createElement(j, { disabled: o9, data: { [p6]: c11 || "on" }, overrides: { type: "checkbox", checked: d5 }, form: u11, onReset: $2 }), q({ ourProps: j7, theirProps: C9, slot: X4, defaultTag: Ce, name: "Switch" }));
  }
  var Re = Y(Le2), Ge = xe, Ae2 = Z, Fe2 = M, tt = Object.assign(Re, { Group: Ge, Label: Ae2, Description: Fe2 });

  // node_modules/@headlessui/react/dist/internal/focus-sentinel.js
  init_react_shim();
  function b4({ onFocus: n8 }) {
    let [r10, o9] = useState(true), u11 = f9();
    return r10 ? react_shim_default.createElement(f, { as: "button", type: "button", features: s4.Focusable, onFocus: (a15) => {
      a15.preventDefault();
      let e7, i7 = 50;
      function t6() {
        if (i7-- <= 0) {
          e7 && cancelAnimationFrame(e7);
          return;
        }
        if (n8()) {
          if (cancelAnimationFrame(e7), !u11.current) return;
          o9(false);
          return;
        }
        e7 = requestAnimationFrame(t6);
      }
      e7 = requestAnimationFrame(t6);
    } }) : null;
  }

  // node_modules/@headlessui/react/dist/utils/stable-collection.js
  init_react_shim();
  var s11 = createContext(null);
  function a14() {
    return { groups: /* @__PURE__ */ new Map(), get(o9, e7) {
      var i7;
      let t6 = this.groups.get(o9);
      t6 || (t6 = /* @__PURE__ */ new Map(), this.groups.set(o9, t6));
      let n8 = (i7 = t6.get(e7)) != null ? i7 : 0;
      t6.set(e7, n8 + 1);
      let r10 = Array.from(t6.keys()).indexOf(e7);
      function u11() {
        let c11 = t6.get(e7);
        c11 > 1 ? t6.set(e7, c11 - 1) : t6.delete(e7);
      }
      return [r10, u11];
    } };
  }
  function f10({ children: o9 }) {
    let e7 = useRef(a14());
    return createElement(s11.Provider, { value: e7 }, o9);
  }
  function C8(o9) {
    let e7 = useContext(s11);
    if (!e7) throw new Error("You must wrap your component in a <StableCollection>");
    let t6 = useId(), [n8, r10] = e7.current.get(o9, t6);
    return useEffect(() => r10, []), n8;
  }

  // node_modules/@headlessui/react/dist/components/tabs/tabs.js
  init_react_shim();
  var Le3 = ((t6) => (t6[t6.Forwards = 0] = "Forwards", t6[t6.Backwards = 1] = "Backwards", t6))(Le3 || {}), _e = ((l8) => (l8[l8.Less = -1] = "Less", l8[l8.Equal = 0] = "Equal", l8[l8.Greater = 1] = "Greater", l8))(_e || {}), Se = ((n8) => (n8[n8.SetSelectedIndex = 0] = "SetSelectedIndex", n8[n8.RegisterTab = 1] = "RegisterTab", n8[n8.UnregisterTab = 2] = "UnregisterTab", n8[n8.RegisterPanel = 3] = "RegisterPanel", n8[n8.UnregisterPanel = 4] = "UnregisterPanel", n8))(Se || {});
  var De2 = { [0](e7, r10) {
    var d5;
    let t6 = G2(e7.tabs, (u11) => u11.current), l8 = G2(e7.panels, (u11) => u11.current), a15 = t6.filter((u11) => {
      var T5;
      return !((T5 = u11.current) != null && T5.hasAttribute("disabled"));
    }), n8 = { ...e7, tabs: t6, panels: l8 };
    if (r10.index < 0 || r10.index > t6.length - 1) {
      let u11 = u(Math.sign(r10.index - e7.selectedIndex), { [-1]: () => 1, [0]: () => u(Math.sign(r10.index), { [-1]: () => 0, [0]: () => 0, [1]: () => 1 }), [1]: () => 0 });
      if (a15.length === 0) return n8;
      let T5 = u(u11, { [0]: () => t6.indexOf(a15[0]), [1]: () => t6.indexOf(a15[a15.length - 1]) });
      return { ...n8, selectedIndex: T5 === -1 ? e7.selectedIndex : T5 };
    }
    let s12 = t6.slice(0, r10.index), f11 = [...t6.slice(r10.index), ...s12].find((u11) => a15.includes(u11));
    if (!f11) return n8;
    let b5 = (d5 = t6.indexOf(f11)) != null ? d5 : e7.selectedIndex;
    return b5 === -1 && (b5 = e7.selectedIndex), { ...n8, selectedIndex: b5 };
  }, [1](e7, r10) {
    if (e7.tabs.includes(r10.tab)) return e7;
    let t6 = e7.tabs[e7.selectedIndex], l8 = G2([...e7.tabs, r10.tab], (n8) => n8.current), a15 = e7.selectedIndex;
    return e7.info.current.isControlled || (a15 = l8.indexOf(t6), a15 === -1 && (a15 = e7.selectedIndex)), { ...e7, tabs: l8, selectedIndex: a15 };
  }, [2](e7, r10) {
    return { ...e7, tabs: e7.tabs.filter((t6) => t6 !== r10.tab) };
  }, [3](e7, r10) {
    return e7.panels.includes(r10.panel) ? e7 : { ...e7, panels: G2([...e7.panels, r10.panel], (t6) => t6.current) };
  }, [4](e7, r10) {
    return { ...e7, panels: e7.panels.filter((t6) => t6 !== r10.panel) };
  } }, z2 = createContext(null);
  z2.displayName = "TabsDataContext";
  function h6(e7) {
    let r10 = useContext(z2);
    if (r10 === null) {
      let t6 = new Error(`<${e7} /> is missing a parent <Tab.Group /> component.`);
      throw Error.captureStackTrace && Error.captureStackTrace(t6, h6), t6;
    }
    return r10;
  }
  var V4 = createContext(null);
  V4.displayName = "TabsActionsContext";
  function Q(e7) {
    let r10 = useContext(V4);
    if (r10 === null) {
      let t6 = new Error(`<${e7} /> is missing a parent <Tab.Group /> component.`);
      throw Error.captureStackTrace && Error.captureStackTrace(t6, Q), t6;
    }
    return r10;
  }
  function Fe3(e7, r10) {
    return u(r10.type, De2, e7, r10);
  }
  var Ie2 = "div";
  function he(e7, r10) {
    let { defaultIndex: t6 = 0, vertical: l8 = false, manual: a15 = false, onChange: n8, selectedIndex: s12 = null, ...g3 } = e7;
    const f11 = l8 ? "vertical" : "horizontal", b5 = a15 ? "manual" : "auto";
    let d5 = s12 !== null, u11 = s2({ isControlled: d5 }), T5 = y(r10), [p6, c11] = useReducer(Fe3, { info: u11, selectedIndex: s12 != null ? s12 : t6, tabs: [], panels: [] }), v3 = n2({ selectedIndex: p6.selectedIndex }), m6 = s2(n8 || (() => {
    })), C9 = s2(p6.tabs), D4 = useMemo(() => ({ orientation: f11, activation: b5, ...p6 }), [f11, b5, p6]), P4 = o3((i7) => (c11({ type: 1, tab: i7 }), () => c11({ type: 2, tab: i7 }))), R2 = o3((i7) => (c11({ type: 3, panel: i7 }), () => c11({ type: 4, panel: i7 }))), A4 = o3((i7) => {
      L4.current !== i7 && m6.current(i7), d5 || c11({ type: 0, index: i7 });
    }), L4 = s2(d5 ? e7.selectedIndex : p6.selectedIndex), _5 = useMemo(() => ({ registerTab: P4, registerPanel: R2, change: A4 }), []);
    n(() => {
      c11({ type: 0, index: s12 != null ? s12 : t6 });
    }, [s12]), n(() => {
      if (L4.current === void 0 || p6.tabs.length <= 0) return;
      let i7 = G2(p6.tabs, (S6) => S6.current);
      i7.some((S6, $2) => p6.tabs[$2] !== S6) && A4(i7.indexOf(p6.tabs[L4.current]));
    });
    let J2 = { ref: T5 }, X4 = K();
    return react_shim_default.createElement(f10, null, react_shim_default.createElement(V4.Provider, { value: _5 }, react_shim_default.createElement(z2.Provider, { value: D4 }, D4.tabs.length <= 0 && react_shim_default.createElement(b4, { onFocus: () => {
      var i7, M4;
      for (let S6 of C9.current) if (((i7 = S6.current) == null ? void 0 : i7.tabIndex) === 0) return (M4 = S6.current) == null || M4.focus(), true;
      return false;
    } }), X4({ ourProps: J2, theirProps: g3, slot: v3, defaultTag: Ie2, name: "Tabs" }))));
  }
  var ve2 = "div";
  function Ce2(e7, r10) {
    let { orientation: t6, selectedIndex: l8 } = h6("Tab.List"), a15 = y(r10), n8 = n2({ selectedIndex: l8 }), s12 = e7, g3 = { ref: a15, role: "tablist", "aria-orientation": t6 };
    return K()({ ourProps: g3, theirProps: s12, slot: n8, defaultTag: ve2, name: "Tabs.List" });
  }
  var Me = "button";
  function Ge2(e7, r10) {
    var Y2, Z2;
    let t6 = useId(), { id: l8 = `headlessui-tabs-tab-${t6}`, disabled: a15 = false, autoFocus: n8 = false, ...s12 } = e7, { orientation: g3, activation: f11, selectedIndex: b5, tabs: d5, panels: u11 } = h6("Tab"), T5 = Q("Tab"), p6 = h6("Tab"), [c11, v3] = useState(null), m6 = useRef(null), C9 = y(m6, r10, v3);
    n(() => T5.registerTab(m6), [T5, m6]);
    let D4 = C8("tabs"), P4 = d5.indexOf(m6);
    P4 === -1 && (P4 = D4);
    let R2 = P4 === b5, A4 = o3((o9) => {
      let E7 = o9();
      if (E7 === A2.Success && f11 === "auto") {
        let ee2 = e(m6.current), B2 = p6.tabs.findIndex((ce) => ce.current === ee2);
        B2 !== -1 && T5.change(B2);
      }
      return E7;
    }), L4 = o3((o9) => {
      let E7 = d5.map((B2) => B2.current).filter(Boolean);
      if (o9.key === o5.Space || o9.key === o5.Enter) {
        o9.preventDefault(), o9.stopPropagation(), T5.change(P4);
        return;
      }
      switch (o9.key) {
        case o5.Home:
        case o5.PageUp:
          return o9.preventDefault(), o9.stopPropagation(), A4(() => v2(E7, T3.First));
        case o5.End:
        case o5.PageDown:
          return o9.preventDefault(), o9.stopPropagation(), A4(() => v2(E7, T3.Last));
      }
      if (A4(() => u(g3, { vertical() {
        return o9.key === o5.ArrowUp ? v2(E7, T3.Previous | T3.WrapAround) : o9.key === o5.ArrowDown ? v2(E7, T3.Next | T3.WrapAround) : A2.Error;
      }, horizontal() {
        return o9.key === o5.ArrowLeft ? v2(E7, T3.Previous | T3.WrapAround) : o9.key === o5.ArrowRight ? v2(E7, T3.Next | T3.WrapAround) : A2.Error;
      } })) === A2.Success) return o9.preventDefault();
    }), _5 = useRef(false), J2 = o3(() => {
      var o9;
      _5.current || (_5.current = true, (o9 = m6.current) == null || o9.focus({ preventScroll: true }), T5.change(P4), t(() => {
        _5.current = false;
      }));
    }), X4 = o3((o9) => {
      o9.preventDefault();
    }), { isFocusVisible: i7, focusProps: M4 } = $0c4a58759813079a$export$4e328f61c538687f({ autoFocus: n8 }), { isHovered: S6, hoverProps: $2 } = $e969f22b6713ca4a$export$ae780daf29e6d456({ isDisabled: a15 }), { pressed: pe2, pressProps: ue2 } = w({ disabled: a15 }), Te2 = n2({ selected: R2, hover: S6, active: pe2, focus: i7, autofocus: n8, disabled: a15 }), de3 = V({ ref: C9, onKeyDown: L4, onMouseDown: X4, onClick: J2, id: l8, role: "tab", type: e5(e7, c11), "aria-controls": (Z2 = (Y2 = u11[P4]) == null ? void 0 : Y2.current) == null ? void 0 : Z2.id, "aria-selected": R2, tabIndex: R2 ? 0 : -1, disabled: a15 || void 0, autoFocus: n8 }, M4, $2, ue2);
    return K()({ ourProps: de3, theirProps: s12, slot: Te2, defaultTag: Me, name: "Tabs.Tab" });
  }
  var Ue2 = "div";
  function He3(e7, r10) {
    let { selectedIndex: t6 } = h6("Tab.Panels"), l8 = y(r10), a15 = n2({ selectedIndex: t6 }), n8 = e7, s12 = { ref: l8 };
    return K()({ ourProps: s12, theirProps: n8, slot: a15, defaultTag: Ue2, name: "Tabs.Panels" });
  }
  var we2 = "div", Oe2 = A.RenderStrategy | A.Static;
  function Ne2(e7, r10) {
    var R2, A4, L4, _5;
    let t6 = useId(), { id: l8 = `headlessui-tabs-panel-${t6}`, tabIndex: a15 = 0, ...n8 } = e7, { selectedIndex: s12, tabs: g3, panels: f11 } = h6("Tab.Panel"), b5 = Q("Tab.Panel"), d5 = useRef(null), u11 = y(d5, r10);
    n(() => b5.registerPanel(d5), [b5, d5]);
    let T5 = C8("panels"), p6 = f11.indexOf(d5);
    p6 === -1 && (p6 = T5);
    let c11 = p6 === s12, { isFocusVisible: v3, focusProps: m6 } = $0c4a58759813079a$export$4e328f61c538687f(), C9 = n2({ selected: c11, focus: v3 }), D4 = V({ ref: u11, id: l8, role: "tabpanel", "aria-labelledby": (A4 = (R2 = g3[p6]) == null ? void 0 : R2.current) == null ? void 0 : A4.id, tabIndex: c11 ? a15 : -1 }, m6), P4 = K();
    return !c11 && ((L4 = n8.unmount) == null || L4) && !((_5 = n8.static) != null && _5) ? react_shim_default.createElement(f, { "aria-hidden": "true", ...D4 }) : P4({ ourProps: D4, theirProps: n8, slot: C9, defaultTag: we2, features: Oe2, visible: c11, name: "Tabs.Panel" });
  }
  var ke = Y(Ge2), Be2 = Y(he), We2 = Y(Ce2), je2 = Y(He3), Ke4 = Y(Ne2), dt = Object.assign(ke, { Group: Be2, List: We2, Panels: je2, Panel: Ke4 });

  // client/src/components/DialogShell.jsx
  function h7() {
    return window.__React.createElement.apply(window.__React, arguments);
  }
  var SIZE_MAP = { sm: 576, md: 768, lg: 1152 };
  var HEIGHT_MAP = { sm: "220px", md: "480px", lg: "80vh" };
  function DialogShell(props) {
    var variant = props.variant === "drawer" ? "drawer" : "modal";
    var isDrawer = variant === "drawer";
    var size = props.size || "lg";
    var width = SIZE_MAP[size] || 1116;
    var height = HEIGHT_MAP[size] || "640px";
    return h7(
      ht,
      {
        open: props.open,
        onClose: props.onClose,
        className: "relative z-[100] data-[closed]:hidden"
      },
      h7(Lt, {
        transition: true,
        className: "fixed inset-0 bg-black/40 transition duration-200 ease-out data-[closed]:opacity-0"
      }),
      h7(
        "div",
        { className: isDrawer ? "fixed inset-0 flex justify-end" : "fixed inset-0 flex items-center justify-center p-4", style: { overscrollBehaviorY: "contain" } },
        h7(
          ze,
          {
            transition: true,
            className: (isDrawer ? "h-full w-[min(1056px,94vw)] bg-aq-paper shadow-2xl transition duration-200 ease-out data-[closed]:translate-x-4 data-[closed]:opacity-0 flex flex-col" : "w-[960px] rounded-2xl bg-aq-paper shadow-2xl border border-aq-line transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 flex flex-col overflow-hidden") + (props.className ? " " + props.className : ""),
            style: isDrawer ? {} : Object.assign({ maxHeight: height }, props.style || {})
          },
          isDrawer ? h7(DrawerHeader, { title: props.title, onClose: props.onClose }) : h7(ModalHeader, { title: props.title, onClose: props.onClose }),
          h7("div", { className: "flex-1 min-h-0 overflow-hidden flex flex-col" }, props.children)
        )
      )
    );
  }
  function ModalHeader(props) {
    return h7(
      "div",
      { className: "flex items-center justify-between px-6 pt-5 pb-4 border-b border-aq-line" },
      h7(Qe, { className: "text-lg font-bold text-aq-ink" }, props.title),
      h7(CloseButton, { onClose: props.onClose })
    );
  }
  function DrawerHeader(props) {
    return h7(
      "div",
      { className: "flex items-start gap-3 px-6 pt-5 pb-4 border-b border-aq-line bg-aq-paper" },
      h7(
        "div",
        { className: "flex-1 min-w-0" },
        h7(Qe, { className: "text-lg font-bold text-aq-ink break-words" }, props.title)
      ),
      h7(CloseButton, { onClose: props.onClose })
    );
  }
  function CloseButton(props) {
    return h7("button", {
      onClick: props.onClose,
      className: "grid w-7 h-7 flex-shrink-0 place-items-center rounded-lg border border-aq-line bg-aq-paper text-aq-muted hover:border-aq-line-2 hover:text-aq-ink transition",
      "aria-label": "\u5173\u95ED",
      dangerouslySetInnerHTML: { __html: iconHtml("close") }
    });
  }

  // client/src/components/MarkdownRenderer.jsx
  function renderMarkdown(text) {
    if (!text) return "";
    var lines = text.split("\n");
    var html = "";
    var inCodeBlock = false;
    var codeBlockContent = "";
    var codeBlockLang = "";
    var inList = false;
    var listType = "";
    for (var i7 = 0; i7 < lines.length; i7++) {
      var line = lines[i7];
      if (/^```/.test(line)) {
        if (inCodeBlock) {
          html += "<pre class='aq-mk-pre'><code" + (codeBlockLang ? " class='language-" + escapeHtml(codeBlockLang) + "'" : "") + ">" + codeBlockContent + "</code></pre>\n";
          codeBlockContent = "";
          codeBlockLang = "";
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeBlockLang = line.slice(3).trim();
        }
        continue;
      }
      if (inCodeBlock) {
        codeBlockContent += (codeBlockContent ? "\n" : "") + line;
        continue;
      }
      if (inList && !/^(\s*[-*+]\s|\s*\d+\.\s)/.test(line) && line.trim() !== "") {
        html += "</" + listType + ">\n";
        inList = false;
      }
      var ulMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
      if (ulMatch) {
        if (!inList || listType !== "ul") {
          if (inList) html += "</" + listType + ">\n";
          html += "<ul class='aq-mk-ul'>\n";
          inList = true;
          listType = "ul";
        }
        html += "<li>" + inlineMarkdown(ulMatch[2]) + "</li>\n";
        continue;
      }
      var olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
      if (olMatch) {
        if (!inList || listType !== "ol") {
          if (inList) html += "</" + listType + ">\n";
          html += "<ol class='aq-mk-ol'>\n";
          inList = true;
          listType = "ol";
        }
        html += "<li>" + inlineMarkdown(olMatch[3]) + "</li>\n";
        continue;
      }
      if (line.trim() === "") {
        if (inList) {
          html += "</" + listType + ">\n";
          inList = false;
        }
        continue;
      }
      var headingMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (headingMatch) {
        var level = headingMatch[1].length;
        html += "<h" + level + " class='aq-mk-h" + level + "'>" + inlineMarkdown(headingMatch[2]) + "</h" + level + ">\n";
        continue;
      }
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        html += "<hr class='aq-mk-hr' />\n";
        continue;
      }
      var blockquoteMatch = line.match(/^>\s*(.*)/);
      if (blockquoteMatch) {
        html += "<blockquote class='aq-mk-blockquote'><p>" + inlineMarkdown(blockquoteMatch[1]) + "</p></blockquote>\n";
        continue;
      }
      html += "<p class='aq-mk-p'>" + inlineMarkdown(line) + "</p>\n";
    }
    if (inCodeBlock) {
      html += "<pre class='aq-mk-pre'><code" + (codeBlockLang ? " class='language-" + escapeHtml(codeBlockLang) + "'" : "") + ">" + codeBlockContent + "</code></pre>\n";
    }
    if (inList) {
      html += "</" + listType + ">\n";
    }
    return html;
  }
  function inlineMarkdown(text) {
    if (!text) return "";
    text = text.replace(/`([^`]+)`/g, "<code class='aq-mk-code'>$1</code>");
    text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a class='aq-mk-a' href='$2' target='_blank' rel='noopener'>$1</a>");
    return text;
  }
  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // client/src/components/TaskDetail.jsx
  function h8() {
    return window.__React.createElement.apply(window.__React, arguments);
  }
  function TaskDetailPanel(props) {
    var task = props.task;
    var transport = props.transport;
    var controller = props.controller;
    var detail = window.__React.useState(null);
    var loading = window.__React.useState(true);
    var detailError = window.__React.useState("");
    var retry = window.__React.useState(0);
    window.__React.useEffect(function() {
      var cancelled = false;
      detail[1](null);
      detailError[1]("");
      loading[1](true);
      transport.detail(task.key).then(function(data) {
        if (cancelled) return;
        detail[1](data);
        loading[1](false);
      }).catch(function(err) {
        if (!cancelled) {
          detailError[1](err && err.message ? err.message : "\u65E0\u6CD5\u8BFB\u53D6\u4EFB\u52A1\u8BE6\u60C5");
          loading[1](false);
        }
      });
      return function() {
        cancelled = true;
      };
    }, [task.key, transport, retry[0]]);
    var current = detail[0] && detail[0].task && detail[0].task.key === task.key ? detail[0] : null;
    var value = current ? current.task : task;
    var status = STATUS_CONFIG[value.status] || { label: value.status, color: "#596579" };
    var sessionId = value.sessionId || value.lastSessionId || (value.executions && value.executions.length ? value.executions[value.executions.length - 1].sessionId : null);
    var attention = needsAttention(value);
    var reports = current && current.task.reports ? current.task.reports : value.reports || {};
    function doAction(kind) {
      controller.doAction(kind, value.key).catch(function() {
      });
      props.onClose();
    }
    function requestAction(kind) {
      if (props.onActionRequest) props.onActionRequest(kind, value.key);
      else doAction(kind);
    }
    return h8(
      DialogShell,
      {
        variant: "drawer",
        open: true,
        onClose: props.onClose,
        title: value.key,
        className: "w-[min(840px,94vw)]"
      },
      h8(
        "div",
        { className: "flex flex-col h-full" },
        // 状态条
        h8(
          "div",
          { className: "flex items-center gap-3 px-6 py-3 bg-aq-surface-alt border-b border-aq-line" },
          h8(
            "span",
            {
              className: "inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-bold",
              style: { backgroundColor: (attention || value.stopPending ? "#9a6700" : value.foregroundPaused ? "#27776e" : status.color) + "15", color: attention || value.stopPending ? "#9a6700" : value.foregroundPaused ? "#27776e" : status.color }
            },
            h8("span", { className: "w-1.5 h-1.5 rounded-full", style: { backgroundColor: "currentColor" } }),
            attention ? "\u9700\u5173\u6CE8" : value.stopPending ? "\u6B63\u5728\u505C\u6B62" : value.foregroundPaused ? "\u5DF2\u6682\u505C" : status.label
          ),
          value.updatedAt && h8("span", { className: "text-xs text-aq-faint" }, "\u66F4\u65B0\u4E8E ", formatIso(value.updatedAt))
        ),
        // Tabs
        h8(
          Be2,
          { className: "flex flex-col flex-1 min-h-0" },
          h8(
            We2,
            { className: "flex flex-shrink-0 gap-0 px-6 border-b border-aq-line" },
            ["\u6982\u89C8", "\u6267\u884C\u8F68\u8FF9", "\u62A5\u544A", "\u7B56\u7565"].map(function(name) {
              return h8(dt, {
                key: name,
                className: "px-4 py-2.5 text-sm font-semibold text-aq-muted border-b-2 border-transparent transition data-[selected]:text-aq-blue data-[selected]:border-aq-blue outline-none"
              }, name);
            })
          ),
          h8(
            je2,
            { className: "flex-1 overflow-y-auto px-6 py-4", style: { overscrollBehaviorY: "contain" } },
            h8(
              Ke4,
              null,
              loading[0] ? h8(LoadingView) : detailError[0] ? h8(ErrorView, { error: detailError[0], onRetry: function() {
                retry[1](retry[0] + 1);
              } }) : h8(OverviewTab, { task: value, attention, sessionId })
            ),
            h8(
              Ke4,
              null,
              loading[0] ? h8(LoadingView) : detailError[0] ? h8(ErrorView, { error: detailError[0], onRetry: function() {
                retry[1](retry[0] + 1);
              } }) : h8(TraceTab, { task: value })
            ),
            h8(
              Ke4,
              null,
              loading[0] ? h8(LoadingView) : detailError[0] ? h8(ErrorView, { error: detailError[0], onRetry: function() {
                retry[1](retry[0] + 1);
              } }) : h8(ReportTab, { reports })
            ),
            h8(
              Ke4,
              null,
              loading[0] ? h8(LoadingView) : detailError[0] ? h8(ErrorView, { error: detailError[0], onRetry: function() {
                retry[1](retry[0] + 1);
              } }) : h8(PolicyTab, { task: value, onUpdate: props.onUpdate })
            )
          )
        ),
        // 底部操作栏
        h8(
          "div",
          { className: "flex-shrink-0 flex flex-wrap gap-2 px-6 py-3 border-t border-aq-line bg-aq-paper" },
          value.status === "pending" && h8("button", { className: "aq-btn aq-btn-ghost text-sm", onClick: function() {
            props.onClose();
            controller.openEdit(value.key);
          } }, "\u7F16\u8F91"),
          ["pending", "failed", "stopped", "interrupted"].indexOf(value.status) >= 0 && h8("button", { className: "aq-btn aq-btn-ghost text-sm text-aq-red", onClick: function() {
            requestAction("delete");
          } }, "\u5220\u9664"),
          value.status === "running" && value.stopPending !== true && h8("button", { className: "aq-btn aq-btn-ghost text-sm text-aq-red", onClick: function() {
            requestAction("stop");
          } }, "\u505C\u6B62"),
          ["done", "failed", "stopped", "interrupted"].indexOf(value.status) >= 0 && !value.archivedAt && h8("button", { className: "aq-btn aq-btn-ghost text-sm text-aq-green", onClick: function() {
            requestAction("rerun");
          } }, "\u91CD\u65B0\u6267\u884C"),
          value.status !== "running" && !value.archivedAt && h8("button", { className: "aq-btn aq-btn-ghost text-sm", onClick: function() {
            doAction("archive");
          } }, "\u5F52\u6863"),
          value.archivedAt && h8("button", { className: "aq-btn aq-btn-ghost text-sm", onClick: function() {
            doAction("restore");
          } }, "\u6062\u590D"),
          h8("span", { className: "flex-1" }),
          sessionId && h8("button", { className: "aq-btn aq-btn-primary text-sm", onClick: function() {
            props.onClose();
            controller.closeBoard();
            if (props.sessions && props.sessions.open) props.sessions.open(sessionId);
          }, dangerouslySetInnerHTML: { __html: iconHtml("external") + " \u8DF3\u8F6C\u4F1A\u8BDD" } })
        )
      )
    );
  }
  function LoadingView() {
    return h8(
      "div",
      { className: "flex flex-col items-center justify-center py-12 gap-3" },
      h8("div", { className: "w-5 h-5 border-2 border-aq-line-2 border-t-aq-blue rounded-full animate-spin" }),
      h8("span", { className: "text-sm text-aq-muted" }, "\u6B63\u5728\u8F7D\u5165\u4EFB\u52A1\u8BE6\u60C5\u2026")
    );
  }
  function ErrorView(props) {
    return h8(
      "div",
      { className: "text-center py-10" },
      h8("p", { className: "text-sm text-aq-red mb-3" }, props.error),
      h8("button", { className: "aq-btn aq-btn-primary text-xs", onClick: props.onRetry }, "\u91CD\u65B0\u52A0\u8F7D")
    );
  }
  function OverviewTab(props) {
    var task = props.task;
    var showNotice = props.attention || task.stopPending === true || task.foregroundPaused === true;
    return h8(
      "div",
      { className: "space-y-4" },
      showNotice && h8(
        "div",
        { className: "flex items-start gap-3 p-3 rounded-xl bg-aq-amber-soft" },
        h8("span", { className: "flex-shrink-0 grid w-5 h-5 place-items-center rounded-full border border-aq-amber text-aq-amber text-xs font-bold" }, "!"),
        h8(
          "div",
          null,
          h8("p", { className: "text-sm font-semibold text-aq-amber" }, props.attention ? "\u4EFB\u52A1\u5DF2\u6682\u505C\uFF0C\u9700\u8981\u68C0\u67E5" : task.stopPending ? "\u6B63\u5728\u505C\u6B62" : "\u5DF2\u6682\u505C"),
          h8("p", { className: "text-xs text-aq-amber/70 mt-0.5" }, props.attention ? isolationReason(task) : "\u4EFB\u52A1\u72B6\u6001\u53D8\u66F4\u4E2D\uFF0C\u8BF7\u7A0D\u5019\u3002")
        )
      ),
      h8(
        Section,
        { title: "\u4EFB\u52A1\u4FE1\u606F" },
        h8(
          Grid,
          null,
          h8(Fact, { label: "\u4F18\u5148\u7EA7", value: String(task.priority || 5) }),
          h8(Fact, { label: "\u6D3E\u53D1\u5C1D\u8BD5", value: String(task.attempts || 0) }),
          h8(Fact, { label: "\u81EA\u52A8\u6062\u590D", value: String(task.blockedResumes || 0) + " \u6B21" }),
          h8(Fact, { label: "\u63A8\u8FDB\u8F6E\u6B21", value: (task.currentRound || 0) + " / " + (task.maxGoalRounds || "-") }),
          h8(Fact, { label: "\u521B\u5EFA\u65F6\u95F4", value: task.createdAt ? formatIso(task.createdAt) : "-" }),
          h8(Fact, { label: "\u4E0B\u6B21\u8FD0\u884C", value: task.nextRunAt ? formatIso(task.nextRunAt) : "-" }),
          h8(Fact, { label: "\u4EFB\u52A1\u4F1A\u8BDD", value: props.sessionId ? "\u5DF2\u521B\u5EFA" : "\u5C1A\u672A\u521B\u5EFA" }),
          h8(Fact, { label: "\u5F53\u524D\u9636\u6BB5", value: taskPhaseLabel(task.goalPhase, task.status) })
        )
      ),
      task.body && h8(
        Section,
        { title: "\u4EFB\u52A1\u5185\u5BB9" },
        h8(
          "div",
          { className: "p-3 rounded-xl border border-aq-line bg-aq-surface-alt" },
          h8("pre", { className: "text-xs font-mono text-aq-ink-2 whitespace-pre-wrap break-words m-0" }, task.body)
        )
      ),
      task.lastError && h8(
        Section,
        { title: "\u6700\u8FD1\u9519\u8BEF" },
        h8("div", { className: "p-3 rounded-xl border-l-[3px] border-l-aq-red bg-aq-red-soft text-sm text-aq-red font-mono break-words" }, String(task.lastError))
      )
    );
  }
  function TraceTab(props) {
    var task = props.task;
    var executions = Array.isArray(task.executions) ? task.executions : [];
    return h8(
      "div",
      { className: "space-y-4" },
      task.status === "running" && h8(
        "div",
        { className: "flex items-center justify-between p-3 rounded-xl bg-aq-blue-soft" },
        h8("span", { className: "text-sm font-semibold text-aq-blue" }, "\u5F53\u524D\u72B6\u6001"),
        h8("span", { className: "text-sm text-aq-blue" }, task.stopPending ? "\u6B63\u5728\u505C\u6B62" : task.foregroundPaused ? "\u5DF2\u6682\u505C" : taskPhaseLabel(task.goalPhase, task.status))
      ),
      h8(
        Section,
        { title: "\u6267\u884C\u8BB0\u5F55" },
        executions.length === 0 ? h8("p", { className: "text-sm text-aq-muted py-4 text-center" }, "\u8FD8\u6CA1\u6709\u6267\u884C\u8BB0\u5F55") : h8(
          "div",
          { className: "space-y-0" },
          executions.slice().reverse().map(function(ex, i7) {
            var cfg = STATUS_CONFIG[ex.result] || { label: ex.result || "\u6267\u884C\u4E2D", color: "#596579" };
            return h8(
              "div",
              { key: String(ex.attempt || i7) + (ex.startedAt || ""), className: "flex gap-3 py-3 border-b border-aq-line last:border-b-0" },
              h8(
                "span",
                { className: "flex-shrink-0 grid w-7 h-7 place-items-center rounded-full border border-aq-line-2 text-xs font-mono font-semibold text-aq-faint" },
                String(ex.attempt || executions.length - i7).padStart(2, "0")
              ),
              h8(
                "div",
                { className: "flex-1 min-w-0" },
                h8("span", { className: "text-sm font-semibold", style: { color: cfg.color } }, cfg.label),
                h8(
                  "p",
                  { className: "text-xs text-aq-faint mt-0.5" },
                  ex.startedAt ? formatIso(ex.startedAt) : "-",
                  " \u2192 ",
                  ex.endedAt ? formatIso(ex.endedAt) : "\u8FDB\u884C\u4E2D"
                ),
                ex.error && h8("code", { className: "block mt-1 text-xs text-aq-red font-mono break-words" }, String(ex.error))
              )
            );
          })
        )
      )
    );
  }
  function ReportTab(props) {
    var entries = [["goal", "\u63A8\u8FDB\u7ED3\u679C"], ["result", "\u6267\u884C\u7ED3\u679C"], ["report", "\u6700\u7EC8\u62A5\u544A"]].filter(function(e7) {
      return props.reports && props.reports[e7[0]];
    });
    if (!entries.length) {
      return h8(
        "div",
        { className: "flex flex-col items-center justify-center py-12 gap-2" },
        h8("p", { className: "text-sm font-semibold text-aq-ink" }, "\u62A5\u544A\u5C1A\u672A\u751F\u6210"),
        h8("p", { className: "text-xs text-aq-muted" }, "\u4EFB\u52A1\u7ED3\u675F\u540E\uFF0C\u7ED3\u679C\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002")
      );
    }
    return h8(
      "div",
      { className: "space-y-5" },
      entries.map(function(entry) {
        var raw = props.reports[entry[0]];
        return h8(
          "div",
          { key: entry[0] },
          h8("h4", { className: "text-sm font-bold text-aq-ink-2 mb-2" }, entry[1]),
          h8(ReportBlock, { raw })
        );
      })
    );
  }
  function ReportBlock(props) {
    var raw = props.raw;
    var parsed = parseReportJSON(raw);
    if (parsed && typeof parsed === "object") {
      var isStructured = parsed.result != null || parsed.output != null;
      if (isStructured) {
        return h8(
          "div",
          { className: "aq-prose space-y-4" },
          parsed.result && h8(Fact, { label: "\u7ED3\u679C", value: parsed.result }),
          parsed.attempts != null && h8(Fact, { label: "\u5C1D\u8BD5\u6B21\u6570", value: String(parsed.attempts) }),
          parsed.blockedResumes != null && h8(Fact, { label: "\u81EA\u52A8\u6062\u590D", value: String(parsed.blockedResumes) }),
          parsed.finishedAt && h8(Fact, { label: "\u5B8C\u6210\u65F6\u95F4", value: formatIso(parsed.finishedAt) }),
          parsed.error && h8("div", { className: "p-3 rounded-xl border-l-[3px] border-l-aq-red bg-aq-red-soft text-sm text-aq-red font-mono break-words" }, String(parsed.error)),
          parsed.output && h8(
            "div",
            { className: "mt-3" },
            h8("div", { className: "text-xs font-bold text-aq-faint uppercase tracking-wide mb-1" }, "\u8F93\u51FA\u5185\u5BB9"),
            h8("div", { dangerouslySetInnerHTML: { __html: renderMarkdown(parsed.output) } })
          )
        );
      }
      return h8(
        "div",
        { className: "aq-prose space-y-3" },
        Object.keys(parsed).map(function(key) {
          var val = parsed[key];
          if (val == null) return null;
          var displayKey = key;
          var displayVal = String(val);
          var colonIdx = displayVal.indexOf(":");
          if (colonIdx > 0 && colonIdx < 20) {
            var prefix = displayVal.substring(0, colonIdx).trim();
            var suffix = displayVal.substring(colonIdx + 1).trim();
            if (prefix && suffix) {
              displayKey = prefix;
              displayVal = suffix;
            }
          }
          return h8(
            "div",
            { key },
            h8("div", { className: "text-xs font-bold text-aq-faint uppercase tracking-wide mb-1" }, displayKey),
            h8("p", { className: "aq-mk-p" }, displayVal)
          );
        }).filter(function(x7) {
          return x7;
        })
      );
    }
    if (typeof raw === "string" && raw.indexOf("\n") >= 0) {
      var lines = raw.split("\n");
      var sections = [];
      var currentSection = null;
      var currentContent = [];
      for (var i7 = 0; i7 < lines.length; i7++) {
        var line = lines[i7].trim();
        if (!line) continue;
        var isTitle = /^#{1,6}\s/.test(line);
        var colonLineMatch = line.match(/^([^:：]+)[:：](.*)/);
        if (colonLineMatch && /^#{1,6}\s/.test(colonLineMatch[2].trim())) {
          isTitle = false;
        }
        if (isTitle) {
          if (currentSection) {
            sections.push({ title: currentSection, content: currentContent.join("\n") });
          }
          currentSection = line.replace(/^#{1,6}\s*/, "");
          currentContent = [];
          continue;
        }
        var colonMatch = line.match(/^([^:：]+)[:：](.*)/);
        if (colonMatch) {
          var label = colonMatch[1].trim();
          var content = colonMatch[2].trim();
          if (["\u76EE\u6807", "\u7ED3\u679C", "\u65F6\u95F4", "\u7ED3\u8BBA", "\u5206\u6790", "\u6B65\u9AA4"].indexOf(label) >= 0) {
            if (currentSection) {
              sections.push({ title: currentSection, content: currentContent.join("\n") });
            }
            currentSection = label;
            var cleanContent = content.replace(/^#{1,6}\s+/, "");
            currentContent = [cleanContent];
            continue;
          }
          currentContent.push(h8(
            "div",
            { key: i7 + "-" + label },
            h8("div", { className: "text-xs font-bold text-aq-faint uppercase tracking-wide mb-0.5" }, label),
            h8("p", { className: "aq-mk-p" }, content)
          ));
          continue;
        }
        currentContent.push(line);
      }
      if (currentSection) {
        sections.push({ title: currentSection, content: currentContent.join("\n") });
      }
      if (sections.length > 0) {
        return h8(
          "div",
          { className: "aq-prose space-y-4" },
          sections.map(function(s12, i8) {
            return h8(
              "div",
              { key: i8 },
              h8("h3", { className: "aq-mk-h3" }, s12.title),
              s12.content ? h8(
                "div",
                { className: "mt-1" },
                h8("div", { dangerouslySetInnerHTML: { __html: renderMarkdown(s12.content) } })
              ) : null
            );
          })
        );
      }
    }
    return h8("div", {
      className: "aq-prose",
      dangerouslySetInnerHTML: { __html: renderMarkdown(raw) }
    });
  }
  function parseReportJSON(text) {
    if (!text) return null;
    try {
      var obj = JSON.parse(text);
      if (obj && typeof obj === "object" && !Array.isArray(obj)) return obj;
    } catch (e7) {
    }
    return null;
  }
  function PolicyTab(props) {
    var task = props.task;
    var updating = window.__React.useState(false);
    function toggleArchive() {
      if (!props.onUpdate || updating[0]) return;
      updating[1](true);
      props.onUpdate(task.key, { autoArchive: task.autoArchive === false }).then(function() {
        updating[1](false);
      }).catch(function() {
        updating[1](false);
      });
    }
    return h8(
      "div",
      { className: "space-y-4" },
      h8(
        Section,
        { title: "\u8C03\u5EA6" },
        h8(
          Grid,
          null,
          h8(Fact, { label: "\u5B9A\u65F6\u8C03\u5EA6", value: task.cron ? cronToHuman(task.cron) : "\u672A\u8BBE\u7F6E" }),
          h8(Fact, { label: "\u622A\u6B62\u7A97\u53E3", value: task.deadline ? cronToHuman(task.deadline) : "\u672A\u8BBE\u7F6E" }),
          h8(
            "div",
            null,
            h8("span", { className: "block text-xs text-aq-faint mb-0.5" }, "\u81EA\u52A8\u5F52\u6863"),
            h8(
              "button",
              {
                onClick: toggleArchive,
                disabled: updating[0],
                className: "inline-flex items-center gap-2 text-sm font-semibold " + (task.autoArchive === false ? "text-aq-muted" : "text-aq-green") + " cursor-pointer disabled:opacity-40"
              },
              h8(
                "span",
                { className: "w-8 h-4 rounded-full relative transition-colors " + (task.autoArchive === false ? "bg-aq-line" : "bg-aq-green") },
                h8("span", { className: "absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform " + (task.autoArchive === false ? "" : "translate-x-4") })
              ),
              task.autoArchive === false ? "\u5173\u95ED" : "\u5F00\u542F"
            )
          )
        )
      ),
      h8(
        Section,
        { title: "\u5931\u8D25\u5904\u7406" },
        h8(
          Grid,
          null,
          h8(Fact, { label: "\u6700\u591A\u63A8\u8FDB\u8F6E\u6570", value: String(task.maxGoalRounds || "\u7EE7\u627F\u9ED8\u8BA4") }),
          h8(Fact, { label: "\u6700\u591A\u81EA\u52A8\u6062\u590D", value: String(task.maxBlockedResumes ?? "\u7EE7\u627F\u9ED8\u8BA4") }),
          h8(Fact, { label: "\u4EFB\u52A1\u8D85\u65F6", value: task.timeoutMs ? Math.round(task.timeoutMs / 6e4) + " \u5206\u949F" : "\u7EE7\u627F\u9ED8\u8BA4" }),
          h8(Fact, { label: "\u6700\u5927\u5C1D\u8BD5", value: String(task.maxAttempts || "\u7EE7\u627F\u9ED8\u8BA4") }),
          h8(Fact, { label: "\u6D4F\u89C8\u5668\u901A\u77E5", value: task.enableNotifications === true ? "\u5F00\u542F" : task.enableNotifications === false ? "\u9759\u9ED8" : "\u7EE7\u627F\u9ED8\u8BA4" }),
          h8(Fact, { label: "Webhook", value: task.webhook || "\u672A\u8BBE\u7F6E" })
        )
      ),
      h8(
        "div",
        { className: "p-3 rounded-xl border-l-[3px] border-l-aq-blue bg-aq-blue-soft" },
        h8("p", { className: "text-sm font-semibold text-aq-blue" }, "\u4E0D\u4F1A\u4FEE\u6539 DSH \u8BBE\u7F6E"),
        h8("p", { className: "text-xs text-aq-blue/70 mt-0.5" }, "\u4EFB\u52A1\u4F7F\u7528\u72EC\u7ACB\u5DE5\u4F5C\u76EE\u5F55\u4E0E\u4E13\u5C5E\u4F1A\u8BDD\uFF1B\u4F60\u4F7F\u7528 DSH \u65F6\uFF0C\u540E\u53F0\u4EFB\u52A1\u4ECD\u4F1A\u6301\u7EED\u6267\u884C\uFF0C\u4E92\u4E0D\u5E72\u6270\u3002")
      )
    );
  }
  function Section(props) {
    return h8(
      "div",
      null,
      h8("h4", { className: "text-xs font-bold text-aq-ink-2 uppercase tracking-wide mb-2" }, props.title),
      props.children
    );
  }
  function Grid(props) {
    var children = window.__React.Children.toArray(props.children);
    return h8(
      "div",
      { className: "grid grid-cols-2 gap-3" },
      children.map(function(child, i7) {
        return h8("div", { key: i7, className: "p-3 rounded-xl border border-aq-line bg-aq-surface-alt" }, child);
      })
    );
  }
  function Fact(props) {
    return h8(
      "div",
      null,
      h8("span", { className: "block text-xs text-aq-faint mb-0.5" }, props.label),
      h8("span", { className: "block text-sm font-semibold text-aq-ink-2 break-words" }, props.value)
    );
  }
  function taskPhaseLabel(phase, status) {
    var v3 = String(phase || "");
    if (v3 === "active" || v3 === "goal-admitted") return "\u6267\u884C\u4E2D";
    if (v3 === "complete") return "\u5DF2\u5B8C\u6210";
    if (v3 === "stopped" || v3 === "disposed") return "\u5DF2\u7ED3\u675F";
    if (v3 === "rate-limited") return "\u7B49\u5F85\u91CD\u8BD5";
    if (v3.indexOf("foreground-paused") >= 0) return "\u5DF2\u6682\u505C";
    if (v3.indexOf("cancel-pending") >= 0 || v3.indexOf("cleanup-pending") >= 0) return "\u6B63\u5728\u505C\u6B62";
    if (v3.indexOf("launch") >= 0 || v3.indexOf("admission-pending") >= 0) return "\u6B63\u5728\u542F\u52A8";
    if (v3.indexOf("uncertain") >= 0 || v3.indexOf("containment") >= 0 || v3 === "unknown") return "\u72B6\u6001\u5F85\u786E\u8BA4";
    var cfg = STATUS_CONFIG[status];
    return cfg ? cfg.label : status || "\u672A\u77E5";
  }
  function needsAttention(task) {
    var phase = String(task.goalPhase || "");
    return task.status === "failed" || task.status === "interrupted" || phase.indexOf("uncertain") >= 0 || phase.indexOf("containment") >= 0 || !!task._goalAdmissionUncertain || !!task._promptAdmissionUncertain;
  }
  function isolationReason(task) {
    if (task._goalAdmissionUncertain || String(task.goalPhase || "").indexOf("goal-admission") >= 0) return "\u4EFB\u52A1\u662F\u5426\u6210\u529F\u542F\u52A8\u65E0\u6CD5\u786E\u8BA4\u3002";
    if (task._promptAdmissionUncertain || String(task.goalPhase || "").indexOf("prompt-admission") >= 0) return "\u4EFB\u52A1\u6307\u4EE4\u662F\u5426\u9001\u8FBE\u65E0\u6CD5\u786E\u8BA4\u3002";
    if (task.status === "interrupted") return "DSH \u91CD\u542F\u6216\u4F1A\u8BDD\u4E2D\u65AD\u3002";
    return task.lastError ? String(task.lastError) : "\u4EFB\u52A1\u5931\u8D25\u3002";
  }

  // client/src/components/Modals.jsx
  function h9() {
    return window.__React.createElement.apply(window.__React, arguments);
  }
  function numberOrUndefined(value) {
    return value === "" ? void 0 : parseInt(value, 10);
  }
  function requestNotificationPermission() {
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    try {
      Notification.requestPermission();
    } catch (error) {
    }
  }
  function NewTaskModal(props) {
    var config = props.config || {};
    var transport = props.transport;
    var v3 = function(val, fallback) {
      return val === void 0 || val === null ? fallback : val;
    };
    var showTemplates = window.__React.useState(false);
    var templates = window.__React.useState([]);
    var templatesLoading = window.__React.useState(false);
    var fromTemplate = window.__React.useState(null);
    var key = window.__React.useState("");
    var content = window.__React.useState("");
    var priority = window.__React.useState(String(v3(config.priority, 5)));
    var cron = window.__React.useState("");
    var deadline = window.__React.useState(config.defaultDeadline || "");
    var maxGoalRounds = window.__React.useState(String(v3(config.maxGoalRounds, 40)));
    var maxBlockedResumes = window.__React.useState(String(v3(config.maxBlockedResumes, 3)));
    var timeoutMinutes = window.__React.useState(String(Math.round(v3(config.taskTimeoutMs, 108e5) / 6e4)));
    var maxAttempts = window.__React.useState(String(v3(config.maxAttempts, 3)));
    var webhook = window.__React.useState(config.webhook || "");
    var provider = window.__React.useState("");
    var model = window.__React.useState("");
    var autoArchive = window.__React.useState(config.autoArchive !== false);
    var enableNotifications = window.__React.useState(config.enableNotifications === true);
    var advancedOpen = window.__React.useState(false);
    var notifyOpen = window.__React.useState(false);
    var error = window.__React.useState("");
    var submitting = window.__React.useState(false);
    function loadTemplates() {
      if (templates[0].length) {
        showTemplates[1](!showTemplates[0]);
        return;
      }
      templatesLoading[1](true);
      transport.listTemplates().then(function(data) {
        templates[1](data && data.templates || []);
        templatesLoading[1](false);
        showTemplates[1](true);
      }).catch(function() {
        templatesLoading[1](false);
      });
    }
    function onTemplateSelect(tpl) {
      fromTemplate[1](tpl);
      content[1](tpl.body || "");
      if (!key[0].trim()) {
        var ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:T]/g, "").slice(0, 12);
        key[1]((tpl.name || "task") + "-" + ts);
      }
      showTemplates[1](false);
    }
    function handleSubmit(e7) {
      e7.preventDefault();
      var finalContent = content[0].trim();
      if (!finalContent) {
        error[1]("\u8BF7\u586B\u5199\u4EFB\u52A1\u5185\u5BB9");
        return;
      }
      var data = {
        content: finalContent,
        priority: parseInt(priority[0], 10),
        autoArchive: autoArchive[0],
        enableNotifications: enableNotifications[0]
      };
      if (key[0].trim()) data.key = key[0].trim();
      if (cron[0]) data.cron = cron[0];
      if (deadline[0]) data.deadline = deadline[0];
      if (maxGoalRounds[0]) data.maxGoalRounds = parseInt(maxGoalRounds[0], 10);
      if (maxBlockedResumes[0]) data.maxBlockedResumes = parseInt(maxBlockedResumes[0], 10);
      if (timeoutMinutes[0]) data.timeoutMs = parseInt(timeoutMinutes[0], 10) * 6e4;
      if (maxAttempts[0]) data.maxAttempts = parseInt(maxAttempts[0], 10);
      if (webhook[0].trim()) data.webhook = webhook[0].trim();
      if (provider[0].trim()) data.provider = provider[0].trim();
      if (model[0].trim()) data.model = model[0].trim();
      submitting[1](true);
      error[1]("");
      props.onCreate(data).catch(function(e8) {
        error[1](e8 && e8.message ? e8.message : "\u521B\u5EFA\u5931\u8D25");
      }).finally(function() {
        submitting[1](false);
      });
    }
    return h9(
      DialogShell,
      { open: true, onClose: props.onClose, title: "\u65B0\u5EFA\u65E0\u4EBA\u503C\u5B88\u4EFB\u52A1", variant: "modal", size: "lg" },
      h9(
        "form",
        { className: "flex flex-col flex-1 min-h-0 px-6 pb-6", onSubmit: handleSubmit },
        showTemplates[0] && h9(TemplatePickerInline, {
          templates: templates[0],
          loading: templatesLoading[0],
          onSelect: onTemplateSelect,
          onClose: function() {
            showTemplates[1](false);
          }
        }),
        !showTemplates[0] && h9(
          "div",
          { className: "flex-1 min-h-0 overflow-y-auto py-4", style: { overscrollBehaviorY: "contain" } },
          error[0] && h9("div", { className: "p-3 mb-4 rounded-lg bg-aq-red-soft text-sm text-aq-red" }, error[0]),
          fromTemplate[0] && h9(
            "div",
            { className: "flex items-center gap-2 py-2 mb-1" },
            h9("span", { className: "aq-badge aq-badge-blue" }, fromTemplate[0].name),
            h9("span", { className: "text-sm text-aq-muted" }, "\u5DF2\u4ECE\u6A21\u677F\u586B\u5145"),
            h9("button", { type: "button", className: "ml-auto text-sm text-aq-blue hover:underline", onClick: loadTemplates }, "\u6362\u6A21\u677F")
          ),
          h9(
            "div",
            { className: "flex items-center justify-between mb-1.5" },
            h9("label", { className: "text-sm font-semibold text-aq-ink-2" }, "\u4EFB\u52A1\u5185\u5BB9\uFF08Markdown\uFF09"),
            !fromTemplate[0] && h9("button", { type: "button", className: "text-sm text-aq-blue hover:underline", onClick: loadTemplates }, "\u4ECE\u6A21\u677F\u5F00\u59CB")
          ),
          h9("textarea", {
            value: content[0],
            onChange: function(e7) {
              content[1](e7.target.value);
            },
            placeholder: "\u4F8B\u5982\uFF1A\u6574\u7406\u672C\u5468\u5BA2\u6237\u8BBF\u8C08\uFF0C\u5F52\u7EB3\u4E09\u6761\u4EA7\u54C1\u673A\u4F1A\u5E76\u8F93\u51FA\u62A5\u544A\u2026",
            required: true,
            className: "w-full h-36 p-3 rounded-xl border border-aq-line-2 bg-aq-paper text-sm text-aq-ink resize-y focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none"
          }),
          h9(
            "div",
            { className: "grid grid-cols-2 gap-3 mt-4" },
            h9(
              Field,
              { label: "\u4EFB\u52A1\u6807\u8BC6\uFF08\u53EF\u9009\uFF09", help: "\u7559\u7A7A\u5C06\u81EA\u52A8\u751F\u6210" },
              h9("input", { value: key[0], onChange: function(e7) {
                key[1](e7.target.value);
              }, placeholder: "weekly-insight", className: "aq-input" })
            ),
            h9(
              Field,
              { label: "\u4F18\u5148\u7EA7\uFF081-10\uFF09" },
              h9("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function(e7) {
                priority[1](e7.target.value);
              }, className: "aq-input" })
            )
          ),
          // 调度
          h9(
            "div",
            { className: "mt-4 space-y-4" },
            h9(CronField, { label: "\u5B9A\u65F6\u8C03\u5EA6", value: cron[0], onChange: cron[1], presets: CRON_PRESETS, placeholder: "0 8 * * *" }),
            h9(CronField, { label: "\u6267\u884C\u622A\u6B62\u65F6\u95F4", value: deadline[0], onChange: deadline[1], presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" })
          ),
          // 高级设置
          h9(
            "div",
            { className: "mt-4 pt-3 border-t border-aq-line" },
            h9(
              "button",
              { type: "button", className: "flex items-center justify-between w-full text-sm font-semibold text-aq-ink", onClick: function() {
                advancedOpen[1](!advancedOpen[0]);
              } },
              h9("span", null, "\u66F4\u591A\u8BBE\u7F6E"),
              h9("span", { className: "text-aq-faint" }, advancedOpen[0] ? "\u2212" : "+")
            ),
            advancedOpen[0] && h9(
              "div",
              { className: "mt-3 grid grid-cols-3 gap-3" },
              h9(Field, { label: "\u6700\u591A\u63A8\u8FDB\u8F6E\u6570" }, h9("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function(e7) {
                maxGoalRounds[1](e7.target.value);
              }, className: "aq-input" })),
              h9(Field, { label: "\u6700\u591A\u81EA\u52A8\u6062\u590D" }, h9("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function(e7) {
                maxBlockedResumes[1](e7.target.value);
              }, className: "aq-input" })),
              h9(Field, { label: "\u6700\u957F\u6267\u884C\uFF08\u5206\u949F\uFF09" }, h9("input", { type: "number", min: "10", max: "1440", value: timeoutMinutes[0], onChange: function(e7) {
                timeoutMinutes[1](e7.target.value);
              }, className: "aq-input" }))
            ),
            advancedOpen[0] && h9(
              "div",
              { className: "mt-3" },
              h9(Field, { label: "\u6700\u591A\u542F\u52A8\u5C1D\u8BD5\uFF081-10\uFF09" }, h9("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function(e7) {
                maxAttempts[1](e7.target.value);
              }, className: "aq-input" }))
            ),
            advancedOpen[0] && h9(
              "div",
              { className: "mt-3 grid grid-cols-2 gap-3" },
              h9(Field, { label: "Provider", help: "\u7559\u7A7A\u7EE7\u627F Host \u9ED8\u8BA4" }, h9("input", { value: provider[0], onChange: function(e7) {
                provider[1](e7.target.value);
              }, placeholder: "\u4F8B\u5982 openai", className: "aq-input" })),
              h9(Field, { label: "Model", help: "\u7559\u7A7A\u7EE7\u627F Host \u9ED8\u8BA4" }, h9("input", { value: model[0], onChange: function(e7) {
                model[1](e7.target.value);
              }, placeholder: "\u4F8B\u5982 gpt-4o", className: "aq-input" }))
            ),
            advancedOpen[0] && h9(
              "div",
              { className: "mt-3 space-y-3" },
              h9(Field, { label: "Webhook URL" }, h9("input", { type: "url", value: webhook[0], onChange: function(e7) {
                webhook[1](e7.target.value);
              }, placeholder: "https://example.com/hook", className: "aq-input" })),
              h9(ToggleField, { checked: autoArchive[0], onChange: autoArchive[1], label: "\u5B8C\u6210\u540E\u81EA\u52A8\u5F52\u6863" }),
              h9(ToggleField, { checked: enableNotifications[0], onChange: function(v4) {
                enableNotifications[1](v4);
                if (v4) requestNotificationPermission();
              }, label: "\u6D4F\u89C8\u5668\u7ED3\u679C\u901A\u77E5" })
            )
          )
        ),
        h9(
          "div",
          { className: "flex justify-end gap-3 pt-4 border-t border-aq-line flex-shrink-0" },
          h9("button", { type: "button", className: "aq-btn aq-btn-ghost", onClick: props.onClose, disabled: submitting[0] }, "\u53D6\u6D88"),
          h9("button", { type: "submit", className: "aq-btn aq-btn-primary", disabled: submitting[0] }, submitting[0] ? "\u521B\u5EFA\u4E2D\u2026" : "\u521B\u5EFA\u4EFB\u52A1")
        )
      )
    );
  }
  function EditTaskModal(props) {
    var task = props.task;
    var content = window.__React.useState(task.body || "");
    var cron = window.__React.useState(task.cron || "");
    var deadline = window.__React.useState(task.deadline || "");
    var priority = window.__React.useState(String(task.priority || 5));
    var autoArchive = window.__React.useState(task.autoArchive !== false);
    var enableNotifications = window.__React.useState(task.enableNotifications === true);
    var maxGoalRounds = window.__React.useState(task.maxGoalRounds == null ? "" : String(task.maxGoalRounds));
    var maxBlockedResumes = window.__React.useState(task.maxBlockedResumes == null ? "" : String(task.maxBlockedResumes));
    var timeoutMinutes = window.__React.useState(task.timeoutMs ? String(Math.round(task.timeoutMs / 6e4)) : "");
    var maxAttempts = window.__React.useState(task.maxAttempts == null ? "" : String(task.maxAttempts));
    var webhook = window.__React.useState(task.webhook || "");
    var provider = window.__React.useState(task.provider || "");
    var model = window.__React.useState(task.model || "");
    var advancedOpen = window.__React.useState(false);
    var notifyOpen = window.__React.useState(false);
    var error = window.__React.useState("");
    var submitting = window.__React.useState(false);
    function handleSubmit(e7) {
      e7.preventDefault();
      if (!content[0].trim()) {
        error[1]("\u4EFB\u52A1\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A");
        return;
      }
      var patch = {};
      var add = function(n8, next, prev) {
        if (next !== prev) patch[n8] = next;
      };
      add("content", content[0], task.body || "");
      add("cron", cron[0], task.cron || "");
      add("deadline", deadline[0], task.deadline || "");
      add("priority", parseInt(priority[0], 10), task.priority || 5);
      add("autoArchive", autoArchive[0], task.autoArchive !== false);
      add("enableNotifications", enableNotifications[0], task.enableNotifications === true);
      add("maxGoalRounds", numberOrUndefined(maxGoalRounds[0]) ?? null, task.maxGoalRounds ?? null);
      add("maxBlockedResumes", numberOrUndefined(maxBlockedResumes[0]) ?? null, task.maxBlockedResumes ?? null);
      add("timeoutMs", timeoutMinutes[0] ? parseInt(timeoutMinutes[0], 10) * 6e4 : null, task.timeoutMs ?? null);
      add("maxAttempts", numberOrUndefined(maxAttempts[0]) ?? null, task.maxAttempts ?? null);
      add("webhook", webhook[0].trim() || null, task.webhook || null);
      add("provider", provider[0].trim() || null, task.provider || null);
      add("model", model[0].trim() || null, task.model || null);
      if (!Object.keys(patch).length) {
        props.onClose();
        return;
      }
      submitting[1](true);
      error[1]("");
      props.onUpdate(task.key, patch).catch(function(e8) {
        error[1](e8.message || "\u4FDD\u5B58\u5931\u8D25");
      }).finally(function() {
        submitting[1](false);
      });
    }
    return h9(
      DialogShell,
      { open: true, onClose: props.onClose, title: "\u7F16\u8F91\u4EFB\u52A1 \xB7 " + task.key, variant: "modal", size: "lg" },
      h9(
        "form",
        { className: "flex flex-col flex-1 min-h-0 px-6 pb-6", onSubmit: handleSubmit },
        h9("p", { className: "text-sm text-aq-muted py-3" }, "\u4EC5\u5F85\u6267\u884C\u4EFB\u52A1\u53EF\u7F16\u8F91\uFF1B\u8FD0\u884C\u4E2D\u7684\u4EFB\u52A1\u8BF7\u5148\u505C\u6B62\u3002"),
        error[0] && h9("div", { className: "p-3 mb-4 rounded-lg bg-aq-red-soft text-sm text-aq-red" }, error[0]),
        h9("label", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" }, "\u4EFB\u52A1\u5185\u5BB9\uFF08Markdown\uFF09"),
        h9("textarea", { value: content[0], onChange: function(e7) {
          content[1](e7.target.value);
        }, className: "w-full h-36 p-3 rounded-xl border border-aq-line-2 bg-aq-paper text-sm text-aq-ink resize-y focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none" }),
        h9(
          "div",
          { className: "grid grid-cols-2 gap-3 mt-4" },
          h9(Field, { label: "\u4F18\u5148\u7EA7\uFF081-10\uFF09" }, h9("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function(e7) {
            priority[1](e7.target.value);
          }, className: "aq-input" })),
          h9(CronField, { label: "\u5B9A\u65F6\u8C03\u5EA6", value: cron[0], onChange: cron[1], presets: CRON_PRESETS, placeholder: "0 8 * * *" })
        ),
        h9(
          "div",
          { className: "mt-4" },
          h9(CronField, { label: "\u6267\u884C\u622A\u6B62\u65F6\u95F4", value: deadline[0], onChange: deadline[1], presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" })
        ),
        h9(
          "div",
          { className: "mt-4 pt-3 border-t border-aq-line" },
          h9(
            "button",
            { type: "button", className: "flex items-center justify-between w-full text-sm font-semibold text-aq-ink", onClick: function() {
              advancedOpen[1](!advancedOpen[0]);
            } },
            h9("span", null, "\u9AD8\u7EA7\u8BBE\u7F6E"),
            h9("span", { className: "text-aq-faint" }, advancedOpen[0] ? "\u2212" : "+")
          ),
          advancedOpen[0] && h9(
            "div",
            { className: "mt-3 grid grid-cols-3 gap-3" },
            h9(Field, { label: "\u6700\u591A\u63A8\u8FDB\u8F6E\u6570" }, h9("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function(e7) {
              maxGoalRounds[1](e7.target.value);
            }, placeholder: "\u9ED8\u8BA4 40", className: "aq-input" })),
            h9(Field, { label: "\u6700\u591A\u81EA\u52A8\u6062\u590D" }, h9("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function(e7) {
              maxBlockedResumes[1](e7.target.value);
            }, placeholder: "\u9ED8\u8BA4 3", className: "aq-input" })),
            h9(Field, { label: "\u6700\u957F\u6267\u884C\uFF08\u5206\u949F\uFF09" }, h9("input", { type: "number", min: "10", max: "1440", value: timeoutMinutes[0], onChange: function(e7) {
              timeoutMinutes[1](e7.target.value);
            }, placeholder: "\u9ED8\u8BA4 180", className: "aq-input" }))
          ),
          advancedOpen[0] && h9(
            "div",
            { className: "mt-3" },
            h9(Field, { label: "\u6700\u591A\u542F\u52A8\u5C1D\u8BD5\uFF081-10\uFF09" }, h9("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function(e7) {
              maxAttempts[1](e7.target.value);
            }, placeholder: "\u9ED8\u8BA4 3", className: "aq-input" }))
          ),
          advancedOpen[0] && h9(
            "div",
            { className: "mt-3 grid grid-cols-2 gap-3" },
            h9(Field, { label: "Provider", help: "\u7559\u7A7A\u7EE7\u627F Host \u9ED8\u8BA4" }, h9("input", { value: provider[0], onChange: function(e7) {
              provider[1](e7.target.value);
            }, placeholder: "\u4F8B\u5982 openai", className: "aq-input" })),
            h9(Field, { label: "Model", help: "\u7559\u7A7A\u7EE7\u627F Host \u9ED8\u8BA4" }, h9("input", { value: model[0], onChange: function(e7) {
              model[1](e7.target.value);
            }, placeholder: "\u4F8B\u5982 gpt-4o", className: "aq-input" }))
          )
        ),
        h9(
          "div",
          { className: "mt-4 pt-3 border-t border-aq-line" },
          h9(
            "button",
            { type: "button", className: "flex items-center justify-between w-full text-sm font-semibold text-aq-ink", onClick: function() {
              notifyOpen[1](!notifyOpen[0]);
            } },
            h9("span", null, "\u901A\u77E5"),
            h9("span", { className: "text-aq-faint" }, notifyOpen[0] ? "\u2212" : "+")
          ),
          notifyOpen[0] && h9(
            "div",
            { className: "mt-3 space-y-3" },
            h9(Field, { label: "Webhook URL" }, h9("input", { type: "url", value: webhook[0], onChange: function(e7) {
              webhook[1](e7.target.value);
            }, placeholder: "https://example.com/hook", className: "aq-input" })),
            h9(ToggleField, { checked: autoArchive[0], onChange: autoArchive[1], label: "\u5B8C\u6210\u540E\u81EA\u52A8\u5F52\u6863" }),
            h9(ToggleField, { checked: enableNotifications[0], onChange: function(v3) {
              enableNotifications[1](v3);
              if (v3) requestNotificationPermission();
            }, label: "\u6D4F\u89C8\u5668\u7ED3\u679C\u901A\u77E5" })
          )
        ),
        h9(
          "div",
          { className: "flex justify-end gap-3 pt-4 border-t border-aq-line flex-shrink-0" },
          h9("button", { type: "button", className: "aq-btn aq-btn-ghost", onClick: props.onClose, disabled: submitting[0] }, "\u53D6\u6D88"),
          h9("button", { type: "submit", className: "aq-btn aq-btn-primary", disabled: submitting[0] }, submitting[0] ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")
        )
      )
    );
  }
  function ConfigPanel(props) {
    var config = props.config || {};
    var v3 = function(val, fallback) {
      return val === void 0 || val === null ? fallback : val;
    };
    var maxConcurrent = window.__React.useState(String(v3(config.maxConcurrent, 1)));
    var maxGoalRounds = window.__React.useState(String(v3(config.maxGoalRounds, 40)));
    var maxBlockedResumes = window.__React.useState(String(v3(config.maxBlockedResumes, 3)));
    var autoArchive = window.__React.useState(config.autoArchive !== false);
    var unknownThreshold = window.__React.useState(String(v3(config.unknownThreshold, 3)));
    var taskTimeoutMin = window.__React.useState(String(Math.round(v3(config.taskTimeoutMs, 108e5) / 6e4)));
    var maxAttempts = window.__React.useState(String(v3(config.maxAttempts, 3)));
    var defaultDeadline = window.__React.useState(config.defaultDeadline || "");
    var enableNotifications = window.__React.useState(config.enableNotifications === true);
    var webhook = window.__React.useState(config.webhook || "");
    var priority = window.__React.useState(String(v3(config.priority, 5)));
    var backoffBaseSec = window.__React.useState(String(Math.round(v3(config.retryBackoffBaseMs, 3e4) / 1e3)));
    var backoffMaxSec = window.__React.useState(String(Math.round(v3(config.retryBackoffMaxMs, 3e5) / 1e3)));
    var saving = window.__React.useState(false);
    var saveError = window.__React.useState("");
    function handleSave(e7) {
      e7.preventDefault();
      var patch = {};
      var add = function(n8, next, prev) {
        if (next !== prev) patch[n8] = next;
      };
      add("maxGoalRounds", parseInt(maxGoalRounds[0], 10), v3(config.maxGoalRounds, 40));
      add("maxBlockedResumes", parseInt(maxBlockedResumes[0], 10), v3(config.maxBlockedResumes, 3));
      add("autoArchive", autoArchive[0], config.autoArchive !== false);
      add("unknownThreshold", parseInt(unknownThreshold[0], 10), v3(config.unknownThreshold, 3));
      add("taskTimeoutMs", parseInt(taskTimeoutMin[0], 10) * 6e4, v3(config.taskTimeoutMs, 108e5));
      add("maxAttempts", parseInt(maxAttempts[0], 10), v3(config.maxAttempts, 3));
      add("defaultDeadline", defaultDeadline[0] || null, config.defaultDeadline || null);
      add("webhook", webhook[0].trim() || null, config.webhook || null);
      add("enableNotifications", enableNotifications[0], config.enableNotifications === true);
      add("priority", parseInt(priority[0], 10), v3(config.priority, 5));
      add("retryBackoffBaseMs", parseInt(backoffBaseSec[0], 10) * 1e3, v3(config.retryBackoffBaseMs, 3e4));
      add("retryBackoffMaxMs", parseInt(backoffMaxSec[0], 10) * 1e3, v3(config.retryBackoffMaxMs, 3e5));
      var ops = [];
      var concurrency = parseInt(maxConcurrent[0], 10);
      if (concurrency !== v3(config.maxConcurrent, 1)) ops.push(props.onSetConcurrency(concurrency));
      if (Object.keys(patch).length) ops.push(props.onUpdate(patch));
      if (!ops.length) {
        props.onClose();
        return;
      }
      saving[1](true);
      saveError[1]("");
      Promise.all(ops).then(props.onClose).catch(function(e8) {
        saveError[1](e8.message || "\u4FDD\u5B58\u5931\u8D25");
      }).finally(function() {
        saving[1](false);
      });
    }
    return h9(
      DialogShell,
      { open: true, onClose: props.onClose, title: "\u8FD0\u884C\u8BBE\u7F6E", variant: "drawer" },
      h9(
        "form",
        { className: "flex-1 min-h-0 px-6 pt-4 pb-0 overflow-y-auto", style: { overscrollBehaviorY: "contain" }, onSubmit: handleSave },
        saveError[0] && h9("div", { className: "p-3 mb-4 rounded-lg bg-aq-red-soft text-sm text-aq-red" }, saveError[0]),
        h9(
          Section2,
          { title: "\u6267\u884C\u9650\u5236" },
          h9(
            "div",
            { className: "grid grid-cols-2 gap-3" },
            h9(Field, { label: "\u6700\u5927\u5E76\u53D1\uFF081-8\uFF09" }, h9("input", { type: "number", min: "1", max: "8", value: maxConcurrent[0], onChange: function(e7) {
              maxConcurrent[1](e7.target.value);
            }, className: "aq-input" })),
            h9(Field, { label: "\u4EFB\u52A1\u8D85\u65F6\uFF08\u5206\u949F\uFF09" }, h9("input", { type: "number", min: "10", max: "1440", value: taskTimeoutMin[0], onChange: function(e7) {
              taskTimeoutMin[1](e7.target.value);
            }, className: "aq-input" }))
          ),
          h9(
            "div",
            { className: "grid grid-cols-2 gap-3 mt-3" },
            h9(Field, { label: "\u6700\u591A\u63A8\u8FDB\u8F6E\u6570" }, h9("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function(e7) {
              maxGoalRounds[1](e7.target.value);
            }, className: "aq-input" })),
            h9(Field, { label: "\u6700\u591A\u81EA\u52A8\u6062\u590D" }, h9("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function(e7) {
              maxBlockedResumes[1](e7.target.value);
            }, className: "aq-input" }))
          )
        ),
        h9(
          Section2,
          { title: "\u5931\u8D25\u4E0E\u91CD\u8BD5" },
          h9(
            "div",
            { className: "grid grid-cols-2 gap-3" },
            h9(Field, { label: "\u6700\u591A\u542F\u52A8\u5C1D\u8BD5" }, h9("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function(e7) {
              maxAttempts[1](e7.target.value);
            }, className: "aq-input" })),
            h9(Field, { label: "\u8FDE\u7EED\u72B6\u6001\u5F02\u5E38\u6B21\u6570" }, h9("input", { type: "number", min: "1", max: "10", value: unknownThreshold[0], onChange: function(e7) {
              unknownThreshold[1](e7.target.value);
            }, className: "aq-input" }))
          ),
          h9(
            "div",
            { className: "grid grid-cols-2 gap-3 mt-3" },
            h9(Field, { label: "\u9996\u6B21\u91CD\u8BD5\u7B49\u5F85\uFF08\u79D2\uFF09" }, h9("input", { type: "number", min: "5", max: "600", value: backoffBaseSec[0], onChange: function(e7) {
              backoffBaseSec[1](e7.target.value);
            }, className: "aq-input" })),
            h9(Field, { label: "\u6700\u957F\u91CD\u8BD5\u7B49\u5F85\uFF08\u79D2\uFF09" }, h9("input", { type: "number", min: "10", max: "3600", value: backoffMaxSec[0], onChange: function(e7) {
              backoffMaxSec[1](e7.target.value);
            }, className: "aq-input" }))
          )
        ),
        h9(
          Section2,
          { title: "\u4EFB\u52A1\u9ED8\u8BA4\u503C" },
          h9(
            "div",
            { className: "grid grid-cols-2 gap-3" },
            h9(Field, { label: "\u9ED8\u8BA4\u4F18\u5148\u7EA7" }, h9("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function(e7) {
              priority[1](e7.target.value);
            }, className: "aq-input" })),
            h9(Field, { label: "\u9ED8\u8BA4\u622A\u6B62\u65F6\u95F4\uFF08cron\uFF09" }, h9("input", { value: defaultDeadline[0], onChange: function(e7) {
              defaultDeadline[1](e7.target.value);
            }, placeholder: "0 21 * * *", className: "aq-input" }))
          ),
          h9(
            "div",
            { className: "mt-3" },
            h9(Field, { label: "Webhook URL" }, h9("input", { type: "url", value: webhook[0], onChange: function(e7) {
              webhook[1](e7.target.value);
            }, placeholder: "https://example.com/hook", className: "aq-input" }))
          ),
          h9(
            "div",
            { className: "mt-3 space-y-3" },
            h9(ToggleField, { checked: autoArchive[0], onChange: autoArchive[1], label: "\u4EFB\u52A1\u7ED3\u675F\u540E\u81EA\u52A8\u5F52\u6863" }),
            h9(ToggleField, { checked: enableNotifications[0], onChange: function(v4) {
              enableNotifications[1](v4);
              if (v4) requestNotificationPermission();
            }, label: "\u6D4F\u89C8\u5668\u7ED3\u679C\u901A\u77E5" })
          )
        ),
        h9(
          Section2,
          { title: "\u5B58\u50A8" },
          h9(Field, { label: "\u961F\u5217\u6839\u76EE\u5F55", help: "\u53EA\u8BFB\uFF0C\u7531\u542F\u52A8\u914D\u7F6E\u51B3\u5B9A" }, h9("input", { value: config.queueDir || "\u7531\u542F\u52A8\u914D\u7F6E\u51B3\u5B9A", disabled: true, className: "aq-input bg-aq-surface-alt text-aq-faint" })),
          h9(
            "div",
            { className: "mt-3" },
            h9(Field, { label: "AI \u76F4\u63A5\u64CD\u4F5C\u961F\u5217", help: "\u53EA\u8BFB\uFF0C\u5728\u63D2\u4EF6\u542F\u52A8\u914D\u7F6E\u4E2D\u8BBE\u7F6E" }, h9("input", { value: config.enableHostAiTools !== false ? "\u5DF2\u542F\u7528" : "\u5DF2\u5173\u95ED", disabled: true, className: "aq-input bg-aq-surface-alt text-aq-faint" }))
          )
        ),
        h9(
          "div",
          { className: "sticky bottom-0 flex justify-end gap-3 py-4 mt-2 border-t border-aq-line bg-aq-paper" },
          h9("button", { type: "button", className: "aq-btn aq-btn-ghost", onClick: props.onClose, disabled: saving[0] }, "\u53D6\u6D88"),
          h9("button", { type: "submit", className: "aq-btn aq-btn-primary", disabled: saving[0] }, saving[0] ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u8BBE\u7F6E")
        )
      )
    );
  }
  function ConfirmModal(props) {
    return h9(
      DialogShell,
      { open: true, onClose: props.onCancel, title: props.title || "\u786E\u8BA4\u64CD\u4F5C", variant: "modal", size: "sm" },
      h9(
        "div",
        { className: "px-6 pb-6" },
        h9("p", { className: "text-sm text-aq-ink-2 leading-relaxed" }, props.message),
        h9(
          "div",
          { className: "flex justify-end gap-3 mt-5 pt-4 border-t border-aq-line" },
          h9("button", { className: "aq-btn aq-btn-ghost", onClick: props.onCancel }, "\u53D6\u6D88"),
          h9("button", { className: "aq-btn " + (props.tone === "danger" ? "aq-btn-danger" : "aq-btn-primary"), onClick: props.onConfirm }, props.confirmLabel || "\u786E\u8BA4")
        )
      )
    );
  }
  function Field(props) {
    return h9(
      "div",
      null,
      props.label && h9("label", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" }, props.label),
      props.children,
      props.help && h9("p", { className: "text-xs text-aq-faint mt-1" }, props.help)
    );
  }
  function ToggleField(props) {
    return h9(
      "label",
      { className: "flex items-center gap-3 cursor-pointer" },
      h9(
        tt,
        {
          checked: props.checked,
          onChange: props.onChange,
          className: "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-aq-blue/20 " + (props.checked ? "bg-aq-blue" : "bg-aq-line-2")
        },
        h9("span", {
          "aria-hidden": "true",
          className: "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out " + (props.checked ? "translate-x-4" : "translate-x-0")
        })
      ),
      h9("span", { className: "text-sm text-aq-ink-2" }, props.label)
    );
  }
  function Section2(props) {
    return h9(
      "div",
      { className: "mb-5 pb-5 border-b border-aq-line" },
      h9("h4", { className: "text-sm font-bold text-aq-ink-2 mb-3" }, props.title),
      props.children
    );
  }
  function CronField(props) {
    var selectValue = window.__React.useState(function() {
      var match = (props.presets || []).find(function(p6) {
        return p6.value === props.value && p6.value !== "" && p6.value !== "__custom__";
      });
      return match ? match.value : props.value ? "__custom__" : "";
    });
    var custom = selectValue[0] === "__custom__";
    return h9(
      "div",
      null,
      h9("span", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" }, props.label),
      h9(
        "div",
        { className: "grid grid-cols-[minmax(120px,0.85fr)_minmax(0,1.15fr)] gap-2" },
        h9(
          "select",
          {
            value: selectValue[0],
            onChange: function(e7) {
              var v3 = e7.target.value;
              selectValue[1](v3);
              if (v3 !== "__custom__") props.onChange(v3);
            },
            className: "h-10 px-2 rounded-lg border border-aq-line-2 bg-aq-paper text-sm text-aq-ink focus:border-aq-blue outline-none cursor-pointer"
          },
          (props.presets || []).map(function(p6) {
            return h9("option", { key: p6.value, value: p6.value }, p6.label);
          })
        ),
        h9("input", {
          value: custom ? props.value : "",
          onChange: function(e7) {
            props.onChange(e7.target.value);
          },
          placeholder: props.placeholder,
          disabled: !custom,
          className: "h-10 px-3 rounded-lg border border-aq-line-2 bg-aq-paper text-sm text-aq-ink focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none disabled:bg-aq-surface-alt disabled:text-aq-faint"
        })
      )
    );
  }
  function TemplatePickerInline(props) {
    if (props.loading) {
      return h9(
        "div",
        { className: "py-4 text-center" },
        h9("div", { className: "w-5 h-5 mx-auto border-2 border-aq-line-2 border-t-aq-blue rounded-full animate-spin" }),
        h9("p", { className: "text-sm text-aq-muted mt-2" }, "\u52A0\u8F7D\u6A21\u677F\u2026")
      );
    }
    if (!props.templates.length) {
      return h9(
        "div",
        { className: "py-4 text-center" },
        h9("p", { className: "text-sm text-aq-muted" }, "\u6A21\u677F\u5E93\u6682\u65E0\u53EF\u7528\u6A21\u677F"),
        h9("button", { className: "text-sm text-aq-blue hover:underline mt-1", onClick: props.onClose }, "\u5173\u95ED")
      );
    }
    return h9(
      "div",
      { className: "py-3" },
      h9(
        "div",
        { className: "flex items-center justify-between mb-3" },
        h9("span", { className: "text-sm font-semibold text-aq-ink" }, "\u4ECE\u6A21\u677F\u5F00\u59CB"),
        h9("button", { className: "text-sm text-aq-blue hover:underline", onClick: props.onClose }, "\u5173\u95ED")
      ),
      h9(
        "div",
        { className: "grid grid-cols-2 gap-2" },
        props.templates.map(function(tpl) {
          return h9(
            "button",
            {
              key: tpl.name,
              type: "button",
              onClick: function() {
                props.onSelect(tpl);
              },
              className: "text-left p-3 rounded-lg border border-aq-line hover:border-aq-blue hover:bg-aq-blue-soft/50 transition"
            },
            h9("div", { className: "text-sm font-semibold text-aq-ink" }, tpl.name),
            h9("p", { className: "text-xs text-aq-muted mt-0.5 line-clamp-2" }, tpl.description || "\u6682\u65E0\u63CF\u8FF0")
          );
        })
      )
    );
  }
  function TemplateManager(props) {
    var transport = props.transport;
    var templates = window.__React.useState([]);
    var loading = window.__React.useState(true);
    var error = window.__React.useState("");
    var editing = window.__React.useState(null);
    var form = window.__React.useState({ name: "", description: "", category: "", body: "" });
    var saving = window.__React.useState(false);
    var saveError = window.__React.useState("");
    function load() {
      loading[1](true);
      error[1]("");
      transport.listTemplates().then(function(data) {
        templates[1](data && data.templates || []);
        loading[1](false);
      }).catch(function(err) {
        error[1](err.message || "\u52A0\u8F7D\u5931\u8D25");
        loading[1](false);
      });
    }
    window.__React.useEffect(load, []);
    function startEdit(tpl) {
      editing[1](tpl ? tpl.name : null);
      form[1](tpl ? { name: tpl.name, description: tpl.description || "", category: tpl.category || "", body: tpl.body || "" } : { name: "", description: "", category: "", body: "" });
    }
    function handleSave(e7) {
      e7.preventDefault();
      var data = form[0];
      if (!data.name.trim() || !data.body.trim()) {
        saveError[1]("\u540D\u79F0\u548C\u5185\u5BB9\u4E3A\u5FC5\u586B");
        return;
      }
      saving[1](true);
      saveError[1]("");
      var params = [];
      var promise;
      if (editing[0]) {
        promise = transport.updateTemplate(editing[0], data);
      } else {
        promise = transport.createTemplate(data);
      }
      promise.then(function() {
        editing[1](null);
        load();
        saving[1](false);
      }).catch(function(err) {
        saveError[1](err.message || "\u4FDD\u5B58\u5931\u8D25");
        saving[1](false);
      });
    }
    function handleDelete(name) {
      if (!confirm('\u786E\u8BA4\u5220\u9664\u6A21\u677F "' + name + '"\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002')) return;
      transport.deleteTemplate(name).then(load).catch(function(err) {
        error[1](err.message || "\u5220\u9664\u5931\u8D25");
      });
    }
    return h9(
      DialogShell,
      { open: true, onClose: props.onClose, title: "\u6A21\u677F\u7BA1\u7406", variant: "drawer" },
      h9(
        "div",
        { className: "flex flex-col h-full" },
        editing[0] !== null ? h9(
          "form",
          { className: "flex-1 overflow-y-auto px-6 py-4", style: { overscrollBehaviorY: "contain" }, onSubmit: handleSave },
          saveError[0] && h9("div", { className: "p-3 mb-4 rounded-lg bg-aq-red-soft text-sm text-aq-red" }, saveError[0]),
          h9(Field, { label: "\u6A21\u677F\u540D\u79F0" }, h9("input", { value: form[0].name, onChange: function(e7) {
            form[1](Object.assign({}, form[0], { name: e7.target.value }));
          }, className: "aq-input" })),
          h9(
            "div",
            { className: "grid grid-cols-2 gap-3 mt-3" },
            h9(Field, { label: "\u5206\u7C7B" }, h9("input", { value: form[0].category, onChange: function(e7) {
              form[1](Object.assign({}, form[0], { category: e7.target.value }));
            }, placeholder: "\u5F00\u53D1", className: "aq-input" })),
            h9(Field, { label: "\u63CF\u8FF0" }, h9("input", { value: form[0].description, onChange: function(e7) {
              form[1](Object.assign({}, form[0], { description: e7.target.value }));
            }, className: "aq-input" }))
          ),
          h9(
            "div",
            { className: "mt-3" },
            h9("label", { className: "block text-sm font-semibold text-aq-ink-2 mb-1.5" }, "\u6A21\u677F\u5185\u5BB9\uFF08Markdown\uFF09"),
            h9("textarea", { value: form[0].body, onChange: function(e7) {
              form[1](Object.assign({}, form[0], { body: e7.target.value }));
            }, className: "w-full h-48 p-3 rounded-xl border border-aq-line-2 bg-aq-paper text-sm text-aq-ink resize-y focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 outline-none font-mono" })
          ),
          h9("p", { className: "text-xs text-aq-faint mt-1" }, "\u4F7F\u7528 YAML frontmatter \u5B9A\u4E49\u53C2\u6570\u3002\u652F\u6301 {{key}} \u5360\u4F4D\u7B26\u8BED\u6CD5\u3002"),
          h9(
            "div",
            { className: "flex justify-end gap-3 mt-4 pt-4 border-t border-aq-line" },
            h9("button", { type: "button", className: "aq-btn aq-btn-ghost", onClick: function() {
              editing[1](null);
            }, disabled: saving[0] }, "\u53D6\u6D88"),
            h9("button", { type: "submit", className: "aq-btn aq-btn-primary", disabled: saving[0] }, saving[0] ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")
          )
        ) : h9(
          "div",
          { className: "flex-1 overflow-y-auto px-6 py-4", style: { overscrollBehaviorY: "contain" } },
          h9(
            "div",
            { className: "flex items-center justify-between mb-4" },
            h9("span", { className: "text-sm font-semibold text-aq-ink" }, "\u6A21\u677F\u5217\u8868"),
            h9("button", { className: "aq-btn aq-btn-primary text-xs h-7", onClick: function() {
              startEdit(null);
            } }, "\u65B0\u5EFA\u6A21\u677F")
          ),
          loading[0] && h9("div", { className: "text-center py-8 text-sm text-aq-muted" }, "\u52A0\u8F7D\u4E2D\u2026"),
          error[0] && h9("div", { className: "p-3 rounded-lg bg-aq-red-soft text-sm text-aq-red mb-3" }, error[0]),
          !loading[0] && !templates[0].length && h9("p", { className: "text-sm text-aq-muted py-4" }, "\u6682\u65E0\u6A21\u677F"),
          templates[0].map(function(tpl) {
            return h9(
              "div",
              { key: tpl.name, className: "flex items-center justify-between py-3 border-b border-aq-line last:border-b-0" },
              h9(
                "div",
                { className: "flex-1 min-w-0" },
                h9("div", { className: "text-sm font-semibold text-aq-ink" }, tpl.name),
                h9("div", { className: "text-xs text-aq-faint mt-0.5" }, tpl.description || "\u6682\u65E0\u63CF\u8FF0"),
                tpl.category && h9("span", { className: "inline-block mt-1 text-xs text-aq-muted bg-aq-surface-alt px-1.5 py-0.5 rounded" }, tpl.category)
              ),
              h9(
                "div",
                { className: "flex items-center gap-1 flex-shrink-0 ml-3" },
                h9("button", { className: "aq-btn aq-btn-ghost h-6 px-2 text-xs", onClick: function() {
                  startEdit(tpl);
                } }, "\u7F16\u8F91"),
                h9("button", { className: "aq-btn aq-btn-ghost h-6 px-2 text-xs text-aq-red", onClick: function() {
                  handleDelete(tpl.name);
                } }, "\u5220\u9664")
              )
            );
          })
        )
      )
    );
  }

  // client/src/components/Workstation.jsx
  function h10() {
    return window.__React.createElement.apply(window.__React, arguments);
  }
  function Workstation(props) {
    var controller = props.controller;
    var transport = props.transport;
    var sessions = props.sessions;
    var state = window.__React.useState(function() {
      return controller.getSnapshot();
    });
    var confirm2 = window.__React.useState(null);
    var message = window.__React.useState(null);
    var query = window.__React.useState("");
    var selected = window.__React.useState([]);
    var snap = state[0];
    window.__React.useEffect(function() {
      return controller.subscribe(function() {
        state[1](controller.getSnapshot());
      });
    }, []);
    var normalizedQuery = query[0].trim().toLowerCase();
    var visibleTasks = snap.filtered.filter(function(task) {
      if (!normalizedQuery) return true;
      return [task.key, task.summary, task.body, task.status].some(function(v3) {
        return typeof v3 === "string" && v3.toLowerCase().indexOf(normalizedQuery) >= 0;
      });
    });
    window.__React.useEffect(function() {
      selected[1](function(keys) {
        return keys.filter(function(k5) {
          return snap.tasks.some(function(t6) {
            return t6.key === k5 && !t6.archivedAt && t6.status !== "running";
          });
        });
      });
    }, [snap.revision]);
    function flash(text) {
      message[1](text);
      setTimeout(function() {
        message[1](null);
      }, 2400);
    }
    function runAction(kind, key, opts) {
      return controller.doAction(kind, key, opts).then(function() {
        var labels = { archive: "\u5DF2\u5F52\u6863", restore: "\u5DF2\u6062\u590D", rerun: "\u5DF2\u91CD\u65B0\u5165\u961F", stop: "\u505C\u6B62\u6307\u4EE4\u5DF2\u63D0\u4EA4", delete: "\u5DF2\u5220\u9664", "force-scan": "\u626B\u63CF\u5B8C\u6210" };
        if (labels[kind]) flash(labels[kind]);
      }).catch(function() {
      });
    }
    function handleAction(kind, key) {
      if (kind === "delete" || kind === "stop" || kind === "rerun") {
        var prompt = kind === "delete" ? "\u786E\u8BA4\u5220\u9664\u8FD9\u4E2A\u5F85\u6267\u884C\u4EFB\u52A1\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002" : kind === "stop" ? "\u786E\u8BA4\u505C\u6B62\u8FD0\u884C\u4E2D\u7684\u4EFB\u52A1\uFF1F\u5F53\u524D\u4F1A\u8BDD\u4F1A\u5B89\u5168\u7ED3\u675F\u3002" : "\u786E\u8BA4\u91CD\u65B0\u6267\u884C\u8FD9\u4E2A\u4EFB\u52A1\uFF1F\u8FD9\u4F1A\u521B\u5EFA\u65B0\u7684\u72EC\u7ACB\u4F1A\u8BDD\uFF0C\u5E76\u518D\u6B21\u6D88\u8017\u6A21\u578B\u4E0E\u5DE5\u5177\u8D44\u6E90\u3002";
        confirm2[1]({
          title: kind === "delete" ? "\u5220\u9664\u4EFB\u52A1" : kind === "stop" ? "\u505C\u6B62\u4EFB\u52A1" : "\u91CD\u65B0\u6267\u884C\u4EFB\u52A1",
          message: prompt,
          confirmLabel: kind === "delete" ? "\u5220\u9664" : kind === "stop" ? "\u505C\u6B62" : "\u91CD\u65B0\u6267\u884C",
          tone: kind === "rerun" ? "warn" : "danger",
          onConfirm: function() {
            confirm2[1](null);
            runAction(kind, key);
          }
        });
        return;
      }
      runAction(kind, key);
    }
    function toggleSelected(key) {
      selected[1](function(keys) {
        return keys.indexOf(key) >= 0 ? keys.filter(function(x7) {
          return x7 !== key;
        }) : keys.concat(key);
      });
    }
    function toggleAll() {
      var selectable = visibleTasks.filter(function(t6) {
        return t6.status !== "running" && !t6.archivedAt;
      });
      var allSelected = selectable.every(function(t6) {
        return selected[0].indexOf(t6.key) >= 0;
      });
      selected[1](allSelected ? [] : selectable.map(function(t6) {
        return t6.key;
      }));
    }
    function archiveSelected() {
      var keys = selected[0].slice();
      if (!keys.length) return;
      confirm2[1]({
        title: "\u6279\u91CF\u5F52\u6863",
        message: "\u786E\u8BA4\u5F52\u6863\u5DF2\u9009\u62E9\u7684 " + keys.length + " \u4E2A\u4EFB\u52A1\uFF1F\u968F\u65F6\u53EF\u4EE5\u4ECE\u5F52\u6863\u533A\u6062\u590D\u3002",
        confirmLabel: "\u5F52\u6863",
        onConfirm: function() {
          confirm2[1](null);
          controller.doAction("archive", null, { keys }).then(function(result) {
            var results = result && Array.isArray(result.results) ? result.results : [];
            var failed = results.filter(function(x7) {
              return !x7.ok;
            });
            var succeeded = results.length ? results.length - failed.length : keys.length;
            selected[1](failed.map(function(x7) {
              return x7.key;
            }));
            flash(failed.length ? "\u5DF2\u5F52\u6863 " + succeeded + " \u4E2A\uFF0C" + failed.length + " \u4E2A\u672A\u5F52\u6863" : "\u5DF2\u5F52\u6863 " + succeeded + " \u4E2A\u4EFB\u52A1");
          }).catch(function() {
          });
        }
      });
    }
    return h10(
      "div",
      { className: "flex flex-col h-full overflow-hidden" },
      h10(CompactHeader, {
        snap,
        message: message[0],
        onNewTask: function() {
          controller.openNewTask();
        },
        onConfig: function() {
          controller.openConfig();
        },
        onClose: function() {
          controller.closeBoard();
        },
        onScan: function() {
          runAction("force-scan");
        }
      }),
      h10(NavCategories, { snap, onNav: function(v3) {
        controller.setNavGroup(v3);
      } }),
      h10(CompactFilters, {
        snap,
        query: query[0],
        onQuery: query[1],
        onFilter: function(v3) {
          controller.setFilter(v3);
        },
        onNewTask: function() {
          controller.openNewTask();
        }
      }),
      selected[0].length > 0 && h10(
        "div",
        { className: "flex items-center gap-2 px-4 py-2 bg-aq-blue-soft border-b border-aq-blue/20" },
        h10("span", { className: "text-xs font-semibold text-aq-blue mr-auto" }, "\u5DF2\u9009\u62E9 ", selected[0].length, " \u4E2A"),
        h10("button", { className: "text-xs font-semibold text-aq-blue hover:underline", onClick: function() {
          selected[1]([]);
        } }, "\u53D6\u6D88"),
        h10("button", { className: "aq-btn aq-btn-primary text-xs h-7 px-3", onClick: archiveSelected }, "\u6279\u91CF\u5F52\u6863")
      ),
      h10(CompactTaskList, {
        snap,
        tasks: visibleTasks,
        controller,
        sessions,
        selected: selected[0],
        onSelect: toggleSelected,
        onSelectAll: toggleAll,
        onAction: handleAction
      }),
      snap.showDetail && snap.detailTask && h10(TaskDetailPanel, {
        key: snap.detailTask.key,
        task: snap.detailTask,
        transport,
        controller,
        sessions,
        onClose: function() {
          controller.closeDetail();
        },
        onActionRequest: function(kind, key) {
          controller.closeDetail();
          handleAction(kind, key);
        },
        onUpdate: controller.updateTask
      }),
      snap.showNewTask && h10(NewTaskModal, {
        transport,
        options: snap.options,
        config: snap.config,
        onClose: function() {
          controller.closeNewTask();
        },
        onCreate: function(data) {
          return controller.createTask(data).then(function(result) {
            var key = result && result.key ? result.key : data.key || "\u65B0\u4EFB\u52A1";
            var ts = result && result.taskState;
            var phase = "\u72B6\u6001\u5DF2\u540C\u6B65";
            if (ts) {
              if (ts.archivedAt) phase = ts.status === "done" ? "\u5DF2\u5B8C\u6210\u5E76\u5F52\u6863" : "\u5DF2\u7ED3\u675F\u5E76\u5F52\u6863";
              else if (ts.status === "running") phase = "\u5DF2\u5F00\u59CB\u6267\u884C";
              else if (ts.status === "done") phase = "\u5DF2\u5B8C\u6210";
              else if (ts.status === "failed") phase = "\u6267\u884C\u5931\u8D25\uFF0C\u8BF7\u67E5\u770B\u8BE6\u60C5";
              else if (ts.status === "pending") phase = data.schedule ? "\u5DF2\u5B89\u6392\u5B9A\u65F6\u6267\u884C" : data.cron ? "\u5DF2\u542F\u7528\u5FAA\u73AF\u8C03\u5EA6" : "\u7B49\u5F85\u6267\u884C";
            }
            flash("\u5DF2\u5165\u961F\uFF1A" + key + " \xB7 " + (result.stateRefreshed === false ? "\u9875\u9762\u5237\u65B0\u5931\u8D25" : phase));
            return result;
          });
        }
      }),
      snap.showEdit && snap.editTask && h10(EditTaskModal, {
        task: snap.editTask,
        options: snap.options,
        onClose: function() {
          controller.closeEdit();
        },
        onUpdate: function(key, patch) {
          return controller.updateTask(key, patch);
        }
      }),
      snap.showConfig && h10(ConfigPanel, {
        config: snap.config,
        options: snap.options,
        onClose: function() {
          controller.closeConfig();
        },
        onUpdate: function(patch) {
          return controller.updateConfig(patch);
        },
        onSetConcurrency: function(n8) {
          return controller.setConcurrency(n8);
        }
      }),
      confirm2[0] && h10(ConfirmModal, {
        title: confirm2[0].title,
        message: confirm2[0].message,
        confirmLabel: confirm2[0].confirmLabel,
        tone: confirm2[0].tone,
        onConfirm: confirm2[0].onConfirm,
        onCancel: function() {
          confirm2[1](null);
        }
      })
    );
  }
  function CompactHeader(props) {
    return h10(
      "header",
      { className: "flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b border-aq-line bg-aq-paper" },
      h10(
        "div",
        { className: "flex items-center gap-2.5 mr-auto" },
        h10(
          "span",
          { className: "flex items-center gap-1.5 text-sm font-bold text-aq-ink" },
          h10("span", { className: "w-4 h-4 flex-shrink-0", dangerouslySetInnerHTML: { __html: iconHtml("list") } }),
          "\u4EFB\u52A1\u961F\u5217"
        )
      ),
      props.message && h10("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-b-lg bg-aq-navy text-white text-xs shadow-lg z-50" }, props.message),
      h10("button", { className: "aq-btn aq-btn-ghost h-7 text-xs", onClick: props.onScan, title: "\u7ACB\u5373\u626B\u63CF\u6536\u4EF6\u7BB1", dangerouslySetInnerHTML: { __html: iconHtml("scan") + " \u626B\u63CF" } }),
      h10("button", { className: "aq-btn aq-btn-ghost h-7 text-xs", onClick: props.onConfig, title: "\u8FD0\u884C\u8BBE\u7F6E", dangerouslySetInnerHTML: { __html: iconHtml("gear") } }),
      h10("button", { className: "aq-btn aq-btn-ghost h-7 text-xs", onClick: props.onClose, dangerouslySetInnerHTML: { __html: iconHtml("close") + " \u5173\u95ED" } })
    );
  }
  function NavCategories(props) {
    var snap = props.snap;
    var all = snap.tasks || [];
    var active = all.filter(function(t6) {
      return !t6.archivedAt;
    });
    var archived = all.filter(function(t6) {
      return !!t6.archivedAt;
    });
    var cronTasks = active.filter(function(t6) {
      return t6.cron;
    });
    var manualTasks = active.filter(function(t6) {
      return !t6.cron;
    });
    var done24h = snap.metrics.done24h || 0;
    var cats = [
      ["all", "\u5168\u90E8", active.length],
      ["cron", "\u5B9A\u65F6\u4EFB\u52A1", cronTasks.length],
      ["manual", "\u5373\u65F6\u4EFB\u52A1", manualTasks.length],
      ["archived", "\u5F52\u6863", archived.length]
    ];
    return h10(
      "div",
      { className: "flex-shrink-0 flex items-center gap-0 px-4 py-1.5 border-b border-aq-line overflow-x-auto" },
      cats.map(function(c11) {
        var isActive = snap.navGroup === c11[0] || snap.navGroup === "all" && c11[0] === "all";
        return h10("button", {
          key: c11[0],
          className: "px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition " + (isActive ? "bg-aq-blue text-white" : "text-aq-muted hover:text-aq-ink hover:bg-aq-surface-alt"),
          onClick: function() {
            props.onNav(c11[0]);
          }
        }, c11[1], c11[2] > 0 ? h10("span", { className: "ml-1 opacity-70" }, c11[2]) : null);
      }),
      done24h > 0 && h10(
        "span",
        { className: "ml-auto flex items-center gap-1.5 text-xs whitespace-nowrap" },
        h10("span", { className: "w-1.5 h-1.5 rounded-full bg-aq-green" }),
        h10("span", { className: "text-aq-faint" }, "24h\u5B8C\u6210"),
        h10("span", { className: "font-bold text-aq-green" }, done24h)
      )
    );
  }
  function CompactFilters(props) {
    var snap = props.snap;
    var sc = snap.scopeCounts || {};
    var tabs = [
      ["all", "\u5168\u90E8", (snap.scoped || []).length],
      ["running", "\u8FD0\u884C\u4E2D", sc.running || 0],
      ["pending", "\u5F85\u6267\u884C", sc.pending || 0],
      ["failed", "\u5931\u8D25", sc.failed || 0],
      ["done", "\u5DF2\u5B8C\u6210", sc.done || 0]
    ];
    return h10(
      "div",
      { className: "flex-shrink-0 flex flex-wrap items-center gap-2 px-4 py-1.5 border-b border-aq-line" },
      h10(
        "div",
        { className: "flex-1 min-w-[140px]" },
        h10(
          W2,
          null,
          h10(X3, {
            type: "search",
            value: props.query,
            onChange: function(e7) {
              props.onQuery(e7.target.value);
            },
            placeholder: "\u641C\u7D22\u4EFB\u52A1\u2026",
            className: "w-full h-8 px-3 rounded-lg border border-aq-line bg-aq-surface-alt text-sm text-aq-ink outline-none focus:border-aq-blue focus:ring-2 focus:ring-aq-blue/10 placeholder:text-aq-faint"
          })
        )
      ),
      h10(
        "div",
        { className: "flex gap-0.5 p-0.5 rounded-lg bg-aq-surface-alt border border-aq-line flex-shrink-0" },
        tabs.map(function(t6) {
          return h10("button", {
            key: t6[0],
            className: "px-2 py-1 rounded-md text-xs font-semibold transition " + (snap.filter === t6[0] ? "bg-aq-paper text-aq-ink shadow-sm" : "text-aq-muted hover:text-aq-ink"),
            onClick: function() {
              props.onFilter(t6[0]);
            }
          }, t6[1], t6[2] > 0 ? h10("span", { className: "ml-1 opacity-60" }, t6[2]) : null);
        })
      ),
      h10("button", {
        className: "aq-btn aq-btn-primary flex-shrink-0",
        style: { height: "28px", fontSize: "12px", padding: "0 10px" },
        onClick: props.onNewTask,
        dangerouslySetInnerHTML: { __html: iconHtml("plus") + " \u65B0\u5EFA" }
      })
    );
  }
  function CompactTaskList(props) {
    if (props.snap.loading) {
      return h10(
        "div",
        { className: "flex flex-col items-center justify-center flex-1 gap-3 py-12" },
        h10("div", { className: "w-5 h-5 border-2 border-aq-line-2 border-t-aq-blue rounded-full animate-spin" }),
        h10("span", { className: "text-sm text-aq-muted" }, "\u6B63\u5728\u8BFB\u53D6\u4EFB\u52A1\u8D26\u672C\u2026")
      );
    }
    if (!props.tasks.length) {
      return h10(
        "div",
        { className: "flex flex-col items-center justify-center flex-1 py-12 gap-2" },
        h10("p", { className: "text-sm text-aq-muted" }, "\u8FD8\u6CA1\u6709\u4EFB\u52A1"),
        h10("button", { className: "aq-btn aq-btn-primary text-xs", onClick: function() {
          props.controller.openNewTask();
        } }, "\u521B\u5EFA\u7B2C\u4E00\u4E2A\u4EFB\u52A1")
      );
    }
    var selectableCount = props.tasks.filter(function(t6) {
      return t6.status !== "running" && !t6.archivedAt;
    }).length;
    return h10(
      "div",
      { className: "flex-1 overflow-y-auto overflow-x-hidden" },
      h10(
        "table",
        { className: "w-full table-fixed", style: { borderSpacing: "0" } },
        h10(
          "colgroup",
          null,
          h10("col", { style: { width: "40px" } }),
          h10("col", null),
          h10("col", { style: { width: "120px" } }),
          h10("col", { style: { width: "76px" } }),
          h10("col", { style: { width: "168px" } })
        ),
        h10(
          "thead",
          null,
          h10(
            "tr",
            { className: "border-b border-aq-line bg-aq-surface-alt" },
            h10(
              "th",
              { className: "pl-4 pr-2 py-1" },
              h10(
                Ke,
                {
                  checked: selectableCount > 0 && props.selected.length === selectableCount,
                  indeterminate: props.selected.length > 0 && props.selected.length < selectableCount,
                  onChange: props.onSelectAll,
                  className: "group/box flex items-center"
                },
                h10(
                  "span",
                  { className: "flex h-4 w-4 items-center justify-center rounded border transition border-aq-line-2 bg-white cursor-pointer group-hover/box:border-aq-blue" },
                  props.selected.length === selectableCount && selectableCount > 0 && h10(
                    "svg",
                    { className: "h-3 w-3 text-aq-blue", viewBox: "0 0 12 12", fill: "none" },
                    h10("path", { d: "M2.5 6l2.5 2.5 4.5-4.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })
                  ),
                  props.selected.length > 0 && props.selected.length < selectableCount && h10(
                    "svg",
                    { className: "h-3 w-3 text-aq-blue", viewBox: "0 0 12 12", fill: "none" },
                    h10("line", { x1: "3", y1: "6", x2: "9", y2: "6", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" })
                  )
                )
              )
            ),
            h10("th", { className: "text-left py-1 pl-0 text-xs font-semibold text-aq-faint uppercase tracking-wide" }, "\u4EFB\u52A1"),
            h10("th", { className: "py-1 text-xs font-semibold text-aq-faint uppercase tracking-wide text-center" }, "\u8C03\u5EA6"),
            h10("th", { className: "pr-4 py-1 text-xs font-semibold text-aq-faint uppercase tracking-wide text-right" }, "\u72B6\u6001"),
            h10("th", { className: "pr-4 py-1 text-xs font-semibold text-aq-faint uppercase tracking-wide" }, "\u64CD\u4F5C")
          )
        ),
        h10(
          "tbody",
          { className: "divide-y divide-aq-line" },
          props.tasks.map(function(task) {
            return h10(TaskRow, {
              key: task.key,
              task,
              snap: props.snap,
              selected: props.selected.indexOf(task.key) >= 0,
              onSelect: props.onSelect,
              onAction: props.onAction,
              onDetail: function(k5) {
                props.controller.openDetail(k5);
              },
              onEdit: function(k5) {
                props.controller.openEdit(k5);
              },
              onSession: function(sid) {
                props.controller.closeBoard();
                props.sessions.open(sid);
              }
            });
          })
        )
      )
    );
  }
  var actionBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: "24px",
    padding: "0 8px",
    fontSize: "12px",
    fontWeight: "500",
    border: "none",
    borderRadius: "6px",
    background: "transparent",
    color: "var(--aq-faint, #667085)",
    cursor: "pointer",
    whiteSpace: "nowrap"
  };
  function TaskRow(props) {
    var task = props.task;
    var cfg = STATUS_CONFIG[task.status] || { label: task.status, color: "#596579" };
    var summary = task.title || task.summary || taskSummary(task.body);
    var attention = taskNeedsAttention(task);
    var selectable = task.status !== "running" && !task.archivedAt;
    var unread = isUnread(task);
    var sessionId = task.sessionId || task.lastSessionId || (task.executions && task.executions.length ? task.executions[task.executions.length - 1].sessionId : null);
    var plan = task.cron ? cronToHuman(task.cron) : "\u5373\u65F6";
    if (task.cron && task.attempts > 1) plan = plan + " \xB7 \u7B2C" + task.attempts + "\u6B21";
    var statusColor = task.stopPending ? "#9a6700" : task.foregroundPaused ? "#27776e" : cfg.color;
    var statusLabel = task.stopPending ? "\u505C\u6B62\u4E2D" : task.foregroundPaused ? "\u5DF2\u6682\u505C" : cfg.label;
    function openRow() {
      props.onDetail(task.key);
    }
    return h10(
      "tr",
      {
        className: "hover:bg-aq-surface-alt cursor-pointer transition group align-top " + (props.selected ? "bg-aq-blue-soft" : "") + (unread ? " border-l-2 border-l-aq-blue" : ""),
        onClick: openRow
      },
      h10(
        "td",
        { className: "pl-4 pr-2 py-2.5 align-middle", onClick: function(e7) {
          e7.stopPropagation();
        } },
        h10(
          Ke,
          {
            checked: props.selected,
            disabled: !selectable,
            onChange: function() {
              props.onSelect(task.key);
            },
            className: "group/box flex items-center"
          },
          h10(
            "span",
            { className: "flex h-4 w-4 items-center justify-center rounded border transition " + (props.selected ? "border-aq-blue bg-aq-blue" : "border-aq-line-2 bg-white") + (!selectable ? " opacity-40" : " cursor-pointer group-hover/box:border-aq-blue") },
            props.selected && h10(
              "svg",
              { className: "h-3 w-3 text-white", viewBox: "0 0 12 12", fill: "none" },
              h10("path", { d: "M2.5 6l2.5 2.5 4.5-4.5", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })
            )
          )
        )
      ),
      h10(
        "td",
        { className: "py-2.5 align-middle overflow-hidden", style: { fontSize: "13px", minWidth: "120px" } },
        h10(
          "div",
          { className: "flex items-center gap-1.5 min-w-0" },
          h10("span", { className: "flex-shrink-0 w-1.5 h-1.5 rounded-full " + (unread ? "bg-aq-blue" : "bg-transparent"), title: unread ? "\u672A\u8BFB" : void 0 }),
          h10("span", { className: "font-semibold text-aq-ink leading-snug flex-shrink-0", style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" } }, attention ? "! " + task.key : task.key),
          summary && h10("span", { className: "text-aq-muted leading-snug flex-1 min-w-0", style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, "\xB7 " + summary)
        )
      ),
      h10(
        "td",
        { className: "py-2.5 text-center align-middle", style: { fontSize: "12px" } },
        h10("span", { className: "inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-aq-surface-alt text-aq-faint border border-aq-line whitespace-nowrap" }, plan)
      ),
      h10(
        "td",
        { className: "py-2.5 pr-4 text-right align-middle", style: { fontSize: "12px" } },
        h10(
          "span",
          {
            className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
            style: { backgroundColor: statusColor + "15", color: statusColor }
          },
          h10("span", { className: "w-1 h-1 rounded-full", style: { backgroundColor: statusColor } }),
          statusLabel
        )
      ),
      h10(
        "td",
        { className: "py-2.5 pr-4 align-middle", style: { fontSize: "12px" } },
        h10(
          "div",
          { className: "flex items-center gap-1 flex-wrap" },
          task.status === "running" && task.stopPending !== true && !task.archivedAt && h10("button", { style: actionBtnStyle, className: "hover:bg-aq-red-soft", onClick: function(e7) {
            e7.stopPropagation();
            props.onAction("stop", task.key);
          } }, "\u505C\u6B62"),
          task.status === "pending" && !task.archivedAt && h10("button", { style: actionBtnStyle, className: "hover:bg-aq-surface-alt", onClick: function(e7) {
            e7.stopPropagation();
            props.onEdit(task.key);
          } }, "\u7F16\u8F91"),
          ["done", "failed", "stopped", "interrupted"].indexOf(task.status) >= 0 && !task.archivedAt && h10("button", { style: Object.assign({}, actionBtnStyle, { color: "var(--aq-green, #067647)" }), className: "hover:bg-aq-green-soft", onClick: function(e7) {
            e7.stopPropagation();
            props.onAction("rerun", task.key);
          } }, "\u91CD\u8DD1"),
          task.status !== "running" && !task.archivedAt && h10("button", { style: actionBtnStyle, className: "hover:bg-aq-surface-alt", onClick: function(e7) {
            e7.stopPropagation();
            props.onAction("archive", task.key);
          } }, "\u5F52\u6863"),
          task.archivedAt && h10("button", { style: actionBtnStyle, className: "hover:bg-aq-surface-alt", onClick: function(e7) {
            e7.stopPropagation();
            props.onAction("restore", task.key);
          } }, "\u8FD8\u539F"),
          ["pending", "failed", "stopped", "interrupted"].indexOf(task.status) >= 0 && !task.archivedAt && h10("button", { style: Object.assign({}, actionBtnStyle, { color: "var(--aq-red, #b42318)" }), className: "hover:bg-aq-red-soft", onClick: function(e7) {
            e7.stopPropagation();
            props.onAction("delete", task.key);
          } }, "\u5220\u9664"),
          sessionId && !task.archivedAt && h10("button", { style: actionBtnStyle, className: "hover:bg-aq-surface-alt", onClick: function(e7) {
            e7.stopPropagation();
            if (props.onSession) props.onSession(sessionId);
          } }, "\u4F1A\u8BDD")
        )
      )
    );
  }
  function taskPrimaryAction(task) {
    if (task.archivedAt) return { label: "\u8FD8\u539F", handler: function() {
    }, tone: "" };
    if (task.status === "running" && task.stopPending !== true) return null;
    if (task.status === "pending") return null;
    if (["done", "failed", "stopped", "interrupted"].indexOf(task.status) >= 0) return null;
    return null;
  }
  function taskNeedsAttention(task) {
    var phase = String(task.goalPhase || "");
    return task.status === "failed" || task.status === "interrupted" || phase.indexOf("uncertain") >= 0 || phase.indexOf("containment") >= 0 || !!task._goalAdmissionUncertain || !!task._promptAdmissionUncertain;
  }

  // client/src/components/FloatingDock.jsx
  function h11() {
    return window.__React.createElement.apply(window.__React, arguments);
  }
  function FloatingDock(props) {
    var controller = props.controller;
    var transport = props.transport;
    var sessions = props.sessions;
    var state = window.__React.useState(function() {
      return controller.getSnapshot();
    });
    var snap = state[0];
    var containerRef = window.__React.useRef(null);
    var savedPos = window.__React.useState(function() {
      try {
        var raw = localStorage.getItem("aq-dock-pos");
        if (raw) return JSON.parse(raw);
      } catch (e7) {
      }
      return null;
    });
    window.__React.useEffect(function() {
      controller.init();
      return controller.subscribe(function() {
        state[1](controller.getSnapshot());
      });
    }, []);
    var boardOpen = snap.boardOpen;
    var runningCount = snap.metrics.running || 0;
    var hasAttention = snap.tasks.some(function(t6) {
      return t6.status === "failed" || t6.status === "interrupted" || t6.goalPhase && (t6.goalPhase.indexOf("uncertain") >= 0 || t6.goalPhase.indexOf("containment") >= 0);
    });
    var statusColor = hasAttention ? "#f79009" : runningCount > 0 ? "#155eef" : "#067647";
    function toggle() {
      controller.toggleBoard();
    }
    var dragRef = window.__React.useRef({ dragging: false, startX: 0, startY: 0, moved: false });
    function onPointerDown(e7) {
      if (e7.button !== 0) return;
      dragRef.current = { dragging: true, startX: e7.clientX, startY: e7.clientY, moved: false };
      var el = containerRef.current;
      if (!el) return;
      e7.preventDefault();
      var rect = el.getBoundingClientRect();
      var offsetX = e7.clientX - rect.left;
      var offsetY = e7.clientY - rect.top;
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
            var r10 = el.getBoundingClientRect();
            localStorage.setItem("aq-dock-pos", JSON.stringify({ left: r10.left, top: r10.top }));
          } catch (e8) {
          }
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
    return h11(
      window.__React.Fragment,
      null,
      // ─── 居中弹窗面板 ──────────────────────────────────────
      boardOpen && h11("div", {
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 88,
          backgroundColor: "rgba(16,24,40,0.35)",
          transition: "opacity 0.2s ease"
        },
        onClick: toggle
      }),
      h11(
        Ke2,
        {
          show: boardOpen,
          enter: "transition duration-300 ease-out",
          enterFrom: "opacity-0 scale-95",
          enterTo: "opacity-100 scale-100",
          leave: "transition duration-200 ease-in",
          leaveFrom: "opacity-100 scale-100",
          leaveTo: "opacity-0 scale-95"
        },
        h11(
          "div",
          {
            style: {
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(912px, calc(100vw - 48px))",
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
          h11(Workstation, { controller, transport, sessions, compact: true })
        )
      ),
      // ─── 可拖拽 Dock 入口按钮 ─────────────────────────────
      !boardOpen && h11(
        "div",
        { ref: containerRef, style: containerStyle },
        h11(
          "button",
          {
            onMouseDown: onPointerDown,
            title: runningCount > 0 ? "\u4EFB\u52A1\u961F\u5217 \xB7 " + runningCount + " \u4E2A\u8FD0\u884C\u4E2D" : "\u4EFB\u52A1\u961F\u5217",
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
            onMouseEnter: function(e7) {
              e7.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.14), 0 1px 3px rgba(0,0,0,0.06)";
              e7.currentTarget.style.transform = "translateY(-1px)";
            },
            onMouseLeave: function(e7) {
              e7.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)";
              e7.currentTarget.style.transform = "translateY(0)";
            }
          },
          // 列表图标
          h11(
            "svg",
            {
              width: "18",
              height: "18",
              viewBox: "0 0 24 24",
              fill: "none",
              stroke: "currentColor",
              strokeWidth: "2",
              strokeLinecap: "round",
              strokeLinejoin: "round",
              style: { color: "var(--aq-ink, #344054)" }
            },
            h11("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
            h11("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
            h11("line", { x1: "4", y1: "18", x2: "14", y2: "18" })
          ),
          // 状态角标
          h11("span", {
            style: {
              position: "absolute",
              top: "-3px",
              right: "-3px",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: statusColor,
              border: "2px solid var(--aq-paper, #fff)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.06)"
            }
          }),
          // 运行中数量角标
          runningCount > 0 && h11("span", {
            style: {
              position: "absolute",
              bottom: "-3px",
              right: "-3px",
              minWidth: "16px",
              height: "16px",
              padding: "0 4px",
              borderRadius: "8px",
              backgroundColor: "var(--aq-blue, #155eef)",
              color: "#fff",
              fontSize: "10px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid var(--aq-paper, #fff)",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.06)"
            }
          }, String(runningCount))
        )
      )
    );
  }

  // client/src/index.jsx
  function mountFloatingPanel(controller, transport, React2, reactDomClient, sessions) {
    var root = null;
    var container = document.createElement("div");
    container.id = "aq-floating-root";
    container.setAttribute("data-dsh-plugin", "autoqueue");
    document.body.appendChild(container);
    root = reactDomClient.createRoot(container);
    root.render(React2.createElement(FloatingDock, { controller, transport, sessions }));
    return function() {
      if (root) root.unmount();
      if (container.isConnected) container.remove();
    };
  }
  var MODULE_ID = "@alintever/dsh-plugin-autoqueue";
  window.__ModuleLoader__.load({
    id: MODULE_ID,
    factory: function(require2) {
      var previousReact = window.__React;
      var previousReactDOM = window.__ReactDOM;
      window.__React = require2("react");
      window.__ReactDOM = require2("react-dom/client");
      if (!window.React) window.React = window.__React;
      if (!window.ReactDOM) window.ReactDOM = window.__ReactDOM;
      return {
        dispose: function() {
        },
        apply: function(ctx) {
          var sessions = ctx.get("sessions");
          var transport = createTransport();
          var controller = createController(transport);
          var styleId = "dsh-autoqueue-styles";
          if (!document.getElementById(styleId)) {
            var style = document.createElement("style");
            style.id = styleId;
            style.textContent = tailwind_output_default;
            document.head.appendChild(style);
          }
          var panelDisposer = mountFloatingPanel(controller, transport, window.__React, window.__ReactDOM, sessions);
          return function() {
            controller.closeBoard();
            panelDisposer();
            controller.dispose();
            var styleEl = document.getElementById(styleId);
            if (styleEl) styleEl.remove();
            if (previousReact === void 0) delete window.__React;
            else window.__React = previousReact;
            if (previousReactDOM === void 0) delete window.__ReactDOM;
            else window.__ReactDOM = previousReactDOM;
            if (!previousReact) delete window.React;
            if (!previousReactDOM) delete window.ReactDOM;
          };
        }
      };
    }
  });
})();
/*! Bundled license information:

use-sync-external-store/cjs/use-sync-external-store-with-selector.development.js:
  (**
   * @license React
   * use-sync-external-store-with-selector.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
