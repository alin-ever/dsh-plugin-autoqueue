var API_PREFIX = "/api/queue";
var REQUEST_TIMEOUT_MS = 15e3;

function readJson(response) {
  return response.text().then(function (text) {
    var body = null;
    try { body = text ? JSON.parse(text) : null; }
    catch (e) {
      throw new Error("HTTP " + response.status + " 返回了无效 JSON");
    }
    if (!response.ok) {
      throw new Error((body && body.error) || text || "HTTP " + response.status);
    }
    return body;
  });
}

function requestAt(url, init) {
  var controller = new AbortController();
  var timeout = setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS);
  return fetch(url, Object.assign({}, init, { signal: controller.signal }))
    .then(readJson)
    .finally(function () { clearTimeout(timeout); });
}

function request(url, init) {
  return requestAt(API_PREFIX + url, init);
}

export function createTransport() {
  return {
    // The workstation owns both the active and archived views. Always request
    // the complete projection so an SSE refresh cannot make archived rows
    // disappear after the initial load.
    state: function () { return request("/state?archived=1"); },
    detail: function (key) { return request("/detail?key=" + encodeURIComponent(key)); },
    options: function () { return request("/options"); },
    capabilities: function () { return requestAt("/api/autoqueue/capabilities"); },
    getConfig: function () { return request("/config"); },
    setConfig: function (patch) {
      return request("/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    },
    createTask: function (data) {
      return request("/task", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    },
    action: function (kind, key, opts) {
      var action = Object.assign({}, opts || {}, { kind: kind });
      if (key !== undefined && key !== null) action.key = key;
      return request("/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: crypto.randomUUID(), action: action })
      });
    },
    markRead: function (key, read) {
      return request("/mark-read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key: key, read: read !== false }) });
    },
    subscribe: function (listener, healthListener) {
      var events = new EventSource(API_PREFIX + "/events?archived=1");
      var health = {
        status: "connecting", connected: false, reconnecting: false,
        lastEventAt: null, revision: null
      };
      var reportHealth = function (patch) {
        health = Object.assign({}, health, patch || {});
        if (typeof healthListener === "function") healthListener(health);
      };
      reportHealth();
      events.onopen = function () {
        reportHealth({ status: "connected", connected: true, reconnecting: false });
      };
      events.onmessage = function (message) {
        try {
          var parsed = JSON.parse(message.data);
          if (parsed && typeof parsed === "object" && typeof parsed.revision === "number") {
            reportHealth({
              status: "connected", connected: true, reconnecting: false,
              lastEventAt: new Date().toISOString(), revision: parsed.revision
            });
            listener(parsed);
          }
        } catch (e) {}
      };
      events.onerror = function () {
        reportHealth({ status: "reconnecting", connected: false, reconnecting: true });
      };
      var onVisible = function () { if (document.visibilityState === "visible") listener(null); };
      document.addEventListener("visibilitychange", onVisible);
      return function () {
        document.removeEventListener("visibilitychange", onVisible);
        events.close();
        reportHealth({ status: "disconnected", connected: false, reconnecting: false });
      };
    }
  };
}
