import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname as pathDirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathDirname(__filename);

const DIST_PATH = join(__dirname, '../dist');
const PAGES_PATH = join(__dirname, '../dist-pages');

// Cloudflare Pages serves a file named `_worker.js` at the root of the
// output directory as the Pages Function. The BPB build produces a single
// `worker.js`, so we copy it into a Pages-ready layout.
mkdirSync(PAGES_PATH, { recursive: true });
copyFileSync(join(DIST_PATH, 'worker.js'), join(PAGES_PATH, '_worker.js'));

// _routes.json: exclude everything from the static asset cache so the
// Pages Function handles all requests (the panel needs dynamic KV reads).
writeFileSync(
	join(PAGES_PATH, '_routes.json'),
	JSON.stringify({ version: 1, include: ['/*'], exclude: [] }, null, 2),
	'utf8'
);

console.log('✔ Pages build ready in ./dist-pages (use: npx wrangler pages deploy dist-pages)');
