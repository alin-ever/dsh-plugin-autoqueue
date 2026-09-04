/**
 * Board view mounting (dsh-task-board wrapper).
 *
 * The single-occupant takeover lifecycle — container injection into the
 * center column, sibling eviction, remount resilience, sidebar click-out —
 * lives exactly once in shared/client/panel-mount-core.ts (synced copy); this
 * wrapper supplies the board tree, view dataset key, CSS module, and the html
 * attribute names. Those names are pinned by board.module.css, skins, and the
 * semantic attributes contract.
 */
import type { BoardController } from '../core/controller.ts';
import type { LocaleRefreshSource } from './sidebar-entry.ts';
/** The injected board container (kept in the DOM, hidden when inactive). */
export declare const BOARD_VIEW_SELECTOR = "[data-dsh-taskboard-view]";
/**
 * Mount the board React tree into the center column and bind its visibility
 * to the controller's boardOpen state.
 * @param controller - the board controller driving the view.
 * @param locale - locale-change source; when given, re-renders a mounted board
 *   on a Language switch.
 * @returns disposer unmounting the tree and restoring the column.
 */
export declare function mountBoard(controller: BoardController, locale?: LocaleRefreshSource): () => void;
