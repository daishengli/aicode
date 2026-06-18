/**
 * Claude Code 适配器
 *
 * Claude Code 读取项目根目录的 CLAUDE.md
 */

const path = require('path');

module.exports = {
  name: 'claude-code',
  displayName: 'Claude Code',

  /**
   * 检测项目是否在用 Claude Code
   * MVP 阶段：默认 true（不强制依赖 .claude/ 目录）
   */
  detect(projectRoot) {
    return true;
  },

  /**
   * 目标文件路径
   */
  getTargetPath(projectRoot) {
    return path.join(projectRoot, 'CLAUDE.md');
  },

  /**
   * 对编译产物做格式调整（默认原样输出）
   */
  format(compiledMarkdown) {
    return compiledMarkdown;
  },
};
