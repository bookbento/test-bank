// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react({
      // Enable experimental React children parsing for better component compatibility
      experimentalReactChildren: true,
    }),
    tailwind({
      // Apply Tailwind to all pages
      applyBaseStyles: false, // We'll handle base styles ourselves
    }),
  ],
  // Enable client-side routing for SPA behavior
  output: 'static',
  // Internationalization configuration
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'th'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
  // Configure for better development experience
  vite: {
    // Optimize for React development
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
      ],
      // Exclude analytics to prevent content blocker issues
      exclude: ['firebase/analytics'],
    },
    // Configure for better error handling in development
    define: {
      // Ensure proper environment variables are available
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development'
      ),
    },
    // Handle SSR and client hydration properly
    ssr: {
      noExternal: ['firebase'],
    },
    // Build optimization
    build: {
      // Suppress bundle size warnings for known large chunks
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor libraries
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            motion: ['framer-motion'],
          },
        },
      },
    },
  },
});
