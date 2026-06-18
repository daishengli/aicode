/**
 * 文档生成器
 *
 * 输入：用户填的需求 + 结构化数据
 * 输出：markdown 文档
 *
 * 文档类型：
 *   - 需求文档（requirements）
 *   - 功能设计文档（feature design）
 *   - 接口设计文档（api design，按 apiRules）
 *   - 数据库设计文档（db design，按 sqlRules）
 *   - 字典（dictionary）
 */

const md = require('../utils/markdown');

/**
 * 生成需求文档
 * @param {Object} input
 * @param {string} input.code
 * @param {string} input.title
 * @param {string} input.author
 * @param {string} input.projectName
 * @param {string} input.background
 * @param {string} input.targetUsers
 * @param {string} input.coreScenarios
 * @param {Array} input.functionalRequirements
 * @param {Array} input.nonFunctionalRequirements
 * @param {string} input.constraints
 * @param {string} input.acceptance
 */
function generateRequirement(input) {
  const sections = [];
  sections.push(`# 需求文档：${input.title}`);
  sections.push('');
  sections.push(`> 编号：${input.code}  `);
  sections.push(`> 创建时间：${md.nowIso()}  `);
  sections.push(`> 作者：${input.author || 'unknown'}  `);
  sections.push(`> 项目：${input.projectName || 'unknown'}`);
  sections.push('');
  sections.push('## 1. 项目背景');
  sections.push(input.background || '_（待补充）_');
  sections.push('');
  sections.push('## 2. 目标用户 / 核心场景');
  sections.push(input.targetUsers || '_（待补充）_');
  sections.push('');
  sections.push('### 2.1 核心场景');
  sections.push(input.coreScenarios || '_（待补充）_');
  sections.push('');

  sections.push('## 3. 功能需求');
  sections.push('| ID | 功能 | 描述 | 优先级 |');
  sections.push('|---|---|---|---|');
  if (input.functionalRequirements?.length) {
    for (const f of input.functionalRequirements) {
      sections.push(`| ${f.id} | ${f.name} | ${f.description || ''} | ${f.priority || 'P0'} |`);
    }
  } else {
    sections.push('| FR-1 | _（待补充）_ | _（待补充）_ | P0 |');
  }
  sections.push('');

  sections.push('## 4. 非功能需求');
  sections.push('| ID | 描述 |');
  sections.push('|---|---|');
  if (input.nonFunctionalRequirements?.length) {
    for (const f of input.nonFunctionalRequirements) {
      sections.push(`| ${f.id} | ${f.description || ''} |`);
    }
  } else {
    sections.push('| NFR-1 | _（待补充）_ |');
  }
  sections.push('');

  sections.push('## 5. 约束');
  sections.push(input.constraints || '_（待补充）_');
  sections.push('');

  sections.push('## 6. 验收标准');
  sections.push(input.acceptance || '_（待补充）_');
  sections.push('');

  sections.push('## 7. 风险与缓解');
  sections.push('_（待补充）_');
  return sections.join('\n');
}

/**
 * 生成功能设计文档
 */
function generateFeatureDesign(input) {
  const sections = [];
  sections.push(`# 功能设计：${input.title}`);
  sections.push('');
  sections.push(`> 编号：${input.code}  `);
  sections.push(`> 关联需求：${input.code}  `);
  sections.push(`> 创建时间：${md.nowIso()}`);
  sections.push('');

  sections.push('## 1. 功能概述');
  sections.push(input.featureOverview || '_（待补充）_');
  sections.push('');

  sections.push('## 2. 功能点列表');
  sections.push('| ID | 功能名 | 业务描述 | 优先级 |');
  sections.push('|---|---|---|---|');
  if (input.features?.length) {
    for (const f of input.features) {
      sections.push(`| ${f.id} | ${f.name} | ${f.description || ''} | ${f.priority || 'P0'} |`);
    }
  } else {
    sections.push('| F-1 | _（待补充）_ | _（待补充）_ | P0 |');
  }
  sections.push('');

  // 每个功能的详情
  for (const f of input.features || []) {
    sections.push(`## 3.${input.features.indexOf(f) + 1} ${f.name || '_（待补充）_'}`);
    sections.push(`**业务描述**：${f.description || '_（待补充）_'}`);
    sections.push('');
    if (f.input) {
      sections.push('**入参**：');
      sections.push('| 名称 | 类型 | 必填 | 说明 |');
      sections.push('|---|---|---|---|');
      sections.push(f.input);
      sections.push('');
    }
    if (f.output) {
      sections.push('**出参**：');
      sections.push('| 名称 | 类型 | 说明 |');
      sections.push('|---|---|---|');
      sections.push(f.output);
      sections.push('');
    }
    if (f.acceptance) {
      sections.push('**验收标准**：');
      sections.push(f.acceptance);
      sections.push('');
    }
  }

  sections.push('## 4. 验收标准汇总');
  sections.push(input.acceptance || '_（待补充）_');
  return sections.join('\n');
}

/**
 * 生成接口设计文档
 */
function generateApiDesign(input, apiRules) {
  const sections = [];
  sections.push(`# 接口设计：${input.title}`);
  sections.push('');
  sections.push(`> 编号：${input.code}  `);
  sections.push(`> 关联需求：${input.code}  `);
  sections.push(`> 创建时间：${md.nowIso()}`);
  sections.push('');

  sections.push('## 1. 接口清单');
  sections.push('| 路径 | 方法 | 业务描述 |');
  sections.push('|---|---|---|');
  if (input.interfaces?.length) {
    for (const i of input.interfaces) {
      sections.push(`| ${i.path} | ${i.method.toUpperCase()} | ${i.description || '_（待补充）_'} |`);
    }
  } else {
    sections.push(`| ${apiRules?.pathPrefix || '/api/v1'}/_ | _（待补充）_ | _（待补充）_ |`);
  }
  sections.push('');

  // 响应包装
  sections.push('## 2. 响应包装');
  sections.push('所有接口统一返回：');
  sections.push('```json');
  sections.push('{');
  sections.push('  "code": 0,');
  sections.push('  "message": "success",');
  sections.push('  "data": { /* 业务数据 */ }');
  sections.push('}');
  sections.push('```');
  sections.push('');

  // 错误码
  sections.push('## 3. 错误码');
  sections.push('| 错误码 | 含义 |');
  sections.push('|---|---|');
  for (const ec of apiRules?.errorCodes || []) {
    sections.push(`| ${ec.code} | ${ec.message} |`);
  }
  sections.push('');

  // 接口详情
  sections.push('## 4. 接口详情');
  for (const i of input.interfaces || []) {
    sections.push(`### 4.${(input.interfaces.indexOf(i) + 1)} ${i.method.toUpperCase()} ${i.path}`);
    sections.push(`**业务描述**：${i.description || '_（待补充）_'}`);
    sections.push('');
    if (i.parameters) {
      sections.push('**入参**：');
      sections.push('| 名称 | 位置 | 类型 | 必填 | 说明 |');
      sections.push('|---|---|---|---|---|');
      sections.push(i.parameters);
      sections.push('');
    }
    if (i.responseFields) {
      sections.push('**出参**（data 字段）：');
      sections.push('| 名称 | 类型 | 说明 |');
      sections.push('|---|---|---|');
      sections.push(i.responseFields);
      sections.push('');
    }
  }
  return sections.join('\n');
}

/**
 * 生成数据库设计文档
 */
function generateDbDesign(input, sqlRules) {
  const sections = [];
  sections.push(`# 数据库设计：${input.title}`);
  sections.push('');
  sections.push(`> 编号：${input.code}  `);
  sections.push(`> 关联需求：${input.code}  `);
  sections.push(`> 创建时间：${md.nowIso()}`);
  sections.push('');

  sections.push('## 1. 表清单');
  sections.push('| 表名 | 业务说明 |');
  sections.push('|---|---|');
  if (input.tables?.length) {
    for (const t of input.tables) {
      sections.push(`| ${t.name} | ${t.comment || '_（待补充）_'} |`);
    }
  } else {
    sections.push('| _（待补充）_ |  |');
  }
  sections.push('');

  sections.push('## 2. 系统级字段');
  sections.push('每张表必须包含以下字段（顺序固定）：');
  sections.push('');
  sections.push('| 字段 | 类型 | 默认值 | 说明 |');
  sections.push('|---|---|---|---|');
  for (const f of sqlRules?.systemFields || []) {
    sections.push(`| \`${f.name}\` | ${f.type} | ${f.default || ''} | ${f.comment || ''} |`);
  }
  sections.push('');

  sections.push('## 3. 字段命名规范');
  sections.push(`- 表名：${sqlRules?.naming?.table || 'snake_case_single'}（单数形式）`);
  sections.push(`- 字段名：${sqlRules?.naming?.field || 'snake_case'}`);
  sections.push(`- 字符集：${sqlRules?.charset || 'utf8mb4'}`);
  sections.push(`- 引擎：${sqlRules?.engine || 'InnoDB'}`);
  sections.push(`- 外键策略：${sqlRules?.foreignKey ? '使用外键' : '不使用外键（推荐）'}`);
  sections.push('');

  // 每张表的字段明细
  sections.push('## 4. 表字段明细');
  for (const t of input.tables || []) {
    sections.push(`### 4.${(input.tables.indexOf(t) + 1)} 表 \`${t.name}\``);
    sections.push(`**业务说明**：${t.comment || '_（待补充）_'}`);
    sections.push('');
    sections.push('| 字段 | 类型 | 必填 | 默认值 | 说明 |');
    sections.push('|---|---|---|---|---|');
    for (const f of sqlRules?.systemFields || []) {
      sections.push(`| \`${f.name}\` | ${f.type} | ✓ | ${f.default || ''} | ${f.comment || ''} |`);
    }
    if (t.fields?.length) {
      for (const f of t.fields) {
        sections.push(`| \`${f.name}\` | ${f.type}${f.length ? '(' + f.length + ')' : ''} | ${f.required ? '✓' : ''} | ${f.default || ''} | ${f.comment || ''} |`);
      }
    } else {
      sections.push(`| _（待补充）_ |  |  |  |  |`);
    }
    sections.push('');

    if (t.uniqueKeys?.length) {
      sections.push('**唯一键**：`' + t.uniqueKeys.join('`, `') + '`');
      sections.push('');
    }
    if (t.indexes?.length) {
      sections.push('**普通索引**：`' + t.indexes.join('`, `') + '`');
      sections.push('');
    }
  }

  sections.push('## 5. 索引命名');
  sections.push('- 唯一键：`uk_<table>_<field>`');
  sections.push('- 普通索引：`idx_<table>_<field>`');
  sections.push('- 主键：`PRIMARY KEY`（固定名 `id`）');
  return sections.join('\n');
}

/**
 * 生成字典文档（追加到 .aicode/docs/dictionary.md）
 */
function generateDictionaryEntry(name, values) {
  const lines = [];
  lines.push(`## ${name.name}（${name.zhName || name.name}）`);
  lines.push('');
  lines.push('| 值 | 名称 | 说明 |');
  lines.push('|---|---|---|');
  for (const v of values) {
    lines.push(`| ${v.value} | ${v.label} | ${v.description || ''} |`);
  }
  lines.push('');
  return lines.join('\n');
}

module.exports = {
  generateRequirement,
  generateFeatureDesign,
  generateApiDesign,
  generateDbDesign,
  generateDictionaryEntry,
};
