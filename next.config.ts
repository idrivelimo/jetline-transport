import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer must be required at runtime, not traced into the
  // bundle: it carries native font handling that a bundler mangles.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
