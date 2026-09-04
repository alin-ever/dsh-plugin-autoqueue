import { type BoardController } from '../../core/controller.ts';
import { type TaskRecord } from '../../core/tasks.ts';
/** Case-insensitive title/description/freeze-snapshot match. */
export declare function matchesFilter(task: TaskRecord, filter: string): boolean;
/** Board component; subscribes to the controller snapshot. */
export declare function TaskBoard({ controller }: {
    controller: BoardController;
}): import("react").JSX.Element;
