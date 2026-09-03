# THP Sales Team Reg.10 — Development Skills, Techniques & Style Guide

เอกสารรวบรวมทักษะ เทคนิค สไตล์การออกแบบ และมาตรฐานการพัฒนาสำหรับระบบ **THP Sales Team Reg.10** เพื่อใช้อ้างอิงในการพัฒนา ต่อยอด และรักษามาตรฐานของระบบให้สอดคล้องกัน

---

## 1. สถาปัตยกรรมและการจัดการการโหลดข้อมูล (Loading & Lifecycle Architecture)

### 1.1 มาตรฐาน Global Loader Popup (`showGlobalLoader` / `hideGlobalLoader`)
- **แนวคิด:** ไม่ใช้ตัวโหลดแบบ Local Inline Spinner ซ้ำซ้อนกันในแต่ละหน้า แต่เปลี่ยนมาใช้ระบบ **Global Loader Popup กลาง** (`#globalLoader`) ที่แสดงการ์ดสินค้าแนะนำ (Big Lot Recommendations) คั่นเวลา เพื่อสร้างความคุ้มค่าในการรอคอย และทำให้ภาพรวมของระบบดูทันสมัย พรีเมียม
- **การเรียกใช้งาน:**
  ```javascript
  // เมื่อเริ่มโหลดข้อมูล
  if (typeof showGlobalLoader === 'function') {
      showGlobalLoader('กำลังซิงค์ข้อมูลอัตราค่าบริการ...');
  }
  
  // ใน Callback ทั้งกรณีสำเร็จและล้มเหลว (ต้องมี hideGlobalLoader เสมอ)
  google.script.run
      .withSuccessHandler(res => {
          if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
          // จัดการข้อมูลต่อไป...
      })
      .withFailureHandler(err => {
          if (typeof hideGlobalLoader === 'function') hideGlobalLoader();
          Swal.fire('เกิดข้อผิดพลาด', err.toString(), 'error');
      })
      .serverFunction();
  ```
- **การจัดการ Carousel (Swiper.js) ใน Global Loader:**
  - **Lifecycle Management:** ทำลายอินสแตนซ์เก่าก่อนสร้างใหม่เสมอ (`swiper.destroy(true, true)` ตามด้วย `new Swiper(...)`) เพื่อป้องกันปัญหา Swiper ค้างบน Slide แรก หรือ Autoplay หยุดทำงาน
  - **Auto-Play & Looping:**
    ```javascript
    window.globalLoaderSwiper = new Swiper('.global-loader-swiper-container', {
        slidesPerView: 1,
        centeredSlides: true,
        spaceBetween: 20,
        loop: recommendedList.length > 1,
        observer: true,
        observeParents: true,
        autoplay: {
            delay: 3500,
            disableOnInteraction: false,
            pauseOnMouseEnter: false
        },
        pagination: {
            el: '.global-loader-swiper-container .swiper-pagination',
            clickable: true
        }
    });
    ```
  - **การป้องกัน UI ชนกัน (Collision Prevention):** ในขณะที่ Global Loader กำลังทำงาน (`showGlobalLoader`) ต้องสั่งซ่อนวิดเจ็ตการ์ดสินค้าแนะนำฝั่งขวาบนหน้าหลัก (`#biglot-recommended-container.classList.add('!hidden')`) เพื่อไม่ให้ซ้อนทับหรือลอยอยู่ด้านหลัง และจะกู้คืนการแสดงผลเมื่อปิดตัวโหลดและอยู่บนหน้าหลักเท่านั้น

### 1.2 ระบบแคชข้อมูลอัจฉริยะ (Instant Cache Strategy)
- ใช้ `SafeStorage` (ตัวครอบคลุม `localStorage` / `sessionStorage` ที่ปลอดภัยแม้ทำงานในสภาพแวดล้อม Iframe หรือ Private Browsing)
- โหลดข้อมูลแคชทันทีที่สคริปต์ทำงาน เพื่อให้ตัวโหลดมีข้อมูลสินค้าแนะนำพร้อมแสดงผลทันทีแบบ **0ms delay** ไม่ต้องรอ Google Apps Script
  ```javascript
  try {
      const _cachedBL = typeof SafeStorage !== 'undefined' ? SafeStorage.getItem('thp_biglot_products') : null;
      window.bigLotProducts = _cachedBL ? JSON.parse(_cachedBL) : [];
  } catch(e) {
      window.bigLotProducts = [];
  }
  ```
- เมื่อ Google Apps Script ส่งข้อมูลชุดใหม่มา ให้อัปเดตแคชพร้อมกับเรียก `window.updateGlobalLoaderAds()` เพื่ออัปเดตสไลด์ทันที

### 1.3 นโยบายการคงข้อมูลไฟล์และการส่งข้อมูลซ้ำ (File Resend Policy)
- **ไม่เคลียร์ไฟล์หลังอัปโหลดเสร็จ:** หลังจากการอัปโหลดไฟล์ (Tableau, Logistics, DropOff) สำเร็จหรือไม่สำเร็จ **ไม่เรียกฟังก์ชันล้างไฟล์** เพื่อเปิดโอกาสให้ผู้ใช้งานสามารถกดปุ่ม "อัปโหลด" เพื่อส่งข้อมูลไฟล์เดิมซ้ำได้ทันทีโดยไม่ต้องเลือกไฟล์ใหม่
- **เคลียร์ไฟล์เมื่อสลับหน้าเท่านั้น:** ฟังก์ชัน `switchPage(pageId)` ใน `Module_Core.html` จะเป็นจุดเดียวที่เรียก `window.clearAllUploads()` เพื่อรีเซ็ตไฟล์เมื่อผู้ใช้กดเปลี่ยนเมนูออกจากหน้านั้น

---

## 2. อัตลักษณ์และการออกแบบ UI/UX (Design & Aesthetic Rules)

### 2.1 โทนสีและ Gradients (Color Palette)
- **Primary / Brand Accent:** สีส้มสดไปรษณีย์ไทย (`#EA580C`, `#F97316`)
- **Secondary / Supporting:** สีแดงเข้ม (`#DC2626`), สีทองอำพัน (`#F59E0B`), สีเขียวมรกต (`#10B981` สำหรับสถานะสำเร็จ/บริการ)
- **Backgrounds & Overlays:**
  - พื้นหลังหลัก: `bg-theme-white`
  - Modal Backdrop: `fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm`
  - หัวข้อไล่สีระดับพรีเมียม (Text Gradient):
    ```html
    <h2 class="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-theme-orange via-red-500 to-yellow-500 drop-shadow-md tracking-tight">
        <i class="fas fa-gift text-theme-orange mr-3 drop-shadow-sm"></i>สินค้าแนะนำ ระหว่างโหลดข้อมูล
    </h2>
    ```
  - ป้ายสถานะการโหลดแบบแคปซูลกึ่งกลาง (Pill Badge):
    ```html
    <div class="mt-3 inline-flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15 shadow-sm">
        <i class="fas fa-circle-notch fa-spin text-theme-orange text-sm"></i> 
        <span class="global-loader-slide-text text-sm font-semibold text-white tracking-wide">กำลังดึงข้อมูล...</span>
    </div>
    ```

### 2.2 ลำดับการซ้อนทับ (Z-Index Hierarchy)
- `z-10`: องค์ประกอบและการ์ดทั่วไปในหน้าเว็บ
- `z-20` ถึง `z-30`: เมนูด้านข้าง, Floating Header, ตัวเลือกบริการ
- `z-40`: เมนู Context Menu, Dropdown ลอย
- `z-[100]`: Global Loader Modal พร้อมพื้นหลังเบลอ
- `z-[10000]`: กล่องข้อความแจ้งเตือน SweetAlert2 (`Swal.fire`)

### 2.3 การจัดรูปแบบตัวเลขและการแสดงผล
- **ยอดเงิน:** แสดงทศนิยม 2 ตำแหน่ง พร้อมจุลภาคคั่นหลักพัน เช่น `115.00 บาท`
- **กราฟแท่งสถิติรายได้ (Top 10):** คัดกรองรายการที่มีค่าเป็น 0 ออกเสมอด้วย `.filter(item => item.rev > 0)` ก่อนนำไปวาด Chart.js

---

## 3. มาตรฐานการพัฒนาและคำสั่งสำหรับ Deploy (Deployment & Workflow)

### 3.1 การ Deploy ขึ้น Google Apps Script ด้วย clasp
- ทุกครั้งที่มีการแก้ไขโค้ด HTML หรือ JavaScript ในโปรเจกต์ จะต้องทำการสร้างเวอร์ชันและ Push ขึ้น Google Apps Script เสมอด้วยคำสั่ง:
  ```powershell
  npm run push
  ```
- กระบวนการทำงานของ `npm run push`:
  1. รัน `node update-version.js` เพื่อสร้างรหัสเวอร์ชันใหม่ตาม Timestamp ล่าสุด (เช่น `Ver. 2026.0903.1638`) บันทึกลงใน `Module_Core.html`
  2. รัน `npx clasp push -f` ส่งไฟล์ทั้งหมด 17 ไฟล์ขึ้น Google Apps Script
  3. รัน `npx clasp version` บันทึก Snapshot Version บน Google Cloud Project

### 3.2 การบันทึกและสำรองโค้ดขึ้น GitHub
- ซิงค์โค้ดขึ้น Git Remote อย่างสม่ำเสมอ:
  ```powershell
  git add .
  git commit -m "feat: [สรุปการปรับปรุงเป็นภาษาอังกฤษหรือไทยที่เข้าใจง่าย]"
  git push origin main
  ```

---

## 4. สรุปรายการไฟล์และโมดูลสำคัญในระบบ
| ชื่อไฟล์ | หน้าที่และขอบเขตความรับผิดชอบ |
| :--- | :--- |
| `Index.html` | โครงสร้างหลัก HTML5, นำเข้า CSS, Swiper.js, Chart.js, FontAwesome |
| `Module_Core.html` | ศูนย์กลาง Layout, ระบบ Sidebar, หน้าหลัก (Dashboard), ระบบ Global Loader (`showGlobalLoader`) |
| `JS_Core.html` | ฟังก์ชันส่วนกลางและ Event Listeners หลัก |
| `Module_BigLot.html` | หน้าระบบสั่งสินค้า BigLot, แคตตาล็อกสินค้า, การจัดการตะกร้า |
| `Module_BigLotReport.html` | หน้ารายงานสรุปยอดการสั่งซื้อ BigLot, ส่งออก Excel / PDF |
| `Module_RatePrice.html` | หน้าระบบตรวจสอบอัตราค่าบริการและเงื่อนไขไปรษณีย์ |
| `Module_Revenue.html` | หน้านำเข้าและประมวลผลข้อมูลรายได้ (Tableau, Logistics, DropOff) |
| `Module_Visit.html` | หน้าระบบบันทึกและสถิติการเข้าพบลูกค้าของทีมฝ่ายขาย |
| `Module_PostNews.html` | หน้าระบบสร้างภาพข่าวประชาสัมพันธ์ (Post News Canvas) |
| `Code.js` | โค้ดฝั่ง Server (Google Apps Script) ติดต่อกับ Google Sheets และ Line Notify |
