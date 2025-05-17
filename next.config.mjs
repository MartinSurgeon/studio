/** @type {import('next').NextConfig} */
import nextPWA from 'next-pwa';

const nextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

export default withPWA(nextConfig); 