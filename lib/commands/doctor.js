/**
 * aicode doctor 命令
 *
 * 环境检查：Node 版本、git、.aicode/、规则文件、目标文件、openapi.json
 */

const fsUtil = require('../utils/fs');
const configCore = require('../core/config');
const ruleStore = require('../core/rule-store');
const git = require('../core/git-helper');
const toolRegistry = require('../core/tool-registry');

async function execute(args, options, ctx) {
  const { logger } = ctx;
  const { cwd, json } = options;
  const checks = [];

  // 1. Node 版本
  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  checks.push({
    name: 'Node 版本',
    ok: nodeMajor >= 18,
    detail: `v${process.versions.node} (>= 18)`,
    suggestion: nodeMajor < 18 ? '升级 Node 或使用 nvm' : null,
  });

  // 2. git 安装
  const gitInstalled = await git.isGitInstalled();
  let isRepo = false;
  if (gitInstalled) {
    isRepo = await git.isGitRepo(cwd);
  }
  checks.push({
    name: 'git',
    ok: gitInstalled,
    detail: gitInstalled ? (isRepo ? '已安装 + 当前是 git 仓库' : '已安装 + 当前不是 git 仓库') : '未安装',
    suggestion: !gitInstalled ? 'brew install git (macOS) / apt install git (Linux)' : !isRepo ? 'aicode init（自动 git init）' : null,
  });

  // 3. .aicode/ 已初始化
  const initialized = await fsUtil.exists(fsUtil.paths(cwd).aicode);
  checks.push({
    name: '.aicode/ 已初始化',
    ok: initialized,
    detail: initialized ? '是' : '否',
    suggestion: !initialized ? 'aicode init' : null,
  });

  if (!initialized) {
    return output(logger, checks, json);
  }

  // 4. config.json
  const cfg = await configCore.readOrDefault(cwd);
  checks.push({
    name: 'config.json',
    ok: true,
    detail: `version: ${cfg.version}`,
  });

  // 5. 规则文件
  const rules = await ruleStore.list(cwd);
  const enabledCount = rules.filter((r) => r.frontmatter.enabled).length;
  checks.push({
    name: '规则文件',
    ok: true,
    detail: `${rules.length} 条（${enabledCount} 启用 / ${rules.length - enabledCount} 禁用）`,
  });

  // 6. AI 工具目标文件
  for (const adapter of toolRegistry.list()) {
    const target = adapter.getTargetPath(cwd);
    const exists = await fsUtil.exists(target);
    checks.push({
      name: `${adapter.displayName} 规则文件`,
      ok: exists,
      detail: exists ? `${target}（已存在）` : `${target}（未生成）`,
      suggestion: !exists ? 'aicode sync 同步' : null,
    });
  }

  // 7. openapi.json
  const openapiFile = fsUtil.paths(cwd).openapiFile;
  if (await fsUtil.exists(openapiFile)) {
    try {
      const text = await fsUtil.readText(openapiFile);
      const obj = JSON.parse(text);
      const pathCount = Object.keys(obj.paths || {}).length;
      checks.push({
        name: 'openapi.json',
        ok: true,
        detail: `解析成功（${pathCount} 个 path）`,
      });
    } catch (err) {
      checks.push({
        name: 'openapi.json',
        ok: false,
        detail: '解析失败',
        suggestion: `删除后重新生成，或用 git 回滚。错误: ${err.message}`,
      });
    }
  }

  output(logger, checks, json);
}

function output(logger, checks, json) {
  if (json) {
    logger.print(JSON.stringify(checks, null, 2));
    return;
  }

  let allOk = true;
  for (const c of checks) {
    const mark = c.ok ? logger._colors.green('✓') : logger._colors.red('✗');
    const line = `${mark} ${c.name}: ${c.detail}`;
    logger.print(line);
    if (!c.ok) allOk = false;
    if (c.suggestion) logger.print(`  → 建议：${c.suggestion}`);
  }
  logger.print('');
  if (allOk) {
    logger.success('环境就绪');
  } else {
    logger.error('环境有问题，请按上述建议修复');
    process.exit(1);
  }
}

module.exports = { execute };
