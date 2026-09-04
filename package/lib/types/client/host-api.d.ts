import type { TaskRecord } from '../core/tasks.ts';
import { type TaskBoardAction, type TaskBoardEventPayload, type TaskBoardSnapshot } from '../protocol.ts';
export interface TaskBoardHostTransport {
    bootstrap(legacy: readonly TaskRecord[]): Promise<TaskBoardSnapshot>;
    state(): Promise<TaskBoardSnapshot>;
    action(action: TaskBoardAction, initiator?: string): Promise<TaskBoardSnapshot>;
    subscribe(listener: (event?: TaskBoardEventPayload) => void): () => void;
}
export declare class HttpTaskBoardHostTransport implements TaskBoardHostTransport {
    private readonly storage;
    constructor(storage?: Pick<Storage, 'getItem' | 'setItem'> | undefined);
    bootstrap(legacy: readonly TaskRecord[]): Promise<TaskBoardSnapshot>;
    state(): Promise<TaskBoardSnapshot>;
    action(action: TaskBoardAction, initiator?: string): Promise<TaskBoardSnapshot>;
    private post;
    private request;
    subscribe(listener: (event?: TaskBoardEventPayload) => void): () => void;
}
