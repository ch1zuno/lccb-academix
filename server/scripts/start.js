/* Run vite dev server and the API server together. */
import { spawn } from 'node:child_process';

const processes = [
  spawn('npx', ['vite'], { stdio: 'inherit', shell: true }),
  spawn('node', ['server/index.js'], { stdio: 'inherit', shell: true }),
];
processes.forEach(p => p.on('exit', c => process.exit(c)));
process.on('SIGINT', () => { processes.forEach(p => p.kill()); process.exit(); });
