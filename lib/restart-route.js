/**
 * autoqueue 重启路由 — 独立于核心层
 * 从 dshmarket 移植的自重启机制
 * @module autoqueue/restart-route
 */
import { scheduleRestart } from "./restart.js";

/**
 * 注册 POST /api/queue/restart
 * @param {import('@deepseek-ai/cordis').Context} ctx
 * @param {object} security - { allowedHosts, token }
 * @param {function} jsonReply - JSON 响应辅助
 * @param {function} authorizeRequest - 鉴权辅助
 * @returns {function} disposer
 */
export function registerRestartRoute(ctx, security, jsonReply, authorizeRequest) {
  return ctx.webServer.register({
    kind: "exact",
    path: "/api/queue/restart",
    handler: (req, res) => {
      if (req.method !== "POST") {
        res.writeHead(405, { allow: "POST" });
        res.end();
        return;
      }
      if (!authorizeRequest(req, res, security)) return;
      const address = req.socket?.remoteAddress;
      if (address !== "127.0.0.1" && address !== "::1" && address !== "::ffff:127.0.0.1") {
        jsonReply(res, 403, { error: "重启仅限本机 loopback 请求" });
        return;
      }
      try {
        const port = (() => {
          const host = req.headers.host;
          if (!host) return null;
          const match = /:(\d{1,5})$/.exec(host);
          if (!match) return null;
          const p = Number(match[1]);
          return Number.isInteger(p) && p > 0 && p < 65536 ? p : null;
        })();
        const result = scheduleRestart(port);
        jsonReply(res, 202, { ok: true, ...result });
      } catch (err) {
        jsonReply(res, 500, { error: err.message });
      }
    },
  });
}