'use client';

import { create } from 'zustand';
import { favoritesApi } from '../api/endpoints';
import { isApiError } from '../api/error';

/**
 * Single client-side source of truth for "which properties are saved".
 *
 * The backend remains authoritative (favourites are persisted per user), but a
 * shared store keeps every heart in sync — search results, the property detail
 * page, the list of cards and the Saved Properties page all read the same set.
 * Toggles are optimistic and roll back on failure so the UI never lies about
 * what was persisted.
 */

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface FavoritesState {
  savedIds: Set<string>;
  status: Status;
  lastError: string | null;
  /** Property ids with an in-flight mutation (disables their button). */
  pending: Set<string>;
  hydrate: (options?: { force?: boolean }) => Promise<void>;
  toggle: (propertyId: string) => Promise<boolean>;
  /** Merge server-rendered saved state without an extra request. */
  seed: (ids: string[]) => void;
  reset: () => void;
}

const EMPTY = new Set<string>();

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  savedIds: EMPTY,
  status: 'idle',
  lastError: null,
  pending: EMPTY,

  async hydrate(options) {
    const { status } = get();
    if (!options?.force && (status === 'loading' || status === 'ready')) {
      return;
    }
    set({ status: 'loading', lastError: null });
    try {
      const result = await favoritesApi.list({ limit: 50 });
      set({
        savedIds: new Set(result.data.map((card) => card.id)),
        status: 'ready',
      });
    } catch (error) {
      // A 401 just means "not signed in" — an empty set is the correct state,
      // not an error the user needs to see.
      if (isApiError(error) && error.isAuth) {
        set({ savedIds: new Set(), status: 'ready' });
        return;
      }
      set({
        status: 'error',
        lastError: isApiError(error) ? error.message : 'Could not load saved properties.',
      });
    }
  },

  async toggle(propertyId) {
    const { savedIds, pending } = get();
    if (pending.has(propertyId)) return savedIds.has(propertyId);

    const wasSaved = savedIds.has(propertyId);
    const next = new Set(savedIds);
    if (wasSaved) next.delete(propertyId);
    else next.add(propertyId);

    // Optimistic update.
    set({ savedIds: next, pending: new Set(pending).add(propertyId), lastError: null });

    try {
      if (wasSaved) {
        await favoritesApi.remove(propertyId);
      } else {
        await favoritesApi.add(propertyId);
      }
      const done = new Set(get().pending);
      done.delete(propertyId);
      set({ pending: done });
      return !wasSaved;
    } catch (error) {
      // Roll back to the previous truth and surface the failure.
      const rolledBack = new Set(get().savedIds);
      if (wasSaved) rolledBack.add(propertyId);
      else rolledBack.delete(propertyId);
      const done = new Set(get().pending);
      done.delete(propertyId);
      set({
        savedIds: rolledBack,
        pending: done,
        lastError: isApiError(error) ? error.message : 'Could not update saved properties.',
      });
      return wasSaved;
    }
  },

  seed(ids) {
    const merged = new Set(get().savedIds);
    for (const id of ids) merged.add(id);
    set({ savedIds: merged });
  },

  reset() {
    set({ savedIds: new Set(), status: 'idle', lastError: null, pending: new Set() });
  },
}));
