import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Each build has an id, written into the bundle and into /version.json, so an
 * open panel can tell when a newer one has been published (owner, 27 Oct
 * 2026: a cached panel kept showing the old Sugerencias over the new
 * database functions).
 */
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const BUILD_ID = env['GITHUB_SHA']?.slice(0, 12) ?? `build-${Date.now()}`;

function versionFile(): Plugin {
  return {
    name: 'natus-version-file',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionFile()],
  base: '/',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
});
