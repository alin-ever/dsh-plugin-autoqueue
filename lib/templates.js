/**
 * 模板库 — 加载、列举和参数化任务模板
 * 模板文件位于项目 templates/ 目录，YAML frontmatter + Markdown 正文
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
          // Collect indented sub-properties
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
      // Check if next line is an array item
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

function parseParameters(rawParams) {
  if (!Array.isArray(rawParams)) return [];
  return rawParams.filter(item => item && typeof item === "object" && item.key);
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
    parameters: parseParameters(meta.parameters || meta.params),
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
        parameters: tpl.parameters,
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

/**
 * 解析模板：用参数值替换占位符
 * @param {string} name - 模板名称
 * @param {Record<string, string>} params - 参数键值对
 * @returns {{ content: string, missing: string[] }}
 */
export function resolveTemplate(name, params = {}) {
  const tpl = getTemplate(name);
  if (!tpl) return null;
  let content = tpl.body;
  const missing = [];
  for (const param of tpl.parameters) {
    const value = params[param.key] ?? param.default ?? "";
    if (!value && param.required) {
      missing.push(param.key);
      continue;
    }
    content = content.replaceAll(`{{${param.key}}}`, value);
  }
  // 清理未替换的占位符
  content = content.replace(/\{\{[\w-]+\}\}/g, "");
  return { content, missing, templateName: tpl.name };
}

// ─── 模板 CRUD ──────────────────────────────────────────

function buildFrontmatter(meta) {
  const lines = ["---"];
  if (meta.name) lines.push("name: " + meta.name);
  if (meta.description) lines.push("description: " + meta.description);
  if (meta.category) lines.push("category: " + meta.category);
  if (meta.parameters && meta.parameters.length) {
    lines.push("parameters:");
    for (const p of meta.parameters) {
      lines.push("  - key: " + (p.key || ""));
      if (p.label) lines.push("    label: " + p.label);
      if (p.description) lines.push("    description: " + p.description);
      if (p.required != null) lines.push("    required: " + (p.required ? "true" : "false"));
      if (p.default != null) lines.push("    default: " + p.default);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function safeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, "_") + ".md";
}

export function createTemplate({ name, description, category, parameters, body }) {
  if (!name || !body) return { ok: false, error: "name 和 body 为必填" };
  const filename = safeFilename(name);
  const filePath = join(TEMPLATES_DIR, filename);
  if (existsSync(filePath)) return { ok: false, error: "模板文件已存在" };
  const frontmatter = buildFrontmatter({ name, description, category, parameters });
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
    parameters: patch.parameters ?? tpl.parameters,
  };
  const body = patch.body ?? tpl.body;
  const filename = safeFilename(meta.name);
  const filePath = join(TEMPLATES_DIR, filename);
  const oldPath = join(TEMPLATES_DIR, safeFilename(name));
  // Remove old file if name changed
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