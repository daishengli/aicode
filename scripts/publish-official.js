#!/usr/bin/env node
/**
 * 一键发布到 npm 官方 registry
 *
 * 功能：
 * 1. 临时切换到 npmjs 官方 registry
 * 2. 调 npm publish --access=public（支持 2FA OTP）
 * 3. 无论成功失败，最后切回淘宝镜像
 *
 * 用法：
 *   pnpm run publish:official              # 无 2FA / 走交互式 OTP
 *   OTP=123456 pnpm run publish:official   # 通过环境变量传 OTP
 *
 * 适用：aicode 是 scoped 包（@daishengli1024/aicode），必须加 --access=public
 */

const { execSync } = require('child_process');

const NPMJS_REGISTRY = 'https://registry.npmjs.org/';
const TAOBAO_REGISTRY = 'https://registry.npmmirror.com';

function run(cmd) {
  return execSync(cmd, { stdio: 'inherit' });
}

function setRegistry(url) {
  run(`npm config set registry ${url}`);
}

function publish() {
  const otp = process.env.OTP;
  if (otp) {
    run(`npm publish --access=public --otp=${otp}`);
  } else {
    // 让 npm 自己处理 2FA 交互
    run('npm publish --access=public');
  }
}

function main() {
  setRegistry(NPMJS_REGISTRY);
  let publishFailed = false;
  try {
    publish();
  } catch (err) {
    publishFailed = true;
    console.error('\n✗ 发布失败：', err.message);
  } finally {
    setRegistry(TAOBAO_REGISTRY);
    console.log('\n→ registry 已切回淘宝镜像');
  }
  process.exit(publishFailed ? 1 : 0);
}

main();
