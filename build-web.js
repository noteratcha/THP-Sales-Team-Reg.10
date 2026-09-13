const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Recursive include resolver
function resolveIncludes(content, currentFile) {
  const includeRegex = /<\?!\s*=\s*include\(\s*['"]([^'"]+)['"]\s*\);?\s*\?>/g;
  return content.replace(includeRegex, (match, moduleName) => {
    let targetPath = path.join(rootDir, `${moduleName}.html`);
    if (!fs.existsSync(targetPath)) {
      targetPath = path.join(rootDir, moduleName);
    }
    if (!fs.existsSync(targetPath)) {
      console.warn(`Warning: Included file not found: ${moduleName}`);
      return `<!-- Missing include: ${moduleName} -->`;
    }
    const includedContent = fs.readFileSync(targetPath, 'utf8');
    return resolveIncludes(includedContent, targetPath);
  });
}

// 2. Read Index.html
const indexHtmlPath = path.join(rootDir, 'Index.html');
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// 3. Resolve all includes
let bundledHtml = resolveIncludes(indexHtml, indexHtmlPath);

// 4. Inject google.script.run Adapter / Polyfill
const adapterScript = `
  <!-- Vercel Google Apps Script Adapter -->
  <script>
    (function() {
      if (typeof window.google === 'undefined') {
        window.google = {};
      }
      if (typeof window.google.script === 'undefined') {
        window.google.script = {};
      }
      if (typeof window.google.script.run === 'undefined') {
        const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbyHjKL4Sj873PZDGMoOUQ9e_4HAGWL3MqDBGqyicjqujyz4lLI0QytBvD0-0BzxAj5y/exec";
        
        function createRunner(successCb, failureCb, userObj) {
          return new Proxy({}, {
            get(target, prop) {
              if (prop === 'withSuccessHandler') {
                return function(cb) {
                  return createRunner(cb, failureCb, userObj);
                };
              }
              if (prop === 'withFailureHandler') {
                return function(cb) {
                  return createRunner(successCb, cb, userObj);
                };
              }
              if (prop === 'withUserObject') {
                return function(obj) {
                  return createRunner(successCb, failureCb, obj);
                };
              }
              
              // Invoke remote GAS function
              return function(...args) {
                const apiUrl = window.GAS_API_URL || DEFAULT_GAS_URL;
                const payload = {
                  action: 'executeFunction',
                  functionName: prop,
                  args: args
                };
                
                // Use Content-Type: text/plain to avoid CORS preflight OPTIONS request
                fetch(apiUrl, {
                  method: 'POST',
                  mode: 'cors',
                  headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                  },
                  body: JSON.stringify(payload)
                })
                .then(res => {
                  if (!res.ok) {
                    throw new Error('HTTP Error ' + res.status + ' (' + res.statusText + ')');
                  }
                  return res.json();
                })
                .then(json => {
                  if (json && json.__gas_execution__) {
                    if (json.success) {
                      if (typeof successCb === 'function') {
                        successCb(json.result, userObj);
                      }
                    } else {
                      const err = new Error(json.error || 'Execution failed on Google Apps Script');
                      if (typeof failureCb === 'function') {
                        failureCb(err, userObj);
                      } else {
                        console.error('GAS Error:', err);
                      }
                    }
                  } else {
                    if (typeof successCb === 'function') {
                      successCb(json, userObj);
                    }
                  }
                })
                .catch(err => {
                  console.error('API call failed for ' + prop + ':', err);
                  if (typeof failureCb === 'function') {
                    failureCb(err, userObj);
                  }
                });
              };
            }
          });
        }
        
        window.google.script.run = createRunner();
        console.log('🚀 Vercel GAS Adapter initialized pointing to:', DEFAULT_GAS_URL);
      }
    })();
  </script>
`;

// Inject adapter right before closing </head>
if (bundledHtml.includes('</head>')) {
  bundledHtml = bundledHtml.replace('</head>', adapterScript + '\n</head>');
} else {
  bundledHtml = adapterScript + '\n' + bundledHtml;
}

// 5. Write to dist/index.html
const outputPath = path.join(distDir, 'index.html');
fs.writeFileSync(outputPath, bundledHtml, 'utf8');

console.log('✅ Successfully bundled Web App to dist/index.html (' + (Buffer.byteLength(bundledHtml, 'utf8') / 1024).toFixed(1) + ' KB)');
