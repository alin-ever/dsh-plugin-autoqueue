import type { TaskRecord } from '../../core/tasks.ts';
/** Compact relative/absolute time label. */
export declare function formatHostTimestamp(ms: number, timeZone?: string): string;
export declare function formatTime(ms: number, timeZone?: string): string;
declare function TaskCardInner({ task, pending, timeZone, onClick }: {
    task: TaskRecord;
    pending: boolean;
    timeZone?: string;
    onClick: () => void;
}): import("react").JSX.Element;
/** Memoized card: re-renders only when the card's own task record changes. */
export declare const TaskCard: import("react").MemoExoticComponent<typeof TaskCardInner>;
export {};
