from .base_exception import BaseAppException


class ChatNotFoundException(BaseAppException):
	def __init__(self, message, status_code = 404):
	    super().__init__(message, status_code)


class ChatNotBelongToUserException(BaseAppException):
	def __init__(self, message, status_code = 403):
	    super().__init__(message, status_code)


class ChatIsNotGroupException(BaseAppException):
	def __init__(self, message, status_code = 400):
	    super().__init__(message, status_code)


class OwnerCantLeaveChatException(BaseAppException):
	def __init__(self, message, status_code = 400):
		super().__init__(message, status_code)


class InvalidChatCreationException(BaseAppException):
	def __init__(self, message, status_code = 400):
		super().__init__(message, status_code)


class ChatParticipantNotFoundException(BaseAppException):
	def __init__(self, message, status_code = 404):
		super().__init__(message, status_code)
