import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/api/endpoints', () => ({
  favoritesApi: {
    list: mocks.list,
    add: mocks.add,
    remove: mocks.remove,
  },
}));

import { ApiError } from '@/lib/api/error';
import { useFavoritesStore } from '@/lib/favorites/store';

const state = () => useFavoritesStore.getState();

beforeEach(() => {
  state().reset();
  mocks.list.mockReset();
  mocks.add.mockReset();
  mocks.remove.mockReset();
});

describe('favorites store', () => {
  it('hydrates saved ids from the API', async () => {
    mocks.list.mockResolvedValue({ data: [{ id: 'a' }, { id: 'b' }], meta: {} });

    await state().hydrate();

    expect(state().status).toBe('ready');
    expect(state().savedIds.has('a')).toBe(true);
    expect(state().savedIds.has('b')).toBe(true);
  });

  it('treats an unauthenticated hydrate as an empty list, not an error', async () => {
    mocks.list.mockRejectedValue(new ApiError(401, { code: 'TOKEN_INVALID', message: 'nope' }));

    await state().hydrate();

    expect(state().status).toBe('ready');
    expect(state().lastError).toBeNull();
    expect(state().savedIds.size).toBe(0);
  });

  it('optimistically saves and confirms on success', async () => {
    mocks.add.mockResolvedValue({ data: { favorited: true, created: true }, meta: {}, status: 201 });

    const result = await state().toggle('p1');

    expect(result).toBe(true);
    expect(state().savedIds.has('p1')).toBe(true);
    expect(mocks.add).toHaveBeenCalledWith('p1');
    expect(state().lastError).toBeNull();
  });

  it('rolls back and reports an error when saving fails', async () => {
    mocks.add.mockRejectedValue(new ApiError(500, { code: 'INTERNAL_ERROR', message: 'boom' }));

    const result = await state().toggle('p1');

    expect(result).toBe(false);
    expect(state().savedIds.has('p1')).toBe(false);
    expect(state().lastError).toBe('boom');
  });

  it('optimistically removes and confirms on success', async () => {
    mocks.list.mockResolvedValue({ data: [{ id: 'p1' }], meta: {} });
    await state().hydrate();
    mocks.remove.mockResolvedValue({ data: undefined, meta: {}, status: 204 });

    const result = await state().toggle('p1');

    expect(result).toBe(false);
    expect(state().savedIds.has('p1')).toBe(false);
    expect(mocks.remove).toHaveBeenCalledWith('p1');
  });

  it('rolls back a failed unsave', async () => {
    mocks.list.mockResolvedValue({ data: [{ id: 'p1' }], meta: {} });
    await state().hydrate();
    mocks.remove.mockRejectedValue(new ApiError(500, { code: 'INTERNAL_ERROR', message: 'nope' }));

    await state().toggle('p1');

    expect(state().savedIds.has('p1')).toBe(true);
    expect(state().lastError).toBe('nope');
  });
});
