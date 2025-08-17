'use client';

import dynamic from 'next/dynamic';

const HomeClient = dynamic(() => import('./_home-client'), { 
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading application...</p>
      </div>
    </div>
  )
});

export default function Home() {
  return <HomeClient />;
}