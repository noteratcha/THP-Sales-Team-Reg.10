# Project Rules: THP Sales Team Reg.10

## 🎨 UI/UX Style & Aesthetics
1. **Modern TailwindCSS Styling:**
   - Use soft glassmorphism, rounded corners (`rounded-xl` / `rounded-2xl`), and subtle shadows (`shadow-sm`, `shadow-md`) to make the UI look premium.
   - Utilize the project's custom theme colors (`theme-orange`, `theme-white`, `theme-green`, `theme-black`).
   - Use `flex` and `grid` layouts extensively to ensure responsive and well-aligned elements (e.g., centering text with `justify-center items-center`).

2. **Loading States (Skeleton Loaders):**
   - Instead of basic spinners, always use **Skeleton Loading** (`animate-pulse bg-orange-50 border border-orange-100/60 rounded-xl`) for dashboards and metrics while waiting for `google.script.run`.
   - Ensure the skeleton mimics the layout of the actual data to prevent layout shift.

## 🛠️ Technical Techniques & Google Apps Script (GAS) Best Practices
1. **State Management & Caching in SPA:**
   - Since the app is a Single Page Application (SPA) inside Apps Script, logging out or switching users requires **aggressive DOM and Cache clearing**.
   - ALWAYS clear Javascript arrays (e.g., `window.allFetchedRows = []`) and explicitly clear HTML DOM elements (e.g., `document.getElementById('tableBody').innerHTML = ''`) upon `logout()` or before rendering new data. This prevents "ghost data" from the previous session.

2. **Component File Structure:**
   - Active logic for Login, Logout, Session, and Dashboard rendering primarily resides in **`Module_Core.html`**. 
   - Note: Be careful as there might be deprecated duplicate logic in `JS_Core.html`. Always prioritize `Module_Core.html`.
   - Update `APP_VERSION` at the top of `Module_Core.html` when deploying significant updates to force cache refresh.

## ⚙️ Development Workflow
- After making code changes, always push to Google Apps Script via `npm run push` and remind the user to **Deploy -> Manage deployments -> New version** so they can see the changes.

## 🔒 Role-Based Data Aggregation & Verification
1. **User Identity Checks:**
   - Always verify roles (like Admin or Viewer) against `currentUserInfo.user` (the logged-in username/ID) rather than `currentUserInfo.name` (the display name). For example: `let userId = currentUserInfo.user.trim().toLowerCase(); if (userId === 'admin') {...}`.
2. **Admin/Viewer Data Aggregation:**
   - When an Admin or Viewer logs in, ensure that system-wide metrics (such as target goals, total revenues, and visit counts) aggregate across *all* teams or offices. Do not leave targets empty just because they lack a specific individual target.
