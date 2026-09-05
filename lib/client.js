(() => {
  // client/src/styles/workstation.css
  var workstation_default = '[data-dsh-autoqueue-view] {\r\n  --aq-canvas: var(--dsw-alias-bg-secondary, #f5f7fa);\r\n  --aq-paper: var(--dsw-alias-bg-primary, #ffffff);\r\n  --aq-surface-alt: #f8fafc;\r\n  --aq-ink: var(--dsw-alias-label-primary, #182230);\r\n  --aq-ink-2: #344054;\r\n  --aq-muted: var(--dsw-alias-label-secondary, #475467);\r\n  --aq-faint: #667085;\r\n  --aq-line: var(--dsw-alias-border-secondary, #e4e7ec);\r\n  --aq-line-2: #d0d5dd;\r\n  --aq-navy: #17212f;\r\n  --aq-navy-2: #202d3d;\r\n  --aq-blue: #155eef;\r\n  --aq-blue-soft: #eff4ff;\r\n  --aq-green: #067647;\r\n  --aq-green-soft: #ecfdf3;\r\n  --aq-amber: #93370d;\r\n  --aq-amber-soft: #fffaeb;\r\n  --aq-red: #b42318;\r\n  --aq-red-soft: #fef3f2;\r\n  --aq-radius: 10px;\r\n  --aq-font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;\r\n  --aq-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;\r\n  position: fixed;\r\n  top: 0;\r\n  left: 0;\r\n  right: 0;\r\n  bottom: 0;\r\n  z-index: 10;\r\n  display: none;\r\n  background: var(--aq-canvas);\r\n  color: var(--aq-ink);\r\n  font-family: var(--aq-font);\r\n  font-size: 14px;\r\n  line-height: 1.5;\r\n  text-rendering: optimizeLegibility;\r\n  -webkit-font-smoothing: antialiased;\r\n}\r\n\r\n[data-dsh-autoqueue-active] [data-dsh-autoqueue-view] { display: flex; }\r\n[data-dsh-autoqueue-active] [data-pane="conversation"] > *:not([data-dsh-autoqueue-view]) { display: none !important; }\r\n[data-dsh-autoqueue-active] [class*="centerCol"] > *:not([data-dsh-autoqueue-view]) { display: none !important; }\r\n[data-dsh-autoqueue-view] * { box-sizing: border-box; }\r\n[data-dsh-autoqueue-view] button,\r\n[data-dsh-autoqueue-view] input,\r\n[data-dsh-autoqueue-view] textarea,\r\n[data-dsh-autoqueue-view] select { font-family: inherit; }\r\n[data-dsh-autoqueue-view] button:focus-visible,\r\n[data-dsh-autoqueue-view] input:focus-visible,\r\n[data-dsh-autoqueue-view] textarea:focus-visible,\r\n[data-dsh-autoqueue-view] select:focus-visible,\r\n[data-dsh-autoqueue-view] [tabindex]:focus-visible {\r\n  outline: 3px solid color-mix(in srgb, var(--aq-blue) 28%, transparent);\r\n  outline-offset: 2px;\r\n}\r\n\r\n.sr-only {\r\n  position: absolute !important;\r\n  width: 1px;\r\n  height: 1px;\r\n  padding: 0;\r\n  margin: -1px;\r\n  overflow: hidden;\r\n  clip: rect(0, 0, 0, 0);\r\n  white-space: nowrap;\r\n  border: 0;\r\n}\r\n\r\n.aq-ws { display: flex; width: 100%; height: 100%; min-width: 0; overflow: hidden; background: var(--aq-canvas); }\r\n.aq-main { display: flex; flex: 1; min-width: 0; flex-direction: column; overflow: hidden; }\r\n\r\n/* Navigation */\r\n.aq-sb {\r\n  z-index: 5;\r\n  display: flex;\r\n  width: 196px;\r\n  flex: 0 0 196px;\r\n  flex-direction: column;\r\n  overflow-y: auto;\r\n  background: var(--aq-navy);\r\n  color: #d8e0ea;\r\n}\r\n.aq-brand {\r\n  display: flex;\r\n  height: 64px;\r\n  flex: 0 0 64px;\r\n  align-items: center;\r\n  gap: 10px;\r\n  padding: 0 16px;\r\n  border-bottom: 1px solid rgba(255, 255, 255, 0.08);\r\n}\r\n.aq-brand-mark {\r\n  display: grid;\r\n  width: 30px;\r\n  height: 30px;\r\n  flex: 0 0 30px;\r\n  place-items: center;\r\n  border: 1px solid rgba(255, 255, 255, 0.22);\r\n  border-radius: 8px;\r\n  color: #b8cced;\r\n}\r\n.aq-brand-mark svg { width: 16px; height: 16px; }\r\n.aq-brand > strong { color: #ffffff; font-size: 14px; font-weight: 650; }\r\n.aq-nav { display: flex; flex-direction: column; gap: 3px; padding: 16px 10px; }\r\n.aq-nav-item {\r\n  display: flex;\r\n  width: 100%;\r\n  min-height: 40px;\r\n  align-items: center;\r\n  gap: 10px;\r\n  padding: 0 10px;\r\n  border: 0;\r\n  border-radius: 7px;\r\n  background: transparent;\r\n  color: #aebdce;\r\n  cursor: pointer;\r\n  font-size: 13px;\r\n  font-weight: 600;\r\n  text-align: left;\r\n  transition: background 140ms ease, color 140ms ease;\r\n}\r\n.aq-nav-item:hover { background: rgba(255, 255, 255, 0.07); color: #ffffff; }\r\n.aq-nav-item.sel { background: rgba(255, 255, 255, 0.11); color: #ffffff; box-shadow: inset 2px 0 0 #84adff; }\r\n.aq-nav-svg { display: grid; width: 17px; height: 17px; flex: none; place-items: center; }\r\n.aq-nav-svg svg { width: 17px; height: 17px; }\r\n.aq-nav-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\r\n.aq-nav-badge { min-width: 22px; margin-left: auto; color: #aebdce; font: 600 12px/20px var(--aq-mono); text-align: center; }\r\n.aq-nav-item.sel .aq-nav-badge { color: #ffffff; }\r\n.aq-sb-foot { margin-top: auto; padding: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08); }\r\n.aq-host-state { display: flex; align-items: center; gap: 8px; color: #abefc6; font-size: 12px; font-weight: 600; }\r\n.aq-host-state.attention { color: #fedf89; }\r\n.aq-host-state.unknown { color: #b7c2cf; }\r\n.aq-live-dot { width: 7px; height: 7px; flex: none; border-radius: 50%; background: #32d583; }\r\n.aq-host-state.attention .aq-live-dot { background: #fdb022; }\r\n.aq-host-state.unknown .aq-live-dot { background: #98a2b3; }\r\n.aq-nav-scrim { display: none; }\r\n\r\n/* Header and shared controls */\r\n.aq-head {\r\n  display: flex;\r\n  height: 64px;\r\n  flex: 0 0 64px;\r\n  align-items: center;\r\n  gap: 16px;\r\n  padding: 0 24px;\r\n  border-bottom: 1px solid var(--aq-line);\r\n  background: var(--aq-paper);\r\n}\r\n.aq-head-title { min-width: 210px; margin-right: auto; }\r\n.aq-head h1 { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.25; letter-spacing: -0.02em; }\r\n.aq-head-actions { display: flex; align-items: center; gap: 8px; }\r\n.aq-btn,\r\n.aq-icon-btn {\r\n  display: inline-flex;\r\n  min-height: 38px;\r\n  align-items: center;\r\n  justify-content: center;\r\n  gap: 7px;\r\n  border: 1px solid var(--aq-line-2);\r\n  border-radius: 7px;\r\n  background: var(--aq-paper);\r\n  color: var(--aq-ink-2);\r\n  cursor: pointer;\r\n  font-size: 13px;\r\n  font-weight: 600;\r\n  line-height: 1;\r\n  white-space: nowrap;\r\n  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;\r\n}\r\n.aq-btn { padding: 0 14px; }\r\n.aq-icon-btn { width: 38px; flex: 0 0 38px; padding: 0; }\r\n.aq-btn:hover,\r\n.aq-icon-btn:hover { border-color: #98a2b3; background: var(--aq-surface-alt); color: var(--aq-ink); }\r\n.aq-btn.primary { border-color: var(--aq-blue); background: var(--aq-blue); color: #ffffff; }\r\n.aq-btn.primary:hover { border-color: #004eeb; background: #004eeb; }\r\n.aq-btn.ghost { background: transparent; }\r\n.aq-btn.danger { border-color: #fda29b; color: var(--aq-red); }\r\n.aq-btn.danger:hover { background: var(--aq-red-soft); }\r\n.aq-btn.success { border-color: #75e0a7; color: var(--aq-green); }\r\n.aq-btn.success:hover { background: var(--aq-green-soft); }\r\n.aq-btn.warn { border-color: #fec84b; color: var(--aq-amber); }\r\n.aq-btn:disabled,\r\n.aq-icon-btn:disabled { cursor: not-allowed; opacity: 0.45; }\r\n.aq-btn svg,\r\n.aq-icon-btn svg { width: 15px; height: 15px; }\r\n.aq-close-board { margin-left: 2px; border-color: transparent; background: transparent; }\r\n.aq-mobile-menu,\r\n.aq-mobile-access { display: none; }\r\n.aq-toast {\r\n  position: absolute;\r\n  z-index: 20;\r\n  top: 14px;\r\n  left: 50%;\r\n  padding: 9px 14px;\r\n  transform: translateX(-50%);\r\n  border-radius: 7px;\r\n  background: var(--aq-navy);\r\n  box-shadow: 0 8px 24px rgba(16, 24, 40, 0.18);\r\n  color: #ffffff;\r\n  font-size: 13px;\r\n}\r\n.aq-err {\r\n  display: flex;\r\n  flex-shrink: 0;\r\n  align-items: center;\r\n  gap: 10px;\r\n  padding: 10px 24px;\r\n  border-bottom: 1px solid #fecdca;\r\n  background: var(--aq-red-soft);\r\n  color: var(--aq-red);\r\n  font-size: 13px;\r\n}\r\n.aq-err strong { font-size: 13px; }\r\n.aq-err-dismiss { width: 32px; height: 32px; margin-left: auto; border: 0; background: transparent; color: inherit; cursor: pointer; font-size: 20px; }\r\n.aq-canvas { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 24px 28px; }\r\n\r\n/* Workspace and runtime */\r\n.aq-workspace-head {\r\n  display: grid;\r\n  grid-template-columns: minmax(0, 1fr) auto;\r\n  align-items: center;\r\n  gap: 14px 20px;\r\n  margin-bottom: 14px;\r\n}\r\n.aq-workspace-copy h2 { margin: 0; font-size: 19px; font-weight: 700; line-height: 1.25; letter-spacing: -0.015em; }\r\n.aq-workspace-copy p { max-width: 680px; margin: 4px 0 0; color: var(--aq-muted); font-size: 13px; }\r\n.aq-workspace-action { justify-self: end; }\r\n.aq-runtime-pending {\r\n  grid-column: 1 / -1;\r\n  padding: 12px 14px;\r\n  border: 1px solid var(--aq-line);\r\n  border-radius: var(--aq-radius);\r\n  background: var(--aq-paper);\r\n  color: var(--aq-muted);\r\n  font-size: 13px;\r\n}\r\n.aq-runtime-observation {\r\n  grid-column: 1 / -1;\r\n  overflow: hidden;\r\n  border: 1px solid var(--aq-line);\r\n  border-radius: var(--aq-radius);\r\n  background: var(--aq-paper);\r\n}\r\n.aq-runtime-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }\r\n.aq-runtime-summary > div { min-width: 0; padding: 12px 14px; }\r\n.aq-runtime-summary > div + div { border-left: 1px solid var(--aq-line); }\r\n.aq-runtime-summary span { display: block; color: var(--aq-faint); font-size: 12px; }\r\n.aq-runtime-summary strong { display: block; margin-top: 3px; overflow: hidden; color: var(--aq-ink-2); font-size: 13px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }\r\n.aq-runtime-diagnostics { border-top: 1px solid var(--aq-line); }\r\n.aq-runtime-diagnostics summary { padding: 10px 14px; color: var(--aq-blue); cursor: pointer; font-size: 13px; font-weight: 600; }\r\n.aq-runtime-diagnostics dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 24px; margin: 0; padding: 0 14px 12px; }\r\n.aq-runtime-diagnostics dl > div { display: flex; min-width: 0; justify-content: space-between; gap: 12px; padding: 8px 0; border-top: 1px solid var(--aq-line); }\r\n.aq-runtime-diagnostics dt { color: var(--aq-faint); font-size: 12px; }\r\n.aq-runtime-diagnostics dd { margin: 0; overflow-wrap: anywhere; color: var(--aq-ink-2); font-size: 12px; font-weight: 600; text-align: right; }\r\n\r\n.aq-safety-bar {\r\n  display: grid;\r\n  grid-template-columns: repeat(3, minmax(0, 1fr));\r\n  margin-bottom: 16px;\r\n  overflow: hidden;\r\n  border: 1px solid var(--aq-line);\r\n  border-left: 3px solid var(--aq-green);\r\n  border-radius: var(--aq-radius);\r\n  background: var(--aq-paper);\r\n}\r\n.aq-safety-bar.warn { border-left-color: var(--aq-amber); }\r\n.aq-safety-bar.danger { border-left-color: var(--aq-red); }\r\n.aq-safety-item { display: flex; min-width: 0; align-items: center; gap: 10px; padding: 11px 14px; }\r\n.aq-safety-item + .aq-safety-item { border-left: 1px solid var(--aq-line); }\r\n.aq-state-mark {\r\n  display: grid;\r\n  width: 22px;\r\n  height: 22px;\r\n  flex: 0 0 22px;\r\n  place-items: center;\r\n  border-radius: 50%;\r\n  background: var(--aq-green-soft);\r\n  color: var(--aq-green);\r\n  font-size: 12px;\r\n  font-weight: 750;\r\n}\r\n.aq-safety-item.warn .aq-state-mark { background: var(--aq-amber-soft); color: var(--aq-amber); }\r\n.aq-safety-item.danger .aq-state-mark { background: var(--aq-red-soft); color: var(--aq-red); }\r\n.aq-safety-item.active .aq-state-mark { background: var(--aq-blue-soft); color: var(--aq-blue); }\r\n.aq-safety-item.neutral .aq-state-mark { background: var(--aq-surface-alt); color: var(--aq-faint); }\r\n.aq-safety-item strong { display: block; color: var(--aq-ink-2); font-size: 13px; font-weight: 650; }\r\n.aq-safety-item small { display: block; margin-top: 1px; overflow: hidden; color: var(--aq-faint); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }\r\n\r\n/* Queue controls and rows */\r\n.aq-queue-tools { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }\r\n.aq-search {\r\n  display: flex;\r\n  width: 270px;\r\n  min-height: 40px;\r\n  align-items: center;\r\n  padding: 0 11px;\r\n  border: 1px solid var(--aq-line-2);\r\n  border-radius: 7px;\r\n  background: var(--aq-paper);\r\n  color: var(--aq-faint);\r\n}\r\n.aq-search:focus-within { border-color: var(--aq-blue); box-shadow: 0 0 0 3px color-mix(in srgb, var(--aq-blue) 12%, transparent); }\r\n.aq-search-icon { display: grid; width: 17px; height: 17px; flex: 0 0 17px; margin-right: 8px; place-items: center; }\r\n.aq-search-icon svg { width: 16px; height: 16px; }\r\n.aq-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--aq-ink); font-size: 13px; }\r\n.aq-search input::placeholder { color: var(--aq-faint); }\r\n.aq-tabs { display: flex; align-items: center; gap: 2px; margin-left: auto; padding: 2px; border: 1px solid var(--aq-line); border-radius: 7px; background: var(--aq-paper); }\r\n.aq-tab {\r\n  height: 34px;\r\n  padding: 0 11px;\r\n  border: 0;\r\n  border-radius: 5px;\r\n  background: transparent;\r\n  color: var(--aq-muted);\r\n  cursor: pointer;\r\n  font-size: 12px;\r\n  font-weight: 600;\r\n  white-space: nowrap;\r\n}\r\n.aq-tab:hover { color: var(--aq-ink); }\r\n.aq-tab.sel { background: var(--aq-navy); color: #ffffff; }\r\n.aq-tab-count { margin-left: 4px; font: 600 12px/1 var(--aq-mono); opacity: 0.78; }\r\n.aq-batch { display: flex; min-height: 44px; align-items: center; gap: 8px; margin-bottom: 10px; padding: 6px 10px 6px 14px; border: 1px solid #b2ccff; border-radius: 8px; background: var(--aq-blue-soft); color: #1849a9; font-size: 13px; }\r\n.aq-batch > span { margin-right: auto; }\r\n.aq-batch .aq-btn { min-height: 32px; }\r\n.aq-list-shell { overflow: hidden; border: 1px solid var(--aq-line); border-radius: var(--aq-radius); background: var(--aq-paper); }\r\n.aq-list-head,\r\n.aq-task-row {\r\n  display: grid;\r\n  grid-template-columns: 30px minmax(230px, 2.1fr) 108px minmax(80px, 0.85fr) minmax(100px, 1fr) auto;\r\n  column-gap: 14px;\r\n}\r\n.aq-list-head { align-items: center; }\r\n.aq-task-row { align-items: start; }\r\n.aq-list-head > *,\r\n.aq-task-row > * { min-width: 0; }\r\n.aq-task-row > .aq-row-actions { overflow: visible; }\r\n.aq-list-head { height: 42px; padding: 0 16px; border-bottom: 1px solid var(--aq-line); color: var(--aq-faint); font-size: 12px; font-weight: 650; }\r\n.aq-task-row { position: relative; min-height: 84px; padding: 12px 16px; border-bottom: 1px solid var(--aq-line); background: var(--aq-paper); cursor: pointer; }\r\n.aq-task-row:last-child { border-bottom: 0; }\r\n.aq-task-row::before { position: absolute; top: 0; bottom: 0; left: 0; width: 3px; background: transparent; content: ""; }\r\n.aq-task-row:hover { background: var(--aq-surface-alt); }\r\n.aq-task-row.selected { background: var(--aq-blue-soft); }\r\n.aq-task-row.status-running::before { background: var(--aq-blue); }\r\n.aq-task-row.status-done::before { background: var(--aq-green); }\r\n.aq-task-row.attention::before { background: var(--aq-amber); }\r\n.aq-select { display: grid; width: 30px; height: 40px; place-items: center; cursor: pointer; }\r\n.aq-select input,\r\n.aq-modal input[type="checkbox"],\r\n.aq-config-body input[type="checkbox"] {\r\n  appearance: none;\r\n  width: 17px;\r\n  height: 17px;\r\n  min-height: 17px;\r\n  padding: 0;\r\n  border: 1px solid #98a2b3;\r\n  border-radius: 4px;\r\n  background: var(--aq-paper);\r\n  cursor: pointer;\r\n}\r\n.aq-select input:checked,\r\n.aq-modal input[type="checkbox"]:checked,\r\n.aq-config-body input[type="checkbox"]:checked { border-color: var(--aq-blue); background: var(--aq-blue); box-shadow: inset 0 0 0 3px var(--aq-paper); }\r\n.aq-select input:disabled { cursor: not-allowed; opacity: 0.35; }\r\n.aq-task-main { min-width: 0; }\r\n.aq-card-key { display: flex; min-width: 0; align-items: center; gap: 7px; }\r\n.aq-task-open { min-width: 0; padding: 0; border: 0; background: transparent; color: var(--aq-ink); cursor: pointer; text-align: left; }\r\n.aq-task-open strong { display: block; overflow: hidden; font-size: 14px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }\r\n.aq-card-key .unread { width: 7px; height: 7px; flex: none; border-radius: 50%; background: var(--aq-blue); }\r\n.aq-card-type { display: inline-flex; align-items: center; gap: 4px; padding: 2px 5px; border: 1px solid var(--aq-line); border-radius: 4px; color: var(--aq-faint); font-size: 12px; font-weight: 600; white-space: nowrap; }\r\n.aq-card-type svg { width: 11px; height: 11px; }\r\n.aq-card-summary { margin: 4px 0 0; overflow: hidden; color: var(--aq-muted); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }\r\n.aq-running-detail { display: block; margin-top: 4px; color: var(--aq-blue); font-size: 12px; font-weight: 600; }\r\n.aq-task-status,\r\n.aq-task-plan,\r\n.aq-recent { display: flex; min-width: 0; flex-direction: column; gap: 3px; }\r\n.aq-task-status small,\r\n.aq-task-plan small,\r\n.aq-recent small { overflow: hidden; color: var(--aq-faint); font-size: 12px; }\r\n.aq-task-plan strong,\r\n.aq-recent strong { overflow: hidden; color: var(--aq-ink-2); font-size: 12px; font-weight: 600; }\r\n.aq-status-pill { --status-color: var(--aq-muted); display: inline-flex; width: max-content; max-width: 100%; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; background: color-mix(in srgb, var(--status-color) 10%, transparent); color: var(--status-color); font-size: 12px; font-weight: 700; white-space: nowrap; }\r\n.aq-status-pill i { width: 6px; height: 6px; flex: none; border-radius: 50%; background: currentColor; }\r\n.aq-priority { display: flex; align-items: center; gap: 6px; color: var(--aq-muted); font-size: 12px; }\r\n.aq-priority i { width: 6px; height: 6px; border-radius: 50%; background: #b54708; }\r\n.aq-priority i.high { background: var(--aq-red); }\r\n.aq-row-actions { display: flex; min-width: 0; overflow: visible; align-items: center; justify-content: flex-end; gap: 3px; flex-shrink: 0; }\r\n.aq-row-action { display: inline-flex; height: 30px; flex: 0 0 auto; align-items: center; padding: 0 10px; border: 1px solid transparent; border-radius: 7px; background: transparent; color: var(--aq-muted); cursor: pointer; font-size: 12px; font-weight: 650; white-space: nowrap; }\r\n.aq-row-action:hover { border-color: var(--aq-line-2); background: var(--aq-paper); color: var(--aq-ink); }\r\n.aq-row-action svg { width: 16px; height: 16px; flex-shrink: 0; }\r\n.aq-row-action.danger { color: var(--aq-red); }\r\n.aq-row-action.success { color: var(--aq-green); }\r\n\r\n/* Empty and loading */\r\n.aq-empty { min-height: 180px; padding: 42px 24px; border: 1px solid var(--aq-line); border-radius: var(--aq-radius); background: var(--aq-paper); text-align: center; }\r\n.aq-empty > div { max-width: 420px; margin: 0 auto; }\r\n.aq-empty h2 { margin: 0 0 6px; font-size: 18px; font-weight: 700; }\r\n.aq-empty p { margin: 0 0 18px; color: var(--aq-muted); font-size: 13px; }\r\n.aq-loading { display: flex; min-height: 220px; align-items: center; justify-content: center; gap: 10px; color: var(--aq-muted); font-size: 13px; }\r\n.aq-loader { width: 18px; height: 18px; border: 2px solid var(--aq-line-2); border-top-color: var(--aq-blue); border-radius: 50%; animation: aq-spin 800ms linear infinite; }\r\n@keyframes aq-spin { to { transform: rotate(360deg); } }\r\n\r\n/* Dialogs and forms */\r\n.aq-m-overlay,\r\n.aq-d-overlay { position: fixed; inset: 0; z-index: 100; display: flex; background: rgba(16, 24, 40, 0.42); }\r\n.aq-m-overlay { align-items: center; justify-content: center; padding: 22px; }\r\n.aq-d-overlay { justify-content: flex-end; }\r\n.aq-modal,\r\n.aq-d-panel { outline: 0; background: var(--aq-paper); box-shadow: 0 24px 70px rgba(16, 24, 40, 0.22); color: var(--aq-ink); }\r\n.aq-modal { width: min(620px, 94vw); max-height: min(88vh, 900px); overflow-y: auto; border: 1px solid var(--aq-line); border-radius: 14px; }\r\n.aq-modal.wide { width: min(760px, 94vw); }\r\n.aq-d-panel { display: flex; width: min(590px, 94vw); height: 100%; flex-direction: column; overflow: hidden; animation: aq-slide-in 200ms ease-out; }\r\n@keyframes aq-slide-in { from { transform: translateX(18px); opacity: 0.65; } to { transform: none; opacity: 1; } }\r\n.aq-modal > h3,\r\n.aq-modal > .aq-modal-title { margin: 0; padding: 20px 24px 15px; border-bottom: 1px solid var(--aq-line); font-size: 18px; line-height: 1.3; }\r\n.aq-modal-content { padding: 20px 24px 24px; }\r\n.aq-modal-subtitle { margin: -4px 0 17px; color: var(--aq-muted); font-size: 13px; }\r\n.aq-modal label,\r\n.aq-field-label,\r\n.aq-config-body label { display: block; margin: 11px 0 5px; color: var(--aq-ink-2); font-size: 13px; font-weight: 600; }\r\n.aq-modal input,\r\n.aq-modal textarea,\r\n.aq-modal select,\r\n.aq-config-body input,\r\n.aq-config-body select {\r\n  width: 100%;\r\n  min-height: 40px;\r\n  margin: 0;\r\n  padding: 8px 11px;\r\n  border: 1px solid var(--aq-line-2);\r\n  border-radius: 7px;\r\n  outline: 0;\r\n  background: var(--aq-paper);\r\n  color: var(--aq-ink);\r\n  font-size: 13px;\r\n}\r\n.aq-modal textarea { min-height: 132px; resize: vertical; line-height: 1.6; }\r\n.aq-modal input:focus,\r\n.aq-modal textarea:focus,\r\n.aq-modal select:focus,\r\n.aq-config-body input:focus,\r\n.aq-config-body select:focus { border-color: var(--aq-blue); box-shadow: 0 0 0 3px color-mix(in srgb, var(--aq-blue) 10%, transparent); }\r\n.aq-modal select,\r\n.aq-config-body select { cursor: pointer; }\r\n.aq-modal input:disabled,\r\n.aq-config-body input:disabled { background: var(--aq-surface-alt); color: var(--aq-faint); cursor: not-allowed; }\r\n.aq-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }\r\n.aq-row.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }\r\n.aq-help { margin: 4px 0; color: var(--aq-faint); font-size: 12px; }\r\n.aq-form-section { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--aq-line); }\r\n.aq-form-section > button { display: flex; width: 100%; align-items: center; justify-content: space-between; padding: 0; border: 0; background: transparent; color: var(--aq-ink); cursor: pointer; font-size: 13px; font-weight: 650; }\r\n.aq-form-section > button span:last-child { color: var(--aq-faint); }\r\n.aq-disclosure-body { padding-top: 8px; }\r\n.aq-check-row { display: flex !important; align-items: center; gap: 9px; margin-top: 12px !important; cursor: pointer; }\r\n.aq-check-row span { color: var(--aq-ink-2); font-size: 13px; }\r\n.aq-modal-actions { position: sticky; bottom: 0; display: flex; justify-content: flex-end; gap: 8px; margin: 22px -24px -24px; padding: 14px 24px; border-top: 1px solid var(--aq-line); background: var(--aq-paper); }\r\n.aq-inline-error { margin-bottom: 12px; padding: 10px 11px; border: 1px solid #fecdca; border-radius: 7px; background: var(--aq-red-soft); color: var(--aq-red); font-size: 13px; }\r\n.aq-cron-field { display: grid; grid-template-columns: minmax(120px, 0.85fr) minmax(0, 1.15fr); gap: 8px; }\r\n.aq-confirm { width: min(420px, 94vw); }\r\n.aq-confirm-message { margin: 0; color: var(--aq-ink-2); font-size: 14px; line-height: 1.7; }\r\n\r\n.aq-d-hd { z-index: 2; display: flex; align-items: flex-start; gap: 14px; padding: 20px 24px 16px; border-bottom: 1px solid var(--aq-line); background: var(--aq-paper); }\r\n.aq-d-hd > div { min-width: 0; flex: 1; }\r\n.aq-d-hd h3 { margin: 0; font-size: 18px; line-height: 1.3; overflow-wrap: anywhere; }\r\n.aq-d-hd p { margin: 5px 0 0; color: var(--aq-muted); font-size: 13px; }\r\n.aq-d-close { display: grid; width: 38px; height: 38px; flex: 0 0 38px; margin-left: auto; place-items: center; border: 1px solid var(--aq-line); border-radius: 7px; background: var(--aq-paper); color: var(--aq-muted); cursor: pointer; font-size: 20px; }\r\n.aq-d-close:hover { border-color: var(--aq-line-2); color: var(--aq-ink); }\r\n.aq-d-close svg { width: 15px; height: 15px; }\r\n.aq-d-body { flex: 1; padding: 20px 24px; overflow-y: auto; }\r\n.aq-d-section { margin: 0 0 24px; }\r\n.aq-d-section-title { margin-bottom: 9px; color: var(--aq-ink-2); font-size: 13px; font-weight: 700; }\r\n.aq-d-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; overflow: hidden; border: 1px solid var(--aq-line); border-radius: 8px; background: var(--aq-line); }\r\n.aq-d-item { min-width: 0; padding: 10px 12px; background: var(--aq-paper); }\r\n.aq-d-item .dl { display: block; margin-bottom: 3px; color: var(--aq-faint); font-size: 12px; }\r\n.aq-d-item .dv { display: block; overflow-wrap: anywhere; color: var(--aq-ink-2); font-size: 13px; font-weight: 650; }\r\n.aq-d-report { max-height: 280px; overflow: auto; padding: 12px 14px; border: 1px solid var(--aq-line); border-radius: 8px; background: var(--aq-surface-alt); }\r\n.aq-d-report pre { margin: 0; overflow-wrap: anywhere; font: 12px/1.65 var(--aq-mono); white-space: pre-wrap; }\r\n.aq-d-actions { display: flex; gap: 7px; padding: 13px 24px; overflow-x: auto; border-top: 1px solid var(--aq-line); background: var(--aq-paper); }\r\n.aq-inspector-status { display: flex; align-items: center; gap: 10px; margin-top: 8px; }\r\n.aq-inspector-status small { color: var(--aq-faint); font-size: 12px; }\r\n.aq-inspector-tabs { display: flex; height: 46px; flex: 0 0 46px; align-items: flex-end; gap: 18px; padding: 0 24px; border-bottom: 1px solid var(--aq-line); background: var(--aq-paper); }\r\n.aq-inspector-tabs button { height: 46px; padding: 0 2px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--aq-muted); cursor: pointer; font-size: 13px; font-weight: 650; }\r\n.aq-inspector-tabs button.sel { border-bottom-color: var(--aq-blue); color: var(--aq-blue); }\r\n.aq-detail-loading { padding: 14px; color: var(--aq-faint); font-size: 13px; text-align: center; }\r\n.aq-detail-error { padding: 16px; border: 1px solid #fecdca; border-radius: 8px; background: var(--aq-red-soft); }\r\n.aq-detail-error strong { color: var(--aq-red); font-size: 14px; }\r\n.aq-detail-error p { margin: 5px 0 12px; color: var(--aq-muted); font-size: 13px; overflow-wrap: anywhere; }\r\n.aq-isolation-state { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 20px; padding: 12px 13px; border-radius: 8px; }\r\n.aq-isolation-state.attention { background: var(--aq-amber-soft); color: var(--aq-amber); }\r\n.aq-isolation-mark { display: grid; width: 22px; height: 22px; flex: 0 0 22px; place-items: center; border: 1px solid currentColor; border-radius: 50%; font-size: 12px; font-weight: 750; }\r\n.aq-isolation-state strong { display: block; font-size: 13px; }\r\n.aq-isolation-state p { margin: 3px 0 0; color: var(--aq-muted); font-size: 12px; line-height: 1.55; }\r\n.aq-error-detail { padding: 11px 12px; border-left: 3px solid var(--aq-red); background: var(--aq-red-soft); color: var(--aq-red); font: 12px/1.6 var(--aq-mono); overflow-wrap: anywhere; }\r\n.aq-runtime-note { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; padding: 11px 13px; border: 1px solid #b2ccff; border-radius: 8px; background: var(--aq-blue-soft); }\r\n.aq-runtime-note strong,\r\n.aq-runtime-note span { font-size: 13px; }\r\n.aq-runtime-note span { color: var(--aq-blue); font-weight: 650; text-align: right; }\r\n.aq-execution-list article { display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--aq-line); }\r\n.aq-exec-index { display: grid; width: 30px; height: 30px; place-items: center; border: 1px solid var(--aq-line-2); border-radius: 50%; color: var(--aq-faint); font: 600 12px/1 var(--aq-mono); }\r\n.aq-execution-list strong { font-size: 13px; }\r\n.aq-execution-list p { margin: 3px 0; color: var(--aq-faint); font-size: 12px; }\r\n.aq-execution-list code { display: block; overflow-wrap: anywhere; color: var(--aq-red); font: 12px/1.5 var(--aq-mono); white-space: pre-wrap; }\r\n.aq-tab-empty { padding: 28px 4px; color: var(--aq-faint); font-size: 13px; }\r\n.aq-tab-empty strong { display: block; color: var(--aq-ink); font-size: 14px; }\r\n.aq-tab-empty p { margin: 5px 0 0; }\r\n.aq-policy-lock { padding: 12px 13px; border-left: 3px solid var(--aq-blue); background: var(--aq-blue-soft); }\r\n.aq-policy-lock strong { display: block; color: var(--aq-blue); font-size: 13px; }\r\n.aq-policy-lock p { margin: 3px 0 0; color: var(--aq-muted); font-size: 12px; line-height: 1.55; }\r\n\r\n.aq-config-panel { width: min(620px, 96vw); }\r\n.aq-config-body { flex: 1; min-height: 0; padding: 18px 24px 0; overflow-y: auto; }\r\n.aq-config-section { margin-bottom: 18px; padding: 0 0 18px; border-bottom: 1px solid var(--aq-line); }\r\n.aq-config-section h4 { margin: 0 0 8px; color: var(--aq-ink-2); font-size: 13px; font-weight: 700; }\r\n.aq-config-actions { position: sticky; z-index: 2; bottom: 0; justify-content: flex-end; margin: 8px -24px 0; }\r\n.aq-config-body .aq-check-row { display: flex; align-items: center; gap: 8px; }\r\n\r\n/* External AI access */\r\n.aq-access-panel { width: min(610px, 96vw); }\r\n.aq-access-body { padding: 20px 24px 28px; overflow-y: auto; }\r\n.aq-access-intro { margin-bottom: 16px; }\r\n.aq-security-badge { display: inline-block; padding: 4px 8px; border-radius: 999px; background: var(--aq-green-soft); color: var(--aq-green); font-size: 12px; font-weight: 700; }\r\n.aq-access-intro h4 { margin: 9px 0 5px; font-size: 16px; }\r\n.aq-access-intro p,\r\n.aq-access-note { margin: 0; color: var(--aq-muted); font-size: 13px; line-height: 1.6; }\r\n.aq-auth-note { margin-top: 5px !important; color: var(--aq-faint) !important; }\r\n.aq-cap-loading,\r\n.aq-cap-error { margin: 0 0 16px; padding: 14px; border: 1px solid var(--aq-line); border-radius: 8px; background: var(--aq-paper); }\r\n.aq-cap-loading span { display: block; width: 55%; height: 10px; margin-bottom: 8px; border-radius: 5px; background: var(--aq-line); animation: aq-cap-pulse 1.2s ease-in-out infinite alternate; }\r\n.aq-cap-loading span:nth-child(1) { width: 38%; }\r\n.aq-cap-loading span:nth-child(2) { width: 72%; }\r\n.aq-cap-loading p { margin: 10px 0 0; color: var(--aq-faint); font-size: 13px; }\r\n@keyframes aq-cap-pulse { to { opacity: 0.4; } }\r\n.aq-cap-error { border-color: #fecdca; background: var(--aq-red-soft); }\r\n.aq-cap-error strong { display: block; color: var(--aq-red); font-size: 13px; }\r\n.aq-cap-error p { margin: 4px 0 10px; color: var(--aq-muted); font-size: 13px; overflow-wrap: anywhere; }\r\n.aq-cap-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin: 0 0 18px; border-top: 1px solid var(--aq-line); border-bottom: 1px solid var(--aq-line); }\r\n.aq-cap-summary > div { min-width: 0; padding: 11px 10px; }\r\n.aq-cap-summary span { display: block; color: var(--aq-faint); font-size: 12px; }\r\n.aq-cap-summary strong { display: block; margin-top: 3px; overflow: hidden; color: var(--aq-ink-2); font-size: 13px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }\r\n.aq-cap-optin { margin: -8px 0 18px; color: var(--aq-muted); font-size: 12px; }\r\n.aq-cap-optin code { color: var(--aq-blue); font: 600 12px/1.4 var(--aq-mono); }\r\n.aq-cap-section { margin: 18px 0; }\r\n.aq-cap-section > h4 { margin: 0 0 9px; font-size: 14px; }\r\n.aq-cap-tags { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 14px; }\r\n.aq-cap-tags span { position: relative; padding-left: 17px; color: var(--aq-ink-2); font-size: 12px; }\r\n.aq-cap-tags span::before { position: absolute; left: 0; color: var(--aq-green); content: "\u2713"; font-weight: 750; }\r\n.aq-cap-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }\r\n.aq-cap-list { min-width: 0; padding: 12px; border: 1px solid var(--aq-line); border-radius: 8px; background: var(--aq-paper); }\r\n.aq-cap-list > strong { display: block; margin-bottom: 7px; color: var(--aq-ink-2); font-size: 13px; }\r\n.aq-cap-list > div { display: grid; grid-template-columns: minmax(76px, 0.8fr) minmax(0, 1.2fr); gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--aq-line); }\r\n.aq-cap-list > div:last-child { border-bottom: 0; }\r\n.aq-cap-list span { color: var(--aq-muted); font-size: 12px; overflow-wrap: anywhere; }\r\n.aq-cap-list code { color: var(--aq-blue); font: 12px/1.45 var(--aq-mono); overflow-wrap: anywhere; text-align: right; }\r\n.aq-cap-list p { margin: 0; color: var(--aq-faint); font-size: 12px; }\r\n.aq-cap-isolation { margin: 18px 0; padding: 12px; border-left: 3px solid var(--aq-amber); background: var(--aq-amber-soft); }\r\n.aq-cap-isolation.safe { border-color: var(--aq-green); background: var(--aq-green-soft); }\r\n.aq-cap-isolation.error,\r\n.aq-cap-isolation.unsafe { border-color: var(--aq-red); background: var(--aq-red-soft); }\r\n.aq-cap-isolation strong { display: block; font-size: 13px; }\r\n.aq-cap-isolation p { margin: 3px 0 10px; color: var(--aq-muted); font-size: 12px; }\r\n.aq-cap-isolation dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin: 0; }\r\n.aq-cap-isolation dl > div { display: flex; justify-content: space-between; gap: 8px; padding-top: 6px; border-top: 1px solid color-mix(in srgb, currentColor 16%, transparent); }\r\n.aq-cap-isolation dt { color: var(--aq-faint); font-size: 12px; }\r\n.aq-cap-isolation dd { margin: 0; font: 600 12px/1.4 var(--aq-mono); overflow-wrap: anywhere; text-align: right; }\r\n.aq-tool-catalog { margin: 16px 0; border: 1px solid var(--aq-line); border-radius: 8px; background: var(--aq-paper); }\r\n.aq-tool-catalog summary { padding: 10px 12px; cursor: pointer; font-size: 13px; font-weight: 650; }\r\n.aq-tool-catalog > div { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 12px 12px; }\r\n.aq-tool-catalog code { padding: 4px 6px; border-radius: 4px; background: var(--aq-blue-soft); color: var(--aq-blue); font: 12px/1.4 var(--aq-mono); overflow-wrap: anywhere; }\r\n.aq-endpoint { display: grid; grid-template-columns: 105px minmax(0, 1fr) 48px; align-items: center; gap: 8px; padding: 13px 0; border-top: 1px solid var(--aq-line); }\r\n.aq-endpoint span { font-size: 13px; font-weight: 650; }\r\n.aq-endpoint code { color: var(--aq-blue); font: 12px/1.45 var(--aq-mono); overflow-wrap: anywhere; }\r\n.aq-endpoint button,\r\n.aq-code-block button { border: 0; background: transparent; color: var(--aq-blue); cursor: pointer; font-size: 12px; font-weight: 650; }\r\n.aq-code-block { margin: 14px 0; padding: 13px 15px; border-radius: 8px; background: var(--aq-navy); color: #d8e5f2; }\r\n.aq-code-block > div { display: flex; align-items: center; justify-content: space-between; }\r\n.aq-code-block strong { font-size: 13px; }\r\n.aq-code-block button { color: #84adff; }\r\n.aq-code-block pre { margin: 9px 0 0; color: #c2ccda; font: 12px/1.6 var(--aq-mono); overflow-wrap: anywhere; white-space: pre-wrap; }\r\n.aq-access-note { margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--aq-line); }\r\n\r\n/* Entry inside the host sidebar */\r\n.aq-sidebar-entry { box-sizing: border-box; display: flex; width: 100%; height: 36px; align-items: center; gap: 8px; padding: 0 10px; border: 0; border-radius: 8px; background: none; color: var(--dsw-alias-label-secondary, #475467); cursor: pointer; font-family: inherit; font-size: 13px; white-space: nowrap; }\r\n.aq-sidebar-entry:hover { background: var(--dsw-alias-interactive-bg-hover, #f2f4f7); color: var(--dsw-alias-label-primary, #182230); }\r\n.aq-sidebar-entry[data-active] { background: var(--dsw-alias-interactive-bg-active, #eaecf0); color: var(--dsw-alias-label-primary, #182230); font-weight: 600; }\r\n.aq-sidebar-icon { display: inline-flex; width: 24px; height: 24px; flex: none; align-items: center; justify-content: center; }\r\n.aq-sidebar-icon svg { display: block; width: 18px; height: 18px; }\r\n.aq-sidebar-label { overflow: hidden; text-overflow: ellipsis; }\r\n[data-sidebar-collapsed] .aq-sidebar-entry { width: 36px; height: 36px; justify-content: center; margin: 0 auto 12px; padding: 0; border-radius: 50%; }\r\n[data-sidebar-collapsed] .aq-sidebar-label { display: none; }\r\n\r\n/* Dark host compatibility */\r\n[data-theme="dark"] [data-dsh-autoqueue-view],\r\n[data-color-mode="dark"] [data-dsh-autoqueue-view],\r\n.dark [data-dsh-autoqueue-view] {\r\n  --aq-canvas: #111820;\r\n  --aq-paper: #18212b;\r\n  --aq-surface-alt: #1d2834;\r\n  --aq-ink: #f2f4f7;\r\n  --aq-ink-2: #e4e7ec;\r\n  --aq-muted: #c0c8d2;\r\n  --aq-faint: #aeb8c5;\r\n  --aq-line: #344054;\r\n  --aq-line-2: #475467;\r\n  --aq-navy: #0d141c;\r\n  --aq-blue: #84adff;\r\n  --aq-blue-soft: #1d2d4c;\r\n  --aq-green: #75e0a7;\r\n  --aq-green-soft: #16352a;\r\n  --aq-amber: #fec84b;\r\n  --aq-amber-soft: #3a3018;\r\n  --aq-red: #fda29b;\r\n  --aq-red-soft: #3d2423;\r\n}\r\n[data-theme="dark"] .aq-btn.primary,\r\n[data-color-mode="dark"] .aq-btn.primary,\r\n.dark .aq-btn.primary { border-color: #528bff; background: #2459b8; color: #ffffff; }\r\n[data-theme="dark"] .aq-tab.sel,\r\n[data-color-mode="dark"] .aq-tab.sel,\r\n.dark .aq-tab.sel { background: #344054; }\r\n\r\n/* Responsive */\r\n@media (max-width: 1180px) {\r\n  .aq-list-head,\r\n  .aq-task-row { grid-template-columns: 28px minmax(220px, 2fr) 105px minmax(115px, 0.9fr) minmax(130px, 1fr) 116px; }\r\n  .aq-row-actions { flex-wrap: wrap; }\r\n}\r\n\r\n@media (max-width: 900px) {\r\n  .aq-sb { width: 68px; flex-basis: 68px; }\r\n  .aq-brand { justify-content: center; padding: 0; }\r\n  .aq-brand > strong,\r\n  .aq-nav-text { display: none; }\r\n  .aq-nav { padding: 16px 9px; }\r\n  .aq-nav-item { position: relative; justify-content: center; padding: 0; }\r\n  .aq-nav-badge { position: absolute; top: 2px; right: 1px; min-width: 16px; color: #d8e0ea; font-size: 11px; line-height: 16px; }\r\n  .aq-sb-foot { display: grid; padding: 16px 0; place-items: center; }\r\n  .aq-host-state span:last-child { display: none; }\r\n  .aq-head { padding: 0 18px; }\r\n  .aq-canvas { padding: 18px; }\r\n  .aq-queue-tools { flex-wrap: wrap; }\r\n  .aq-search { width: 100%; }\r\n  .aq-tabs { margin-left: 0; }\r\n  .aq-list-head { display: none; }\r\n  .aq-task-row { grid-template-columns: 28px minmax(0, 1fr) auto; gap: 8px 12px; padding: 14px; }\r\n  .aq-select { grid-row: 1 / 4; }\r\n  .aq-task-main { grid-column: 2; }\r\n  .aq-task-status { grid-column: 3; grid-row: 1; }\r\n  .aq-task-plan { grid-column: 2; grid-row: 2; flex-direction: row; align-items: center; gap: 8px; }\r\n  .aq-recent { grid-column: 2; grid-row: 3; }\r\n  .aq-row-actions { grid-column: 3; grid-row: 2 / 4; max-width: 116px; align-self: end; }\r\n}\r\n\r\n@media (max-width: 640px) {\r\n  .aq-ws { position: relative; }\r\n  .aq-sb { position: absolute; top: 0; bottom: 0; left: 0; width: 236px; transform: translateX(-101%); box-shadow: 12px 0 36px rgba(16, 24, 40, 0.24); transition: transform 180ms ease; }\r\n  .aq-ws.nav-open .aq-sb { transform: none; }\r\n  .aq-ws.nav-open .aq-nav-scrim { position: absolute; inset: 0; z-index: 4; display: block; border: 0; background: rgba(16, 24, 40, 0.46); }\r\n  .aq-brand { justify-content: flex-start; padding: 0 18px; }\r\n  .aq-brand > strong,\r\n  .aq-nav-text { display: block; }\r\n  .aq-nav-item { justify-content: flex-start; padding: 0 10px; }\r\n  .aq-nav-badge { position: static; min-width: 22px; margin-left: auto; color: #aebdce; font-size: 12px; line-height: 20px; }\r\n  .aq-sb-foot { display: block; padding: 16px 18px; }\r\n  .aq-host-state span:last-child { display: inline; }\r\n  .aq-head { height: 60px; flex-basis: 60px; gap: 6px; padding: 0 10px; }\r\n  .aq-mobile-menu { display: inline-flex; }\r\n  .aq-head-title { min-width: 0; margin-right: auto; }\r\n  .aq-head h1 { overflow: hidden; font-size: 17px; text-overflow: ellipsis; white-space: nowrap; }\r\n  .aq-head-actions { gap: 4px; }\r\n  .aq-hide-mobile,\r\n  .aq-close-board,\r\n  .aq-icon-btn { width: 40px; height: 40px; flex-basis: 40px; }\r\n  .aq-head-actions .aq-create { width: 40px; min-width: 40px; max-width: 40px; padding: 0; overflow: hidden; font-size: 0; }\r\n  .aq-create svg { width: 16px; height: 16px; margin: 0; }\r\n  .aq-canvas { padding: 14px 12px 20px; }\r\n  .aq-workspace-head { grid-template-columns: 1fr auto; gap: 12px; }\r\n  .aq-workspace-copy h2 { font-size: 18px; }\r\n  .aq-workspace-copy p { display: none; }\r\n  .aq-workspace-action { min-height: 36px; padding: 0 10px; }\r\n  .aq-runtime-summary { grid-template-columns: 1fr; }\r\n  .aq-runtime-summary > div { padding: 10px 12px; }\r\n  .aq-runtime-summary > div + div { border-top: 1px solid var(--aq-line); border-left: 0; }\r\n  .aq-runtime-diagnostics dl { grid-template-columns: 1fr; }\r\n  .aq-safety-bar { grid-template-columns: 1fr; }\r\n  .aq-safety-item { padding: 10px 12px; }\r\n  .aq-safety-item + .aq-safety-item { border-top: 1px solid var(--aq-line); border-left: 0; }\r\n  .aq-queue-tools { gap: 8px; }\r\n  .aq-search { min-height: 42px; }\r\n  .aq-tabs { width: calc(100% - 58px); flex-wrap: wrap; }\r\n  .aq-tab { flex: 1 1 auto; height: 36px; }\r\n  .aq-mobile-access { display: inline-flex; min-width: 50px; padding: 0 10px; }\r\n  .aq-task-row { grid-template-columns: 24px minmax(0, 1fr); gap: 8px; padding: 13px 12px; }\r\n  .aq-select { grid-row: 1 / 5; width: 24px; }\r\n  .aq-task-main { grid-column: 2; }\r\n  .aq-task-status { grid-column: 2; grid-row: 2; align-items: flex-start; }\r\n  .aq-task-plan { grid-column: 2; grid-row: 3; }\r\n  .aq-recent { grid-column: 2; grid-row: 4; }\r\n  .aq-row-actions { grid-column: 2; grid-row: 5; max-width: none; justify-content: flex-start; padding-top: 8px; border-top: 1px solid var(--aq-line); }\r\n  .aq-row-action { height: 36px; padding: 0 12px; border-color: var(--aq-line); background: var(--aq-paper); }\r\n  .aq-card-summary { display: -webkit-box; white-space: normal; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }\r\n  .aq-empty { min-height: 160px; padding: 34px 18px; }\r\n  .aq-m-overlay { align-items: flex-end; padding: 0; }\r\n  .aq-modal { width: 100%; max-width: none; max-height: 94vh; border-radius: 14px 14px 0 0; }\r\n  .aq-modal.wide { width: 100%; max-width: none; }\r\n  .aq-modal > h3,\r\n  .aq-modal > .aq-modal-title { padding: 18px 18px 14px; }\r\n  .aq-modal-content { padding: 16px 18px 18px; }\r\n  .aq-row,\r\n  .aq-row.three,\r\n  .aq-cron-field { grid-template-columns: 1fr; }\r\n  .aq-modal-actions { margin: 20px -18px -18px; padding: 12px 18px; }\r\n  .aq-d-panel { width: 100%; max-width: none; }\r\n  .aq-d-hd { padding: 17px 18px 15px; }\r\n  .aq-d-body { padding: 16px 18px; }\r\n  .aq-d-actions { padding: 12px 18px; }\r\n  .aq-d-grid { grid-template-columns: 1fr; }\r\n  .aq-inspector-tabs { gap: 12px; padding: 0 18px; }\r\n  .aq-inspector-tabs button { flex: 1; }\r\n  .aq-config-body { padding: 16px 18px 0; }\r\n  .aq-config-actions { margin-right: -18px; margin-left: -18px; }\r\n  .aq-access-body { padding: 18px 18px 24px; }\r\n  .aq-cap-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }\r\n  .aq-cap-columns,\r\n  .aq-cap-tags,\r\n  .aq-cap-isolation dl { grid-template-columns: 1fr; }\r\n  .aq-endpoint { grid-template-columns: 86px minmax(0, 1fr) 42px; }\r\n}\r\n\r\n@media (prefers-reduced-motion: reduce) {\r\n  [data-dsh-autoqueue-view] *,\r\n  [data-dsh-autoqueue-view] *::before,\r\n  [data-dsh-autoqueue-view] *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }\r\n}\r\n';

  // client/src/transport.js
  var API_PREFIX = "/api/queue";
  var REQUEST_TIMEOUT_MS = 15e3;
  function readJson(response) {
    return response.text().then(function(text) {
      var body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch (e) {
        throw new Error("HTTP " + response.status + " \u8FD4\u56DE\u4E86\u65E0\u6548 JSON");
      }
      if (!response.ok) {
        throw new Error(body && body.error || text || "HTTP " + response.status);
      }
      return body;
    });
  }
  function requestAt(url, init) {
    var controller = new AbortController();
    var timeout = setTimeout(function() {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    return fetch(url, Object.assign({}, init, { signal: controller.signal })).then(readJson).finally(function() {
      clearTimeout(timeout);
    });
  }
  function request(url, init) {
    return requestAt(API_PREFIX + url, init);
  }
  function createTransport() {
    return {
      // The workstation owns both the active and archived views. Always request
      // the complete projection so an SSE refresh cannot make archived rows
      // disappear after the initial load.
      state: function() {
        return request("/state?archived=1");
      },
      detail: function(key) {
        return request("/detail?key=" + encodeURIComponent(key));
      },
      options: function() {
        return request("/options");
      },
      capabilities: function() {
        return requestAt("/api/autoqueue/capabilities");
      },
      getConfig: function() {
        return request("/config");
      },
      setConfig: function(patch) {
        return request("/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
      },
      createTask: function(data) {
        return request("/task", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
      },
      action: function(kind, key, opts) {
        var action = Object.assign({}, opts || {}, { kind });
        if (key !== void 0 && key !== null) action.key = key;
        return request("/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ requestId: crypto.randomUUID(), action })
        });
      },
      markRead: function(key, read) {
        return request("/mark-read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key, read: read !== false }) });
      },
      subscribe: function(listener, healthListener) {
        var events = new EventSource(API_PREFIX + "/events?archived=1");
        var health = {
          status: "connecting",
          connected: false,
          reconnecting: false,
          lastEventAt: null,
          revision: null
        };
        var reportHealth = function(patch) {
          health = Object.assign({}, health, patch || {});
          if (typeof healthListener === "function") healthListener(health);
        };
        reportHealth();
        events.onopen = function() {
          reportHealth({ status: "connected", connected: true, reconnecting: false });
        };
        events.onmessage = function(message) {
          try {
            var parsed = JSON.parse(message.data);
            if (parsed && typeof parsed === "object" && typeof parsed.revision === "number") {
              reportHealth({
                status: "connected",
                connected: true,
                reconnecting: false,
                lastEventAt: (/* @__PURE__ */ new Date()).toISOString(),
                revision: parsed.revision
              });
              listener(parsed);
            }
          } catch (e) {
          }
        };
        events.onerror = function() {
          reportHealth({ status: "reconnecting", connected: false, reconnecting: true });
        };
        var onVisible = function() {
          if (document.visibilityState === "visible") listener(null);
        };
        document.addEventListener("visibilitychange", onVisible);
        return function() {
          document.removeEventListener("visibilitychange", onVisible);
          events.close();
          reportHealth({ status: "disconnected", connected: false, reconnecting: false });
        };
      }
    };
  }

  // client/src/controller.js
  var STATUS_CONFIG = {
    pending: { label: "\u5F85\u6267\u884C", color: "#596579" },
    running: { label: "\u6267\u884C\u4E2D", color: "#175cd3" },
    done: { label: "\u5DF2\u5B8C\u6210", color: "#067647" },
    failed: { label: "\u5DF2\u5931\u8D25", color: "#b42318" },
    stopped: { label: "\u5DF2\u505C\u6B62", color: "#9a6700" },
    interrupted: { label: "\u5DF2\u4E2D\u65AD", color: "#7a5af8" }
  };
  function isUnread(task) {
    if (task.status !== "done" && task.status !== "failed" && task.status !== "stopped" && task.status !== "interrupted") return false;
    if (task.archivedAt) return false;
    if (!task.readAt) return true;
    return task.updatedAt > task.readAt;
  }
  function countUnread(tasks) {
    return tasks.filter(function(t) {
      return isUnread(t);
    }).length;
  }
  function createController(transport) {
    var tasks = [];
    var boardOpen = false;
    var filter = "all";
    var navGroup = "all";
    var showDetail = null;
    var showNewTask = false;
    var showEdit = null;
    var editTaskData = null;
    var showConfig = false;
    var loading = true;
    var error = null;
    var revision = 0;
    var config = { maxConcurrent: 1 };
    var metrics = { total: 0, running: 0, pending: 0, done24h: 0, failed24h: 0, successRate: 0 };
    var options = { workspaces: [], presets: [], models: [], isolation: null };
    var optionsStatus = "idle";
    var optionsError = null;
    var runtimeHealth = {
      status: "idle",
      connected: false,
      reconnecting: false,
      lastEventAt: null,
      revision: null
    };
    var runtimeObservation = null;
    var transportError = null;
    var sseDisposer = null;
    var prevStatuses = {};
    var TERMINAL = { done: 1, failed: 1, stopped: 1, interrupted: 1 };
    var disposed = false;
    var lifecycle = 0;
    var initPromise = null;
    var listeners = [];
    function notif() {
      for (var i = 0; i < listeners.length; i++) listeners[i]();
    }
    function getSnapshot() {
      var counts = {};
      var activeTasks = tasks.filter(function(t) {
        return !t.archivedAt;
      });
      for (var i = 0; i < activeTasks.length; i++) {
        var s = activeTasks[i].status;
        counts[s] = (counts[s] || 0) + 1;
      }
      var scoped = tasks;
      if (navGroup === "archived") {
        scoped = scoped.filter(function(t) {
          return !!t.archivedAt;
        });
      } else {
        scoped = scoped.filter(function(t) {
          return !t.archivedAt;
        });
        if (navGroup === "cron") scoped = scoped.filter(function(t) {
          return t.taskType === "cron";
        });
        else if (navGroup === "schedule") scoped = scoped.filter(function(t) {
          return t.taskType === "schedule";
        });
        else if (navGroup === "manual") scoped = scoped.filter(function(t) {
          return t.taskType === "manual";
        });
        else if (navGroup === "active") scoped = scoped.filter(function(t) {
          return t.status === "pending" || t.status === "running" || t.status === "interrupted";
        });
      }
      var scopeCounts = {};
      for (var s = 0; s < scoped.length; s++) scopeCounts[scoped[s].status] = (scopeCounts[scoped[s].status] || 0) + 1;
      var filtered = filter === "all" ? scoped : scoped.filter(function(t) {
        return t.status === filter;
      });
      var detailTask = showDetail ? tasks.find(function(t) {
        return t.key === showDetail;
      }) : null;
      var editTask = showEdit ? editTaskData && editTaskData.key === showEdit ? editTaskData : tasks.find(function(t) {
        return t.key === showEdit;
      }) : null;
      return {
        tasks,
        scoped,
        filtered,
        counts,
        scopeCounts,
        scopeMetrics: deriveMetrics(scoped.map(function(task) {
          return Object.assign({}, task, { archivedAt: null });
        })),
        metrics,
        boardOpen,
        filter,
        navGroup,
        showDetail,
        showNewTask,
        showEdit,
        showConfig,
        loading,
        error,
        revision,
        config,
        options,
        optionsStatus,
        optionsError,
        runtimeHealth,
        isolationHealth: getIsolationHealth(),
        runtimeObservation,
        transportError,
        detailTask,
        editTask,
        unreadCount: countUnread(tasks)
      };
    }
    function getIsolationHealth() {
      if (optionsStatus === "error") return { status: "error", verified: false, message: optionsError || "\u9694\u79BB\u7B56\u7565\u8BFB\u53D6\u5931\u8D25" };
      if (optionsStatus !== "ready") return { status: "unknown", verified: false, message: "\u6B63\u5728\u8BFB\u53D6\u9694\u79BB\u7B56\u7565" };
      var isolation = options && options.isolation;
      var locks = isolation && Array.isArray(isolation.overridesLocked) ? isolation.overridesLocked : [];
      var required = ["workspace", "agentPreset", "model"];
      var verified = !!isolation && isolation.strict === true && required.every(function(name) {
        return locks.indexOf(name) >= 0;
      });
      if (!verified) return { status: "unsafe", verified: false, message: "\u9694\u79BB\u5B57\u6BB5\u672A\u5B8C\u6574\u9501\u5B9A" };
      return { status: "safe", verified: true, message: "\u5DE5\u4F5C\u533A\u3001\u9884\u8BBE\u4E0E\u6A21\u578B\u8986\u76D6\u5DF2\u9501\u5B9A", locks, reason: isolation.reason || "" };
    }
    function subscribe(fn) {
      listeners.push(fn);
      return function() {
        listeners = listeners.filter(function(x) {
          return x !== fn;
        });
      };
    }
    function mergeConfig(next) {
      if (next && typeof next === "object") config = Object.assign({}, config, next);
    }
    function deriveMetrics(nextTasks) {
      var visible = (nextTasks || []).filter(function(t) {
        return !t.archivedAt;
      });
      var now = Date.now();
      var done24h = visible.filter(function(t) {
        return t.status === "done" && t.updatedAt && now - new Date(t.updatedAt).getTime() < 864e5;
      }).length;
      var failed24h = visible.filter(function(t) {
        return t.status === "failed" && t.updatedAt && now - new Date(t.updatedAt).getTime() < 864e5;
      }).length;
      var total24h = done24h + failed24h;
      return {
        total: visible.length,
        running: visible.filter(function(t) {
          return t.status === "running";
        }).length,
        pending: visible.filter(function(t) {
          return t.status === "pending";
        }).length,
        done24h,
        failed24h,
        successRate: total24h ? Math.round(done24h / total24h * 100) : 0
      };
    }
    function applyState(data, notifyTransitions) {
      var incomingRevision = Number(data.revision);
      if (Number.isFinite(incomingRevision) && incomingRevision < revision) return false;
      var newTasks = data.tasks || [];
      var effectiveConfig = Object.assign({}, config, data.config || {});
      if (notifyTransitions) {
        for (var i = 0; i < newTasks.length; i++) {
          var t = newTasks[i];
          var prev = prevStatuses[t.key];
          var notificationsEnabled = t.enableNotifications === true || t.enableNotifications == null && effectiveConfig.enableNotifications === true;
          if (prev !== void 0 && prev !== t.status && TERMINAL[t.status] && notificationsEnabled) {
            var label = (STATUS_CONFIG[t.status] || {}).label || t.status;
            try {
              if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("autoqueue", { body: t.key + " \u2192 " + label, tag: t.key });
            } catch (e) {
            }
          }
        }
      }
      prevStatuses = {};
      for (var j = 0; j < newTasks.length; j++) prevStatuses[newTasks[j].key] = newTasks[j].status;
      tasks = newTasks;
      if (Number.isFinite(incomingRevision)) revision = incomingRevision;
      runtimeHealth = Object.assign({}, runtimeHealth, { revision });
      if (data.runtime && typeof data.runtime === "object") runtimeObservation = data.runtime;
      mergeConfig(data.config);
      metrics = Object.assign(deriveMetrics(newTasks), data.metrics || {});
      transportError = null;
      error = null;
      if (showDetail && !tasks.find(function(t2) {
        return t2.key === showDetail;
      })) showDetail = null;
      if (showEdit && !tasks.find(function(t2) {
        return t2.key === showEdit;
      })) {
        showEdit = null;
        editTaskData = null;
      }
      return true;
    }
    async function loadState() {
      loading = true;
      notif();
      var refreshed = false;
      try {
        var data = await transport.state();
        applyState(data, false);
        refreshed = true;
      } catch (err) {
        transportError = err.message;
      }
      loading = false;
      notif();
      return refreshed;
    }
    async function loadOptions() {
      optionsStatus = "loading";
      optionsError = null;
      try {
        var loaded = await transport.options();
        options = loaded && typeof loaded === "object" ? loaded : { workspaces: [], presets: [], models: [], isolation: null };
        optionsStatus = "ready";
      } catch (err) {
        optionsStatus = "error";
        optionsError = err.message || "\u9694\u79BB\u7B56\u7565\u8BFB\u53D6\u5931\u8D25";
      }
      notif();
    }
    async function loadConfig() {
      try {
        mergeConfig(await transport.getConfig());
      } catch (err) {
        transportError = err.message;
      }
    }
    function startSSE() {
      if (disposed || sseDisposer) return;
      runtimeHealth = Object.assign({}, runtimeHealth, { status: "connecting", connected: false, reconnecting: false });
      notif();
      sseDisposer = transport.subscribe(function(data) {
        if (disposed) return;
        if (data && data.revision !== void 0) {
          if (!applyState(data, true)) return;
        } else if (data === null) {
          loadState();
        }
        notif();
      }, function(health) {
        if (disposed) return;
        var previousRevision = Number(runtimeHealth.revision);
        var incomingHealthRevision = Number(health && health.revision);
        runtimeHealth = Object.assign({}, runtimeHealth, health || {});
        if (Number.isFinite(previousRevision) || Number.isFinite(incomingHealthRevision) || Number.isFinite(revision)) {
          runtimeHealth.revision = Math.max(
            Number.isFinite(previousRevision) ? previousRevision : 0,
            Number.isFinite(incomingHealthRevision) ? incomingHealthRevision : 0,
            Number.isFinite(revision) ? revision : 0
          );
        }
        notif();
      });
    }
    function stopSSE() {
      if (sseDisposer) {
        sseDisposer();
        sseDisposer = null;
      }
    }
    async function init() {
      if (disposed) return;
      if (initPromise) return initPromise;
      var token = ++lifecycle;
      initPromise = Promise.all([loadState(), loadOptions(), loadConfig()]).then(function() {
        if (!disposed && token === lifecycle) startSSE();
      });
      return initPromise;
    }
    function openBoard() {
      boardOpen = true;
      filter = "all";
      navGroup = "all";
      notif();
      document.dispatchEvent(new CustomEvent("dsh-panel-activate", { detail: "autoqueue" }));
      init();
    }
    function closeBoard() {
      if (!boardOpen) return;
      boardOpen = false;
      showDetail = null;
      showEdit = null;
      editTaskData = null;
      showNewTask = false;
      showConfig = false;
      notif();
    }
    function toggleBoard() {
      if (boardOpen) closeBoard();
      else openBoard();
    }
    function setFilter(f) {
      filter = f;
      notif();
    }
    function setNavGroup(g) {
      navGroup = g;
      notif();
    }
    function openDetail(key) {
      showDetail = key;
      var t = tasks.find(function(x) {
        return x.key === key;
      });
      if (t && isUnread(t)) markRead(key);
      notif();
    }
    function closeDetail() {
      showDetail = null;
      notif();
    }
    async function openEdit(key) {
      try {
        var detail = await transport.detail(key);
        if (!detail || !detail.ok || !detail.task) throw new Error(detail && detail.error || "\u52A0\u8F7D\u4EFB\u52A1\u8BE6\u60C5\u5931\u8D25");
        showEdit = key;
        editTaskData = detail.task;
        notif();
      } catch (err) {
        error = err.message;
        notif();
      }
    }
    function closeEdit() {
      showEdit = null;
      editTaskData = null;
      notif();
    }
    function openNewTask() {
      showNewTask = true;
      notif();
    }
    function closeNewTask() {
      showNewTask = false;
      notif();
    }
    function openConfig() {
      showConfig = true;
      notif();
    }
    function closeConfig() {
      showConfig = false;
      notif();
    }
    async function createTask(data) {
      try {
        var result = await transport.createTask({
          requestId: crypto.randomUUID(),
          key: data.key,
          content: data.content,
          priority: data.priority,
          cron: data.cron,
          schedule: data.schedule,
          deadline: data.deadline,
          maxGoalRounds: data.maxGoalRounds,
          maxBlockedResumes: data.maxBlockedResumes,
          timeoutMs: data.timeoutMs,
          maxAttempts: data.maxAttempts,
          webhook: data.webhook,
          autoArchive: data.autoArchive,
          enableNotifications: data.enableNotifications
        });
        if (!result.ok) throw new Error(result.error || "\u521B\u5EFA\u5931\u8D25");
        showNewTask = false;
        var stateRefreshed = await loadState();
        var createdTask = stateRefreshed ? tasks.find(function(task) {
          return task.key === result.key;
        }) : null;
        return Object.assign({}, result, {
          stateRefreshed,
          taskState: createdTask ? { status: createdTask.status, archivedAt: createdTask.archivedAt || null } : null
        });
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    async function markRead(key, read) {
      try {
        var result = await transport.markRead(key, read !== false);
        await loadState();
        return result;
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    async function doAction(kind, key, opts) {
      try {
        var result = await transport.action(kind, key, opts);
        var isBatchArchive = kind === "archive" && opts && Array.isArray(opts.keys) && Array.isArray(result && result.results);
        if (!result.ok && !isBatchArchive) throw new Error(result.error || kind + " \u5931\u8D25");
        await loadState();
        return result;
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    async function updateTask(key, patch) {
      try {
        var result = await transport.action("update", key, patch);
        if (!result.ok) throw new Error(result.error || "\u66F4\u65B0\u5931\u8D25");
        showEdit = null;
        editTaskData = null;
        await loadState();
        return result;
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    async function setConcurrency(n) {
      try {
        var result = await transport.action("set-concurrency", null, { maxConcurrent: n });
        if (!result.ok) throw new Error(result.error || "\u8BBE\u7F6E\u5E76\u53D1\u6570\u5931\u8D25");
        await loadState();
        return result;
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    async function updateConfig(patch) {
      try {
        var result = await transport.setConfig(patch);
        mergeConfig(result);
        await loadState();
        return result;
      } catch (err) {
        error = err.message;
        notif();
        throw err;
      }
    }
    function clearError() {
      error = null;
      notif();
    }
    function dispose() {
      disposed = true;
      lifecycle++;
      stopSSE();
      listeners = [];
    }
    return {
      getSnapshot,
      subscribe,
      init,
      dispose,
      openBoard,
      closeBoard,
      toggleBoard,
      setFilter,
      setNavGroup,
      openDetail,
      closeDetail,
      openEdit,
      closeEdit,
      openNewTask,
      closeNewTask,
      openConfig,
      closeConfig,
      createTask,
      doAction,
      updateTask,
      markRead,
      setConcurrency,
      updateConfig,
      clearError,
      loadState
    };
  }

  // client/src/utils.js
  var STATUS_CONFIG2 = {
    pending: { label: "\u5F85\u6267\u884C", color: "#596579" },
    running: { label: "\u6267\u884C\u4E2D", color: "#175cd3" },
    done: { label: "\u5DF2\u5B8C\u6210", color: "#067647" },
    failed: { label: "\u5DF2\u5931\u8D25", color: "#b42318" },
    stopped: { label: "\u5DF2\u505C\u6B62", color: "#9a6700" },
    interrupted: { label: "\u5DF2\u4E2D\u65AD", color: "#7a5af8" }
  };
  var CRON_PRESETS = [
    { label: "\u4E0D\u914D\u7F6E", value: "" },
    { label: "\u81EA\u5B9A\u4E49", value: "__custom__" },
    { label: "\u6BCF\u5929 08:00", value: "0 8 * * *" },
    { label: "\u6BCF\u5929 20:00", value: "0 20 * * *" },
    { label: "\u5DE5\u4F5C\u65E5 08:00", value: "0 8 * * 1-5" },
    { label: "\u5DE5\u4F5C\u65E5 20:00", value: "0 20 * * 1-5" },
    { label: "\u6BCF 30 \u5206\u949F", value: "*/30 * * * *" },
    { label: "\u6BCF\u5C0F\u65F6", value: "0 * * * *" },
    { label: "\u6BCF\u5468\u4E00 08:00", value: "0 8 * * 1" },
    { label: "\u6BCF\u6708 1 \u65E5 08:00", value: "0 8 1 * *" }
  ];
  var DEADLINE_PRESETS = [
    { label: "\u4E0D\u914D\u7F6E", value: "" },
    { label: "\u81EA\u5B9A\u4E49", value: "__custom__" },
    { label: "\u6BCF\u5929 09:00", value: "0 9 * * *" },
    { label: "\u6BCF\u5929 21:00", value: "0 21 * * *" },
    { label: "\u6BCF\u5929 23:00", value: "0 23 * * *" },
    { label: "\u5DE5\u4F5C\u65E5 09:00", value: "0 9 * * 1-5" },
    { label: "\u5DE5\u4F5C\u65E5 21:00", value: "0 21 * * 1-5" },
    { label: "\u5DE5\u4F5C\u65E5 23:00", value: "0 23 * * 1-5" }
  ];
  function timeAgo(iso) {
    if (!iso) return "";
    var d = Date.now() - new Date(iso).getTime();
    var m = Math.floor(d / 6e4);
    if (m < 1) return "\u521A\u521A";
    if (m < 60) return m + " \u5206\u949F\u524D";
    var h4 = Math.floor(m / 60);
    if (h4 < 24) return h4 + " \u5C0F\u65F6\u524D";
    return Math.floor(h4 / 24) + " \u5929\u524D";
  }
  function formatIso(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  }
  function localDatetimeString(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    var p = function(n) {
      return String(n).padStart(2, "0");
    };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function taskSummary(body) {
    if (!body) return "";
    return body.split("\n")[0] ? body.split("\n")[0].replace(/^#+\s*/, "").trim() : "";
  }
  function cronToHuman(cron) {
    if (!cron) return "";
    var parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return cron;
    var min = parts[0], hour = parts[1], dom = parts[2], month = parts[3], dow = parts[4];
    if (min === "*" && hour === "*" && dom === "*" && month === "*" && dow === "*") return "\u6BCF\u5206\u949F";
    if (min.indexOf("*/") === 0 && hour === "*" && dom === "*" && month === "*" && dow === "*") return "\u6BCF" + min.slice(2) + "\u5206\u949F";
    var time = (hour !== "*" ? hour.padStart(2, "0") : "*") + ":" + (min !== "*" ? min.padStart(2, "0") : "*");
    if (dom === "*" && month === "*" && dow === "*") {
      if (hour === "*") return "\u6BCF\u5C0F\u65F6" + min.padStart(2, "0") + "\u5206";
      if (min === "*") return "\u6BCF\u5929" + hour.padStart(2, "0") + ":00";
      return "\u6BCF\u5929 " + time;
    }
    if (dom === "*" && month === "*" && dow === "1-5") return "\u5DE5\u4F5C\u65E5 " + time;
    var DOW_MAP = { 0: "\u65E5", 1: "\u4E00", 2: "\u4E8C", 3: "\u4E09", 4: "\u56DB", 5: "\u4E94", 6: "\u516D" };
    if (dom === "*" && month === "*" && /^\d$/.test(dow) && DOW_MAP[dow]) return "\u6BCF\u5468" + DOW_MAP[dow] + " " + time;
    if (/^\d+$/.test(dom) && month === "*" && dow === "*") return "\u6BCF\u6708" + parseInt(dom, 10) + "\u65E5 " + time;
    return cron;
  }
  function elapseStr(startedAt) {
    if (!startedAt) return "";
    var ms = Date.now() - new Date(startedAt).getTime();
    var s = Math.floor(ms / 1e3);
    if (s < 60) return s + "s";
    var m = Math.floor(s / 60);
    if (m < 60) return m + "m " + s % 60 + "s";
    return Math.floor(m / 60) + "h " + m % 60 + "m";
  }
  function isUnread2(task) {
    if (task.status !== "done" && task.status !== "failed" && task.status !== "stopped" && task.status !== "interrupted") return false;
    if (task.archivedAt) return false;
    if (!task.readAt) return true;
    return task.updatedAt > task.readAt;
  }
  var ICONS = {
    search: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>',
    clock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.5"/><polyline points="8 4.5 8 8 11 10"/></svg>',
    repeat: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.5 8a6.5 6.5 0 0 1 11.7-3.5M14.5 8a6.5 6.5 0 0 1-11.7 3.5"/><polyline points="10.5 1.5 13.2 4.5 10.5 7"/><polyline points="5.5 14.5 2.8 11.5 5.5 9"/></svg>',
    play: '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5a.5.5 0 0 1 .8-.4l8 5.5a.5.5 0 0 1 0 .8l-8 5.5a.5.5 0 0 1-.8-.4z"/></svg>',
    plus: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>',
    gear: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/></svg>',
    scan: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 1.5a6.5 6.5 0 1 1-4.6 1.9"/><polyline points="5.5 1.5 8 1.5 8 4"/></svg>',
    stop: '<svg viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="2"/></svg>',
    archive: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3.5h12v2H2z"/><path d="M3 5.5v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-7"/><line x1="6" y1="8" x2="10" y2="8"/></svg>',
    restore: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1.5 4v4h4"/><path d="M3 8.5a6.5 6.5 0 1 0 1.5-5.5"/></svg>',
    trash: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4h12"/><path d="M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4"/><path d="M3.5 4l1 9.5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1l1-9.5"/></svg>',
    edit: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11.5 1.5l3 3L5 14l-3.5.5L2 11z"/></svg>',
    external: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 2h5v5"/><path d="M14 2L8 8"/><path d="M10 9v3.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1H7"/></svg>',
    inbox: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6v6.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6"/><path d="M1.5 2.5l3.5 4.5h6l3.5-4.5"/><path d="M1.5 2.5h13v3.5H9.5L8 8l-1.5-2H1.5z"/></svg>',
    list: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>',
    close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>'
  };
  function iconHtml(name) {
    return ICONS[name] || "";
  }
  var TASK_TYPE_LABELS = {
    cron: { label: "\u5FAA\u73AF", icon: "repeat" },
    schedule: { label: "\u5B9A\u65F6", icon: "clock" },
    manual: { label: "\u624B\u52A8", icon: "play" }
  };

  // client/src/components/DialogShell.jsx
  var dialogStack = [];
  var bodyLockCount = 0;
  var savedBodyStyles = null;
  var FOCUSABLE_SELECTOR = [
    "a[href]",
    "area[href]",
    "button:not([disabled])",
    "input:not([disabled]):not([type='hidden'])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "iframe",
    "object",
    "embed",
    "[contenteditable='true']",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");
  function appendClassName(base, extra) {
    return [base, extra].filter(Boolean).join(" ");
  }
  function isFocusable(element) {
    if (!element || typeof element.focus !== "function") return false;
    if (typeof element.matches === "function" && element.matches(":disabled")) return false;
    if (element.hidden || element.closest("[hidden],[inert],[aria-hidden='true']")) return false;
    var style = window.getComputedStyle(element);
    return style.visibility !== "hidden" && style.display !== "none" && element.getClientRects().length > 0;
  }
  function focusableElements(panel) {
    if (!panel) return [];
    return Array.prototype.filter.call(panel.querySelectorAll(FOCUSABLE_SELECTOR), isFocusable);
  }
  function lockBodyScroll() {
    if (bodyLockCount === 0 && document.body) {
      var scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      var computedPaddingRight = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
      savedBodyStyles = {
        overflow: document.body.style.overflow,
        paddingRight: document.body.style.paddingRight
      };
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) document.body.style.paddingRight = computedPaddingRight + scrollbarWidth + "px";
    }
    bodyLockCount += 1;
  }
  function unlockBodyScroll() {
    bodyLockCount = Math.max(0, bodyLockCount - 1);
    if (bodyLockCount === 0 && document.body && savedBodyStyles) {
      document.body.style.overflow = savedBodyStyles.overflow;
      document.body.style.paddingRight = savedBodyStyles.paddingRight;
      savedBodyStyles = null;
    }
  }
  function resolveInitialFocus(props, panel) {
    var target = props.initialFocusRef && props.initialFocusRef.current;
    if (!target && props.initialFocusSelector) target = panel.querySelector(props.initialFocusSelector);
    if (!target) target = panel.querySelector("[data-dialog-initial-focus],[autofocus]");
    if (!isFocusable(target)) target = focusableElements(panel)[0];
    return isFocusable(target) ? target : panel;
  }
  function DialogShell(props) {
    var variant = props.variant === "drawer" ? "drawer" : "modal";
    var generatedId = window.__React.useId();
    var titleId = props.titleId || "aq-dialog-title-" + generatedId.replace(/:/g, "");
    var internalPanelRef = window.__React.useRef(null);
    var openerRef = window.__React.useRef(null);
    var stackTokenRef = window.__React.useRef({});
    var onCloseRef = window.__React.useRef(props.onClose);
    var closeOnEscapeRef = window.__React.useRef(props.closeOnEscape);
    onCloseRef.current = props.onClose;
    closeOnEscapeRef.current = props.closeOnEscape;
    var setPanelRef = window.__React.useCallback(function(node) {
      internalPanelRef.current = node;
      if (typeof props.panelRef === "function") props.panelRef(node);
      else if (props.panelRef && typeof props.panelRef === "object") props.panelRef.current = node;
    }, [props.panelRef]);
    window.__React.useLayoutEffect(function() {
      var panel = internalPanelRef.current;
      if (!panel) return void 0;
      if (!openerRef.current) {
        openerRef.current = document.activeElement && typeof document.activeElement.focus === "function" ? document.activeElement : null;
      }
      resolveInitialFocus(props, panel).focus({ preventScroll: true });
      return void 0;
    }, []);
    window.__React.useEffect(function() {
      var token = stackTokenRef.current;
      dialogStack.push(token);
      lockBodyScroll();
      var panel = internalPanelRef.current;
      var overlay = panel && panel.parentElement;
      var backgroundState = [];
      if (overlay && overlay.parentElement) {
        Array.prototype.forEach.call(overlay.parentElement.children, function(sibling) {
          if (sibling === overlay) return;
          backgroundState.push({
            element: sibling,
            inert: sibling.inert,
            ariaHidden: sibling.getAttribute("aria-hidden")
          });
          sibling.inert = true;
          sibling.setAttribute("aria-hidden", "true");
        });
      }
      function isTopmost() {
        return dialogStack[dialogStack.length - 1] === token;
      }
      function onKeyDown(event) {
        if (!isTopmost()) return;
        var panel2 = internalPanelRef.current;
        if (!panel2) return;
        if (event.key === "Escape" && closeOnEscapeRef.current !== false) {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (typeof onCloseRef.current === "function") onCloseRef.current("escape");
          return;
        }
        if (event.key !== "Tab") return;
        var focusables = focusableElements(panel2);
        if (focusables.length === 0) {
          event.preventDefault();
          panel2.focus({ preventScroll: true });
          return;
        }
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        var active = document.activeElement;
        if (event.shiftKey && (active === first || !panel2.contains(active))) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        } else if (!event.shiftKey && (active === last || !panel2.contains(active))) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
      document.addEventListener("keydown", onKeyDown, true);
      return function() {
        document.removeEventListener("keydown", onKeyDown, true);
        var index = dialogStack.lastIndexOf(token);
        if (index !== -1) dialogStack.splice(index, 1);
        unlockBodyScroll();
        for (var stateIndex = 0; stateIndex < backgroundState.length; stateIndex += 1) {
          var state = backgroundState[stateIndex];
          state.element.inert = state.inert;
          if (state.ariaHidden === null) state.element.removeAttribute("aria-hidden");
          else state.element.setAttribute("aria-hidden", state.ariaHidden);
        }
        var opener = openerRef.current;
        queueMicrotask(function() {
          var mountedPanel = internalPanelRef.current;
          if (mountedPanel && mountedPanel.isConnected) return;
          if (opener && opener.isConnected && typeof opener.focus === "function") {
            opener.focus({ preventScroll: true });
          }
        });
      };
    }, []);
    var defaultOverlayClass = variant === "drawer" ? "aq-d-overlay" : "aq-m-overlay";
    var defaultPanelClass = variant === "drawer" ? "aq-d-panel" : "aq-modal";
    var overlayProps = Object.assign({}, props.overlayProps || {});
    var panelProps = Object.assign({}, props.panelProps || {});
    var externalOverlayClick = overlayProps.onClick;
    overlayProps.className = appendClassName(defaultOverlayClass, appendClassName(props.overlayClassName, overlayProps.className));
    overlayProps.onClick = function(event) {
      if (typeof externalOverlayClick === "function") externalOverlayClick(event);
      if (event.defaultPrevented || event.target !== event.currentTarget || props.closeOnOverlay === false) return;
      if (typeof props.onClose === "function") props.onClose("overlay");
    };
    panelProps.ref = setPanelRef;
    panelProps.className = appendClassName(defaultPanelClass, appendClassName(props.className, panelProps.className));
    panelProps.role = "dialog";
    panelProps["aria-modal"] = true;
    panelProps["aria-labelledby"] = props.ariaLabel ? void 0 : titleId;
    panelProps["aria-label"] = props.ariaLabel;
    panelProps["aria-describedby"] = props.describedBy;
    panelProps.tabIndex = panelProps.tabIndex == null ? -1 : panelProps.tabIndex;
    panelProps["data-dialog-variant"] = variant;
    var titleNode = null;
    if (!props.ariaLabel) {
      if (typeof props.renderTitle === "function") {
        titleNode = props.renderTitle({ id: titleId, title: props.title, close: props.onClose });
      } else {
        titleNode = window.__React.createElement(props.titleAs || "h3", {
          id: titleId,
          className: props.titleClassName
        }, props.title);
      }
    }
    var content = typeof props.children === "function" ? props.children({ titleId, close: props.onClose, panelRef: internalPanelRef }) : props.children;
    return window.__React.createElement(
      "div",
      overlayProps,
      window.__React.createElement("div", panelProps, titleNode, content)
    );
  }

  // client/src/components/TaskDetail.jsx
  function h() {
    return window.__React.createElement.apply(window.__React, arguments);
  }
  function TaskDetailPanel(props) {
    var task = props.task;
    var transport = props.transport;
    var controller = props.controller;
    var detail = window.__React.useState(null);
    var loading = window.__React.useState(true);
    var detailError = window.__React.useState("");
    var retry = window.__React.useState(0);
    var tab = window.__React.useState("overview");
    window.__React.useEffect(function() {
      var cancelled = false;
      detail[1](null);
      detailError[1]("");
      loading[1](true);
      transport.detail(task.key).then(function(data) {
        if (cancelled) return;
        detail[1](data);
        loading[1](false);
      }).catch(function(error) {
        if (!cancelled) {
          detailError[1](error && error.message ? error.message : "\u65E0\u6CD5\u8BFB\u53D6\u4EFB\u52A1\u8BE6\u60C5");
          loading[1](false);
        }
      });
      return function() {
        cancelled = true;
      };
    }, [task.key, transport, retry[0]]);
    var current = detail[0] && detail[0].task && detail[0].task.key === task.key ? detail[0] : null;
    var value = current ? current.task : task;
    var status = STATUS_CONFIG2[value.status] || { label: value.status, color: "#596579" };
    var sessionId = value.sessionId || value.lastSessionId || (value.executions && value.executions.length ? value.executions[value.executions.length - 1].sessionId : null);
    var attention = needsAttention(value);
    var reports = current && current.task.reports ? current.task.reports : value.reports || {};
    function doAction(kind) {
      controller.doAction(kind, value.key).catch(function() {
      });
      props.onClose();
    }
    function requestAction(kind) {
      if (props.onActionRequest) props.onActionRequest(kind, value.key);
      else doAction(kind);
    }
    function openEdit() {
      props.onClose();
      controller.openEdit(value.key);
    }
    return h(
      DialogShell,
      {
        variant: "drawer",
        title: value.key,
        onClose: props.onClose,
        className: "aq-task-inspector",
        renderTitle: function(args) {
          return h(
            "div",
            { className: "aq-d-hd aq-inspector-hd" },
            h(
              "div",
              null,
              h("h3", { id: args.id }, args.title),
              h(
                "div",
                { className: "aq-inspector-status" },
                h("span", { className: "aq-status-pill", style: { "--status-color": attention || value.stopPending === true ? "#9a6700" : value.foregroundPaused === true ? "#27776e" : status.color } }, h("i"), attention ? "\u9700\u5173\u6CE8" : value.stopPending === true ? "\u6B63\u5728\u505C\u6B62" : value.foregroundPaused === true ? "\u5DF2\u6682\u505C" : status.label),
                value.updatedAt && h("small", null, "\u66F4\u65B0\u4E8E ", formatIso(value.updatedAt))
              )
            ),
            h("button", { className: "aq-d-close", "aria-label": "\u5173\u95ED\u4EFB\u52A1\u8BE6\u60C5", onClick: props.onClose, dangerouslySetInnerHTML: { __html: iconHtml("close") } })
          );
        }
      },
      h(
        "div",
        { className: "aq-inspector-tabs", role: "tablist", "aria-label": "\u8BE6\u60C5\u89C6\u56FE" },
        [["overview", "\u6982\u89C8"], ["trace", "\u6267\u884C\u8F68\u8FF9"], ["report", "\u62A5\u544A"], ["policy", "\u7B56\u7565"]].map(function(item) {
          return h("button", {
            key: item[0],
            id: "aq-detail-tab-" + item[0],
            role: "tab",
            "aria-selected": tab[0] === item[0],
            "aria-controls": "aq-detail-panel",
            tabIndex: tab[0] === item[0] ? 0 : -1,
            className: tab[0] === item[0] ? "sel" : "",
            onClick: function() {
              tab[1](item[0]);
            }
          }, item[1]);
        })
      ),
      h(
        "div",
        { className: "aq-d-body", id: "aq-detail-panel", role: "tabpanel", "aria-labelledby": "aq-detail-tab-" + tab[0] },
        loading[0] && h("div", { className: "aq-detail-loading", role: "status" }, "\u6B63\u5728\u8F7D\u5165\u5B8C\u6574\u8D26\u672C\u2026"),
        detailError[0] && h(
          "div",
          { className: "aq-detail-error", role: "alert" },
          h("strong", null, "\u65E0\u6CD5\u52A0\u8F7D\u4EFB\u52A1\u8BE6\u60C5"),
          h("p", null, detailError[0]),
          h("button", { className: "aq-btn", onClick: function() {
            retry[1](retry[0] + 1);
          } }, "\u91CD\u65B0\u52A0\u8F7D")
        ),
        !loading[0] && !detailError[0] && tab[0] === "overview" && h(OverviewTab, { task: value, attention, sessionId }),
        !loading[0] && !detailError[0] && tab[0] === "trace" && h(TraceTab, { task: value }),
        !loading[0] && !detailError[0] && tab[0] === "report" && h(ReportTab, { reports }),
        !loading[0] && !detailError[0] && tab[0] === "policy" && h(PolicyTab, { task: value })
      ),
      h(
        "div",
        { className: "aq-d-actions" },
        value.status === "pending" && h("button", { className: "aq-btn", onClick: openEdit, dangerouslySetInnerHTML: { __html: iconHtml("edit") + " \u7F16\u8F91" } }),
        value.status === "pending" && h("button", { className: "aq-btn danger", onClick: function() {
          requestAction("delete");
        } }, "\u5220\u9664"),
        value.status === "running" && value.stopPending !== true && h("button", { className: "aq-btn danger", onClick: function() {
          requestAction("stop");
        } }, "\u505C\u6B62"),
        ["done", "failed", "stopped", "interrupted"].indexOf(value.status) >= 0 && !value.archivedAt && h("button", { className: "aq-btn success", onClick: function() {
          requestAction("rerun");
        } }, "\u91CD\u65B0\u6267\u884C"),
        value.status !== "running" && !value.archivedAt && h("button", { className: "aq-btn", onClick: function() {
          doAction("archive");
        } }, "\u5F52\u6863"),
        value.archivedAt && h("button", { className: "aq-btn", onClick: function() {
          doAction("restore");
        } }, "\u6062\u590D"),
        ["done", "failed", "stopped", "interrupted"].indexOf(value.status) >= 0 && !value.archivedAt && h("button", { className: "aq-btn", disabled: isUnread2(value), onClick: function() {
          controller.markRead(value.key, false);
        } }, isUnread2(value) ? "\u5DF2\u662F\u672A\u8BFB" : "\u6807\u4E3A\u672A\u8BFB"),
        sessionId && h("button", { className: "aq-btn", onClick: function() {
          props.onClose();
          controller.closeBoard();
          if (props.sessions && props.sessions.open) props.sessions.open(sessionId);
        }, dangerouslySetInnerHTML: { __html: iconHtml("external") + " \u8DF3\u8F6C\u4F1A\u8BDD" } })
      )
    );
  }
  function OverviewTab(props) {
    var task = props.task;
    var showStateNotice = props.attention || task.stopPending === true || task.foregroundPaused === true;
    return h(
      window.__React.Fragment,
      null,
      showStateNotice && h(
        "section",
        { className: "aq-isolation-state attention" },
        h("span", { className: "aq-isolation-mark", "aria-hidden": "true" }, "!"),
        h(
          "div",
          null,
          h("strong", null, props.attention ? "\u4EFB\u52A1\u5DF2\u6682\u505C\uFF0C\u9700\u8981\u68C0\u67E5" : task.stopPending === true ? "\u6B63\u5728\u505C\u6B62\u4EFB\u52A1" : "\u4EFB\u52A1\u5DF2\u6682\u505C"),
          h("p", null, props.attention ? isolationReason(task) : task.stopPending === true ? "\u505C\u6B62\u6307\u4EE4\u5DF2\u63D0\u4EA4\uFF0C\u786E\u8BA4\u4F1A\u8BDD\u7ED3\u675F\u540E\u66F4\u65B0\u72B6\u6001\u3002" : "\u4F60\u6B63\u5728\u4F7F\u7528 DSH\uFF0C\u7A7A\u95F2\u540E\u4EFB\u52A1\u4F1A\u81EA\u52A8\u7EE7\u7EED\u3002")
        )
      ),
      h(
        "section",
        { className: "aq-d-section" },
        h("div", { className: "aq-d-section-title" }, "\u4EFB\u52A1\u4FE1\u606F"),
        h(
          "div",
          { className: "aq-d-grid" },
          h(Fact, { label: "\u4F18\u5148\u7EA7", value: String(task.priority || 5) }),
          h(Fact, { label: "\u6D3E\u53D1\u5C1D\u8BD5", value: String(task.attempts || 0) }),
          h(Fact, { label: "\u81EA\u52A8\u6062\u590D", value: String(task.blockedResumes || 0) + " \u6B21" }),
          h(Fact, { label: "\u63A8\u8FDB\u8F6E\u6B21", value: (task.currentRound || 0) + " / " + (task.maxGoalRounds || "-") }),
          h(Fact, { label: "\u521B\u5EFA\u65F6\u95F4", value: task.createdAt ? formatIso(task.createdAt) : "-" }),
          h(Fact, { label: "\u4E0B\u4E00\u6B21\u8FD0\u884C", value: task.nextRunAt ? formatIso(task.nextRunAt) : "-" }),
          h(Fact, { label: "\u4EFB\u52A1\u4F1A\u8BDD", value: props.sessionId ? "\u5DF2\u521B\u5EFA" : "\u5C1A\u672A\u521B\u5EFA" }),
          h(Fact, { label: "\u5F53\u524D\u9636\u6BB5", value: taskPhaseLabel(task.goalPhase, task.status) }),
          h(Fact, { label: "\u524D\u53F0\u4F18\u5148", value: task.foregroundPaused === true ? "\u5DF2\u6682\u505C\uFF0C\u7B49\u5F85 DSH \u7A7A\u95F2" : "\u6B63\u5E38" })
        )
      ),
      task.body && h(
        "section",
        { className: "aq-d-section" },
        h("div", { className: "aq-d-section-title" }, "\u4EFB\u52A1\u5185\u5BB9"),
        h("div", { className: "aq-d-report" }, h("pre", null, task.body))
      ),
      task.lastError && h(
        "section",
        { className: "aq-d-section" },
        h("div", { className: "aq-d-section-title" }, "\u6700\u8FD1\u9519\u8BEF"),
        h("div", { className: "aq-error-detail" }, String(task.lastError))
      )
    );
  }
  function TraceTab(props) {
    var task = props.task;
    var executions = Array.isArray(task.executions) ? task.executions : [];
    return h(
      window.__React.Fragment,
      null,
      task.status === "running" && h(
        "section",
        { className: "aq-runtime-note" },
        h("strong", null, "\u5F53\u524D\u72B6\u6001"),
        h("span", null, task.stopPending === true ? "\u6B63\u5728\u505C\u6B62" : task.foregroundPaused === true ? "\u5DF2\u6682\u505C\uFF0C\u7B49\u5F85 DSH \u7A7A\u95F2" : taskPhaseLabel(task.goalPhase, task.status))
      ),
      h(
        "section",
        { className: "aq-d-section" },
        h("div", { className: "aq-d-section-title" }, "\u6267\u884C\u8BB0\u5F55"),
        executions.length === 0 ? h("p", { className: "aq-tab-empty" }, "\u8FD8\u6CA1\u6709\u6267\u884C\u8BB0\u5F55") : h("div", { className: "aq-execution-list" }, executions.slice().reverse().map(function(execution, index) {
          var cfg = STATUS_CONFIG2[execution.result] || { label: execution.result || "\u6267\u884C\u4E2D", color: "#596579" };
          return h(
            "article",
            { key: String(execution.attempt || index) + (execution.startedAt || "") },
            h("span", { className: "aq-exec-index" }, String(execution.attempt || executions.length - index).padStart(2, "0")),
            h("div", null, h("strong", { style: { color: cfg.color } }, cfg.label), h("p", null, execution.startedAt ? formatIso(execution.startedAt) : "-", " \u81F3 ", execution.endedAt ? formatIso(execution.endedAt) : "\u8FDB\u884C\u4E2D"), execution.error && h("code", null, String(execution.error)))
          );
        }))
      )
    );
  }
  function ReportTab(props) {
    var entries = [["goal", "\u63A8\u8FDB\u7ED3\u679C"], ["result", "\u6267\u884C\u7ED3\u679C"], ["report", "\u6700\u7EC8\u62A5\u544A"]].filter(function(item) {
      return props.reports && props.reports[item[0]];
    });
    if (!entries.length) return h("div", { className: "aq-tab-empty" }, h("strong", null, "\u62A5\u544A\u5C1A\u672A\u751F\u6210"), h("p", null, "\u4EFB\u52A1\u7ED3\u675F\u540E\uFF0C\u7ED3\u679C\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002"));
    return h(window.__React.Fragment, null, entries.map(function(entry) {
      return h("section", { className: "aq-d-section", key: entry[0] }, h("div", { className: "aq-d-section-title" }, entry[1]), h("div", { className: "aq-d-report" }, h("pre", null, props.reports[entry[0]])));
    }));
  }
  function PolicyTab(props) {
    var task = props.task;
    return h(
      window.__React.Fragment,
      null,
      h(
        "section",
        { className: "aq-d-section" },
        h("div", { className: "aq-d-section-title" }, "\u8C03\u5EA6"),
        h(
          "div",
          { className: "aq-d-grid" },
          h(Fact, { label: "\u5FAA\u73AF\u8C03\u5EA6", value: task.cron ? cronToHuman(task.cron) : "\u672A\u8BBE\u7F6E" }),
          h(Fact, { label: "\u4E00\u6B21\u6027\u5B9A\u65F6", value: task.schedule ? formatIso(task.schedule) : "\u672A\u8BBE\u7F6E" }),
          h(Fact, { label: "\u622A\u6B62\u7A97\u53E3", value: task.deadline ? cronToHuman(task.deadline) : "\u672A\u8BBE\u7F6E" }),
          h(Fact, { label: "\u8FD0\u884C\u6A21\u5F0F", value: !task.agentPreset ? "\u6D3E\u53D1\u65F6\u81EA\u52A8\u8BC6\u522B" : task.agentPreset.indexOf("ptc") >= 0 ? "PTC \xB7 \u81EA\u52A8\u8BC6\u522B" : "\u6807\u51C6\u81EA\u6CBB \xB7 \u81EA\u52A8\u8BC6\u522B" }),
          h(Fact, { label: "\u81EA\u52A8\u5F52\u6863", value: task.autoArchive === false ? "\u5173\u95ED" : "\u5F00\u542F" })
        )
      ),
      h(
        "section",
        { className: "aq-d-section" },
        h("div", { className: "aq-d-section-title" }, "\u5931\u8D25\u5904\u7406"),
        h(
          "div",
          { className: "aq-d-grid" },
          h(Fact, { label: "\u6700\u591A\u63A8\u8FDB\u8F6E\u6570", value: String(task.maxGoalRounds || "\u7EE7\u627F\u9ED8\u8BA4") }),
          h(Fact, { label: "\u6700\u591A\u81EA\u52A8\u6062\u590D", value: String(task.maxBlockedResumes ?? "\u7EE7\u627F\u9ED8\u8BA4") }),
          h(Fact, { label: "\u4EFB\u52A1\u8D85\u65F6", value: task.timeoutMs ? Math.round(task.timeoutMs / 6e4) + " \u5206\u949F" : "\u7EE7\u627F\u9ED8\u8BA4" }),
          h(Fact, { label: "\u6700\u5927\u5C1D\u8BD5", value: String(task.maxAttempts || "\u7EE7\u627F\u9ED8\u8BA4") }),
          h(Fact, { label: "\u6D4F\u89C8\u5668\u901A\u77E5", value: task.enableNotifications === true ? "\u5F00\u542F" : task.enableNotifications === false ? "\u9759\u9ED8" : "\u7EE7\u627F\u9ED8\u8BA4" }),
          h(Fact, { label: "Webhook", value: task.webhook || "\u672A\u8BBE\u7F6E" })
        )
      ),
      h("section", { className: "aq-policy-lock" }, h("strong", null, "\u4E0D\u4F1A\u4FEE\u6539 DSH \u8BBE\u7F6E"), h("p", null, "\u4EFB\u52A1\u4F7F\u7528\u72EC\u7ACB\u5DE5\u4F5C\u76EE\u5F55\uFF1B\u4F60\u4F7F\u7528 DSH \u65F6\uFF0C\u540E\u53F0\u4EFB\u52A1\u4F1A\u81EA\u52A8\u6682\u505C\u3002"))
    );
  }
  function Fact(props) {
    return h("div", { className: "aq-d-item" }, h("span", { className: "dl" }, props.label), h("span", { className: "dv" }, props.value));
  }
  function taskPhaseLabel(phase, status) {
    var value = String(phase || "");
    if (value === "active" || value === "goal-admitted") return "\u6267\u884C\u4E2D";
    if (value === "complete") return "\u5DF2\u5B8C\u6210";
    if (value === "stopped" || value === "disposed") return "\u5DF2\u7ED3\u675F";
    if (value === "rate-limited") return "\u7B49\u5F85\u91CD\u8BD5";
    if (value.indexOf("foreground-paused") >= 0) return "\u5DF2\u6682\u505C\uFF0C\u7B49\u5F85 DSH \u7A7A\u95F2";
    if (value.indexOf("cancel-pending") >= 0 || value.indexOf("cleanup-pending") >= 0) return "\u6B63\u5728\u505C\u6B62";
    if (value.indexOf("launch") >= 0 || value.indexOf("admission-pending") >= 0) return "\u6B63\u5728\u542F\u52A8";
    if (value.indexOf("uncertain") >= 0 || value.indexOf("containment") >= 0 || value === "unknown") return "\u72B6\u6001\u5F85\u786E\u8BA4";
    var cfg = STATUS_CONFIG2[status];
    return cfg ? cfg.label : status || "\u672A\u77E5";
  }
  function needsAttention(task) {
    var phase = String(task.goalPhase || "");
    return task.status === "failed" || task.status === "interrupted" || phase.indexOf("uncertain") >= 0 || phase.indexOf("containment") >= 0 || !!task._goalAdmissionUncertain || !!task._promptAdmissionUncertain;
  }
  function isolationReason(task) {
    if (task._goalAdmissionUncertain || String(task.goalPhase || "").indexOf("goal-admission") >= 0) return "\u4EFB\u52A1\u662F\u5426\u6210\u529F\u542F\u52A8\u65E0\u6CD5\u786E\u8BA4\u3002\u4E3A\u907F\u514D\u91CD\u590D\u6267\u884C\uFF0C\u4EFB\u52A1\u4E0D\u4F1A\u81EA\u52A8\u91CD\u542F\u3002";
    if (task._promptAdmissionUncertain || String(task.goalPhase || "").indexOf("prompt-admission") >= 0) return "\u4EFB\u52A1\u6307\u4EE4\u662F\u5426\u9001\u8FBE\u65E0\u6CD5\u786E\u8BA4\u3002\u4E3A\u907F\u514D\u91CD\u590D\u6267\u884C\uFF0C\u4EFB\u52A1\u5DF2\u6682\u505C\u3002";
    if (task.status === "interrupted") return "DSH \u91CD\u542F\u6216\u4F1A\u8BDD\u4E2D\u65AD\u3002\u68C0\u67E5\u6267\u884C\u8BB0\u5F55\u540E\u53EF\u4EE5\u91CD\u65B0\u6267\u884C\u3002";
    return task.lastError ? String(task.lastError) : "\u4EFB\u52A1\u5931\u8D25\u3002\u8BF7\u68C0\u67E5\u6267\u884C\u8BB0\u5F55\u540E\u51B3\u5B9A\u662F\u5426\u91CD\u65B0\u6267\u884C\u3002";
  }

  // client/src/components/Modals.jsx
  function h2() {
    return window.__React.createElement.apply(window.__React, arguments);
  }
  function numberOrUndefined(value) {
    return value === "" ? void 0 : parseInt(value, 10);
  }
  function requestNotificationPermission() {
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    try {
      Notification.requestPermission();
    } catch (error) {
    }
  }
  function NewTaskModal(props) {
    var config = props.config || {};
    var valueOr = function(value, fallback) {
      return value === void 0 || value === null ? fallback : value;
    };
    var key = window.__React.useState("");
    var content = window.__React.useState("");
    var priority = window.__React.useState(String(valueOr(config.priority, 5)));
    var cron = window.__React.useState("");
    var schedule = window.__React.useState("");
    var deadline = window.__React.useState(config.defaultDeadline || "");
    var maxGoalRounds = window.__React.useState(String(valueOr(config.maxGoalRounds, 40)));
    var maxBlockedResumes = window.__React.useState(String(valueOr(config.maxBlockedResumes, 3)));
    var timeoutMinutes = window.__React.useState(String(Math.round(valueOr(config.taskTimeoutMs, 108e5) / 6e4)));
    var maxAttempts = window.__React.useState(String(valueOr(config.maxAttempts, 3)));
    var webhook = window.__React.useState(config.webhook || "");
    var autoArchive = window.__React.useState(config.autoArchive !== false);
    var enableNotifications = window.__React.useState(config.enableNotifications === true);
    var advancedOpen = window.__React.useState(false);
    var notifyOpen = window.__React.useState(false);
    var error = window.__React.useState("");
    var submitting = window.__React.useState(false);
    function handleSubmit(event) {
      event.preventDefault();
      if (!content[0].trim()) {
        error[1]("\u8BF7\u586B\u5199\u4EFB\u52A1\u5185\u5BB9");
        return;
      }
      if (cron[0] && schedule[0]) {
        error[1]("\u5FAA\u73AF\u8C03\u5EA6\u548C\u4E00\u6B21\u6027\u5B9A\u65F6\u4E0D\u80FD\u540C\u65F6\u8BBE\u7F6E");
        return;
      }
      var data = {
        content: content[0].trim(),
        priority: parseInt(priority[0], 10),
        autoArchive: autoArchive[0],
        enableNotifications: enableNotifications[0]
      };
      if (key[0].trim()) data.key = key[0].trim();
      if (cron[0]) data.cron = cron[0];
      if (schedule[0]) data.schedule = new Date(schedule[0]).toISOString();
      if (deadline[0]) data.deadline = deadline[0];
      if (maxGoalRounds[0]) data.maxGoalRounds = parseInt(maxGoalRounds[0], 10);
      if (maxBlockedResumes[0]) data.maxBlockedResumes = parseInt(maxBlockedResumes[0], 10);
      if (timeoutMinutes[0]) data.timeoutMs = parseInt(timeoutMinutes[0], 10) * 6e4;
      if (maxAttempts[0]) data.maxAttempts = parseInt(maxAttempts[0], 10);
      if (webhook[0].trim()) data.webhook = webhook[0].trim();
      submitting[1](true);
      error[1]("");
      props.onCreate(data).catch(function(caught) {
        error[1](caught && caught.message ? caught.message : "\u521B\u5EFA\u5931\u8D25");
      }).finally(function() {
        submitting[1](false);
      });
    }
    return h2(
      DialogShell,
      { title: "\u65B0\u5EFA\u65E0\u4EBA\u503C\u5B88\u4EFB\u52A1", onClose: props.onClose, className: "wide" },
      h2(
        "form",
        { className: "aq-modal-content", onSubmit: handleSubmit },
        h2("p", { className: "aq-modal-subtitle" }, "\u4EFB\u52A1\u5728\u72EC\u7ACB\u5DE5\u4F5C\u76EE\u5F55\u8FD0\u884C\uFF1B\u4F60\u4F7F\u7528 DSH \u65F6\uFF0C\u540E\u53F0\u4EFB\u52A1\u4F1A\u81EA\u52A8\u6682\u505C\u3002"),
        error[0] && h2("div", { className: "aq-inline-error", role: "alert" }, error[0]),
        h2("label", { htmlFor: "aq-new-content" }, "\u4EFB\u52A1\u5185\u5BB9\uFF08Markdown\uFF09"),
        h2("textarea", { id: "aq-new-content", "data-dialog-initial-focus": "", value: content[0], onChange: function(event) {
          content[1](event.target.value);
        }, placeholder: "\u4F8B\u5982\uFF1A\u6574\u7406\u672C\u5468\u5BA2\u6237\u8BBF\u8C08\uFF0C\u5F52\u7EB3\u4E09\u6761\u4EA7\u54C1\u673A\u4F1A\u5E76\u8F93\u51FA\u62A5\u544A\u2026", required: true }),
        h2(
          "div",
          { className: "aq-row" },
          h2(Field, { label: "\u4EFB\u52A1\u6807\u8BC6\uFF08\u53EF\u9009\uFF09", help: "\u7559\u7A7A\u5C06\u81EA\u52A8\u751F\u6210" }, h2("input", { value: key[0], onChange: function(event) {
            key[1](event.target.value);
          }, placeholder: "weekly-insight" })),
          h2(Field, { label: "\u4F18\u5148\u7EA7\uFF081-10\uFF09" }, h2("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function(event) {
            priority[1](event.target.value);
          } }))
        ),
        h2(
          "div",
          { className: "aq-row" },
          h2(CronField, { label: "\u5FAA\u73AF\u8C03\u5EA6", value: cron[0], onChange: cron[1], presets: CRON_PRESETS, placeholder: "0 8 * * *" }),
          h2(Field, { label: "\u4E00\u6B21\u6027\u5B9A\u65F6" }, h2("input", { type: "datetime-local", value: schedule[0], onChange: function(event) {
            schedule[1](event.target.value);
          } }))
        ),
        h2(CronField, { label: "\u6267\u884C\u622A\u6B62\u65F6\u95F4", value: deadline[0], onChange: deadline[1], presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" }),
        h2(
          Disclosure,
          { title: "\u9AD8\u7EA7\u8BBE\u7F6E", open: advancedOpen[0], onToggle: function() {
            advancedOpen[1](!advancedOpen[0]);
          } },
          h2(
            "div",
            { className: "aq-row three" },
            h2(Field, { label: "\u6700\u591A\u63A8\u8FDB\u8F6E\u6570" }, h2("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function(event) {
              maxGoalRounds[1](event.target.value);
            } })),
            h2(Field, { label: "\u6700\u591A\u81EA\u52A8\u6062\u590D" }, h2("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function(event) {
              maxBlockedResumes[1](event.target.value);
            } })),
            h2(Field, { label: "\u6700\u957F\u6267\u884C\uFF08\u5206\u949F\uFF09" }, h2("input", { type: "number", min: "10", max: "1440", value: timeoutMinutes[0], onChange: function(event) {
              timeoutMinutes[1](event.target.value);
            } }))
          ),
          h2(Field, { label: "\u6700\u591A\u542F\u52A8\u5C1D\u8BD5\uFF081-10\uFF09" }, h2("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function(event) {
            maxAttempts[1](event.target.value);
          } }))
        ),
        h2(
          Disclosure,
          { title: "\u901A\u77E5", open: notifyOpen[0], onToggle: function() {
            notifyOpen[1](!notifyOpen[0]);
          } },
          h2(Field, { label: "Webhook URL" }, h2("input", { type: "url", value: webhook[0], onChange: function(event) {
            webhook[1](event.target.value);
          }, placeholder: "https://example.com/hook" })),
          h2(CheckField, { checked: autoArchive[0], onChange: autoArchive[1], label: "\u5B8C\u6210\u540E\u81EA\u52A8\u5F52\u6863" }),
          h2(CheckField, { checked: enableNotifications[0], onChange: function(checked) {
            enableNotifications[1](checked);
            if (checked) requestNotificationPermission();
          }, label: "\u6D4F\u89C8\u5668\u7ED3\u679C\u901A\u77E5" })
        ),
        h2(
          "div",
          { className: "aq-modal-actions" },
          h2("button", { type: "button", className: "aq-btn", onClick: props.onClose, disabled: submitting[0] }, "\u53D6\u6D88"),
          h2("button", { type: "submit", className: "aq-btn primary", disabled: submitting[0] }, submitting[0] ? "\u521B\u5EFA\u4E2D\u2026" : "\u521B\u5EFA\u4EFB\u52A1")
        )
      )
    );
  }
  function EditTaskModal(props) {
    var task = props.task;
    var content = window.__React.useState(task.body || "");
    var cron = window.__React.useState(task.cron || "");
    var deadline = window.__React.useState(task.deadline || "");
    var schedule = window.__React.useState(task.schedule ? localDatetimeString(task.schedule) : "");
    var priority = window.__React.useState(String(task.priority || 5));
    var autoArchive = window.__React.useState(task.autoArchive !== false);
    var enableNotifications = window.__React.useState(task.enableNotifications === true);
    var maxGoalRounds = window.__React.useState(task.maxGoalRounds == null ? "" : String(task.maxGoalRounds));
    var maxBlockedResumes = window.__React.useState(task.maxBlockedResumes == null ? "" : String(task.maxBlockedResumes));
    var timeoutMinutes = window.__React.useState(task.timeoutMs ? String(Math.round(task.timeoutMs / 6e4)) : "");
    var maxAttempts = window.__React.useState(task.maxAttempts == null ? "" : String(task.maxAttempts));
    var webhook = window.__React.useState(task.webhook || "");
    var advancedOpen = window.__React.useState(false);
    var notifyOpen = window.__React.useState(false);
    var error = window.__React.useState("");
    var submitting = window.__React.useState(false);
    function handleSubmit(event) {
      event.preventDefault();
      if (!content[0].trim()) {
        error[1]("\u4EFB\u52A1\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A");
        return;
      }
      if (cron[0] && schedule[0]) {
        error[1]("\u5FAA\u73AF\u8C03\u5EA6\u548C\u4E00\u6B21\u6027\u5B9A\u65F6\u4E0D\u80FD\u540C\u65F6\u8BBE\u7F6E");
        return;
      }
      var patch = {};
      var add = function(name, next, previous) {
        if (next !== previous) patch[name] = next;
      };
      add("content", content[0], task.body || "");
      add("cron", cron[0], task.cron || "");
      var scheduleIso = schedule[0] ? new Date(schedule[0]).toISOString() : "";
      add("schedule", scheduleIso, task.schedule || "");
      add("deadline", deadline[0], task.deadline || "");
      add("priority", parseInt(priority[0], 10), task.priority || 5);
      add("autoArchive", autoArchive[0], task.autoArchive !== false);
      add("enableNotifications", enableNotifications[0], task.enableNotifications === true);
      add("maxGoalRounds", numberOrUndefined(maxGoalRounds[0]) ?? null, task.maxGoalRounds ?? null);
      add("maxBlockedResumes", numberOrUndefined(maxBlockedResumes[0]) ?? null, task.maxBlockedResumes ?? null);
      add("timeoutMs", timeoutMinutes[0] ? parseInt(timeoutMinutes[0], 10) * 6e4 : null, task.timeoutMs ?? null);
      add("maxAttempts", numberOrUndefined(maxAttempts[0]) ?? null, task.maxAttempts ?? null);
      add("webhook", webhook[0].trim() || null, task.webhook || null);
      if (!Object.keys(patch).length) {
        props.onClose();
        return;
      }
      submitting[1](true);
      error[1]("");
      props.onUpdate(task.key, patch).catch(function(caught) {
        error[1](caught.message || "\u4FDD\u5B58\u5931\u8D25");
      }).finally(function() {
        submitting[1](false);
      });
    }
    return h2(
      DialogShell,
      { title: "\u7F16\u8F91\u4EFB\u52A1 \xB7 " + task.key, onClose: props.onClose, className: "wide" },
      h2(
        "form",
        { className: "aq-modal-content", onSubmit: handleSubmit },
        h2("p", { className: "aq-modal-subtitle" }, "\u4EC5\u5F85\u6267\u884C\u4EFB\u52A1\u53EF\u7F16\u8F91\uFF1B\u8FD0\u884C\u4E2D\u7684\u4EFB\u52A1\u8BF7\u5148\u505C\u6B62\u3002"),
        error[0] && h2("div", { className: "aq-inline-error", role: "alert" }, error[0]),
        h2("label", { htmlFor: "aq-edit-content" }, "\u4EFB\u52A1\u5185\u5BB9\uFF08Markdown\uFF09"),
        h2("textarea", { id: "aq-edit-content", "data-dialog-initial-focus": "", value: content[0], onChange: function(event) {
          content[1](event.target.value);
        } }),
        h2(
          "div",
          { className: "aq-row" },
          h2(Field, { label: "\u4F18\u5148\u7EA7\uFF081-10\uFF09" }, h2("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function(event) {
            priority[1](event.target.value);
          } })),
          h2(CronField, { label: "\u5FAA\u73AF\u8C03\u5EA6", value: cron[0], onChange: cron[1], presets: CRON_PRESETS, placeholder: "0 8 * * *" })
        ),
        h2(
          "div",
          { className: "aq-row" },
          h2(Field, { label: "\u4E00\u6B21\u6027\u5B9A\u65F6" }, h2("input", { type: "datetime-local", value: schedule[0], onChange: function(event) {
            schedule[1](event.target.value);
          } })),
          h2(CronField, { label: "\u6267\u884C\u622A\u6B62\u65F6\u95F4", value: deadline[0], onChange: deadline[1], presets: DEADLINE_PRESETS, placeholder: "0 21 * * *" })
        ),
        h2(
          Disclosure,
          { title: "\u9AD8\u7EA7\u8BBE\u7F6E", open: advancedOpen[0], onToggle: function() {
            advancedOpen[1](!advancedOpen[0]);
          } },
          h2(
            "div",
            { className: "aq-row three" },
            h2(Field, { label: "\u6700\u591A\u63A8\u8FDB\u8F6E\u6570" }, h2("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function(event) {
              maxGoalRounds[1](event.target.value);
            }, placeholder: "\u9ED8\u8BA4 40" })),
            h2(Field, { label: "\u6700\u591A\u81EA\u52A8\u6062\u590D" }, h2("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function(event) {
              maxBlockedResumes[1](event.target.value);
            }, placeholder: "\u9ED8\u8BA4 3" })),
            h2(Field, { label: "\u6700\u957F\u6267\u884C\uFF08\u5206\u949F\uFF09" }, h2("input", { type: "number", min: "10", max: "1440", value: timeoutMinutes[0], onChange: function(event) {
              timeoutMinutes[1](event.target.value);
            }, placeholder: "\u9ED8\u8BA4 180" }))
          ),
          h2(Field, { label: "\u6700\u591A\u542F\u52A8\u5C1D\u8BD5\uFF081-10\uFF09" }, h2("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function(event) {
            maxAttempts[1](event.target.value);
          }, placeholder: "\u9ED8\u8BA4 3" }))
        ),
        h2(
          Disclosure,
          { title: "\u901A\u77E5", open: notifyOpen[0], onToggle: function() {
            notifyOpen[1](!notifyOpen[0]);
          } },
          h2(Field, { label: "Webhook URL" }, h2("input", { type: "url", value: webhook[0], onChange: function(event) {
            webhook[1](event.target.value);
          }, placeholder: "https://example.com/hook" })),
          h2(CheckField, { checked: autoArchive[0], onChange: autoArchive[1], label: "\u5B8C\u6210\u540E\u81EA\u52A8\u5F52\u6863" }),
          h2(CheckField, { checked: enableNotifications[0], onChange: function(checked) {
            enableNotifications[1](checked);
            if (checked) requestNotificationPermission();
          }, label: "\u6D4F\u89C8\u5668\u7ED3\u679C\u901A\u77E5" })
        ),
        h2(
          "div",
          { className: "aq-modal-actions" },
          h2("button", { type: "button", className: "aq-btn", onClick: props.onClose, disabled: submitting[0] }, "\u53D6\u6D88"),
          h2("button", { type: "submit", className: "aq-btn primary", disabled: submitting[0] }, submitting[0] ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58")
        )
      )
    );
  }
  function ConfigPanel(props) {
    var config = props.config || {};
    var valueOr = function(value, fallback) {
      return value === void 0 || value === null ? fallback : value;
    };
    var maxConcurrent = window.__React.useState(String(valueOr(config.maxConcurrent, 1)));
    var maxGoalRounds = window.__React.useState(String(valueOr(config.maxGoalRounds, 40)));
    var maxBlockedResumes = window.__React.useState(String(valueOr(config.maxBlockedResumes, 3)));
    var autoArchive = window.__React.useState(config.autoArchive !== false);
    var unknownThreshold = window.__React.useState(String(valueOr(config.unknownThreshold, 3)));
    var taskTimeoutMin = window.__React.useState(String(Math.round(valueOr(config.taskTimeoutMs, 108e5) / 6e4)));
    var maxAttempts = window.__React.useState(String(valueOr(config.maxAttempts, 3)));
    var defaultDeadline = window.__React.useState(config.defaultDeadline || "");
    var enableNotifications = window.__React.useState(config.enableNotifications === true);
    var webhook = window.__React.useState(config.webhook || "");
    var priority = window.__React.useState(String(valueOr(config.priority, 5)));
    var backoffBaseSec = window.__React.useState(String(Math.round(valueOr(config.retryBackoffBaseMs, 3e4) / 1e3)));
    var backoffMaxSec = window.__React.useState(String(Math.round(valueOr(config.retryBackoffMaxMs, 3e5) / 1e3)));
    var saving = window.__React.useState(false);
    var saveError = window.__React.useState("");
    function handleSave(event) {
      event.preventDefault();
      var patch = {};
      var add = function(name, next, previous) {
        if (next !== previous) patch[name] = next;
      };
      add("maxGoalRounds", parseInt(maxGoalRounds[0], 10), valueOr(config.maxGoalRounds, 40));
      add("maxBlockedResumes", parseInt(maxBlockedResumes[0], 10), valueOr(config.maxBlockedResumes, 3));
      add("autoArchive", autoArchive[0], config.autoArchive !== false);
      add("unknownThreshold", parseInt(unknownThreshold[0], 10), valueOr(config.unknownThreshold, 3));
      add("taskTimeoutMs", parseInt(taskTimeoutMin[0], 10) * 6e4, valueOr(config.taskTimeoutMs, 108e5));
      add("maxAttempts", parseInt(maxAttempts[0], 10), valueOr(config.maxAttempts, 3));
      add("defaultDeadline", defaultDeadline[0] || null, config.defaultDeadline || null);
      add("webhook", webhook[0].trim() || null, config.webhook || null);
      add("enableNotifications", enableNotifications[0], config.enableNotifications === true);
      add("priority", parseInt(priority[0], 10), valueOr(config.priority, 5));
      add("retryBackoffBaseMs", parseInt(backoffBaseSec[0], 10) * 1e3, valueOr(config.retryBackoffBaseMs, 3e4));
      add("retryBackoffMaxMs", parseInt(backoffMaxSec[0], 10) * 1e3, valueOr(config.retryBackoffMaxMs, 3e5));
      var operations = [];
      var concurrency = parseInt(maxConcurrent[0], 10);
      if (concurrency !== valueOr(config.maxConcurrent, 1)) operations.push(props.onSetConcurrency(concurrency));
      if (Object.keys(patch).length) operations.push(props.onUpdate(patch));
      if (!operations.length) {
        props.onClose();
        return;
      }
      saving[1](true);
      saveError[1]("");
      Promise.all(operations).then(props.onClose).catch(function(caught) {
        saveError[1](caught.message || "\u4FDD\u5B58\u5931\u8D25");
      }).finally(function() {
        saving[1](false);
      });
    }
    return h2(
      DialogShell,
      {
        variant: "drawer",
        title: "\u8FD0\u884C\u8BBE\u7F6E",
        onClose: props.onClose,
        className: "aq-config-panel",
        renderTitle: function(args) {
          return h2("div", { className: "aq-d-hd" }, h2("div", null, h2("h3", { id: args.id }, args.title), h2("p", null, "\u8FD9\u4E9B\u8BBE\u7F6E\u53EA\u5F71\u54CD\u4EFB\u52A1\u961F\u5217")), h2("button", { className: "aq-d-close", "aria-label": "\u5173\u95ED\u8FD0\u884C\u8BBE\u7F6E", onClick: props.onClose }, "\xD7"));
        }
      },
      h2(
        "form",
        { className: "aq-config-body", onSubmit: handleSave },
        saveError[0] && h2("div", { className: "aq-inline-error", role: "alert" }, saveError[0]),
        h2(
          ConfigSection,
          { title: "\u6267\u884C\u9650\u5236" },
          h2(
            "div",
            { className: "aq-row" },
            h2(Field, { label: "\u6700\u5927\u5E76\u53D1\uFF081-8\uFF09" }, h2("input", { "data-dialog-initial-focus": "", type: "number", min: "1", max: "8", value: maxConcurrent[0], onChange: function(event) {
              maxConcurrent[1](event.target.value);
            } })),
            h2(Field, { label: "\u4EFB\u52A1\u8D85\u65F6\uFF08\u5206\u949F\uFF09" }, h2("input", { type: "number", min: "10", max: "1440", value: taskTimeoutMin[0], onChange: function(event) {
              taskTimeoutMin[1](event.target.value);
            } }))
          ),
          h2(
            "div",
            { className: "aq-row" },
            h2(Field, { label: "\u6700\u591A\u63A8\u8FDB\u8F6E\u6570" }, h2("input", { type: "number", min: "1", max: "100", value: maxGoalRounds[0], onChange: function(event) {
              maxGoalRounds[1](event.target.value);
            } })),
            h2(Field, { label: "\u6700\u591A\u81EA\u52A8\u6062\u590D" }, h2("input", { type: "number", min: "0", max: "10", value: maxBlockedResumes[0], onChange: function(event) {
              maxBlockedResumes[1](event.target.value);
            } }))
          )
        ),
        h2(
          ConfigSection,
          { title: "\u5931\u8D25\u4E0E\u91CD\u8BD5" },
          h2(
            "div",
            { className: "aq-row" },
            h2(Field, { label: "\u6700\u591A\u542F\u52A8\u5C1D\u8BD5" }, h2("input", { type: "number", min: "1", max: "10", value: maxAttempts[0], onChange: function(event) {
              maxAttempts[1](event.target.value);
            } })),
            h2(Field, { label: "\u8FDE\u7EED\u72B6\u6001\u5F02\u5E38\u6B21\u6570" }, h2("input", { type: "number", min: "1", max: "10", value: unknownThreshold[0], onChange: function(event) {
              unknownThreshold[1](event.target.value);
            } }))
          ),
          h2(
            "div",
            { className: "aq-row" },
            h2(Field, { label: "\u9996\u6B21\u91CD\u8BD5\u7B49\u5F85\uFF08\u79D2\uFF09" }, h2("input", { type: "number", min: "5", max: "600", value: backoffBaseSec[0], onChange: function(event) {
              backoffBaseSec[1](event.target.value);
            } })),
            h2(Field, { label: "\u6700\u957F\u91CD\u8BD5\u7B49\u5F85\uFF08\u79D2\uFF09" }, h2("input", { type: "number", min: "10", max: "3600", value: backoffMaxSec[0], onChange: function(event) {
              backoffMaxSec[1](event.target.value);
            } }))
          )
        ),
        h2(
          ConfigSection,
          { title: "\u4EFB\u52A1\u9ED8\u8BA4\u503C" },
          h2(
            "div",
            { className: "aq-row" },
            h2(Field, { label: "\u9ED8\u8BA4\u4F18\u5148\u7EA7" }, h2("input", { type: "number", min: "1", max: "10", value: priority[0], onChange: function(event) {
              priority[1](event.target.value);
            } })),
            h2(Field, { label: "\u9ED8\u8BA4\u622A\u6B62\u65F6\u95F4\uFF08cron\uFF09" }, h2("input", { value: defaultDeadline[0], onChange: function(event) {
              defaultDeadline[1](event.target.value);
            }, placeholder: "0 21 * * *" }))
          ),
          h2(Field, { label: "Webhook URL" }, h2("input", { type: "url", value: webhook[0], onChange: function(event) {
            webhook[1](event.target.value);
          }, placeholder: "https://example.com/hook" })),
          h2(CheckField, { checked: autoArchive[0], onChange: autoArchive[1], label: "\u4EFB\u52A1\u7ED3\u675F\u540E\u81EA\u52A8\u5F52\u6863" }),
          h2(CheckField, { checked: enableNotifications[0], onChange: function(checked) {
            enableNotifications[1](checked);
            if (checked) requestNotificationPermission();
          }, label: "\u6D4F\u89C8\u5668\u7ED3\u679C\u901A\u77E5" })
        ),
        h2(
          ConfigSection,
          { title: "\u5B58\u50A8" },
          h2(Field, { label: "\u961F\u5217\u6839\u76EE\u5F55", help: "\u53EA\u8BFB\uFF0C\u7531\u542F\u52A8\u914D\u7F6E\u51B3\u5B9A" }, h2("input", { value: config.queueDir || "\u7531\u542F\u52A8\u914D\u7F6E\u51B3\u5B9A", disabled: true, readOnly: true })),
          h2(Field, { label: "AI \u76F4\u63A5\u64CD\u4F5C\u961F\u5217", help: "\u53EA\u8BFB\uFF0C\u5728\u63D2\u4EF6\u542F\u52A8\u914D\u7F6E\u4E2D\u8BBE\u7F6E enableHostAiTools" }, h2("input", { value: config.enableHostAiTools !== false ? "\u5DF2\u542F\u7528" : "\u5DF2\u5173\u95ED", disabled: true, readOnly: true }))
        ),
        h2(
          "div",
          { className: "aq-d-actions aq-config-actions" },
          h2("button", { type: "button", className: "aq-btn", onClick: props.onClose, disabled: saving[0] }, "\u53D6\u6D88"),
          h2("button", { type: "submit", className: "aq-btn primary", disabled: saving[0] }, saving[0] ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u8BBE\u7F6E")
        )
      )
    );
  }
  function ConfirmModal(props) {
    return h2(
      DialogShell,
      { title: props.title || "\u786E\u8BA4\u64CD\u4F5C", onClose: props.onCancel, className: "aq-confirm", initialFocusSelector: "[data-confirm-cancel]" },
      h2(
        "div",
        { className: "aq-modal-content" },
        h2("p", { className: "aq-confirm-message" }, props.message),
        h2(
          "div",
          { className: "aq-modal-actions" },
          h2("button", { type: "button", className: "aq-btn", "data-confirm-cancel": "", onClick: props.onCancel }, "\u53D6\u6D88"),
          h2("button", { type: "button", className: "aq-btn " + (props.tone || "danger"), onClick: props.onConfirm }, props.confirmLabel || "\u786E\u8BA4")
        )
      )
    );
  }
  function Field(props) {
    var generatedId = window.__React.useId();
    var controlId = window.__React.isValidElement(props.children) && props.children.props.id ? props.children.props.id : generatedId;
    var control = window.__React.isValidElement(props.children) ? window.__React.cloneElement(props.children, { id: controlId }) : props.children;
    return h2(
      "div",
      { className: "aq-field" },
      props.label && h2("label", { htmlFor: controlId }, props.label),
      control,
      props.help && h2("p", { className: "aq-help" }, props.help)
    );
  }
  function CheckField(props) {
    return h2(
      "label",
      { className: "aq-check-row" },
      h2("input", { type: "checkbox", checked: props.checked, onChange: function(event) {
        props.onChange(event.target.checked);
      } }),
      h2("span", null, props.label)
    );
  }
  function Disclosure(props) {
    return h2(
      "section",
      { className: "aq-form-section" },
      h2(
        "button",
        { type: "button", onClick: props.onToggle, "aria-expanded": props.open },
        h2("span", null, props.title),
        h2("span", null, props.hint ? props.hint + "  " : "", props.open ? "\u2212" : "+")
      ),
      props.open && h2("div", { className: "aq-disclosure-body" }, props.children)
    );
  }
  function ConfigSection(props) {
    return h2("section", { className: "aq-config-section" }, h2("h4", null, props.title), props.children);
  }
  function CronField(props) {
    var selectValue = window.__React.useState(function() {
      var match = (props.presets || []).find(function(preset) {
        return preset.value === props.value && preset.value !== "" && preset.value !== "__custom__";
      });
      return match ? match.value : props.value ? "__custom__" : "";
    });
    var custom = selectValue[0] === "__custom__";
    return h2(
      "div",
      { className: "aq-field" },
      h2("span", { className: "aq-field-label" }, props.label),
      h2(
        "div",
        { className: "aq-cron-field" },
        h2(
          "select",
          { "aria-label": props.label + "\u9884\u8BBE", value: selectValue[0], onChange: function(event) {
            var value = event.target.value;
            selectValue[1](value);
            if (value !== "__custom__") props.onChange(value);
          } },
          (props.presets || []).map(function(preset) {
            return h2("option", { key: preset.value, value: preset.value }, preset.label);
          })
        ),
        h2("input", { "aria-label": props.label + "\u81EA\u5B9A\u4E49\u8868\u8FBE\u5F0F", value: custom ? props.value : "", onChange: function(event) {
          props.onChange(event.target.value);
        }, placeholder: props.placeholder, disabled: !custom })
      )
    );
  }

  // client/src/components/Workstation.jsx
  function h3() {
    return window.__React.createElement.apply(window.__React, arguments);
  }
  function Workstation(props) {
    var controller = props.controller;
    var transport = props.transport;
    var sessions = props.sessions;
    var state = window.__React.useState(function() {
      return controller.getSnapshot();
    });
    var confirm = window.__React.useState(null);
    var message = window.__React.useState(null);
    var query = window.__React.useState("");
    var selected = window.__React.useState([]);
    var sidebarOpen = window.__React.useState(false);
    var accessOpen = window.__React.useState(false);
    window.__React.useEffect(function() {
      return controller.subscribe(function() {
        state[1](controller.getSnapshot());
      });
    }, []);
    var snap = state[0];
    var normalizedQuery = query[0].trim().toLowerCase();
    var visibleTasks = snap.filtered.filter(function(task) {
      if (!normalizedQuery) return true;
      return [task.key, task.summary, task.body, task.status].some(function(value) {
        return typeof value === "string" && value.toLowerCase().indexOf(normalizedQuery) >= 0;
      });
    });
    window.__React.useEffect(function() {
      selected[1](function(keys) {
        return keys.filter(function(key) {
          return snap.tasks.some(function(task) {
            return task.key === key && !task.archivedAt && task.status !== "running";
          });
        });
      });
    }, [snap.revision]);
    function flash(text) {
      message[1](text);
      setTimeout(function() {
        message[1](null);
      }, 2400);
    }
    function runAction(kind, key, opts) {
      return controller.doAction(kind, key, opts).then(function() {
        var labels = { archive: "\u5DF2\u5F52\u6863", restore: "\u5DF2\u6062\u590D", rerun: "\u5DF2\u91CD\u65B0\u5165\u961F", stop: "\u505C\u6B62\u6307\u4EE4\u5DF2\u63D0\u4EA4", delete: "\u5DF2\u5220\u9664", "force-scan": "\u626B\u63CF\u5B8C\u6210" };
        if (labels[kind]) flash(labels[kind]);
      }).catch(function() {
      });
    }
    function handleAction(kind, key) {
      if (kind === "delete" || kind === "stop" || kind === "rerun") {
        var prompt = kind === "delete" ? "\u786E\u8BA4\u5220\u9664\u8FD9\u4E2A\u5F85\u6267\u884C\u4EFB\u52A1\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u6062\u590D\u3002" : kind === "stop" ? "\u786E\u8BA4\u505C\u6B62\u8FD0\u884C\u4E2D\u7684\u4EFB\u52A1\uFF1F\u5F53\u524D\u4F1A\u8BDD\u4F1A\u5B89\u5168\u7ED3\u675F\u3002" : "\u786E\u8BA4\u91CD\u65B0\u6267\u884C\u8FD9\u4E2A\u4EFB\u52A1\uFF1F\u8FD9\u4F1A\u521B\u5EFA\u65B0\u7684\u72EC\u7ACB\u4F1A\u8BDD\uFF0C\u5E76\u518D\u6B21\u6D88\u8017\u6A21\u578B\u4E0E\u5DE5\u5177\u8D44\u6E90\u3002";
        confirm[1]({
          title: kind === "delete" ? "\u5220\u9664\u4EFB\u52A1" : kind === "stop" ? "\u505C\u6B62\u4EFB\u52A1" : "\u91CD\u65B0\u6267\u884C\u4EFB\u52A1",
          message: prompt,
          confirmLabel: kind === "delete" ? "\u5220\u9664" : kind === "stop" ? "\u505C\u6B62" : "\u91CD\u65B0\u6267\u884C",
          tone: kind === "rerun" ? "warn" : "danger",
          onConfirm: function() {
            confirm[1](null);
            runAction(kind, key);
          }
        });
        return;
      }
      runAction(kind, key);
    }
    function toggleSelected(key) {
      selected[1](function(keys) {
        return keys.indexOf(key) >= 0 ? keys.filter(function(item) {
          return item !== key;
        }) : keys.concat(key);
      });
    }
    function archiveSelected() {
      var keys = selected[0].slice();
      if (!keys.length) return;
      confirm[1]({
        title: "\u6279\u91CF\u5F52\u6863",
        message: "\u786E\u8BA4\u5F52\u6863\u5DF2\u9009\u62E9\u7684 " + keys.length + " \u4E2A\u4EFB\u52A1\uFF1F\u968F\u65F6\u53EF\u4EE5\u4ECE\u5F52\u6863\u533A\u6062\u590D\u3002",
        confirmLabel: "\u5F52\u6863",
        onConfirm: function() {
          confirm[1](null);
          controller.doAction("archive", null, { keys }).then(function(result) {
            var results = result && Array.isArray(result.results) ? result.results : [];
            var failed = results.filter(function(item) {
              return !item.ok;
            });
            var succeeded = results.length ? results.length - failed.length : keys.length;
            selected[1](failed.map(function(item) {
              return item.key;
            }));
            if (failed.length) flash("\u5DF2\u5F52\u6863 " + succeeded + " \u4E2A\uFF0C" + failed.length + " \u4E2A\u672A\u5F52\u6863\u5E76\u4FDD\u7559\u9009\u62E9");
            else flash("\u5DF2\u5F52\u6863 " + succeeded + " \u4E2A\u4EFB\u52A1");
          }).catch(function() {
          });
        }
      });
    }
    return h3(
      "div",
      { "data-dsh-autoqueue-view": "" },
      h3(
        "div",
        { className: "aq-ws" + (sidebarOpen[0] ? " nav-open" : "") },
        h3(Sidebar, { snap, controller, onNavigate: function() {
          sidebarOpen[1](false);
        } }),
        h3("button", { className: "aq-nav-scrim", "aria-label": "\u5173\u95ED\u5BFC\u822A", onClick: function() {
          sidebarOpen[1](false);
        } }),
        h3(
          "main",
          { className: "aq-main" },
          h3(Header, {
            snap,
            controller,
            message: message[0],
            onMenu: function() {
              sidebarOpen[1](true);
            },
            onAccess: function() {
              accessOpen[1](true);
            }
          }),
          h3(ErrorBanner, { error: snap.error || snap.transportError, onDismiss: function() {
            controller.clearError();
          } }),
          h3(
            "div",
            { className: "aq-canvas" },
            h3(WorkspaceHeader, {
              snap,
              onCreate: function() {
                controller.openNewTask();
              },
              onScan: function() {
                runAction("force-scan");
              },
              onReturn: function() {
                controller.setNavGroup("all");
                controller.setFilter("all");
              }
            }),
            h3(SafetyStatusBar, { snap }),
            h3(QueueControls, {
              snap,
              query: query[0],
              onQuery: query[1],
              onFilter: function(value) {
                controller.setFilter(value);
              },
              onAccess: function() {
                accessOpen[1](true);
              }
            }),
            selected[0].length > 0 && h3(
              "div",
              { className: "aq-batch", role: "status" },
              h3("span", null, "\u5DF2\u9009\u62E9 ", h3("strong", null, selected[0].length), " \u4E2A\u4EFB\u52A1"),
              h3("button", { className: "aq-btn", onClick: function() {
                selected[1]([]);
              } }, "\u53D6\u6D88\u9009\u62E9"),
              h3("button", { className: "aq-btn primary", onClick: archiveSelected }, "\u6279\u91CF\u5F52\u6863")
            ),
            h3(TaskList, {
              snap,
              tasks: visibleTasks,
              controller,
              sessions,
              selected: selected[0],
              onSelect: toggleSelected,
              onAction: handleAction
            })
          )
        )
      ),
      snap.showDetail && snap.detailTask && h3(TaskDetailPanel, {
        key: snap.detailTask.key,
        task: snap.detailTask,
        transport,
        controller,
        sessions,
        onClose: function() {
          controller.closeDetail();
        },
        onActionRequest: function(kind, key) {
          controller.closeDetail();
          handleAction(kind, key);
        }
      }),
      snap.showNewTask && h3(NewTaskModal, {
        options: snap.options,
        config: snap.config,
        onClose: function() {
          controller.closeNewTask();
        },
        onCreate: function(data) {
          return controller.createTask(data).then(function(result) {
            var key = result && result.key ? result.key : data.key || "\u65B0\u4EFB\u52A1";
            var taskState = result && result.taskState;
            var phase = "\u72B6\u6001\u5DF2\u540C\u6B65";
            if (taskState) {
              if (taskState.archivedAt) phase = taskState.status === "done" ? "\u5DF2\u5B8C\u6210\u5E76\u5F52\u6863" : "\u5DF2\u7ED3\u675F\u5E76\u5F52\u6863";
              else if (taskState.status === "running") phase = "\u5DF2\u5F00\u59CB\u6267\u884C";
              else if (taskState.status === "done") phase = "\u5DF2\u5B8C\u6210";
              else if (taskState.status === "failed") phase = "\u6267\u884C\u5931\u8D25\uFF0C\u8BF7\u67E5\u770B\u8BE6\u60C5";
              else if (taskState.status === "pending") phase = data.schedule ? "\u5DF2\u5B89\u6392\u5B9A\u65F6\u6267\u884C" : data.cron ? "\u5DF2\u542F\u7528\u5FAA\u73AF\u8C03\u5EA6" : "\u7B49\u5F85\u6267\u884C";
            }
            flash("\u5DF2\u5165\u961F\uFF1A" + key + " \xB7 " + (result.stateRefreshed === false ? "\u9875\u9762\u5237\u65B0\u5931\u8D25\uFF0C\u8BF7\u70B9\u51FB\u626B\u63CF" : phase));
            return result;
          });
        }
      }),
      snap.showEdit && snap.editTask && h3(EditTaskModal, {
        task: snap.editTask,
        options: snap.options,
        onClose: function() {
          controller.closeEdit();
        },
        onUpdate: function(key, patch) {
          return controller.updateTask(key, patch);
        }
      }),
      snap.showConfig && h3(ConfigPanel, {
        config: snap.config,
        options: snap.options,
        onClose: function() {
          controller.closeConfig();
        },
        onUpdate: function(patch) {
          return controller.updateConfig(patch);
        },
        onSetConcurrency: function(number) {
          return controller.setConcurrency(number);
        }
      }),
      accessOpen[0] && h3(ApiAccessPanel, { transport, snap, onClose: function() {
        accessOpen[1](false);
      }, onCopied: flash }),
      confirm[0] && h3(ConfirmModal, {
        title: confirm[0].title,
        message: confirm[0].message,
        confirmLabel: confirm[0].confirmLabel,
        tone: confirm[0].tone,
        onConfirm: confirm[0].onConfirm,
        onCancel: function() {
          confirm[1](null);
        }
      })
    );
  }
  function Sidebar(props) {
    var snap = props.snap;
    var ctrl = props.controller;
    var runtime = snap.runtimeHealth || {};
    var active = (snap.counts.pending || 0) + (snap.counts.running || 0) + (snap.counts.interrupted || 0);
    var navItems = [
      { key: "all", label: "\u4EFB\u52A1\u961F\u5217", icon: "list", count: snap.tasks.filter(function(task) {
        return !task.archivedAt;
      }).length },
      { key: "active", label: "\u6B63\u5728\u63A8\u8FDB", icon: "play", count: active },
      { key: "cron", label: "\u5FAA\u73AF\u8C03\u5EA6", icon: "repeat", count: snap.tasks.filter(function(task) {
        return task.taskType === "cron" && !task.archivedAt;
      }).length },
      { key: "schedule", label: "\u5B9A\u65F6\u6267\u884C", icon: "clock", count: snap.tasks.filter(function(task) {
        return task.taskType === "schedule" && !task.archivedAt;
      }).length },
      { key: "archived", label: "\u5F52\u6863\u8BB0\u5F55", icon: "archive", count: snap.tasks.filter(function(task) {
        return !!task.archivedAt;
      }).length }
    ];
    var connectionLabel = runtime.connected ? "\u5B9E\u65F6\u901A\u9053\u5DF2\u8FDE\u63A5" : runtime.reconnecting ? "\u5B9E\u65F6\u901A\u9053\u91CD\u8FDE\u4E2D" : runtime.status === "connecting" ? "\u5B9E\u65F6\u901A\u9053\u8FDE\u63A5\u4E2D" : "\u5B9E\u65F6\u901A\u9053\u672A\u8FDE\u63A5";
    var healthTone = runtime.connected ? "safe" : runtime.reconnecting ? "attention" : "unknown";
    return h3(
      "aside",
      { className: "aq-sb", "aria-label": "\u4EFB\u52A1\u5DE5\u4F5C\u53F0\u5BFC\u822A" },
      h3(
        "div",
        { className: "aq-brand" },
        h3("span", { className: "aq-brand-mark", "aria-hidden": "true", dangerouslySetInnerHTML: { __html: iconHtml("list") } }),
        h3("strong", null, "\u4EFB\u52A1\u961F\u5217")
      ),
      h3(
        "nav",
        { className: "aq-nav" },
        navItems.map(function(item) {
          return h3(
            "button",
            {
              key: item.key,
              className: "aq-nav-item" + (snap.navGroup === item.key ? " sel" : ""),
              onClick: function() {
                ctrl.setNavGroup(item.key);
                ctrl.setFilter("all");
                props.onNavigate();
              }
            },
            h3("span", { className: "aq-nav-svg", dangerouslySetInnerHTML: { __html: iconHtml(item.icon) } }),
            h3("span", { className: "aq-nav-text" }, item.label),
            h3("span", { className: "aq-nav-badge" }, item.count)
          );
        })
      ),
      h3(
        "div",
        { className: "aq-sb-foot" },
        h3("div", { className: "aq-host-state " + healthTone }, h3("span", { className: "aq-live-dot" }), h3("span", null, connectionLabel))
      )
    );
  }
  function Header(props) {
    return h3(
      "header",
      { className: "aq-head" },
      h3("button", { className: "aq-icon-btn aq-mobile-menu", onClick: props.onMenu, "aria-label": "\u6253\u5F00\u5BFC\u822A", dangerouslySetInnerHTML: { __html: iconHtml("list") } }),
      h3(
        "div",
        { className: "aq-head-title" },
        h3("h1", null, "\u65E0\u4EBA\u503C\u5B88\u4EFB\u52A1\u53F0")
      ),
      props.message && h3("div", { className: "aq-toast", role: "status" }, props.message),
      h3(
        "div",
        { className: "aq-head-actions" },
        h3("button", { className: "aq-btn ghost aq-hide-mobile", onClick: props.onAccess }, "AI / API \u63A5\u5165"),
        h3("button", { className: "aq-icon-btn", onClick: function() {
          props.controller.openConfig();
        }, title: "\u8FD0\u884C\u8BBE\u7F6E", "aria-label": "\u8FD0\u884C\u8BBE\u7F6E", dangerouslySetInnerHTML: { __html: iconHtml("gear") } }),
        h3("button", { className: "aq-btn primary aq-create", onClick: function() {
          props.controller.openNewTask();
        }, dangerouslySetInnerHTML: { __html: iconHtml("plus") + " \u65B0\u5EFA\u4EFB\u52A1" } }),
        h3("button", { className: "aq-icon-btn aq-close-board", onClick: function() {
          props.controller.closeBoard();
        }, title: "\u5173\u95ED\u4EFB\u52A1\u53F0", "aria-label": "\u5173\u95ED\u4EFB\u52A1\u53F0", dangerouslySetInnerHTML: { __html: iconHtml("close") } })
      )
    );
  }
  var WORKSPACE_COPY = {
    all: {
      title: "\u4EFB\u52A1\u961F\u5217",
      description: "\u67E5\u770B\u548C\u7BA1\u7406\u5168\u90E8\u672A\u5F52\u6863\u4EFB\u52A1\u3002"
    },
    active: {
      title: "\u6B63\u5728\u63A8\u8FDB",
      description: "\u67E5\u770B\u5F85\u6267\u884C\u3001\u6267\u884C\u4E2D\u548C\u4E2D\u65AD\u4EFB\u52A1\uFF0C\u4EE5\u53CA DSH \u8FD0\u884C\u72B6\u6001\u3002"
    },
    cron: {
      title: "\u5FAA\u73AF\u8C03\u5EA6",
      description: "\u7BA1\u7406\u5468\u671F\u4EFB\u52A1\u548C\u4E0B\u4E00\u6B21\u6267\u884C\u65F6\u95F4\u3002"
    },
    schedule: {
      title: "\u5B9A\u65F6\u6267\u884C",
      description: "\u7BA1\u7406\u4E00\u6B21\u6027\u5B9A\u65F6\u4EFB\u52A1\u3002"
    },
    archived: {
      title: "\u5F52\u6863\u8BB0\u5F55",
      description: "\u67E5\u770B\u5DF2\u5F52\u6863\u4EFB\u52A1\uFF1B\u5B8C\u6574\u6267\u884C\u8BB0\u5F55\u4ECD\u4FDD\u7559\u5728\u4EFB\u52A1\u8BE6\u60C5\u4E2D\u3002"
    }
  };
  function WorkspaceHeader(props) {
    var snap = props.snap;
    var meta = WORKSPACE_COPY[snap.navGroup] || WORKSPACE_COPY.all;
    var actionLabel;
    var action;
    if (snap.navGroup === "active") {
      actionLabel = "\u7ACB\u5373\u68C0\u67E5\u4EFB\u52A1";
      action = props.onScan;
    } else if (snap.navGroup === "cron") {
      actionLabel = "\u65B0\u5EFA\u5FAA\u73AF\u4EFB\u52A1";
      action = props.onCreate;
    } else if (snap.navGroup === "schedule") {
      actionLabel = "\u65B0\u5EFA\u5B9A\u65F6\u4EFB\u52A1";
      action = props.onCreate;
    } else if (snap.navGroup === "archived") {
      actionLabel = "\u8FD4\u56DE\u4EFB\u52A1\u961F\u5217";
      action = props.onReturn;
    } else {
      actionLabel = "\u7ACB\u5373\u68C0\u67E5\u4EFB\u52A1";
      action = props.onScan;
    }
    return h3(
      "section",
      { className: "aq-workspace-head", "aria-labelledby": "aq-workspace-title" },
      h3(
        "div",
        { className: "aq-workspace-copy" },
        h3("h2", { id: "aq-workspace-title" }, meta.title),
        h3("p", null, meta.description)
      ),
      h3("button", { className: "aq-btn ghost aq-workspace-action", onClick: action }, actionLabel),
      snap.navGroup === "active" && h3(RuntimeObservation, { runtime: snap.runtimeObservation })
    );
  }
  function RuntimeObservation(props) {
    var runtime = props.runtime;
    if (!runtime) return h3("div", { className: "aq-runtime-pending", role: "status" }, "\u6B63\u5728\u540C\u6B65 DSH \u8FD0\u884C\u72B6\u6001\u2026");
    var latestSync = mostRecentTimestamp([runtime.lastNativeEventAt, runtime.lastPollAt, runtime.lastScanAt]);
    var values = [
      ["\u524D\u53F0\u72B6\u6001", foregroundGateLabel(runtime.foregroundGate)],
      ["\u76D1\u63A7\u65B9\u5F0F", runtimeMonitorLabel(runtime.monitorMode)],
      ["\u6700\u8FD1\u540C\u6B65", latestSync ? formatIso(latestSync) : "\u7B49\u5F85\u9996\u6B21\u540C\u6B65"]
    ];
    var diagnostics = [
      ["\u76D1\u63A7\u65B9\u5F0F", runtimeMonitorLabel(runtime.monitorMode)],
      ["\u524D\u53F0\u72B6\u6001", foregroundGateLabel(runtime.foregroundGate)],
      ["\u4F1A\u8BDD\u5217\u8868", runtime.sessionListKnown === false ? "\u5F85\u786E\u8BA4" : "\u5DF2\u540C\u6B65"],
      ["\u6700\u8FD1\u4E8B\u4EF6", runtime.lastNativeEventAt ? formatIso(runtime.lastNativeEventAt) : "\u6682\u65E0"],
      ["\u6700\u8FD1\u72B6\u6001\u6821\u9A8C", runtime.lastPollAt ? formatIso(runtime.lastPollAt) : "\u6682\u65E0"],
      ["\u6700\u8FD1\u961F\u5217\u626B\u63CF", runtime.lastScanAt ? formatIso(runtime.lastScanAt) : "\u6682\u65E0"],
      ["\u515C\u5E95\u68C0\u67E5", runtime.watchdogMs ? "\u6BCF " + Math.round(runtime.watchdogMs / 1e3) + " \u79D2" : "\u672A\u542F\u7528"]
    ];
    return h3(
      "section",
      { className: "aq-runtime-observation", "aria-label": "DSH \u8FD0\u884C\u76D1\u63A7" },
      h3(
        "div",
        { className: "aq-runtime-summary" },
        values.map(function(item) {
          return h3("div", { key: item[0] }, h3("span", null, item[0]), h3("strong", null, item[1]));
        })
      ),
      h3(
        "details",
        { className: "aq-runtime-diagnostics" },
        h3("summary", null, "\u8FD0\u884C\u8BCA\u65AD"),
        h3("dl", null, diagnostics.map(function(item) {
          return h3("div", { key: item[0] }, h3("dt", null, item[0]), h3("dd", null, item[1]));
        }))
      )
    );
  }
  function mostRecentTimestamp(values) {
    return values.filter(Boolean).sort(function(a, b) {
      return new Date(b).getTime() - new Date(a).getTime();
    })[0] || null;
  }
  function runtimeMonitorLabel(mode) {
    if (mode === "native-events+authoritative-reconcile" || mode === "native-event-reconcile") return "\u4E8B\u4EF6\u9A71\u52A8\uFF0C\u5B9A\u65F6\u6821\u9A8C";
    return mode ? "\u8FD0\u884C\u76D1\u63A7\u5DF2\u542F\u7528" : "\u7B49\u5F85\u9996\u6B21\u540C\u6B65";
  }
  function foregroundGateLabel(gate) {
    if (gate === true || gate === "foreground-active" || gate === "closed" || gate === "busy") return "DSH \u4F7F\u7528\u4E2D\uFF0C\u961F\u5217\u5DF2\u6682\u505C";
    if (gate === false || gate === "foreground-idle" || gate === "open") return "DSH \u7A7A\u95F2\uFF0C\u53EF\u4EE5\u6267\u884C";
    if (gate === "unknown") return "\u6B63\u5728\u786E\u8BA4 DSH \u72B6\u6001";
    if (gate && typeof gate === "object") {
      if (gate.blocked === true || gate.foregroundActive === true) return "DSH \u4F7F\u7528\u4E2D\uFF0C\u961F\u5217\u5DF2\u6682\u505C";
      if (gate.blocked === false || gate.foregroundActive === false) return "DSH \u7A7A\u95F2\uFF0C\u53EF\u4EE5\u6267\u884C";
    }
    return "\u6B63\u5728\u786E\u8BA4 DSH \u72B6\u6001";
  }
  function SafetyStatusBar(props) {
    var snap = props.snap;
    var running = snap.metrics.running || 0;
    var foregroundPaused = snap.tasks.filter(function(task) {
      return task.foregroundPaused === true;
    }).length;
    var maxConcurrent = snap.config.maxConcurrent || 1;
    var isolation = snap.isolationHealth || { status: "unknown", message: "\u6B63\u5728\u786E\u8BA4\u9694\u79BB\u72B6\u6001" };
    var isolationTone = isolation.verified ? "safe" : isolation.status === "error" || isolation.status === "unsafe" ? "danger" : "warn";
    return h3(
      "section",
      { className: "aq-safety-bar " + isolationTone, "aria-label": "\u8FD0\u884C\u5B89\u5168\u72B6\u6001" },
      h3(StatusItem, {
        label: isolation.verified ? "\u9694\u79BB\u5DF2\u542F\u7528" : "\u9694\u79BB\u5F85\u786E\u8BA4",
        detail: isolation.message || "\u6B63\u5728\u786E\u8BA4\u9694\u79BB\u72B6\u6001",
        tone: isolationTone
      }),
      h3(StatusItem, {
        label: "\u524D\u53F0\u4F18\u5148",
        detail: foregroundPaused > 0 ? "\u5DF2\u6682\u505C " + foregroundPaused + " \u4E2A\u540E\u53F0\u4EFB\u52A1" : "\u4F7F\u7528 DSH \u65F6\u81EA\u52A8\u6682\u505C\u540E\u53F0\u4EFB\u52A1",
        tone: "safe"
      }),
      h3(StatusItem, { label: "\u5E76\u53D1\u5360\u7528", detail: running + " / " + maxConcurrent, tone: running > 0 ? "active" : "neutral" })
    );
  }
  function StatusItem(props) {
    return h3(
      "div",
      { className: "aq-safety-item " + props.tone },
      h3("span", { className: "aq-state-mark", "aria-hidden": "true" }, props.tone === "safe" || props.tone === "active" || props.tone === "neutral" ? "\u2713" : "!"),
      h3("div", null, h3("strong", null, props.label), h3("small", null, props.detail))
    );
  }
  function QueueControls(props) {
    var counts = props.snap.scopeCounts || {};
    var byGroup = {
      active: [["running", "\u8FD0\u884C\u4E2D"], ["pending", "\u5F85\u6267\u884C"], ["interrupted", "\u5DF2\u4E2D\u65AD"]],
      archived: [["done", "\u5DF2\u5B8C\u6210"], ["failed", "\u5DF2\u5931\u8D25"], ["stopped", "\u5DF2\u505C\u6B62"], ["interrupted", "\u5DF2\u4E2D\u65AD"]]
    };
    var definitions = byGroup[props.snap.navGroup] || [
      ["running", "\u8FD0\u884C\u4E2D"],
      ["pending", "\u5F85\u6267\u884C"],
      ["failed", "\u5DF2\u5931\u8D25"],
      ["stopped", "\u5DF2\u505C\u6B62"],
      ["interrupted", "\u5DF2\u4E2D\u65AD"],
      ["done", "\u5DF2\u5B8C\u6210"]
    ];
    var tabs = [["all", "\u5168\u90E8", (props.snap.scoped || []).length]].concat(definitions.map(function(item) {
      return [item[0], item[1], counts[item[0]] || 0];
    }));
    return h3(
      "div",
      { className: "aq-queue-tools" },
      h3(
        "label",
        { className: "aq-search" },
        h3("span", { className: "aq-search-icon", "aria-hidden": "true", dangerouslySetInnerHTML: { __html: iconHtml("search") } }),
        h3("span", { className: "sr-only" }, "\u641C\u7D22\u4EFB\u52A1"),
        h3("input", { type: "search", value: props.query, onChange: function(event) {
          props.onQuery(event.target.value);
        }, placeholder: "\u641C\u7D22\u4EFB\u52A1\u540D\u79F0\u6216\u5173\u952E\u8BCD" })
      ),
      h3(
        "div",
        { className: "aq-tabs", role: "tablist", "aria-label": "\u4EFB\u52A1\u72B6\u6001" },
        tabs.map(function(tab) {
          return h3("button", {
            key: tab[0],
            role: "tab",
            "aria-selected": props.snap.filter === tab[0],
            className: "aq-tab" + (props.snap.filter === tab[0] ? " sel" : ""),
            onClick: function() {
              props.onFilter(tab[0]);
            }
          }, tab[1], h3("span", { className: "aq-tab-count" }, tab[2]));
        })
      ),
      h3("button", { className: "aq-btn ghost aq-mobile-access", onClick: props.onAccess }, "\u63A5\u5165")
    );
  }
  function TaskList(props) {
    if (props.snap.loading) return h3("div", { className: "aq-loading", role: "status" }, h3("span", { className: "aq-loader" }), "\u6B63\u5728\u8BFB\u53D6\u4EFB\u52A1\u8D26\u672C\u2026");
    if (!props.tasks.length) {
      var emptyByGroup = {
        all: { title: "\u8FD8\u6CA1\u6709\u4EFB\u52A1", body: "\u521B\u5EFA\u4EFB\u52A1\u540E\uFF0C\u961F\u5217\u4F1A\u5728 DSH \u7A7A\u95F2\u65F6\u81EA\u52A8\u6267\u884C\u3002", action: "\u521B\u5EFA\u4EFB\u52A1" },
        active: { title: "\u6CA1\u6709\u6B63\u5728\u63A8\u8FDB\u7684\u4EFB\u52A1", body: "\u5F85\u6267\u884C\u3001\u6267\u884C\u4E2D\u548C\u4E2D\u65AD\u7684\u4EFB\u52A1\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002", action: "\u521B\u5EFA\u4EFB\u52A1" },
        cron: { title: "\u8FD8\u6CA1\u6709\u5FAA\u73AF\u4EFB\u52A1", body: "\u521B\u5EFA\u5FAA\u73AF\u4EFB\u52A1\u540E\uFF0C\u53EF\u5728\u8FD9\u91CC\u67E5\u770B\u4E0B\u4E00\u6B21\u6267\u884C\u65F6\u95F4\u3002", action: "\u521B\u5EFA\u5FAA\u73AF\u4EFB\u52A1" },
        schedule: { title: "\u8FD8\u6CA1\u6709\u5B9A\u65F6\u4EFB\u52A1", body: "\u521B\u5EFA\u4E00\u6B21\u6027\u5B9A\u65F6\u4EFB\u52A1\u540E\uFF0C\u53EF\u5728\u8FD9\u91CC\u67E5\u770B\u6267\u884C\u65F6\u95F4\u3002", action: "\u521B\u5EFA\u5B9A\u65F6\u4EFB\u52A1" },
        archived: { title: "\u5F52\u6863\u533A\u4E3A\u7A7A", body: "\u5F52\u6863\u540E\u7684\u4EFB\u52A1\u4F1A\u4FDD\u7559\u72B6\u6001\u548C\u8BE6\u60C5\u3002" }
      };
      var empty = emptyByGroup[props.snap.navGroup] || emptyByGroup.all;
      if (props.snap.filter !== "all") empty = { title: "\u6CA1\u6709\u7B26\u5408\u6761\u4EF6\u7684\u4EFB\u52A1", body: "\u53EF\u4EE5\u5207\u6362\u72B6\u6001\u6216\u4FEE\u6539\u641C\u7D22\u5173\u952E\u8BCD\u3002", action: "\u67E5\u770B\u5168\u90E8\u72B6\u6001" };
      var onEmptyAction = function() {
        if (props.snap.filter !== "all") props.controller.setFilter("all");
        else if (props.snap.navGroup === "archived") props.controller.setNavGroup("all");
        else props.controller.openNewTask();
      };
      return h3(
        "section",
        { className: "aq-empty" },
        h3(
          "div",
          null,
          h3("h2", null, empty.title),
          h3("p", null, empty.body),
          empty.action && h3("button", { className: "aq-btn primary", onClick: onEmptyAction }, empty.action)
        )
      );
    }
    return h3(
      "section",
      { className: "aq-list-shell", "aria-label": "\u4EFB\u52A1\u961F\u5217" },
      h3(
        "div",
        { className: "aq-list-head", "aria-hidden": "true" },
        h3(
          "span",
          null,
          props.snap.navGroup !== "archived" && h3("input", { type: "checkbox", title: "\u5168\u9009", checked: props.tasks.length > 0 && props.selected.length === props.tasks.length, onChange: function() {
            if (props.selected.length === props.tasks.length) {
              props.tasks.forEach(function(t) {
                if (props.selected.indexOf(t.key) >= 0) props.onSelect(t.key);
              });
            } else {
              props.tasks.forEach(function(t) {
                if (props.selected.indexOf(t.key) < 0) props.onSelect(t.key);
              });
            }
          } })
        ),
        h3("span", null, "\u4EFB\u52A1"),
        h3("span", null, "\u72B6\u6001"),
        h3("span", null, "\u8BA1\u5212"),
        h3("span", null, "\u6700\u65B0\u8FDB\u5C55"),
        h3("span", null, "\u64CD\u4F5C")
      ),
      h3(
        "div",
        { className: "aq-list" },
        props.tasks.map(function(task) {
          return h3(TaskRow, {
            key: task.key,
            task,
            snap: props.snap,
            selected: props.selected.indexOf(task.key) >= 0,
            onSelect: props.onSelect,
            onAction: props.onAction,
            onDetail: function(key) {
              props.controller.openDetail(key);
            },
            onEdit: function(key) {
              props.controller.openEdit(key);
            },
            onUnread: function(key) {
              props.controller.markRead(key, false);
            },
            onSession: function(sessionId) {
              props.controller.closeBoard();
              props.sessions.open(sessionId);
            }
          });
        })
      )
    );
  }
  function TaskRow(props) {
    var task = props.task;
    var cfg = STATUS_CONFIG2[task.status] || { label: task.status, color: "#596579" };
    var summary = task.summary || taskSummary(task.body);
    var typeInfo = TASK_TYPE_LABELS[task.taskType] || TASK_TYPE_LABELS.manual;
    var attention = taskNeedsAttention(task);
    var selectable = task.status !== "running" && !task.archivedAt;
    var sessionId = task.sessionId || task.lastSessionId || (task.executions && task.executions.length ? task.executions[task.executions.length - 1].sessionId : null);
    var plan = task.cron ? cronToHuman(task.cron) : task.schedule ? formatIso(task.schedule) : "\u5373\u65F6\u6D3E\u53D1";
    var recent = task.status === "pending" ? pendingReason(task, props.snap) : task.status === "running" ? task.stopPending === true ? "\u6B63\u5728\u786E\u8BA4\u4EFB\u52A1\u5DF2\u5B8C\u5168\u505C\u6B62" : task.foregroundPaused === true ? "DSH \u4F7F\u7528\u4E2D\uFF0C\u540E\u53F0\u4EFB\u52A1\u5DF2\u6682\u505C" : "\u7B2C " + (task.currentRound || 0) + "/" + (task.maxGoalRounds || "-") + " \u8F6E \xB7 " + elapseStr(task.startedAt) : task.lastError ? String(task.lastError).slice(0, 54) : task.updatedAt ? timeAgo(task.updatedAt) : "-";
    var actions = taskActions(task);
    function openRow() {
      props.onDetail(task.key);
    }
    return h3(
      "article",
      {
        className: "aq-card aq-task-row status-" + task.status + (attention ? " attention" : "") + (props.selected ? " selected" : ""),
        onClick: openRow
      },
      h3(
        "label",
        { className: "aq-select", onClick: function(event) {
          event.stopPropagation();
        } },
        h3("span", { className: "sr-only" }, "\u9009\u62E9 " + task.key),
        h3("input", { type: "checkbox", checked: props.selected, disabled: !selectable, onChange: function() {
          props.onSelect(task.key);
        } })
      ),
      h3(
        "div",
        { className: "aq-task-main" },
        h3(
          "div",
          { className: "aq-card-key" },
          isUnread2(task) && h3("span", { className: "unread", title: "\u672A\u8BFB\u7ED3\u679C" }),
          h3("button", { type: "button", className: "aq-task-open", onClick: function(event) {
            event.stopPropagation();
            openRow();
          }, "aria-label": "\u67E5\u770B\u4EFB\u52A1 " + task.key }, h3("strong", null, task.key)),
          h3("span", { className: "aq-card-type", dangerouslySetInnerHTML: { __html: iconHtml(typeInfo.icon) + " " + typeInfo.label } })
        ),
        h3("p", { className: "aq-card-summary" }, summary || "\u672A\u586B\u5199\u6458\u8981"),
        task.status === "running" && h3("span", { className: "aq-running-detail" }, task.foregroundPaused === true ? "\u5DF2\u6682\u505C\uFF0C\u7B49\u5F85 DSH \u7A7A\u95F2" : "\u6B63\u5728\u6267\u884C\u7B2C " + (task.currentRound || 0) + " \u8F6E")
      ),
      h3(
        "div",
        { className: "aq-task-status" },
        h3("span", { className: "aq-status-pill", style: { "--status-color": task.stopPending === true ? "#9a6700" : task.foregroundPaused === true ? "#27776e" : cfg.color } }, h3("i"), attention ? "\u9700\u5173\u6CE8" : task.stopPending === true ? "\u6B63\u5728\u505C\u6B62" : task.foregroundPaused === true ? "\u5DF2\u6682\u505C" : cfg.label),
        task.nextRetryAt && h3("small", null, "\u8BA1\u5212\u91CD\u8BD5")
      ),
      h3("div", { className: "aq-task-plan" }, h3("strong", null, plan), task.nextRunAt && h3("small", null, "\u4E0B\u6B21 ", formatIso(task.nextRunAt))),
      h3("div", { className: "aq-recent" }, h3("strong", null, recent), task.attempts > 0 && h3("small", null, "\u5C1D\u8BD5 ", task.attempts, " \u6B21")),
      h3(
        "div",
        { className: "aq-row-actions", onClick: function(event) {
          event.stopPropagation();
        } },
        task.status === "running" && task.stopPending !== true && !task.archivedAt && h3(ActionButton, { label: "\u505C\u6B62", icon: "stop", tone: "danger", onClick: function() {
          props.onAction("stop", task.key);
        } }),
        task.status === "pending" && (task.cron || task.schedule) && !task.archivedAt && h3(ActionButton, { label: "\u505C\u6B62\u8C03\u5EA6", tone: "danger", onClick: function() {
          props.onAction("stop", task.key);
        } }),
        task.status === "pending" && !task.archivedAt && h3(ActionButton, { label: "\u7F16\u8F91", icon: "edit", onClick: function() {
          props.onEdit(task.key);
        } }),
        actions.indexOf("rerun") >= 0 && h3(ActionButton, { label: "\u91CD\u65B0\u6267\u884C", icon: "repeat", tone: "success", onClick: function() {
          props.onAction("rerun", task.key);
        } }),
        actions.indexOf("archive") >= 0 && h3(ActionButton, { label: "\u5F52\u6863", icon: "archive", onClick: function() {
          props.onAction("archive", task.key);
        } }),
        task.archivedAt && h3(ActionButton, { label: "\u8FD8\u539F", icon: "restore", onClick: function() {
          props.onAction("restore", task.key);
        } }),
        ["done", "failed", "stopped", "interrupted"].indexOf(task.status) >= 0 && !isUnread2(task) && !task.archivedAt && h3(ActionButton, { label: "\u6807\u8BB0\u672A\u8BFB", icon: "inbox", onClick: function() {
          props.onUnread(task.key);
        } }),
        task.status === "pending" && !task.archivedAt && h3(ActionButton, { label: "\u5220\u9664", icon: "trash", tone: "danger", onClick: function() {
          props.onAction("delete", task.key);
        } }),
        sessionId && !task.archivedAt && h3(ActionButton, { label: "\u8DF3\u8F6C\u4F1A\u8BDD", icon: "external", onClick: function() {
          props.onSession(sessionId);
        } })
      )
    );
  }
  function pendingReason(task, snap) {
    var now = Date.now();
    var retryAt = task.nextRetryAt ? new Date(task.nextRetryAt).getTime() : NaN;
    if (Number.isFinite(retryAt) && retryAt > now) return "\u7B49\u5F85\u91CD\u8BD5\uFF0C" + formatIso(task.nextRetryAt) + " \u540E\u7EE7\u7EED";
    var scheduledAt = task.schedule ? new Date(task.schedule).getTime() : NaN;
    if (Number.isFinite(scheduledAt) && scheduledAt > now) return "\u8BA1\u5212\u4E8E " + formatIso(task.schedule) + " \u6267\u884C";
    if (task.cron && task.nextRunAt) return "\u7B49\u5F85\u8C03\u5EA6";
    var runtime = snap && snap.runtimeObservation;
    var gate = runtime && runtime.foregroundGate;
    if (gate === true || gate === "foreground-active" || gate === "closed" || gate === "busy" || gate && typeof gate === "object" && (gate.blocked === true || gate.foregroundActive === true)) {
      return "DSH \u4F7F\u7528\u4E2D\uFF0C\u961F\u5217\u5DF2\u6682\u505C";
    }
    if (runtime && (runtime.sessionListKnown === false || gate === "unknown")) return "\u6B63\u5728\u786E\u8BA4 DSH \u72B6\u6001";
    var running = snap && snap.metrics ? Number(snap.metrics.running || 0) : 0;
    var maxConcurrent = snap && snap.config ? Number(snap.config.maxConcurrent || 1) : 1;
    if (running >= maxConcurrent) return "\u540E\u53F0\u4EFB\u52A1\u5DF2\u6EE1\uFF0C\u6B63\u5728\u6392\u961F";
    return "\u5DF2\u5165\u961F\uFF0C\u7B49\u5F85\u6267\u884C";
  }
  function ActionButton(props) {
    return h3("button", {
      className: "aq-row-action " + (props.tone || ""),
      title: props.label,
      "aria-label": props.label,
      onClick: props.onClick
    }, props.label);
  }
  function taskActions(task) {
    var actions = [];
    if (["done", "failed", "stopped", "interrupted"].indexOf(task.status) >= 0 && !task.archivedAt) actions.push("rerun");
    if (task.status !== "running" && !task.archivedAt) actions.push("archive");
    return actions;
  }
  function taskNeedsAttention(task) {
    var phase = String(task.goalPhase || "");
    return task.status === "failed" || task.status === "interrupted" || phase.indexOf("uncertain") >= 0 || phase.indexOf("containment") >= 0 || !!task._goalAdmissionUncertain || !!task._promptAdmissionUncertain;
  }
  function ErrorBanner(props) {
    if (!props.error) return null;
    return h3(
      "div",
      { className: "aq-err", role: "alert" },
      h3("strong", null, "\u9700\u8981\u5904\u7406"),
      h3("span", null, props.error),
      h3("button", { className: "aq-err-dismiss", onClick: props.onDismiss, "aria-label": "\u5173\u95ED\u9519\u8BEF\u63D0\u793A" }, "\xD7")
    );
  }
  function ApiAccessPanel(props) {
    var origin = typeof location === "undefined" ? "http://127.0.0.1:3080" : location.origin;
    var queueBase = origin + "/api/queue";
    var discoveryBase = origin + "/api/autoqueue";
    var compactStateUrl = queueBase + "/state?archived=1&compact=1";
    var curl = `curl -H "<\u6309\u90E8\u7F72\u8981\u6C42\u586B\u5199\u8BA4\u8BC1\u4FE1\u606F>" \\
  '` + compactStateUrl + "'";
    var capability = window.__React.useState({ status: "loading", data: null, error: null });
    var retry = window.__React.useState(0);
    window.__React.useEffect(function() {
      var cancelled = false;
      capability[1]({ status: "loading", data: null, error: null });
      props.transport.capabilities().then(function(data2) {
        if (!cancelled) capability[1]({ status: "ready", data: data2, error: null });
      }).catch(function(error) {
        if (!cancelled) capability[1]({ status: "error", data: null, error: error.message || "Capabilities \u8BFB\u53D6\u5931\u8D25" });
      });
      return function() {
        cancelled = true;
      };
    }, [props.transport, retry[0]]);
    function copy(value, label) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function() {
          props.onCopied(label + "\u5DF2\u590D\u5236");
        });
      }
    }
    var data = capability[0].data;
    var features = data && data.features && typeof data.features === "object" ? data.features : {};
    var resources = data && data.resources && typeof data.resources === "object" ? data.resources : {};
    var limits = data && data.limits && typeof data.limits === "object" ? data.limits : {};
    var tools = data && Array.isArray(data.aiTools) ? data.aiTools : [];
    var aliases = data && Array.isArray(data.aliases) ? data.aliases : [];
    var registration = data && data.aiToolRegistration ? data.aiToolRegistration : null;
    var hostToolsEnabled = registration ? typeof registration.enabled === "boolean" ? registration.enabled : registration.defaultEnabled === true : null;
    var registrationConfigKey = registration && (registration.configKey || registration.optInConfig);
    var authentication = data && data.authentication && typeof data.authentication === "object" ? data.authentication : null;
    var authSchemes = authentication && Array.isArray(authentication.schemes) ? authentication.schemes : [];
    var localDirect = authentication && authentication.loopbackDirectAccess === true;
    var authRequired = authentication && !localDirect && authSchemes.length > 0;
    var bearerScheme = authSchemes.find(function(scheme) {
      return String(scheme).indexOf("Authorization: Bearer") === 0;
    });
    var tokenScheme = authSchemes.find(function(scheme) {
      return String(scheme).indexOf("X-Autoqueue-Token:") === 0;
    });
    if (localDirect) curl = "curl '" + compactStateUrl + "'";
    else if (bearerScheme) curl = `curl -H "Authorization: Bearer $AUTOQUEUE_TOKEN" \\
  '` + compactStateUrl + "'";
    else if (tokenScheme) curl = `curl -H "X-Autoqueue-Token: $AUTOQUEUE_TOKEN" \\
  '` + compactStateUrl + "'";
    var isolation = props.snap.isolationHealth || { status: "unknown", verified: false, message: "\u9694\u79BB\u7B56\u7565\u5F85\u9A8C\u8BC1" };
    return h3(
      DialogShell,
      {
        variant: "drawer",
        title: "AI / API \u63A5\u5165",
        onClose: props.onClose,
        className: "aq-access-panel",
        renderTitle: function(args) {
          return h3(
            "div",
            { className: "aq-d-hd aq-access-hd" },
            h3("div", null, h3("h3", { id: args.id }, args.title), h3("p", null, "\u5916\u90E8 AI \u7684\u8C03\u7528\u5730\u5740\u3001\u8BA4\u8BC1\u65B9\u5F0F\u548C\u53EF\u7528\u80FD\u529B")),
            h3("button", { className: "aq-d-close", onClick: props.onClose, "aria-label": "\u5173\u95ED\u63A5\u5165\u9762\u677F", dangerouslySetInnerHTML: { __html: iconHtml("close") } })
          );
        }
      },
      h3(
        "div",
        { className: "aq-access-body" },
        capability[0].status === "loading" && h3(
          "section",
          { className: "aq-cap-loading", role: "status" },
          h3("span"),
          h3("span"),
          h3("span"),
          h3("p", null, "\u6B63\u5728\u8BFB\u53D6\u53EF\u7528\u80FD\u529B")
        ),
        capability[0].status === "error" && h3(
          "section",
          { className: "aq-cap-error", role: "alert" },
          h3("strong", null, "Capabilities \u6682\u4E0D\u53EF\u7528"),
          h3("p", null, capability[0].error),
          h3("button", { className: "aq-btn", onClick: function() {
            retry[1](retry[0] + 1);
          } }, "\u91CD\u65B0\u8BFB\u53D6")
        ),
        capability[0].status === "ready" && h3(
          window.__React.Fragment,
          null,
          h3(
            "section",
            { className: "aq-access-intro" },
            h3("span", { className: "aq-security-badge" }, localDirect ? "\u672C\u673A\u76F4\u8FDE" : authRequired ? "\u9700\u8981\u8BA4\u8BC1" : "\u8BA4\u8BC1\u5F85\u786E\u8BA4"),
            h3("h4", null, data.displayName || "\u4EFB\u52A1\u961F\u5217"),
            h3("p", null, aliases.length ? "\u4E5F\u53EF\u4EE5\u53EB\uFF1A" + aliases.join("\u3001") + "\u3002\u5DE5\u5177\u8C03\u7528\u4ECD\u4F7F\u7528 autoqueue_* \u6B63\u5F0F\u540D\u79F0\u3002" : "\u5DE5\u5177\u8C03\u7528\u4F7F\u7528 autoqueue_* \u6B63\u5F0F\u540D\u79F0\u3002"),
            h3("p", { className: "aq-auth-note" }, localDirect ? "\u672C\u673A\u53EF\u76F4\u63A5\u8BBF\u95EE\uFF1B\u8FDC\u7A0B\u8BBF\u95EE\u5FC5\u987B\u643A\u5E26 token\u3002" : authRequired ? "\u8BA4\u8BC1\u65B9\u5F0F\uFF1A" + authSchemes.join("\uFF1B") : "\u672A\u63D0\u4F9B\u8BA4\u8BC1\u65B9\u5F0F\uFF0C\u8BF7\u68C0\u67E5\u90E8\u7F72\u8BBE\u7F6E\u3002")
          ),
          h3(
            "section",
            { className: "aq-cap-summary", "aria-label": "AI \u63A5\u5165\u6458\u8981" },
            h3(CapabilityFact, { label: "API \u7248\u672C", value: data.apiVersion || "\u672A\u77E5" }),
            h3(CapabilityFact, { label: "AI \u5DE5\u5177", value: tools.length + " \u4E2A" }),
            h3(CapabilityFact, { label: "\u5F53\u524D\u6CE8\u518C", value: hostToolsEnabled === null ? "\u672A\u77E5" : hostToolsEnabled ? "\u5F00\u542F" : "\u5173\u95ED" }),
            h3(CapabilityFact, { label: "\u81EA\u7136\u8BED\u8A00\u522B\u79F0", value: aliases.length ? aliases.join("\u3001") : "\u672A\u58F0\u660E" })
          ),
          registration && h3("p", { className: "aq-cap-optin" }, registration.defaultEnabled ? hostToolsEnabled ? h3(window.__React.Fragment, null, "\u9ED8\u8BA4\u81EA\u52A8\u6CE8\u5165\uFF1B\u5982\u9700\u5173\u95ED\uFF0C\u8BF7\u8BBE\u7F6E ", h3("code", null, (registrationConfigKey || "enableHostAiTools") + ": false"), "\u3002") : h3(window.__React.Fragment, null, "\u5F53\u524D\u5DF2\u901A\u8FC7 ", h3("code", null, (registrationConfigKey || "enableHostAiTools") + ": false"), " \u5173\u95ED\u81EA\u52A8\u6CE8\u5165\u3002") : h3(window.__React.Fragment, null, "AI \u5DE5\u5177\u542F\u7528\u9879\uFF1A", h3("code", null, registrationConfigKey || "\u672A\u58F0\u660E"))),
          h3(
            "section",
            { className: "aq-cap-section" },
            h3("h4", null, "\u6838\u5FC3\u80FD\u529B"),
            h3("div", { className: "aq-cap-tags" }, Object.keys(features).filter(function(key) {
              return features[key] === true || Array.isArray(features[key]);
            }).map(function(key) {
              return h3("span", { key }, capabilityLabel(key), Array.isArray(features[key]) ? "\uFF1A" + formatFeatureValues(features[key]) : "");
            }))
          ),
          h3(
            "section",
            { className: "aq-cap-section" },
            h3("h4", null, "\u8D44\u6E90\u4E0E\u9650\u5236"),
            h3(
              "div",
              { className: "aq-cap-columns" },
              h3(CapabilityList, { title: "\u8D44\u6E90", values: resources }),
              h3(CapabilityList, { title: "\u9650\u5236", values: limits })
            )
          ),
          h3(
            "section",
            { className: "aq-cap-isolation " + isolation.status },
            h3(
              "div",
              null,
              h3("strong", null, isolation.verified ? "\u9694\u79BB\u8BBE\u7F6E\u5DF2\u786E\u8BA4" : "\u9694\u79BB\u8BBE\u7F6E\u5F85\u786E\u8BA4"),
              h3("p", null, isolation.message)
            ),
            h3(
              "dl",
              null,
              h3("div", null, h3("dt", null, "\u4F1A\u8BDD\u9694\u79BB"), h3("dd", null, isolationSettingLabel("sandbox", features.sessionSandboxMode))),
              h3("div", null, h3("dt", null, "\u5BA1\u6279\u65B9\u5F0F"), h3("dd", null, isolationSettingLabel("approval", features.sessionApprovalPolicy))),
              h3("div", null, h3("dt", null, "\u524D\u53F0\u4F18\u5148"), h3("dd", null, features.foregroundPreemption === true ? "\u5F00\u542F" : "\u672A\u58F0\u660E")),
              h3("div", null, h3("dt", null, "\u7981\u6B62\u8986\u76D6"), h3("dd", null, isolation.locks ? isolation.locks.map(isolationLockLabel).join(" / ") : "\u5F85\u786E\u8BA4"))
            )
          ),
          h3(
            "details",
            { className: "aq-tool-catalog" },
            h3("summary", null, "\u67E5\u770B " + tools.length + " \u4E2A\u5DE5\u5177\u6B63\u5F0F\u540D\u79F0"),
            h3("div", null, tools.map(function(name) {
              return h3("code", { key: name }, name);
            }))
          )
        ),
        h3(EndpointCard, { label: "Capabilities", value: discoveryBase + "/capabilities", onCopy: copy }),
        h3(EndpointCard, { label: "OpenAPI 3.1", value: discoveryBase + "/openapi.json", onCopy: copy }),
        h3(
          "section",
          { className: "aq-code-block" },
          h3("div", null, h3("strong", null, "\u5FEB\u901F\u9A8C\u8BC1"), h3("button", { onClick: function() {
            copy(curl, "curl ");
          } }, "\u590D\u5236")),
          h3("pre", null, curl)
        ),
        h3("p", { className: "aq-access-note" }, "\u5916\u90E8 AI \u5EFA\u8BAE\u5148\u8BFB\u53D6 Capabilities \u548C OpenAPI\uFF0C\u518D\u8BFB\u53D6\u7CBE\u7B80\u72B6\u6001\u3002\u9875\u9762\u4E0D\u4F1A\u663E\u793A token\uFF0C\u4E5F\u4E0D\u5141\u8BB8\u8986\u76D6 DSH \u7684\u6A21\u578B\u3001\u5DE5\u4F5C\u533A\u6216\u9884\u8BBE\u3002")
      )
    );
  }
  function CapabilityFact(props) {
    return h3("div", null, h3("span", null, props.label), h3("strong", null, props.value));
  }
  function CapabilityList(props) {
    var keys = Object.keys(props.values || {});
    return h3(
      "div",
      { className: "aq-cap-list" },
      h3("strong", null, props.title),
      keys.length ? keys.map(function(key) {
        return h3("div", { key }, h3("span", null, capabilityEntryLabel(key)), h3("code", null, formatCapabilityValue(props.values[key])));
      }) : h3("p", null, "\u672A\u58F0\u660E")
    );
  }
  function formatCapabilityValue(value) {
    if (Array.isArray(value)) return value.join(" / ");
    if (value === true) return "\u662F";
    if (value === false) return "\u5426";
    return String(value == null ? "\u672A\u77E5" : value);
  }
  function capabilityEntryLabel(key) {
    var labels = {
      state: "\u961F\u5217\u72B6\u6001",
      task: "\u4EFB\u52A1",
      action: "\u4EFB\u52A1\u64CD\u4F5C",
      detail: "\u4EFB\u52A1\u8BE6\u60C5",
      options: "\u53EF\u9009\u9879",
      config: "\u8FD0\u884C\u8BBE\u7F6E",
      markRead: "\u5DF2\u8BFB\u72B6\u6001",
      events: "\u5B9E\u65F6\u4E8B\u4EF6",
      taskContentBytes: "\u5355\u4EFB\u52A1\u5185\u5BB9\u4E0A\u9650",
      taskKeyCharacters: "\u4EFB\u52A1\u6807\u8BC6\u957F\u5EA6",
      requestIdCharacters: "\u8BF7\u6C42\u6807\u8BC6\u957F\u5EA6",
      batchArchiveTasks: "\u5355\u6B21\u6279\u91CF\u5F52\u6863",
      maxConcurrent: "\u6700\u5927\u5E76\u53D1",
      sseConnections: "\u5B9E\u65F6\u8FDE\u63A5\u6570"
    };
    return labels[key] || key;
  }
  function formatFeatureValues(values) {
    var labels = {
      immediate: "\u7ACB\u5373\u6267\u884C",
      schedule: "\u5B9A\u65F6\u6267\u884C",
      cron: "\u5FAA\u73AF\u6267\u884C",
      deadline: "\u622A\u6B62\u65F6\u95F4"
    };
    return values.map(function(value) {
      return labels[value] || value;
    }).join(" / ");
  }
  function isolationSettingLabel(kind, value) {
    if (!value) return "\u672A\u77E5";
    if (kind === "sandbox" && value === "workspace-write") return "\u72EC\u7ACB\u5DE5\u4F5C\u76EE\u5F55\uFF08workspace-write\uFF09";
    if (kind === "approval" && value === "never") return "\u65E0\u9700\u4EBA\u5DE5\u5BA1\u6279\uFF08never\uFF09";
    return value;
  }
  function isolationLockLabel(value) {
    var labels = { workspace: "\u5DE5\u4F5C\u533A", agentPreset: "\u4EFB\u52A1\u9884\u8BBE", model: "\u6A21\u578B" };
    return labels[value] || value;
  }
  function capabilityLabel(key) {
    var labels = {
      unattendedExecution: "\u65E0\u4EBA\u503C\u5B88\u6267\u884C",
      markdownInbox: "Markdown \u6536\u4EF6\u7BB1",
      scheduling: "\u8C03\u5EA6",
      antiBlock: "\u81EA\u52A8\u6062\u590D",
      retries: "\u5931\u8D25\u91CD\u8BD5",
      webhook: "Webhook",
      serverSentEvents: "SSE \u5B9E\u65F6\u4E8B\u4EF6",
      batchArchive: "\u6279\u91CF\u5F52\u6863",
      readTracking: "\u5DF2\u8BFB\u8FFD\u8E2A",
      externalAiHttpApi: "\u5916\u90E8 AI HTTP",
      strictHostIsolation: "\u4E25\u683C\u5BBF\u4E3B\u9694\u79BB",
      foregroundPreemption: "\u524D\u53F0\u4F18\u5148",
      nativeRuntimeMonitoring: "\u539F\u751F Runtime \u76D1\u63A7",
      hostAiToolsDefaultEnabled: "AI \u5DE5\u5177\u9ED8\u8BA4\u81EA\u52A8\u6CE8\u5165"
    };
    return labels[key] || key;
  }
  function EndpointCard(props) {
    return h3(
      "section",
      { className: "aq-endpoint" },
      h3("span", null, props.label),
      h3("code", null, props.value),
      h3("button", { onClick: function() {
        props.onCopy(props.value, props.label + " ");
      }, "aria-label": "\u590D\u5236 " + props.label }, "\u590D\u5236")
    );
  }

  // client/src/index.jsx
  var PANEL_ATTR = "data-dsh-autoqueue-active";
  var VIEW_ATTR = "data-dsh-autoqueue-view";
  var PANEL_NAME = "autoqueue";
  var ENTRY_SELECTOR = "[data-dsh-autoqueue-entry]";
  var ENTRY_ATTR = "data-dsh-autoqueue-entry";
  var SIDEBAR_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 15 15"/><line x1="5" y1="3" x2="3" y2="5"/><line x1="19" y1="3" x2="21" y2="5"/></svg>';
  var CENTER_COL_SELECTOR = '[data-pane="conversation"], [class*="centerCol"]';
  var ACTIVATE_EVENT = "dsh-panel-activate";
  function mountBoard(controller, transport, React2, reactDomClient, sessions) {
    var root = null;
    var container = null;
    function ensure() {
      if (container) return;
      var column = document.querySelector(CENTER_COL_SELECTOR);
      if (!column) return;
      container = document.createElement("div");
      container.setAttribute(VIEW_ATTR, "");
      container.dataset.dshPlugin = "autoqueue";
      column.appendChild(container);
      root = reactDomClient.createRoot(container);
      root.render(React2.createElement(Workstation, { controller, transport, sessions }));
    }
    function applyActive() {
      var snap = controller.getSnapshot();
      if (snap.boardOpen) {
        var attrs = document.documentElement.getAttributeNames();
        for (var i = 0; i < attrs.length; i++) {
          if (attrs[i].endsWith("-active") && attrs[i] !== PANEL_ATTR) {
            document.documentElement.removeAttribute(attrs[i]);
          }
        }
        document.documentElement.setAttribute(PANEL_ATTR, "");
      } else {
        document.documentElement.removeAttribute(PANEL_ATTR);
      }
    }
    function onOtherActivate(event) {
      if (event.detail !== PANEL_NAME && controller.getSnapshot().boardOpen) {
        controller.closeBoard();
      }
    }
    var SIDEBAR_ROW_SELECTOR = '[class*="sessionRow"], [class*="projectRow"], [class*="searchResultRow"], [class*="searchResultWorkspace"], [class*="newSession"]';
    function onClickSidebarRow(event) {
      if (!controller.getSnapshot().boardOpen) return;
      var target = event.target;
      if (!target) return;
      if (target.closest(SIDEBAR_ROW_SELECTOR)) controller.closeBoard();
    }
    var waitObserver = new MutationObserver(function() {
      ensure();
    });
    waitObserver.observe(document.body, { childList: true, subtree: true });
    var boardUnsub = controller.subscribe(applyActive);
    document.addEventListener(ACTIVATE_EVENT, onOtherActivate);
    document.addEventListener("click", onClickSidebarRow, true);
    ensure();
    var checkInterval = null;
    if (!container) {
      checkInterval = setInterval(function() {
        ensure();
        if (container) clearInterval(checkInterval);
      }, 500);
    }
    return function() {
      if (checkInterval) clearInterval(checkInterval);
      waitObserver.disconnect();
      boardUnsub();
      document.removeEventListener(ACTIVATE_EVENT, onOtherActivate);
      document.removeEventListener("click", onClickSidebarRow, true);
      if (root) root.unmount();
      if (container) container.remove();
    };
  }
  function sidebarRoot() {
    var column = document.querySelector('[data-pane="sidebar"], [class*="sidebarCol"]');
    if (column === null) return void 0;
    return column.querySelector('[class*="logoRow"]') ? column.querySelector('[class*="logoRow"]').parentElement : column.firstElementChild;
  }
  function newSessionButton(rt) {
    var nested = rt.querySelector('button[class*="newSession"]');
    if (nested !== null) return nested;
    for (var i = 0; i < rt.children.length; i++) {
      if (rt.children[i].tagName === "BUTTON") return rt.children[i];
    }
    return void 0;
  }
  function createEntry(controller) {
    var entry = document.createElement("button");
    entry.type = "button";
    entry.setAttribute(ENTRY_ATTR, "");
    entry.setAttribute("data-dsh-plugin", "autoqueue");
    entry.setAttribute("data-dsh-part", "sidebar-entry");
    entry.className = "aq-sidebar-entry";
    entry.setAttribute("aria-label", "AutoQueue \u4EFB\u52A1\u5DE5\u4F5C\u53F0");
    entry.setAttribute("title", "AutoQueue \u4EFB\u52A1\u5DE5\u4F5C\u53F0");
    entry.innerHTML = '<span class="aq-sidebar-icon">' + SIDEBAR_ICON + '</span><span class="aq-sidebar-label">\u4EFB\u52A1\u5DE5\u4F5C\u53F0</span>';
    var syncActive = function() {
      var snap = controller.getSnapshot();
      if (snap.boardOpen) entry.dataset.active = "true";
      else delete entry.dataset.active;
    };
    var unsub = controller.subscribe(syncActive);
    syncActive();
    entry._aqUnsub = unsub;
    entry.addEventListener("click", function() {
      controller.toggleBoard();
    });
    return entry;
  }
  function placeEntry(rt, entry) {
    var button = newSessionButton(rt);
    if (button === void 0) return false;
    if (entry.parentElement !== rt) {
      var row = button.closest('[class*="logoRow"]');
      var base = row !== null && row.parentElement === rt ? row : button;
      var family = [];
      for (var i = 0; i < rt.children.length; i++) {
        if (rt.children[i] instanceof HTMLElement && rt.children[i].matches(ENTRY_SELECTOR + ", [data-dsh-taskboard-entry], [data-dsh-ssh-entry]")) {
          family.push(rt.children[i]);
        }
      }
      var anchor = family.length > 0 ? family[0] : base.nextElementSibling;
      rt.insertBefore(entry, anchor);
    }
    return true;
  }
  function mountSidebarEntry(controller) {
    if (document.querySelector(ENTRY_SELECTOR) !== null) return function() {
    };
    var entry = createEntry(controller);
    var rt = void 0;
    var placed = false;
    var tryPlace = function() {
      if (rt !== void 0 && !rt.isConnected) {
        rootObserver.disconnect();
        rt = void 0;
        placed = false;
      }
      if (placed) {
        if (document.body.contains(entry)) return;
        rootObserver.disconnect();
        rt = void 0;
        placed = false;
      }
      rt = rt || sidebarRoot();
      if (rt === void 0) return;
      placed = placeEntry(rt, entry);
      if (placed) {
        rootObserver.observe(rt, { childList: true, subtree: true });
      }
    };
    var waitObserver = new MutationObserver(function() {
      tryPlace();
    });
    waitObserver.observe(document.body, { childList: true, subtree: true });
    var rootObserver = new MutationObserver(function() {
      if (rt === void 0 || !rt.isConnected) {
        placed = false;
        tryPlace();
        return;
      }
      if (!rt.contains(entry)) placed = placeEntry(rt, entry);
    });
    tryPlace();
    return function() {
      waitObserver.disconnect();
      rootObserver.disconnect();
      if (entry._aqUnsub) entry._aqUnsub();
      entry.remove();
    };
  }
  window.__ModuleLoader__.load({
    id: "@alintever/dsh-plugin-autoqueue",
    factory: function(require2) {
      var previousReact = window.__React;
      var previousReactDOM = window.__ReactDOM;
      window.__React = require2("react");
      window.__ReactDOM = require2("react-dom/client");
      return {
        dispose: function() {
        },
        apply: function(ctx) {
          var sessions = ctx.get("sessions");
          var transport = createTransport();
          var controller = createController(transport);
          var boardDisposer = mountBoard(controller, transport, window.__React, window.__ReactDOM, sessions);
          var styleId = "dsh-autoqueue-styles";
          var ownedStyle = null;
          if (!document.getElementById(styleId)) {
            var style = document.createElement("style");
            style.id = styleId;
            style.textContent = workstation_default;
            document.head.appendChild(style);
            ownedStyle = style;
          }
          var sidebarDisposer = mountSidebarEntry(controller);
          return function() {
            controller.closeBoard();
            boardDisposer();
            sidebarDisposer();
            controller.dispose();
            document.documentElement.removeAttribute(PANEL_ATTR);
            if (ownedStyle && ownedStyle.isConnected) ownedStyle.remove();
            if (previousReact === void 0) delete window.__React;
            else window.__React = previousReact;
            if (previousReactDOM === void 0) delete window.__ReactDOM;
            else window.__ReactDOM = previousReactDOM;
          };
        }
      };
    }
  });
})();
