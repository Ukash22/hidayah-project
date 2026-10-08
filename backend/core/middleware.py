"""
Custom middleware for the core application.
"""
from asgiref.sync import iscoroutinefunction, markcoroutinefunction, sync_to_async
from whitenoise.middleware import WhiteNoiseMiddleware


class AsyncWhiteNoiseMiddleware(WhiteNoiseMiddleware):
    """
    Async-capable WhiteNoise middleware for Django under ASGI (Daphne / Channels).

    Standard WhiteNoiseMiddleware only implements a synchronous __call__.
    When run inside Django's ASGI handler, Django wraps synchronous middleware
    with sync_to_async(thread_sensitive=True). Because WhiteNoiseMiddleware wraps
    downstream async middleware with async_to_sync, it blocks the single worker
    thread in Django's ThreadSensitiveContext while waiting for the response.

    When downstream execution reaches a synchronous view (such as Django Admin's
    login and changelist views), Django's sync_to_async(thread_sensitive=True)
    attempts to schedule that view onto the exact same worker thread.
    Because that thread is blocked waiting for the downstream response,
    the application deadlocks. Requests hang until the client or Daphne times out,
    resulting in:
        asyncio.exceptions.CancelledError: exception in shielded future

    By declaring sync_capable=True and async_capable=True and implementing
    __acall__, this middleware runs natively on the asyncio event loop:
      - Static files are served immediately.
      - Non-static requests (such as /admin/, /admin/login/, /api/...) are passed
        directly to the next handler via `await self.get_response(request)` without
        consuming or blocking any worker thread.
      - The worker thread remains free for synchronous views like Django Admin.
    """

    sync_capable = True
    async_capable = True

    def __init__(self, get_response=None, settings=None):
        if settings is None:
            super().__init__(get_response=get_response)
        else:
            super().__init__(get_response=get_response, settings=settings)

        self.async_mode = iscoroutinefunction(self.get_response)
        if self.async_mode:
            markcoroutinefunction(self)

    def __call__(self, request):
        if self.async_mode:
            return self.__acall__(request)

        if self.autorefresh:
            static_file = self.find_file(request.path_info)
        else:
            static_file = self.files.get(request.path_info)

        if static_file is not None:
            return self.serve(static_file, request)

        return self.get_response(request)

    async def __acall__(self, request):
        if self.autorefresh:
            static_file = await sync_to_async(self.find_file, thread_sensitive=False)(
                request.path_info
            )
        else:
            static_file = self.files.get(request.path_info)

        if static_file is not None:
            return self.serve(static_file, request)

        return await self.get_response(request)
