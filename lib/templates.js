/**
 * 模板库 — 加载、列举和参数化任务模板
 * 模板文件位于项目 templates/ 目录，YAML frontmatter + Markdown 正文
 * @module autoqueue/templates
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "..", "templates");

// ─── YAML frontmatter 解析（轻量，不引入第三方依赖）─────

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const yaml = match[1];
  const body = match[2];

  const meta = {};
  let currentKey = null;
  let inArray = false;
  let arrayItems = [];

  for (const line of yaml.split("\n")) {
    // 数组项
    const arrayMatch = line.match(/^\s{2}-\s+(.+)$/);
    if (arrayMatch && inArray && currentKey) {
      arrayItems.push(arrayMatch[1]);
      continue;
    }
    // 数组项结束，保存
    if (inArray && currentKey && !arrayMatch) {
      meta[currentKey] = arrayItems;
      inArray = false;
      arrayItems = [];
      currentKey = null;
    }
    // 简单键值对
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*?)\s*$/);
    if (kvMatch) {
      if (inArray && currentKey) {
        meta[currentKey] = arrayItems;
        inArray = false;
        arrayItems = [];
      }
      currentKey = kvMatch[1];
      const value = kvMatch[2];
      if (value === "") {
        // 可能是数组或对象的开始
        inArray = true;
        arrayItems = [];
      } else {
        meta[currentKey] = value.replace(/^["']|["']$/g, "");
        currentKey = null;
      }
    }
  }
  if (inArray && currentKey) {
    meta[currentKey] = arrayItems;
  }

  return { meta, body };
}

function parseParameters(rawParams) {
  if (!Array.isArray(rawParams)) return [];
  return rawParams.map(line => {
    const parts = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (!parts) return null;
    const key = parts[1];
    const value = parts[2];
    const param = { key };
    const labelMatch = value.match(/^"([^"]*)"/);
    const descMatch = value.match(/description:\s*"([^"]*)"/);
    const requiredMatch = value.match(/required:\s*(true|false)/);
    const defaultMatch = value.match(/default:\s*"([^"]*)"/);
    if (labelMatch) param.label = labelMatch[1];
    if (descMatch) param.description = descMatch[1];
    if (requiredMatch) param.required = requiredMatch[1] === "true";
    if (defaultMatch) param.default = defaultMatch[1];
    return param;
  }).filter(Boolean);
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