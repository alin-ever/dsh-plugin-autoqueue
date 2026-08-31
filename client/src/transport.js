var API_PREFIX = "/api/queue";
var REQUEST_TIMEOUT_MS = 15e3;

function readJson(response) {
  if (!response.ok) {
    return response.text().then(function (text) {
      throw new Error(text || "HTTP " + response.status);
    });
  }
  return response.json();
}

function request(url, init) {
  var controller = new AbortController();
  var timeout = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS);
  return fetch(API_PREFIX + url, Object.assign({}, init, { signal: controller.signal }))
    .then(readJson)
    .finally(function () { clearTimeout(timeout); });
}

export function createTransport() {
  return {
    state: function () { return request("/state"); },
    detail: function (key) { return request("/detail?key=" + encodeURIComponent(key)); },
    options: function () { return request("/options"); },
    getConfig: function () { return request("/config"); },
    setConfig: function (patch) {
      return request("/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    },
    createTask: function (data) {
      return request("/task", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    },
    action: function (kind, key, opts) {
      return request("/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: crypto.randomUUID(), action: Object.assign({ kind: kind, key: key }, opts || {}) })
      });
    },
    markRead: function (key, read) {
      return request("/mark-read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: key, read: read !== false }) });
    },
    subscribe: function (listener) {
      var events = new EventSource(API_PREFIX + "/events");
      events.onmessage = function (message) {
        try {
          var parsed = JSON.parse(message.data);
          if (parsed && typeof parsed === "object" && typeof parsed.revision === "number") listener(parsed);
        } catch (e) {}
      };
      events.onerror = function () {};
      var onVisible = function () { if (document.visibilityState === "visible") listener(null); };
      document.addEventListener("visibilitychange", onVisible);
      return function () { document.removeEventListener("visibilitychange", onVisible); events.close(); };
    }
  };
}