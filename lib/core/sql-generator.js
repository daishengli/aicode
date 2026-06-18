/**
 * SQL 生成器（规则驱动）
 *
 * 输入：
 *   - schema: { tables: [...] }           表结构（用户/AI 填的）
 *   - sqlRules: 来自 db-design.md 的 frontmatter
 *
 * 输出：
 *   - MySQL DDL 字符串
 *   - PostgreSQL DDL 字符串
 *
 * 戴老板的核心要求：
 *   - 所有 SQL 规则（系统级字段、外键、字符集、引擎）都从 db-design 规则读
 *   - 改 db-design 规则，所有生成都跟着改
 */

const md = require('../utils/markdown');

/**
 * 抽象类型 → MySQL 类型
 */
function toMysqlType(type, len) {
  const map = {
    string: () => `VARCHAR(${len || 255})`,
    text: () => 'TEXT',
    int: () => 'INT',
    long: () => 'BIGINT',
    decimal: () => 'DECIMAL(10,2)',
    datetime: () => 'DATETIME',
    boolean: () => 'TINYINT(1)',
  };
  return (map[type] || map.string)();
}

/**
 * 抽象类型 → PostgreSQL 类型
 */
function toPgType(type, len) {
  const map = {
    string: () => `VARCHAR(${len || 255})`,
    text: () => 'TEXT',
    int: () => 'INTEGER',
    long: () => 'BIGINT',
    decimal: () => 'NUMERIC(10,2)',
    datetime: () => 'TIMESTAMPTZ',
    boolean: () => 'BOOLEAN',
  };
  return (map[type] || map.string)();
}

/**
 * 抽象类型 → OpenAPI schema
 */
function toOpenApiSchema(type, len) {
  const map = {
    string: () => ({ type: 'string', maxLength: len || 255 }),
    text: () => ({ type: 'string' }),
    int: () => ({ type: 'integer' }),
    long: () => ({ type: 'integer', format: 'int64' }),
    decimal: () => ({ type: 'number' }),
    datetime: () => ({ type: 'string', format: 'date-time' }),
    boolean: () => ({ type: 'boolean' }),
  };
  return (map[type] || map.string)();
}

/**
 * 默认 sqlRules（兜底，当 db-design 规则未提供 sqlRules 时使用）
 */
const DEFAULT_SQL_RULES = {
  systemFields: [
    { name: 'id', type: 'BIGINT', autoIncrement: true, comment: '主键' },
    { name: 'version', type: 'INT', default: '0', comment: '乐观锁版本' },
    { name: 'deleted', type: 'TINYINT', default: '0', comment: '逻辑删除：0=未删，1=已删' },
    { name: 'created_by', type: 'VARCHAR(64)', default: '', comment: '创建人' },
    { name: 'created_at', type: 'DATETIME', default: 'CURRENT_TIMESTAMP', comment: '创建时间' },
    { name: 'updated_by', type: 'VARCHAR(64)', default: '', comment: '更新人' },
    { name: 'updated_at', type: 'DATETIME', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', comment: '更新时间' },
  ],
  foreignKey: false,
  charset: 'utf8mb4',
  engine: 'InnoDB',
  naming: { table: 'snake_case_single', field: 'snake_case' },
};

/**
 * 合并 sqlRules（用户规则覆盖默认）
 */
function mergeSqlRules(userRules) {
  return {
    ...DEFAULT_SQL_RULES,
    ...(userRules || {}),
    naming: { ...DEFAULT_SQL_RULES.naming, ...(userRules?.naming || {}) },
  };
}

/**
 * 生成 MySQL DDL
 * @param {Object} schema { title, tables: [{ name, comment, fields: [{ name, type, length, required, default, comment }], uniqueKeys, indexes }] }
 * @param {Object} sqlRules 来自 db-design.md
 * @returns {string}
 */
function generateMysql(schema, sqlRules) {
  const rules = mergeSqlRules(sqlRules);
  const lines = [];
  lines.push('-- ============================================================');
  lines.push(`-- 需求：${schema.title}`);
  lines.push(`-- 数据库：MySQL 8.0+`);
  lines.push(`-- 字符集：${rules.charset}`);
  lines.push(`-- 引擎：${rules.engine}`);
  lines.push(`-- 表名规则：${rules.naming.table}`);
  lines.push(`-- 外键策略：${rules.foreignKey ? '使用外键' : '不使用外键'}`);
  lines.push('-- ============================================================');
  lines.push('');

  for (const t of schema.tables || []) {
    lines.push(...generateMysqlTable(t, rules));
    lines.push('');
  }
  return lines.join('\n');
}

function generateMysqlTable(t, rules) {
  const out = [];
  out.push(`-- 表：${t.name}${t.comment ? ' — ' + t.comment : ''}`);
  out.push('CREATE TABLE `' + t.name + '` (');

  // 系统级字段（从规则读）
  for (const f of rules.systemFields) {
    out.push('  ' + mysqlSystemFieldLine(f));
  }
  // 业务字段
  for (const f of t.fields || []) {
    out.push('  ' + mysqlFieldLine(f));
  }
  out.push('  PRIMARY KEY (`id`)');
  // 唯一键
  for (const uk of t.uniqueKeys || []) {
    out.push(`  UNIQUE KEY \`uk_${t.name}_${uk}\` (\`${uk}\`),`);
  }
  // 普通索引
  for (const idx of t.indexes || []) {
    out.push(`  KEY \`idx_${t.name}_${idx}\` (\`${idx}\`),`);
  }
  const last = out[out.length - 1];
  if (last.endsWith(',')) out[out.length - 1] = last.slice(0, -1);
  out.push(`) ENGINE=${rules.engine} DEFAULT CHARSET=${rules.charset} COMMENT='${(t.comment || t.name).replace(/'/g, "''")}';`);
  return out;
}

function mysqlSystemFieldLine(f) {
  let type = f.type;
  if (f.autoIncrement) {
    // 主键用 BIGINT AUTO_INCREMENT
    type = type === 'BIGINT' ? 'BIGINT       NOT NULL AUTO_INCREMENT' : `${type} NOT NULL AUTO_INCREMENT`;
  } else {
    type = `${type} NOT NULL`;
  }
  let def = '';
  if (f.default !== undefined && f.default !== '') {
    if (f.default === 'CURRENT_TIMESTAMP') {
      def = f.onUpdate ? ` DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` : ' DEFAULT CURRENT_TIMESTAMP';
    } else if (typeof f.default === 'string' && /^\d+$/.test(f.default)) {
      def = ` DEFAULT ${f.default}`;
    } else {
      def = ` DEFAULT '${f.default}'`;
    }
  }
  const comment = f.comment ? ` COMMENT '${f.comment.replace(/'/g, "''")}'` : '';
  return `\`${f.name}\` ${type}${def}${comment},`;
}

function mysqlFieldLine(f) {
  const type = toMysqlType(f.type, f.length);
  const notNull = f.required ? 'NOT NULL' : 'NULL';
  const def = f.default !== undefined && f.default !== '' ? `DEFAULT '${f.default}'` : '';
  return `\`${f.name}\` ${type} ${notNull} ${def} COMMENT '${(f.comment || '').replace(/'/g, "''")}',`;
}

/**
 * 生成 PostgreSQL DDL
 */
function generatePostgres(schema, sqlRules) {
  const rules = mergeSqlRules(sqlRules);
  const lines = [];
  lines.push('-- ============================================================');
  lines.push(`-- 需求：${schema.title}`);
  lines.push('-- 数据库：PostgreSQL 14+');
  lines.push(`-- 外键策略：${rules.foreignKey ? '使用外键' : '不使用外键'}`);
  lines.push('-- ============================================================');
  lines.push('');

  for (const t of schema.tables || []) {
    lines.push(...generatePgTable(t, rules));
    lines.push('');
  }
  return lines.join('\n');
}

function generatePgTable(t, rules) {
  const out = [];
  out.push(`-- 表：${t.name}${t.comment ? ' — ' + t.comment : ''}`);
  out.push(`CREATE TABLE "${t.name}" (`);

  for (const f of rules.systemFields) {
    out.push('  ' + pgSystemFieldLine(f));
  }
  for (const f of t.fields || []) {
    out.push('  ' + pgFieldLine(f));
  }
  for (const uk of t.uniqueKeys || []) {
    out.push(`  CONSTRAINT "uk_${t.name}_${uk}" UNIQUE ("${uk}"),`);
  }
  const last = out[out.length - 1];
  if (last.endsWith(',')) out[out.length - 1] = last.slice(0, -1);
  out.push(');');
  // 注释
  out.push(`COMMENT ON TABLE "${t.name}" IS '${(t.comment || t.name).replace(/'/g, "''")}';`);
  for (const f of t.fields || []) {
    out.push(`COMMENT ON COLUMN "${t.name}"."${f.name}" IS '${(f.comment || '').replace(/'/g, "''")}';`);
  }
  for (const idx of t.indexes || []) {
    out.push(`CREATE INDEX "idx_${t.name}_${idx}" ON "${t.name}" ("${idx}");`);
  }
  return out;
}

function pgSystemFieldLine(f) {
  const typeMap = { BIGINT: 'BIGSERIAL', INT: 'INTEGER', TINYINT: 'SMALLINT', DATETIME: 'TIMESTAMPTZ' };
  const pgType = typeMap[f.type] || f.type;
  let def = '';
  if (f.autoIncrement) {
    def = ' PRIMARY KEY';
  } else if (f.default === 'CURRENT_TIMESTAMP') {
    def = f.onUpdate ? ' NOT NULL DEFAULT NOW()' : ' NOT NULL DEFAULT NOW()';
  } else if (f.default !== undefined && f.default !== '') {
    if (typeof f.default === 'string' && /^\d+$/.test(f.default)) {
      def = ` NOT NULL DEFAULT ${f.default}`;
    } else {
      def = ` NOT NULL DEFAULT '${f.default}'`;
    }
  } else {
    def = ' NOT NULL';
  }
  return `"${f.name}" ${pgType}${def},`;
}

function pgFieldLine(f) {
  const type = toPgType(f.type, f.length);
  const notNull = f.required ? 'NOT NULL' : 'NULL';
  const def = f.default !== undefined && f.default !== '' ? `DEFAULT '${f.default}'` : '';
  return `"${f.name}" ${type} ${notNull} ${def},`;
}

module.exports = {
  generateMysql,
  generatePostgres,
  toOpenApiSchema,
  mergeSqlRules,
  DEFAULT_SQL_RULES,
};
