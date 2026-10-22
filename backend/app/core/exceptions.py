"""
Structured application exceptions with consistent HTTP status codes.
All domain errors inherit from AppError so routers can catch them uniformly.
"""
from __future__ import annotations

from fastapi import HTTPException, status


class AppError(HTTPException):
    """Base class for all application errors."""
    status_code: int = status.HTTP_400_BAD_REQUEST
    detail: str = "An error occurred."

    def __init__(self, detail: str | None = None, **kwargs):
        super().__init__(
            status_code=self.__class__.status_code,
            detail=detail or self.__class__.detail,
            **kwargs,
        )


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    detail = "Resource not found."


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    detail = "Resource already exists."


class UnauthorizedError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    detail = "Authentication required."
    headers = {"WWW-Authenticate": "Bearer"}

    def __init__(self, detail: str | None = None):
        super().__init__(detail=detail)
        self.headers = {"WWW-Authenticate": "Bearer"}


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    detail = "You do not have permission to perform this action."


class ValidationError(AppError):
    status_code = getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422)
    detail = "Validation failed."


class PaymentError(AppError):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    detail = "Payment processing error."


class IntegrationError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    detail = "An external integration is unavailable."


class InventoryError(AppError):
    status_code = status.HTTP_409_CONFLICT
    detail = "Insufficient stock."


class CartError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    detail = "Cart error."


class UploadError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    detail = "File upload error."
