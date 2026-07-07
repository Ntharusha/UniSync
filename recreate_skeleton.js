const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const srcDir = __dirname;
const destDir = path.join(srcDir, '..', 'uni-sync-architecture');
const gitRemoteUrl = 'https://github.com/Ntharusha/UniSync';

// Clean and recreate destination
if (fs.existsSync(destDir)) {
    console.log(`Cleaning existing target directory at ${destDir}...`);
    fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir, { recursive: true });

const excludeDirs = new Set([
    'node_modules',
    '.git',
    '.expo',
    '.expo-shared',
    'dist',
    'build',
    'coverage',
    'architecture-temp',
    'uni-sync-architecture',
    '.tempmediaStorage',
    'ss'
]);

const excludeFiles = new Set([
    'login_credentials.md',
    'UniSync.png',
    'recreate_skeleton.js',
    'recreate_skeleton.py'
]);

const keepContentFiles = new Set([
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'app.json',
    '.gitignore',
    'README.md',
    'TODO.md',
    'build.sh',
    'run.sh',
    'tailwind.config.js',
    'postcss.config.js',
    'babel.config.js',
    'metro.config.js'
]);

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        const base = path.basename(src);
        if (excludeDirs.has(base) || src === destDir) return;
        
        fs.mkdirSync(dest, { recursive: true });
        const files = fs.readdirSync(src);
        for (const file of files) {
            copyRecursive(path.join(src, file), path.join(dest, file));
        }
    } else {
        const file = path.basename(src);
        if (file.startsWith('.env') || excludeFiles.has(file)) {
            return;
        }
        
        if (keepContentFiles.has(file) || (file.endsWith('.json') && (file.includes('package') || file.includes('tsconfig') || file.includes('app')))) {
            fs.copyFileSync(src, dest);
        } else {
            // Write empty file to preserve path structure but remove implementation
            fs.writeFileSync(dest, '');
        }
    }
}

console.log(`Step 1: Replicating architecture from '${srcDir}' to '${destDir}'...`);
const items = fs.readdirSync(srcDir);
for (const item of items) {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);
    copyRecursive(srcPath, destPath);
}
console.log('✅ Structure replicated successfully!');

console.log('\nStep 2: Initializing Git repository in the target directory...');
try {
    // Run Git initialization
    execSync('git init', { cwd: destDir, stdio: 'inherit' });
    execSync(`git remote add origin ${gitRemoteUrl}`, { cwd: destDir, stdio: 'inherit' });
    execSync('git checkout -b dev', { cwd: destDir, stdio: 'inherit' });
    execSync('git add .', { cwd: destDir, stdio: 'inherit' });
    execSync('git commit -m "chore: initial project architecture and templates"', { cwd: destDir, stdio: 'inherit' });
    
    console.log('\n✅ Git repository initialized, configured, and committed locally!');
    console.log('\n🚀 Run the following commands to push the architecture skeleton to GitHub:');
    console.log(`\x1b[36mcd "${destDir}"\x1b[0m`);
    console.log(`\x1b[36mgit push -u origin dev\x1b[0m\n`);
} catch (error) {
    console.error('❌ Failed to run Git commands automatically:', error.message);
}
