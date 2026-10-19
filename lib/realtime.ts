/**
 * Realtime event bus.
 *
 * This module holds NO state. Every fact the UI shows comes from SQLite
 * (`lib/store.ts`); this bus only tells connected browsers that something
 * changed so they can re-read it. That keeps a single source of truth and
 * removes the previous in-memory demo layer entirely.
 */

export type AppointmentStatus = 'Confirmed' | 'Agent assigned' | 'Sample collected' | 'Report ready'
export type CollectionType = 'Home collection' | 'Lab visit'

export interface RealtimeEvent {
  type: string
  payload: unknown
}

type Listener = (event: RealtimeEvent) => void

// Pin to globalThis so dev-server hot reloads don't orphan open SSE clients.
const listeners = (globalThis as typeof globalThis & { __svBus?: Set<Listener> }).__svBus ??= new Set<Listener>()

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function publish(type: string, payload: unknown = null) {
  for (const listener of listeners) {
    try {
      listener({ type, payload })
    } catch {
      // A broken client must not take down the fan-out for everyone else.
    }
  }
}

export function connectionCount() {
  return listeners.size
}

/** "uniko agau" → "Uniko Agau"; collapses whitespace so cards stay tidy. */
export function cleanPatientName(raw: string) {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/(^|[\s-])([a-z\u00c0-\u024f])/g, (_, prefix: string, letter: string) => prefix + letter.toUpperCase())
    .slice(0, 60)
}

