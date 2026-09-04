/**
 * Shared sidebar entry injection core.
 *
 * dsh's sidebar shell exposes no slot an external plugin can register into,
 * so the entry row is injected between the shell's New Session button and the
 * workspace browser. The injection self-heals: a MutationObserver watches the
 * sidebar root and re-inserts the row whenever a React re-render displaces it
 * (re-insertion happens in the same frame, before paint, so no flicker).
 *
 * The row is plain DOM (no React tree) so it can never disturb the shell's
 * reconciliation; the view it toggles is a separate root owned by the caller.
 *
 * Packages receive this file as a generated copy via scripts/sync-shared.mjs;
 * edit the shared source and re-run the sync instead of editing a copy.
 */
/** Per-package configuration for one sidebar entry row. */
export interface SidebarEntryOptions {
    /** Full attribute name identifying the injected row (idempotency key), e.g. 'data-dsh-ssh-entry'. */
    rowAttribute: string;
    /** CSS selector matching the injected row, e.g. '[data-dsh-ssh-entry]'. */
    rowSelector: string;
    /**
     * L2 semantic-attribute plugin id (issue #506, enum table:
     * skins/skin-center/contracts/semantic-attrs-v1.md). When set, the row also
     * outputs data-dsh-plugin="<id>" and data-dsh-part="sidebar-entry"; unset
     * leaves the row without semantic attributes.
     */
    plugin?: string;
    /** Inline icon markup (matches the shell's 16px nav-icon look). */
    icon: string;
    /** CSS module class names for the row and its two spans (entry / entryIcon / entryLabel). */
    css: Record<string, string>;
    /** Localized row label (aria-label + visible text). */
    label(): string;
    /** Optional localized tooltip (title attribute). */
    tooltip?(): string;
    /**
     * Optional locale-change subscription: re-applies label / aria-label /
     * tooltip whenever the active locale changes. Plain-DOM rows would
     * otherwise keep the label captured at mount; pass the SDK locale runtime
     * subscription (ctx.locale.subscribe) so the row follows the language
     * switch without a reload.
     */
    refresh?: {
        subscribe(listener: () => void): () => void;
    };
    /** Click action (open/toggle the owning panel). */
    onToggle(): void;
    /** Family-block position: 'before' inserts ahead of sibling plugin rows, 'after' behind them. */
    position: 'before' | 'after';
    /**
     * Selectors of the sibling plugin entry rows this package orders against
     * (its own row included — the placement guard excludes a row that is
     * already inside the root). Each package passes the same list it used
     * before the consolidation so the rendered order stays stable.
     */
    familySelectors: readonly string[];
    /** Optional active-state bridge; highlights the row while the panel is open. */
    active?: {
        subscribe(listener: () => void): () => void;
        isOpen(): boolean;
    };
}
/**
 * Mount the sidebar entry, waiting for the shell to render and self-healing
 * on later React re-renders.
 * @param options - the row's attribute/icon/copy/action/ordering configuration.
 * @returns disposer removing the entry and its observers.
 */
export declare function mountSidebarEntry(options: SidebarEntryOptions): () => void;
