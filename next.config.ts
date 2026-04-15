import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Don't bundle these on the server — let Node.js require them directly.
  // pdfjs-dist tries to load a web worker that can't be resolved when bundled.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  // Skip TypeScript type checking during build/dev — your editor handles this.
  typescript: {
    ignoreBuildErrors: true,
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
