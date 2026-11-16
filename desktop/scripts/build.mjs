// Builds the desktop app into dist/: the main process, the preload, the core (the server) and the client.
// `--dev` skips the client and runs Electron against Vite's dev server instead, on the "Spade Dev" data folder.
import { spawn, spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import electron from 'electron';
import { build } from 'esbuild';

const dev = process.argv.includes('--dev');
process.chdir(path.resolve(import.meta.dirname, '..'));

const common = { bundle: true, platform: 'node', target: 'node24', format: 'cjs', sourcemap: dev, logLevel: 'warning' };
await Promise.all([
  build({ ...common, entryPoints: ['src/main/index.ts'], outfile: 'dist/main.cjs', external: ['electron'] }),
  build({ ...common, entryPoints: ['src/preload/index.ts'], outfile: 'dist/preload.cjs', external: ['electron'] }),
  // better-sqlite3 stays outside the bundle: it loads a native file from its own folder.
  build({ ...common, entryPoints: ['../server/src/core.ts'], outfile: 'dist/core.cjs', external: ['better-sqlite3'] }),
]);

if (!dev) {
  const { status } = spawnSync('npm', ['run', 'build', '-w', 'client', '--', '--outDir', '../desktop/dist/client', '--emptyOutDir'], { cwd: '..', stdio: 'inherit' });
  process.exit(status ?? 1);
}

// A free port for the API, picked up front because Vite's proxy and the core both need to know it.
const port = await new Promise((resolve) => {
  const probe = net.createServer().listen(0, '127.0.0.1', () => {
    const { port } = probe.address();
    probe.close(() => resolve(port));
  });
});
const url = 'http://localhost:5174'; // not 5173, so `npm run dev` can run beside it
const env = { ...process.env, API_PORT: String(port), SPADE_PORT: String(port), SPADE_DEV_URL: url };
const vite = spawn('npm', ['run', 'dev', '-w', 'client', '--', '--port', '5174', '--strictPort'], { cwd: '..', env, stdio: 'inherit' });
vite.on('exit', (code) => process.exit(code ?? 1));
for (;;) {
  if (await fetch(url).then((res) => res.ok, () => false)) break;
  await new Promise((resolve) => setTimeout(resolve, 200));
}
spawn(electron, ['.'], { env, stdio: 'inherit' }).on('exit', (code) => {
  vite.kill();
  process.exit(code ?? 0);
});
