const fs = require('fs');
let code = fs.readFileSync('Code.js', 'utf8');

// 1. getServicesList
code = code.replace(
  "function getServicesList() {\n  try {\n    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);",
  "function getServicesList() {\n  try {\n    var cache = CacheService.getScriptCache();\n    var cached = cache.get('SERVICES_LIST');\n    if (cached) return { status: 'success', data: JSON.parse(cached) };\n\n    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);"
);
code = code.replace(
  "    return { status: 'success', data: services };\n  } catch(e) {",
  "    cache.put('SERVICES_LIST', JSON.stringify(services), 1800);\n    return { status: 'success', data: services };\n  } catch(e) {"
);

// clear cache for services
['addRecommendedService', 'editRecommendedService', 'deleteRecommendedService', 'saveFullServicesList'].forEach(fn => {
  let search = `function ${fn}(`;
  let index = code.indexOf(search);
  if (index !== -1) {
    let tryIndex = code.indexOf('try {', index);
    if (tryIndex !== -1) {
      code = code.substring(0, tryIndex + 5) + "\n    CacheService.getScriptCache().remove('SERVICES_LIST');" + code.substring(tryIndex + 5);
    }
  }
});

// 2. getBigLotProducts
code = code.replace(
  "function getBigLotProducts() {\n  try {\n    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);",
  "function getBigLotProducts() {\n  try {\n    var cache = CacheService.getScriptCache();\n    var cached = cache.get('BIGLOT_PRODUCTS');\n    if (cached) return { status: 'success', data: JSON.parse(cached) };\n\n    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);"
);
code = code.replace(
  "    return { status: 'success', data: products };\n  } catch (error) {",
  "    cache.put('BIGLOT_PRODUCTS', JSON.stringify(products), 1800);\n    return { status: 'success', data: products };\n  } catch (error) {"
);

// clear cache for biglot
['createBigLotProduct', 'updateBigLotProduct', 'updateBigLotProductStatus', 'deleteBigLotProduct'].forEach(fn => {
  let search = `function ${fn}(`;
  let index = code.indexOf(search);
  if (index !== -1) {
    let tryIndex = code.indexOf('try {', index);
    if (tryIndex !== -1) {
      code = code.substring(0, tryIndex + 5) + "\n    CacheService.getScriptCache().remove('BIGLOT_PRODUCTS');" + code.substring(tryIndex + 5);
    }
  }
});

fs.writeFileSync('Code.js', code, 'utf8');
console.log('Applied caching successfully!');
