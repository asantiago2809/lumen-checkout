import { act, renderHook } from "@testing-library/react";
import { api } from "./api";
import { usePolling } from "./usePolling";
import { approved, transaction } from "./test/fixtures";

beforeEach(() => {
  jest.useFakeTimers();
  jest
    .spyOn(api, "transaction")
    .mockResolvedValue({ ...transaction, canPay: false });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});
test("polls progressively, ends on a terminal server response and never invokes pay", async () => {
  jest
    .mocked(api.transaction)
    .mockResolvedValueOnce(transaction)
    .mockResolvedValueOnce(approved);
  const received = jest.fn();
  const error = jest.fn();
  renderHook(() => usePolling(transaction, received, error));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(5000);
  });
  expect(received).toHaveBeenLastCalledWith(approved);
  expect(api.transaction).toHaveBeenCalledTimes(2);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(10000);
  });
  expect(api.transaction).toHaveBeenCalledTimes(2);
});
test("pauses hidden and offline tabs, stops after 60s and permits another cycle", async () => {
  const received = jest.fn();
  const error = jest.fn();
  const visibility = jest
    .spyOn(document, "visibilityState", "get")
    .mockReturnValue("hidden");
  const online = jest.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  const { result } = renderHook(() => usePolling(transaction, received, error));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(9000);
  });
  expect(api.transaction).not.toHaveBeenCalled();
  visibility.mockReturnValue("visible");
  await act(async () => {
    await jest.advanceTimersByTimeAsync(9000);
  });
  expect(api.transaction).not.toHaveBeenCalled();
  online.mockReturnValue(true);
  await act(async () => {
    await jest.advanceTimersByTimeAsync(50000);
  });
  expect(result.current.exhausted).toBe(true);
  const count = jest.mocked(api.transaction).mock.calls.length;
  act(() => result.current.restart());
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1);
  });
  expect(jest.mocked(api.transaction).mock.calls.length).toBeGreaterThan(count);
});
test("poll failure is visible and stale/unmounted responses are ignored", async () => {
  const error = jest.fn(),
    received = jest.fn();
  jest.mocked(api.transaction).mockRejectedValueOnce(new Error("Temporal"));
  const view = renderHook(() => usePolling(transaction, received, error));
  await act(async () => {
    await jest.advanceTimersByTimeAsync(2000);
  });
  expect(error).toHaveBeenCalledWith("Temporal");
  let resolve!: (value: typeof approved) => void;
  jest.mocked(api.transaction).mockImplementationOnce(
    () =>
      new Promise((res) => {
        resolve = res;
      }),
  );
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3000);
  });
  view.unmount();
  await act(async () => {
    resolve(approved);
  });
  expect(received).not.toHaveBeenCalled();
});
test("null and terminal transactions never poll", async () => {
  const received = jest.fn(),
    error = jest.fn();
  const view = renderHook(({ value }) => usePolling(value, received, error), {
    initialProps: { value: null as typeof transaction | null },
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(10000);
  });
  expect(api.transaction).not.toHaveBeenCalled();
  view.rerender({ value: approved });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(10000);
  });
  expect(api.transaction).not.toHaveBeenCalled();
});
