import { act, renderHook } from '@testing-library/react-native';

import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the initial value immediately', async () => {
    const { result } = await renderHook(() => useDebounce('first', 500));
    expect(result.current).toBe('first');
  });

  it('does not update before the delay has elapsed', async () => {
    jest.useFakeTimers();
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } },
    );

    await rerender({ value: 'second' });
    await act(() => {
      jest.advanceTimersByTime(499);
    });

    expect(result.current).toBe('first');
  });

  it('updates to the latest value once the delay elapses', async () => {
    jest.useFakeTimers();
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } },
    );

    await rerender({ value: 'second' });
    await act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('second');
  });

  it('collapses rapid changes to only the final value', async () => {
    jest.useFakeTimers();
    const { result, rerender } = await renderHook(
      ({ value }: { value: string }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } },
    );

    await rerender({ value: 'second' });
    await act(() => {
      jest.advanceTimersByTime(200);
    });
    await rerender({ value: 'third' });
    await act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toBe('third');
  });

  it('clears its pending timer on unmount, so a pending debounce never fires', async () => {
    jest.useFakeTimers();
    const { result, rerender, unmount } = await renderHook(
      ({ value }: { value: string }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } },
    );

    await rerender({ value: 'second' });
    // Attached after the rerender so it only counts the unmount's own cleanup call, not the one
    // the rerender itself triggers when replacing the 'first'-value timer.
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    await unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

    await act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current).toBe('first');

    clearTimeoutSpy.mockRestore();
  });
});
