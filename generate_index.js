const fs = require('fs');
const path = require('path');

const initialData = fs.readFileSync(path.join(__dirname, 'initial_data.json'), 'utf8');
const template = fs.readFileSync(path.join(__dirname, 'Index_template.html'), 'utf8');

const result = template.replace('/*INITIAL_DATA_PLACEHOLDER*/', initialData);

// 1. Generate Index.html for Google Apps Script & root web server
fs.writeFileSync(path.join(__dirname, 'Index.html'), result, 'utf8');
console.log('Successfully generated Index.html! File size:', fs.statSync(path.join(__dirname, 'Index.html')).size, 'bytes');

// 2. Generate docs/index.html for GitHub Pages (/docs deployment)
const docsDir = path.join(__dirname, 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}
fs.writeFileSync(path.join(docsDir, 'index.html'), result, 'utf8');
console.log('Successfully generated docs/index.html for GitHub Pages! File size:', fs.statSync(path.join(docsDir, 'index.html')).size, 'bytes');
