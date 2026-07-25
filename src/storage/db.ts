// Stockage IndexedDB. L'état complet est persisté comme un document unique
// (écriture transactionnelle atomique), plus une copie de secours de la
// dernière bonne version. Fallback localStorage si IndexedDB est indisponible.

import type { AppState } from '../domain/types'

const DB_NAME = 'cap-gabriel'
const DB_VERSION = 1
const STORE = 'state'
const KEY_MAIN = 'main'
const KEY_BACKUP = 'backup'
const LS_KEY = 'cap-gabriel-state'

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
    req.onblocked = () => resolve(null)
  })
  return dbPromise
}

function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function idbSet(db: IDBDatabase, entries: Array<[string, unknown]>): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const [k, v] of entries) store.put(v, k)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('transaction aborted'))
  })
}

export interface LoadResult {
  state: AppState | null
  corrupted: boolean
  recoveredFromBackup: boolean
}

function looksLikeState(v: unknown): v is AppState {
  return !!v && typeof v === 'object' && 'schemaVersion' in (v as object) && 'profile' in (v as object)
}

export async function loadState(): Promise<LoadResult> {
  const db = await openDb()
  if (db) {
    try {
      const main = await idbGet(db, KEY_MAIN)
      if (looksLikeState(main)) return { state: main, corrupted: false, recoveredFromBackup: false }
      if (main != null) {
        const backup = await idbGet(db, KEY_BACKUP)
        if (looksLikeState(backup)) return { state: backup, corrupted: true, recoveredFromBackup: true }
        return { state: null, corrupted: true, recoveredFromBackup: false }
      }
    } catch {
      // continue vers localStorage
    }
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (looksLikeState(parsed)) return { state: parsed, corrupted: false, recoveredFromBackup: false }
    }
  } catch {
    return { state: null, corrupted: true, recoveredFromBackup: false }
  }
  return { state: null, corrupted: false, recoveredFromBackup: false }
}

let lastGood: AppState | null = null

export async function saveState(state: AppState): Promise<void> {
  const db = await openDb()
  if (db) {
    const entries: Array<[string, unknown]> = [[KEY_MAIN, state]]
    if (lastGood) entries.push([KEY_BACKUP, lastGood])
    await idbSet(db, entries)
    lastGood = state
    return
  }
  localStorage.setItem(LS_KEY, JSON.stringify(state))
  lastGood = state
}

/** Demande la persistance durable du stockage (peut être refusée par le navigateur). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      const already = await navigator.storage.persisted()
      if (already) return true
      return await navigator.storage.persist()
    }
  } catch { /* ignoré */ }
  return false
}

/** Lit l'ancienne clé localStorage "cap-gabriel-v6" si elle existe sur ce domaine. */
export function readLegacyV6(): string | null {
  try {
    return localStorage.getItem('cap-gabriel-v6')
  } catch {
    return null
  }
}
