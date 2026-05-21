import os
from typing import Optional

import jwt
from loguru import logger


class SupabaseAuth:
    """Validates Supabase JWTs locally using the project JWT secret."""

    def __init__(self):
        self.jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")

    def _strip_bearer(self, access_token: str | None) -> str | None:
        if not access_token:
            return None
        if access_token.startswith("Bearer "):
            return access_token.split(" ", 1)[1]
        return access_token

    def get_user(self, access_token: str | None) -> Optional[dict]:
        """Decode and validate a Supabase JWT, returning the payload or None."""
        token = self._strip_bearer(access_token)
        if not token:
            return None
        if not self.jwt_secret:
            logger.error("SUPABASE_JWT_SECRET not configured")
            return None

        try:
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            # Supabase payloads use "sub" (UUID string) as the user id
            if not payload.get("sub"):
                return None
            return payload
        except jwt.ExpiredSignatureError:
            logger.debug("Supabase JWT expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.debug(f"Supabase JWT invalid: {e}")
            return None


supabase_auth = SupabaseAuth()
