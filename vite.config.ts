import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

/**
 * Vite plugin: wraps CJS-only packages into proper ESM virtual modules.
 *
 * @react-pdf/renderer's browser builds do bare `import foo from 'base64-js'`
 * (and similar) — expecting a default export that CJS `module.exports` never
 * produces.  Vite's dev server serves node_modules raw without CJS→ESM
 * transformation unless they are pre-bundled via optimizeDeps.  Rather than
 * requiring a server restart each time optimizeDeps changes, this plugin
 * intercepts the import at resolve-time and returns a synthetic ESM module
 * that exposes both named and default exports.
 */
function cjsCompatPlugin(): Plugin {
  // Map: bare specifier → relative path inside node_modules
  const SHIMS: Record<string, string> = {
    'base64-js': 'base64-js/index.js',
  };

  const PREFIX = '\0cjs-shim:';

  return {
    name: 'cjs-compat',
    enforce: 'pre',

    resolveId(id: string) {
      if (id in SHIMS) return PREFIX + id;
      return null;
    },

    load(id: string) {
      if (!id.startsWith(PREFIX)) return null;

      const specifier = id.slice(PREFIX.length);
      const filePath  = path.resolve(__dirname, 'node_modules', SHIMS[specifier]);
      const cjsCode   = fs.readFileSync(filePath, 'utf-8');

      // Discover named exports (exports.foo = ...) to re-export individually.
      const names = [...cjsCode.matchAll(/^exports\.(\w+)\s*=/gm)].map(m => m[1]);
      const named = [...new Set(names)];

      return [
        `// ESM shim for CJS package: ${specifier}`,
        `const module = { exports: {} };`,
        `const exports = module.exports;`,
        `// ---- original CJS source ----`,
        cjsCode.replace(/^'use strict';?\n?/m, ''),
        `// ---- ESM exports ----`,
        `export default module.exports;`,
        ...(named.length ? [`export const { ${named.join(', ')} } = module.exports;`] : []),
      ].join('\n');
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [cjsCompatPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      include: ['@react-pdf/renderer'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
