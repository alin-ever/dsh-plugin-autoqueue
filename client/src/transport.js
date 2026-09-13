var API_PREFIX = "/api/queue";
var REQUEST_TIMEOUT_MS = 30e3;
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

function requestAt(url, init) {
  var start = Date.now();
  var method = (init && init.method) || "GET";
  if (typeof console !== "undefined" && console.log) console.log("[autoqueue] " + method + " " + url + " 开始");

  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.setRequestHeader("Accept", "application/json");
    if (init && init.headers) {
      for (var key in init.headers) {
        if (init.headers.hasOwnProperty(key)) {
          xhr.setRequestHeader(key, init.headers[key]);
        }
      }
    }

    var timeout = setTimeout(function () {
      xhr.abort();
      reject(new Error("请求超时（" + (REQUEST_TIMEOUT_MS / 1000) + "秒），请检查网络连接或刷新页面重试"));
    }, REQUEST_TIMEOUT_MS);

    xhr.onload = function () {
      clearTimeout(timeout);
      if (typeof console !== "undefined" && console.log) console.log("[autoqueue] " + method + " " + url + " 响应 " + xhr.status + "，耗时 " + (Date.now() - start) + "ms");
      var text = xhr.responseText;
      var body = null;
      try { body = text ? JSON.parse(text) : null; }
      catch (e) {
        reject(new Error("HTTP " + xhr.status + " 返回了无效 JSON"));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        reject(new Error((body && body.error) || text || "HTTP " + xhr.status));
      }
    };

    xhr.onerror = function () {
      clearTimeout(timeout);
      if (typeof console !== "undefined" && console.error) console.error("[autoqueue] " + method + " " + url + " 失败，耗时 " + (Date.now() - start) + "ms: 网络错误");
      reject(new Error("网络错误，请检查连接或刷新页面重试"));
    };

    xhr.onabort = function () {
      clearTimeout(timeout);
      if (typeof console !== "undefined" && console.error) console.error("[autoqueue] " + method + " " + url + " 失败，耗时 " + (Date.now() - start) + "ms: 请求已取消");
      reject(new Error("请求已取消"));
    };

    xhr.send(init && init.body ? init.body : null);
  });
}

function request(url, init) {
  return requestAt(API_PREFIX + url, init);
}

export function createTransport() {
  return {
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
      return function () {
        closed = true;
        events.close();
        reportHealth({ status: "disconnected", connected: false, reconnecting: false });
      };
    }
  };
}
