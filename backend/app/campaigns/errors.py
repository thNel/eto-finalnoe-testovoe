class EditorError(Exception):
    def __init__(self, status: int, code: str, message: str, **detail: str | int):
        super().__init__(message)
        self.status = status
        self.detail = {"code": code, "message": message, **detail}
