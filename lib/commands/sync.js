/**
 * aicode sync 命令
 */

const syncEngine = require('../core/sync-engine');

async function execute(args, options, ctx) {
  const { logger } = ctx;
  const { cwd, tool, dryRun, backup } = options;
  // 注意：commander 给 --tool 的默认值是 []，空数组应视为"未指定"
  const tools = tool && tool.length > 0 ? (Array.isArray(tool) ? tool : tool.split(',')) : null;

  const { results } = await syncEngine.sync(cwd, { tools, dryRun, backup: backup !== false });

  if (dryRun) {
    logger.info('（预览模式，未写文件）');
  }

  if (results.length === 0) {
    logger.warn('没有启用的工具', '检查 .aicode/config.json 中 tools 配置');
    return;
  }

  logger.print('');
  for (const r of results) {
    const status = r.status === 'preview' ? '[预览]' : r.status === 'ok' ? '✓' : '✗';
    const line = `  ${r.tool.padEnd(12)} → ${r.target} (${r.ruleCount} 条规则) ${status}`;
    if (r.status === 'ok') logger.print(logger._colors.green(line));
    else logger.print(line);
    if (r.backup) logger.print(`    备份: ${r.backup}`);
  }
  logger.print('');
  logger.success(dryRun ? '预览完成' : '同步完成');
}

module.exports = { execute };
