/**
 * autoqueue 客户端插件 — 看板 UI
 * 注册侧边栏入口 + 看板面板，通过 HTTP 与 Host 通信
 * 对齐 task-board client/index.ts 的挂载模式
 * @module autoqueue/client
 */
window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-plugin-autoqueue',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    const React = require('react');
    const react_dom_client = require('react-dom/client');

    const API_PREFIX = '/api/queue';
    const POLL_INTERVAL_MS = 5000;
    const PANEL_ATTR = 'data-dsh-autoqueue-active';
    const VIEW_ATTR = 'data-dsh-autoqueue-view';
    const ENTRY_ATTR = 'data-dsh-autoqueue-entry';

    const STATUS_CONFIG = {
      pending:   { label: '待执行',   color: '#6b7280', dot: '○' },
      running:   { label: '执行中',   color: '#3b82f6', dot: '◉' },
      done:      { label: '已完成',   color: '#10b981', dot: '●' },
      failed:    { label: '已失败',   color: '#ef4444', dot: '✕' },
      stopped:   { label: '已停止',   color: '#f59e0b', dot: '⊘' },
      interrupted:{label: '已中断',   color: '#8b5cf6', dot: '⚠' },
    };

    const QUEUE_CSS = `
      [data-dsh-autoqueue-view] {
        position: absolute; inset: 0; z-index: 10;
        background: var(--bg-primary, #fff); overflow-y: auto;
        display: none; flex-direction: column;
        font-family: system-ui, -apple-system, sans-serif;
      }
      [data-dsh-autoqueue-active] [data-dsh-autoqueue-view] { display: flex; }
      [data-dsh-autoqueue-active] [data-pane="conversation"] > *:not([data-dsh-autoqueue-view]) { display: none !important; }

      .aq-header {
        display: flex; align-items: center; gap: 12px;
        padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e5e7eb);
        position: sticky; top: 0; background: var(--bg-primary, #fff); z-index: 2;
      }
      .aq-header h2 { margin: 0; font-size: 18px; font-weight: 600; flex: 1; }
      .aq-back {
        border: none; background: none; cursor: pointer; font-size: 20px;
        color: var(--text-secondary, #6b7280); padding: 4px 8px; border-radius: 6px;
      }
      .aq-back:hover { background: var(--hover-bg, #f3f4f6); }
      .aq-btn {
        padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500;
        cursor: pointer; border: 1px solid var(--border-color, #d1d5db);
        background: var(--bg-primary, #fff); color: var(--text-primary, #111827);
      }
      .aq-btn:hover { background: var(--hover-bg, #f3f4f6); }
      .aq-btn.primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
      .aq-btn.primary:hover { background: #2563eb; }
      .aq-btn.danger { color: #ef4444; border-color: #ef4444; }
      .aq-btn.danger:hover { background: #fef2f2; }

      .aq-stats {
        display: flex; gap: 8px; padding: 12px 20px;
        border-bottom: 1px solid var(--border-color, #e5e7eb);
        flex-wrap: wrap;
      }
      .aq-stat {
        padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;
        background: var(--hover-bg, #f3f4f6); cursor: pointer;
        border: 1px solid transparent;
      }
      .aq-stat.active { border-color: #3b82f6; }

      .aq-tasks { padding: 12px 20px; flex: 1; }
      .aq-card {
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 8px; padding: 14px 16px; margin-bottom: 10px;
        display: flex; align-items: center; gap: 12px;
        transition: box-shadow 0.15s;
      }
      .aq-card:hover { box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
      .aq-card-status {
        width: 10px; height: 10px; border-radius: 50%;
        flex-shrink: 0;
      }
      .aq-card-body { flex: 1; min-width: 0; }
      .aq-card-title {
        font-size: 14px; font-weight: 500; color: var(--text-primary, #111827);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .aq-card-sub {
        font-size: 12px; color: var(--text-secondary, #6b7280); margin-top: 2px;
      }
      .aq-card-actions { display: flex; gap: 6px; flex-shrink: 0; }

      .aq-empty {
        text-align: center; padding: 60px 20px; color: var(--text-secondary, #6b7280);
        font-size: 14px;
      }

      .aq-modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100;
        display: flex; align-items: center; justify-content: center;
      }
      .aq-modal {
        background: var(--bg-primary, #fff); border-radius: 12px; padding: 24px;
        width: 90%; max-width: 500px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      }
      .aq-modal h3 { margin: 0 0 16px; font-size: 18px; }
      .aq-modal label { font-size: 13px; color: var(--text-secondary, #6b7280); display: block; margin-bottom: 4px; }
      .aq-modal input, .aq-modal textarea, .aq-modal select {
        width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #d1d5db);
        border-radius: 6px; font-size: 14px; margin-bottom: 12px; box-sizing: border-box;
      }
      .aq-modal textarea { min-height: 120px; resize: vertical; font-family: monospace; }
      .aq-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }

      .aq-detail-panel {
        padding: 16px 20px; border-top: 1px solid var(--border-color, #e5e7eb);
        background: var(--bg-secondary, #f9fafb);
      }
      .aq-detail-panel pre {
        font-size: 12px; white-space: pre-wrap; word-break: break-word;
        max-height: 200px; overflow-y: auto; margin: 8px 0;
        background: var(--bg-primary, #fff); padding: 12px; border-radius: 6px;
        border: 1px solid var(--border-color, #e5e7eb);
      }
    `;

    function e(tag, props, ...children) {
      const el = document.createElement(tag);
      if (props) Object.assign(el, props);
      for (const child of children) {
        if (child === null || child === undefined) continue;
        if (typeof child === 'string') el.appendChild(document.createTextNode(child));
        else if (typeof child === 'number') el.appendChild(document.createTextNode(String(child)));
        else if (child instanceof HTMLElement) el.appendChild(child);
        else if (Array.isArray(child)) child.forEach(c => e(tag, null, c).forEach ? null : null);
      }
      return el;
    }

    function h(type, props, ...children) {
      return React.createElement(type, props, ...children);
    }

    function mountSidebarEntry(dashboard) {
      // Will be implemented when UI is ready
      return () => {};
    }

    function mountDashboard() {
      return { dispose: () => {} };
    }

    const inject = ['slots'];

    function apply(ctx) {
      // 注入 CSS
      const style = document.createElement('style');
      style.textContent = QUEUE_CSS;
      document.head.appendChild(style);

      const dashboard = mountDashboard();

      // 通过 slots 注册侧边栏入口（UI 未就绪时隐藏）
      let slotDisposer = null;
      // try {
      //   slotDisposer = ctx.slots.register({
      //     name: 'sidebar.footer.action',
      //     id: 'autoqueue',
      //     order: 50,
      //     label: '任务队列',
      //   }, function SidebarEntry() {
      //     React.useEffect(() => {
      //       const dispose = mountSidebarEntry(dashboard);
      //       return dispose;
      //     }, []);
      //     return null;
      //   });
      // } catch (err) {
      //   console.error('[autoqueue] slot registration failed, using DOM injection', err);
      //   const dispose = mountSidebarEntry(dashboard);
      //   slotDisposer = { dispose };
      // }

      ctx.effect(() => {
        return () => {
          style.remove();
          dashboard.dispose();
          if (slotDisposer) {
            if (typeof slotDisposer === 'function') slotDisposer();
            else if (slotDisposer?.dispose) slotDisposer.dispose();
          }
        };
      }, 'autoqueue: client cleanup');
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});