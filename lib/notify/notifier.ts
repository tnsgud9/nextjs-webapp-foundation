import "server-only";
import { HTTPError, TimeoutError } from "ky";
import { logger } from "@/lib/server/logger";
import type { NotificationData, NotificationKind, NotifyProvider } from "./types";

/** Picks the provider for a topic, or none when no destination is configured. */
export type ResolveProvider = (topic: string) => NotifyProvider | undefined;

/**
 * Sends notifications through the provider `resolve` picks for each kind's topic. Sending never
 * throws: a notification is a side effect, so its failure must not fail the work that caused it.
 *
 * Failures are logged without the error message, which can carry the destination URL (a secret).
 */
export function createNotifier(resolve: ResolveProvider) {
  const warnedTopics = new Set<string>();

  /** Renders and sends now. Resolves to whether the service accepted the notification. */
  async function send<TData extends NotificationData<TData>>(kind: NotificationKind<TData>, data: TData): Promise<boolean> {
    const context = { kind: kind.name, topic: kind.topic };
    const attributes = { "notify.kind": kind.name, "notify.topic": kind.topic };
    let provider: NotifyProvider | undefined;
    try {
      provider = resolve(kind.topic);
    } catch (error) {
      logger.error("Notification failed", { ...attributes, "error.type": errorType(error) });
      return false;
    }
    if (!provider) {
      if (!warnedTopics.has(kind.topic)) {
        warnedTopics.add(kind.topic);
        logger.warn("Notification skipped: no destination configured", attributes);
      }
      return false;
    }
    try {
      await provider.send(kind.render(data), context);
      return true;
    } catch (error) {
      logger.error("Notification failed", {
        ...attributes,
        "notify.provider": provider.name,
        "error.type": errorType(error),
        ...(error instanceof HTTPError ? { "http.response.status_code": error.response.status } : {}),
      });
      return false;
    }
  }

  return { send };
}

function errorType(error: unknown): string {
  if (error instanceof HTTPError) return String(error.response.status);
  if (error instanceof TimeoutError) return "timeout";
  return error instanceof Error ? error.name : typeof error;
}
