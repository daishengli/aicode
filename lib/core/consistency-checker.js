/**
 * 自洽性检查器
 *
 * 职责：在生成前检查需求的自洽性
 * - 接口引用 SQL 表/字段
 * - SQL 字段未被接口使用（告警）
 * - 接口路径冲突
 * - SQL 表冲突
 * - 必填字段缺失
 * - 编号冲突
 *
 * 设计原则：纯函数，输入 state（现有 SQL/openapi），返回 issues 列表
 * 每个 issue：{ level: 'error'|'warning', category, message, suggestion }
 */

const path = require('path');
const fsUtil = require('../utils/fs');
const md = require('../utils/markdown');

/**
 * 执行自洽性检查
 * @param {Object} input
 * @param {string} input.projectRoot
 * @param {string} input.code 新需求的编号
 * @param {Array} input.tables 新增/修改的表
 * @param {Array} input.interfaces 新增/修改的接口
 * @returns {Promise<{ issues: Array, sqlIndex, openapiIndex }>}
 */
async function check(input) {
  const { projectRoot, code, tables = [], interfaces = [] } = input;
  const issues = [];

  // 1. 编号冲突
  await checkCodeConflict(projectRoot, code, issues);

  // 2. 加载现有 SQL 索引
  const sqlIndex = await buildSqlIndex(projectRoot);
  // 3. 加载现有 OpenAPI 索引
  const openapiIndex = await buildOpenapiIndex(projectRoot);

  // 4. SQL 表冲突
  for (const t of tables) {
    if (t.op === 'create' && sqlIndex.tables.has(t.name)) {
      issues.push({
        level: 'error',
        category: 'sql-table-conflict',
        message: `表 ${t.name} 已存在于现有 SQL 中`,
        suggestion: `选择 "在原表上加字段" 或 "改名"`,
      });
    }
  }

  // 5. 接口路径冲突
  for (const i of interfaces) {
    if (i.op === 'create' && openapiIndex.paths.has(i.path)) {
      const existing = openapiIndex.paths.get(i.path);
      if (existing.has(i.method.toUpperCase())) {
        issues.push({
          level: 'error',
          category: 'path-conflict',
          message: `接口 ${i.method} ${i.path} 已存在`,
          suggestion: `选择 "覆盖" 或 "改名"`,
        });
      }
    }
  }

  // 6. 接口引用 SQL：检查入参/出参中的字段是否在 SQL 中存在
  for (const i of interfaces) {
    checkInterfaceReferences(i, tables, sqlIndex, issues);
  }

  // 7. SQL 字段未被接口使用（告警）
  for (const t of tables) {
    const usedFieldNames = collectUsedFieldNames(interfaces, t.name);
    for (const f of t.fields || []) {
      if (!usedFieldNames.has(f.name)) {
        issues.push({
          level: 'warning',
          category: 'sql-field-unused',
          message: `表 ${t.name} 的字段 ${f.name} 未被任何接口使用`,
          suggestion: `确认是否真需要此字段，或在接口中补充引用`,
        });
      }
    }
  }

  // 8. 必填字段缺失
  for (const i of interfaces) {
    if (!i.path || !i.method) {
      issues.push({
        level: 'error',
        category: 'missing-field',
        message: `接口缺少 path 或 method`,
      });
    }
  }

  return { issues, sqlIndex, openapiIndex };
}

/**
 * 收集所有接口用到的字段名
 */
function collectUsedFieldNames(interfaces, tableName) {
  const used = new Set();
  for (const i of interfaces) {
    // 业务描述中提及的表名
    if (i.businessDesc && i.businessDesc.includes(tableName)) {
      // 引用了该表，所有字段视为被使用
      // （这里保守处理，不深入匹配字段）
    }
    for (const p of i.parameters || []) if (p.name) used.add(p.name);
    for (const r of i.responseFields || []) if (r.name) used.add(r.name);
  }
  return used;
}

/**
 * 检查接口是否引用了 SQL 中不存在的字段
 */
function checkInterfaceReferences(i, tables, sqlIndex, issues) {
  // 合并新表 + 现有表
  const allTableNames = new Set([...sqlIndex.tables.keys(), ...tables.map((t) => t.name)]);
  for (const p of i.parameters || []) {
    // 简单检查：字段名与 SQL 中字段的相似度
    if (!fieldExistsAnywhere(p.name, allTableNames, sqlIndex, tables)) {
      issues.push({
        level: 'warning',
        category: 'unverified-field',
        message: `接口 ${i.method} ${i.path} 的入参字段 ${p.name} 未在 SQL 中找到对应`,
        suggestion: `确认是否需要补充此字段到 SQL，或标记 TODO`,
      });
    }
  }
}

function fieldExistsAnywhere(fieldName, _tableNames, sqlIndex, newTables) {
  for (const fields of sqlIndex.fields.values()) {
    if (fields.has(fieldName)) return true;
  }
  for (const t of newTables) {
    for (const f of t.fields || []) {
      if (f.name === fieldName) return true;
    }
  }
  return false;
}

/**
 * 构建 SQL 索引
 */
async function buildSqlIndex(projectRoot) {
  const sqlDir = fsUtil.paths(projectRoot).sqlDir;
  const files = await fsUtil.listFiles(sqlDir);
  const tables = new Map(); // name → file
  const fields = new Map(); // fieldName → Set<tableName>

  for (const f of files) {
    if (!f.endsWith('.sql')) continue;
    const text = await fsUtil.readText(path.join(sqlDir, f));
    if (!text) continue;
    // 简单解析：匹配 CREATE TABLE `name` 或 "name"
    const matches = [...text.matchAll(/CREATE TABLE\s+[`"](\w+)[`"]/g)];
    for (const m of matches) {
      const tname = m[1];
      tables.set(tname, f);
      // 简单匹配字段：`fieldname` 或 "fieldname"
      const fieldMatches = [...text.matchAll(/^[ \t]*[`"](\w+)[`"]\s+(?:VARCHAR|INT|BIGINT|TEXT|DECIMAL|NUMERIC|DATETIME|TIMESTAMPTZ|BOOLEAN|TINYINT)/gim)];
      for (const fm of fieldMatches) {
        const fname = fm[1];
        if (!fields.has(fname)) fields.set(fname, new Set());
        fields.get(fname).add(tname);
      }
    }
  }
  return { tables, fields };
}

/**
 * 构建 OpenAPI 索引
 */
async function buildOpenapiIndex(projectRoot) {
  const file = fsUtil.paths(projectRoot).openapiFile;
  const paths = new Map(); // path → Set<method>
  if (!(await fsUtil.exists(file))) return { paths };

  let openapi;
  try {
    openapi = JSON.parse(await fsUtil.readText(file));
  } catch (err) {
    throw new Error(`openapi.json 解析失败：${err.message}。请用 git 回滚或修复后重试。`);
  }

  for (const [p, methods] of Object.entries(openapi.paths || {})) {
    paths.set(p, new Set(Object.keys(methods).map((m) => m.toUpperCase())));
  }
  return { paths, raw: openapi };
}

/**
 * 编号冲突检查
 */
async function checkCodeConflict(projectRoot, code, issues) {
  const p = fsUtil.paths(projectRoot);
  for (const dir of [p.requirementsDir, p.designDir, p.sqlDir]) {
    if (!(await fsUtil.exists(dir))) continue;
    const files = await fsUtil.listFiles(dir);
    if (files.some((f) => f.startsWith(code))) {
      issues.push({
        level: 'error',
        category: 'code-conflict',
        message: `编号 ${code} 在 ${path.basename(dir)} 中已存在`,
        suggestion: `修改需求简述以生成不同编号`,
      });
    }
  }
}

module.exports = { check };
