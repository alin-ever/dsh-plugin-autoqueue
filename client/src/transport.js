var API_PREFIX = "/api/queue";
var REQUEST_TIMEOUT_MS = 15e3;
var SSE_MAX_RETRIES = 5;
var SSE_RETRY_BASE_MS = 2000;
var SSE_RETRY_MAX_MS = 30000;

function randomUUID() {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
}

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
        body: JSON.stringify({ requestId: randomUUID(), action: action })
      });
    },
    listTemplates: function () { return request("/templates"); },
    getTemplate: function (name) { return request("/templates?name=" + encodeURIComponent(name)); },
    resolveTemplate: function (name, params) {
      return request("/templates/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: name, params: params || {} }) });
    },
    createTemplate: function (data) {
      return request("/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    },
    updateTemplate: function (name, data) {
      return request("/templates?name=" + encodeURIComponent(name), { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
    },
    deleteTemplate: function (name) {
      return request("/templates?name=" + encodeURIComponent(name), { method: "DELETE" });
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
      var retryCount = 0;
      var retryDelay = SSE_RETRY_BASE_MS;
      var closed = false;
      var reportHealth = function (patch) {
        health = Object.assign({}, health, patch || {});
        if (typeof healthListener === "function") healthListener(health);
      };
      reportHealth();
      events.onopen = function () {
        retryCount = 0;
        retryDelay = SSE_RETRY_BASE_MS;
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
        } catch (e) {
          if (typeof console !== "undefined" && console.warn) console.warn("autoqueue SSE parse error:", e);
        }
      };
      events.onerror = function () {
        events.close();
        if (closed) return;
        if (retryCount >= SSE_MAX_RETRIES) {
          reportHealth({ status: "permanent-failure", connected: false, reconnecting: false });
          return;
        }
        retryCount++;
        reportHealth({ status: "reconnecting", connected: false, reconnecting: true });
        setTimeout(function () {
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
      var onVisible = function () { if (document.visibilityState === "visible") listener(null); };
      document.addEventListener("visibilitychange", onVisible);
      return function () {
        closed = true;
        document.removeEventListener("visibilitychange", onVisible);
        events.close();
        reportHealth({ status: "disconnected", connected: false, reconnecting: false });
      };
    }
  };
}
