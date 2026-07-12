import pytest

from app import ratelimit


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """Keep the in-memory rate limiter from leaking state between tests."""
    ratelimit.reset()
    yield
    ratelimit.reset()
