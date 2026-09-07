import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16 uses Turbopack by default.
  // pdfjs-dist is a client-only lib — it's loaded exclusively in
  // "use client" components, so no special bundler config is needed.
  // The worker is served as a static file from /public/pdf.worker.min.mjs.

  // Silence Turbopack's warning about having no explicit bundler config.
  turbopack: {},

  // Allow HMR (hot module replacement) from the local network IP
  // so that changes are picked up when accessing via network address.
  allowedDevOrigins: ["192.168.1.20"],
};

export default nextConfig;
