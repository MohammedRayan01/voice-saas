import os
from typing import Optional

import jwt
import requests
from loguru import logger


class SupabaseAuth:
    """Validates Supabase JWTs — supports both HS256 (legacy) and ES256 (new projects)."""

    def __init__(self):
        self.jwt_secret = os.environ.get("SUPABASE_JWT_SECRET")
        self.supabase_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
        self._jwks = None

    def _strip_bearer(self, access_token: str | None) -> str | None:
        if not access_token:
            return None
        if access_token.startswith("Bearer "):
            return access_token.split(" ", 1)[1]
        return access_token

    def _get_jwks(self):
        if self._jwks is not None:
            return self._jwks
        try:
            url = f"{self.supabase_url}/auth/v1/.well-known/jwks.json"
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()
            self._jwks = resp.json()
            return self._jwks
        except Exception as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            return None

    def _decode_es256(self, token: str) -> Optional[dict]:
        jwks = self._get_jwks()
        if not jwks:
            return None
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        for key_data in jwks.get("keys", []):
            if key_data.get("kid") == kid:
                public_key = jwt.algorithms.ECAlgorithm.from_jwk(key_data)
                return jwt.decode(token, public_key, algorithms=["ES256"], audience="authenticated")
        logger.debug("No matching JWK found for kid: " + str(kid))
        return None

    def get_user(self, access_token: str | None) -> Optional[dict]:
        """Decode and validate a Supabase JWT, returning the payload or None."""
        token = self._strip_bearer(access_token)
        if not token:
            return None

        try:
            header = jwt.get_unverified_header(token)
            alg = header.get("alg", "HS256")

            if alg == "ES256":
                payload = self._decode_es256(token)
            else:
                if not self.jwt_secret:
                    logger.error("SUPABASE_JWT_SECRET not configured")
                    return None
                payload = jwt.decode(token, self.jwt_secret, algorithms=["HS256"], audience="authenticated")

            if not payload or not payload.get("sub"):
                return None
            return payload
        except jwt.ExpiredSignatureError:
            logger.debug("Supabase JWT expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.debug(f"Supabase JWT invalid: {e}")
            return None


supabase_auth = SupabaseAuth()
