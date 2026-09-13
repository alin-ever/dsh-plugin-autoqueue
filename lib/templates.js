/**
 * 模板库 — 加载、列举和管理任务模板
 * 模板文件位于项目 templates/ 目录，YAML frontmatter + Markdown 正文
 * 模板为即用型纯文案，不带参数占位符；可选携带推荐调度配置
 * @module autoqueue/templates
 */

import { readFileSync, readdirSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "..", "templates");

// ─── YAML frontmatter 解析（轻量，不引入第三方依赖）─────

function getIndent(line) {
  return line.length - line.trimStart().length;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const yaml = match[1];
  const body = match[2];

  const lines = yaml.split("\n").filter(l => l.trim());
  const meta = {};
  let i = 0;

  function parseValue(line) {
    const trimmed = line.trim();
    const kv = trimmed.match(/^(\w[\w-]*):\s*(.*?)\s*$/);
    if (!kv) return null;
    const val = kv[2];
    if (val === "" || val === "|") return { key: kv[1], isContainer: true };
    return { key: kv[1], value: val.replace(/^["']|["']$/g, "") };
  }

  function parseArray(startIdx, baseIndent) {
    const items = [];
    let j = startIdx;
    while (j < lines.length) {
      const line = lines[j];
      const indent = getIndent(line);
      if (indent < baseIndent) break;
      const trimmed = line.trim();
      if (indent === baseIndent && trimmed.startsWith("- ")) {
        const rest = trimmed.slice(2);
        const kv = rest.match(/^(\w[\w-]*):\s*(.*?)\s*$/);
        const obj = {};
        if (kv) {
          if (kv[2] !== "") obj[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
          let k = j + 1;
          while (k < lines.length) {
            const nextIndent = getIndent(lines[k]);
            if (nextIndent <= baseIndent) break;
            const parsed = parseValue(lines[k]);
            if (parsed && !parsed.isContainer) {
              obj[parsed.key] = parsed.value;
            }
            k++;
          }
          j = k;
        } else {
          items.push(rest);
          j++;
        }
        items.push(obj);
      } else {
        j++;
      }
    }
    return { items, nextIdx: j };
  }

  while (i < lines.length) {
    const line = lines[i];
    const indent = getIndent(line);
    const parsed = parseValue(line);
    if (!parsed) { i++; continue; }
    if (parsed.isContainer) {
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.trim().startsWith("- ")) {
        const result = parseArray(i + 1, getIndent(nextLine));
        meta[parsed.key] = result.items;
        i = result.nextIdx;
      } else {
        meta[parsed.key] = "";
        i++;
      }
    } else {
      meta[parsed.key] = parsed.value;
      i++;
    }
  }

  return { meta, body };
}

// ─── 模板加载 ──────────────────────────────────────────

/**
 * 加载单个模板文件，返回解析后的模板对象
 */
function loadTemplate(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const parsed = parseFrontmatter(raw);
  if (!parsed) return null;
  const { meta, body } = parsed;
  return {
    name: meta.name || "",
    description: meta.description || "",
    category: meta.category || "",
    suggestedCron: meta.suggestedCron || meta["suggested-cron"] || "",
    suggestedDeadline: meta.suggestedDeadline || meta["suggested-deadline"] || "",
    suggestedPriority: meta.suggestedPriority || meta["suggested-priority"] || "",
    body,
    raw,
  };
}

/**
 * 列出所有模板（仅元数据，不含正文）
 */
export function listTemplates() {
  if (!existsSync(TEMPLATES_DIR)) return [];
  const files = readdirSync(TEMPLATES_DIR).filter(f => extname(f) === ".md");
  const templates = [];
  for (const file of files) {
    const tpl = loadTemplate(join(TEMPLATES_DIR, file));
    if (tpl) {
      templates.push({
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        suggestedCron: tpl.suggestedCron,
        suggestedDeadline: tpl.suggestedDeadline,
        suggestedPriority: tpl.suggestedPriority,
        file,
      });
    }
  }
  return templates;
}

/**
 * 获取单个模板（含正文），按 name 匹配
 */
export function getTemplate(name) {
  if (!existsSync(TEMPLATES_DIR)) return null;
  const files = readdirSync(TEMPLATES_DIR).filter(f => extname(f) === ".md");
  for (const file of files) {
    const tpl = loadTemplate(join(TEMPLATES_DIR, file));
    if (tpl && tpl.name === name) return tpl;
  }
  return null;
}

// ─── 模板 CRUD ──────────────────────────────────────────

function buildFrontmatter(meta) {
  const lines = ["---"];
  if (meta.name) lines.push("name: " + meta.name);
  if (meta.description) lines.push("description: " + meta.description);
  if (meta.category) lines.push("category: " + meta.category);
  if (meta.suggestedCron) lines.push("suggestedCron: " + meta.suggestedCron);
  if (meta.suggestedDeadline) lines.push("suggestedDeadline: " + meta.suggestedDeadline);
  if (meta.suggestedPriority) lines.push("suggestedPriority: " + meta.suggestedPriority);
  lines.push("---");
  return lines.join("\n");
}

function safeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_") + ".md";
}

export function createTemplate({ name, description, category, suggestedCron, suggestedDeadline, suggestedPriority, body }) {
  if (!name || !body) return { ok: false, error: "name 和 body 为必填" };
  const filename = safeFilename(name);
  const filePath = join(TEMPLATES_DIR, filename);
  if (existsSync(filePath)) return { ok: false, error: "模板文件已存在" };
  const frontmatter = buildFrontmatter({ name, description, category, suggestedCron, suggestedDeadline, suggestedPriority });
  const content = frontmatter + "\n\n" + body;
  writeFileSync(filePath, content, "utf8");
  return { ok: true, name, file: filename };
}

export function updateTemplate(name, patch) {
  if (!name) return { ok: false, error: "name 为必填" };
  const tpl = getTemplate(name);
  if (!tpl) return { ok: false, error: "模板不存在" };
  const meta = {
    name: patch.name ?? tpl.name,
    description: patch.description ?? tpl.description,
    category: patch.category ?? tpl.category,
    suggestedCron: patch.suggestedCron ?? patch["suggested-cron"] ?? tpl.suggestedCron,
    suggestedDeadline: patch.suggestedDeadline ?? patch["suggested-deadline"] ?? tpl.suggestedDeadline,
    suggestedPriority: patch.suggestedPriority ?? patch["suggested-priority"] ?? tpl.suggestedPriority,
  };
  const body = patch.body ?? tpl.body;
  const filename = safeFilename(meta.name);
  const filePath = join(TEMPLATES_DIR, filename);
  const oldPath = join(TEMPLATES_DIR, safeFilename(name));
  if (oldPath !== filePath && existsSync(oldPath)) unlinkSync(oldPath);
  const frontmatter = buildFrontmatter(meta);
  const content = frontmatter + "\n\n" + body;
  writeFileSync(filePath, content, "utf8");
  return { ok: true, name: meta.name };
}

export function deleteTemplate(name) {
  if (!name) return { ok: false, error: "name 为必填" };
  const filename = safeFilename(name);
  const filePath = join(TEMPLATES_DIR, filename);
  if (!existsSync(filePath)) return { ok: false, error: "模板不存在" };
  unlinkSync(filePath);
  return { ok: true };
}
