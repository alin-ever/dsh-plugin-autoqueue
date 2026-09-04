import type { TypertGateway } from '@deepseek-ai/dsh-api-gateway';
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/types';
import type { CommandResult } from '@deepseek-ai/dsh-commands/types';
import type { Workspace } from '@deepseek-ai/dsh-workspace/types';
import type { TaskRecord } from './core/tasks.ts';
/** Host services needed to validate a task's workspace before creating a session. */
export interface TaskBoardWorkspaceRegistry {
    list(): readonly Workspace[];
}
interface GatewayRequest {
    namespace: string;
    method: string;
    args: Record<string, unknown>;
    signal?: AbortSignal;
}
interface SessionGateway {
    invoke(request: GatewayRequest): Promise<unknown>;
    stream?(request: GatewayRequest): Promise<AsyncIterable<unknown>>;
}
/** One session-list row consumed by task-board reconciliation. */
export type { SessionSummary };
type ExecutionSessionId = SessionSummary['sessionId'];
export interface SessionCommandDispatcher {
    execute(sessionId: ExecutionSessionId, line: string, signal: AbortSignal): Promise<CommandResult | undefined>;
}
export type ExecutionInspection = {
    outcome: 'pending';
} | {
    outcome: 'succeeded';
} | {
    outcome: 'failed';
    error: string;
} | {
    outcome: 'cancelled';
    error: string;
};
/** A post-create launch failure that still identifies the session to the ledger. */
export declare class SessionLaunchError extends Error {
    readonly sessionId: string;
    constructor(sessionId: string, cause: unknown);
}
/**
 * Compose the execution prompt (issue #6): a continuation card (one carrying
 * a frozen snapshot) has its instruction mandatorily wrapped in a source
 * declaration (freeze instant, source session, unreviewed-content warning)
 * templated by the board, so the picking-up agent stays wary of stored
 * prompt-instruction injection in card text (adversarial scenario c). The
 * wrap composes with the T4 handover preamble: the reference preamble comes
 * first, the provenance wrap then encloses the instruction. Plain tasks (no
 * freeze) keep the bare handover preamble + prompt.
 */
export declare function promptText(task: TaskRecord): string;
export declare class HostExecutionRunner {
    private readonly gateway;
    private readonly commands?;
    private readonly workspaceRegistry?;
    /** Newest scanned event sequence per session with no matching execution end. */
    private readonly scanMemos;
    private readonly unavailableAttempts;
    private readonly unavailableBackoffMs;
    private unsupportedSessionListWarned;
    constructor(gateway: SessionGateway | TypertGateway, commands?: SessionCommandDispatcher | undefined, workspaceRegistry?: TaskBoardWorkspaceRegistry | undefined, unavailableRetry?: {
        attempts?: number;
        backoffMs?: number;
    });
    private invoke;
    private stream;
    launch(task: TaskRecord): Promise<string>;
    listRunning(): Promise<{
        known: true;
        count: number;
        items: SessionSummary[];
    } | {
        known: false;
    }>;
    /** Resolve an execution outcome from the session list and bounded history pages. */
    inspect(sessionId: string, startedAt?: number, sessions?: readonly SessionSummary[]): Promise<ExecutionInspection>;
}
