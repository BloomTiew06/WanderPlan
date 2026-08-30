/**
 * Outbound notifications.
 *
 * Push reminders would come from a scheduled cloud function; check-in snapshots
 * would go out through Twilio (SMS) or a transactional email API. Both are
 * one-way, so the recipient needs no account and no app install. Here they land
 * in an in-app outbox so the demo can show exactly what would have been sent.
 */

export type Channel = 'push' | 'sms' | 'email';

export interface OutboxItem {
  id: string;
  channel: Channel;
  to: string;
  subject: string;
  body: string;
  imageUrl?: string;
  at: string;
}

const outbox: OutboxItem[] = [];
const listeners = new Set<(items: OutboxItem[]) => void>();

export function send(item: Omit<OutboxItem, 'id' | 'at'>): OutboxItem {
  const full: OutboxItem = { ...item, id: `msg-${Date.now()}-${outbox.length}`, at: new Date().toISOString() };
  outbox.unshift(full);
  for (const l of listeners) l([...outbox]);
  return full;
}

export function getOutbox(): OutboxItem[] {
  return [...outbox];
}

export function subscribe(fn: (items: OutboxItem[]) => void): () => void {
  listeners.add(fn);
  fn([...outbox]);
  return () => listeners.delete(fn);
}

/** Reminder to members who haven't submitted availability as the deadline nears. */
export function remindAvailability(names: string[], respondBy: string): void {
  for (const name of names) {
    send({
      channel: 'push',
      to: name,
      subject: 'Trip dates close soon',
      body: `${name}, the group is waiting on your dates. Responses close ${new Date(respondBy).toLocaleString('en-GB')}.`,
    });
  }
}
