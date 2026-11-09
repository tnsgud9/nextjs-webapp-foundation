import "server-only";
import { after } from "next/server";
import { serverEnv } from "@/config/env.server";
import { createNotifier, type ResolveProvider } from "./notifier";
import { createSlackProvider } from "./providers/slack";
import type { NotificationData, NotificationKind } from "./types";

export { defineNotification } from "./kind";
export type {
  Notification,
  NotificationData,
  NotificationKind,
  NotificationLevel,
  NotificationValue,
  NotifyProvider,
} from "./types";

/**
 * Server notifications to a chat service. Code sends a kind of notification (`defineNotification()`)
 * with its data, and never names a service or channel: the kind picks a topic, and the topic's
 * destination is configured here, so either can change without touching the code that sends.
 *
 * Every topic goes to the default destination for now. To route a topic elsewhere, add its own
 * server variable and return its provider here. A new service is a new provider in `providers/`.
 * With no destination configured, nothing is sent and a warning is logged once per topic.
 */
const defaultProvider = serverEnv.notifySlackWebhookUrl ? createSlackProvider(serverEnv.notifySlackWebhookUrl) : undefined;
const resolveProvider: ResolveProvider = () => defaultProvider;

const notifier = createNotifier(resolveProvider);

/**
 * Sends a notification after the response is finished, so it never delays or fails the request.
 * Call it from a Server Action or Route Handler once the `data/` call has succeeded. Delivery is
 * best effort: a failure is logged, and a restart before the response finishes loses it.
 */
export function notify<TData extends NotificationData<TData>>(kind: NotificationKind<TData>, data: TData): void {
  after(() => notifier.send(kind, data));
}

/**
 * Sends a notification now and resolves to whether the service accepted it. Never throws. Use it
 * where there is no request to wait for, such as a script; use `notify()` in a request.
 */
export const sendNotification = notifier.send;
