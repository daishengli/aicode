/**
 * AI 工具注册表
 *
 * 职责：管理 AI 工具适配器（claude-code、codex、opencode）
 * - 加载所有内置适配器
 * - 提供按名称获取适配器的接口
 * - 列出所有可用工具
 *
 * 设计原则：插件式，新增工具只需在 lib/adapters/ 加一个文件并注册
 */

const claudeCode = require('../adapters/claude-code');
const codex = require('../adapters/codex');
const opencode = require('../adapters/opencode');

const ADAPTERS = [claudeCode, codex, opencode];

/**
 * 列出所有适配器
 * @returns {Array}
 */
function list() {
  return ADAPTERS.slice();
}

/**
 * 按 name 获取适配器
 * @param {string} name
 * @returns {Object|null}
 */
function get(name) {
  return ADAPTERS.find((a) => a.name === name) || null;
}

module.exports = { list, get };
