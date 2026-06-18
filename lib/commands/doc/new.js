/**
 * aicode doc new 命令
 *
 * 5 阶段：
 *   1. 多轮交互收集需求（5-8 轮）
 *   2. 自洽性检查（与已有需求比对）
 *   3. 生成需求文档
 *   4. 生成设计文档（功能/接口/数据库/字典）
 *   5. 顺便生成 SQL + OpenAPI
 */

const path = require('path');
const fsUtil = require('../../utils/fs');
const md = require('../../utils/markdown');
const git = require('../../core/git-helper');
const configCore = require('../../core/config');
const docGen = require('../../core/doc-generator');
const sqlGen = require('../../core/sql-generator');
const openapiGen = require('../../core/openapi-generator');

/**
 * 读规则文件
 */
async function loadRule(projectRoot, name) {
  const ruleFile = path.join(fsUtil.paths(projectRoot).rulesDir, `${name}.md`);
  if (!(await fsUtil.exists(ruleFile))) return null;
  const text = await fsUtil.readText(ruleFile);
  const { frontmatter } = md.parse(text);
  return frontmatter;
}

async function execute(args, options, ctx) {
  const { logger, prompt } = ctx;
  const { cwd, project, author, yes, commit, noCommit } = options;

  // ===== 准备 =====
  const p = fsUtil.paths(cwd);
  if (!(await fsUtil.exists(p.aicode))) {
    logger.error('.aicode/ 未初始化', 'aicode init');
    process.exit(3);
  }

  const config = await configCore.readOrDefault(cwd);
  const projectName = project || path.basename(cwd);
  const userName = author || git.currentUser();
  const { hasBackend = true, hasDatabase = true } = config.project || {};

  logger.info(`项目类型：hasBackend=${hasBackend}, hasDatabase=${hasDatabase}`);

  // 读规则
  const dbRule = hasDatabase ? await loadRule(cwd, 'db-design') : null;
  const apiRule = hasBackend ? await loadRule(cwd, 'api-design') : null;
  const sqlRules = dbRule?.sqlRules;
  const apiRules = apiRule?.apiRules;

  // ===== Stage 1: 多轮交互收集需求 =====
  const title = (typeof args === 'string' ? args : args.title) || (yes ? 'TODO' : await prompt.input('title', '需求简述（中文）'));

  logger.info('=== Stage 1: 收集需求 ===');
  const background = await prompt.input('background', '需求背景（多行）', { default: 'TODO' });
  const targetUsers = await prompt.input('targetUsers', '目标用户 / 角色', { default: 'TODO' });
  const coreScenarios = await prompt.input('coreScenarios', '核心场景', { default: 'TODO' });

  // 功能需求（多轮）
  const functionalRequirements = [];
  let addFunc = yes ? true : await prompt.confirm('addFunc', '添加功能需求？', { default: true });
  let funcIdx = 0;
  while (addFunc) {
    funcIdx++;
    const name = await prompt.input('funcName', `功能 ${funcIdx} 名称`);
    const description = await prompt.input('funcDesc', `功能 ${funcIdx} 描述`);
    const priority = await prompt.list('funcPrio', '优先级', ['P0', 'P1', 'P2'], { default: 'P0' });
    functionalRequirements.push({ id: `FR-${funcIdx}`, name, description, priority });
    addFunc = yes ? false : await prompt.confirm('moreFunc', '继续添加？', { default: false });
  }

  const nonFunctionalRequirements = [];
  let addNfr = yes ? false : await prompt.confirm('addNfr', '添加非功能需求？', { default: false });
  let nfrIdx = 0;
  while (addNfr) {
    nfrIdx++;
    const description = await prompt.input('nfrDesc', `非功能需求 ${nfrIdx}`);
    nonFunctionalRequirements.push({ id: `NFR-${nfrIdx}`, description });
    addNfr = await prompt.confirm('moreNfr', '继续添加？', { default: false });
  }

  const constraints = await prompt.input('constraints', '约束条件', { default: '无' });
  const acceptance = await prompt.input('acceptance', '验收标准', { default: 'TODO' });

  // ===== Stage 2: 自洽性检查 =====
  logger.info('=== Stage 2: 自洽性检查 ===');
  const conflicts = await checkConsistency(cwd, title, logger, prompt, yes);
  if (conflicts && conflicts.hasBlocker) {
    logger.error('自洽性检查发现阻塞性冲突', '请处理后重试');
    process.exit(5);
  }

  // ===== 生成编号 =====
  const code = await generateCode(cwd, title, logger);
  logger.info(`生成编号：${code}`);

  // ===== Stage 3: 生成需求文档 =====
  logger.info('=== Stage 3: 生成需求文档 ===');
  const reqContent = docGen.generateRequirement({
    code, title, author: userName, projectName,
    background, targetUsers, coreScenarios,
    functionalRequirements, nonFunctionalRequirements,
    constraints, acceptance,
  });
  const reqFile = path.join(p.requirementsDir, `${code}-${title}.md`);
  await fsUtil.writeText(reqFile, reqContent);
  logger.print(`  ✓ 需求文档: ${reqFile}`);

  // ===== Stage 4: 生成设计文档 =====
  logger.info('=== Stage 4: 生成设计文档 ===');

  // 4.1 功能设计文档
  const featuresFromReq = functionalRequirements.map((f) => ({
    id: f.id, name: f.name, description: f.description, priority: f.priority,
    input: '_（待补充）_', output: '_（待补充）_', acceptance: '_（待补充）_',
  }));
  const featureContent = docGen.generateFeatureDesign({
    code, title, features: featuresFromReq, acceptance,
  });
  const featureFile = path.join(p.designDir, `${code}-${title}-feature.md`);
  await fsUtil.writeText(featureFile, featureContent);
  logger.print(`  ✓ 功能设计: ${featureFile}`);

  // 4.2 接口设计文档（如有 hasBackend）
  let interfaces = [];
  if (hasBackend) {
    // 用户填接口（多轮）
    let addIface = yes ? false : await prompt.confirm('addIface', '添加接口？', { default: true });
    while (addIface) {
      const pathStr = await prompt.input('ifacePath', `接口路径（不加 ${apiRules?.pathPrefix || '/api/v1'} 前缀）`);
      const method = (await prompt.list('ifaceMethod', '方法', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])).toLowerCase();
      const description = await prompt.input('ifaceDesc', '业务描述（操作哪张表，做啥）');
      const parameters = await prompt.input('ifaceParams', '入参 markdown 表格（直接粘贴）', { default: '_（待补充）_' });
      const responseFields = await prompt.input('ifaceResp', '出参 markdown 表格（直接粘贴）', { default: '_（待补充）_' });
      interfaces.push({ path: pathStr, method, description, parameters, responseFields });
      addIface = await prompt.confirm('moreIface', '继续添加？', { default: false });
    }

    const apiDesignContent = docGen.generateApiDesign({ code, title, interfaces }, apiRules);
    const apiDesignFile = path.join(p.designDir, `${code}-${title}-api.md`);
    await fsUtil.writeText(apiDesignFile, apiDesignContent);
    logger.print(`  ✓ 接口设计: ${apiDesignFile}`);
  }

  // 4.3 数据库设计文档（如有 hasDatabase）
  let tables = [];
  if (hasDatabase) {
    let addTable = yes ? false : await prompt.confirm('addTable', '添加数据库表？', { default: true });
    while (addTable) {
      const name = await prompt.input('tableName', '表名（snake_case，单数）');
      const comment = await prompt.input('tableComment', '业务说明', { default: '' });
      const fieldsRaw = await prompt.input('tableFields', '业务字段（markdown 表格，3-5 行示例）', { default: '| username | string | ✓ |  | 用户名 |\n| email | string |  |  | 邮箱 |' });
      const fields = parseFieldsTable(fieldsRaw);
      const uniqueKeysRaw = await prompt.input('tableUK', '唯一键字段（逗号分隔）', { default: '' });
      const indexesRaw = await prompt.input('tableIdx', '索引字段（逗号分隔）', { default: '' });
      tables.push({
        name, comment, fields,
        uniqueKeys: uniqueKeysRaw ? uniqueKeysRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
        indexes: indexesRaw ? indexesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
      addTable = await prompt.confirm('moreTable', '继续添加？', { default: false });
    }

    const dbDesignContent = docGen.generateDbDesign({ code, title, tables }, sqlRules);
    const dbDesignFile = path.join(p.designDir, `${code}-${title}-db.md`);
    await fsUtil.writeText(dbDesignFile, dbDesignContent);
    logger.print(`  ✓ 数据库设计: ${dbDesignFile}`);
  }

  // 4.4 字典（如有字典需求）
  let dictionaryEntries = [];
  let addDict = hasDatabase && (yes ? false : await prompt.confirm('addDict', '添加字典（枚举）？', { default: false }));
  while (addDict) {
    const name = await prompt.input('dictName', '字典名（snake_case）');
    const zhName = await prompt.input('dictZhName', '字典中文名', { default: name });
    const valuesRaw = await prompt.input('dictValues', '字典值（每行一个：值,名称,说明）', { default: '0,待付款,订单创建后未支付\n1,已付款,用户完成支付' });
    const values = valuesRaw.split('\n').map((line) => {
      const [value, label, description] = line.split(',').map((s) => s.trim());
      return { value, label, description: description || '' };
    }).filter((v) => v.value);
    dictionaryEntries.push({ name, zhName, values });
    addDict = await prompt.confirm('moreDict', '继续添加字典？', { default: false });
  }
  if (dictionaryEntries.length > 0) {
    await appendDictionary(p.docsDir, dictionaryEntries);
    logger.print(`  ✓ 字典已追加到: ${path.join(p.docsDir, 'dictionary.md')}`);
  }

  // ===== Stage 5: 生成 SQL + OpenAPI =====
  logger.info('=== Stage 5: 生成 SQL + OpenAPI ===');
  const generatedFiles = [reqFile, featureFile];

  if (hasDatabase && tables.length > 0) {
    const schema = { title: `${code} ${title}`, tables };
    const mysqlContent = sqlGen.generateMysql(schema, sqlRules);
    const pgContent = sqlGen.generatePostgres(schema, sqlRules);
    const mysqlFile = path.join(p.sqlDir, `${code}-${title}.mysql.sql`);
    const pgFile = path.join(p.sqlDir, `${code}-${title}.postgresql.sql`);
    await fsUtil.writeText(mysqlFile, mysqlContent);
    await fsUtil.writeText(pgFile, pgContent);
    generatedFiles.push(mysqlFile, pgFile);
    logger.print(`  ✓ MySQL:  ${mysqlFile}`);
    logger.print(`  ✓ PG:     ${pgFile}`);
  }

  if (hasBackend) {
    const openapiFile = p.openapiFile;
    let existing = null;
    if (await fsUtil.exists(openapiFile)) {
      try {
        existing = JSON.parse(await fsUtil.readText(openapiFile));
      } catch {
        logger.warn('openapi.json 解析失败，将覆盖');
      }
    }
    const schemas = {};
    for (const t of tables) {
      schemas[t.name.charAt(0).toUpperCase() + t.name.slice(1)] = buildOpenApiSchema(t, sqlRules);
    }
    const newOpenapi = openapiGen.mergeOpenApi(existing, {
      info: { projectName },
      paths: interfaces,
      components: { schemas },
    }, apiRules);
    await fsUtil.writeText(openapiFile, JSON.stringify(newOpenapi, null, 2));
    generatedFiles.push(openapiFile);
    const oldCount = existing ? Object.keys(existing.paths || {}).length : 0;
    const newCount = Object.keys(newOpenapi.paths || {}).length;
    logger.print(`  ✓ OpenAPI: ${openapiFile} (${oldCount} → ${newCount} paths)`);
  }

  // ===== git 提交提示 =====
  if (!noCommit && await git.isGitRepo(cwd)) {
    const message = `${code} ${title}`;
    let shouldCommit = commit === true;
    if (commit === undefined) {
      shouldCommit = await prompt.confirm('commit', `是否 git add + commit 本次生成的文档？\n  建议 message: ${message}`, { default: true });
    }
    if (shouldCommit) {
      try {
        const relFiles = generatedFiles.map((f) => path.relative(cwd, f));
        const { hash } = await git.commitFiles(cwd, relFiles, message);
        logger.success(`已提交 (${hash})`);
      } catch (err) {
        logger.warn('git commit 失败', `手动执行 git commit。错误: ${err.message}`);
      }
    } else {
      logger.warn('跳过 git 提交');
    }
  }

  logger.print('');
  logger.success(`✓ 需求 ${code} ${title} 已完成`);
  logger.print('接下来：');
  logger.print('  1. 在 .aicode/docs/design/ 下编辑生成的设计文档');
  logger.print('  2. 用 AI 工具（或手动）填具体字段、接口');
  logger.print('  3. 用 aicode doctor 检查项目状态');
}

// ===== 辅助函数 =====

async function generateCode(cwd, title, logger) {
  const today = md.todayDate();
  const p = fsUtil.paths(cwd);
  let maxN = 0;
  for (const dir of [p.requirementsDir, p.designDir, p.sqlDir]) {
    if (!(await fsUtil.exists(dir))) continue;
    const files = await fsUtil.listFiles(dir);
    for (const f of files) {
      const m = f.match(new RegExp(`^${today}-(\\d{3})-`));
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxN) maxN = n;
      }
    }
  }
  return `${today}-${md.pad3(maxN + 1)}`;
}

async function checkConsistency(cwd, title, logger, prompt, yes) {
  const p = fsUtil.paths(cwd);
  const result = { hasBlocker: false };

  // 读已有需求
  if (!(await fsUtil.exists(p.requirementsDir))) return result;
  const existing = await fsUtil.listFiles(p.requirementsDir);
  if (existing.length === 0) {
    logger.info('  ✓ 首个需求，无历史可比对');
    return result;
  }

  // 命名冲突（同名 title）
  const today = md.todayDate();
  const conflicts = [];
  for (const f of existing) {
    if (f.toLowerCase().includes(title.toLowerCase())) {
      conflicts.push(`文件名相似：${f}`);
    }
  }

  if (conflicts.length === 0) {
    logger.info(`  ✓ 与 ${existing.length} 个历史需求比对，无冲突`);
    return result;
  }

  logger.warn(`发现 ${conflicts.length} 个潜在冲突：`);
  for (const c of conflicts) logger.print(`    - ${c}`);

  if (yes) {
    result.hasBlocker = true;
    return result;
  }

  const ans = await prompt.list('handle', '如何处理？', [
    { name: '继续生成（接受冲突）', value: 'continue' },
    { name: '修改需求简述', value: 'rename' },
    { name: '取消', value: 'cancel' },
  ]);
  if (ans === 'cancel') {
    logger.info('已取消');
    process.exit(0);
  } else if (ans === 'rename') {
    result.hasBlocker = true;
    logger.error('请修改需求简述后重试');
  }
  return result;
}

function parseFieldsTable(mdTable) {
  // 解析 markdown 表格为对象数组
  if (!mdTable || !mdTable.includes('|')) return [];
  const lines = mdTable.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|') && !l.match(/^\|[\s-:|]+\|$/));
  return lines.map((line) => {
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) return null;
    return {
      name: cells[0] || '',
      type: cells[1] || 'string',
      required: cells[2] === '✓' || cells[2] === 'Y' || cells[2] === 'y',
      default: cells[3] || '',
      comment: cells[4] || '',
    };
  }).filter(Boolean);
}

function buildOpenApiSchema(table, sqlRules) {
  const properties = {};
  const required = [];
  for (const f of sqlRules?.systemFields || []) {
    properties[f.name] = { type: mapFieldToOpenApiType(f.type), description: f.comment || '' };
    if (f.name === 'id' || f.name === 'created_at') required.push(f.name);
  }
  for (const f of table.fields || []) {
    properties[f.name] = sqlGen.toOpenApiSchema(f.type, f.length);
    if (f.comment) properties[f.name].description = f.comment;
    if (f.required) required.push(f.name);
  }
  return { type: 'object', required, properties };
}

function mapFieldToOpenApiType(type) {
  const map = { BIGINT: 'integer', INT: 'integer', TINYINT: 'integer', DATETIME: 'string' };
  return map[type] || 'string';
}

async function appendDictionary(docsDir, entries) {
  const dictFile = path.join(docsDir, 'dictionary.md');
  let existing = '';
  if (await fsUtil.exists(dictFile)) {
    existing = await fsUtil.readText(dictFile) || '';
    if (!existing.endsWith('\n')) existing += '\n';
  } else {
    existing = '# 字典\n\n';
  }
  for (const entry of entries) {
    const newSection = docGen.generateDictionaryEntry(entry, entry.values);
    // 检查是否已存在
    if (existing.includes(`## ${entry.name}（`)) {
      // 替换
      const re = new RegExp(`## ${entry.name}（[^）]+）[\\s\\S]*?(?=\\n## |$)`, 'm');
      existing = existing.replace(re, newSection.trim() + '\n\n');
    } else {
      existing += '\n' + newSection;
    }
  }
  await fsUtil.writeText(dictFile, existing);
}

module.exports = { execute };
