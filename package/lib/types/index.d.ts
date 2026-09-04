/**
 * Host loader entry for the task-board plugin.
 *
 * The Host owns the v2 ledger, action API, cron scheduler, session runner,
 * execution reconciliation, and optional idle-sleep inhibitor. The browser is
 * a same-origin asynchronous view over that service.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings';
import z from 'schemastery';
import { type TaskPermission } from './core/tasks.ts';
/** Default environment variable holding the authenticated proxy token. */
export declare const DEFAULT_PROXY_TOKEN_ENV = "DSH_TASK_BOARD_PROXY_TOKEN";
export declare const inject: string[];
/** Model-facing announcement: plugin presence, capabilities, and limits. */
export declare const TASK_BOARD_GUIDANCE = "\u672C\u673A\u5DF2\u5B89\u88C5 dsh-task-board \u63D2\u4EF6\uFF08DSH Web GUI \u7684\u4EFB\u52A1\u770B\u677F\uFF09\uFF1A\u4FA7\u8FB9\u680F\u300C\u4EFB\u52A1\u770B\u677F\u300D\u5165\u53E3\uFF1B\u5728 dsh-web \u63D2\u4EF6\u5168\u5BB6\u6876\u4ED3\u5E93\uFF08packages/dsh-task-board\uFF09\u7EDF\u4E00\u7EF4\u62A4\uFF0C\u7ECF\u805A\u5408\u5305 web-ui-all \u4E00\u952E\u5B89\u88C5\u3002\u80FD\u529B\uFF1A\u591A\u5217\u770B\u677F\u7BA1\u7406\u4EFB\u52A1\uFF1BHost \u6743\u5A01\u8D26\u672C\uFF1B\u5173\u95ED\u6D4F\u89C8\u5668\u540E\u4ECD\u7531 Host \u6267\u884C\u548C\u7ED3\u7B97\uFF1B\u4EFB\u52A1\u53EF\u9489\u4F4F\u5DE5\u4F5C\u533A\u3001agent \u9884\u8BBE\u548C\u6743\u9650\uFF1B\u652F\u6301 Host \u672C\u5730\u65F6\u533A\u7684 5 \u6BB5 cron\uFF0C\u9519\u8FC7\u7684\u89E6\u53D1\u70B9\u4E0D\u8865\u8DD1\uFF1B\u53EF\u9009\u4E14\u9ED8\u8BA4\u5173\u95ED\u7684\u7A7A\u95F2\u7CFB\u7EDF\u7761\u7720\u4FDD\u62A4\u5141\u8BB8\u5C4F\u5E55\u7184\u706D\uFF0C\u4F46\u4E0D\u627F\u8BFA\u62E6\u622A\u5408\u76D6\u3001\u624B\u52A8\u7761\u7720\u3001\u4F11\u7720\u3001\u5173\u673A\u6216\u5524\u9192\u5DF2\u7761\u7720\u673A\u5668\u3002\u6267\u884C\u6D88\u8017 API \u989D\u5EA6\u3002\u7528\u6237\u63D0\u5230\u300C\u4EFB\u52A1\u770B\u677F / \u770B\u677F / \u5B9A\u65F6\u4EFB\u52A1\u300D\u65F6\u5373\u6307\u672C\u63D2\u4EF6\uFF0C\u8BF7\u636E\u6B64\u534F\u4F5C\u3002\u82E5\u4F60\u540C\u65F6\u7528 todo_write \u7EF4\u62A4\u4F1A\u8BDD\u9876\u90E8\u7684\u53EF\u89C1\u8BA1\u5212\u5217\u8868\uFF0C\u6700\u7EC8\u56DE\u590D\u524D\u5FC5\u987B\u518D\u6B21\u8C03\u7528 todo_write \u6536\u5C3E\uFF1A\u6CA1\u6709\u5269\u4F59\u5DE5\u4F5C\u65F6\u4E0D\u8981\u4FDD\u7559 in_progress\uFF0C\u5DF2\u5B8C\u6210\u7684\u6700\u540E\u4E00\u6B65\u8981\u6807\u4E3A completed\u3002";
/**
 * Settings namespace of the board's announcement capability — the section the
 * web settings surface edits. Spelled here rather than imported: the browser
 * half spells the same value and must not depend on a Host package.
 */
export declare const TASK_BOARD_SETTINGS_NAMESPACE: SettingsNamespace;
/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
    /**
     * When true (default), a system-prompt section announces the board to every
     * agent. Set false to keep the board silent in prompts; agents then learn
     * about it only when the user mentions it.
     */
    announceToAgent?: boolean;
    /** Master switch for the plugin (browser half + host announcement). */
    enabled?: boolean;
    /** Prevent idle system sleep while sessions run or schedules are armed. */
    preventIdleSleep?: boolean;
    /** Canonical reverse-proxy Host authorities admitted with a server-side token. */
    trustedProxyHosts?: string[];
    /** Environment variable whose value the authenticated proxy injects upstream. */
    proxyTokenEnv?: string;
    /**
     * The deployment's session-default permission. A card whose effective
     * permission (handover bundle or pin) is above this value requires a human
     * confirmation before it may run; cron refuses unconfirmed cards.
     */
    sessionDefaultPermission?: TaskPermission;
}
export declare const Config: z<Config>;
/** Resolve proxy access without ever placing the token value in plugin config. */
export declare function resolveProxyAccess(config: Config | undefined, env?: NodeJS.ProcessEnv): {
    trustedProxyHosts: string[];
    proxyToken?: string;
};
/**
 * Register the board's announcement section, gated on the composition entry's
 * `announceToAgent` (and the live settings value once the web settings
 * surface is served). The section is re-registered whenever the source
 * changes, so a settings edit takes effect without a restart.
 * @param ctx - the plugin context (systemPrompt injected).
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export declare const apply: typeof applyImpl;
declare function applyImpl(ctx: Context, config?: Config): void;
export {};
