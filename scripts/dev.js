'use strict';

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', ' 🚀 Starting Garuda-Rakshak Full-Stack (Backend + Frontend)...');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════════════════\n');

function runService(name, colorCode, cwd, args) {
  const proc = spawn(npmCmd, args, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  const prefix = `\x1b[${colorCode}m[${name}]\x1b[0m `;

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split(/\r?\n/);
    lines.forEach((line) => {
      if (line.trim().length > 0) {
        console.log(`${prefix}${line}`);
      }
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split(/\r?\n/);
    lines.forEach((line) => {
      if (line.trim().length > 0) {
        console.error(`${prefix}\x1b[31m${line}\x1b[0m`);
      }
    });
  });

  proc.on('close', (code) => {
    console.log(`${prefix}Process exited with code ${code}`);
  });

  return proc;
}

const backendProc = runService('BACKEND', '33', path.join(ROOT, 'backend'), ['run', 'dev']);
const frontendProc = runService('FRONTEND', '36', path.join(ROOT, 'frontend'), ['run', 'dev']);

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down services...');
  try {
    if (isWin) {
      if (backendProc.pid) spawn('taskkill', ['/pid', backendProc.pid.toString(), '/T', '/F']);
      if (frontendProc.pid) spawn('taskkill', ['/pid', frontendProc.pid.toString(), '/T', '/F']);
    } else {
      backendProc.kill('SIGINT');
      frontendProc.kill('SIGINT');
    }
  } catch (e) {
    // ignore
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
