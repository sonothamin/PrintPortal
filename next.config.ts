import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/((?!(?:_next|api|static)).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com;",
              "font-src 'self' fonts.gstatic.com;",
              "img-src 'self' blob: data: *.supabase.co;",
              "connect-src 'self' *.supabase.co wss://*.supabase.co;",
              "frame-src 'self' blob:;",
              "frame-ancestors 'none';",
            ].join(' '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
