const fs = require('fs');
const path = require('path');

const directories = [
  path.join(__dirname, 'app'),
  path.join(__dirname, 'components')
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

const files = [];
directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    files.push(...walk(dir));
  }
});

let updatedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace space-y-X with gap-X
  content = content.replace(/space-y-([\d\.]+)/g, 'gap-$1');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${path.relative(__dirname, file)}`);
    updatedCount++;
  }
});

console.log(`Successfully updated ${updatedCount} files.`);
