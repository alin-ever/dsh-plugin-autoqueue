import type { TaskStatus } from '../../core/tasks.ts';
import type { TaskBoardKey } from '../locales.ts';
/** Task status → locale key (board column titles and the detail badge). */
export declare const STATUS_KEY: Record<TaskStatus, TaskBoardKey>;
