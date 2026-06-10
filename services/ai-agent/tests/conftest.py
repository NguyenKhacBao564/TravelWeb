"""
pytest configuration — reset global session store between session memory tests.

The SessionStore singleton must be reset between session memory test runs to ensure
each test starts with a clean store. This fixture is scoped to session memory tests
only so it does not interfere with existing test modules.
"""
import pytest


@pytest.fixture(scope="function")
def clean_session_store():
    """
    Reset the global session store before each session memory test.

    Resets the module-level singleton in agent.memory AND also patches
    any already-imported references so that tests don't bleed state.
    """
    # Reset the agent.memory module's own reference
    import agent.memory as memory_module
    import importlib

    memory_module._store = None
    yield
    # Reset again after test
    memory_module._store = None
    try:
        importlib.reload(memory_module)
    except (ImportError, ModuleNotFoundError):
        pass
