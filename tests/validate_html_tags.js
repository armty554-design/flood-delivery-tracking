const fs = require('fs');
const path = require('path');

function validateFile(filename) {
  const filePath = path.join(__dirname, '..', filename);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return false;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  const lines = html.split(/\r?\n/);

  const stack = [];
  let hasError = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tagRegex = /<\/?(section|main|div|header|aside|body|html)(\s+[^>]*)?>/gi;
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
      const fullTag = match[0];
      const tagName = match[1].toLowerCase();
      const isClosing = fullTag.startsWith('</');
      const isSelfClosing = fullTag.endsWith('/>');
      if (isSelfClosing) continue;
      
      if (!isClosing) {
        const idMatch = fullTag.match(/id=["']([^"']+)["']/i);
        const classMatch = fullTag.match(/class=["']([^"']+)["']/i);
        stack.push({ line: i + 1, tag: tagName, id: idMatch ? idMatch[1] : '', cls: classMatch ? classMatch[1].slice(0, 30) : '' });
      } else {
        if (stack.length === 0) {
          console.error(`[${filename}] Unmatched closing tag </${tagName}> at line ${i + 1}`);
          hasError = true;
        } else {
          const top = stack.pop();
          if (top.tag !== tagName) {
            console.error(`[${filename}] Mismatched tag at line ${i + 1}: expected </${top.tag}> (opened at line ${top.line} id=${top.id}), but got </${tagName}>`);
            hasError = true;
          }
        }
      }
    }
  }

  if (stack.length > 0) {
    console.error(`[${filename}] Unclosed tags remaining: ${stack.length}`);
    stack.forEach(s => console.error(`  Unclosed <${s.tag} id="${s.id}"> opened at line ${s.line}`));
    hasError = true;
  }

  if (!hasError) {
    console.log(`✔ [${filename}] All structural HTML tags perfectly balanced!`);
    return true;
  }
  return false;
}

const okTemplate = validateFile('Index_template.html');
const okIndex = validateFile('Index.html');

if (!okTemplate || !okIndex) {
  process.exit(1);
} else {
  console.log('HTML Structure Verification Passed 100%.');
}
