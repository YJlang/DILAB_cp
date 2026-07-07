import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 로컬 dev: 네이티브 서버 전용 패키지는 번들하지 말고 런타임 require (Oracle 전환 복제본).
  serverExternalPackages: ["oracledb", "playwright", "playwright-core"],
};

export default nextConfig;
