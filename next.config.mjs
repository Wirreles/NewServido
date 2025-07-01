/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/mercadopago/:path*',
        destination: 'http://localhost:3005/api/mercadopago/:path*',
        basePath: false
      }
    ]
  }
}

export default nextConfig
