/**
 * aicode init 命令
 *
 * 流程：
 *   1. 检测已有 .aicode/ → 询问是否覆盖
 *   2. 询问 hasBackend / hasDatabase
 *   3. 检测已有 git 仓库 → 跳过 init
 *   4. 创建 .aicode/ 目录
 *   5. 拷贝预置规则（按 hasBackend/hasDatabase）
 *   6. 写 config.json
 *   7. 询问追加 .gitignore
 *   8. 提交初始结构
 */

const path = require('path');
const fsUtil = require('../utils/fs');
const configCore = require('../core/config');
const git = require('../core/git-helper');

/**
 * 预置规则选择规则
 */
function pickPresetRules(hasBackend, hasDatabase) {
  const rules = ['code-style.md', 'dictionary-design.md'];
  if (hasBackend) rules.push('api-design.md');
  if (hasDatabase) rules.push('db-design.md');
  if (!hasBackend && !hasDatabase) rules.push('feature-design.md');
  return rules;
}

async function execute(args, options, ctx) {
  const { logger } = ctx;
  const { cwd, force = false, gitignore = true, git: autoGit = true, yes = false } = options;
  const p = fsUtil.paths(cwd);

  // 1. 检查 .aicode/ 是否已存在
  if (await fsUtil.exists(p.aicode)) {
    if (!force && !yes) {
      const ans = await ctx.prompt.confirm('force', '.aicode/ 已存在，是否覆盖？', { default: false });
      if (!ans) {
        logger.error('初始化取消');
        process.exit(1);
      }
    }
    await fsUtil.removeFile(p.aicode);
  }

  // 2. 询问项目类型
  const hasBackend = options.hasBackend !== undefined
    ? options.hasBackend
    : (yes ? true : await ctx.prompt.confirm('hasBackend', '项目是否有服务端（B/S 架构）？', { default: true }));
  const hasDatabase = options.hasDatabase !== undefined
    ? options.hasDatabase
    : (yes ? true : await ctx.prompt.confirm('hasDatabase', '项目是否有数据库？', { default: true }));

  logger.info(`项目类型：hasBackend=${hasBackend}, hasDatabase=${hasDatabase}`);

  // 3. git 集成（已有仓库则跳过）
  if (autoGit) {
    const gitInstalled = await git.isGitInstalled();
    if (!gitInstalled) {
      logger.warn('git 未安装，跳过 git 集成', 'brew install git (macOS) / apt install git (Linux)');
    } else {
      const isRepo = await git.isGitRepo(cwd);
      if (isRepo) {
        logger.info('检测到现有 git 仓库，跳过 git init（顶级规则：项目必须用 git 管理）');
      } else {
        await git.git(['init'], cwd);
        logger.info('已自动执行 git init（顶级规则：项目必须用 git 管理）');
      }
    }
  }

  // 4. 创建目录结构
  await fsUtil.ensureDir(p.rulesDir);
  await fsUtil.ensureDir(p.compiledDir);
  await fsUtil.ensureDir(p.requirementsDir);
  await fsUtil.ensureDir(p.designDir);
  await fsUtil.ensureDir(p.sqlDir);
  await fsUtil.ensureDir(p.openapiDir);
  await fsUtil.ensureDir(path.join(p.docsDir, 'dictionary'));

  // 5. 拷贝预置规则
  const pkgRules = path.join(__dirname, '..', '..', 'templates', 'rules');
  const presetRules = pickPresetRules(hasBackend, hasDatabase);
  if (await fsUtil.exists(pkgRules)) {
    for (const f of presetRules) {
      const src = path.join(pkgRules, f);
      if (await fsUtil.exists(src)) {
        const content = await fsUtil.readText(src);
        await fsUtil.writeText(path.join(p.rulesDir, f), content);
      }
    }
  }
  logger.info(`预置规则：${presetRules.join(', ')}`);

  // 6. 写默认配置（含 project 字段）
  const cfg = configCore.DEFAULT_CONFIG;
  const customConfig = {
    ...JSON.parse(JSON.stringify(cfg)),
    project: { hasBackend, hasDatabase },
  };
  await configCore.write(cwd, customConfig);

  // 7. .gitignore
  if (gitignore) {
    const gi = path.join(cwd, '.gitignore');
    let content = (await fsUtil.readText(gi)) || '';
    const lines = ['.aicode/compiled/', '.aicode/docs/'];
    const additions = lines.filter((l) => !content.includes(l));
    if (additions.length > 0 && (yes || (await confirmGitignore(ctx, additions)))) {
      content += (content.endsWith('\n') ? '' : '\n') + additions.join('\n') + '\n';
      await fsUtil.writeText(gi, content);
      logger.info('已追加 .gitignore');
    }
  }

  // 8. 提交初始结构
  try {
    await git.git(['add', '.aicode/'], cwd);
    if (autoGit && await git.isGitRepo(cwd)) {
      await git.git(['commit', '-m', 'chore: aicode init'], cwd);
      logger.info('已提交初始结构到 git');
    }
  } catch {
    // 静默忽略（无变更或 commit 失败不影响主流程）
  }

  // 9. 输出报告
  logger.success('aicode 初始化完成');
  logger.print(`  ${p.aicode}/`);
  logger.print(`  ├── config.json         (hasBackend=${hasBackend}, hasDatabase=${hasDatabase})`);
  logger.print(`  ├── rules/              (${presetRules.length} 条预置规则)`);
  for (const r of presetRules) logger.print(`  │   └── ${r}`);
  logger.print(`  ├── compiled/`);
  logger.print(`  └── docs/`);
  logger.print(`      ├── requirements/`);
  logger.print(`      ├── design/`);
  logger.print(`      ├── sql/`);
  logger.print(`      ├── openapi/`);
  logger.print(`      └── dictionary/`);
}

async function confirmGitignore(ctx, additions) {
  const ans = await ctx.prompt.confirm('gi', `是否将以下内容追加到 .gitignore？\n  ${additions.join('\n  ')}`, { default: true });
  return ans;
}

module.exports = { execute };
