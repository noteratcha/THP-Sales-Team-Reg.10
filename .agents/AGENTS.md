# 🤖 Project Agents & AI Rules: THP Sales Team Reg.10

This file serves as the definitive guide for AI agents working on the THP Sales Team Reg.10 project. You must strictly follow these rules, conventions, and architectural guidelines when assisting the user.

---

## 🏛️ 1. Architecture Overview
- **Tech Stack:** Google Apps Script (GAS) acting as the backend, Google Sheets acting as the database, and HTML/CSS/JS (Vanilla JS + TailwindCSS) acting as a Single Page Application (SPA) frontend.
- **Frontend SPA Pattern:** The system uses a single `Index.html` that includes multiple `Module_*.html` files. Navigation is handled by hiding and showing `div` sections via JS (`switchPage(pageId)`).
- **Communication:** Frontend communicates with backend exclusively via `google.script.run`.

## 📁 2. File & Component Structure
Never guess where code lives. Use this mapping:
- **`Code.js`**: Server-side logic (GAS). Handles Google Sheets read/write, user validation, and API routing.
- **`Index.html`**: The root HTML file. Includes all CSS/JS libraries (Tailwind, SweetAlert2, Chart.js) and includes all modules.
- **`Module_Core.html`**: **(CRITICAL)** The heart of the frontend. Contains Login/Logout logic, Session management, Navigation Sidebar, Dashboard rendering, and global state initialization. *(Do NOT use `JS_Core.html` for logic; it is deprecated/unused)*.
- **`Module_Visit.html`**: Handles the CRM aspect (Adding visits, editing, deleting, filtering data tables).
- **`Module_BigLot.html` & `Module_BigLotReport.html`**: Inventory and sales tracking for BigLot items.
- **`Module_Admin_PK.html` / `Module_Revenue.html`**: Admin dashboards, revenue tracking, and specialized data views.
- **`Module_Modals.html`**: Contains reusable popups/modals used across different pages.
- **`Style.html`**: Custom CSS, Font declarations (Prompt), and Tailwind overrides.

## 🎨 3. UI/UX Style & Aesthetics
1. **Modern TailwindCSS (Premium Feel):**
   - Use soft glassmorphism (`backdrop-blur`, `bg-white/90`).
   - Use rounded corners (`rounded-xl`, `rounded-2xl`).
   - Use subtle shadows (`shadow-sm`, `shadow-md`, `shadow-orange-100`).
   - Always center texts or align icons using `flex items-center justify-center` or `grid`.
2. **Project Colors (Theme):**
   - Stick to custom colors when possible: `theme-orange` (Main brand), `theme-red` (Alerts/Holidays), `theme-green` (Success), `theme-black` (Text/Nav).
3. **Skeleton Loading over Spinners:**
   - When fetching data via `google.script.run`, DO NOT leave the screen blank or rely solely on a global spinner.
   - Replace the target DOM container with **Skeleton Loaders** immediately: `<div class="animate-pulse bg-orange-50 border border-orange-100/60 rounded-xl h-[88px] w-full"></div>`.
   - Ensure the skeleton perfectly mimics the final layout to prevent Layout Shift.

## 🛠️ 4. State Management & Frontend Caching
1. **Aggressive Cache Clearing on SPA:**
   - Because it's an SPA, variables persist across "pages".
   - **On Logout & Login:** You MUST reset all global JS arrays (e.g., `window.allFetchedRows = []`, `globalVisitTargets = undefined`) AND explicitly clear HTML DOM elements (`document.getElementById('tableBody').innerHTML = ''`).
   - Failure to do this results in "Ghost Data" where the new user briefly sees the old user's data.
2. **Role-Based Access Control (RBAC):**
   - Always check `currentUserInfo.user` (the actual login ID, e.g., 'admin', 'viewer', or employee ID) to verify permissions.
   - **DO NOT** use `currentUserInfo.name` (Display Name) for logic gates. Example: `if (String(currentUserInfo.user).toLowerCase() === 'admin') { ... }`.
3. **Admin Data Aggregation:**
   - When an Admin or Viewer logs in, metrics (Visits, Revenue, Targets) must **aggregate across all teams/offices**. Never leave admin metrics blank just because they don't have a personal row in the targets sheet. Use `+=` loops over all valid rows when role is Admin/Viewer.

## ⚠️ 5. Asynchronous Operations & Error Handling
- Every `google.script.run` MUST have `.withSuccessHandler()` and `.withFailureHandler()`.
- Use **SweetAlert2** (`Swal.fire`) for all alerts, confirmations, and error dialogs. Do not use native `alert()` or `confirm()`.
- Example Confirmation:
  ```javascript
  Swal.fire({ title: 'แน่ใจหรือไม่?', text: "ลบแล้วกู้คืนไม่ได้!", icon: 'warning', showCancelButton: true }).then((res) => { if (res.isConfirmed) { ... } });
  ```

## ⚙️ 6. Deployment & Versioning Workflow
1. **Force Cache Refresh:** 
   - Browsers cache GAS HTML aggressively. When modifying JS/HTML, you MUST update the `APP_VERSION` variable at the top of `Module_Core.html` (e.g., `var APP_VERSION = 'Ver. 2026.0812.2117';`).
2. **Push to Google Apps Script:** 
   - Run `npm run push` via the terminal to upload the local code to the Apps Script cloud.
   - Inform the user to manually go to the GAS Editor -> **Deploy -> Manage deployments -> New version** so the live app updates.
3. **GitHub Sync:** 
   - Repository: `noteratcha/THP-Sales-Team-Reg.10`
   - Run `git add .`, `git commit -m "Detail your changes"`, and `git push origin master` after a successful feature implementation.
