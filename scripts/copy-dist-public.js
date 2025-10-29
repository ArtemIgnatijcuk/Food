import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..', 'dist', 'public');
const dstDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(srcDir)) {
  console.log('No compiled public found at', srcDir);
  process.exit(0);
}

try {
  const files = fs.readdirSync(srcDir);
  files.forEach(f => {
    const src = path.join(srcDir, f);
    const dst = path.join(dstDir, f);
    // only copy JS files (the compiled TS)
    if (f.endsWith('.js')) {
      fs.copyFileSync(src, dst);
      console.log('Copied', src, '->', dst);
    }
  });
} catch (err) {
  console.error('Copy failed:', err);
  process.exit(1);
}
