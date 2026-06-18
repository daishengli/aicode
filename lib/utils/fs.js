/**
 * 文件操作工具
 *
 * 职责：在 fs-extra 之上做一层语义化封装
 * - 路径解析（基于 projectRoot）
 * - JSON / Markdown 读写
 * - 目录确保存在
 *
 * 设计原则：所有路径以 projectRoot 为基准，工具函数无副作用（写入类操作返回结果，由调用方决定）
 */

const path = require('path');
const fs = require('fs-extra');

/**
 * 路径辅助
 * @param {string} projectRoot 项目根目录
 */
function paths(projectRoot) {
  return {
    root: projectRoot,
    aicode: path.join(projectRoot, '.aicode'),
    config: path.join(projectRoot, '.aicode', 'config.json'),
    rulesDir: path.join(projectRoot, '.aicode', 'rules'),
    compiledDir: path.join(projectRoot, '.aicode', 'compiled'),
    templatesDir: path.join(projectRoot, '.aicode', 'templates'),
    docsDir: path.join(projectRoot, '.aicode', 'docs'),
    requirementsDir: path.join(projectRoot, '.aicode', 'docs', 'requirements'),
    designDir: path.join(projectRoot, '.aicode', 'docs', 'design'),
    sqlDir: path.join(projectRoot, '.aicode', 'docs', 'sql'),
    openapiDir: path.join(projectRoot, '.aicode', 'docs', 'openapi'),
    openapiFile: path.join(projectRoot, '.aicode', 'docs', 'openapi', 'openapi.json'),
  };
}

/**
 * 确保目录存在（递归创建）
 * @param {string} dir
 */
async function ensureDir(dir) {
  await fs.ensureDir(dir);
}

/**
 * 检查文件是否存在
 * @param {string} file
 * @returns {Promise<boolean>}
 */
async function exists(file) {
  return fs.pathExists(file);
}

/**
 * 读取 JSON 文件
 * @param {string} file
 * @returns {Promise<Object|null>} 不存在返回 null
 */
async function readJson(file) {
  if (!(await exists(file))) return null;
  return fs.readJson(file);
}

/**
 * 写入 JSON 文件（带格式化）
 * @param {string} file
 * @param {Object} data
 */
async function writeJson(file, data) {
  await fs.outputJson(file, data, { spaces: 2 });
}

/**
 * 读取文本文件
 * @param {string} file
 * @returns {Promise<string|null>}
 */
async function readText(file) {
  if (!(await exists(file))) return null;
  return fs.readFile(file, 'utf8');
}

/**
 * 写入文本文件（自动创建目录）
 * @param {string} file
 * @param {string} content
 */
async function writeText(file, content) {
  await fs.outputFile(file, content, 'utf8');
}

/**
 * 列出目录下所有文件（仅一层）
 * @param {string} dir
 * @returns {Promise<string[]>} 文件名列表（不含路径）
 */
async function listFiles(dir) {
  if (!(await exists(dir))) return [];
  const items = await fs.readdir(dir);
  return items.filter((f) => !f.startsWith('.'));
}

/**
 * 物理删除文件
 * @param {string} file
 */
async function removeFile(file) {
  if (await exists(file)) await fs.remove(file);
}

/**
 * 备份文件：<file> → <file>.bak.<timestamp>
 * @param {string} file
 * @returns {Promise<string|null>} 备份文件路径，未备份返回 null
 */
async function backupFile(file) {
  if (!(await exists(file))) return null;
  const ts = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14); // YYYYMMDDHHMMSS
  const backup = `${file}.bak.${ts}`;
  await fs.copy(file, backup);
  return backup;
}

module.exports = {
  paths,
  ensureDir,
  exists,
  readJson,
  writeJson,
  readText,
  writeText,
  listFiles,
  removeFile,
  backupFile,
};
