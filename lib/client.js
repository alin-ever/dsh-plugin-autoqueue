/**
 * autoqueue 客户端插件 — 看板 UI
 * 注册侧边栏入口 + 看板面板，通过 HTTP 与 Host 通信
 * 侧边栏入口通过 Cordis Slot 系统（sidebar.footer.action）注册
 * Dashboard 面板保留 DOM 注入（无合适 Slot 用于全屏替换视图）
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

    // ─── 常量 ─────────────────────────────────────────────

    const API_PREFIX = '/api/queue';
    const POLL_INTERVAL_MS = 5000;
    const PANEL_ATTR = 'data-dsh-autoqueue-active';
    const VIEW_ATTR = 'data-dsh-autoqueue-view';

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
        width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
      }
      .aq-card-body { flex: 1; min-width: 0; }
      .aq-card-key { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
      .aq-card-meta { font-size: 12px; color: var(--text-secondary, #6b7280); }
      .aq-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
      .aq-card-actions .aq-btn { font-size: 11px; padding: 3px 8px; }

      .aq-modal-overlay {
        position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
      }
      .aq-modal {
        background: var(--bg-primary, #fff); border-radius: 12px;
        padding: 24px; width: 480px; max-width: 90vw; box-shadow: 0 8px 30px rgba(0,0,0,0.15);
      }
      .aq-modal h3 { margin: 0 0 16px; font-size: 16px; }
      .aq-modal label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
      .aq-modal input, .aq-modal textarea {
        width: 100%; padding: 8px 12px; border: 1px solid var(--border-color, #d1d5db);
        border-radius: 6px; font-size: 13px; margin-bottom: 12px; box-sizing: border-box;
        font-family: inherit;
      }
      .aq-modal textarea { resize: vertical; min-height: 120px; }
      .aq-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }

      .aq-empty { text-align: center; padding: 40px; color: var(--text-secondary, #9ca3af); }

      .aq-concurrency {
        display: flex; align-items: center; gap: 8px; font-size: 12px;
        color: var(--text-secondary, #6b7280); margin-left: auto;
      }
      .aq-concurrency input {
        width: 48px; padding: 4px 6px; border: 1px solid var(--border-color, #d1d5db);
        border-radius: 4px; font-size: 12px; text-align: center;
      }
    `;

    // ─── 辅助函数 ─────────────────────────────────────────

    function e(tag, props, ...children) {
      return React.createElement(tag, props, ...children);
    }

    function cls(...args) { return args.filter(Boolean).join(' '); }

    function uuid() {
      return globalThis.crypto?.randomUUID?.() ?? `browser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }

    async function apiFetch(path, options = {}) {
      const res = await fetch(API_PREFIX + path, {
        headers: { 'content-type': 'application/json', ...options.headers },
        ...options,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
      }
      return res.json();
    }

    function timeAgo(iso) {
      if (!iso) return '';
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return '刚刚';
      if (mins < 60) return `${mins} 分钟前`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours} 小时前`;
      return `${Math.floor(hours / 24)} 天前`;
    }

    // ─── 组件 ─────────────────────────────────────────────

    /** 新建任务弹窗 */
    function NewTaskModal({ onClose, onCreated }) {
      const [key, setKey] = React.useState('');
      const [content, setContent] = React.useState('');
      const [error, setError] = React.useState('');
      const [submitting, setSubmitting] = React.useState(false);

      async function handleSubmit(ev) {
        ev.preventDefault();
        if (!key.trim() || !content.trim()) {
          setError('请填写任务标识和内容');
          return;
        }
        setSubmitting(true);
        setError('');
        try {
          await apiFetch('/task', {
            method: 'POST',
            body: JSON.stringify({
              requestId: uuid(),
              key: key.trim(),
              content: content.trim(),
            }),
          });
          onCreated();
          onClose();
        } catch (err) {
          setError(err.message);
        } finally {
          setSubmitting(false);
        }
      }

      return e('div', { className: 'aq-modal-overlay', onClick: (ev) => { if (ev.target === ev.currentTarget) onClose(); } },
        e('div', { className: 'aq-modal' },
          e('h3', null, '新建任务'),
          error && e('div', { style: { color: '#ef4444', fontSize: '13px', marginBottom: '8px' } }, error),
          e('label', null, '任务标识（key）'),
          e('input', { value: key, onChange: (ev) => setKey(ev.target.value), placeholder: '例如: hello-world' }),
          e('label', null, '任务内容（Markdown）'),
          e('textarea', { value: content, onChange: (ev) => setContent(ev.target.value), placeholder: '# 任务标题\n\n任务描述...' }),
          e('div', { className: 'aq-modal-actions' },
            e('button', { className: 'aq-btn', onClick: onClose }, '取消'),
            e('button', { className: 'aq-btn primary', onClick: handleSubmit, disabled: submitting }, submitting ? '提交中...' : '创建'),
          ),
        ),
      );
    }

    /** 任务卡片 */
    function TaskCard({ task, onAction }) {
      const cfg = STATUS_CONFIG[task.status] || { label: task.status, color: '#6b7280', dot: '?' };

      return e('div', { className: 'aq-card' },
        e('span', {
          className: 'aq-card-status',
          style: { background: cfg.color },
          title: cfg.label,
        }),
        e('div', { className: 'aq-card-body' },
          e('div', { className: 'aq-card-key' }, task.key),
          e('div', { className: 'aq-card-meta' },
            cfg.label,
            task.attempts > 0 ? ` · 尝试 ${task.attempts} 次` : '',
            task.blockedResumes > 0 ? ` · 反阻塞 ${task.blockedResumes} 次` : '',
            task.sessionId ? ` · 会话 ${task.sessionId.slice(0, 8)}...` : '',
            task.updatedAt ? ` · ${timeAgo(task.updatedAt)}` : '',
          ),
        ),
        e('div', { className: 'aq-card-actions' },
          task.status === 'running' && e('button', {
            className: 'aq-btn danger',
            onClick: () => onAction('stop', task.key),
          }, '停止'),
          task.status === 'pending' && e('button', {
            className: 'aq-btn danger',
            onClick: () => onAction('delete', task.key),
          }, '删除'),
        ),
      );
    }

    /** 主看板 */
    function Dashboard({ onClose }) {
      const [state, setState] = React.useState(null);
      const [filter, setFilter] = React.useState('all');
      const [showNewTask, setShowNewTask] = React.useState(false);
      const [error, setError] = React.useState('');

      async function loadState() {
        try {
          const data = await apiFetch('/state');
          setState(data);
          setError('');
        } catch (err) {
          setError(err.message);
        }
      }

      React.useEffect(() => {
        loadState();
        const timer = setInterval(loadState, POLL_INTERVAL_MS);
        return () => clearInterval(timer);
      }, []);

      async function handleAction(action, key) {
        try {
          await apiFetch('/action', {
            method: 'POST',
            body: JSON.stringify({ requestId: uuid(), action: { kind: action, key } }),
          });
          await loadState();
        } catch (err) {
          setError(err.message);
        }
      }

      async function handleForceScan() {
        try {
          await apiFetch('/action', {
            method: 'POST',
            body: JSON.stringify({ requestId: uuid(), action: { kind: 'force-scan' } }),
          });
          await loadState();
        } catch (err) {
          setError(err.message);
        }
      }

      const tasks = state?.tasks || [];
      const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
      const counts = {};
      for (const t of tasks) {
        counts[t.status] = (counts[t.status] || 0) + 1;
      }

      return e('div', { 'data-dsh-autoqueue-view': '' },
        e('div', { className: 'aq-header' },
          e('button', { className: 'aq-back', onClick: onClose, 'aria-label': '关闭' }, '‹'),
          e('h2', null, '任务队列'),
          e('span', { className: 'aq-concurrency' },
            '并发: ',
            state?.config?.maxConcurrent ?? 1,
          ),
          e('button', { className: 'aq-btn', onClick: handleForceScan }, '立即扫描'),
          e('button', { className: 'aq-btn primary', onClick: () => setShowNewTask(true) }, '+ 新建任务'),
        ),
        error && e('div', {
          style: { padding: '8px 20px', color: '#ef4444', fontSize: '13px', background: '#fef2f2' },
        }, error),
        e('div', { className: 'aq-stats' },
          e('span', {
            className: cls('aq-stat', filter === 'all' && 'active'),
            onClick: () => setFilter('all'),
          }, `全部 (${tasks.length})`),
          ...Object.entries(STATUS_CONFIG).map(([status, cfg]) =>
            (counts[status] || 0) > 0 && e('span', {
              className: cls('aq-stat', filter === status && 'active'),
              onClick: () => setFilter(status),
              style: filter === status ? { borderColor: cfg.color } : {},
            }, `${cfg.label} (${counts[status]})`),
          ),
        ),
        e('div', { className: 'aq-tasks' },
          filtered.length === 0 && e('div', { className: 'aq-empty' }, '没有任务'),
          filtered.map(task => e(TaskCard, { key: task.key, task, onAction: handleAction })),
        ),
        showNewTask && e(NewTaskModal, {
          onClose: () => setShowNewTask(false),
          onCreated: loadState,
        }),
      );
    }

    // ─── 挂载 Dashboard（DOM 注入，因无合适 Slot 用于全屏替换视图）───

    const CENTER_COL_SELECTOR = '[data-pane="conversation"], [class*="centerCol"]';

    function mountDashboard() {
      let root = null;
      let container = null;

      function ensure() {
        if (container) return;
        const column = document.querySelector(CENTER_COL_SELECTOR);
        if (!column) return;
        container = document.createElement('div');
        container.setAttribute(VIEW_ATTR, '');
        column.appendChild(container);
        root = react_dom_client.createRoot(container);
        root.render(e(Dashboard, { onClose: closePanel }));
      }

      function closePanel() {
        document.documentElement.removeAttribute(PANEL_ATTR);
      }

      function openPanel() {
        ensure();
        document.documentElement.setAttribute(PANEL_ATTR, '');
      }

      // 等待 center column 出现
      const observer = new MutationObserver(() => { ensure(); });
      observer.observe(document.body, { childList: true, subtree: true });

      return {
        open: openPanel,
        close: closePanel,
        dispose() {
          observer.disconnect();
          document.documentElement.removeAttribute(PANEL_ATTR);
          root?.unmount();
          container?.remove();
        },
      };
    }

    // ─── 侧边栏入口组件 ─────────────────────────────────

    const SIDEBAR_ICON = '<svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1.5" y="2" width="13" height="12" rx="1.5"/><line x1="5" y1="5.5" x2="11" y2="5.5"/><line x1="5" y1="8" x2="9" y2="8"/><line x1="5" y1="10.5" x2="7" y2="10.5"/></svg>';

    /** 侧边栏入口组件 — 通过 Slot 系统注册 */
    function SidebarEntry({ dashboard, wide }) {
      return React.createElement('button', {
        onClick: () => dashboard.open(),
        title: '任务队列',
        'aria-label': '任务队列',
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: wide ? '8px' : '0',
          justifyContent: wide ? 'flex-start' : 'center',
          width: '100%',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          padding: '8px 12px',
          color: 'inherit',
          fontSize: 'inherit',
          fontFamily: 'inherit',
        },
        dangerouslySetInnerHTML: wide
          ? { __html: `${SIDEBAR_ICON}<span>队列</span>` }
          : { __html: SIDEBAR_ICON },
      });
    }

    // ─── apply ────────────────────────────────────────────

    function apply(ctx) {
      // 注入 CSS
      const style = document.createElement('style');
      style.textContent = QUEUE_CSS;
      document.head.appendChild(style);

      const dashboard = mountDashboard();

      // 通过 Slot 系统注册侧边栏入口
      // 使用 ctx.get('slots') 而非 inject，保持可选的依赖关系
      const slots = ctx.get('slots');
      if (slots !== undefined) {
        slots.inject('sidebar.footer.action', () => slots.register(
          { name: 'sidebar.footer.action', id: 'autoqueue', order: 50, label: '队列' },
          (props) => React.createElement(SidebarEntry, {
            dashboard,
            wide: props.wide,
          }),
        ));
      }

      ctx.effect(() => {
        return () => {
          style.remove();
          dashboard.dispose();
        };
      }, 'autoqueue: client cleanup');
    }

    exports.apply = apply;
    return module.exports;
  },
});