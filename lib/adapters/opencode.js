/**
 * OpenCode 适配器
 *
 * OpenCode 读取项目根目录的 AGENTS.md（与 codex 同名）
 *
 * 注意：claude-code 写 CLAUDE.md，codex 和 opencode 都写 AGENTS.md。
 * aicode sync 会先备份再写，所以两个工具的产物一致。
 */

const path = require('path');

module.exports = {
  name: 'opencode',
  displayName: 'OpenCode',

  detect(projectRoot) {
    return true;
  },

  getTargetPath(projectRoot) {
    return path.join(projectRoot, 'AGENTS.md');
  },

  format(compiledMarkdown) {
    return compiledMarkdown;
  },
};
