/**
 * Center-column panel takeover lifecycle.
 *
 * The `conversation` slot is single-occupant (ui-conversation) and external
 * plugins cannot declare slots, so a family panel takes over the center
 * column at the DOM level: a container is appended inside the center column
 * (`[class*="centerCol"]`, the 0.1.0-rc.6+ AppFrame layout; previously
 * `[data-pane="conversation"]` on older shells — the mount selector keeps
 * both, ssh #243 / task-board #107) as an extra trailing child React never
 * manages, and a stylesheet rule hides the conversation content while the
 * panel is active. Toggling is a data attribute on <html> — no React
 * involvement, so the conversation subtree underneath stays mounted and
 * stateful.
 *
 * Consuming plugins keep a thin wrapper that supplies the panel tree,
 * container attribute names, and stylesheet class; those names are pinned by
 * each package's CSS, skins, and the semantic-attributes contract. The
 * sidebar row toggling the panel shares its core the same way
 * (shared/client/sidebar-entry-core.ts, synced copy).
 */
import { type Root } from 'react-dom/client';
/** Options for mountCenterPanel; dsh-ssh mount.tsx and dsh-task-board board-mount.tsx are the canonical consumers. */
export interface CenterPanelMountOptions {
    /** Render the panel React tree into a root (initial mount, remount, locale refresh). */
    render: (root: Root) => void;
    /** dataset key of the injected container's view attribute, e.g. `dshSshView` for `data-dsh-ssh-view`. */
    viewDatasetKey: string;
    /** value of the container's L2 `data-dsh-plugin` semantic attribute. */
    pluginName: string;
    /** stylesheet class applied to the injected container. */
    viewClassName: string;
    /** <html> attribute set while this panel is active. */
    activeAttribute: string;
    /** the sibling panel's active attribute, removed from <html> when this panel opens. */
    siblingActiveAttribute: string;
    /** detail value this panel broadcasts on the cross-plugin activation event. */
    panelName: string;
    /** sibling detail value whose activation closes this panel. */
    siblingPanelName: string;
    /** open flag of the owning controller. */
    isOpen: () => boolean;
    /** close the panel, handing the center column back to the conversation. */
    close: () => void;
    /** subscribe to the owning controller's open-state changes; returns an unsubscriber. */
    subscribe: (listener: () => void) => () => void;
    /** locale-change source; when given, re-renders an open panel on a Language switch. */
    locale?: {
        subscribe(listener: () => void): () => void;
    };
}
/**
 * Mount a family panel into the center column and bind its visibility to the
 * owning controller's open state.
 * @returns disposer unmounting the tree and restoring the column.
 */
export declare function mountCenterPanel(options: CenterPanelMountOptions): () => void;
