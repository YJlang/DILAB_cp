/**
 * Cloudflare Workers env 접근 — bindings 와 secrets 통합 wrapper.
 *
 * OpenNext 의 getCloudflareContext() 가 worker 안에서 env 객체를 노출. 우리는
 * 이걸 타입 좁힌 채로 한 곳에서 꺼내 쓴다. (process.env 로도 string 값은
 * 잡히지만, AI binding 같은 객체 바인딩은 getCloudflareContext 필수.)
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";

type WorkersAiResponse = {
  shape?: number[];
  data?: number[][];
  pooling?: string;
};

export type CfEnv = {
  AI: {
    run: (
      model: string,
      args: { text: string | string[] },
    ) => Promise<WorkersAiResponse>;
  };
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_BASE_URL: string;
  LLM_MODEL: string;
  MODAL_TRIGGER_URL: string;
  MODAL_COMPARE_URL: string;
  MODAL_REPORT_URL: string;
  MODAL_PROXY_TOKEN: string;
};

export function cfEnv(): CfEnv {
  return getCloudflareContext().env as unknown as CfEnv;
}
