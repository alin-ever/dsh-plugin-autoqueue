export var STATUS_CONFIG = {
  pending: { label: "待执行", color: "#596579" },
  running: { label: "执行中", color: "#175cd3" },
  done: { label: "已完成", color: "#067647" },
  failed: { label: "已失败", color: "#b42318" },
  stopped: { label: "已停止", color: "#9a6700" },
  interrupted: { label: "已中断", color: "#7a5af8" }
};

export var CRON_PRESETS = [
  { label: "不配置", value: "" },
  { label: "自定义", value: "__custom__" },
  { label: "每天 08:00", value: "0 8 * * *" },
  { label: "每天 20:00", value: "0 20 * * *" },
  { label: "工作日 08:00", value: "0 8 * * 1-5" },
  { label: "工作日 20:00", value: "0 20 * * 1-5" },
  { label: "每 30 分钟", value: "*/30 * * * *" },
  { label: "每小时", value: "0 * * * *" },
  { label: "每周一 08:00", value: "0 8 * * 1" },
  { label: "每月 1 日 08:00", value: "0 8 1 * *" }
];

export var DEADLINE_PRESETS = [
  { label: "不配置", value: "" },
  { label: "自定义", value: "__custom__" },
  { label: "每天 09:00", value: "0 9 * * *" },
  { label: "每天 21:00", value: "0 21 * * *" },
  { label: "每天 23:00", value: "0 23 * * *" },
  { label: "工作日 09:00", value: "0 9 * * 1-5" },
  { label: "工作日 21:00", value: "0 21 * * 1-5" },
  { label: "工作日 23:00", value: "0 23 * * 1-5" }
];

export function timeAgo(iso) {
  if (!iso) return "";
  var d = Date.now() - new Date(iso).getTime();
  var m = Math.floor(d / 6e4);
  if (m < 1) return "刚刚";
  if (m < 60) return m + " 分钟前";
  var h = Math.floor(m / 60);
  if (h < 24) return h + " 小时前";
  return Math.floor(h / 24) + " 天前";
}

export function formatIso(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

export function taskSummary(body) {
  if (!body) return "";
  var text = body;
  if (/^---\r?\n/.test(text)) {
    var end = text.indexOf("\n---\n", 3);
    if (end >= 0) text = text.substring(end + 4);
  }
  return text.split("\n")[0] ? text.split("\n")[0].replace(/^#+\s*/, "").trim() : "";
}

export function cronToHuman(cron) {
  if (!cron) return "";
  var parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  var min = parts[0], hour = parts[1], dom = parts[2], month = parts[3], dow = parts[4];

  var hasComma = min.indexOf(",") >= 0 || hour.indexOf(",") >= 0 || dom.indexOf(",") >= 0 || dow.indexOf(",") >= 0;
  var hasRange = min.indexOf("-") >= 0 || hour.indexOf("-") >= 0 || dom.indexOf("-") >= 0 || dow.indexOf("-") >= 0;
  if (hasComma || hasRange) return cron;

  // Every minute: * * * * *
  if (min === "*" && hour === "*" && dom === "*" && month === "*" && dow === "*") return "每分钟";

  // Every N minutes: */N * * * *
  if (min.indexOf("*/") === 0 && hour === "*" && dom === "*" && month === "*" && dow === "*") return "每" + min.slice(2) + "分钟";

  // Every N hours: 0 */N * * *
  if (min === "0" && hour.indexOf("*/") === 0 && dom === "*" && month === "*" && dow === "*") return "每" + hour.slice(2) + "小时";

  var time = (hour !== "*" ? hour.padStart(2, "0") : "*") + ":" + (min !== "*" ? min.padStart(2, "0") : "*");
  if (dom === "*" && month === "*" && dow === "*") {
    if (hour === "*") return "每小时" + min.padStart(2, "0") + "分";
    if (min === "*") return "每天" + hour.padStart(2, "0") + ":00";
    return "每天 " + time;
  }
  if (dom === "*" && month === "*" && dow === "1-5") return "工作日 " + time;
  var DOW_MAP = { 0: "日", 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六" };
  if (dom === "*" && month === "*" && /^\d$/.test(dow) && DOW_MAP[dow]) return "每周" + DOW_MAP[dow] + " " + time;
  if (/^\d+$/.test(dom) && month === "*" && dow === "*") return "每月" + parseInt(dom, 10) + "日 " + time;
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
  close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>',
};

export function iconHtml(name) { return ICONS[name] || ""; }

export var TASK_TYPE_LABELS = {
  cron: { label: "循环", icon: "repeat" },
  manual: { label: "手动", icon: "play" }
};
