---
name: thp-sales-crm
description: >
  คู่มือโปรเจกต์ THP Sales Team Reg.10 (CRM) — ครอบคลุมสถาปัตยกรรม Decoupled Dual-Platform
  (Vercel + Google Apps Script), กฎการเขียนโค้ด, กับดักที่พบบ่อย, และขั้นตอน Deploy ทั้งหมด
  ใช้ Skill นี้ก่อนทุกครั้งที่แก้ไขโค้ดในโปรเจกต์นี้
---

# Skill: THP Sales Team Reg.10 — Project Architecture & Coding Standards

## 1. ภาพรวมระบบ (System Overview)

ระบบ CRM สำหรับทีมขายไปรษณีย์ไทย ภาค 10 — ใช้สถาปัตยกรรม **Decoupled Dual-Platform**:

| Layer | Platform | URL |
|---|---|---|
| **Frontend SPA** | Vercel Edge CDN | `https://salesreg10.vercel.app` |
| **Backend API** | Google Apps Script (GAS) | `AKfycbyHjKL4Sj873PZDGMoOUQ9e_4HAGWL3MqDBGqyicjqujyz4lLI0QytBvD0-0BzxAj5y` |
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
├── JS_Core.html          # Global functions, SafeStorage, Event Listeners
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
├── package.json          # scripts: build, push
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
npm run push             # = update-version.js + clasp push -f + clasp version

# Deploy Frontend บน Vercel (auto จาก GitHub)
git add .
git commit -m "feat: ..."
git push origin main     # Vercel CI/CD ทำงานอัตโนมัติ
```

### Re-deploy GAS โดยไม่เพิ่ม Deployment Slot (สูงสุด 20 slots)

```powershell
npx clasp deploy -i AKfycbyHjKL4Sj873PZDGMoOUQ9e_4HAGWL3MqDBGqyicjqujyz4lLI0QytBvD0-0BzxAj5y -V <versionNumber> -d "คำอธิบาย"
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
| สร้าง GAS Deployment ใหม่ทุกครั้ง (เกิน 20) | Re-deploy ทับ Deployment ID เดิม |
| new Swiper() โดยไม่ destroy ของเดิม | swiperInstance.destroy(true, true) ก่อนสร้างใหม่เสมอ |
