import fs from 'fs';
import path from 'path';

const dist = 'dist';
const files = fs.readdirSync(dist);
const html = files.find((f) => f.endsWith('.html'));
if (!html) process.exit(0);

fs.copyFileSync(path.join(dist, html), 'popup.html');

// find main js
const assetsDir = path.join(dist, 'assets');
const jsFile = fs.readdirSync(assetsDir).find((f) => f.endsWith('.js'));
fs.copyFileSync(path.join(assetsDir, jsFile), 'popup.js');
