const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true // Temporarily set to true to disable PWA for all environments
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['geoattend-xihty.firebasestorage.app'],
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Handle the critical dependency warning
    // if (!isServer) {
    //   config.resolve.alias = {
    //     ...config.resolve.alias,
    //     '@supabase/realtime-js': false,
    //   };
    // }

    return config;
  },
  // Add experimental features to improve build
  experimental: {
    optimizeCss: false,
    scrollRestoration: true,
  },
  // Increase memory limit
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = withPWA(nextConfig); 