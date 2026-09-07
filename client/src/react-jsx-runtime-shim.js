var R = window.__React;
export var jsx = function (type, config, key) {
  var props = {}, ref = null;
  if (config != null) {
    if (config.key !== undefined) { key = "" + config.key; }
    if (config.ref !== undefined) { ref = config.ref; }
    for (var k in config) {
      if (k !== "key" && k !== "ref" && Object.prototype.hasOwnProperty.call(config, k)) {
        props[k] = config[k];
      }
    }
  }
  var ELEMENT = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("react.element") : 0xeac7;
  return { $$typeof: ELEMENT, type: type, key: key || null, ref: ref, props: props, _owner: null };
};
export var jsxs = jsx;
export var Fragment = R ? R.Fragment : (typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("react.fragment") : 0xeac7);