import type { BoardController } from '../../core/controller.ts';
import type { TaskRecord } from '../../core/tasks.ts';
/** Edit-task form overlay. */
export declare function EditTaskModal({ controller, task, onClose }: {
    controller: BoardController;
    task: TaskRecord;
    onClose: () => void;
}): import("react").JSX.Element;
