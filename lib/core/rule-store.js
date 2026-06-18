/**
 * 规则存储
 *
 * 职责：管理 .aicode/rules/*.md 的 CRUD
 * - list：列出所有规则
 * - get：按 name 获取单条
 * - create：新建
 * - update：更新（version 自增，updatedBy/updatedAt 刷新）
 * - remove：物理删除
 * - setEnabled：启用/禁用
 *
 * 设计原则：所有操作返回 Rule 对象（含 frontmatter + body），不感知 CLI/UI
 */

const path = require('path');
const fsUtil = require('../utils/fs');
const md = require('../utils/markdown');
const git = require('./git-helper');

/**
 * 读取所有规则
 * @param {string} projectRoot
 * @returns {Promise<Array<{ name, frontmatter, body, file }>>}
 */
async function list(projectRoot) {
  const dir = fsUtil.paths(projectRoot).rulesDir;
  const files = await fsUtil.listFiles(dir);
  const rules = [];
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const file = path.join(dir, f);
    const text = await fsUtil.readText(file);
    if (!text) continue;
    const { frontmatter, body } = md.parse(text);
    if (!frontmatter.name) continue;
    rules.push({ name: frontmatter.name, frontmatter, body, file });
  }
  return rules;
}

/**
 * 按 name 读取单条规则
 * @param {string} projectRoot
 * @param {string} name
 * @returns {Promise<Object|null>}
 */
async function get(projectRoot, name) {
  const all = await list(projectRoot);
  return all.find((r) => r.name === name) || null;
}

/**
 * 创建规则
 * @param {string} projectRoot
 * @param {Object} param0
 * @param {string} param0.name
 * @param {string} param0.category
 * @param {string} param0.description
 * @param {string[]} param0.targets
 * @param {string} param0.body
 * @returns {Promise<{ file: string }>}
 */
async function create(projectRoot, { name, category, description, targets, body }) {
  const now = md.nowIso();
  const user = git.currentUser();
  const frontmatter = {
    name,
    category,
    enabled: true,
    targets,
    description: description || '',
    version: 1,
    deleted: false,
    createdBy: user,
    createdAt: now,
    updatedBy: user,
    updatedAt: now,
  };
  const file = path.join(fsUtil.paths(projectRoot).rulesDir, `${name}.md`);
  await fsUtil.writeText(file, md.stringify(frontmatter, body || ''));
  return { file };
}

/**
 * 更新规则（version 自增，updatedBy/updatedAt 刷新）
 * @param {string} projectRoot
 * @param {string} name
 * @param {Object} patch frontmatter 字段更新
 * @param {string} [newBody] 新的 body
 * @returns {Promise<{ file: string, version: number }>}
 */
async function update(projectRoot, name, patch = {}, newBody) {
  const rule = await get(projectRoot, name);
  if (!rule) return null;
  const newFm = {
    ...rule.frontmatter,
    ...patch,
    version: (rule.frontmatter.version || 0) + 1,
    updatedBy: git.currentUser(),
    updatedAt: md.nowIso(),
  };
  const body = newBody !== undefined ? newBody : rule.body;
  await fsUtil.writeText(rule.file, md.stringify(newFm, body));
  return { file: rule.file, version: newFm.version };
}

/**
 * 设置 enabled
 * @param {string} projectRoot
 * @param {string} name
 * @param {boolean} enabled
 */
async function setEnabled(projectRoot, name, enabled) {
  return update(projectRoot, name, { enabled });
}

/**
 * 删除规则
 * @param {string} projectRoot
 * @param {string} name
 */
async function remove(projectRoot, name) {
  const rule = await get(projectRoot, name);
  if (!rule) return false;
  await fsUtil.removeFile(rule.file);
  return true;
}

module.exports = {
  list,
  get,
  create,
  update,
  setEnabled,
  remove,
};
