

// __tests__/api.test.js
import { apiClient, realTimeData, ref, onValue, get, set, update, child, getMatchById } from '../lib/api';

jest.useFakeTimers();

global.fetch = jest.fn();

describe('ApiClient & RealTimeData', () => {
  afterEach(() => {
    jest.clearAllMocks();
    realTimeData.cleanup();
  });

  const mockResponse = (data = {}, ok = true) =>
    Promise.resolve({
      ok,
      json: async () => data,
    });

  test('apiClient.request returns data on success', async () => {
    fetch.mockResolvedValue(mockResponse({ foo: 'bar' }));
    const result = await apiClient.request('/test');
    expect(result).toEqual({ foo: 'bar' });
  });

  test('apiClient.request throws on HTTP error', async () => {
    fetch.mockResolvedValue(mockResponse({ message: 'fail' }, false));
    await expect(apiClient.request('/fail')).rejects.toThrow('fail');
  });

  test('apiClient.request throws on network error', async () => {
    fetch.mockRejectedValue(new Error('network'));
    await expect(apiClient.request('/error')).rejects.toThrow('network');
  });

  test('apiClient.getMatchesByDate calls correct URL', async () => {
    fetch.mockResolvedValue(mockResponse({ data: [] }));
    const result = await apiClient.getMatchesByDate('2025-09-01', '2025-09-10', 10);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('dateFrom=2025-09-01&dateTo=2025-09-10&limit=10'), expect.any(Object));
  });

  test('getMatchById calls apiClient.getMatch', async () => {
    const spy = jest.spyOn(apiClient, 'getMatch').mockResolvedValue({ id: 1 });
    const result = await getMatchById(1);
    expect(result).toEqual({ id: 1 });
    spy.mockRestore();
  });

  test('realTimeData.onValue subscribes and polls', async () => {
    fetch.mockResolvedValue(mockResponse({ data: [{ id: 'm1', name: 'Match1' }] }));
    const callback = jest.fn();
    const unsubscribe = realTimeData.onValue('matches', callback, null, 1000);

    expect(callback).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2);

    unsubscribe();
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(2); // no more calls
  });

  test('realTimeData.fetchAndNotify handles error callback', async () => {
    fetch.mockRejectedValue(new Error('fail'));
    const errorCallback = jest.fn();
    await realTimeData.fetchAndNotify('matches', () => {}, errorCallback);
    expect(errorCallback).toHaveBeenCalled();
  });

  test('ref, child, get, set, update work as expected', async () => {
    // Mock apiClient methods
    const userId = 'user1';
    apiClient.getUserFavorites = jest.fn().mockResolvedValue({ data: ['teamA'] });
    apiClient.updateUserFavorites = jest.fn().mockResolvedValue({});
    apiClient.createMatches = jest.fn().mockResolvedValue({});
    apiClient.createTeams = jest.fn().mockResolvedValue({});

    const r = ref({}, 'users/' + userId + '/favorites');
    const childRef = child(r, 'extra');

    const val = await get(r);
    expect(val.val()).toEqual(['teamA']);

    await set(r, { favorites: ['teamB'] });
    expect(apiClient.updateUserFavorites).toHaveBeenCalledWith(userId, ['teamB']);

    await update(r, { favorites: ['teamC'] });
    expect(apiClient.updateUserFavorites).toHaveBeenCalledWith(userId, ['teamC']);

    const matchRef = ref({}, 'matches');
    await set(matchRef, { 1: { id: 1 } });
    expect(apiClient.createMatches).toHaveBeenCalled();

    const teamRef = ref({}, 'teams');
    await set(teamRef, [{ id: 't1' }]);
    expect(apiClient.createTeams).toHaveBeenCalled();

    expect(childRef.path).toBe(`users/${userId}/favorites/extra`);
  });

  test('get returns null for unknown path', async () => {
    const unknownRef = ref({}, 'unknown/path');
    const val = await get(unknownRef);
    expect(val.val()).toBeNull();
  });
});
