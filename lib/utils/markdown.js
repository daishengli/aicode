/**
 * Markdown 工具
 *
 * 职责：解析和生成带 YAML frontmatter 的 Markdown 文件
 * - 解析 frontmatter + body
 * - 序列化为 frontmatter + body
 * - 提供版本号自增、时间戳格式化等小工具
 *
 * 设计原则：纯函数，无副作用
 */

const yaml = require('js-yaml');

/**
 * 解析带 frontmatter 的 Markdown
 * @param {string} text
 * @returns {{ frontmatter: Object, body: string }}
 */
function parse(text) {
  if (!text || !text.startsWith('---')) {
    return { frontmatter: {}, body: text || '' };
  }
  const end = text.indexOf('\n---', 3);
  if (end === -1) {
    // 没有结束标记，当作纯 body
    return { frontmatter: {}, body: text };
  }
  const fmText = text.slice(3, end).trim();
  const body = text.slice(end + 4).replace(/^\n/, '');
  const frontmatter = yaml.load(fmText) || {};
  return { frontmatter, body };
}

/**
 * 序列化为带 frontmatter 的 Markdown
 * @param {Object} frontmatter
 * @param {string} body
 * @returns {string}
 */
function stringify(frontmatter, body) {
  const fmText = yaml.dump(frontmatter, { lineWidth: -1, noRefs: true });
  return `---\n${fmText}---\n\n${body || ''}`;
}

/**
 * 当前时间（ISO 8601，秒级）
 * @returns {string}
 */
function nowIso() {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

/**
 * 当前日期（YYYY-MM-DD）
 * @returns {string}
 */
function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 3 位补零
 * @param {number} n
 * @returns {string}
 */
function pad3(n) {
  return String(n).padStart(3, '0');
}

/**
 * 校验 kebab-case
 * @param {string} s
 * @returns {boolean}
 */
function isKebabCase(s) {
  return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(s);
}

module.exports = {
  parse,
  stringify,
  nowIso,
  todayDate,
  pad3,
  isKebabCase,
};
