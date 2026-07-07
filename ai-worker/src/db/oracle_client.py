"""Oracle 26ai 백엔드 — supabase-py 클라이언트의 **부분집합**을 흉내내는 어댑터.

분석 파이프라인(auto_ingest / label / compute)이 실제로 호출하는 체이닝만 지원한다:
    .table(t).select(cols)[.eq/.neq/.in_/.range/.single/.limit].execute()   → .data
    .table(t).insert(rows)[.select(cols)].execute()                          → .data (생성 id 포함)
    .table(t).upsert(rows, on_conflict=, ignore_duplicates=).execute()       → MERGE
    .table(t).delete().eq(col, val).execute()

Supabase 처럼 JSON/배열 컬럼은 쓸 때 json.dumps, 읽을 때 json.loads 하여
파이프라인이 native dict/list 를 주고받게 한다. 값은 항상 바인드, 식별자는 화이트리스트.
python-oracledb thin+wallet, 모듈 레벨 커넥션 재사용(락으로 직렬화).
"""
from __future__ import annotations

import datetime
import json
import os
import re
import threading
import uuid
from typing import Any

import oracledb
from dotenv import load_dotenv

load_dotenv("/Users/junha/Desktop/DILAB 복사본/.env")
oracledb.defaults.fetch_lobs = False  # CLOB → str 로 바로 받기

Row = dict[str, Any]

# ─── 식별자 안전장치 ──────────────────────────────────────────────────────────
_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

TABLES = frozenset(
    {
        "domains",
        "products",
        "documents",
        "chunks",
        "classifications",
        "sentiments",
        "journey_assignments",
        "ratings",
        "topics",
        "topic_assignments",
        "ask_queries",
        "analysis_jobs",
    }
)

# 쓸 때 json.dumps / 읽을 때 json.loads 대상 (Supabase jsonb·배열 컬럼)
JSON_COLUMNS: dict[str, frozenset[str]] = {
    "products": frozenset({"metadata"}),
    "domains": frozenset({"categories", "rating_axes", "journey_stages", "sources_config"}),
    "documents": frozenset({"metadata"}),
    "ratings": frozenset({"evidence_chunk_ids"}),
    "topics": frozenset({"keywords"}),
    "analysis_jobs": frozenset({"progress", "result"}),
}

# 'YYYY-MM-DD' 문자열 → DATE 로 변환할 컬럼
DATE_COLUMNS: dict[str, frozenset[str]] = {"documents": frozenset({"published_date"})}

# id PK 가 있어 INSERT 시 없으면 uuid4 를 생성해줘야 하는 테이블
ID_TABLES = frozenset(
    {"chunks", "documents", "products", "ratings", "classifications", "analysis_jobs", "topics",
     "ask_queries"}
)


def _check_ident(name: str) -> str:
    if not _IDENT.match(name):
        raise ValueError(f"unsafe identifier: {name!r}")
    return name


def _check_table(name: str) -> str:
    if name not in TABLES:
        raise ValueError(f"unknown table: {name!r}")
    return name


def _parse_cols(cols: str) -> list[str]:
    if cols.strip() == "*":
        return ["*"]
    return [_check_ident(c.strip()) for c in cols.split(",") if c.strip()]


# ─── 커넥션 (모듈 싱글턴 + 락) ────────────────────────────────────────────────
_conn: oracledb.Connection | None = None
_lock = threading.RLock()


def _get_conn() -> oracledb.Connection:
    global _conn
    if _conn is None:
        _conn = oracledb.connect(
            user=os.environ["ORACLE_USER"],
            password=os.environ["ORACLE_PASSWORD"],
            dsn=os.environ["ORACLE_DSN"],
            config_dir=os.environ["ORACLE_WALLET_DIR"],
            wallet_location=os.environ["ORACLE_WALLET_DIR"],
            wallet_password=os.environ["ORACLE_WALLET_PASSWORD"],
        )
        # executemany 로 같은 테이블에 MERGE/INSERT 를 연달아 할 때 parallel DML 이 켜져 있으면
        # ORA-12838(같은 트랜잭션 내 병렬 수정 후 재수정 불가)가 난다 → 세션 단위로 끈다.
        with _conn.cursor() as _c:
            _c.execute("ALTER SESSION DISABLE PARALLEL DML")
    return _conn


# ─── 값 직렬화/역직렬화 ──────────────────────────────────────────────────────
def _serialize(table: str, row: Row) -> Row:
    js = JSON_COLUMNS.get(table, frozenset())
    dt = DATE_COLUMNS.get(table, frozenset())
    out: Row = {}
    for k, v in row.items():
        _check_ident(k)
        if v is None:
            out[k] = None
        elif k in js:
            out[k] = json.dumps(v, ensure_ascii=False)
        elif k in dt and isinstance(v, str):
            out[k] = datetime.date.fromisoformat(v)
        elif isinstance(v, bool):  # NUMBER(1) 로: bool 은 int 서브클래스라 먼저 처리
            out[k] = int(v)
        else:
            out[k] = v
    return out


def _decode(table: str, row: Row) -> Row:
    js = JSON_COLUMNS.get(table, frozenset())
    for k in js:
        v = row.get(k)
        if isinstance(v, str):
            try:
                row[k] = json.loads(v)
            except json.JSONDecodeError:
                pass
    return row


class _Result:
    __slots__ = ("data",)

    def __init__(self, data: Any) -> None:
        self.data = data


class _Query:
    """supabase-py PostgrestQueryBuilder 의 최소 재현."""

    def __init__(self, client: "OracleClient", table: str) -> None:
        self._c = client
        self._t = _check_table(table)
        self._op: str | None = None
        self._cols = "*"
        self._rows: list[Row] | None = None
        self._filters: list[tuple[str, str, Any]] = []
        self._range: tuple[int, int] | None = None
        self._single = False
        self._limit: int | None = None
        self._on_conflict: list[str] = []
        self._ignore_dupes = False

    # -- 동사 --
    def select(self, cols: str = "*") -> "_Query":
        if self._op is None:
            self._op = "select"
        self._cols = cols
        return self

    def insert(self, rows: Row | list[Row]) -> "_Query":
        self._op = "insert"
        self._rows = [rows] if isinstance(rows, dict) else list(rows)
        return self

    def upsert(
        self, rows: Row | list[Row], *, on_conflict: str = "", ignore_duplicates: bool = False
    ) -> "_Query":
        self._op = "upsert"
        self._rows = [rows] if isinstance(rows, dict) else list(rows)
        self._on_conflict = [_check_ident(c.strip()) for c in on_conflict.split(",") if c.strip()]
        self._ignore_dupes = ignore_duplicates
        return self

    def delete(self) -> "_Query":
        self._op = "delete"
        return self

    # -- 필터/한정 --
    def eq(self, col: str, val: Any) -> "_Query":
        self._filters.append(("=", _check_ident(col), val))
        return self

    def neq(self, col: str, val: Any) -> "_Query":
        self._filters.append(("!=", _check_ident(col), val))
        return self

    def in_(self, col: str, vals: Any) -> "_Query":
        self._filters.append(("in", _check_ident(col), list(vals)))
        return self

    def range(self, start: int, end: int) -> "_Query":
        self._range = (int(start), int(end))  # end 포함 (PostgREST 규약)
        return self

    def single(self) -> "_Query":
        self._single = True
        return self

    def limit(self, n: int) -> "_Query":
        self._limit = int(n)
        return self

    def execute(self) -> _Result:
        with _lock:
            return self._c._execute(self)


class OracleClient:
    """supabase Client 의 drop-in 대체(부분집합). `.table(name)` 만 노출."""

    def table(self, name: str) -> _Query:
        return _Query(self, name)

    # 파이프라인의 in-DB 임베딩 등 raw SQL 용 (supabase 판엔 없던 확장).
    def run_sql(self, sql: str, binds: dict[str, Any] | None = None, *, commit: bool = True) -> list[Row]:
        with _lock:
            conn = _get_conn()
            with conn.cursor() as cur:
                cur.execute(sql, binds or {})
                rows: list[Row] = []
                if cur.description:
                    cols = [d.name.lower() for d in cur.description]
                    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
                if commit:
                    conn.commit()
            return rows

    # ── 실행 디스패치 ──
    def _execute(self, q: _Query) -> _Result:
        if q._op == "select":
            return self._do_select(q)
        if q._op == "insert":
            return self._do_write(q, upsert=False)
        if q._op == "upsert":
            return self._do_write(q, upsert=True)
        if q._op == "delete":
            return self._do_delete(q)
        raise ValueError(f"no operation set for table {q._t!r}")

    def _where(self, q: _Query, binds: dict[str, Any]) -> str:
        clauses: list[str] = []
        for i, (op, col, val) in enumerate(q._filters):
            if op == "in":
                if not val:
                    return "1 = 0"  # 빈 IN → 결과 없음
                names = []
                for j, v in enumerate(val):
                    b = f"f{i}_{j}"
                    binds[b] = v
                    names.append(f":{b}")
                clauses.append(f"{col} IN ({', '.join(names)})")
            else:
                b = f"f{i}"
                binds[b] = val
                clauses.append(f"{col} {op} :{b}")
        return " AND ".join(clauses) if clauses else "1 = 1"

    def _do_select(self, q: _Query) -> _Result:
        cols = _parse_cols(q._cols)
        proj = "*" if cols == ["*"] else ", ".join(cols)
        binds: dict[str, Any] = {}
        where = self._where(q, binds)
        sql = f"SELECT {proj} FROM {q._t} WHERE {where}"

        if q._range is not None:
            order = cols[0] if cols and cols[0] != "*" else "1"
            start, end = q._range
            sql += f" ORDER BY {order} OFFSET {start} ROWS FETCH NEXT {end - start + 1} ROWS ONLY"
        elif q._limit is not None:
            sql += f" FETCH FIRST {q._limit} ROWS ONLY"
        elif q._single:
            sql += " FETCH FIRST 1 ROWS ONLY"

        conn = _get_conn()
        with conn.cursor() as cur:
            cur.execute(sql, binds)
            names = [d.name.lower() for d in cur.description]
            rows = [_decode(q._t, dict(zip(names, r))) for r in cur.fetchall()]

        if q._single:
            if not rows:
                raise ValueError(f"single() found no rows in {q._t}")
            return _Result(rows[0])
        return _Result(rows)

    def _do_write(self, q: _Query, *, upsert: bool) -> _Result:
        rows = q._rows or []
        if not rows:
            return _Result([])

        returned: list[Row] = []
        prepared: list[Row] = []
        for r in rows:
            r2 = dict(r)
            if q._t in ID_TABLES and "id" not in r2:
                r2["id"] = str(uuid.uuid4())
            returned.append(r2)
            prepared.append(_serialize(q._t, r2))

        all_cols: list[str] = []
        for p in prepared:
            for k in p:
                if k not in all_cols:
                    all_cols.append(k)
        binds_list = [{c: p.get(c) for c in all_cols} for p in prepared]

        conn = _get_conn()
        with conn.cursor() as cur:
            if upsert:
                sql = self._merge_sql(q._t, all_cols, q._on_conflict, q._ignore_dupes)
            else:
                col_list = ", ".join(all_cols)
                val_list = ", ".join(f":{c}" for c in all_cols)
                sql = f"INSERT INTO {q._t} ({col_list}) VALUES ({val_list})"
            cur.executemany(sql, binds_list)
            conn.commit()

        return _Result(returned)

    def _merge_sql(
        self, table: str, cols: list[str], on_conflict: list[str], ignore_dupes: bool
    ) -> str:
        keys = on_conflict or ["id"]
        src = ", ".join(f":{c} AS {c}" for c in cols)
        on = " AND ".join(f"t.{k} = s.{k}" for k in keys)
        insert_cols = ", ".join(cols)
        insert_vals = ", ".join(f"s.{c}" for c in cols)
        merge = (
            f"MERGE INTO {table} t USING (SELECT {src} FROM dual) s ON ({on}) "
        )
        if not ignore_dupes:
            upd_cols = [c for c in cols if c not in keys]
            if upd_cols:
                sets = ", ".join(f"t.{c} = s.{c}" for c in upd_cols)
                merge += f"WHEN MATCHED THEN UPDATE SET {sets} "
        merge += f"WHEN NOT MATCHED THEN INSERT ({insert_cols}) VALUES ({insert_vals})"
        return merge

    def _do_delete(self, q: _Query) -> _Result:
        binds: dict[str, Any] = {}
        where = self._where(q, binds)
        conn = _get_conn()
        with conn.cursor() as cur:
            cur.execute(f"DELETE FROM {q._t} WHERE {where}", binds)
            conn.commit()
        return _Result([])
