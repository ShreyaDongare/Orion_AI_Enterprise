from concurrent.futures import ThreadPoolExecutor
from flask import current_app
import traceback
import logging

logger = logging.getLogger(__name__)

class BackgroundTaskManager:
    def __init__(self, max_workers=5):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

    def submit_task(self, app, func, *args, **kwargs):
        """
        Submits a background task. Passes the Flask app context so that 
        database operations and current_app work inside the thread.
        """
        def _run_with_context():
            with app.app_context():
                try:
                    func(*args, **kwargs)
                except Exception as e:
                    logger.error(f"Background task failed: {e}")
                    logger.error(traceback.format_exc())

        return self.executor.submit(_run_with_context)

background_manager = BackgroundTaskManager()

def run_in_background(func):
    """
    Decorator to run a function in the background thread pool.
    Requires that it's called within an active Flask app context.
    """
    def wrapper(*args, **kwargs):
        from flask import current_app
        # We must pass the actual app object, current_app is a proxy
        app = current_app._get_current_object()
        return background_manager.submit_task(app, func, *args, **kwargs)
    return wrapper
