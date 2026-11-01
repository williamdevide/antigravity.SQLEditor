# UX Refinements & Surgical SQL Review Apply (v3.1.20)

## Goal
Implement 4 targeted UX and reliability improvements in SQLEditor (`v3.1.20`) and publish to GitHub & Vercel:
1. Cycle **Aba Dados** row limit on badge click: `Limit 30` → `Limit 100` → `Total` → `Limit 30` (persisting the chosen limit across table switches during the session).
2. Fix **Schema Explorer** column and foreign-key (`FK`) icon colors to dark gray in light themes (`light` and `beige`).
3. Require user confirmation (`window.confirm`) on the **Limpar** button before clearing the active script.
4. Fix **Revisão SQL → Aplicar no Editor** so it surgically replaces only the reviewed statement at its exact line/range (preserving all other statements and `Ctrl+Z` undo history) without forcing `LIMIT 100` into student queries.

## Tasks
- [x] **Task 1: Cycling Limit Badge (`Limit 30` → `Limit 100` → `Total` → `Limit 30`) in Aba Dados** → Update `dbEngine.getTablePreviewData` to accept `limit: number | null` (`null` = all rows without `LIMIT`), add `dataPreviewLimit: 30 | 100 | null` state in `App.tsx` (persisted across table switches in the session), and turn the `LIMIT 30` badge in `ConsoleResults.tsx` into an interactive cycling button (`Limit 30` / `Limit 100` / `Total`) updating table preview + CSV export filename. → **Verify:** Automated test verifies `getTablePreviewData` returns 30, 100, and all rows (e.g., 400 rows on `tb_pedidos`).
- [x] **Task 2: Dark Gray Field & FK Icons in Light Themes (`Sidebar.tsx` + `index.css`)** → Define semantic theme variable `--schema-icon-color` (`#FFFFFF` / high contrast in `dark` & `graphite`, dark gray `#374151` in `html.light` and `#3F3733` in `html.beige`) and apply it to `isFk` (`key`) and normal field (`view_column`) icons. → **Verify:** Inspect CSS variable bindings across all 4 themes (`dark`, `light`, `beige`, `graphite`).
- [x] **Task 3: Confirmation Prompt on `Limpar` Button (`Header.tsx` & `App.tsx`)** → Add `window.confirm` confirmation before clearing the active tab's content (skipping if the tab is already empty, and preserving Monaco undo stack via `executeEdits`). → **Verify:** Confirm `Header.tsx` / `handleClearEditor` guards clearing behind confirmation.
- [x] **Task 4: Surgical In-Place Replacement in `Revisão SQL` (`sqlReviewer.ts`, `EditorWorkspace.tsx`, `ConsoleResults.tsx`, `App.tsx`)** → Remove forced `LIMIT 100` injection from `suggestedQuery` in `sqlReviewer.ts` (keeping `LIMIT` as a textual recommendation only); track the exact `ReviewTargetRange` (`tabId`, `startLine`, `startColumn`, `endLine`, `endColumn`, `originalQuery`) whenever a review is triggered (from selection, cursor line `Alt+R` / context menu, Retorno Error Card, or Log `"Revisar SQL"`); and update `handleApplyReviewSuggestion` to replace strictly that statement's range in the editor without erasing other commands. → **Verify:** Unit tests verify multi-command script before/after applying review fixes on command #1, #2, or #3 leaves all other commands untouched and omits forced `LIMIT 100`.
- [x] **Task 5: Release `v3.1.20`, Quality Gates & Publish to GitHub/Vercel** → Bump version to `3.1.20` in `version.ts`, `package.json`, and `LandingPageView.tsx` changelog; update `documentation/promptHistory.md`; run `npm run lint` and `npm run build`; verify clean git diff (no secrets/temp files) and run `git commit` + `git push origin main`. → **Verify:** `npm run lint`, `npm run build`, and `git push origin main` succeed with exit code 0.

## Done When
- [x] Clicking `Limit 30` in **Dados** cycles `Limit 30` → `Limit 100` → `Total` → `Limit 30` and keeps the chosen limit when switching tables.
- [x] Field (`view_column`) and Foreign Key (`key`) icons in **Schema Explorer** render in dark gray in light themes (`light` and `beige`) and crisp white in dark themes (`dark` and `graphite`).
- [x] Clicking **Limpar** asks for confirmation before clearing the script.
- [x] Clicking **Aplicar no Editor** in **Revisão SQL** updates only the reviewed statement in-place without deleting surrounding commands or injecting `LIMIT 100`.
- [x] Version `v3.1.20` passes `lint` + `build` + automated tests and is pushed to `origin/main` (GitHub & Vercel).
