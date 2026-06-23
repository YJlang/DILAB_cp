from supabase import Client, create_client

from ..config import settings


def get_supabase() -> Client:
    """service_role 권한의 Supabase 클라이언트. 워커 전용 (RLS 우회)."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


supabase: Client = get_supabase()
