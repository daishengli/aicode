/**
 * 配置管理
 *
 * 职责：读写 .aicode/config.json，提供默认值
 * - 不存在时返回默认配置
 * - 已存在时按需合并（保留用户自定义的字段）
 *
 * 设计原则：所有方法接收 projectRoot 作为参数，无全局状态
 */

const fsUtil = require('../utils/fs');

/**
 * 深度冻结对象（防止外部意外修改默认配置）
 * @param {Object} obj
 * @returns {Object}
 */
function deepFreeze(obj) {
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Object.isFrozen(obj[key])) {
      deepFreeze(obj[key]);
    }
  }
  return Object.freeze(obj);
}

/**
 * 默认配置（深度冻结，不可变）
 */
const DEFAULT_CONFIG = deepFreeze({
  version: '0.1.0',
  tools: {
    'claude-code': { enabled: true, target: 'CLAUDE.md' },
    codex: { enabled: true, target: 'AGENTS.md' },
    opencode: { enabled: true, target: 'AGENTS.md' },
  },
  ruleCategories: ['backend', 'frontend', 'general', 'custom'],
  compiledDir: '.aicode/compiled',
  docsDir: '.aicode/docs',
  systemFields: {
    deleted: 'TINYINT(1) NOT NULL DEFAULT 0',
    version: 'INT NOT NULL DEFAULT 0',
    createdBy: "VARCHAR(64) NOT NULL DEFAULT ''",
    createdAt: 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    updatedBy: "VARCHAR(64) NOT NULL DEFAULT ''",
    updatedAt: 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  },
});

/**
 * 读取配置（不存在返回 null）
 * @param {string} projectRoot
 * @returns {Promise<Object|null>}
 */
async function read(projectRoot) {
  return fsUtil.readJson(fsUtil.paths(projectRoot).config);
}

/**
 * 读取配置（不存在时返回默认配置）
 * @param {string} projectRoot
 * @returns {Promise<Object>}
 */
async function readOrDefault(projectRoot) {
  const cfg = await read(projectRoot);
  return cfg || deepClone(DEFAULT_CONFIG);
}

/**
 * 写入配置
 * @param {string} projectRoot
 * @param {Object} config
 */
async function write(projectRoot, config) {
  await fsUtil.writeJson(fsUtil.paths(projectRoot).config, config);
}

/**
 * 写入默认配置
 * @param {string} projectRoot
 */
async function writeDefault(projectRoot) {
  await write(projectRoot, deepClone(DEFAULT_CONFIG));
}

/**
 * 深度克隆（避免外部修改污染默认值）
 * @param {Object} obj
 * @returns {Object}
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  DEFAULT_CONFIG,
  read,
  readOrDefault,
  write,
  writeDefault,
};
