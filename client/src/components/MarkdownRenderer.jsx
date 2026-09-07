/**
 * 轻量 Markdown → HTML 渲染器
 * 支持：标题、粗体、斜体、代码块、行内代码、无序列表、有序列表、链接、段落、水平线
 */
export function renderMarkdown(text) {
  if (!text) return "";

  var lines = text.split("\n");
  var html = "";
  var inCodeBlock = false;
  var codeBlockContent = "";
  var codeBlockLang = "";
  var inList = false;
  var listType = ""; // "ul" | "ol"

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // 代码块
    if (/^```/.test(line)) {
      if (inCodeBlock) {
        html += "<pre class='aq-mk-pre'><code" + (codeBlockLang ? " class='language-" + escapeHtml(codeBlockLang) + "'" : "") + ">" + codeBlockContent + "</code></pre>\n";
        codeBlockContent = "";
        codeBlockLang = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent += (codeBlockContent ? "\n" : "") + line;
      continue;
    }

    // 关闭列表
    if (inList && !/^(\s*[-*+]\s|\s*\d+\.\s)/.test(line) && line.trim() !== "") {
      html += "</" + listType + ">\n";
      inList = false;
    }

    // 无序列表
    var ulMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) html += "</" + listType + ">\n";
        html += "<ul class='aq-mk-ul'>\n";
        inList = true;
        listType = "ul";
      }
      html += "<li>" + inlineMarkdown(ulMatch[2]) + "</li>\n";
      continue;
    }

    // 有序列表
    var olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) html += "</" + listType + ">\n";
        html += "<ol class='aq-mk-ol'>\n";
        inList = true;
        listType = "ol";
      }
      html += "<li>" + inlineMarkdown(olMatch[3]) + "</li>\n";
      continue;
    }

    // 空行
    if (line.trim() === "") {
      if (inList) { html += "</" + listType + ">\n"; inList = false; }
      continue;
    }

    // 标题
    var headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      var level = headingMatch[1].length;
      html += "<h" + level + " class='aq-mk-h" + level + "'>" + inlineMarkdown(headingMatch[2]) + "</h" + level + ">\n";
      continue;
    }

    // 水平线
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      html += "<hr class='aq-mk-hr' />\n";
      continue;
    }

    // 引用块
    var blockquoteMatch = line.match(/^>\s*(.*)/);
    if (blockquoteMatch) {
      html += "<blockquote class='aq-mk-blockquote'><p>" + inlineMarkdown(blockquoteMatch[1]) + "</p></blockquote>\n";
      continue;
    }

    // 普通段落
    html += "<p class='aq-mk-p'>" + inlineMarkdown(line) + "</p>\n";
  }

  if (inCodeBlock) {
    html += "<pre class='aq-mk-pre'><code" + (codeBlockLang ? " class='language-" + escapeHtml(codeBlockLang) + "'" : "") + ">" + codeBlockContent + "</code></pre>\n";
  }
  if (inList) {
    html += "</" + listType + ">\n";
  }

  return html;
}

function inlineMarkdown(text) {
  if (!text) return "";
  // 行内代码
  text = text.replace(/`([^`]+)`/g, "<code class='aq-mk-code'>$1</code>");
  // 粗体
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // 斜体
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // 链接
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a class='aq-mk-a' href='$2' target='_blank' rel='noopener'>$1</a>");
  return text;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}