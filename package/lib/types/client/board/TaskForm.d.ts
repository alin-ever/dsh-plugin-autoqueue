/**
 * Shared task-modal pieces: the overlay shell (backdrop, form, title, error,
 * footer) and the title/description/prompt field trio used by both the
 * NewTaskModal and the EditTaskModal. State stays in the owning modal; these
 * are controlled components.
 */
import type { ReactNode } from 'react';
/** Modal overlay: closes on backdrop press, submits through the form. */
export declare function ModalShell({ ariaLabel, title, error, pending, submitLabel, onSubmit, onClose, children, }: {
    ariaLabel: string;
    title: string;
    error: string | undefined;
    pending: boolean;
    submitLabel: string;
    onSubmit: () => void;
    onClose: () => void;
    children: ReactNode;
}): import("react").JSX.Element;
/** Title + description + prompt fields shared by the new and edit task forms. */
export declare function TaskContentFields({ title, description, prompt, onTitleChange, onDescriptionChange, onPromptChange, }: {
    title: string;
    description: string;
    prompt: string;
    /** Receives the new title; the owner also clears its error state. */
    onTitleChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
    onPromptChange: (value: string) => void;
}): import("react").JSX.Element;
