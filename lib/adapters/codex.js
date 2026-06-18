/**
 * OpenAI Codex 适配器
 *
 * Codex 读取项目根目录的 AGENTS.md
 */

const path = require('path');

module.exports = {
  name: 'codex',
  displayName: 'Codex',

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
