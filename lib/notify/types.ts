import "server-only";

/**
 * A notification in a form no chat service owns. Each provider turns it into its own message format,
 * so the code that sends one never depends on the service that delivers it.
 *
 * Everything here leaves the app for an outside service: never put personal data, tokens, request
 * bodies, or internal error details in it. Point to the resource with `link` instead.
 */
export interface Notification {
  /** Short plain-text headline. */
  title: string;
  /** Body text. Treated as plain text: providers escape markup and mentions. */
  text?: string;
  /** Defaults to `info`. */
  level?: NotificationLevel;
  /** Label and value pairs shown below the text. Providers may show only the first few. */
  fields?: { label: string; value: string }[];
  /** An `http(s)` link to the resource the notification is about. Any other URL is dropped. */
  link?: { url: string; label?: string };
}

export type NotificationLevel = "info" | "warning" | "critical";

/** A value a notification's data may hold: a primitive, or a list of them. */
export type NotificationValue = string | number | boolean | null | undefined | readonly (string | number | boolean)[];

/**
 * The data a kind takes is a flat DTO, like a `data/` return value: only the fields its message
 * needs, as primitives. A Prisma record, a `Date`, a `Decimal`, or a nested object does not fit, so
 * convert values (an ISO date string, a decimal string) and pick fields before sending.
 */
export type NotificationData<T> = { [K in keyof T]: NotificationValue };

/**
 * One kind of notification, such as a service operation event or a request in a domain: its fixed
 * name, the data it takes, the topic it goes to, and how that data becomes a message. Defined with
 * `defineNotification()` where the event belongs, so each kind formats its message in one place.
 */
export interface NotificationKind<TData extends NotificationData<TData>> {
  /** Kebab-case identifier, used in logs and tests. */
  readonly name: string;
  /** Where it goes, such as `ops`. A topic names a destination, never a service or channel. */
  readonly topic: string;
  /** Builds the message from the data. */
  render(data: TData): Notification;
}

/** Delivers notifications to one destination of one service. */
export interface NotifyProvider {
  /** Service name for logs, such as `slack`. */
  readonly name: string;
  /**
   * Sends the notification, and throws when the service does not accept it. `kind` lets a provider
   * format one kind of notification its own way.
   */
  send(notification: Notification, context: { kind: string; topic: string }): Promise<void>;
}
