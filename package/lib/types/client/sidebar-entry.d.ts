/**
 * Sidebar entry injection — package-specific wiring over the shared core.
 *
 * dsh's sidebar shell exposes no slot an external plugin can register into
 * (`sidebar.workspaces` / `sidebar.settings` are single-occupant and already
 * taken), so the entry row is injected between the shell's New Session button
 * and the workspace browser. The DOM injection / self-healing / idempotency
 * logic lives exactly once in shared/client/sidebar-entry-core.ts (synced
 * copy); this wrapper supplies the task-board icon, copy, CSS module, and the
 * board toggle. The row is plain DOM (no React tree); the board view it
 * toggles is a separate React root mounted in the center column
 * (see board-mount.ts).
 */
import type { BoardController } from '../core/controller.ts';
/** Stable data attribute identifying the injected entry row. */
export declare const ENTRY_SELECTOR = "[data-dsh-taskboard-entry]";
/** Locale-change subscription the shared core asks for (ctx.locale.subscribe shape). */
export interface LocaleRefreshSource {
    subscribe(listener: () => void): () => void;
}
/**
 * Mount the sidebar entry, waiting for the shell to render and self-healing
 * on later React re-renders.
 * @param controller - the board controller the entry toggles.
 * @param locale - locale-change source; when given, re-applies the label on
 *   a Language switch (the plain-DOM row otherwise keeps the mount-time copy).
 * @returns disposer removing the entry and its observers.
 */
export declare function mountSidebarEntry(controller: BoardController, locale?: LocaleRefreshSource): () => void;
