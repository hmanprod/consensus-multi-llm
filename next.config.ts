import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

function getBuildNumber(): string {
  try {
    const value = readFileSync("build-number.txt", "utf8").trim();
    if (value) return value;
  } catch {
    // fichier absent : on retombe sur le comptage git local
  }
  try {
    return execSync("git rev-list --count HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "0";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? "0.0.0",
    NEXT_PUBLIC_BUILD_NUMBER: getBuildNumber(),
  },
};

export default nextConfig;