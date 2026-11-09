import "server-only";
import type { Notification, NotificationData, NotificationKind } from "./types";

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Defines a kind of notification, one per file in `notifications/<name>.ts`, exported as the
 * PascalCase form of `name`. `TData` is the kind's flat DTO (`NotificationData`). Write `name` and
 * `topic` in kebab-case and never change a name once released: logs and tests match on it.
 */
export function defineNotification<TData extends NotificationData<TData>>(
  name: string,
  definition: { topic: string; render: (data: TData) => Notification },
): NotificationKind<TData> {
  for (const value of [name, definition.topic]) {
    if (!KEBAB_CASE.test(value)) throw new Error(`Notification name and topic must be kebab-case: ${value}`);
  }
  return { name, topic: definition.topic, render: definition.render };
}
