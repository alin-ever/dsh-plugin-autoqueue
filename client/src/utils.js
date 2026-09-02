export var STATUS_CONFIG = {
  pending: { label: "\u5F85\u6267\u884C", color: "#596579" },
  running: { label: "\u6267\u884C\u4E2D", color: "#175cd3" },
  done: { label: "\u5DF2\u5B8C\u6210", color: "#067647" },
  failed: { label: "\u5DF2\u5931\u8D25", color: "#b42318" },
  stopped: { label: "\u5DF2\u505C\u6B62", color: "#9a6700" },
  interrupted: { label: "\u5DF2\u4E2D\u65AD", color: "#7a5af8" }
};

export var CRON_PRESETS = [
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

export var DEADLINE_PRESETS = [
  { label: "\u4E0D\u914D\u7F6E", value: "" },
  { label: "\u81EA\u5B9A\u4E49", value: "__custom__" },
  { label: "\u6BCF\u5929 09:00", value: "0 9 * * *" },
  { label: "\u6BCF\u5929 21:00", value: "0 21 * * *" },
  { label: "\u6BCF\u5929 23:00", value: "0 23 * * *" },
  { label: "\u5DE5\u4F5C\u65E5 09:00", value: "0 9 * * 1-5" },
  { label: "\u5DE5\u4F5C\u65E5 21:00", value: "0 21 * * 1-5" },
  { label: "\u5DE5\u4F5C\u65E5 23:00", value: "0 23 * * 1-5" }
];

export function timeAgo(iso) {
  if (!iso) return "";
  var d = Date.now() - new Date(iso).getTime();
  var m = Math.floor(d / 6e4);
  if (m < 1) return "\u521A\u521A";
  if (m < 60) return m + " \u5206\u949F\u524D";
  var h = Math.floor(m / 60);
  if (h < 24) return h + " \u5C0F\u65F6\u524D";
  return Math.floor(h / 24) + " \u5929\u524D";
}

export function formatIso(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

export function localDatetimeString(iso) {
  if (!iso) return "";
  var d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  var p = function (n) { return String(n).padStart(2, "0"); };
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

export function taskSummary(body) {
  if (!body) return "";
  return body.split("\n")[0] ? body.split("\n")[0].replace(/^#+\s*/, "").trim() : "";
}

export function cronToHuman(cron) {
  if (!cron) return "";
  var parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  var min = parts[0], hour = parts[1], dom = parts[2], month = parts[3], dow = parts[4];
  var time = hour.padStart(2, "0") + ":" + min.padStart(2, "0");
  if (dom === "*" && month === "*" && dow === "*") return "\u6BCF\u5929 " + time;
  if (dom === "*" && month === "*" && dow === "1-5") return "\u5DE5\u4F5C\u65E5 " + time;
  var DOW_MAP = { 0: "\u65E5", 1: "\u4E00", 2: "\u4E8C", 3: "\u4E09", 4: "\u56DB", 5: "\u4E94", 6: "\u516D" };
  if (dom === "*" && month === "*" && /^\d$/.test(dow) && DOW_MAP[dow]) return "\u6BCF\u5468" + DOW_MAP[dow] + " " + time;
  if (/^\d+$/.test(dom) && month === "*" && dow === "*") return "\u6BCF\u6708" + parseInt(dom, 10) + "\u65E5 " + time;
  if (min.indexOf("*/") === 0) return "\u6BCF" + min.slice(2) + "\u5206\u949F";
  return cron;
}

export function elapseStr(startedAt) {
  if (!startedAt) return "";
  var ms = Date.now() - new Date(startedAt).getTime();
  var s = Math.floor(ms / 1000);
  if (s < 60) return s + "s";
  var m = Math.floor(s / 60);
  if (m < 60) return m + "m " + (s % 60) + "s";
  return Math.floor(m / 60) + "h " + (m % 60) + "m";
}

export function isUnread(task) {
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
  gear: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/></svg>',
  scan: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1.5a6.5 6.5 0 1 1-4.6 1.9"/><polyline points="5.5 1.5 8 1.5 8 4"/></svg>',
  stop: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="2"/></svg>',
  archive: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3.5h12v2H2z"/><path d="M3 5.5v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7"/><line x1="6" y1="8" x2="10" y2="8"/></svg>',
  restore: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.5 4v4h4"/><path d="M3 8.5a6.5 6.5 0 1 0 1.5-5.5"/></svg>',
  trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12"/><path d="M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4"/><path d="M3.5 4l1 9.5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1l1-9.5"/></svg>',
  edit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11.5 1.5l3 3L5 14l-3.5.5L2 11z"/></svg>',
  external: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2h5v5"/><path d="M14 2L8 8"/><path d="M10 9v3.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1H7"/></svg>',
  inbox: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6v6.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6"/><path d="M1.5 2.5l3.5 4.5h6l3.5-4.5"/><path d="M1.5 2.5h13v3.5H9.5L8 8l-1.5-2H1.5z"/></svg>',
  list: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>',
  close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>',
};

export function iconHtml(name) { return ICONS[name] || ""; }

export var TASK_TYPE_LABELS = {
  cron: { label: "\u5FAA\u73AF", icon: "repeat" },
  schedule: { label: "\u5B9A\u65F6", icon: "clock" },
  manual: { label: "\u624B\u52A8", icon: "play" }
};
