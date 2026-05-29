/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Server-side rewrite — Next.js fetches the API on its own host. Always
    // safe to use 127.0.0.1 since both processes run on the same machine in
    // dev, regardless of which IP the browser used to reach Next.
    const apiOrigin = process.env.API_ORIGIN ?? 'http://127.0.0.1:4000';
    return [{ source: '/api/:path*', destination: `${apiOrigin}/api/:path*` }];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.jamendo.com' },
      { protocol: 'https', hostname: 'usercontent.jamendo.com' },
      { protocol: 'https', hostname: '**.saavncdn.com' },
      { protocol: 'https', hostname: '**.jiosaavn.com' },
    ],
  },
};
export default nextConfig;
