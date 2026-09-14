import type { NextConfig } from "next";
const development = process.env.NODE_ENV === "development";
const config: NextConfig = {
  output: development ? undefined : "export",
  images: { unoptimized: true },
  ...(development
    ? {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: "http://localhost:8787/api/:path*",
            },
          ];
        },
      }
    : {}),
};
export default config;
