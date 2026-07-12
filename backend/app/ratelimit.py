"""A tiny in-process rate limiter.

Keyed by opaque identity strings (e.g. "ip:1.2.3.4", "bid:<uuid>"). State lives
in memory, so it resets on redeploy and isn't shared across instances — fine for
a single-instance hobby deploy. Not a substitute for a real limiter at scale.
"""

import threading
import time

# identity key -> timestamps (seconds) of allowed events within the window
_store: dict[str, list[float]] = {}
_lock = threading.Lock()
_last_sweep = 0.0
_SWEEP_INTERVAL = 60.0


def _now() -> float:
    return time.time()


def check_and_reserve(
    keys: list[str], limit: int, window_seconds: int
) -> float | None:
    """Reserve one event for `keys`, or report how long to wait.

    If any key already has `limit` events inside the window, returns the seconds
    until the caller may retry (a positive float). Otherwise records the event
    for every key and returns None (allowed). A request is blocked if EITHER key
    is over the limit, so IP and browser id each act as an independent cap.
    """
    if window_seconds <= 0 or limit <= 0:
        return None  # limiter disabled

    now = _now()
    cutoff = now - window_seconds
    with _lock:
        retry_after: float | None = None
        for key in keys:
            times = [t for t in _store.get(key, []) if t > cutoff]
            _store[key] = times
            if len(times) >= limit:
                # The oldest event in the window frees the next slot.
                wait = times[0] + window_seconds - now
                if retry_after is None or wait > retry_after:
                    retry_after = wait

        if retry_after is not None:
            return max(retry_after, 0.0)

        for key in keys:
            _store.setdefault(key, []).append(now)
        _maybe_sweep(now, window_seconds)
        return None


def _maybe_sweep(now: float, window_seconds: int) -> None:
    """Drop expired keys occasionally so the store doesn't grow unbounded.

    Caller must hold the lock.
    """
    global _last_sweep
    if now - _last_sweep < _SWEEP_INTERVAL:
        return
    _last_sweep = now
    cutoff = now - window_seconds
    for key in list(_store.keys()):
        times = [t for t in _store[key] if t > cutoff]
        if times:
            _store[key] = times
        else:
            del _store[key]


def reset() -> None:
    """Clear all state. Used by tests for isolation."""
    global _last_sweep
    with _lock:
        _store.clear()
        _last_sweep = 0.0
