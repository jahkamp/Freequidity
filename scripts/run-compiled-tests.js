const fs = require('fs');
const path = require('path');

function renameJsToCjs(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      renameJsToCjs(full);
    } else if (e.isFile() && full.endsWith('.js')) {
      const newName = full.replace(/\.js$/, '.cjs');
      fs.renameSync(full, newName);
      console.log(`Renamed: ${full} -> ${newName}`);
    }
  }
}

const testDir = path.join(__dirname, '..', 'tmp-test-build', 'test');
if (!fs.existsSync(testDir)) {
  console.error(`Test dir not found: ${testDir}`);
  process.exit(1);
}
renameJsToCjs(testDir);
console.log('All compiled .js test files renamed to .cjs');
