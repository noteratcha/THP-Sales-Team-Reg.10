---
name: thp-sales-crm
description: >
  คู่มือโปรเจกต์ THP Sales Team Reg.10 (CRM) — ครอบคลุมสถาปัตยกรรม Decoupled Dual-Platform
  (Vercel + Google Apps Script), กฎการเขียนโค้ด, กับดักที่พบบ่อย, และขั้นตอน Deploy ทั้งหมด
  ใช้ Skill นี้ก่อนทุกครั้งที่แก้ไขโค้ดในโปรเจกต์นี้
---

# Skill: THP Sales Team Reg.10 — Project Architecture & Coding Standards

## 1. ภาพรวมระบบ (System Overview)

ระบบ CRM สำหรับทีมขายไปรษณีย์ไทย ปข.10 — ใช้สถาปัตยกรรม **Decoupled Dual-Platform**:

| Layer | Platform | URL |
|---|---|---|
| **Frontend SPA** | Vercel Edge CDN | `https://salesreg10.vercel.app` |
| **Backend API** | Google Apps Script (GAS) | `AKfycbw5b49--9pt6c1z-_duPTHSX6IcI1E2N7qMsRFreogzX8kbQWHYnbXHKiCKHIOrA8Qx` |
| **Legacy Fallback** | GAS Web App URL | รองรับแบบ In-frame เต็มรูปแบบ |
| **Database** | Google Sheets | อ่าน/เขียนผ่าน Backend GAS |
| **File Storage** | Google Drive | เก็บรูปภาพรายงาน |
| **Notifications** | LINE Messaging API | Multi-Token Failover Pool |

### โครงสร้างไฟล์โปรเจกต์

```
THP Sales Team Reg.10/
├── Index.html            # Entry point — โหลด CDN + include ทุก Module
├── Style.html            # Custom CSS + Tailwind theme config
├── Module_Core.html      # Layout หลัก, Sidebar, Dashboard, SafeStorage Engine
├── JS_Core.html          # ⚠️ ไม่ถูก include (โค้ดตาย) — ฟังก์ชันส่วนกลางจริงอยู่ใน Module_Core
├── Module_Revenue.html   # นำเข้า/ประมวลผลข้อมูลรายได้ (Tableau, Logistics, DropOff)
├── Module_BigLot.html    # ระบบสั่งซื้อสินค้า BigLot
├── Module_BigLotReport.html  # รายงาน BigLot + Export Excel/PDF
├── Module_Visit.html     # บันทึกการเข้าพบลูกค้า + ส่งออกภาพรายงาน
├── Module_RatePrice.html # ตรวจสอบอัตราค่าบริการไปรษณีย์
├── Module_PostNews.html  # สร้างภาพข่าวประชาสัมพันธ์ (Canvas)
├── Module_Admin_PK.html  # Dashboard ข้อมูลลูกค้า PK
├── Module_Modals.html    # Pop-ups และกล่องแจ้งเตือนทั้งหมด
├── Module_Evaluation.html
├── Module_FuzeAgent.html
├── Module_Settings.html
├── Code.js               # Backend GAS: doPost, LINE API, Sheets/Drive
├── build-web.js          # Bundler: resolve includes → dist/index.html + inject Adapter
├── update-version.js     # Auto-version: Ver. yyyy.MMdd.HHmm
├── appsscript.json       # GAS config (timezone: Asia/Bangkok, runtime: V8)
├── vercel.json           # SPA rewrite: ทุก route → dist/index.html
├── package.json          # scripts: build, push, deploy
└── dist/index.html       # Production bundle (~1.8 MB) สำหรับ Vercel
```

---

## 2. CDN Libraries ที่ใช้ (อย่าเพิ่มหรือเปลี่ยนโดยไม่จำเป็น)

```html
<!-- JavaScript -->
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2"></script>
<script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>

<!-- CSS -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
```

---

## 3. กฎการเรียก Backend: Universal `google.script.run` Adapter

### วิธีเรียก API (เหมือนกันทั้ง GAS Web App และ Vercel)

```javascript
// ใช้รูปแบบนี้เสมอ — ทำงานได้ทั้งบน GAS และ Vercel โดยไม่ต้องแก้โค้ด
google.script.run
  .withSuccessHandler(function(result) { /* handle result */ })
  .withFailureHandler(function(err) { /* handle error */ })
  .myBackendFunction(arg1, arg2);
```

### CORS Bypass: Content-Type ที่ถูกต้อง

CRITICAL: GAS ไม่รองรับ HTTP OPTIONS preflight!
ต้องใช้ 'Content-Type': 'text/plain;charset=utf-8' เท่านั้น — ห้ามใช้ application/json

```javascript
fetch(GAS_URL, {
  method: 'POST',
  mode: 'cors',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify(payload)
})
```

### รูปแบบ Payload ที่ Backend รับ

```javascript
// Frontend ส่ง:
{ action: 'executeFunction', functionName: 'myFunc', args: [arg1, arg2] }

// Backend (Code.js) ตอบกลับ:
{ __gas_execution__: true, success: true, result: <any> }
// หรือ error:
{ __gas_execution__: true, success: false, error: 'error message' }
```

### API Gateway + Session (บังคับ)
- ทุกคำขอจากหน้าเว็บวิ่งเข้า `dispatchApiCall_(token, funcName, args)` ใน `Code.js` (ทั้งโหมด Vercel ผ่าน `doPost` action `executeFunction` และโหมด Apps Script ผ่าน `google.script.run.api(token, ชื่อ, args)`)
- ขั้นตอนตรวจ:
  1. ชื่อฟังก์ชันต้องอยู่ใน `API_ALLOWED_FUNCTIONS` (allowlist) ไม่งั้น `Function not allowed`
  2. ถ้าไม่อยู่ใน `AUTH_PUBLIC_FUNCTIONS` จะอ่าน session จาก `token` (`getSession_` → CacheService `sess_<token>`, อายุ 6 ชม. ต่ออายุทุกครั้งที่ใช้)
  3. Script Property `AUTH_ENFORCE = 'true'` → ไม่มี session = `SESSION_EXPIRED` (ตอนนี้ยังปิดอยู่ ระหว่างทยอยเปลี่ยน)
  4. ฟังก์ชันใน `AUTH_USER_SCOPED_FUNCTIONS` จะถูกแทน `args[0].user/zipcode` ด้วยค่าจาก session เสมอ (หน้าเว็บปลอมเป็น admin ไม่ได้)
  5. เรียก `globalThis[funcName + '_']` (ฟังก์ชันจริงลงท้าย `_` เป็น private เรียกตรงจาก google.script.run ไม่ได้)
- `checkLogin_` สร้าง token ด้วย `createSession_()` แล้วส่งกลับใน `info.token` → หน้าเว็บเก็บใน `thp_user_session`
- **เพิ่มฟังก์ชันใหม่ที่หน้าเว็บเรียก:** นิยาม `ชื่อ_` + เพิ่ม `'ชื่อ'` ใน `API_ALLOWED_FUNCTIONS` (+ `AUTH_USER_SCOPED_FUNCTIONS` ถ้าข้อมูลขึ้นกับผู้ใช้)
- ผลตอบกลับ: `{ __gas_execution__: true, success: true, result }` หรือ `{ __gas_execution__: true, success: false, error }`

---

## 4. ระบบ Bundler และ Include Syntax

### GAS Template Include Syntax

```html
<!-- ใน Index.html หรือ Module ต่างๆ -->
<?!= include('Module_Revenue'); ?>
<?!= include('JS_Core'); ?>
<?!= include('Style'); ?>
```

build-web.js จะ Resolve แท็กเหล่านี้แบบ Recursive และรวมเป็น dist/index.html ไฟล์เดียว

### คำสั่ง Build & Deploy

```powershell
# Build สำหรับ Vercel
node update-version.js   # อัปเดตเวอร์ชันก่อน
npm run build            # → dist/index.html

# ทดสอบ local
npx serve dist -l 3000

# Push Backend ขึ้น GAS
npm run push             # = update-version.js + clasp push -f (HEAD เท่านั้น)
npm run deploy           # = push + clasp deploy -i AKfycbw5b49… (กินโควตา 200 เวอร์ชัน)

# Deploy Frontend บน Vercel (auto จาก GitHub)
git add .
git commit -m "feat: ..."
git push origin main     # Vercel CI/CD ทำงานอัตโนมัติ
```

### Re-deploy GAS โดยไม่เพิ่ม Deployment (เวอร์ชันสูงสุด 200 — ถึงขีดแล้ว ดูหัวข้อ 15.7)

```powershell
npx clasp deploy -i AKfycbw5b49--9pt6c1z-_duPTHSX6IcI1E2N7qMsRFreogzX8kbQWHYnbXHKiCKHIOrA8Qx -V <versionNumber> -d "คำอธิบาย"
```

---

## 5. ระบบแคช 3 เลเยอร์ (Enterprise Hybrid SWR Cache)

โปรเจกต์นี้มีข้อมูลขนาดใหญ่ (~19,754 แถว / 4.58 MB) ซึ่งเกิน LocalStorage 5MB limit

| Layer | Storage | ความเร็ว | ขนาด |
|---|---|---|---|
| L1 | In-Memory (_memStore) | 0ms (Synchronous) | ขึ้นอยู่กับ RAM |
| L2 | IndexedDB (thp_sales_db) | ~1-5ms (Async) | ร้อย MB+ |
| L3 | LocalStorage (Fallback) | ~5ms | less than 5MB |

### Cache Keys

| Key | ข้อมูล |
|---|---|
| thp_cache_visit_raw | ประวัติเข้าพบลูกค้า (~4.58MB) |
| thp_cache_visit_targets | เป้าหมายการเข้าพบ |
| thp_cache_rev_targets | เป้าหมายรายได้รายเดือน |
| thp_cache_rev_data | สรุปยอดรายได้ Tableau รายวัน |
| thp_biglot_products | แคตตาล็อกสินค้า BigLot |

### กับดัก: Revenue Target มีแถว Header เสมอ

```javascript
// WRONG — length === 1 เมื่อมีแค่ Header แต่โค้ดนี้จะเข้าใจว่ามีข้อมูลแล้ว
if (!targets || targets.length === 0) { /* ไม่มีข้อมูล */ }

// CORRECT — ต้องเช็ค <= 1 เสมอ
const missingRevTargets = (!window.globalRevenueTargets || window.globalRevenueTargets.length <= 1);
const missingBigLotTargets = (!window.globalBigLotTargets || window.globalBigLotTargets.length <= 1);

// ต้องซิงค์ขึ้น global window เสมอ
window.globalRevenueTargets = targets;
window.globalBigLotTargets = targets;
```

---

## 6. มาตรฐาน UI/UX (Design & Aesthetic Guidelines)

### Color Palette

| ประเภท | สี | Class |
|---|---|---|
| Primary Brand | ส้มไปรษณีย์ไทย | #EA580C, #F97316, text-theme-orange, bg-theme-orange |
| Error / Alert | แดงเข้ม | #DC2626 |
| Success / Service | เขียวมรกต | #10B981 |
| Target / Reward | ทองอำพัน | #F59E0B |

### Overlay / Modal Standard

```html
<!-- CORRECT: ครอบคลุมทั้ง Viewport -->
<div class="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm">

<!-- WRONG: แหว่งซ้าย 260px เมื่อใช้ใน Fullscreen context -->
<!-- <div class="fixed inset-0 z-[9999] lg:left-[260px] ..."> -->
```

### Header Action Buttons (ต้องเป็น Outline เสมอ)

```html
<button class="bg-white text-orange-600 border border-orange-200 hover:bg-orange-600 hover:text-white transition px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm">
  ชื่อปุ่ม
</button>
```

### Global Loader

- ใช้ #globalLoader modal แสดงสินค้า BigLot แนะนำระหว่างรอโหลด
- ต้องมี hideGlobalLoader() ทั้งใน withSuccessHandler และ withFailureHandler เสมอ

---

## 7. Chart.js Best Practices

```javascript
// Custom HTML Tooltip (Glassmorphism)
options: {
  plugins: {
    tooltip: {
      enabled: false,
      external: function(context) {
        // สร้าง tooltip HTML ด้วย Glassmorphism: bg-white/95 backdrop-blur-md
      }
    }
  }
}

// Y-Axis grace — ป้องกัน DataLabel ถูกขอบบังเสมอ
scales: { y: { grace: '25%' } }

// Mobile X-Axis rotation — ต้องเป็นบวก ห้ามลบ
scales: {
  x: {
    ticks: {
      maxRotation: 90,   // CORRECT: บวก 90
      minRotation: 90    // WRONG: ห้าม -90 (ทำให้ anchor เพี้ยน)
    }
  }
}

// Swiper.js — ทำลายก่อนสร้างใหม่เสมอ
if (swiperInstance) swiperInstance.destroy(true, true);
swiperInstance = new Swiper('.swiper', {
  loop: recommendedList.length > 1,  // ห้าม loop ถ้ามีสไลด์เดียว
  autoplay: { delay: 3000 }
});
```

---

## 8. html2canvas Export Best Practices

```javascript
// ลด Artificial Delay (เดิม 800ms → ใช้ 80ms หรือ requestAnimationFrame)
requestAnimationFrame(() => {
  setTimeout(async () => {
    // ปิด transitions ชั่วคราวก่อน capture
    container.style.transition = 'none';
    container.style.animation = 'none';

    const canvas = await html2canvas(container, {
      scale: 2,           // Retina quality สำหรับ LINE
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // คืนค่า transitions
    container.style.transition = '';
    container.style.animation = '';
  }, 80);
});

// ตาราง: จัดกึ่งกลางข้อความใน td ด้วย flex div (ไม่ใช่ align-middle)
// <td class="p-0"><div class="flex items-center min-h-[40px] px-2 py-1">เนื้อหา</div></td>
```

---

## 9. Google Apps Script — กฎและข้อห้าม

### Timezone

```javascript
// CORRECT: ใช้ Utilities.formatDate เสมอ
Utilities.formatDate(d, "Asia/Bangkok", "yyyy-MM-dd");

// WRONG: Native JS Date getter (รัน UTC ทำให้วันคลาดเคลื่อน 1 วัน)
// d.getDate();  d.getMonth();
```

### Google Drive — Sharing & File Operations

```javascript
// WRONG: นโยบาย Google Workspace ของ thailandpost.com บล็อก
// file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);

// CORRECT: บันทึกในโฟลเดอร์ที่ตั้งสิทธิ์ไว้ล่วงหน้า (ไฟล์ Inherit permissions)

// WRONG: ใช้ searchFiles() ใน Interactive Request (ช้ามาก 10-15 วินาที)
// folder.searchFiles('title contains "report"');

// CORRECT: สร้างไฟล์ใหม่ทันที ย้าย GC ไปเป็น Time-driven Trigger แยกต่างหาก
```

### แสดงรูปภาพจาก Google Drive

```javascript
// WRONG: URL preview ไม่ใช่ raw image
// https://drive.google.com/file/d/FILE_ID/view?usp=drive_link

// CORRECT: แปลงเป็น Google Usercontent CDN
function transformGoogleDriveUrl(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://lh3.googleusercontent.com/d/${match[1]}=s600`;
  }
  return url;
}
// + fallback: <img onerror="this.src='https://drive.google.com/thumbnail?id=FILE_ID&sz=w600'">
```

---

## 10. LINE Messaging API — กฎและกับดัก

### Token Pool + Provider-Scoped User ID

CRITICAL: User ID ใน LINE ถูก Hash แยกตาม Provider!
Bot คนละ Provider = User ID ไม่เหมือนกัน แม้เป็นคนๆ เดียว

```javascript
// CORRECT: จับคู่ Token กับ User/Group ID ของ Provider เดียวกัน 1-to-1
var LINE_ACCESS_TOKENS = ['TOKEN_PROVIDER_1', 'TOKEN_PROVIDER_2'];
var LINE_DESTINATION_IDS = [
  'Udba02d86c39dfa195baeb0e7a4328d05',  // User ID ภายใต้ Provider 1
  'Ud6defadda15e984a8efeed16f89b4e9c'   // User ID ภายใต้ Provider 2
];
// ใช้ index เดียวกันเสมอ: TOKEN[i] → ID[i]
```

### Pre-flight Quota Inspection (ก่อนส่งทุกครั้ง)

```
1. GET https://api.line.me/v2/bot/message/quota         → value (limit/month)
2. GET https://api.line.me/v2/bot/message/quota/consumption → totalUsage
3. remaining = value - totalUsage
   - remaining > 0  → ส่งได้
   - remaining <= 0 → ข้ามไป Token ถัดไป (ไม่รอให้เกิด 429)
```

### Single-Bot per Group Constraint

- LINE Group อนุญาต Bot ได้ 1 ตัวต่อ 1 กลุ่ม
- การเพิ่ม Bot ตัวที่สองจะทำให้ LINE Kick Bot ทั้งหมดออกทันที
- กลยุทธ์ Failover: ส่ง 1:1 Push Message ไปหา Admin แทน

---

## 11. Versioning Standard

```
รูปแบบ: Ver. yyyy.MMdd.HHmm
ตัวอย่าง: Ver. 2026.1002.0924

คำสั่ง: node update-version.js   # อัปเดต Index.html + Module_Core.html พร้อมกัน
```

---

## 12. PowerShell / Windows Gotchas

```powershell
# ต้องใส่ -Encoding UTF8 เสมอ (ป้องกันภาษาไทยแตก)
Get-Content file.html -Encoding UTF8
Set-Content file.html -Value $content -Encoding UTF8

# ห้ามใส่ $1 ใน inline string ของ node -e
# PowerShell ตีความ $1 เป็นตัวแปร PowerShell ว่างเปล่า
# แก้ไข: เขียนโค้ดลงไฟล์ .js ชั่วคราวแทน

# ตรวจสอบและลบ desktop.ini ก่อน Push เสมอ
# Google Drive Desktop สร้างไฟล์นี้อัตโนมัติ ทำให้รบกวน clasp และ git
```

---

## 13. File Upload Policy

- ห้ามเคลียร์ไฟล์ใน input[type=file] หลังส่งข้อมูล (ทั้งสำเร็จและไม่สำเร็จ)
- เคลียร์ไฟล์เฉพาะเมื่อผู้ใช้เปลี่ยนหน้า/สลับเมนู ผ่าน switchPage(pageId) เท่านั้น
- เหตุผล: ให้ผู้ใช้กดส่งซ้ำได้ทันทีโดยไม่ต้องเลือกไฟล์ใหม่

---

## 14. Quick Reference — สรุปกฎที่สำคัญที่สุด

| ห้ามทำ | ทำแทน |
|---|---|
| Content-Type: application/json กับ GAS | ใช้ text/plain;charset=utf-8 |
| fixed inset-0 lg:left-[260px] บน Overlay | ใช้ fixed inset-0 z-[9999] เต็ม Viewport |
| targets.length === 0 เช็ค Revenue Target | ใช้ targets.length <= 1 (Header นับเป็น 1 row) |
| d.getDate() / d.getMonth() บน GAS | ใช้ Utilities.formatDate(d, "Asia/Bangkok", "...") |
| file.setSharing(ANYONE, VIEW) บน GAS | บันทึกในโฟลเดอร์ที่ตั้งสิทธิ์ล่วงหน้า |
| folder.searchFiles() ใน Interactive request | สร้างไฟล์ใหม่ทันที, GC แยก Time-trigger |
| setTimeout(fn, 800) ใน html2canvas | ใช้ requestAnimationFrame + setTimeout(fn, 80) |
| maxRotation: -90 บน Chart.js mobile | ใช้ maxRotation: 90, minRotation: 90 |
| ส่ง Token 1 หา User ID ของ Provider 2 | จับคู่ Token + UserID ตาม index เสมอ |
| สร้าง GAS Deployment ใหม่ทุกครั้ง | Re-deploy ทับ Deployment ID เดิม (`npm run deploy`) |
| เพิ่มฟังก์ชันหลังบ้านแล้วเรียกตรง | นิยาม `ชื่อ_` + เพิ่มใน `API_ALLOWED_FUNCTIONS` (+ `AUTH_USER_SCOPED_FUNCTIONS`) |
| เชื่อ `user` ที่หน้าเว็บส่งมา | ใช้ผู้ใช้จาก session (dispatchApiCall_ แทนค่าให้) |
| `return` เงียบใน adapter ตอน error | เรียก failureHandler เสมอ (ใช้ค่าคืนของ handleSessionExpired) |
| ใช้ `XLSX` ตรงๆ โดยไม่มีสำรอง | พึ่ง CDN fallback / `ensureXLSX()` ใน Index.html |
| `<input type="month">` สำหรับผู้ใช้ไทย | select เดือนไทย + ปี พ.ศ. + hidden `YYYY-MM` |
| grep `Ver. 2026` เช็กเวอร์ชัน Vercel | grep `APP_VERSION = '…'` |
| จัดกลุ่ม Excel ตามระดับลูกค้า | จัดกลุ่มตามรหัสสมาชิก+บริการ แสดงระดับสูงสุด |
| new Swiper() โดยไม่ destroy ของเดิม | swiperInstance.destroy(true, true) ก่อนสร้างใหม่เสมอ |

---

## 15. บทเรียนและเทคนิคจากงานจริง (อัปเดต 2026-11-08)

### 15.1 Session, สิทธิ์ และข้อมูลส่วนบุคคล
- `getDataForTable_` ต้องมีผู้ใช้จาก session (ไม่มี = `SESSION_EXPIRED`); admin/viewer ได้ข้อมูลเต็ม ผู้ใช้อื่นได้คอลัมน์ข้อมูลส่วนบุคคล `VISIT_PII_COLUMNS = [7, 8, 17, 18]` (ชื่อ, เบอร์, Post Family, รูป) ของ **ที่ทำการอื่น** เป็นค่าว่าง แต่คอลัมน์ที่ใช้นับสถิติยังครบ
- หน้าเว็บ: `window.runWhenLoggedIn(fn)` = เรียกหลังบ้านที่ต้องใช้ session เฉพาะเมื่อมี token แล้ว ไม่งั้นเข้าคิว `__postLoginQueue` แล้ว `flushPostLoginQueue()` หลัง `restoreSession`
- `window.handleSessionExpired()` **คืนค่า boolean**: `true` = จัดการแล้ว (เด้งให้ล็อกอินใหม่) / `false` = ยังไม่เคยล็อกอิน ให้ adapter ส่งต่อ `failureHandler` ตามปกติ — adapter ทั้ง 2 โหมดต้องใช้ค่าที่คืนนี้
- session ที่บันทึกในเครื่องแต่ไม่มี `token` (ล็อกอินก่อนมีระบบ token) **ห้าม restore** ให้ล็อกอินใหม่
- เปิด `AUTH_ENFORCE` เมื่อมั่นใจว่าทุกหน้าส่ง token แล้วเท่านั้น

### 15.2 กับดัก: สถานะ "กำลังโหลด" ค้าง (In-flight Flags)
- โค้ดหน้าหลักใช้ธง `window.isFetchingVisitData / isFetchingVisitTargets / isFetchingRevTargets / isFetchingRevData / isSyncingDashboardData` กันยิงซ้ำ
- ถ้าคำขอล้มเหลวแล้ว **ไม่มี callback ใดถูกเรียก** ธงจะค้าง `true` จนรีเฟรช → ข้อมูลไม่โหลดอีกเลย (อาการ: "ซิงค์สด..." ค้าง, ยอดเป็น 0, skeleton ค้าง)
- กฎ: ทุกคำขอต้องจบที่ success หรือ failure handler เสมอ (ห้าม `return` เงียบใน adapter) และตอนล็อกอินสำเร็จให้รีเซ็ตธงทั้งหมด + `thp_cache_last_sync = 0`
- `renderTable()` ใน success handler ถ้า throw จะทำให้ `checkDone()` ไม่ถูกเรียก — ระวังโค้ดก่อน `checkDone()`

### 15.3 Google Sites, กรอบ (iframe) และข้อจำกัดเบราว์เซอร์
- `sites.google.com/view/salesreg10` **ฝังหน้า Vercel** (ไม่ใช่หน้า Apps Script) — ดูจาก `APP_VERSION` มุมซ้ายล่าง
- สคริปต์แรกสุดของ `Module_Core.html` ตรวจ `window.self !== window.top` + `location.ancestorOrigins` มี `sites.google.com` (Firefox: referrer `googleusercontent.com` เฉพาะโหมด Vercel) → ลอง `window.top.location.replace(Vercel)` ถ้าถูกบล็อกแสดงหน้าจอ "ย้ายไปเว็บไซต์ใหม่แล้ว" (ลูกโลก 🌐 + คลื่นสัญญาณ, นับถอยหลัง 3 วิ, ปุ่มเปิดแท็บใหม่)
- ข้อจำกัดที่แก้ด้วยโค้ดไม่ได้: กรอบ Sites **ห้ามย้ายหน้าทั้งแท็บ**, เปิดแท็บใหม่ได้เฉพาะตอนผู้ใช้กดจริง (popup blocker), **ปิดแท็บที่ผู้ใช้เปิดเองไม่ได้**, เพลง YouTube ในกรอบซ้อนเล่นไม่ได้ (ไม่มีสิทธิ์ autoplay) — ทางแก้จริงคือแจกลิงก์ `https://salesreg10.vercel.app`
- เพลงพื้นหลังเริ่มเมื่อคลิกครั้งแรก (นโยบาย autoplay ของเบราว์เซอร์)

### 15.4 Excel (SheetJS) — โหลดสำรองและตารางแบบไขว้
- `Index.html` โหลด `cdn.sheetjs.com` xlsx 0.20.1 ถ้าไม่ได้ (ไฟร์วอลล์หน่วยงาน) `document.write` ไป cdnjs 0.18.5; `window.ensureXLSX()` ลอง sheetjs → cdnjs → jsdelivr; click listener (capture) ดักปุ่มที่ `onclick`/ข้อความมี excel|xlsx ถ้ายังไม่มี `XLSX` จะโหลดก่อนแล้ว `click()` ซ้ำ — ปุ่ม Excel ใหม่ใส่ชื่อ/ข้อความที่มีคำว่า Excel ก็ได้รับการป้องกันอัตโนมัติ
- ตารางแบบไขว้ (`exportRevenueToExcel`): หัว 3 แถว (ปี → เดือน+รวม → จำนวน/รายได้) ด้วย `ws['!merges']`, ความกว้าง `ws['!cols']`, รูปแบบตัวเลข `cell.z = '#,##0'`, แถว "รวมทั้งหมด"; `ws['!freeze']` ใช้ไม่ได้ในรุ่น community
- จัดกลุ่ม "คนเดียวกัน" ด้วย **รหัสสมาชิก** (ไม่มีรหัส → ปณ.+ชื่อ) + บริการ ไม่แยกตามระดับ; ระดับแสดงสูงสุด `PLATINUM BOX > BLUE BOX > RED BOX > Customer > ไม่เป็นสมาชิก`; ชื่อ ปณ./ทีม/ชื่อ ใช้ของเดือนล่าสุด
- เรียงภาษาไทย+ตัวเลข: `a.localeCompare(b, 'th', { numeric: true, sensitivity: 'base' })` (ชื่อ ปณ. ขึ้นต้นรหัสไปรษณีย์จึงเรียงตามรหัส)
- เก็บชีตข้อมูลดิบ ("ข้อมูลรายการ") คู่กับชีตสรุปเสมอ เผื่อผู้ใช้กรอง/คำนวณต่อ

### 15.5 รูปแบบ UI ที่ใช้ซ้ำได้
- **ตัวเลือกเดือนไทย:** เก็บค่าจริงใน `<input type="hidden">` รูปแบบ `YYYY-MM` (ค.ศ.) ให้โค้ดเดิมอ่านได้ แสดงผลด้วย select เดือนไทย + ปี พ.ศ. (`syncRevThaiMonthPickers` / `onRevThaiMonthChange`) — `<input type="month">` แสดงภาษาตามเบราว์เซอร์ บังคับไทยไม่ได้
- **แผง KPI:** `buildKpiPanel()` ตัวเลขหลักใหญ่ + เป้าหมาย + แถบ % (หน้าหลัก)
- **สถานะว่าง/ผิดพลาด:** แสดงข้อความทับกราฟ (`setHomeChartEmpty`) และปุ่ม "ลองใหม่" แทนกรอบโหลดค้าง; ต้นเดือนที่ยังไม่มีรายได้ ใช้เดือนล่าสุดที่มีข้อมูลและบอก "(ล่าสุดที่มีข้อมูล)"
- **ResizeObserver:** ปรับขนาดใน callback ให้เลื่อนไป `requestAnimationFrame` และ `window.onerror` ข้ามข้อความ `ResizeObserver loop` (ไม่ใช่บั๊กจริง ไม่ต้องเด้งหน้าต่าง Bug)
- **ส่วนที่แสดงบนจออย่างเดียว:** วางไว้นอก element ที่ `html2canvas` จับภาพ เช่น `#visitSummaryKpis` อยู่นอก `#visitSummaryContent`; การส่ง LINE อาศัย `#visitSummaryContent > div.bg-white` และ `.bg-gray-50 > div` — ห้ามเปลี่ยนโครงนี้
- ตาราง: 0 แสดงเป็น "–" สีจาง, หัวตารางแยกสีตามกลุ่ม, แถวที่มีความเคลื่อนไหวพื้นอ่อน
- **ภาพเคลื่อนไหว:** CSS `@keyframes` ใส่ใน `<style>` ของ overlay เอง และปิดเมื่อ `prefers-reduced-motion`

### 15.6 การทดสอบและตรวจสอบก่อนส่งงาน
- ตรวจ syntax ทุก `<script>` ใน .html + `dist/index.html` + Code.js ด้วย `vm.Script` (สคริปต์ตรวจที่ใช้: ไล่ทุก inline script แล้ว parse)
- ทดสอบตรรกะฝั่งหน้าเว็บด้วย node: ตัดฟังก์ชันออกจากไฟล์ .html มา `eval` กับข้อมูลตัวอย่าง (เช่น export Excel ใช้แพ็กเกจ `xlsx@0.18.5` อ่านผลกลับด้วย `sheet_to_json`)
- หลัง push เช็ก Vercel ด้วย `curl -s https://salesreg10.vercel.app/ | grep -o "APP_VERSION = '[^']*'"` (อย่า grep `Ver. 2026` เพราะเจอตัวอย่างในคอมเมนต์) — Vercel ใช้เวลา build ~1 นาที ให้วนเช็กจนเจอโค้ดใหม่
- ทดสอบหลังบ้านจากภายนอก: `curl -sL -H "Content-Type: text/plain" --data '{"action":"executeFunction","functionName":"...","args":[]}' <exec URL>` (ห้ามใส่ `-X POST` จะได้ 411 ตอน redirect)
- เวลาไทยใน Git Bash: `TZ=Asia/Bangkok` อาจไม่ทำงาน ให้ใช้ `node -e "new Date().toLocaleString('sv-SE',{timeZone:'Asia/Bangkok'})"`
- `SHARED_NOTES.md` เป็น CRLF — ต่อท้ายด้วย `printf '...\r\n'` หรือแปลงกลับหลังแก้

### 15.7 Deploy และโควตา Apps Script (สถานะล่าสุด)
- `npm run build` = update-version + build-web → `dist/index.html`; `git push` → Vercel; `npm run push` = update-version + `clasp push -f` (HEAD เท่านั้น); `npm run deploy` = push + `clasp deploy -i AKfycbw5b49…` (สร้างเวอร์ชันใหม่ทับ deployment เดิม)
- **โควตา: 1 โปรเจกต์ Apps Script มีได้สูงสุด 200 เวอร์ชัน** — ถึงขีดแล้ว (2026-11-03, ล่าสุด @344): `Cannot create more versions` → ต้องลบเวอร์ชันเก่าที่หน้า Project history ก่อน (ห้ามลบเวอร์ชันที่ deployment หลักใช้อยู่) ผู้ใช้เป็นคนลบเอง
- งานที่แก้เฉพาะหน้าเว็บ (Module_*.html, Index.html, build-web.js) ส่ง Vercel อย่างเดียวพอ เพราะผู้ใช้และ Google Sites ใช้หน้า Vercel
- ห้ามสร้าง deployment ใหม่หรือ archive `AKfycbw5b49…`; ลบ `desktop.ini` ก่อน push; deploy เมื่อผู้ใช้สั่งชัดเจนเท่านั้น (Claude Code auto mode บล็อกคำสั่ง deploy ถ้าผู้ใช้ไม่ได้สั่งในข้อความนั้น)

## 16. บทเรียนจากงานส่วนขยาย กราฟ PDF และ AI (อัปเดต 2026-11-09)

### 16.1 ส่วนขยาย Chrome SalesReg10 (MV3)
- โค้ดแก้ที่ `Extention/SalesReg10/` แต่ผู้ใช้โหลดจาก `C:\SalesReg10` (Google Drive แสดง `desktop.ini` ให้ Chrome เห็น → "Cannot load extension with file or directory name desktop.ini" ทุกครั้งที่รีโหลด ลบก็กลับมา) — แก้เสร็จ: คัดลอกไป C:\SalesReg10, แพ็ก `SalesReg10.zip`, เพิ่ม version ใน manifest (PowerShell `Set-Content -Encoding UTF8` ใส่ BOM ให้ลบออก), บอกผู้ใช้กดรีโหลด
- service worker ถูกปิดถ้ารอ fetch เกิน 30 วินาที → เรียก Apps Script ผ่าน offscreen document; heartbeat `chrome.runtime.getPlatformInfo()` ทุก 20 วินาที + เก็บ `runAlive` ใน storage (ล็อกหมดอายุ 5 นาที แทนเวลาเริ่ม 60 นาที เพราะรอบที่ลองใหม่อาจเกินชั่วโมง)
- สถานะให้ popup อ่านผ่าน `chrome.storage.local` (progress: file, partNo/partTotal, stepNo/stepTotal, round) — popup ฟัง `storage.onChanged`
- ลองใหม่: ทำทีละไฟล์ ไฟล์พังไม่หยุดไฟล์ถัดไป → ลองเฉพาะไฟล์ที่พัง 3 รอบ → `chrome.alarms` ลองใหม่ทุก 30 นาที (ข้ามไฟล์ที่สำเร็จแล้ววันนี้ด้วย `doneParts`); ข้อผิดพลาดร้ายแรง (ล็อกอินไม่ได้/ยังไม่ตั้งค่า) หยุดทันที; แจ้ง LINE เฉพาะครั้งแรกและครั้งที่เลิกลอง
- แท็บเบื้องหลังตั้ง `autoDiscardable:false` (Chrome ล้างแท็บแล้ว id เปลี่ยน → "No tab with id") และเจอ No tab with id ให้เปิดแท็บใหม่ทันที ไม่รอจนหมดเวลา
- สคริปต์ที่ฉีดด้วย `chrome.scripting.executeScript` (isolated world) ส่ง `chrome.runtime.sendMessage` กลับมาระหว่างทำงานได้ — ใช้รายงานขนาดไฟล์ที่ดาวน์โหลด (อ่าน `res.body.getReader()` ทีละชิ้น)
- เอารายงานออกจาก REPORTS ต้องเลื่อนผลเดิมใน `lastResult.reports` (อ้างตามลำดับ) — ดู `migrateRemovedEparcel`

### 16.2 กราฟ Chart.js (ต่อจากหัวข้อมาตรฐาน)
- แกนเป็นทีม/ที่ทำการ (ไม่ใช่เวลา): เป้าหมายเป็นขีดบนแท่ง `{type:'line', showLine:false, pointStyle:'line', pointRadius: ctx => bar.width*0.65}` ไม่ใช่เส้นประต่อกัน
- ตัวเลขบนแท่ง: เลขเต็ม เหนือแท่ง (`anchor:'end', align:'end', clamp:true`) พื้นขาวโปร่ง หมุน -90 เมื่อแท่งแคบกว่า ~64px; ซ่อนตัวเลขบนเส้น (`datalabels:{display:false}`) ให้ไปอยู่ใน tooltip
- ค่าที่ไม่มีใช้ `null` (เส้นจะขาด) ไม่ใช่ 0 (เส้นดิ่งลงแกน); tooltip ที่อ่านค่า dataset ต้องรับ null (`|| 0`)
- แกน y ย่อภาษาไทย: `new Intl.NumberFormat('th-TH',{notation:'compact',compactDisplay:'long',maximumFractionDigits:1})` → "19.7 ล้าน", "6.3 แสน" (compactDisplay short ให้ M/K)
- สีแท่งตามผลงานเทียบเป้า + legend เอง (`generateLabels`) ดีกว่าสีสุ่มรายทีมที่ไม่มีความหมาย
- ตรวจหน้าตากราฟก่อนส่ง: เขียน HTML จำลองที่ใช้ chart.js@4 + datalabels@2 จาก CDN แล้วถ่ายภาพด้วย Chrome headless (`--screenshot --virtual-time-budget=5000`)

### 16.3 PDF ตาราง (html2canvas + jsPDF)
- กำหนดจำนวนหน้าสูงสุดแทนจำนวนแถวตายตัว: แถวต่อหน้า = max(23, ceil(n / maxPages)) ลด padding เมื่อแถวเยอะ และถ้าภาพยังสูงเกินหน้าให้ย่อทั้งภาพ (คำนวณจาก `pdf.internal.pageSize.getHeight()`)
- วัดความสูงจริงก่อนเชื่อ: เรนเดอร์ตารางจำลองใน Chrome headless แล้วอ่าน `getBoundingClientRect()` ผ่าน `--dump-dom`

### 16.4 AI (Gemini) บน Apps Script
- เวลาสูงสุด 6 นาที: ส่ง deadline ให้ฟังก์ชันที่วนเรียก API แล้วเลิกลองเมื่อเวลาไม่พอ (ประมาณจากเวลาเรียกครั้งล่าสุด) เพื่อให้ตอบเป็นข้อความได้ทัน
- 503 "high demand": ลองโมเดลเดิมซ้ำมักไม่ช่วย ให้สลับโมเดลสำรอง (ชื่อแฝง `gemini-flash-latest`, `gemini-flash-lite-latest`) 404 ของโมเดลสำรองให้ข้าม
- ทดสอบตรรกะ retry/fallback: รัน Code.js ใน `vm` แล้วจำลอง `UrlFetchApp/PropertiesService/Utilities`

### 16.5 กับดักการแก้ไฟล์ด้วยสคริปต์
- แทนที่ช่วงโค้ดด้วย `indexOf('                });')` อาจไปเจอ "ท้าย" บรรทัด `});` ที่ย่อหน้าลึกกว่า → โค้ดเก่าค้าง หลังแก้ต้องตรวจ syntax ทุก `<script>` เสมอ (`new Function(body)`)
- ไฟล์ .html ในโปรเจกต์เป็น CRLF: สคริปต์แก้ต้องรองรับ `\r\n`; ข้อความที่มี `\u2009` ในโค้ดทำให้ Edit จับคู่ไม่ได้ ให้ใช้สคริปต์ node
