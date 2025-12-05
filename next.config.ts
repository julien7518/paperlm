import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

module.exports = {
  allowedDevOrigins: ["localhost", "10.0.0.*", "10.1.224.*"],
};

export default nextConfig;
