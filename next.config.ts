import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Prevent Next from using a parent folder lockfile as the workspace root.
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
