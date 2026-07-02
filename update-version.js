const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Module_Core.html');
if (!fs.existsSync(filePath)) {
    console.error('Error: Module_Core.html not found!');
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const year = now.getFullYear();
const month = pad(now.getMonth() + 1);
const day = pad(now.getDate());
const hours = pad(now.getHours());
const minutes = pad(now.getMinutes());

const versionString = `Ver. ${year}.${month}${day}.${hours}${minutes}`;

// Matches: var APP_VERSION = 'Ver. xxxx.xxxx.xxxx'; or older formats
const regex = /var APP_VERSION\s*=\s*['"]Ver\.\s*\d{4}\.\d{4}\.\d{4}['"];/;
if (regex.test(content)) {
    content = content.replace(regex, `var APP_VERSION = '${versionString}';`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated APP_VERSION to: ${versionString}`);
} else {
    // Try a more generic match in case the format is slightly different
    const genericRegex = /var APP_VERSION\s*=\s*['"]Ver\..*?['"];/;
    if (genericRegex.test(content)) {
        content = content.replace(genericRegex, `var APP_VERSION = '${versionString}';`);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Successfully updated APP_VERSION (generic) to: ${versionString}`);
    } else {
        console.error('Error: Could not find APP_VERSION variable in Module_Core.html');
        process.exit(1);
    }
}
