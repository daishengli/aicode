/**
 * aicode rule list 命令
 */

const ruleStore = require('../../core/rule-store');

async function execute(args, options, ctx) {
  const { logger } = ctx;
  const { cwd, category, enabled, disabled, json } = options;
  let rules = await ruleStore.list(cwd);

  if (category) rules = rules.filter((r) => r.frontmatter.category === category);
  if (enabled) rules = rules.filter((r) => r.frontmatter.enabled);
  if (disabled) rules = rules.filter((r) => !r.frontmatter.enabled);

  if (rules.length === 0) {
    logger.warn('暂无规则', 'aicode rule add 添加');
    return;
  }

  if (json) {
    logger.print(JSON.stringify(rules.map((r) => r.frontmatter), null, 2));
    return;
  }

  const rows = [['NAME', 'CATEGORY', 'ENABLED', 'VERSION', 'TARGETS', 'DESCRIPTION']];
  for (const r of rules) {
    const f = r.frontmatter;
    rows.push([
      f.name,
      f.category || '',
      f.enabled ? '✓' : '✗',
      String(f.version || 1),
      (f.targets || []).join(','),
      f.description || '',
    ]);
  }
  logger.table(rows);
}

module.exports = { execute };
