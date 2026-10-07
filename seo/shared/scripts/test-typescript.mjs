// In-memory test-only transpilation using installed TypeScript, no native binary/build.
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const target = resolve(root, specifier.slice(2));
      for (const suffix of ['', '.ts', '.tsx', '.js']) {
        if (existsSync(target + suffix)) return nextResolve(pathToFileURL(target + suffix).href, context);
      }
    }
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (context.parentURL && /^(\.\.?\/)/.test(specifier)) {
        for (const suffix of ['.ts', '.tsx', '.js']) {
          const url = new URL(specifier + suffix, context.parentURL);
          if (existsSync(fileURLToPath(url))) return nextResolve(url.href, context);
        }
      }
      // Next Link's public CJS entry is needed by pure server-render tests only.
      if (specifier === 'next/link') return nextResolve(pathToFileURL(resolve(root, 'node_modules/next/link.js')).href, context);
      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (url.startsWith(pathToFileURL(resolve(root, 'data')).href + '/') && url.endsWith('.json')) {
      return { format: 'module', source: 'export default ' + readFileSync(fileURLToPath(url), 'utf8') + ';', shortCircuit: true };
    }
    if (url.startsWith('file:') && /\.tsx?$/.test(url)) {
      const filename = fileURLToPath(url);
      const result = ts.transpileModule(readFileSync(filename, 'utf8'), {
        fileName: filename,
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
      });
      return { format: 'module', source: result.outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
