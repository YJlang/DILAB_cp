<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# DILAB prototype — 배포 메모

## 환경 변수
- **production**: `wrangler.jsonc` 의 `vars` 블록이 source-of-truth. dashboard 에서 직접 추가하지 말 것 (`keep_vars: true` 가 있긴 하지만 변수는 이 파일에 박아 일관성 유지).
- **로컬 dev**: `.env.local` (gitignore). 템플릿은 `.env.local.example`.
- **`NEXT_PUBLIC_` 접두사 절대 사용 X.** Next.js 가 build 시점에 inline → Cloudflare Workers runtime vars 가 안 잡힌다. 모든 환경 변수는 *server-only* (route handlers / Server Components / SSR) 에서만 사용.

## 배포 명령
```powershell
npm run deploy   # = opennextjs-cloudflare build && wrangler deploy
```

`wrangler deploy` 만 단독으로 돌리지 말 것 — `.open-next/` 가 stale 한 채로 올라가면 production 에서 `ChunkLoadError` 가 난다.

## cloudflared Quick Tunnel
ai-worker 를 PC 에서 띄우고 Workers 가 fetch 하도록 노출하는 채널. URL 은 **재기동마다 바뀐다** — 바뀌면 `wrangler.jsonc` 의 `vars.AI_WORKER_URL` 갱신 → `npm run deploy`.

자세한 운영 절차: [`../docs/OPERATIONS.md`](../docs/OPERATIONS.md).

---

## ⚠️ 디자인·UI 리팩토링 시 절대 건드리지 말 것

UI 만 손대고 배포하면 Cloudflare AI / Modal / Supabase 매핑은 자동 유지된다. 단 아래는 *핵심* 이라 무심코 건드리면 빌드가 깨지거나 사이트 전체가 500 으로 다운된다.

1. **`wrangler.jsonc` 의 `vars` 블록** — `MODAL_TRIGGER_URL`, `MODAL_COMPARE_URL`, `SUPABASE_*`, `DEEPSEEK_*`, `LLM_MODEL`. `MODAL_PROXY_TOKEN` 만 secret.
2. **`lib/supabase.ts` 의 lazy Proxy 패턴**. 무심코 `export const supabase = createClient(url, key)` 같은 즉시 호출로 되돌리면 build 시점에 `"supabaseUrl is required"` 로 죽음. *getter 안에서만 createClient*.
3. **`lib/cf-env.ts` + `lib/embeddings.ts` + `lib/rag.ts`** — Cloudflare AI binding (BGE-M3) 호출 path. 임의로 ai-worker fetch 로 되돌리지 말 것.
4. **server-only 환경 변수 참조**: `NEXT_PUBLIC_` 접두사 *절대* 다시 붙이지 말 것 (DefinePlugin build-time inline → Cloudflare runtime vars 안 잡힘).
5. **`.env.local` 키 이름** — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AI_WORKER_URL` *(로컬 dev 용 — 운영엔 미사용)*. `NEXT_PUBLIC_` 추가 X.

## 🚨 RSC 함정 — Server Component 에서 `cfEnv()` 호출 금지

2026-05-28 Phase 2 검증 중 발견:

- **Server Component** (예: `app/compare/[a]/[b]/page.tsx`, `app/products/[slug]/page.tsx`) 에서 `cfEnv()` (= `getCloudflareContext()` sync) 를 호출하면 **모든 페이지가 500** 으로 깨진다. 에러:
  ```
  ⨯ TypeError: components.ComponentMod.handler is not a function
  ```
- 이유: RSC evaluation 시점에 throw → worker.js bundle 의 handler registry 전체가 undefined → 모든 페이지 영향.

**규칙**:

| 사용 위치 | 환경 변수 접근 |
|---|---|
| Server Component (`app/**/page.tsx`, `layout.tsx`) | **`process.env.NAME` 만** |
| Route Handler (`app/api/**/route.ts`) | `cfEnv()` OK (Phase 1 의 `/api/ask` 가 검증) |
| Server Action | `cfEnv()` OK |
| Client Component (`"use client"`) | `process.env.NEXT_PUBLIC_*` 만 (현재 DILAB 는 사용 X) |
| AI binding (객체) | 무조건 `cfEnv().AI` — `lib/embeddings.ts` 에 wrap |

Modal endpoint URL / Modal proxy token / DeepSeek 키 같은 *string* 값은 *Server Component 에서도* `process.env.NAME` 으로 접근 가능 (OpenNext 가 자동 매핑).

## ✅ 자유롭게 손대도 되는 영역

- `app/` 의 `page.tsx` / `layout.tsx` / 새 라우트 / 새 페이지 추가
- `components/` 모든 UI 컴포넌트 (RadarChart, JourneyMap, AskBox, CitationCard 등)
- Tailwind 클래스, `globals.css`, 컬러 토큰, 폰트, 간격, 애니메이션
- Recharts 옵션 / 차트 시각 표현 / SVG 마크업
- `lib/types.ts` (단 데이터 모델 변경은 `ai-worker/src/` 와 함께)

디자인 변경 후 배포는 항상:
```powershell
npm run deploy
```
→ ai-worker / Supabase / tunnel 매핑 그대로, UI 만 새 버전으로 갱신.

(싱클리 UX/UI 시각적 모방 금지 — `CLAUDE.md` 2.1 의 hard rule.)
