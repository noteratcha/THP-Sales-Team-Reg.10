const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'Module_Core.html');
if (!fs.existsSync(filePath)) {
    console.error('Error: Module_Core.html not found!');
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// ใช้เวลาไทยเสมอ ไม่ขึ้นกับ timezone ของเครื่องที่รัน (เครื่อง CI/AI มักเป็น UTC)
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
}).formatToParts(new Date()).map(p => [p.type, p.value]));
const { year, month, day, hour: hours, minute: minutes } = parts;

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
