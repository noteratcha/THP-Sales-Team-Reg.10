function authorizeDriveAccess() {
  DriveApp.getRootFolder();
  console.log('ได้รับอนุญาตสำเร็จ');
}

// =========================================================
// 🚨 THP Sales Team Reg.10 Unified Backend Script (Code.gs)
// รวมโค้ดหลังบ้านทั้งหมดฝั่งเซิร์ฟเวอร์เพื่อให้ประมวลผลได้รวดเร็วขึ้น
// =========================================================


// ==========================================
// 📦 SECTION: Code_Main.js
// ==========================================

// ==========================================
// 🚨 ไฟล์หลัก: ตั้งค่า Global และจุดเริ่มต้นระบบ (Code_Main.gs)
// ==========================================

// ตัวแปร Global สำหรับอ้างอิง ID ของ Sheet และ Folder ต่างๆ
var SPREADSHEET_ID = '1uo2vKwNI--USPCLg_jZNmWWxbcV8aHheem4ZAfobIg4'; // ฐานข้อมูลการเข้าพบลูกค้า
var FOLDER_ID = '1WCLeKoEtHjVseS0f0hp1zF5MPQxzFNMc'; // โฟลเดอร์เก็บรูปภาพ
var TARGET_SS_ID = '1rg-HOLCgxgoKOqGx3GxmtUmDc0joNRGUYs7Skc4zxzM'; // ฐานข้อมูลกำหนดเป้าหมาย
var SERVICES_SS_ID = '1q-Jx-irTuftdAKHIWn6I8v4Sun0Wuzv0oSR-MMaTdXw'; // ฐานข้อมูลบริการที่แนะนำ
var PK_SS_ID = '1Kih3OdhLlAbVTc9i7ooZW6g5KFCCk0ur4l3uDfVq6P4'; // ฐานข้อมูลลูกค้า ปก.
var BIGLOT_SS_ID = '1_bVjdCFybI6BczhO9lmRw1O49mj-Y40O0n0rokgA5jY'; // ฐานข้อมูล สั่งสินค้า BigLot

var EXCLUDED_ZIPCODES = ["00066", "00074", "00086", "00129", "00166", "00167", "00181", "00246", "00308", "00320", "00342", "00343", "00361", "00427", "08027", "08057", "09096", "09126", "09237"];

/**
 * จุดเริ่มต้นของ Web App และ API
 */
function doGet(e) {
  // ตรวจสอบว่าเป็นการเรียกผ่าน API หรือไม่ (เช่น ดึงข้อมูล User)
  if (e && e.parameter && e.parameter.api === 'getUser') {
    if (typeof handleApiRequest === 'function') {
      return handleApiRequest(e.parameter); // เรียกใช้จากไฟล์ Code_Auth.gs
    } else {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'API module not loaded' })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ถ้าเป็นการเรียกผ่านเบราว์เซอร์ปกติ ให้แสดงหน้า Web App
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('THP Sales Team Reg.10')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * ฟังก์ชันสำหรับนำเข้าไฟล์ HTML ย่อย (Include)
 * 💡 [แก้ไขแล้ว] ใช้ createTemplateFromFile().evaluate() เพื่อให้รองรับไฟล์ย่อยซ้อนไฟล์ย่อย
 */
function include(filename) {
  try {
    return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    console.error("Include Error: ไม่พบไฟล์ HTML ชื่อ '" + filename + "' ในระบบ");
    return "<!-- Missing HTML File: " + filename + " -->";
  }
}

/**
 * ฟังก์ชันอัปโหลดรูปภาพขึ้น Google Drive
 */
function uploadImageToDrive(fileData, fileName, userInfo) {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    if (!fileData || fileData.indexOf(',') === -1) return "Error: Invalid Data";

    var contentType = fileData.substring(5, fileData.indexOf(';'));
    var base64Data = fileData.split(',')[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), contentType, fileName);
    var file = folder.createFile(blob);

    try {
      // กำหนดสิทธิ์ให้ทุกคนที่มีลิงก์สามารถดูรูปได้
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      console.log("ข้ามการแชร์ Public (อาจติด Policy องค์กร): " + shareErr);
    }

    return file.getUrl();
  } catch (err) {
    var errMsg = err ? err.toString() : "";
    if (errMsg.indexOf("DriveApp") === -1 && errMsg.indexOf("ไม่ได้รับอนุญาตให้เข้าถึง") === -1) {
      var contextMsg = "พบปัญหาอัปโหลดรูปจากผู้ใช้: " + (userInfo || "ไม่ระบุ");
      if (typeof sendErrorToLine === 'function') sendErrorToLine(err, contextMsg);
    }

    console.error("Upload Image Error: " + err.message);
    return "Error Uploading";
  }
}

/**
 * 💡 ฟังก์ชันสำหรับใช้ "เรียกใช้ (Run)" เพื่อกดยืนยันสิทธิ์ (Authorization) 
 */
function setupDrivePermissions() {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var ssServices = SpreadsheetApp.openById(SERVICES_SS_ID);
    Logger.log("เข้าถึงโฟลเดอร์และชีตสำเร็จ! สิทธิ์การเข้าถึงสมบูรณ์แล้ว");
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    Logger.log("เกิดข้อผิดพลาด: " + e.message);
  }
}

// ==========================================
// 📦 SECTION: Code_Auth.js
// ==========================================

// ==========================================
// การตรวจสอบสิทธิ์ (Authentication & API)
// ==========================================

/**
 * ฟังก์ชัน 1: ตรวจสอบ Login จากหน้าเว็บ
 */
function checkLogin(formObject) {
  try {
    // SPREADSHEET_ID ถูกประกาศไว้ใน Code_Main.gs สามารถเรียกใช้ได้เลย
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('user');

    if (!sheet) {
      return { status: 'error', message: 'ไม่พบฐานข้อมูลผู้ใช้งาน' };
    }

    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == formObject.username && data[i][1] == formObject.password) {
        // บันทึกเวลาเข้าสู่ระบบล่าสุด (คอลัมน์ E และ F)
        sheet.getRange(i + 1, 5).setValue(new Date());
        sheet.getRange(i + 1, 6).setValue("Logged In");

        return {
          status: 'success',
          user: data[i][0],
          name: data[i][2],
          zipcode: data[i][0],
          team: data[i][6] ? data[i][6] : ""
        };
      }
    }
    return { status: 'error', message: 'User หรือ Password ไม่ถูกต้อง' };

  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: 'เกิดข้อผิดพลาด: ' + e.message };
  }
}

/**
 * ฟังก์ชัน 2: จัดการคำขอ API เพื่อดึงข้อมูล User (เรียกใช้ผ่าน doGet ใน Code_Main)
 */
function handleApiRequest(params) {
  var username = params.username;

  if (username === 'debug_targets') {
    try {
      var ss = SpreadsheetApp.openById(TARGET_SS_ID);
      var sheet = ss.getSheetByName('เป้าหมายรายได้');
      var vals = sheet.getRange(1, 1, 3, 10).getDisplayValues();
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: vals })).setMimeType(ContentService.MimeType.JSON);
    } catch(e) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (username === 'debug_revenue') {
    try {
      var res = getRevenueReportData({ user: 'admin' });
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: res.data.slice(0, 3) })).setMimeType(ContentService.MimeType.JSON);
    } catch(e) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (username === 'debug_users') {
    try {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet = ss.getSheetByName('user');
      var vals = sheet.getRange(1, 1, 5, 3).getDisplayValues();
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: vals })).setMimeType(ContentService.MimeType.JSON);
    } catch(e) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: e.toString() })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  if (!username) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'กรุณาระบุพารามิเตอร์ username'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('user');

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'ไม่พบฐานข้อมูลผู้ใช้งาน'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(username).trim()) {
        var result = {
          status: 'success',
          user: data[i][0],
          name: data[i][2],
          zipcode: data[i][0],
          team: data[i][6] ? data[i][6] : ""
        };

        return ContentService.createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'ไม่พบผู้ใช้งานนี้ในระบบ'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'เกิดข้อผิดพลาดเซิร์ฟเวอร์: ' + e.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 📦 SECTION: Code_Visit.js
// ==========================================

/**
 * ฟังก์ชัน: ส่งข้อมูลแจ้งปัญหาไปที่ LINE Notify
 */
function sendBugReportToLine(message, imageB64) {
  var LINE_TOKEN = "YOUR_LINE_NOTIFY_TOKEN_HERE"; // <--- นำ Token จาก LINE Notify มาใส่ที่นี่
  
  if (!LINE_TOKEN || LINE_TOKEN === "YOUR_LINE_NOTIFY_TOKEN_HERE") {
     return {status: "error", message: "ยังไม่ได้ตั้งค่า LINE Notify Token ในไฟล์ Code.js"};
  }

  var formData = { 'message': message };

  if (imageB64 && imageB64.indexOf("base64,") !== -1) {
    var base64Data = imageB64.split('base64,')[1];
    var imageBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png', 'bug_report.png');
    formData['imageFile'] = imageBlob;
  }

  var options = {
    'method': 'post',
    'payload': formData,
    'headers': {
      'Authorization': 'Bearer ' + LINE_TOKEN
    },
    'muteHttpExceptions': true
  };

  try {
    var response = UrlFetchApp.fetch('https://notify-api.line.me/api/notify', options);
    return {status: "success", result: response.getContentText()};
  } catch (e) {
    return {status: "error", message: e.toString()};
  }
}

// ==========================================
// การจัดการข้อมูลการเข้าพบลูกค้า (Visit Data)
// ==========================================

/**
 * ฟังก์ชัน: บันทึกข้อมูลการเข้าพบใหม่
 */
function saveData(data) {
  try {
    var phone = data.entrepreneurPhone ? data.entrepreneurPhone.toString().trim() : "";
    if (!/^0\d{8,9}$/.test(phone)) {
      return { status: 'error', message: 'เบอร์โทรศัพท์ไม่ถูกต้อง' };
    }

    var imageUrl = "";
    if (data.fileData && data.fileName) {
      // เรียกใช้จาก Code_Settings.gs
      var userInfo = (data.salesName || "") + " (" + (data.officeName || "") + ")";
      imageUrl = uploadImageToDrive(data.fileData, data.fileName, userInfo);
    }

    var offerResult = data.offerResult || "";
    var recommendedService = data.recommendedService || "";
    var lostReason = data.lostReason || "";

    // SPREADSHEET_ID ประกาศไว้ใน Code_Main.gs
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('ข้อมูลการเข้าพบ');

    var newRow = [
      new Date(), data.subject, data.customerGroup, data.officeRegion, data.officeName, "'" + data.zipCode,
      data.salesName, data.entrepreneurName, "'" + phone, data.productType, data.salesChannel,
      data.shippingVolume, data.currentCarrier, data.needs, data.problems, data.suggestions,
      data.postFamilyStatus, data.postFamilyID, imageUrl, offerResult, recommendedService, lostReason
    ];

    sheet.appendRow(newRow);

    // อัปเดตไปยังชีตลูกค้า ปก. อัตโนมัติ (ฟังก์ชันจะอยู่ใน Code_PK.gs)
    if (typeof updatePKSheet === 'function') {
      updatePKSheet(data.entrepreneurName, data.customerGroup, lostReason);
    }

    return { status: 'success' };
  } catch (e) {
    var errMsg = e ? e.toString() : "";
    
    // แจ้งชื่อ user เข้าไปใน LINE Notify
    var loggedInUser = data.salesName || "ไม่ทราบชื่อ";
    var officeName = data.officeName || "ไม่ระบุที่ทำการ";
    var userInfoContext = "👤 User: " + loggedInUser + " (" + officeName + ")";

    if (errMsg.indexOf("DriveApp") === -1 && errMsg.indexOf("ไม่ได้รับอนุญาตให้เข้าถึง") === -1) {
      if (typeof sendErrorToLine === 'function') sendErrorToLine(e, userInfoContext);
    }

    return { status: 'error', message: e.toString() };
  }
}

/**
 * ฟังก์ชัน: ดึงข้อมูลการเข้าพบทั้งหมดเพื่อแสดงในตาราง
 */
function getDataForTable() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('ข้อมูลการเข้าพบ');

    if (!sheet) {
      return { status: 'error', message: 'ไม่พบชีต ข้อมูลการเข้าพบ' };
    }

    var data = sheet.getDataRange().getDisplayValues();
    
    // สร้าง Mapping สำหรับที่ทำการไปรษณีย์จากชีต user
    var userSheet = ss.getSheetByName('user');
    var zipToPostOfficeMap = {};
    if (userSheet) {
      var userData = userSheet.getDataRange().getDisplayValues();
      for (var i = 1; i < userData.length; i++) {
        var uZip = String(userData[i][0]).trim(); // คอลัมน์ A: รหัสไปรษณีย์
        var uPostOffice = String(userData[i][2]).trim(); // คอลัมน์ C: ที่ทำการไปรษณีย์
        if (uZip && uPostOffice) {
          zipToPostOfficeMap[uZip] = uPostOffice;
        }
      }
    }

    var headers = data[0];
    var filteredRows = data.slice(1).filter(function(row) {
      var zip = String(row[5]).replace(/^'/, "").trim(); // คอลัมน์ F: รหัสไปรษณีย์
      return EXCLUDED_ZIPCODES.indexOf(zip) === -1;
    });
    
    // แมปข้อมูลที่ทำการไปรษณีย์ที่ว่างเปล่า
    for (var j = 0; j < filteredRows.length; j++) {
      var pOffice = String(filteredRows[j][4]).trim();
      if (!pOffice || pOffice === '-') {
        var zipCode = String(filteredRows[j][5]).replace(/^'/, "").trim();
        if (zipToPostOfficeMap[zipCode]) {
          filteredRows[j][4] = zipToPostOfficeMap[zipCode];
        }
      }
    }
    
    var resultData = [headers].concat(filteredRows);
    return { status: 'success', data: resultData };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * ฟังก์ชัน: อัปเดต/แก้ไขข้อมูลการเข้าพบเดิม
 */
function updateVisitData(rowIndex, data) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('ข้อมูลการเข้าพบ');

    var phone = data.entrepreneurPhone ? data.entrepreneurPhone.toString().trim() : "";
    if (!/^0\d{8,9}$/.test(phone)) {
      return { status: 'error', message: 'เบอร์โทรศัพท์ไม่ถูกต้อง' };
    }

    var imageUrl = data.oldImageUrl || "";
    if (data.fileData && data.fileName) {
      var userInfo = (data.salesName || "") + " (" + (data.officeName || "") + ")";
      imageUrl = uploadImageToDrive(data.fileData, data.fileName, userInfo);
    }

    var offerResult = data.offerResult || "";
    var recommendedService = data.recommendedService || "";
    var lostReason = data.lostReason || "";

    var range = sheet.getRange(rowIndex, 2, 1, 21);
    var updateValues = [[
      data.subject, data.customerGroup, data.officeRegion, data.officeName, "'" + data.zipCode,
      data.salesName, data.entrepreneurName, "'" + phone, data.productType, data.salesChannel,
      data.shippingVolume, data.currentCarrier, data.needs, data.problems, data.suggestions,
      data.postFamilyStatus, data.postFamilyID, imageUrl, offerResult, recommendedService, lostReason
    ]];

    range.setValues(updateValues);

    // อัปเดตไปยังชีตลูกค้า ปก. อัตโนมัติ
    if (typeof updatePKSheet === 'function') {
      updatePKSheet(data.entrepreneurName, data.customerGroup, lostReason);
    }

    return { status: 'success' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * ฟังก์ชัน: ลบข้อมูลการเข้าพบ
 */
function deleteVisitData(rowIndex) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('ข้อมูลการเข้าพบ');

    if (!sheet) {
      return { status: 'error', message: 'ไม่พบชีตข้อมูล' };
    }

    sheet.deleteRow(rowIndex);
    return { status: 'success' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

// ==========================================
// 📦 SECTION: Code_Revenue.js
// ==========================================

// ==========================================
// ระบบนำเข้าและดึงข้อมูลรายได้/เป้าหมาย (Revenue Data) - [Optimized O(1)]
// ==========================================

/**
 * ฟังก์ชัน: ประมวลผลข้อมูลรายได้แบบ Batch (Tableau ทั่วไป)
 */
function processRevenueBatch(csvChunk, selectedYear) {
  try {
    var TARGET_TABLEAU_SS_ID = '1k_YWc5TYbeiviinIJCJt4Aj94jAbuf4MB9qYMKsuVLs';
    var TARGET_SHEET_NAME = 'Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)';
    var ss = SpreadsheetApp.openById(TARGET_TABLEAU_SS_ID);
    var sheet = ss.getSheetByName(TARGET_SHEET_NAME);
    if (!sheet) return { status: 'error', message: 'ไม่พบชีตปลายทาง' };

    // 1. โหลดข้อมูลกลุ่มบริการ (ใช้ Map เร็วกว่า {})
    var serviceSheet = ss.getSheetByName('รายชื่อบริการ');
    var serviceMap = new Map();
    if (serviceSheet) {
      // โหลดคอลัมน์ C, D และ E (ร่นเวลาโหลด)
      var srvData = serviceSheet.getRange(2, 3, serviceSheet.getLastRow() - 1, 3).getValues();
      for (var s = 0; s < srvData.length; s++) {
        var srvName = String(srvData[s][0]).trim();
        if (srvName !== "") {
          serviceMap.set(srvName, {
            group: String(srvData[s][1]).trim(),
            type: String(srvData[s][2]).trim()
          });
        }
      }
    }

    // 2. โหลดข้อมูลจังหวัด (ใช้ Map เร็วกว่า {})
    var REF_SS_ID = '1uo2vKwNI--USPCLg_jZNmWWxbcV8aHheem4ZAfobIg4';
    var refSheet = SpreadsheetApp.openById(REF_SS_ID).getSheetByName('ที่ทำการ');
    var provinceMap = new Map();
    if (refSheet) {
      // โหลดเฉพาะคอลัมน์ A และ B
      var refData = refSheet.getRange(2, 1, refSheet.getLastRow() - 1, 2).getValues();
      for (var p = 0; p < refData.length; p++) {
        provinceMap.set(String(refData[p][0]).trim(), String(refData[p][1]).trim());
      }
    }

    var csvData = Utilities.parseCsv(csvChunk);
    if (csvData.length === 0) return { status: 'success', updateCount: 0, addCount: 0, unmatchedCount: 0 };

    var lastRow = sheet.getLastRow();
    var existingData = [];
    var dataMapCustomer = new Map();
    var dataMapMember = new Map();

    // 3. สร้างดัชนีข้อมูลเดิม (In-Memory Indexing) และซ่อมแซมข้อมูลเก่าอัตโนมัติ
    var isDataChanged = false; // ย้ายตัวแปรมารับค่าการซ่อมแซม
    var minUpdateIndex = -1;
    var maxUpdateIndex = -1;
    
    if (lastRow > 1) {
      existingData = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
      for (var i = 0; i < existingData.length; i++) {
        var row = existingData[i];

        // --- ระบบซ่อมแซมข้อมูลเก่า (Auto-Fill Column M) ---
        var currentItemName = String(row[2]).trim();
        var currentType = String(row[12]).trim();
        if (currentType === "" && currentItemName !== "") {
            if (serviceMap.has(currentItemName)) {
                var expectedType = serviceMap.get(currentItemName).type;
                if (expectedType !== "") {
                    existingData[i][12] = expectedType;
                    isDataChanged = true;
                    if (minUpdateIndex === -1 || i < minUpdateIndex) minUpdateIndex = i;
                    if (maxUpdateIndex === -1 || i > maxUpdateIndex) maxUpdateIndex = i;
                }
            } else {
                unmatchedServices.add(currentItemName);
            }
        }

        // สร้าง Base Key ครั้งเดียว ประหยัดเวลาประมวลผล
        var keyBase = "_" + String(row[2]).trim() + "_" + String(row[1]).trim() + "_" + String(row[6]).trim() + "_" + String(row[7]).trim() + "_" + String(row[9]).trim();

        var keyCust = String(row[3]).trim() + keyBase;
        dataMapCustomer.set(keyCust, i);

        var memberId = String(row[4]).trim();
        if (memberId && memberId !== "-") {
          dataMapMember.set(memberId + keyBase, i);
        }
      }
    }

    var newRows = [];
    var updateCount = 0;
    var addCount = 0;
    var selectedYearStr = String(selectedYear).trim();
    var unmatchedServices = new Set();

    // 4. ลูปข้อมูลจาก CSV
    for (var i = 0; i < csvData.length; i++) {
      var csvRow = csvData[i];
      if (csvRow.length < 9) continue;

      var newValue = parseFloat(String(csvRow[8]).replace(/,/g, ''));
      var officeNameFull = String(csvRow[1]).trim();
      var zipCodeLookup = officeNameFull.length >= 5 ? officeNameFull.substring(0, 5) : officeNameFull;
      var provinceVal = provinceMap.get(zipCodeLookup) || "";

      var csvItemName = String(csvRow[2]).trim();
      var matchedGroup = "";
      var matchedType = "";
      
      if (serviceMap.has(csvItemName)) {
        var srvInfo = serviceMap.get(csvItemName);
        matchedGroup = srvInfo.group;
        matchedType = srvInfo.type;
      } else if (csvItemName !== "") {
        unmatchedServices.add(csvItemName);
      }

      var keyBaseCSV = "_" + csvItemName + "_" + officeNameFull + "_" + String(csvRow[6]).trim() + "_" + String(csvRow[7]).trim() + "_" + selectedYearStr;
      var csvCustKey = String(csvRow[3]).trim() + keyBaseCSV;
      var csvMemberId = String(csvRow[4]).trim();
      var csvMemKey = (csvMemberId && csvMemberId !== "-") ? (csvMemberId + keyBaseCSV) : "";

      var foundIndex = -1;
      // ค้นหาแบบความเร็วสูง O(1)
      if (dataMapCustomer.has(csvCustKey)) {
        foundIndex = dataMapCustomer.get(csvCustKey);
      } else if (csvMemKey && dataMapMember.has(csvMemKey)) {
        foundIndex = dataMapMember.get(csvMemKey);
      }

      if (foundIndex !== -1) {
        // [UPDATE] ข้อมูลที่มีอยู่แล้ว
        var existingRow = existingData[foundIndex];
        var existingValue = parseFloat(String(existingRow[8]).replace(/,/g, ''));
        var needUpdate = false;

        if (!isNaN(newValue) && (isNaN(existingValue) || newValue > existingValue)) {
          existingRow[8] = newValue;
          needUpdate = true;
        }

        if (provinceVal !== "" && existingRow[10] !== provinceVal) {
          while (existingRow.length < 11) existingRow.push("");
          existingRow[10] = provinceVal;
          needUpdate = true;
        }

        if (matchedGroup !== "" && existingRow[11] !== matchedGroup) {
          while (existingRow.length < 12) existingRow.push("");
          existingRow[11] = matchedGroup;
          needUpdate = true;
        }

        if (matchedType !== "" && existingRow[12] !== matchedType) {
          while (existingRow.length < 13) existingRow.push("");
          existingRow[12] = matchedType;
          needUpdate = true;
        }

        if (needUpdate) {
          isDataChanged = true;
          updateCount++;
          if (minUpdateIndex === -1 || foundIndex < minUpdateIndex) minUpdateIndex = foundIndex;
          if (maxUpdateIndex === -1 || foundIndex > maxUpdateIndex) maxUpdateIndex = foundIndex;
        }
      } else {
        // [INSERT] ข้อมูลใหม่
        var customerName = csvRow[3];
        if (!customerName || String(customerName).trim() === "") customerName = csvRow[4];

        newRows.push([csvRow[0], officeNameFull, csvItemName, customerName, csvRow[4], csvRow[5], csvRow[6], csvRow[7], newValue, selectedYearStr, provinceVal, matchedGroup, matchedType]);
        addCount++;
      }
    }

    // 5. เขียนข้อมูลกลับลงชีต (เขียนเฉพาะส่วนที่ถูกอัปเดตเพื่อความรวดเร็ว)
    if (isDataChanged && minUpdateIndex !== -1 && maxUpdateIndex !== -1) { 
        var numRowsToUpdate = maxUpdateIndex - minUpdateIndex + 1;
        var dataToWrite = existingData.slice(minUpdateIndex, maxUpdateIndex + 1);
        sheet.getRange(2 + minUpdateIndex, 1, numRowsToUpdate, 13).setValues(dataToWrite); 
    }
    if (newRows.length > 0) { sheet.getRange(lastRow + 1, 1, newRows.length, 13).setValues(newRows); }

    // 6. เพิ่มรายชื่อบริการที่ยังไม่มีลงในชีต 'รายชื่อบริการ' คอลัมน์ C
    if (unmatchedServices.size > 0 && serviceSheet) {
      var newServices = Array.from(unmatchedServices).map(function(srv) { return [srv]; });
      var srvLastRow = serviceSheet.getLastRow();
      if (srvLastRow < 1) srvLastRow = 1;
      serviceSheet.getRange(srvLastRow + 1, 3, newServices.length, 1).setValues(newServices);
    }

    return { status: 'success', addCount: addCount, updateCount: updateCount, unmatchedCount: unmatchedServices.size, newServicesAdded: Array.from(unmatchedServices) };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);
 return { status: 'error', message: 'Error in batch: ' + e.toString() }; }
}

/**
 * ฟังก์ชัน: นำเข้า E-PARCEL (ชี้ไปยังฟังก์ชันประมวลผล Revenue หลัก)
 */
function processEparcelBatch(csvChunk, selectedYear) {
  return processRevenueBatch(csvChunk, selectedYear);
}

/**
 * ฟังก์ชันพิเศษ: อัปเดตข้อมูลคอลัมน์ M (ประเภท) สำหรับข้อมูลเก่าทั้งหมดในชีตแบบย้อนหลัง
 */
function retroactiveUpdateTableauType() {
  try {
    var TARGET_TABLEAU_SS_ID = '1k_YWc5TYbeiviinIJCJt4Aj94jAbuf4MB9qYMKsuVLs';
    var TARGET_SHEET_NAME = 'Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)';
    var ss = SpreadsheetApp.openById(TARGET_TABLEAU_SS_ID);
    var sheet = ss.getSheetByName(TARGET_SHEET_NAME);
    if (!sheet) return 'ไม่พบชีตเป้าหมาย';

    var serviceSheet = ss.getSheetByName('รายชื่อบริการ');
    var serviceMap = new Map();
    if (serviceSheet) {
      var srvData = serviceSheet.getRange(2, 3, serviceSheet.getLastRow() - 1, 3).getValues();
      for (var s = 0; s < srvData.length; s++) {
        var srvName = String(srvData[s][0]).trim();
        if (srvName !== "") {
          serviceMap.set(srvName, String(srvData[s][2]).trim()); // คอลัมน์ E (ประเภท)
        }
      }
    }

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return 'ไม่มีข้อมูล';

    var existingData = sheet.getRange(2, 1, lastRow - 1, 13).getValues();
    var updateCount = 0;
    var unmatchedServices = new Set();

    for (var i = 0; i < existingData.length; i++) {
      var itemName = String(existingData[i][2]).trim(); // คอลัมน์ C (Item Name)
      var currentType = String(existingData[i][12]).trim(); // คอลัมน์ M (ประเภท)
      
      if (itemName !== "") {
        if (serviceMap.has(itemName)) {
          var expectedType = serviceMap.get(itemName);
          if (expectedType !== "" && currentType !== expectedType) {
            existingData[i][12] = expectedType;
            updateCount++;
          }
        } else if (currentType === "") {
          unmatchedServices.add(itemName);
        }
      }
    }

    if (updateCount > 0) {
      sheet.getRange(2, 1, existingData.length, 13).setValues(existingData);
    }
    
    if (unmatchedServices.size > 0 && serviceSheet) {
      var newServices = Array.from(unmatchedServices).map(function(srv) { return [srv]; });
      var srvLastRow = serviceSheet.getLastRow();
      if (srvLastRow < 1) srvLastRow = 1;
      serviceSheet.getRange(srvLastRow + 1, 3, newServices.length, 1).setValues(newServices);
    }

    var msg = 'อัปเดตข้อมูลเก่าเรียบร้อย จำนวน ' + updateCount.toLocaleString() + ' รายการ';
    if (unmatchedServices.size > 0) {
       msg += '\\n\\nพบรายการที่ไม่รู้จักและถูกเพิ่มลงฐานข้อมูลใหม่จำนวน ' + unmatchedServices.size + ' รายการ\\n- ' + Array.from(unmatchedServices).join('\\n- ');
    }
    return msg;
  } catch (e) {
    return 'เกิดข้อผิดพลาด: ' + e.toString();
  }
}

/**
 * ฟังก์ชัน: ดึงรายงานข้อมูลรายได้ลูกค้าเพื่อนำไปแสดงผลบน Dashboard
 */
function getRevenueReportData(requestingUser) {
  try {
    var TARGET_TABLEAU_SS_ID = '1k_YWc5TYbeiviinIJCJt4Aj94jAbuf4MB9qYMKsuVLs';
    var TARGET_SHEET_NAME = 'Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)';
    var ss = SpreadsheetApp.openById(TARGET_TABLEAU_SS_ID);
    var sheet = ss.getSheetByName(TARGET_SHEET_NAME);

    if (!sheet) return { status: 'error', message: 'Sheet not found' };

    var data = sheet.getDataRange().getDisplayValues();
    var rows = data.slice(1);

    var reqUserStr = requestingUser.user ? String(requestingUser.user).toLowerCase() : '';
    var isAdmin = (reqUserStr === 'admin' || reqUserStr === 'viewer');
    var userZip = requestingUser.zipcode ? String(requestingUser.zipcode).trim() : "";

    var pivotedMap = {};

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var officeStr = String(row[1]);
      var officeZip = officeStr.length >= 5 ? officeStr.substring(0, 5) : "";

      if (EXCLUDED_ZIPCODES.indexOf(officeZip) !== -1) { continue; }

      if (!isAdmin && officeZip !== userZip) { continue; }

      var serviceGroup = (row.length > 11 && String(row[11]).trim() !== "") ? String(row[11]).trim() : String(row[2]).trim();
      var serviceType = (row.length > 12 && String(row[12]).trim() !== "") ? String(row[12]).trim() : "";
      var customerName = String(row[3]).trim();

      // ควบรวมลูกค้ากลุ่ม Tiktok ให้เหลือชื่อเดียว
      if (customerName.indexOf("Thai Happy Logistics Ltd.(DropOff)") !== -1 ||
        customerName.indexOf("Thai Happy Logistics Ltd.(PickUp)") !== -1 ||
        customerName.indexOf("Thai Happy Logistics Ltd.(Fruit)") !== -1) {
        customerName = "Thai Happy Logistics Ltd.(Tiktok)";
      }

      var rawLevel = String(row[5]).trim();
      var upperLevel = rawLevel.toUpperCase();
      var finalLevel = rawLevel;
      if (upperLevel !== "PLATINUM BOX" && upperLevel !== "BLUE BOX" && upperLevel !== "RED BOX") {
        finalLevel = "Customer";
      } else {
        finalLevel = upperLevel;
      }

      var key = customerName + "|" + String(row[1]).trim() + "|" + serviceGroup + "|" + String(row[4]).trim() + "|" + finalLevel + "|" + String(row[6]).trim() + "|" + String(row[9]).trim() + "|" + serviceType;

      if (!pivotedMap[key]) {
        pivotedMap[key] = { customer: customerName, office: row[1], item: serviceGroup, member: row[4], level: finalLevel, month: row[6], year: row[9], type: serviceType, revenue: 0, pieces: 0 };
      }

      var metricName = String(row[7]).trim();
      var metricValue = parseFloat(String(row[8]).replace(/,/g, '')) || 0;

      if (metricName === 'รายได้รวม') { pivotedMap[key].revenue += metricValue; }
      else if (metricName === 'จำนวนชิ้นงาน') { pivotedMap[key].pieces += metricValue; }
    }

    var resultData = [];
    for (var k in pivotedMap) {
      var obj = pivotedMap[k];
      resultData.push([obj.office, obj.customer, obj.member, obj.level, obj.item, obj.month, obj.year, obj.pieces, obj.revenue, obj.type]);
    }

    var thaiMonths = { "มกราคม": 1, "กุมภาพันธ์": 2, "มีนาคม": 3, "เมษายน": 4, "พฤษภาคม": 5, "มิถุนายน": 6, "กรกฎาคม": 7, "สิงหาคม": 8, "กันยายน": 9, "ตุลาคม": 10, "พฤศจิกายน": 11, "ธันวาคม": 12 };

    resultData.sort(function (a, b) {
      var yearA = parseInt(a[6]) || 0; var yearB = parseInt(b[6]) || 0;
      if (yearA !== yearB) return yearB - yearA;

      var monthA = thaiMonths[a[5]] || 0; var monthB = thaiMonths[b[5]] || 0;
      if (monthA !== monthB) return monthB - monthA;

      if (a[0] < b[0]) return -1; if (a[0] > b[0]) return 1;
      if (a[1] < b[1]) return -1; if (a[1] > b[1]) return 1;
      if (a[4] < b[4]) return -1; if (a[4] > b[4]) return 1;
      return 0;
    });

    return { status: 'success', data: resultData };

  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);
 return { status: 'error', message: e.toString() }; }
}

/**
 * ฟังก์ชัน: ดึงข้อมูลเป้าหมายการเข้าพบลูกค้า (Target)
 */
function getVisitTargets() {
  try {
    var ss = SpreadsheetApp.openById(TARGET_SS_ID);
    var sheet = ss.getSheetByName('เป้าหมายการเข้าพบลูกค้า');
    if (!sheet) return { status: 'error', message: 'ไม่พบชีต เป้าหมายการเข้าพบลูกค้า' };
    var data = sheet.getDataRange().getValues();
    
    var headers = data[0];
    var filteredRows = data.slice(1).filter(function(row) {
      var zip = String(row[2]).trim();
      return EXCLUDED_ZIPCODES.indexOf(zip) === -1;
    });
    return { status: 'success', data: [headers].concat(filteredRows) };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * ฟังก์ชัน: ดึงข้อมูลเป้าหมายรายได้ (Target)
 */
function getRevenueTargets() {
  try {
    var ss = SpreadsheetApp.openById(TARGET_SS_ID);
    var sheet = ss.getSheetByName('เป้าหมายรายได้');
    if (!sheet) return { status: 'error', message: 'ไม่พบชีต เป้าหมายรายได้' };
    var data = sheet.getDataRange().getValues();
    
    var headers = data[0];
    var filteredRows = data.slice(1).filter(function(row) {
      var zip = String(row[2]).trim();
      return EXCLUDED_ZIPCODES.indexOf(zip) === -1;
    });
    return { status: 'success', data: [headers].concat(filteredRows) };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

// ==========================================
// 📦 SECTION: Code_DropOff.js
// ==========================================

/**
 * ฟังก์ชัน: ดึงข้อมูลค่าใช้จ่ายของที่ทำการ
 */
function getExpensesData() {
  try {
    var ss = SpreadsheetApp.openById(TARGET_SS_ID);
    var sheet = ss.getSheetByName('เป้าหมายรายได้');
    if (!sheet) return { status: 'error', message: 'ไม่พบชีต เป้าหมายรายได้' };
    
    var data = sheet.getDataRange().getValues();
    var expensesMap = {};
    
    // Header คือ data[0] (ปี, เดือน, รหัสไปรษณีย์, ที่ทำการ, เป้าหมาย, ค่าใช้จ่ายทีมขาย)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[1] && !row[2]) continue;
      
      var year = String(row[0]).trim();
      var month = String(row[1]).trim();
      var zipcode = String(row[2]).trim();
      var target = parseFloat(String(row[4]).replace(/,/g, '')) || 0;
      var expenses = parseFloat(String(row[5]).replace(/,/g, '')) || 0;
      
      if (!expensesMap[zipcode]) {
        expensesMap[zipcode] = {};
      }
      
      var key = month + "_" + year;
      expensesMap[zipcode][key] = { target: target, expenses: expenses };
    }
    
    return { status: 'success', data: expensesMap };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);
    return { status: 'error', message: e.toString() };
  }
}

// ==========================================
// ระบบจัดการอัปโหลดข้อมูล DPost (Tiktok DropOff)
// ==========================================

function processDropOffExcelData(groupedJsonString) {
  try {
    const groupedDataArray = JSON.parse(groupedJsonString);
    if (!groupedDataArray || groupedDataArray.length === 0) return { status: 'error', message: 'ไม่มีข้อมูลให้ประมวลผล' };

    let totalUniqueBarcodes = 0;

    // ==========================================
    // 2. ดึงข้อมูลจากชีต "ที่ทำการ" เพื่อหา ชื่อ ปณ. และ จังหวัด
    // ==========================================
    const REF_SS_ID = '1uo2vKwNI--USPCLg_jZNmWWxbcV8aHheem4ZAfobIg4';
    const refSheet = SpreadsheetApp.openById(REF_SS_ID).getSheetByName('ที่ทำการ');
    const locationMap = {};

    if (refSheet) {
      const refData = refSheet.getDataRange().getValues();
      for (let p = 1; p < refData.length; p++) {
        let code = String(refData[p][0]).trim();
        if (code.length > 0 && code.length < 5) code = code.padStart(5, '0');

        // ดึงชื่อ "จังหวัด" จากคอลัมน์ B (Index 1)
        let province = String(refData[p][1] || '').trim();

        // ดึงชื่อ "ชื่อ ปณ." จากคอลัมน์ C (Index 2)
        let officeNameColC = String(refData[p][2]).trim();

        // นำรหัสไปรษณีย์ มาต่อกับ ชื่อที่ทำการ (เพื่อให้มีรหัสไปรษณีย์นำหน้า)
        let fullName = "";
        if (officeNameColC !== "") {
          fullName = code + " - " + officeNameColC;
        } else {
          // ถ้าคอลัมน์ C ว่าง ให้ใช้ชื่อจังหวัดแทนชั่วคราว
          fullName = code + " - " + province;
        }

        locationMap[code] = {
          fullName: fullName,
          province: province
        };
      }
    }

    // ==========================================
    // 3. เตรียมเปรียบเทียบและอัปเดตชีต "Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)"
    // ==========================================
    const TARGET_SS_ID = '1k_YWc5TYbeiviinIJCJt4Aj94jAbuf4MB9qYMKsuVLs';
    const ssTarget = SpreadsheetApp.openById(TARGET_SS_ID);
    const targetSheet = ssTarget.getSheetByName('Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)');
    if (!targetSheet) return { status: 'error', message: 'ไม่พบชีตชื่อเป้าหมาย "Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)"' };

    // ==========================================
    // 3.1. ดึงกลุ่มประเภทจาก "รายชื่อบริการ"
    // ==========================================
    const srvSheet = ssTarget.getSheetByName('รายชื่อบริการ');
    const srvMap = new Map();
    if (srvSheet) {
      const srvData = srvSheet.getRange(2, 3, srvSheet.getLastRow() - 1, 3).getValues();
      for (let s = 0; s < srvData.length; s++) {
        let itemName = String(srvData[s][0]).trim();
        if (itemName !== "") {
          srvMap.set(itemName, {
            group: String(srvData[s][1]).trim(),
            type: String(srvData[s][2]).trim()
          });
        }
      }
    }

    const targetData = targetSheet.getDataRange().getValues();
    const existingMap = {};

    // โหลดข้อมูลเก่ามาเช็ค (แถวแรกเป็น Header เริ่มที่ i=1)
    for (let i = 1; i < targetData.length; i++) {
      const row = targetData[i];
      const rOffice = String(row[1]).trim();     // B: ชื่อ ปณ.
      const rCustomer = String(row[3]).trim();   // D: รายชื่อลูกค้า
      const rMonth = String(row[6]).trim();      // G: เดือน
      const rMeasure = String(row[7]).trim();    // H: ชื่อการวัดผล
      const rYear = String(row[9]).trim();       // J: ปี

      const key = `${rOffice}_${rCustomer}_${rMonth}_${rYear}`;

      if (!existingMap[key]) existingMap[key] = { rowIndexQty: -1, rowIndexRev: -1, currentQty: 0 };

      if (rMeasure === 'จำนวนชิ้นงาน') {
        existingMap[key].rowIndexQty = i + 1; // +1 เพราะ Index ใน Sheet เริ่มที่ 1
        existingMap[key].currentQty = parseFloat(row[8]) || 0; // I: จำนวนชิ้นงาน
      } else if (rMeasure === 'รายได้รวม') {
        existingMap[key].rowIndexRev = i + 1;
      }
    }

    let rowsToAppend = [];
    let updatedCount = 0;
    let newCount = 0;
    let unmatchedServices = new Set();

    // ทำการ Loop ข้อมูลที่จัดกลุ่มมาแล้ว เพื่อเพิ่ม/อัปเดต ลงชีต
    groupedDataArray.forEach(group => {
      // ป้องกันปัญหาข้อมูลเดือนว่างเปล่า
      if (!group.month || String(group.month).trim() === "") return;
      if (!group.year || String(group.year).trim() === "") return;

      const uniqueQty = group.uniqueQty;
      totalUniqueBarcodes += uniqueQty;

      // นำรายได้รวมที่คำนวณมาจากหน้าเว็บ (ผลรวมของ EMS_PRICE) มาใช้งาน
      const calculatedRevenue = group.totalRevenue || 0;

      const locInfo = locationMap[group.postCode] || { fullName: group.postCode, province: "" };
      const matchKey = `${locInfo.fullName}_${group.vendorName}_${group.month}_${group.year}`;
      const existingInfo = existingMap[matchKey];

      let mappedServiceGroup = "e-Parcel"; // Default
      let mappedServiceType = "";
      const sInfo = srvMap.get(String(group.vendorName).trim());
      if (sInfo) {
        if (sInfo.group) mappedServiceGroup = sInfo.group;
        if (sInfo.type) mappedServiceType = sInfo.type;
      } else if (String(group.vendorName).trim() !== "") {
        unmatchedServices.add(String(group.vendorName).trim());
      }

      if (existingInfo && existingInfo.rowIndexQty !== -1) {
        if (uniqueQty >= existingInfo.currentQty) {
          targetSheet.getRange(existingInfo.rowIndexQty, 9).setValue(uniqueQty);
          targetSheet.getRange(existingInfo.rowIndexQty, 12, 1, 2).setValues([[mappedServiceGroup, mappedServiceType]]);

          if (existingInfo.rowIndexRev !== -1) {
            targetSheet.getRange(existingInfo.rowIndexRev, 9).setValue(calculatedRevenue);
            targetSheet.getRange(existingInfo.rowIndexRev, 12, 1, 2).setValues([[mappedServiceGroup, mappedServiceType]]);
          } else {
            rowsToAppend.push([
              group.region, locInfo.fullName, "5.E-PARCEL", group.vendorName, "", "ไม่เป็นสมาชิก", group.month, "รายได้รวม", calculatedRevenue, group.year, locInfo.province, mappedServiceGroup, mappedServiceType
            ]);
          }
          updatedCount++;
        }
      }
      else {
        // บรรทัดที่ 1: จำนวนชิ้นงาน
        rowsToAppend.push([
          group.region,           // A
          locInfo.fullName,       // B
          "5.E-PARCEL",           // C
          group.vendorName,       // D
          "",                     // E
          "ไม่เป็นสมาชิก",            // F
          group.month,            // G
          "จำนวนชิ้นงาน",            // H
          uniqueQty,              // I
          group.year,             // J
          locInfo.province,       // K
          mappedServiceGroup,     // L
          mappedServiceType       // M
        ]);

        // บรรทัดที่ 2: รายได้รวม
        rowsToAppend.push([
          group.region,
          locInfo.fullName,
          "5.E-PARCEL",
          group.vendorName,
          "",
          "ไม่เป็นสมาชิก",
          group.month,
          "รายได้รวม",
          calculatedRevenue,
          group.year,
          locInfo.province,
          mappedServiceGroup,
          mappedServiceType
        ]);
        newCount++;
      }
    });

    if (rowsToAppend.length > 0) {
      const lastRow = targetSheet.getLastRow();
      targetSheet.getRange(lastRow + 1, 1, rowsToAppend.length, 13).setValues(rowsToAppend);
    }

    // เพิ่มรายชื่อบริการที่ยังไม่มีลงในชีต 'รายชื่อบริการ' คอลัมน์ C
    if (unmatchedServices.size > 0 && srvSheet) {
      let newServices = Array.from(unmatchedServices).map(function(srv) { return [srv]; });
      let srvLastRow = srvSheet.getLastRow();
      if (srvLastRow < 1) srvLastRow = 1;
      srvSheet.getRange(srvLastRow + 1, 3, newServices.length, 1).setValues(newServices);
    }

    return {
      status: 'success',
      totalGroups: newCount + updatedCount, // แก้ไขตรงนี้: นำการหาร 2 ออก
      totalUniqueBarcodes: totalUniqueBarcodes,
      newRowsAdded: newCount * 2,
      rowsUpdated: updatedCount * 2,
      unmatchedCount: unmatchedServices.size,
      newServicesAdded: Array.from(unmatchedServices)
    };

  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

// ==========================================
// 📦 SECTION: Code_Logistics.js
// ==========================================

// ==========================================
// ระบบนำเข้าข้อมูลกลุ่มบริการขนส่งและโลจิสติกส์ (Logistics Data) - [Optimized O(1)]
// ==========================================

/**
 * ฟังก์ชัน: ประมวลผลข้อมูล Logistics เฉพาะ A1-A14 ลงชีตเป้าหมายหลัก
 */
function processLogisticsBatch(csvChunk, selectedYear) {
  try {
    var TARGET_SS_ID = '1k_YWc5TYbeiviinIJCJt4Aj94jAbuf4MB9qYMKsuVLs';
    var ss = SpreadsheetApp.openById(TARGET_SS_ID);

    var targetSheet = ss.getSheetByName('Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)');
    if (!targetSheet) return { status: 'error', message: 'ไม่พบชีต "Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)" ในไฟล์ปลายทาง' };

    // 1. ดึงข้อมูลชีต "A1-A14" (ใช้ Set สำหรับความเร็ว O(1))
    var a14SS = SpreadsheetApp.openById('1OjtyfCAqGEqE3V6oXALf2UiKhAHHbxO4RwLSnZTvT7Q');
    var a14Sheet = a14SS.getSheetByName('A1-A14');
    var a14Set = new Set();
    if (a14Sheet) {
      var a14LastRow = a14Sheet.getLastRow();
      if (a14LastRow > 1) {
        var a14Data = a14Sheet.getRange(2, 2, a14LastRow - 1, 1).getValues();
        for (var i = 0; i < a14Data.length; i++) {
          if (a14Data[i][0] !== "") a14Set.add(String(a14Data[i][0]).trim());
        }
      }
    }

    // 2. ดึงจังหวัดจาก "ที่ทำการ" (ใช้ Map เร็วกว่า Object {})
    var refSS = SpreadsheetApp.openById(typeof SPREADSHEET_ID !== 'undefined' ? SPREADSHEET_ID : '1uo2vKwNI--USPCLg_jZNmWWxbcV8aHheem4ZAfobIg4'); // ใช้ SPREADSHEET_ID Global
    var provSheet = refSS.getSheetByName('ที่ทำการ');
    var provMap = new Map();
    if (provSheet) {
      var provData = provSheet.getRange(2, 1, provSheet.getLastRow() - 1, 2).getValues();
      for (var p = 0; p < provData.length; p++) {
        provMap.set(String(provData[p][0]).trim(), String(provData[p][1]).trim());
      }
    }

    // 3. ดึงกลุ่มประเภทจาก "รายชื่อบริการ"
    var srvSheet = ss.getSheetByName('รายชื่อบริการ');
    var srvMap = new Map();
    if (srvSheet) {
      var srvData = srvSheet.getRange(2, 3, srvSheet.getLastRow() - 1, 3).getValues();
      for (var s = 0; s < srvData.length; s++) {
        var itemName = String(srvData[s][0]).trim();
        if (itemName !== "") {
          srvMap.set(itemName, {
            group: String(srvData[s][1]).trim(),
            type: String(srvData[s][2]).trim()
          });
        }
      }
    }

    var csvData = Utilities.parseCsv(csvChunk);
    if (csvData.length <= 1) return { status: 'success', addCount: 0, updateCount: 0 };

    var lastRow = targetSheet.getLastRow();
    var existingData = [];
    var existingMap = new Map();

    // 4. สร้าง Map ข้อมูลเดิม (O(1)) และซ่อมแซมข้อมูลเก่าอัตโนมัติ
    if (lastRow > 1) {
      existingData = targetSheet.getRange(2, 1, lastRow - 1, 13).getValues();
      for (var i = 0; i < existingData.length; i++) {
        var row = existingData[i];
        
        // --- ระบบซ่อมแซมข้อมูลเก่า (Auto-Fill Column L & M) ---
        var currentItemName = String(row[2]).trim();
        var currentGroup = String(row[11]).trim();
        var currentType = String(row[12]).trim();
        
        if ((currentType === "" || currentGroup === "") && currentItemName !== "") {
            if (srvMap.has(currentItemName)) {
                var sInfo = srvMap.get(currentItemName);
                if (sInfo.group !== "" || sInfo.type !== "") {
                    existingData[i][11] = sInfo.group;
                    existingData[i][12] = sInfo.type;
                    isDataChanged = true;
                    if (minUpdateIndex === -1 || i < minUpdateIndex) minUpdateIndex = i;
                    if (maxUpdateIndex === -1 || i > maxUpdateIndex) maxUpdateIndex = i;
                }
            } else {
                unmatchedServices.add(currentItemName);
            }
        }
        var key = String(row[0]).trim() + "_" + String(row[1]).trim() + "_" + String(row[4]).trim() + "_" + String(row[6]).trim() + "_" + String(row[7]).trim() + "_" + String(row[9]).trim();
        existingMap.set(key, i);
      }
    }

    var newRows = [];
    var updateCount = 0;
    var addCount = 0;
    var isDataChanged = false;
    var selectedYearStr = String(selectedYear).trim();
    var unmatchedServices = new Set();
    var minUpdateIndex = -1;
    var maxUpdateIndex = -1;

    // 5. ลูปอ่านและตรวจสอบ CSV
    for (var i = 0; i < csvData.length; i++) {
      var csvRow = csvData[i];
      if (csvRow.length < 9) continue;

      var itemGroup = String(csvRow[2]).trim();
      var validGroups = ["2.กลุ่มบริการขนส่งและโลจีติกส์", "3.กลุ่มบริการระหว่างประเทศ", "2.กลุ่มบริการขนส่งและโลจิสติกส์"];
      if (validGroups.indexOf(itemGroup) === -1) continue;

      var memberId = String(csvRow[5]).trim();
      if (!a14Set.has(memberId)) continue;

      var area = String(csvRow[0]).trim();
      var officeNameFull = String(csvRow[1]).trim();
      var customerName = String(csvRow[3]).trim();
      var monthStr = String(csvRow[6]).trim();
      var measureName = String(csvRow[7]).trim();
      var measureValue = parseFloat(String(csvRow[8]).replace(/,/g, '')) || 0;

      var zipCodeMatch = officeNameFull.length >= 5 ? officeNameFull.substring(0, 5) : officeNameFull;
      var province = provMap.get(zipCodeMatch) || "";
      
      var mappedServiceGroup = "";
      var mappedServiceType = "";
      if (srvMap.has(itemGroup)) {
        var sInfo = srvMap.get(itemGroup);
        mappedServiceGroup = sInfo.group;
        mappedServiceType = sInfo.type;
      } else if (itemGroup !== "") {
        unmatchedServices.add(itemGroup);
      }

      var lookupKey = area + "_" + officeNameFull + "_" + memberId + "_" + monthStr + "_" + measureName + "_" + selectedYearStr;

      var rowDataToSave = [area, officeNameFull, itemGroup, customerName, memberId, "", monthStr, measureName, measureValue, selectedYearStr, province, mappedServiceGroup, mappedServiceType];

      if (existingMap.has(lookupKey)) {
        var foundIndex = existingMap.get(lookupKey);
        
        // Check if data actually changed
        var needUpdate = false;
        var existingRow = existingData[foundIndex];
        
        // Pad array if it's shorter than 13
        while (existingRow.length < 13) {
            existingRow.push("");
        }

        if (existingRow[8] !== measureValue) { existingRow[8] = measureValue; needUpdate = true; }
        if (existingRow[10] !== province) { existingRow[10] = province; needUpdate = true; }
        if (existingRow[11] !== mappedServiceGroup) { existingRow[11] = mappedServiceGroup; needUpdate = true; }
        if (existingRow[12] !== mappedServiceType) { existingRow[12] = mappedServiceType; needUpdate = true; }
        
        if (needUpdate) {
            isDataChanged = true;
            updateCount++;
            if (minUpdateIndex === -1 || foundIndex < minUpdateIndex) minUpdateIndex = foundIndex;
            if (maxUpdateIndex === -1 || foundIndex > maxUpdateIndex) maxUpdateIndex = foundIndex;
        }
      } else {
        newRows.push(rowDataToSave);
        existingData.push(rowDataToSave);
        existingMap.set(lookupKey, existingData.length - 1);
        addCount++;
      }
    }

    // 6. เขียนข้อมูลกลับ (เขียนเฉพาะส่วนที่ถูกอัปเดตเพื่อความรวดเร็ว)
    if (isDataChanged && minUpdateIndex !== -1 && maxUpdateIndex !== -1) {
      var numRowsToUpdate = maxUpdateIndex - minUpdateIndex + 1;
      var dataToWrite = existingData.slice(minUpdateIndex, maxUpdateIndex + 1);
      targetSheet.getRange(2 + minUpdateIndex, 1, numRowsToUpdate, 13).setValues(dataToWrite);
    }
    
    if (newRows.length > 0) {
      targetSheet.getRange(lastRow + 1, 1, newRows.length, 13).setValues(newRows);
    }
    
    // 7. เพิ่มรายชื่อบริการที่ยังไม่มีลงในชีต 'รายชื่อบริการ' คอลัมน์ C
    if (unmatchedServices.size > 0 && srvSheet) {
      var newServices = Array.from(unmatchedServices).map(function(srv) { return [srv]; });
      var srvLastRow = srvSheet.getLastRow();
      if (srvLastRow < 1) srvLastRow = 1;
      srvSheet.getRange(srvLastRow + 1, 3, newServices.length, 1).setValues(newServices);
    }

    return { status: 'success', addCount: addCount, updateCount: updateCount, unmatchedCount: unmatchedServices.size, newServicesAdded: Array.from(unmatchedServices) };

  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: 'Error in logistics batch: ' + e.toString() };
  }
}

/**
 * 💡 ฟังก์ชัน: ประมวลผลข้อมูลขนส่งและโลจิสติกส์ (เพิ่มเติม) ลงชีต "Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)"
 * รับข้อมูลที่จัดกลุ่มแล้วจาก Client เพื่อลดภาระเซิร์ฟเวอร์
 */
function processAddLogisticsBatch(jsonStr) {
  try {
    var data = JSON.parse(jsonStr);
    if (!data || data.length === 0) return { status: 'success', addCount: 0 };

    var TARGET_SS_ID = '1k_YWc5TYbeiviinIJCJt4Aj94jAbuf4MB9qYMKsuVLs';
    var ss = SpreadsheetApp.openById(TARGET_SS_ID);

    // 💡 เปลี่ยนปลายทางไปบันทึกที่ชีต Tableau
    var targetSheet = ss.getSheetByName('Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)');
    if (!targetSheet) {
      return { status: 'error', message: 'ไม่พบชีตเป้าหมาย "Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)"' };
    }

    // ดึงจังหวัดจาก "ที่ทำการ" (ใช้ SPREADSHEET_ID แบบ Global จาก Code_Main.gs)
    var refSS = SpreadsheetApp.openById(typeof SPREADSHEET_ID !== 'undefined' ? SPREADSHEET_ID : '1uo2vKwNI--USPCLg_jZNmWWxbcV8aHheem4ZAfobIg4');
    var provSheet = refSS.getSheetByName('ที่ทำการ');
    var provMap = new Map();
    if (provSheet) {
      var provData = provSheet.getRange(2, 1, provSheet.getLastRow() - 1, 2).getValues();
      for (var p = 0; p < provData.length; p++) {
        provMap.set(String(provData[p][0]).trim(), String(provData[p][1]).trim());
      }
    }

    // ดึงกลุ่มประเภทจาก "รายชื่อบริการ"
    var srvSheet = ss.getSheetByName('รายชื่อบริการ');
    var srvMap = new Map();
    if (srvSheet) {
      var srvData = srvSheet.getRange(2, 3, srvSheet.getLastRow() - 1, 3).getValues();
      for (var s = 0; s < srvData.length; s++) {
        var itemName = String(srvData[s][0]).trim();
        if (itemName !== "") {
          srvMap.set(itemName, {
            group: String(srvData[s][1]).trim(),
            type: String(srvData[s][2]).trim()
          });
        }
      }
    }

    var lastRow = targetSheet.getLastRow();
    var existingData = [];
    var existingMap = new Map();

    // สร้าง Map ข้อมูลเดิม (O(1)) เพื่อตรวจสอบและอัปเดตทับ
    if (lastRow > 1) {
      existingData = targetSheet.getRange(2, 1, lastRow - 1, 13).getValues();
      for (var i = 0; i < existingData.length; i++) {
        var rowData = existingData[i];
        // Key: เขต_รหัสปณ_กลุ่มบริการ_รายการ_เดือน_ชื่อการวัดผล_ปี
        var key = String(rowData[0]).trim() + "_" + String(rowData[1]).trim() + "_" + String(rowData[2]).trim() + "_" + String(rowData[3]).trim() + "_" + String(rowData[6]).trim() + "_" + String(rowData[7]).trim() + "_" + String(rowData[9]).trim();
        existingMap.set(key, i);
      }
    }

    var newRows = [];
    var updateCount = 0;
    var addCount = 0;
    var isDataChanged = false;
    var unmatchedServices = new Set();

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      // ตัดรหัส ปณ. ให้เหลือแค่ 5 หลักแรก เพื่อใช้ค้นหาใน Map
      var zip5 = String(row.zip).length >= 5 ? String(row.zip).substring(0, 5) : String(row.zip);
      var province = provMap.get(zip5) || "";

      var mappedServiceGroup = "";
      var mappedServiceType = "";
      var sInfo = srvMap.get(String(row.item).trim());
      if (sInfo) {
        mappedServiceGroup = sInfo.group;
        mappedServiceType = sInfo.type;
      } else if (String(row.item).trim() !== "") {
        unmatchedServices.add(String(row.item).trim());
      }

      var area = String(row.khet).trim();
      var officeNameFull = String(row.zip + " - " + row.pno).trim();
      var itemGroup = String(row.srvGroup).trim();
      var customerName = String(row.item).trim();
      var monthStr = String(row.monthName).trim();
      var measureName = String(row.measure).trim();
      var measureValue = row.totalVal;
      var selectedYearStr = String(row.yearCE).trim();

      var lookupKey = area + "_" + officeNameFull + "_" + itemGroup + "_" + customerName + "_" + monthStr + "_" + measureName + "_" + selectedYearStr;

      // เรียงลำดับข้อมูลตามเงื่อนไขให้ตรงกับโครงสร้างคอลัมน์ A-L ของชีตเป้าหมาย
      var rowDataToSave = [
        area,                        // คอลัมน์ A (เขต)
        officeNameFull,              // คอลัมน์ B (รหัสไปรษณีย์ - ปณ)
        itemGroup,                   // คอลัมน์ C (กลุ่มบริการ)
        customerName,                // คอลัมน์ D (รายการ/ชื่อลูกค้า)
        "",                          // คอลัมน์ E (รหัสสมาชิก - ว่าง)
        "",                          // คอลัมน์ F (ระดับสมาชิก - ว่าง)
        monthStr,                    // คอลัมน์ G (เดือนตัวหนังสือเต็ม)
        measureName,                 // คอลัมน์ H (ชื่อการวัดผล)
        measureValue,                // คอลัมน์ I (รวมยอด)
        selectedYearStr,             // คอลัมน์ J (ปี ค.ศ.)
        province,                    // คอลัมน์ K (จังหวัด)
        mappedServiceGroup,          // คอลัมน์ L (กลุ่มประเภท)
        mappedServiceType            // คอลัมน์ M (ประเภท)
      ];

      if (existingMap.has(lookupKey)) {
        var foundIndex = existingMap.get(lookupKey);
        existingData[foundIndex] = rowDataToSave;
        isDataChanged = true;
        updateCount++;
      } else {
        newRows.push(rowDataToSave);
        existingData.push(rowDataToSave);
        existingMap.set(lookupKey, existingData.length - 1);
        addCount++;
      }
    }

    // เขียนข้อมูลกลับ
    if (isDataChanged) {
      targetSheet.getRange(2, 1, existingData.length, 13).setValues(existingData);
    } else if (newRows.length > 0) {
      targetSheet.getRange(lastRow + 1, 1, newRows.length, 13).setValues(newRows);
    }

    // เพิ่มรายชื่อบริการที่ยังไม่มีลงในชีต 'รายชื่อบริการ' คอลัมน์ C
    if (unmatchedServices.size > 0 && srvSheet) {
      var newServices = Array.from(unmatchedServices).map(function(srv) { return [srv]; });
      var srvLastRow = srvSheet.getLastRow();
      if (srvLastRow < 1) srvLastRow = 1;
      srvSheet.getRange(srvLastRow + 1, 3, newServices.length, 1).setValues(newServices);
    }

    return { status: 'success', addCount: addCount, updateCount: updateCount, unmatchedCount: unmatchedServices.size, newServicesAdded: Array.from(unmatchedServices) };

  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: 'Error in processAddLogisticsBatch: ' + e.toString() };
  }
}

// ==========================================
// 📦 SECTION: Code_PK.js
// ==========================================

// ==========================================
// ระบบจัดการข้อมูลลูกค้า ปก. (PK Customers)
// ==========================================

/**
 * ฟังก์ชัน: อัปเดตข้อมูลไปยังชีตลูกค้า ปก. อัตโนมัติเมื่อมีการบันทึกการเข้าพบ
 */
function updatePKSheet(entrepreneurName, customerGroup, lostReason) {
  if (!entrepreneurName) return;
  try {
    var pkSS = SpreadsheetApp.openById(PK_SS_ID);
    var pkSheet = pkSS.getSheetByName('ปก.');
    if (!pkSheet) return;

    var groups = customerGroup ? customerGroup.split(',') : [];
    var mappedGroups = [];
    for (var i = 0; i < groups.length; i++) {
      var trimmed = groups[i].trim();
      if (trimmed === 'ไปรษณียภัณฑ์/การเงิน/ค้าปลีก (ขป.)') { mappedGroups.push('ธุรกิจไปรษณีย์'); }
      else if (trimmed === 'e-Commerce (ขล.)') { mappedGroups.push('ธุรกิจขนส่งและโลจิสติกส์'); }
      else if (trimmed === 'ระหว่างประเทศ (ขร.)') { mappedGroups.push('ธุรกิจระหว่างประเทศ'); }
      else if (trimmed === 'Fuze Post') { mappedGroups.push('ฟิ้วซ์'); }
    }
    var finalGroupStr = mappedGroups.join(', ');
    var currentDateTime = new Date();

    var data = pkSheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][5]).trim() === String(entrepreneurName).trim()) {
        if (finalGroupStr !== "") {
          pkSheet.getRange(i + 1, 20).setValue(finalGroupStr);
        }
        if (lostReason !== "") {
          pkSheet.getRange(i + 1, 21).setValue(lostReason);
        }
        pkSheet.getRange(i + 1, 22).setValue(currentDateTime);
      }
    }
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    console.error("PK Sheet Update Error: " + e.message);
  }
}

/**
 * ฟังก์ชัน: ดึงข้อมูลรายชื่อลูกค้า ปก. พร้อมเช็คสถานะการอัปเดต (สำหรับฟอร์ม)
 */
function getInactiveCustomersPK() {
  try {
    var ss = SpreadsheetApp.openById(PK_SS_ID);
    var sheet = ss.getSheetByName('ปก.');
    if (!sheet) return { status: 'error', message: 'ไม่พบชีต "ปก."' };

    var data = sheet.getDataRange().getDisplayValues();
    var result = [];

    for (var i = 1; i < data.length; i++) {
      var accountName = String(data[i][5]).trim(); // F: Account Name
      if (accountName !== "") {
        var zipcode = String(data[i][4]).trim();     // E: Zip Code
        if (EXCLUDED_ZIPCODES.indexOf(zipcode) !== -1) { continue; }
        var updateDate = String(data[i][21]).trim(); // V: วันเวลาที่อัปเดท
        result.push({
          name: accountName,
          zipcode: zipcode,
          memberCode: String(data[i][11]).trim(), // L: Member Code
          phone: String(data[i][17]).trim(),      // R: Phone
          isUpdated: updateDate !== ""            // สถานะ: อัปเดตแล้วหรือไม่
        });
      }
    }
    return { status: 'success', data: result };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * ฟังก์ชัน: ดึงข้อมูลลูกค้า ปก. ทั้งหมดเพื่อแสดงในหน้า Admin Dashboard
 */
function getPKDashboardData() {
  try {
    var ss = SpreadsheetApp.openById(PK_SS_ID);
    var sheet = ss.getSheetByName('ปก.');
    if (!sheet) return { status: 'error', message: 'ไม่พบชีต ปก.' };

    var data = sheet.getDataRange().getDisplayValues();
    var result = [];

    // เริ่มที่ index 1 ข้าม Header
    for (var i = 1; i < data.length; i++) {
      var accName = String(data[i][5]).trim(); // คอลัมน์ F: Account Name
      var updateDateStr = String(data[i][21]).trim(); // คอลัมน์ V: วันเวลาที่อัปเดต

      // ดึงทุกรายการที่มีชื่อลูกค้า (ไม่สนใจว่าคอลัมน์ V จะมีข้อมูลหรือไม่)
      if (accName !== "") {
        var zipcode = String(data[i][4]).trim();    // คอลัมน์ E: Zip Code
        if (EXCLUDED_ZIPCODES.indexOf(zipcode) !== -1) { continue; }
        result.push({
          row: i + 1,                            // เลขแถวสำหรับอัปเดต W
          zipcode: zipcode,    // คอลัมน์ E: Zip Code
          accName: accName,                      // คอลัมน์ F: Account Name
          memberCode: String(data[i][11]).trim(),// คอลัมน์ L: Member Code
          phone: String(data[i][17]).trim(),     // คอลัมน์ R: Phone
          group: String(data[i][19]).trim(),     // คอลัมน์ T: กลุ่มบริการ
          reason: String(data[i][20]).trim(),    // คอลัมน์ U: สาเหตุที่ยอดขายลดลง
          updateDate: updateDateStr,             // คอลัมน์ V: วันเวลาที่อัปเดต
          status: String(data[i][22]).trim(),    // คอลัมน์ W: สถานะการบันทึกข้อมูล
          prov: String(data[i][2]).trim(),       // C: Province 
          poName: String(data[i][3]).trim(),     // D: Post Office Name
          tier: String(data[i][6]).trim(),       // G: Membership Tier 
          lastTrans: String(data[i][12]).trim(), // M: Last Transaction Date 
          email: String(data[i][18]).trim()      // S: Email 
        });
      }
    }

    // เรียงลำดับ: 
    // 1. "รอตรวจสอบ" (0) -> "ยืนยันแล้ว" (1) -> "ยังไม่มีข้อมูล" (2)
    // 2. ถ้าสถานะเหมือนกัน เรียงตาม Zip Code (E) น้อยไปมาก
    // 3. ถ้า Zip Code เหมือนกัน เรียงตาม Update Date (V)
    result.sort(function (a, b) {
      var getState = function (item) {
        if (item.status !== "") return 1; // ยืนยันแล้ว
        if (item.updateDate !== "") return 0; // รอตรวจสอบ
        return 2; // ยังไม่มีข้อมูล
      };

      var stateA = getState(a);
      var stateB = getState(b);

      if (stateA !== stateB) {
        return stateA - stateB;
      }

      var zipA = parseInt(a.zipcode) || 0;
      var zipB = parseInt(b.zipcode) || 0;
      if (zipA !== zipB) return zipA - zipB;

      return a.updateDate.localeCompare(b.updateDate);
    });

    return { status: 'success', data: result };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * ฟังก์ชัน: ยืนยันการบันทึกข้อมูลลูกค้า ปก.
 */
function confirmPKCustomer(rowIndex) {
  try {
    var ss = SpreadsheetApp.openById(PK_SS_ID);
    var sheet = ss.getSheetByName('ปก.');

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    var statusMessage = "ยืนยันแล้ว (" + timestamp + ")";

    sheet.getRange(rowIndex, 23).setValue(statusMessage); // คอลัมน์ W

    return { status: 'success', newStatus: statusMessage };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * ฟังก์ชัน: ยกเลิกการยืนยันข้อมูลลูกค้า ปก.
 */
function undoPKCustomer(rowIndex) {
  try {
    var ss = SpreadsheetApp.openById(PK_SS_ID);
    var sheet = ss.getSheetByName('ปก.');

    sheet.getRange(rowIndex, 23).clearContent(); // ลบข้อมูลคอลัมน์ W

    return { status: 'success' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

// ==========================================
// 📦 SECTION: Code_Evaluation.js
// ==========================================

// ==========================================
// ระบบจัดการดึงคำถามและบันทึกคะแนนประเมินการวัดผล
// ==========================================

// ตัวแปร ID ฐานข้อมูล (ป้องกันการชนกับไฟล์อื่น)
var EVAL_DB_ID = '1JihASW_Fg3SGw0e4q1QSLSF5sKlywu5QF5kqVIJcGmM';

/**
 * ดึงรายการตัวเลือกจากชีต "ตัวเลือกประเมินวัดผล" คอลัมน์ A
 */
function getEvaluationOptions() {
  try {
    var ss = SpreadsheetApp.openById(EVAL_DB_ID);
    var sheet = ss.getSheetByName('ตัวเลือกประเมินวัดผล');
    if (!sheet) return { status: 'error', message: 'ไม่พบชีต ตัวเลือกประเมินวัดผล' };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { status: 'success', data: [] };

    var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var options = [];

    for (var i = 0; i < data.length; i++) {
      var val = String(data[i][0]).trim();
      if (val !== "") {
        options.push(val);
      }
    }

    return { status: 'success', data: options };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * ดึงรายการคำถามจาก Column A (เริ่มแถว 2) ของชีตที่กำหนด
 */
function getEvaluationQuestions(sheetName) {
  try {
    var ss = SpreadsheetApp.openById(EVAL_DB_ID);
    var sheet = ss.getSheetByName(sheetName);

    // ค้นหาแบบ Case Insensitive
    if (!sheet) {
      var allSheets = ss.getSheets();
      var targetName = String(sheetName).trim().toLowerCase();
      for (var i = 0; i < allSheets.length; i++) {
        if (allSheets[i].getName().trim().toLowerCase() === targetName) {
          sheet = allSheets[i];
          break;
        }
      }
    }

    if (!sheet) return { status: 'error', message: 'ไม่พบชีต "' + sheetName + '" ในฐานข้อมูล' };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { status: 'success', data: [], actualSheetName: sheet.getName() };

    var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var questions = [];

    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() !== "") {
        questions.push({ index: i, text: String(data[i][0]).trim() });
      }
    }

    return { status: 'success', data: questions, actualSheetName: sheet.getName() };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * รับค่าคะแนนมาบวกเพิ่มใน Column B (คะแนนรวม) และ Column C (จำนวนครั้ง) ในชีตที่กำหนด
 */
function submitEvaluationScores(scoresData, sheetName) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    var ss = SpreadsheetApp.openById(EVAL_DB_ID);
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return { status: 'error', message: 'ไม่พบชีตเป้าหมาย "' + sheetName + '"' };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { status: 'error', message: 'ไม่มีคำถามในระบบ' };

    var currentData = sheet.getRange(2, 2, lastRow - 1, 2).getValues();

    for (var i = 0; i < scoresData.length; i++) {
      var idx = scoresData[i].index;
      var addScore = parseInt(scoresData[i].score) || 0;

      if (idx >= 0 && idx < currentData.length) {
        var currentScore = parseFloat(currentData[idx][0]) || 0;
        var currentCount = parseInt(currentData[idx][1]) || 0;

        currentData[idx][0] = currentScore + addScore;
        currentData[idx][1] = currentCount + 1;
      }
    }

    sheet.getRange(2, 2, currentData.length, 2).setValues(currentData);

    return { status: 'success' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 💡 ดึงสรุปคะแนนประเมินเพื่อแสดงบน Popup 
 * ดึงจาก คอลัมน์ A (หัวข้อ), B (คะแนน), C (จำนวนครั้ง)
 */
function getEvaluationSummary(sheetName) {
  try {
    var ss = SpreadsheetApp.openById(EVAL_DB_ID);
    var sheet = ss.getSheetByName(sheetName);

    // ค้นหาแบบยืดหยุ่น ป้องกันชื่อเว้นวรรคไม่ตรง
    if (!sheet) {
      var allSheets = ss.getSheets();
      var targetName = String(sheetName).trim().toLowerCase();
      for (var i = 0; i < allSheets.length; i++) {
        if (allSheets[i].getName().trim().toLowerCase() === targetName) {
          sheet = allSheets[i];
          break;
        }
      }
    }

    if (!sheet) return { status: 'error', message: 'ไม่พบชีตเป้าหมาย: ' + sheetName };

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { status: 'success', data: [], totalEvaluators: 0, sheetName: sheet.getName() };

    // ใช้ getDisplayValues เพื่อป้องกันบั๊กหากในชีตมีสูตร
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
    var summary = [];
    var maxCount = 0;

    for (var i = 0; i < data.length; i++) {
      var qText = String(data[i][0]).trim();
      var score = parseFloat(String(data[i][1]).replace(/,/g, '')) || 0;
      var count = parseInt(String(data[i][2]).replace(/,/g, '')) || 0;

      // แม้ว่าจะไม่มีการพิมพ์คำถาม แต่ถ้ามีช่องคะแนนอยู่ก็จะถูกดึงมาคำนวณ
      if (qText !== "" || count > 0) {
        if (qText === "") qText = "คำถามข้อที่ " + (i + 1);
        if (count > maxCount) maxCount = count;

        var avg = count > 0 ? (score / count).toFixed(2) : "0.00";

        summary.push({
          question: qText,
          avgScore: avg,
          count: count
        });
      }
    }

    return { status: 'success', data: summary, totalEvaluators: maxCount, sheetName: sheet.getName() };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

// ==========================================
// 📦 SECTION: Code_Services.js
// ==========================================

/**
 * ไฟล์จัดการ API ฝั่ง Backend สำหรับดึงข้อมูลรายการบริการ (Services)
 */

// 💡 [ปรับปรุงแล้ว] ฟังก์ชัน getServicesList, addRecommendedService, และ deleteRecommendedService 
// ถูกย้ายไปใช้เวอร์ชันที่มีฟังก์ชันการทำงานขั้นสูงกว่า (รองรับ Edit/Sort) ในส่วนของ Code_Settings.js ด้านล่าง เพื่อลดความซ้ำซ้อนของโค้ด


/**
 * 💡 ฟังก์ชันบันทึกและดึงยอดผู้เข้าชม (Visitor Counter)
 * อ้างอิง Sheet: "จำนวนครั้งผู้เข้าใช้งาน" คอลัมน์ A2
 */
function incrementVisitorCount() {
  try {
    // ใช้ตัวแปร SERVICES_SS_ID ซึ่งตรงกับ ID ที่กำหนดไว้แล้วในระบบ
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('จำนวนครั้งผู้เข้าใช้งาน');

    if (!sheet) {
      sheet = ss.insertSheet('จำนวนครั้งผู้เข้าใช้งาน');
      sheet.getRange('A1').setValue('จำนวนผู้เข้าชม');
      sheet.getRange('A2').setValue(1);
      return { status: 'success', count: 1 };
    }

    var range = sheet.getRange('A2');
    var currentCount = parseInt(range.getValue()) || 0;
    var newCount = currentCount + 1;

    range.setValue(newCount);

    return { status: 'success', count: newCount };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

// ==========================================
// 📦 SECTION: Code_RatePrice.js
// ==========================================

// ==========================================
// API ดึงข้อมูลเรตราคาจาก Google Sheet
// ==========================================
function getRatePriceData() {
  try {
    // ID ของไฟล์ Google Sheet "เรตราคา"
    const ssId = '1q-Jx-irTuftdAKHIWn6I8v4Sun0Wuzv0oSR-MMaTdXw';
    const sheet = SpreadsheetApp.openById(ssId).getSheetByName('เรตราคา');

    if (!sheet) {
      return { status: 'error', message: 'ไม่พบหน้าชีตชื่อ "เรตราคา"' };
    }

    // ใช้ getDisplayValues เพื่อรักษารูปแบบตัวเลข (เช่น ลูกน้ำ, ทศนิยม) ให้เหมือนที่แสดงบน Sheet
    const data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) {
      return { status: 'success', data: [] };
    }

    const records = [];
    // เริ่ม Loop จากแถวที่ 2 (Index 1) เพื่อข้าม Header
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const serviceName = String(row[0]).trim(); // A: บริการ

      // ข้ามบรรทัดที่คอลัมน์ "บริการ" ว่างเปล่า
      if (!serviceName) continue;

      records.push({
        service: serviceName,
        weightStart: String(row[1] || '').trim(),      // B: ช่วงน้ำหนักเริ่มต้น
        weightEnd: String(row[2] || '').trim(),        // C: ช่วงน้ำหนักสุดท้าย
        price: String(row[3] || '').trim(),            // D: ค่าบริการ
        minItems: String(row[4] || '').trim(),         // E: ชิ้นงานขั้นต่ำ
        serviceCode: String(row[5] || '').trim(),      // F: รหัสบริการ
        condMinQty: String(row[6] || '').trim(),       // G: เงื่อนไขเพิ่มเติม (ชิ้นงานขั้นต่ำ)
        condMaxSize: String(row[7] || '').trim(),      // H: เงื่อนไขเพิ่มเติม (ขนาดอย่างสูง)
        condTime: String(row[8] || '').trim(),         // I: เงื่อนไขเพิ่มเติม (ระยะเวลา)
        condExtraCharge: String(row[9] || '').trim(),  // J: เงื่อนไขเพิ่มเติม (ค่าบริการเพิ่มเติม)
        condTimeExtension: String(row[10] || '').trim()// K: เงื่อนไขเพิ่มเติม (การขยายเวลา) 💡 เพิ่มใหม่
      });
    }

    return { status: 'success', data: records };

  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

// ==========================================
// 📦 SECTION: Code_Automations.js
// ==========================================

// ==========================================
// ระบบดึงข้อมูลลูกค้า A1-A14 และการตั้งเวลาอัตโนมัติ (Automations)
// ==========================================

/**
 * ฟังก์ชัน: ดึงรายชื่อลูกค้า EMS Package A1-A14 จาก Tableau (เฉพาะปีปัจจุบัน)
 */
function extractA1A14Customers() {
  try {
    var srcSS = SpreadsheetApp.openById('1k_YWc5TYbeiviinIJCJt4Aj94jAbuf4MB9qYMKsuVLs');
    var srcSheet = srcSS.getSheetByName('Tableau(2.ประมาณการรายได้ แยกรายลูกค้า)');
    if (!srcSheet) return { status: 'error', message: 'ไม่พบชีตต้นทาง Tableau' };
    var srcData = srcSheet.getDataRange().getValues();

    var targetSS = SpreadsheetApp.openById('1OjtyfCAqGEqE3V6oXALf2UiKhAHHbxO4RwLSnZTvT7Q');
    var targetSheet = targetSS.getSheetByName('A1-A14');
    if (!targetSheet) return { status: 'error', message: 'ไม่พบชีตปลายทาง A1-A14' };

    var targetServices = [
      "EMS ในฯ Package A1", "EMS ในฯ Package A2", "EMS ในฯ Package A3",
      "EMS ในฯ Package A4", "EMS ในฯ Package A5", "EMS ในฯ Package A6",
      "EMS ในฯ Package A7", "EMS ในฯ Package A8", "EMS ในฯ Package A9",
      "EMS ในฯ Package A10", "EMS ในฯ Package A11", "EMS ในฯ Package A12",
      "EMS ในฯ Package A13 (ECOM)", "EMS ในฯ Package A14 (ECOM)"
    ];

    var uniqueMap = {};
    var resultData = [];

    // ดึงปีปัจจุบัน (เช่น "2026")
    var currentYear = new Date().getFullYear().toString();

    for (var i = 1; i < srcData.length; i++) {
      // ตรวจสอบปีที่คอลัมน์ J (Index 9) หากไม่ใช่ปีปัจจุบันให้ข้าม
      var rowYear = String(srcData[i][9]).trim();
      if (rowYear !== currentYear) continue;

      var serviceName = String(srcData[i][2]).trim();
      var customerName = String(srcData[i][3]).trim();
      var memberId = String(srcData[i][4]).trim();

      // กรองเอาเฉพาะบริการที่กำหนด และรหัสสมาชิกต้อง "ไม่เป็นสมาชิก"
      if (targetServices.indexOf(serviceName) !== -1 && memberId !== 'ไม่เป็นสมาชิก') {
        var key = customerName + "|" + memberId;
        if (!uniqueMap[key]) {
          uniqueMap[key] = true;
          resultData.push([customerName, memberId]);
        }
      }
    }

    var lastRow = targetSheet.getLastRow();
    if (lastRow > 1) {
      targetSheet.getRange(2, 1, lastRow - 1, 2).clearContent();
    }

    if (resultData.length > 0) {
      targetSheet.getRange(2, 1, resultData.length, 2).setValues(resultData);
    }

    var updateSheet = targetSS.getSheetByName('อัปเดต');
    if (updateSheet) {
      updateSheet.getRange('A2').setValue(new Date());
    }

    return { status: 'success', count: resultData.length };

  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: 'เกิดข้อผิดพลาด: ' + e.toString() };
  }
}

/**
 * ฟังก์ชัน: เช็คเวลาอัปเดตล่าสุด
 */
function getLastUpdateDateA1A14() {
  try {
    var targetSS = SpreadsheetApp.openById('1OjtyfCAqGEqE3V6oXALf2UiKhAHHbxO4RwLSnZTvT7Q');
    var updateSheet = targetSS.getSheetByName('อัปเดต');
    if (updateSheet) {
      var dateVal = updateSheet.getRange('A2').getValue();
      if (dateVal instanceof Date) return { status: 'success', data: dateVal.toISOString() };
      else if (dateVal) return { status: 'success', data: new Date(dateVal).toISOString() };
    }
    return { status: 'error', message: 'ไม่พบข้อมูลวันที่' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * ฟังก์ชัน: ตรวจสอบสถานะ Trigger ปัจจุบัน
 */
function checkDailyTriggerA1A14() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'extractA1A14Customers') return { status: 'active' };
    }
    return { status: 'inactive' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error' };
  }
}

/**
 * ฟังก์ชัน: สร้าง Trigger ให้รันอัตโนมัติทุกวันเวลา 01:00 น.
 */
function createDailyTriggerA1A14() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'extractA1A14Customers') ScriptApp.deleteTrigger(triggers[i]);
    }
    ScriptApp.newTrigger('extractA1A14Customers').timeBased().everyDays(1).atHour(1).create();
    return { status: 'success', message: 'ตั้งเวลาดึงข้อมูลอัตโนมัติเวลา 01:00 น. สำเร็จ' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: 'เกิดข้อผิดพลาด: ' + e.toString() };
  }
}

/**
 * ฟังก์ชัน: ลบ Trigger อัตโนมัติออก
 */
function deleteDailyTriggerA1A14() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    var deleted = false;
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'extractA1A14Customers') {
        ScriptApp.deleteTrigger(triggers[i]);
        deleted = true;
      }
    }
    if (deleted) return { status: 'success', message: 'ปิดการทำงานอัตโนมัติเรียบร้อยแล้ว' };
    else return { status: 'error', message: 'ไม่พบการตั้งเวลาอัตโนมัติในระบบ' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: 'เกิดข้อผิดพลาด: ' + e.toString() };
  }
}

// ==========================================
// 📦 SECTION: Code_Settings.js
// ==========================================

// ==========================================
// ระบบการตั้งค่า (Settings & Configurations)
// ==========================================

/**
 * 1. ฟังก์ชัน: ดึงเกณฑ์ชิ้นงานขั้นต่ำจาก Google Sheets
 */
function getVolumeThresholds() {
  try {
    var ss = SpreadsheetApp.openById('1k_YWc5TYbeiviinIJCJt4Aj94jAbuf4MB9qYMKsuVLs');
    var sheet = ss.getSheetByName('จำนวนชิ้นงานขั้นต่ำ');

    if (!sheet) return { status: 'error', message: 'ไม่พบชีต "จำนวนชิ้นงานขั้นต่ำ"' };

    var data = sheet.getDataRange().getValues();
    var thresholds = {};

    for (var i = 1; i < data.length; i++) {
      var serviceName = String(data[i][0]).trim();
      var minVolume = parseFloat(data[i][1]) || 0;

      if (serviceName !== "") {
        thresholds[serviceName] = minVolume;
      }
    }

    return { status: 'success', data: thresholds };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

// ==========================================
// ระบบจัดการรูปภาพแม่แบบ (Post News Templates)
// ==========================================

/**
 * 2. ฟังก์ชัน: ดึงข้อมูลเทมเพลตทั้งหมดเพื่อไปแสดงผล
 */
function getPostNewsTemplates() {
  try {
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('Post News');

    if (!sheet) {
      sheet = ss.insertSheet('Post News');
      sheet.appendRow(['Link_Pic', 'Status', 'Name']);
      return { status: 'success', data: [] };
    }

    // อัปเดตหัวตารางหากไม่มีคอลัมน์ Name
    var header = sheet.getRange("A1:C1").getValues()[0];
    if (header[2] !== 'Name') {
      sheet.getRange("C1").setValue('Name');
    }

    var data = sheet.getDataRange().getValues();
    var templates = [];

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() !== "") {
        templates.push({
          url: String(data[i][0]).trim(),
          status: String(data[i][1]).trim(),
          name: String(data[i][2]).trim() || 'แม่แบบ ' + i
        });
      }
    }

    return { status: 'success', data: templates };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * 3. ฟังก์ชัน: เพิ่มลิงก์รูปลงใน Column A
 */
function addPostNewsTemplate(url) {
  try {
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('Post News');

    if (!sheet) {
      sheet = ss.insertSheet('Post News');
      sheet.appendRow(['Link_Pic', 'Status', 'Name']);
    }

    var data = sheet.getDataRange().getValues();
    var statusToSet = '';
    var hasUsed = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === 'Use') {
        hasUsed = true;
        break;
      }
    }

    if (!hasUsed) {
      statusToSet = 'Use';
    }

    var newName = 'แม่แบบ ' + data.length;
    sheet.appendRow([url, statusToSet, newName]);
    return { status: 'success' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * 3.5 ฟังก์ชัน: เปลี่ยนชื่อแม่แบบ
 */
function renamePostNewsTemplate(targetIndex, newName) {
  try {
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('Post News');
    var rowNum = targetIndex + 2; // +1 สำหรับ header, +1 เพราะ array index เริ่มที่ 0
    sheet.getRange(rowNum, 3).setValue(newName);
    return { status: 'success' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);
    return { status: 'error', message: e.toString() };
  }
}

/**
 * 4. ฟังก์ชัน: กำหนดรูปที่จะใช้ (ตั้งค่า 'Use' ในคอลัมน์ B)
 */
function setPostNewsTemplateActive(targetIndex) {
  try {
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('Post News');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var rowNum = i + 1;

      if (i - 1 === targetIndex) {
        sheet.getRange(rowNum, 2).setValue('Use');
        var sysSheet = ss.getSheetByName('ตั้งค่าระบบ');
        if (sysSheet) sysSheet.getRange('B1').setValue(data[i][0]);
      } else {
        sheet.getRange(rowNum, 2).setValue('');
      }
    }

    return { status: 'success' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * 5. ฟังก์ชัน: ลบเทมเพลต
 */
function deletePostNewsTemplate(targetIndex) {
  try {
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('Post News');

    var rowNumToDelete = targetIndex + 2;
    sheet.deleteRow(rowNumToDelete);

    var data = sheet.getDataRange().getValues();
    var hasUsed = false;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === 'Use') {
        hasUsed = true;
        break;
      }
    }

    if (!hasUsed && data.length > 1) {
      sheet.getRange(2, 2).setValue('Use');
      var sysSheet = ss.getSheetByName('ตั้งค่าระบบ');
      if (sysSheet) sysSheet.getRange('B1').setValue(data[1][0]);
    }

    return { status: 'success' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * 6. ฟังก์ชัน: อัปเดตฟังก์ชันเดิมที่ใช้ดึงรูปลงในหน้า PostNews ให้อิงจากคอลัมน์ B (Use)
 */
function getPostNewsBackground() {
  try {
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('Post News');
    if (!sheet) return { status: 'error', message: 'ไม่พบชีต Post News' };

    var data = sheet.getDataRange().getValues();
    var url = "";

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim() === 'Use') {
        url = data[i][0];
        break;
      }
    }

    if (!url && data.length > 1) {
      url = data[1][0];
    }

    if (!url) {
      return { status: 'error', message: 'ไม่พบลิงก์ในระบบ' };
    }

    return { status: 'success', url: url.toString().trim() };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: 'เกิดข้อผิดพลาด: ' + e.toString() };
  }
}

// ==========================================
// ระบบจัดการตัวเลือกบริการ (Service Manager)
// ==========================================

/**
 * 7. ฟังก์ชัน: ดึงรายการบริการที่แนะนำจากชีต "บริการ"
 */
function getServicesList() {
  try {
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('บริการ');
    if (!sheet) {
      sheet = ss.insertSheet('บริการ');
      sheet.appendRow(['บริการ']);
      return { status: 'success', data: [] };
    }

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return { status: 'success', data: [] };

    var data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    var services = [];

    for (var i = 0; i < data.length; i++) {
      if (data[i][0] && String(data[i][0]).trim() !== "") {
        services.push(String(data[i][0]).trim());
      }
    }

    return { status: 'success', data: services };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

/**
 * 8. ฟังก์ชัน: เพิ่มบริการใหม่
 */
function addRecommendedService(serviceName) {
  try {
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('บริการ');
    if (!sheet) {
      sheet = ss.insertSheet('บริการ');
      sheet.appendRow(['บริการ']);
    }

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === String(serviceName).trim().toLowerCase()) {
        return { status: 'error', message: 'มีบริการนี้ในระบบแล้ว' };
      }
    }

    sheet.appendRow([serviceName.trim()]);
    return { status: 'success' };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);
 return { status: 'error', message: error.toString() }; }
}

/**
 * 9. ฟังก์ชัน: แก้ไขชื่อบริการ (Edit)
 */
function editRecommendedService(rowIndex, newName) {
  try {
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('บริการ');
    if (!sheet) return { status: 'error', message: 'ไม่พบชีตบริการ' };

    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      // ตรวจสอบว่ามีชื่อใหม่ซ้ำกับรายการอื่นในระบบไหม (ไม่รวมตัวเอง)
      if (i - 1 !== rowIndex && String(data[i][0]).trim().toLowerCase() === String(newName).trim().toLowerCase()) {
        return { status: 'error', message: 'มีบริการชื่อนี้ในระบบแล้ว' };
      }
    }

    sheet.getRange(rowIndex + 2, 1).setValue(newName.trim());
    return { status: 'success' };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);
 return { status: 'error', message: error.toString() }; }
}

/**
 * 10. ฟังก์ชัน: ลบบริการ
 */
function deleteRecommendedService(rowIndex) {
  try {
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('บริการ');
    if (!sheet) return { status: 'error', message: 'ไม่พบชีตบริการ' };

    sheet.deleteRow(rowIndex + 2);
    return { status: 'success' };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);
 return { status: 'error', message: error.toString() }; }
}

/**
 * 11. ฟังก์ชัน: บันทึกรายการบริการทั้งหมดทับลงในชีต (ใช้สำหรับการสลับลำดับ)
 */
function saveFullServicesList(newArray) {
  try {
    var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
    var sheet = ss.getSheetByName('บริการ');
    if (!sheet) return { status: 'error', message: 'ไม่พบชีตบริการ' };

    // ล้างข้อมูลเก่าทั้งหมด (ตั้งแต่แถวที่ 2 เป็นต้นไป)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 1).clearContent();
    }

    // แปลงอาเรย์ 1 มิติ เป็น 2 มิติเพื่อบันทึก
    if (newArray.length > 0) {
      var rowsToSave = newArray.map(function (item) { return [item]; });
      sheet.getRange(2, 1, rowsToSave.length, 1).setValues(rowsToSave);
    }

    return { status: 'success' };
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);

    return { status: 'error', message: e.toString() };
  }
}

// ==========================================
// 📦 SECTION: Module_BigLot.html Backend Services
// ==========================================

function getBigLotProducts() {
  try {
    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);
    var sheet = ss.getSheetByName('Stock');
    if (!sheet) {
      return { status: 'error', message: 'ไม่พบชีต Stock ในฐานข้อมูล' };
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return { status: 'success', data: [] };
    }

    var products = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rawStatus = String(row[5] || '').trim();
      var statusParts = rawStatus.split(':');
      var stockStatus = String(statusParts[0] || 'In stock').trim();
      var recommendStatus = statusParts.length > 1 ? String(statusParts[1]).trim() : 'None';

      products.push({
        rowIndex: i - 1,
        code: String(row[0] || '').trim(),
        name: String(row[1] || '').trim(),
        sourceOffice: String(row[2] || '').trim(),
        price: parseFloat(row[3]) || 0,
        image: String(row[4] || '').trim(),
        status: stockStatus,
        recommend: recommendStatus
      });
    }
    return { status: 'success', data: products };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);

    return { status: 'error', message: error.toString() };
  }
}

function submitBigLotOrders(zipcode, officeName, ordersArray, originalZip, originalName) {
  try {
    if (!ordersArray || ordersArray.length === 0) {
      return { status: 'error', message: 'ไม่มีข้อมูลรายการสั่งซื้อ' };
    }

    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);
    var sheet = ss.getSheetByName('BigLot');
    if (!sheet) {
      sheet = ss.insertSheet('BigLot');
      sheet.appendRow(['timestamp', 'รหัสไปรษณีย์', 'ที่ทำการ', 'จังหวัด', 'สินค้า', 'จำนวนสินค้า', 'จำนวนเงิน', 'กำหนดวันที่ต้องการสินค้า', 'หมายเหตุ']);
    }

    var province = '-';
    try {
      var provSS = SpreadsheetApp.openById(SPREADSHEET_ID);
      var provSheet = provSS.getSheetByName('ที่ทำการ');
      if (provSheet) {
        var provData = provSheet.getDataRange().getValues();
        var searchZip = String(zipcode || '').trim();
        for (var k = 1; k < provData.length; k++) {
          if (String(provData[k][0] || '').trim() === searchZip) {
            province = String(provData[k][1] || '').trim();
            break;
          }
        }
      }
    } catch (lookupError) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(lookupError);

      console.error("Province lookup failed:", lookupError);
    }

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+7", "dd/MM/yyyy HH:mm:ss");

    // สร้างชื่อที่ทำการใหม่ หากมีการสั่งแทน
    var finalOfficeName = String(officeName || '').trim();
    if (originalZip && originalName && originalZip !== zipcode) {
      finalOfficeName += ' (สั่งแทนโดย: ' + String(originalName || '').trim() + ')';
    }

    // โหลดข้อมูลสินค้าเพื่อใช้แสดงชื่อภาษาไทยในการแจ้งเตือน LINE
    var stockSheet = ss.getSheetByName('Stock');
    var stockMap = {};
    if (stockSheet) {
      var stockData = stockSheet.getDataRange().getValues();
      for (var s = 1; s < stockData.length; s++) {
        var code = String(stockData[s][0] || '').trim();
        var name = String(stockData[s][1] || '').trim();
        stockMap[code] = name;
      }
    }

    var lineMsg = "🛒 มีรายการสั่งสินค้า Big Lot ใหม่!\n";
    lineMsg += "📍 ที่ทำการ: " + finalOfficeName + " (" + String(zipcode || '').trim() + ")\n";
    lineMsg += "จังหวัด: " + province + "\n";
    lineMsg += "⏰ วันเวลา: " + timestamp + "\n";

    var delDate = String(ordersArray[0].deliveryDate || '').trim();
    var rem = String(ordersArray[0].remark || '').trim();
    if (delDate) {
      var dParts = delDate.split('-');
      if (dParts.length === 3) delDate = dParts[2] + '/' + dParts[1] + '/' + (parseInt(dParts[0]) + 543);
      lineMsg += "📅 วันที่ต้องการ: " + delDate + "\n";
    }
    if (rem) {
      lineMsg += "💬 หมายเหตุ: " + rem + "\n";
    }

    lineMsg += "---------------------------\n";
    var grandTotal = 0;

    for (var i = 0; i < ordersArray.length; i++) {
      var item = ordersArray[i];
      var qty = parseInt(item.quantity) || 0;
      var price = parseFloat(item.price) || 0;
      var total = qty * price;
      grandTotal += total;

      sheet.appendRow([
        timestamp,
        String(zipcode || '').trim(),
        finalOfficeName,
        province,
        String(item.productCode || '').trim(),
        qty,
        total,
        String(item.deliveryDate || '').trim(),
        String(item.remark || '').trim()
      ]);

      var prodName = stockMap[item.productCode] || item.productCode;
      lineMsg += "📦 " + prodName + "\n   จำนวน: " + qty + " ชิ้น | " + total.toLocaleString() + " บาท\n";
    }

    lineMsg += "---------------------------\n";
    lineMsg += "💰 รวมเงินสุทธิ: " + grandTotal.toLocaleString() + " บาท";

    // ส่งข้อความแจ้งเตือนเข้า LINE Group
    sendBigLotLineNotification(lineMsg);

    return { status: 'success', message: 'บันทึกคำสั่งซื้อเรียบร้อยแล้ว' };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);

    return { status: 'error', message: error.toString() };
  }
}

function submitBulkBigLotOrders(productCode, productPrice, bulkOrdersArray, originalZip, originalName, deliveryDate, remark) {
  try {
    if (!bulkOrdersArray || bulkOrdersArray.length === 0) {
      return { status: 'error', message: 'ไม่มีข้อมูลรายการสั่งซื้อแบบกลุ่ม' };
    }

    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);
    var sheet = ss.getSheetByName('BigLot');
    if (!sheet) {
      sheet = ss.insertSheet('BigLot');
      sheet.appendRow(['timestamp', 'รหัสไปรษณีย์', 'ที่ทำการ', 'จังหวัด', 'สินค้า', 'จำนวนสินค้า', 'จำนวนเงิน', 'กำหนดวันที่ต้องการสินค้า', 'หมายเหตุ']);
    }

    // Load provinces map
    var provMap = {};
    try {
      var provSS = SpreadsheetApp.openById(SPREADSHEET_ID);
      var provSheet = provSS.getSheetByName('ที่ทำการ');
      if (provSheet) {
        var provData = provSheet.getDataRange().getValues();
        for (var k = 1; k < provData.length; k++) {
          var z = String(provData[k][0] || '').trim();
          var p = String(provData[k][1] || '').trim();
          if (z) provMap[z] = p;
        }
      }
    } catch (lookupError) {
      if (typeof sendErrorToLine === 'function') sendErrorToLine(lookupError);
      console.error("Province lookup failed in bulk:", lookupError);
    }

    // Load stock map for LINE name
    var stockSheet = ss.getSheetByName('Stock');
    var stockMap = {};
    if (stockSheet) {
      var stockData = stockSheet.getDataRange().getValues();
      for (var s = 1; s < stockData.length; s++) {
        var code = String(stockData[s][0] || '').trim();
        var name = String(stockData[s][1] || '').trim();
        stockMap[code] = name;
      }
    }

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+7", "dd/MM/yyyy HH:mm:ss");
    var prodName = stockMap[productCode] || productCode;
    var grandTotal = 0;
    var totalQty = 0;

    var lineMsg = "🚀 มีการสั่งสินค้า Big Lot แบบกลุ่ม!\n";
    lineMsg += "สั่งโดย: " + String(originalName || '').trim() + " (" + String(originalZip || '').trim() + ")\n";
    lineMsg += "📦 สินค้า: " + prodName + "\n";
    lineMsg += "⏰ วันเวลา: " + timestamp + "\n";

    var delDateBulk = String(deliveryDate || '').trim();
    var remBulk = String(remark || '').trim();
    if (delDateBulk) {
      var dbParts = delDateBulk.split('-');
      if (dbParts.length === 3) delDateBulk = dbParts[2] + '/' + dbParts[1] + '/' + (parseInt(dbParts[0]) + 543);
      lineMsg += "📅 วันที่ต้องการ: " + delDateBulk + "\n";
    }
    if (remBulk) {
      lineMsg += "💬 หมายเหตุ: " + remBulk + "\n";
    }

    lineMsg += "---------------------------\n";

    var linesData = [];
    var price = parseFloat(productPrice) || 0;

    for (var i = 0; i < bulkOrdersArray.length; i++) {
      var item = bulkOrdersArray[i];
      var qty = parseInt(item.quantity) || 0;
      if (qty <= 0) continue;
      
      var total = qty * price;
      grandTotal += total;
      totalQty += qty;
      
      var zip = String(item.zipcode || '').trim();
      var offName = String(item.officeName || '').trim();
      var province = provMap[zip] || '-';
      
      var finalOfficeName = offName + ' (สั่งแทนโดย: ' + String(originalName || '').trim() + ')';
      
      linesData.push([
        timestamp,
        zip,
        finalOfficeName,
        province,
        productCode,
        qty,
        total,
        String(deliveryDate || '').trim(),
        String(remark || '').trim()
      ]);
      
      lineMsg += "📍 " + offName + " | " + qty + " ชิ้น\n";
    }

    if (linesData.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, linesData.length, linesData[0].length).setValues(linesData);
    }

    lineMsg += "---------------------------\n";
    lineMsg += "รวมสั่งทั้งหมด: " + totalQty + " ชิ้น\n";
    lineMsg += "💰 รวมเงินสุทธิ: " + grandTotal.toLocaleString() + " บาท";

    sendBigLotLineNotification(lineMsg);

    return { status: 'success', message: 'บันทึกคำสั่งซื้อแบบกลุ่มเรียบร้อยแล้ว' };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);
    return { status: 'error', message: error.toString() };
  }
}

function createBigLotProduct(product) {
  try {
    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);
    var sheet = ss.getSheetByName('Stock');
    if (!sheet) {
      return { status: 'error', message: 'ไม่พบชีต Stock ในฐานข้อมูล' };
    }

    var data = sheet.getDataRange().getValues();
    var newCode = String(product.code || '').trim();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0] || '').trim().toLowerCase() === newCode.toLowerCase()) {
        return { status: 'error', message: 'รหัสสินค้านี้มีอยู่แล้วในระบบ (' + newCode + ')' };
      }
    }

    var stockStatus = String(product.status || 'In stock').trim();
    var recommendStatus = String(product.recommend || 'None').trim();
    var combinedStatus = stockStatus + ' : ' + recommendStatus;

    sheet.appendRow([
      newCode,
      String(product.name || '').trim(),
      String(product.sourceOffice || '').trim(),
      parseFloat(product.price) || 0,
      String(product.image || '').trim(),
      combinedStatus
    ]);

    return { status: 'success', message: 'เพิ่มสินค้าเรียบร้อยแล้ว' };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);

    return { status: 'error', message: error.toString() };
  }
}

function updateBigLotProduct(rowIndex, product) {
  try {
    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);
    var sheet = ss.getSheetByName('Stock');
    if (!sheet) {
      return { status: 'error', message: 'ไม่พบชีต Stock ในฐานข้อมูล' };
    }

    var rowNum = rowIndex + 2;

    var stockStatus = String(product.status || 'In stock').trim();
    var recommendStatus = String(product.recommend || 'None').trim();
    var combinedStatus = stockStatus + ' : ' + recommendStatus;

    sheet.getRange(rowNum, 1).setValue(String(product.code || '').trim());
    sheet.getRange(rowNum, 2).setValue(String(product.name || '').trim());
    sheet.getRange(rowNum, 3).setValue(String(product.sourceOffice || '').trim());
    sheet.getRange(rowNum, 4).setValue(parseFloat(product.price) || 0);
    sheet.getRange(rowNum, 5).setValue(String(product.image || '').trim());
    sheet.getRange(rowNum, 6).setValue(combinedStatus);

    return { status: 'success', message: 'แก้ไขข้อมูลสินค้าเรียบร้อยแล้ว' };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);

    return { status: 'error', message: error.toString() };
  }
}

function reorderBigLotProducts(newOrderIndexes) {
  try {
    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);
    var sheet = ss.getSheetByName('Stock');
    if (!sheet) {
      return { status: 'error', message: 'ไม่พบชีต Stock' };
    }

    var fullRange = sheet.getDataRange();
    var data = fullRange.getValues();

    if (data.length <= 1) {
      return { status: 'success' };
    }

    var header = data[0];
    var productsData = data.slice(1);

    if (!Array.isArray(newOrderIndexes) || newOrderIndexes.length !== productsData.length) {
      return { status: 'error', message: 'ข้อมูลลำดับไม่ถูกต้อง หรือมีสินค้าถูกอัปเดตระหว่างทำรายการ' };
    }

    var newData = [header];
    for (var i = 0; i < newOrderIndexes.length; i++) {
      var originalIndex = parseInt(newOrderIndexes[i]);
      if (productsData[originalIndex]) {
        newData.push(productsData[originalIndex]);
      } else {
        return { status: 'error', message: 'ข้อมูลดัชนีผิดพลาด' };
      }
    }

    // Set new data back to sheet (overwrites exactly the same dimensions)
    fullRange.setValues(newData);

    return { status: 'success' };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);
    return { status: 'error', message: error.toString() };
  }
}

function updateBigLotProductStatus(rowIndex, stockStatus, recommendStatus) {
  try {
    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);
    var sheet = ss.getSheetByName('Stock');
    if (!sheet) {
      return { status: 'error', message: 'ไม่พบชีต Stock ในฐานข้อมูล' };
    }

    var rowNum = rowIndex + 2;
    var currentRawStatus = sheet.getRange(rowNum, 6).getValue();
    var currentParts = String(currentRawStatus || 'In stock').split(':');
    
    var finalStock = stockStatus !== undefined && stockStatus !== null ? String(stockStatus).trim() : String(currentParts[0]).trim();
    var finalRecommend = recommendStatus !== undefined && recommendStatus !== null ? String(recommendStatus).trim() : (currentParts.length > 1 ? String(currentParts[1]).trim() : 'None');
    
    var combinedStatus = finalStock + ' : ' + finalRecommend;
    sheet.getRange(rowNum, 6).setValue(combinedStatus);

    return { status: 'success', message: 'อัปเดตสถานะสินค้าเรียบร้อยแล้ว' };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);

    return { status: 'error', message: error.toString() };
  }
}

function deleteBigLotProduct(rowIndex) {
  try {
    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);
    var sheet = ss.getSheetByName('Stock');
    if (!sheet) {
      return { status: 'error', message: 'ไม่พบชีต Stock ในฐานข้อมูล' };
    }

    var rowNum = rowIndex + 2;
    sheet.deleteRow(rowNum);

    return { status: 'success', message: 'ลบสินค้าเรียบร้อยแล้ว' };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);

    return { status: 'error', message: error.toString() };
  }
}

function getBigLotOrders(username, zipcode, officeName) {
  try {
    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);
    var sheet = ss.getSheetByName('BigLot');
    if (!sheet) {
      return { status: 'success', data: [] };
    }

    var data = sheet.getDataRange().getValues();

    // Helper function to robustly format dates in GAS V8 runtime
    function formatAppsScriptDate(val) {
      if (val instanceof Date) {
        return Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT+7", "dd/MM/yyyy HH:mm:ss");
      }
      return String(val || '').trim();
    }
    if (data.length <= 1) {
      return { status: 'success', data: [] };
    }

    // Get stock product names for code mapping
    var stockSheet = ss.getSheetByName('Stock');
    var stockMap = {};
    if (stockSheet) {
      var stockData = stockSheet.getDataRange().getValues();
      for (var s = 1; s < stockData.length; s++) {
        var code = String(stockData[s][0] || '').trim();
        var name = String(stockData[s][1] || '').trim();
        var image = String(stockData[s][4] || '').trim();
        stockMap[code] = { name: name, image: image };
      }
    }

    // Determine user role and filters
    var uName = String(username || '').trim();
    var uZip = String(zipcode || '').trim();
    var uOffice = String(officeName || '').trim();
    var isAdmin = uName.toLowerCase() === 'admin';

    var specialUsers = ['33000', '34000', '35000', '37000', '47000', '48000', '49000', '34010', '47010'];
    var isSpecial = specialUsers.indexOf(uName) !== -1;

    // Resolve user's province if special
    var userProvince = '';
    if (isSpecial) {
      try {
        var provSS = SpreadsheetApp.openById(SPREADSHEET_ID);
        var provSheet = provSS.getSheetByName('ที่ทำการ');
        if (provSheet) {
          var provData = provSheet.getDataRange().getValues();
          var searchZip = uZip;
          for (var k = 1; k < provData.length; k++) {
            if (String(provData[k][0] || '').trim() === searchZip) {
              userProvince = String(provData[k][1] || '').trim();
              break;
            }
          }
        }
      } catch (lookupError) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(lookupError);

        console.error("User province lookup failed in orders:", lookupError);
      }
    }

    var orders = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowZip = String(row[1] || '').trim();
      var rowOffice = String(row[2] || '').trim();
      var rowProvince = String(row[3] || '').trim();
      var rowProductCode = String(row[4] || '').trim();
      var rowQuantity = parseInt(row[5]) || 0;
      var rowTotal = parseFloat(row[6]) || 0;

      var shouldInclude = false;

      if (isAdmin) {
        shouldInclude = true; // Admin sees everything
      } else if (isSpecial) {
        // Special user sees all offices in their province
        if (userProvince && rowProvince.toLowerCase() === userProvince.toLowerCase()) {
          shouldInclude = true;
        } else if (rowZip === uZip) {
          shouldInclude = true; // Fallback to zipcode match
        }
      } else {
        // Normal user only sees their own office
        if (rowOffice.toLowerCase() === uOffice.toLowerCase()) {
          shouldInclude = true;
        }
      }

      var rowDeliveryDate = String(row[7] || '').trim();
      var rowRemark = String(row[8] || '').trim();

      if (shouldInclude) {
        orders.push({
          rowIndex: i + 1,
          timestamp: formatAppsScriptDate(row[0]),
          zipcode: rowZip,
          officeName: rowOffice,
          province: rowProvince,
          productCode: rowProductCode,
          productName: (stockMap[rowProductCode] && stockMap[rowProductCode].name) ? stockMap[rowProductCode].name : rowProductCode,
          productImage: (stockMap[rowProductCode] && stockMap[rowProductCode].image) ? stockMap[rowProductCode].image : '',
          quantity: rowQuantity,
          totalPrice: rowTotal,
          deliveryDate: rowDeliveryDate,
          remark: rowRemark
        });
      }
    }

    // Sort by timestamp descending (newest first)
    orders.reverse();

    return {
      status: 'success',
      data: orders,
      userProvince: userProvince,
      isSpecial: isSpecial,
      isAdmin: isAdmin
    };
  } catch (error) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(error);

    return { status: 'error', message: error.toString() };
  }
}

function updateBigLotOrder(rowIndex, newQuantity, newTotalPrice, newDeliveryDate, newRemark) {
  try {
    if (!rowIndex) return {status: 'error', message: 'ข้อมูลไม่ครบถ้วน'};
    
    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);
    var sheet = ss.getSheetByName('BigLot');
    if (!sheet) return {status: 'error', message: 'ไม่พบชีต BigLot'};
    
    if (rowIndex <= 1 || rowIndex > sheet.getMaxRows()) {
        return {status: 'error', message: 'แถวที่ต้องการแก้ไขไม่ถูกต้อง'};
    }
    
    // ดึงข้อมูลเดิมก่อนทำการแก้ไขเพื่อนำมาแจ้งเตือน LINE
    var rowData = sheet.getRange(rowIndex, 1, 1, 9).getValues()[0];
    var orderZip = String(rowData[1] || '').trim();
    var office = String(rowData[2] || '').trim();
    var productCode = String(rowData[4] || '').trim();
    var oldQty = parseInt(rowData[5]) || 0;
    var oldTotal = parseFloat(rowData[6]) || 0;
    var oldDate = String(rowData[7] || '').trim();
    var oldRemark = String(rowData[8] || '').trim();

    // ค้นชื่อสินค้าภาษาไทย
    var stockSheet = ss.getSheetByName('Stock');
    var prodName = productCode;
    if (stockSheet) {
      var stockData = stockSheet.getDataRange().getValues();
      for (var s = 1; s < stockData.length; s++) {
        if (String(stockData[s][0] || '').trim() === productCode) {
          prodName = String(stockData[s][1] || '').trim();
          break;
        }
      }
    }

    sheet.getRange(rowIndex, 6).setValue(newQuantity);
    sheet.getRange(rowIndex, 7).setValue(newTotalPrice);
    sheet.getRange(rowIndex, 8).setValue(String(newDeliveryDate || '').trim());
    sheet.getRange(rowIndex, 9).setValue(String(newRemark || '').trim());
    
    var lineMsg = "✏️ มีการแก้ไขรายการสั่งสินค้า Big Lot!\n";
    lineMsg += "📍 ที่ทำการ: " + office + " (" + orderZip + ")\n";
    lineMsg += "📦 สินค้า: " + prodName + "\n";
    lineMsg += "---------------------------\n";
    lineMsg += "🔢 จำนวนเดิม: " + oldQty + " ➡️ จำนวนใหม่: " + newQuantity + " ชิ้น\n";
    lineMsg += "💰 ราคารวมเดิม: " + oldTotal.toLocaleString() + " ➡️ ใหม่: " + parseFloat(newTotalPrice).toLocaleString() + " บาท\n";
    if (newDeliveryDate) lineMsg += "📅 วันที่ต้องการ: " + newDeliveryDate + "\n";
    if (newRemark) lineMsg += "💬 หมายเหตุ: " + newRemark + "\n";

    sendBigLotLineNotification(lineMsg);

    return {status: 'success', message: 'อัปเดตข้อมูลสำเร็จ'};
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);
    return {status: 'error', message: e.toString()};
  }
}

function deleteBigLotOrder(rowIndex) {
  try {
    if (!rowIndex) return {status: 'error', message: 'ข้อมูลไม่ครบถ้วน'};
    
    var ss = SpreadsheetApp.openById(BIGLOT_SS_ID);
    var sheet = ss.getSheetByName('BigLot');
    if (!sheet) return {status: 'error', message: 'ไม่พบชีต BigLot'};
    
    if (rowIndex <= 1 || rowIndex > sheet.getMaxRows()) {
        return {status: 'error', message: 'แถวที่ต้องการลบไม่ถูกต้อง'};
    }
    
    // ดึงข้อมูลก่อนลบเพื่อใช้แจ้งเตือน LINE
    var rowData = sheet.getRange(rowIndex, 1, 1, 7).getValues()[0];
    var orderZip = String(rowData[1] || '').trim();
    var office = String(rowData[2] || '').trim();
    var productCode = String(rowData[4] || '').trim();
    var qty = parseInt(rowData[5]) || 0;
    var total = parseFloat(rowData[6]) || 0;

    // ค้นชื่อสินค้าภาษาไทย
    var stockSheet = ss.getSheetByName('Stock');
    var prodName = productCode;
    if (stockSheet) {
      var stockData = stockSheet.getDataRange().getValues();
      for (var s = 1; s < stockData.length; s++) {
        if (String(stockData[s][0] || '').trim() === productCode) {
          prodName = String(stockData[s][1] || '').trim();
          break;
        }
      }
    }

    sheet.deleteRow(rowIndex);
    
    var lineMsg = "❌ ยกเลิกรายการสั่งสินค้า Big Lot!\n";
    lineMsg += "📍 ที่ทำการ: " + office + " (" + orderZip + ")\n";
    lineMsg += "📦 สินค้าที่ยกเลิก: " + prodName + "\n";
    lineMsg += "---------------------------\n";
    lineMsg += "🔢 จำนวน: " + qty + " ชิ้น\n";
    lineMsg += "💰 ราคารวม: " + total.toLocaleString() + " บาท";

    sendBigLotLineNotification(lineMsg);

    return {status: 'success', message: 'ลบข้อมูลสำเร็จ'};
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);
    return {status: 'error', message: e.toString()};
  }
}

// ==========================================
// 📦 SECTION: LINE Notify Error Reporting
// ==========================================
const LINE_CHANNEL_ACCESS_TOKEN = "V6dEZJroyfmC+bTC4w16Gv3pfcF14/a7vywuHTtRc59s+JOKAdw5UTlxR9jyv5tJQ9PL8QNNw/JOzvaHxQflFLCovzUnNdMDyNienKzcOhgd8wtkwVINcWDMujSAEwaf01UQROvHVFPDBUZIiCSOWQdB04t89/1O/w1cDnyilFU=";
const LINE_USER_ID = "Udba02d86c39dfa195baeb0e7a4328d05";

function sendErrorToLine(errorObj, contextInfo) {
  try {
    var errorMessage = errorObj && errorObj.stack ? errorObj.stack : String(errorObj);
    
    // แยกเฉพาะ Message สั้นๆ ออกมา
    var shortMessage = errorObj && errorObj.message ? errorObj.message : String(errorObj);
    
    // พยายามดึงชื่อฟังก์ชันและบรรทัดที่เกิด Error จาก Stack Trace (ถ้ามี)
    var errorLocation = "ไม่ทราบตำแหน่ง";
    if (errorObj && errorObj.stack) {
       var match = errorObj.stack.match(/at\s+([^\n]+)/);
       if (match && match[1]) {
         errorLocation = match[1].trim();
       }
    }

    var nowStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    var fullText = '🚨 พบข้อผิดพลาด Backend (THP Sales Reg.10)\n\n';
    fullText += "⏰ วัน/เวลา: " + nowStr + "\n";
    if (contextInfo) fullText += "📌 ข้อมูลเพิ่มเติม: " + contextInfo + "\n";
    fullText += "📍 ตำแหน่ง: " + errorLocation + "\n";
    fullText += "⚠️ ปัญหา: " + shortMessage + "\n\n";
    fullText += "🔍 Stack Trace เต็ม:\n" + errorMessage.substring(0, 400);

    var url = 'https://api.line.me/v2/bot/message/push';
    var payload = {
      to: LINE_USER_ID,
      messages: [{
        type: 'text',
        text: fullText
      }]
    };
    var options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(url, options);
  } catch (errLine) {
    console.error("LINE Notify Error: " + errLine.toString());
  }
}

function sendSuccessToLine(message) {
  try {
    var nowStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    var fullText = '✅ แจ้งเตือนการอัปโหลดสำเร็จ\n\n⏰ วัน/เวลา: ' + nowStr + '\n\n' + message;

    var url = 'https://api.line.me/v2/bot/message/push';
    var payload = {
      to: LINE_USER_ID,
      messages: [{ type: 'text', text: fullText }]
    };
    var options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(url, options);
  } catch (errLine) {
    console.error("LINE Notify Error: " + errLine.toString());
  }
}

/**
 * ฟังก์ชันรับ Error จากฝั่ง Frontend (หน้าเว็บ) เพื่อส่งเข้า LINE
 */
function logFrontendErrorToLine(msg, url, line, errStack, userContext, browserInfo, base64Image) {
  // ดึงชื่อเบราว์เซอร์อย่างง่าย
  var browserName = browserInfo ? browserInfo.substring(0, 45) + "..." : "N/A";
  
  var nowStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
  var errorMessage = "🛑 พบข้อผิดพลาด Frontend (หน้าเว็บ)\n\n" +
                     "⏰ วัน/เวลา: " + nowStr + "\n" +
                     "👤 ผู้ใช้งาน: " + (userContext || "ไม่ทราบ/ยังไม่ล็อกอิน") + "\n" +
                     "🌐 เบราว์เซอร์: " + browserName + "\n" +
                     "📍 ไฟล์: " + url + " (บรรทัด " + line + ")\n" +
                     "⚠️ ปัญหา: " + msg + "\n\n" +
                     "🔍 Stack Trace:\n" + (errStack ? errStack.substring(0, 400) : "N/A");
  
  var fileId = null;
  var imageUrl = null;
  var driveLink = null;
  
  if (base64Image) {
    try {
      var folder = DriveApp.getFolderById(FOLDER_ID);
      var base64Data = base64Image.split(',')[1];
      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/jpeg', 'BugReport_' + new Date().getTime() + '.jpg');
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileId = file.getId();
      imageUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
      driveLink = "https://drive.google.com/file/d/" + fileId + "/view";
      errorMessage += "\n\n📸 ดูภาพหน้าจอ: " + driveLink;
    } catch(e) {
      errorMessage += "\n\n(ไม่สามารถอัปโหลดภาพหน้าจอได้: " + e.toString() + ")";
    }
  }

  try {
    var apiUrl = 'https://api.line.me/v2/bot/message/push';
    var messages = [{ type: 'text', text: errorMessage }];
    
    // ลองส่งเป็นรูปภาพด้วย (ถ้า LINE รองรับ URL ของ Google Drive)
    if (imageUrl) {
        messages.push({ type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl });
    }
    
    var payload = {
      to: LINE_USER_ID,
      messages: messages
    };
    var options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(apiUrl, options);
    
    // ถ้าส่งรูปไม่ผ่านเพราะ URL ไม่ถูกต้อง ให้ลองส่งแค่ข้อความอย่างเดียว
    if (response.getResponseCode() !== 200 && imageUrl) {
       payload.messages = [{ type: 'text', text: errorMessage }];
       options.payload = JSON.stringify(payload);
       UrlFetchApp.fetch(apiUrl, options);
    }
  } catch (e) {
    console.error("LINE Frontend Notify Error: " + e.toString());
  }
}

/**
 * ฟังก์ชันดึงรายชื่อที่ทำการสำหรับผู้ใช้งานที่สั่งสินค้าแทน
 * @param {string} prefix - รหัสไปรษณีย์ 2 ตัวหน้า (เช่น "33") หรือ "admin"
 * @returns {Array} - [{zip: '33000', name: 'ปณ.ศรีสะเกษ'}, ...]
 */
function getOfficesForSubstitute(userLogin) {
  try {
    var provSS = SpreadsheetApp.openById(SPREADSHEET_ID);
    var provSheet = provSS.getSheetByName('ที่ทำการ');
    if (!provSheet) return { status: 'error', message: 'ไม่พบชีตที่ทำการ' };

    var data = provSheet.getDataRange().getValues();
    var offices = [];
    
    var targetProvince = "";
    if (userLogin !== 'admin') {
      for (var j = 1; j < data.length; j++) {
        if (String(data[j][0]).trim() === userLogin) {
          targetProvince = String(data[j][1]).trim();
          break;
        }
      }
    }
    
    // Skip header row (index 0)
    for (var i = 1; i < data.length; i++) {
      var zip = String(data[i][0] || '').trim();
      var prov = String(data[i][1] || '').trim();
      var name = String(data[i][2] || '').trim(); 
      if (!zip || !name) continue;
      if (EXCLUDED_ZIPCODES.indexOf(zip) !== -1) continue;
      
      var isMatch = false;
      if (userLogin === 'admin') {
        isMatch = true;
      } else if (targetProvince && prov === targetProvince) {
        isMatch = true;
      } else if (zip.substring(0, 2) === userLogin.substring(0, 2)) {
        isMatch = true;
      }
      
      if (isMatch) {
        offices.push({ zip: zip, name: name });
      }
    }
    
    // Sort offices by zip
    offices.sort(function(a, b) {
      return a.zip.localeCompare(b.zip);
    });
    
    return { status: 'success', data: offices };
  } catch(e) {
    return { status: 'error', message: e.toString() };
  }
}

// ==========================================
// 📦 SECTION: LINE OA (Messaging API) Integration
// ==========================================
const BIGLOT_LINE_ACCESS_TOKEN = "XCmEZ6CCyS7vDPqlqXgjb6o36UIZBy/L/qqTEMaCUXhtvG2MWUK0X8QjVPyHNxHSOwxyfPV9wFKFlmBjqPDpbIM4Wwvc8Q+X0RnSoWAZcb0WOFvcCDuWtZlft30ukSgN0BQbkztO1Fq33q6AEnpjGAdB04t89/1O/w1cDnyilFU=";

/**
 * ส่งข้อความ Push Message ไปยังกลุ่ม LINE
 */
function sendBigLotLineNotification(message) {
  try {
    var groupId = PropertiesService.getScriptProperties().getProperty('BIGLOT_LINE_GROUP_ID');
    if (!groupId) {
      console.warn("LINE Notification Warning: ไม่พบ Group ID ในระบบ กรุณาเชิญบอทเข้ากลุ่มก่อน");
      return;
    }

    var url = 'https://api.line.me/v2/bot/message/push';
    var payload = {
      to: groupId,
      messages: [{
        type: 'text',
        text: message
      }]
    };

    var options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + BIGLOT_LINE_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    console.log("LINE Notification Response: " + response.getContentText());
  } catch (e) {
    console.error("LINE Notification Error: " + e.toString());
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e, "ส่งแจ้งเตือน LINE BigLot ล้มเหลว");
  }
}

/**
 * LINE Webhook Handler
 * ใช้จับ Event เพื่อดึง Group ID อัตโนมัติเมื่อเชิญบอทเข้ากลุ่ม หรือเมื่อพิมพ์ .id
 */
function doPost(e) {
  try {
    var textData = e.postData.contents;
    var json = {};
    try { json = JSON.parse(textData); } catch (e) {}

    // 1. ตรวจสอบว่าเป็นการส่ง Bug Report จากหน้าเว็บ (มี action = bugReport)
    if (json && json.action === 'bugReport') {
      sendBugReportToLine(json.message, json.imageB64);
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. ถ้าไม่ใช่ ให้จัดการ LINE Webhook ปกติ
    if (!json.events || json.events.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
    }

    var event = json.events[0];
    var replyToken = event.replyToken;
    var source = event.source || {};
    var type = event.type;

    // หา Group ID / Room ID / User ID
    var targetId = source.groupId || source.roomId || source.userId;

    if (targetId) {
      // 1. ตรวจพบการเข้าร่วมกลุ่ม (Join Event)
      if (type === 'join' && source.groupId) {
        PropertiesService.getScriptProperties().setProperty('BIGLOT_LINE_GROUP_ID', source.groupId);
        replyLineWebhook(replyToken, "สวัสดีครับ! ยินดีต้อนรับบอท OrderBigLot เข้าสู่กลุ่ม\n\n📌 ระบบได้บันทึก Group ID นี้เรียบร้อยแล้ว:\n" + source.groupId + "\n\nระบบจะเริ่มแจ้งเตือนรายการ Big Lot ลงในกลุ่มนี้ทันทีครับ! 🚀");
      }
      
      // 2. ตรวจพบข้อความพิมพ์สั่งคำสั่งพิเศษ (เช่นพิมพ์ .id)
      if (type === 'message' && event.message && event.message.type === 'text') {
        var text = String(event.message.text).trim().toLowerCase();
        if (text === '.id' || text === 'group id' || text === 'id') {
          PropertiesService.getScriptProperties().setProperty('BIGLOT_LINE_GROUP_ID', targetId);
          var typeName = source.groupId ? "Group ID" : (source.roomId ? "Room ID" : "User ID");
          replyLineWebhook(replyToken, "🤖 ข้อมูลการเชื่อมต่อระบบ:\n\n" + typeName + ":\n" + targetId + "\n\nสถานะ: บันทึกเข้าสู่การแจ้งเตือน Big Lot สำเร็จเรียบร้อยแล้ว! ✅");
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error("Webhook Error: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ตอบกลับข้อความผ่าน LINE Webhook Reply
 */
function replyLineWebhook(replyToken, textMessage) {
  try {
    var url = 'https://api.line.me/v2/bot/message/reply';
    var payload = {
      replyToken: replyToken,
      messages: [{
        type: 'text',
        text: textMessage
      }]
    };
    var options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + BIGLOT_LINE_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    console.error("LINE Reply Error: " + e.toString());
  }
}

/**
 * ส่งภาพแคปหน้าจอและข้อความ Error ไปที่ LINE เดิม (LINE OA)
 */
function sendBugReportToLine(message, base64Image) {
  try {
    var fileUrl = "";
    
    // แปลงรูปภาพจาก Base64 เป็น Blob และบันทึกลง Google Drive
    if (base64Image) {
      try {
        var base64Data = base64Image.indexOf(',') !== -1 ? base64Image.split(',')[1] : base64Image;
        var imageBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png', 'screenshot_bug_' + new Date().getTime() + '.png');
        
        var folderId = "15mVFyzJZ56Iza5xdwFbKoJfFBJWof96V";
        var folder = DriveApp.getFolderById(folderId);
        var file = folder.createFile(imageBlob);
        // file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
        
        // --- เริ่มต้นระบบลบไฟล์เก่าอัตโนมัติ (อายุเกิน 6 เดือน) ---
        try {
          // คำนวณวันที่ย้อนหลัง 6 เดือน
          var sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          var dateString = Utilities.formatDate(sixMonthsAgo, "GMT", "yyyy-MM-dd");
          
          // ค้นหาไฟล์ในโฟลเดอร์นี้ที่เก่ากว่า 6 เดือน
          var oldFiles = folder.searchFiles("modifiedDate < '" + dateString + "'");
          while (oldFiles.hasNext()) {
            var oldFile = oldFiles.next();
            oldFile.setTrashed(true); // ย้ายไปถังขยะ
          }
        } catch (cleanupErr) {
          console.error("Auto cleanup error: " + cleanupErr.toString());
        }
        // --- สิ้นสุดระบบลบไฟล์เก่า ---
        fileUrl = file.getUrl();
      } catch (driveErr) {
        console.error("Drive upload error: " + driveErr.toString());
        fileUrl = "(ไม่สามารถอัปโหลดรูปภาพได้: " + driveErr.toString() + ")";
      }
    }
    
    // สร้างข้อความแจ้งเตือน
    var fullText = "🛑 [แจ้งรายงานปัญหาจากผู้ใช้]\n\n";
    fullText += message + "\n";
    if (fileUrl) {
      fullText += "\n📸 ดูภาพหน้าจอ: " + fileUrl;
    }
    
    // ส่งผ่าน LINE OA (Messaging API) ตัวเดิม
    var apiUrl = 'https://api.line.me/v2/bot/message/push';
    var payload = {
      to: LINE_USER_ID,
      messages: [{ type: 'text', text: fullText }]
    };
    var options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(apiUrl, options);
    
  } catch(e) {
    console.error("sendBugReportToLine error: " + e.toString());
  }
}

/**
 * ส่งภาพสรุปการเข้าพบลูกค้าไปยัง LINE OA (Messaging API)
 */
function sendVisitSummaryImageToLine(base64Image, messageText) {
  try {
    var fileUrl = "";
    var downloadUrl = "";
    
    if (base64Image) {
      try {
        var base64Data = base64Image.indexOf(',') !== -1 ? base64Image.split(',')[1] : base64Image;
        var imageBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png', 'visit_summary_' + new Date().getTime() + '.png');
        
        var folderId = "15mVFyzJZ56Iza5xdwFbKoJfFBJWof96V";
        var folder, file;
        var maxRetries = 3;
        for (var retry = 0; retry < maxRetries; retry++) {
          try {
            folder = DriveApp.getFolderById(folderId);
            file = folder.createFile(imageBlob);
            file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
            break;
          } catch (e) {
            if (retry === maxRetries - 1) {
              throw e;
            }
            Utilities.sleep(2000);
          }
        }
        fileUrl = file.getUrl();
        downloadUrl = "https://drive.google.com/uc?export=download&id=" + file.getId();
        
        try {
          var sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          var dateString = Utilities.formatDate(sixMonthsAgo, "GMT", "yyyy-MM-dd");
          var oldFiles = folder.searchFiles("modifiedDate < '" + dateString + "'");
          while (oldFiles.hasNext()) {
            var oldFile = oldFiles.next();
            oldFile.setTrashed(true);
          }
        } catch (cleanupErr) {
          console.error("Auto cleanup error: " + cleanupErr.toString());
        }
      } catch (driveErr) {
        console.error("Drive upload error: " + driveErr.toString());
        return {status: 'error', message: 'ไม่สามารถอัปโหลดรูปภาพไปยัง Drive ได้: ' + driveErr.toString()};
      }
    }
    
    if (!fileUrl) {
      return {status: 'error', message: 'ไม่มีข้อมูลรูปภาพ'};
    }

    var fullText = messageText ? messageText : "📊 [สรุปการเข้าพบลูกค้า]\n";
    var nowStr = Utilities.formatDate(new Date(), "Asia/Bangkok", "dd/MM/yyyy HH:mm");
    fullText += "\nข้อมูลอัปเดตล่าสุด: " + nowStr + "\n";
    fullText += "ดูภาพขนาดเต็ม (หรือดาวน์โหลด): " + fileUrl;
    
    var apiUrl = 'https://api.line.me/v2/bot/message/push';
    var messages = [
      { type: 'text', text: fullText },
      { type: 'image', originalContentUrl: downloadUrl, previewImageUrl: downloadUrl }
    ];
    
    var payload = {
      to: LINE_USER_ID,
      messages: messages
    };
    var options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(apiUrl, options);
    
    if (response.getResponseCode() !== 200) {
       payload.messages = [{ type: 'text', text: fullText }];
       options.payload = JSON.stringify(payload);
       UrlFetchApp.fetch(apiUrl, options);
    }
    
    return {status: 'success'};
  } catch(e) {
    console.error("sendVisitSummaryImageToLine error: " + e.toString());
    return {status: 'error', message: e.toString()};
  }
}

// ==========================================
// 📦 SECTION: Code_Music.js
// ==========================================

function _getMusicSheet() {
  var ss = SpreadsheetApp.openById(SERVICES_SS_ID);
  var sheet = ss.getSheetByName('เพลง');
  if (!sheet) {
    sheet = ss.insertSheet('เพลง');
    sheet.appendRow(['Video ID', 'Title']);
  }
  return sheet;
}

function getMusicPlaylist() {
  try {
    var sheet = _getMusicSheet();
    var data = sheet.getDataRange().getValues();
    var playlist = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) {
        playlist.push({
          id: String(data[i][0]),
          start: 0,
          title: String(data[i][1] || 'Unknown Title')
        });
      }
    }
    return { status: 'success', data: playlist };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function extractYouTubeId(url) {
  var match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  return (match && match[1]) ? match[1] : url; // fallback to full string if not found (maybe they just entered the ID)
}

function getYouTubeTitle(videoId) {
  try {
    var url = "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=" + videoId + "&format=json";
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() == 200) {
      var json = JSON.parse(response.getContentText());
      return json.title;
    }
  } catch (e) {
    console.error("Error fetching YouTube title: " + e.toString());
  }
  return "";
}

function addMusicTrack(url, title) {
  try {
    var videoId = extractYouTubeId(url);
    if (!videoId) return { status: 'error', message: 'รูปแบบ URL ไม่ถูกต้อง' };
    
    if (!title || title.trim() === '') {
      title = getYouTubeTitle(videoId) || 'Unknown Title';
    }
    
    var sheet = _getMusicSheet();
    sheet.appendRow([videoId, title]);
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function editMusicTrack(index, url, title) {
  try {
    var videoId = extractYouTubeId(url);
    var sheet = _getMusicSheet();
    sheet.getRange(index + 2, 1, 1, 2).setValues([[videoId, title]]);
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function deleteMusicTrack(index) {
  try {
    var sheet = _getMusicSheet();
    sheet.deleteRow(index + 2);
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function saveFullMusicPlaylist(playlist) {
  try {
    var sheet = _getMusicSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 2).clearContent();
    }
    if (playlist && playlist.length > 0) {
      var dataToSave = playlist.map(function(item) {
        return [item.id, item.title];
      });
      sheet.getRange(2, 1, dataToSave.length, 2).setValues(dataToSave);
    }
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  }
}

function sendVisitSummaryImagesToLine(imagesData) {
  try {
    var folderId = "15mVFyzJZ56Iza5xdwFbKoJfFBJWof96V";
    var folder;
    var maxRetries = 3;
    for (var retry = 0; retry < maxRetries; retry++) {
      try {
        folder = DriveApp.getFolderById(folderId);
        break;
      } catch (e) {
        if (retry === maxRetries - 1) throw e;
        Utilities.sleep(2000);
      }
    }

    for (var i = 0; i < imagesData.length; i++) {
      var item = imagesData[i];
      var base64Data = item.base64.indexOf(',') !== -1 ? item.base64.split(',')[1] : item.base64;
      var imageBlob = Utilities.newBlob(Utilities.base64Decode(base64Data), 'image/png', 'visit_summary_' + new Date().getTime() + '_' + i + '.png');

        var file;
        for (var r = 0; r < maxRetries; r++) {
          try {
            file = folder.createFile(imageBlob);
            // file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
            break;
          } catch(e) {
            if (r === maxRetries - 1) throw e;
            Utilities.sleep(2000);
          }
        }

      var fileUrl = file.getUrl();
      var downloadUrl = "https://drive.google.com/uc?export=download&id=" + file.getId();

      var fullText = item.messageText ? item.messageText : "📊 สรุปการเข้าพบลูกค้า\n";
      fullText += fileUrl;

      var messages = [
        { type: 'text', text: fullText },
        { type: 'image', originalContentUrl: downloadUrl, previewImageUrl: downloadUrl }
      ];

      var payload = {
        to: LINE_USER_ID,
        messages: messages
      };
      var options = {
        method: 'post',
        headers: {
          'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      var response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
      if (response.getResponseCode() !== 200) {
         console.error("LINE API Error on image " + i + ": " + response.getContentText());
      }

      if (i < imagesData.length - 1) {
         Utilities.sleep(1500); // delay between LINE pushes
      }
    }

    try {
      var sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      var dateString = Utilities.formatDate(sixMonthsAgo, "GMT", "yyyy-MM-dd");
      var oldFiles = folder.searchFiles("modifiedDate < '" + dateString + "'");
      while (oldFiles.hasNext()) {
        oldFiles.next().setTrashed(true);
      }
    } catch (cleanupErr) {
      console.error("Auto cleanup error: " + cleanupErr.toString());
    }

    return {status: 'success', message: 'ส่งรูปทั้งหมดสำเร็จ'};
  } catch (e) {
    console.error("sendVisitSummaryImagesToLine error: " + e.toString());
    return {status: 'error', message: 'ไม่สามารถอัปโหลดรูปภาพไปยัง Drive ได้: ' + e.toString()};
  }
}

function sendDailyLinkToLine() {
  try {
    var fullText = "📊 สรุปการเข้าพบลูกค้า (ประจำวัน)\n\nสามารถคลิกดูตารางสถิติแบบเต็มได้ที่ลิงก์ด้านล่างนี้ครับ:\nhttps://sites.google.com/view/salesreg10";
    
    var messages = [
      { type: 'text', text: fullText }
    ];

    var payload = {
      to: LINE_USER_ID,
      messages: messages
    };
    
    var options = {
      method: 'post',
      headers: {
        'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
  } catch (e) {
    if (typeof sendErrorToLine === 'function') sendErrorToLine(e);
  }
}

function setupDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() == 'sendDailyLinkToLine') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger('sendDailyLinkToLine')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
}

function getThaiHolidaysCalendar() {
  try {
    var cal = CalendarApp.getCalendarById('th.thai#holiday@group.v.calendar.google.com');
    if (!cal) return [];
    var year = new Date().getFullYear();
    var start = new Date(year - 1, 0, 1);
    var end = new Date(year + 1, 11, 31);
    var events = cal.getEvents(start, end);
    var holidays = [];
    for (var i = 0; i < events.length; i++) {
      var d = events[i].getStartTime();
      var dd = String(d.getDate()).padStart(2, '0');
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var yyyy = String(d.getFullYear() + 543);
      holidays.push(dd + '/' + mm + '/' + yyyy);
    }
    return holidays;
  } catch (e) {
    return [];
  }
}
