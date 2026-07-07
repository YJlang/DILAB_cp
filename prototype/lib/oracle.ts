/**
 * Oracle 26ai 연결 (node-oracledb thin + wallet) — Supabase 대체 데이터 계층.
 *
 * ⚠️ 로컬 dev 전용. node-oracledb 는 Node 런타임에서만 동작(Cloudflare 엣지 불가).
 * 이 복제본은 `next dev` 로만 구동하며 Cloudflare 배포하지 않는다.
 *
 * 자격은 server-only env: ORACLE_USER/PASSWORD/DSN/WALLET_DIR/WALLET_PASSWORD.
 */
import oracledb from "oracledb";

// CLOB(JSON·긴 text) 을 문자열로 바로 받기 → TS 에서 JSON.parse
oracledb.fetchAsString = [oracledb.CLOB];

let poolPromise: Promise<oracledb.Pool> | null = null;

function getPool(): Promise<oracledb.Pool> {
  if (poolPromise) return poolPromise;
  poolPromise = oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_DSN,
    walletLocation: process.env.ORACLE_WALLET_DIR,
    walletPassword: process.env.ORACLE_WALLET_PASSWORD,
    configDir: process.env.ORACLE_WALLET_DIR,
    poolMin: 0,
    poolMax: 4,
    poolTimeout: 60,
  });
  return poolPromise;
}

/** SQL 실행 → object row 배열. binds 는 named({k:v}) 또는 positional 지원. */
export async function q<T = Record<string, unknown>>(
  sql: string,
  binds: oracledb.BindParameters = {},
): Promise<T[]> {
  const pool = await getPool();
  const conn = await pool.getConnection();
  try {
    const r = await conn.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: true, // SELECT 무해, DML(INSERT/UPDATE)은 즉시 커밋
    });
    return (r.rows ?? []) as T[];
  } finally {
    await conn.close();
  }
}

/**
 * IN-list 를 JSON_TABLE 로 안전하게 (길이 제한·바인드 폭발 회피).
 * 사용: `... WHERE id IN (${jsonIn("ids")})` + binds { ids: JSON.stringify(arr) }
 */
export function jsonIn(bindName: string, colType = "VARCHAR2(36)"): string {
  return `SELECT v FROM JSON_TABLE(:${bindName}, '$[*]' COLUMNS (v ${colType} PATH '$'))`;
}
