---
name: gas-thp-patterns
description: >-
  Provides guidelines and workflows for developing and modifying the THP Sales Team Reg.10 Google Apps Script project. Includes module inclusion, tailwind theming, and UI best practices.
---

# THP Sales Team Reg.10 Development Patterns

## Overview
This skill provides the required patterns for working on the THP Sales Team Reg.10 Google Apps Script project. It ensures that any modifications to the UI, theming, or architecture align with the established standards.

## Workflow

### 1. Theming and UI (Tailwind CSS)
- **Colors**: The project uses custom Tailwind theme colors: `bg-theme-black` (dark background), `text-theme-orange` (accents), `bg-theme-green` (status indicators). Use these for primary elements.
- **Glassmorphism**: Use `bg-white/5 border border-white/10 backdrop-blur-md` for floating elements, context menus, or capsule buttons.
- **Alignment**: Avoid hardcoded margins (like `mt-1.5`) for aligning icons with text. Always use `flex items-center justify-center gap-X`.
- **Toggle Elements**: Use `classList.toggle('hidden')` on elements instead of inline styles. Use Chevron icons (`fa-chevron-up/down`) to indicate toggle state.
- **Truncation**: For tight sidebar widths (260px), use `truncate` along with `leading-snug` and smaller font sizes (e.g. `text-[13.5px]`) to keep single-line components neat.

### 2. Architecture (Modularity)
- The project is split into multiple HTML files (Modules) such as `Module_Core.html`, `Module_Admin_PK.html`, etc.
- **Exporting/Including**: To include a module in `Index.html`, use the `include()` function in GAS:
  ```html
  <?!= include('Module_Name'); ?>
  ```
- **Script Tags**: Keep scripts at the bottom of the module. Ensure you wrap JS logic in `<script>` tags. 

### 3. Deployment
- Always use `clasp push` to push local changes to the Apps Script cloud.
- When making significant UI updates, increment the `APP_VERSION` variable (e.g., `Ver. 2026.06.14.2200`) in `Module_Core.html` to force cache clearing.

### 4. Background Audio
- Modifying the YouTube IFrame player requires using `cueVideoById` instead of `loadVideoById` if auto-play is not intended.
- Never use `event.target.seekTo(0, true)` inside `onYtPlayerReady` to avoid browser auto-play policy violations.

## Common Mistakes
- Writing all code in `Index.html` instead of modularizing it.
- Forgetting to run `clasp push` after making local changes.
- Using `loadVideoById` and causing unwanted auto-play.
