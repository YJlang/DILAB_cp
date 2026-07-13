import type { NextConfig } from "next";

// Fully static site → export to `out/` for GitHub Pages.
// Set NEXT_PUBLIC_BASE_PATH="/<repo>" when serving from a project subpath.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
