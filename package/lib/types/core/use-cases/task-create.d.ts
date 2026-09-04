import { type NewTaskInput, type TaskRecord } from '../tasks.ts';
/** Result of a create transition: the new task (when accepted) + the next ledger. */
export interface CreateTaskResult {
    /** The minted task, or undefined when the input was rejected (blank title). */
    task: TaskRecord | undefined;
    /** The next ledger; identical reference when rejected. */
    tasks: readonly TaskRecord[];
}
/**
 * Apply a create against the current ledger. Returns the new task and the
 * appended ledger, or the unchanged ledger when the title is blank.
 * @param tasks - current ledger.
 * @param input - raw user input (title/description/prompt + optional schedule).
 * @param now - clock instant (ms epoch).
 * @param id - minted task id.
 */
export declare function applyCreateTask(tasks: readonly TaskRecord[], input: NewTaskInput, now: number, id: string): CreateTaskResult;
