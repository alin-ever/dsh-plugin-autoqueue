/**
 * Board controller: the single owner of task-ledger state and view state.
 *
 * In production it projects the Host ledger and submits confirmed actions;
 * the legacy store seam remains for v1 migration tests. The board closes
 * only on explicit user navigation, never implicitly on session-list churn.
 * Framework-free (structural runtime faces) so the whole orchestration is
 * unit-testable with fakes.
 *
 * The per use-case domain transitions (create/update/delete/schedule) live in
 * dedicated modules under core/use-cases and are applied here; the controller
 * owns only the orchestration seam (state, persistence, notify, navigation).
 */
import type { TaskStore } from './store.ts';
import { type NewTaskInput, type TaskRecord, type TaskStatus } from './tasks.ts';
import { type TaskUpdatePatch } from './use-cases/task-update.ts';
import type { TaskBoardAction, TaskBoardEventPayload, TaskBoardSnapshot } from '../protocol.ts';
export interface TaskBoardTransport {
    bootstrap(legacy: readonly TaskRecord[]): Promise<TaskBoardSnapshot>;
    state(): Promise<TaskBoardSnapshot>;
    /**
     * Submit one action; the optional initiator is the current DSH session id
     * (issue #6 audit origin), asserted by the client and recorded by the Host.
     */
    action(action: TaskBoardAction, initiator?: string): Promise<TaskBoardSnapshot>;
    subscribe(listener: (event?: TaskBoardEventPayload) => void): () => void;
}
/** The sessions face the controller needs for navigation awareness. */
export interface SessionsControllerFace {
    list: {
        getSnapshot(): {
            current: string | undefined;
        };
        subscribe(fn: () => void): () => void;
    };
    /** Select a session as current (navigates the conversation view). */
    open(id: string): void;
}
/** Controller dependencies (all swappable in tests). */
export interface ControllerDeps {
    store: TaskStore;
    sessions: SessionsControllerFace;
    /** Clock; defaults to Date.now. */
    now?: () => number;
    /** Id minting; defaults to a random-uuid. */
    uuid?: () => string;
    /** Host-authoritative transport; absent keeps the legacy in-memory test path. */
    transport?: TaskBoardTransport;
}
/** One workspace option the execution-target pickers offer. */
export interface ExecutionWorkspaceOption {
    workspaceId: string;
    /** Display label (workspace title; the wiring falls back to the path). */
    title: string;
}
/** One agent-preset option the execution-target pickers offer. */
export interface ExecutionPresetOption {
    id: string;
    name?: string;
    description?: string;
    /** Why this preset cannot compose a session; the pickers disable it. */
    broken?: string;
    isDefault: boolean;
}
/** The execution-target option sets the UI feeds into the controller. */
export interface ExecutionOptionsSnapshot {
    workspaces: readonly ExecutionWorkspaceOption[];
    presets: readonly ExecutionPresetOption[];
}
/** Immutable controller snapshot for UI subscriptions. */
export interface ControllerSnapshot {
    tasks: readonly TaskRecord[];
    boardOpen: boolean;
    /** True when the board shows the archive view instead of the columns. */
    archiveView: boolean;
    selectedTaskId: string | undefined;
    /** Picker option sets (workspace list + agent-preset roster). */
    executionOptions: ExecutionOptionsSnapshot;
    pendingTaskIds: readonly string[];
    transportError?: string;
    host?: Pick<TaskBoardSnapshot, 'revision' | 'scheduler' | 'power' | 'sessionDefaultPermission'>;
}
/** The selected task (resolved from the ledger), or undefined. */
export declare function selectedTaskOf(snapshot: ControllerSnapshot): TaskRecord | undefined;
/**
 * Board controller (see module doc). All mutations bump the snapshot and
 * persist through the store; UI and DOM mounts subscribe and re-render.
 */
export declare class BoardController {
    private readonly deps;
    private tasks;
    private boardOpen;
    private archiveView;
    private selectedTaskId;
    private executionOptions;
    private listeners;
    private disposers;
    private readonly now;
    private readonly uuid;
    private readonly pendingTaskIds;
    private readonly taskQueues;
    private transportError;
    private hostState;
    private remoteSubscribed;
    private remoteInitialization;
    /** @param deps - store and the sessions navigation face. */
    constructor(deps: ControllerDeps);
    /** Load the persisted ledger and start the navigation/status subscriptions. */
    start(): void;
    /** Stop all subscriptions and drop retained state (idempotent). */
    dispose(): void;
    getSnapshot(): ControllerSnapshot;
    subscribe(fn: () => void): () => void;
    /** Whether production mutations are confirmed by the Host transport. */
    isHostBacked(): boolean;
    /** Retry initial migration/state synchronization after an explicit Host error. */
    retryHostSync(): Promise<boolean>;
    openBoard(): void;
    closeBoard(): void;
    toggleBoard(): void;
    /**
     * Switch between the kanban columns and the archive view. Leaving the
     * archive view with an archived task still selected closes the selection —
     * the detail overlay must not linger over a task that is off-board.
     */
    toggleArchiveView(): void;
    openTask(id: string): void;
    closeTask(): void;
    createTask(input: NewTaskInput): TaskRecord | undefined;
    /** Create through the Host and expose the task only after confirmation. */
    createTaskConfirmed(input: NewTaskInput): Promise<TaskRecord | undefined>;
    /**
     * Apply an editable-field patch (task content + execution targets).
     * Host-backed: the Host ledger owns the fail-closed checks (the content of
     * an executed task is read-only) and confirms the mutation, so the resolved
     * value reflects whether the Host accepted it; the legacy in-memory path
     * applies and persists synchronously.
     * @returns true when the patch was accepted by the authority.
     */
    updateTask(id: string, patch: TaskUpdatePatch): Promise<boolean>;
    /**
     * Replace (a part of) the picker option sets the UI feeds (workspace list
     * and agent-preset roster come from the runtime, not the ledger).
     */
    setExecutionOptions(patch: Partial<ExecutionOptionsSnapshot>): void;
    moveTask(id: string, status: TaskStatus): void;
    deleteTask(id: string): void;
    /**
     * Archive a settled task (done/failed). Running or on-board-unsettled
     * tasks are refused so the runner keeps exclusive ownership of their
     * lifecycle.
     * @returns true when applied.
     */
    archiveTask(id: string): boolean;
    /** Restore an archived task back onto the board (same status column). */
    restoreTask(id: string): boolean;
    /**
     * Update a task's schedule rule. A blank or invalid cron expression is
     * rejected (returns false, state untouched). When the rule ends up enabled
     * the next run instant is computed immediately; a disabled rule carries no
     * next-run instant. Delegates the domain transition to the schedule use case.
     * @param id - the task to schedule.
     * @param patch - fields to change (absent fields keep their current value).
     * @returns true when applied, false when rejected (invalid cron / unknown task).
     */
    setSchedule(id: string, patch: {
        enabled?: boolean;
        cron?: string;
    }): boolean;
    /**
     * Legacy pure-controller seam retained for migration-focused tests. The
     * production browser never rolls schedules; the Host ledger owns them.
     */
    applyScheduleNextRun(id: string, nextRunAt: number | undefined, lastTriggeredAt: number | undefined): void;
    /**
     * Reload the legacy v1 store without notifying subscribers. Production v2
     * reads Host snapshots instead; this remains only for isolated legacy tests.
     */
    reloadFromStore(): void;
    /**
     * Jump to an execution's session transcript. Selecting the session changes
     * `current`, which closes the board (the conversation view takes over).
     * @param sessionId - the execution session to open.
     */
    openSession(sessionId: string): void;
    /**
     * Request a Host execution for a task: the Host ledger owns the running
     * transition, the execution record, and the settlement. A second call
     * while the task is already running is ignored; without a Host transport
     * the run is refused (returns false).
     */
    runTask(id: string): Promise<boolean>;
    /**
     * Confirm a card's above-default permission binding through the Host
     * (resolves the pending-confirmation transaction; no-op otherwise).
     */
    confirmPermission(id: string): Promise<boolean>;
    /** Re-run a settled task through the Host (the Host replans and executes). */
    rerunTask(id: string): Promise<void>;
    /**
     * Session-list notifications fire for all kinds of incidental churn
     * (background navigation, the Host runner creating and selecting a fresh
     * execution session, settlement, other plugins), so closing on `current`
     * changes would evict the board without the user asking. The board closes
     * only on explicit user navigation: a sidebar session/workspace row click
     * (board-mount onClickSidebarRow) or the board's own actions
     * (openSession / close). Keeping the hook preserves the subscription
     * contract for future listeners.
     */
    private onSessionsChanged;
    private persistAndNotify;
    private commitRemote;
    private performRemote;
    private initializeRemote;
    private doInitializeRemote;
    /**
     * SSE frames carry revision/scheduler/power. When the revision matches the
     * one already applied, apply the frame's scheduler/power in place and skip
     * the full /state fetch; otherwise the 5 s heartbeat would re-clone and
     * re-serialize the whole ledger per tab even while nothing changes.
     */
    private onRemoteEvent;
    private refreshRemote;
    private acceptRemote;
    private notify;
}
