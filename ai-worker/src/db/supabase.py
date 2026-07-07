"""[Oracle 전환 복제본] 과거 Supabase 클라이언트 자리 — 이제 Oracle 26ai 어댑터를 반환한다.

`from ..db import supabase` 로 파이프라인이 받는 전역 `supabase` 를 Oracle 백엔드로 교체.
supabase-py 와 같은 체이닝 API(부분집합)를 제공하므로 파이프라인 코드는 그대로 동작한다.
자세한 구현은 `oracle_client.OracleClient` 참고.
"""
from .oracle_client import OracleClient

supabase: OracleClient = OracleClient()


def get_supabase() -> OracleClient:
    """하위 호환 — 예전 시그니처 유지. Oracle 어댑터를 돌려준다."""
    return supabase
