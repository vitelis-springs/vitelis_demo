'use client';

import { useEffect } from 'react';

export default function StartupInitializer() {
  useEffect(() => {
    // Call startup endpoint when component mounts
    const initializeServer = async () => {
      try {
        console.log('🚀 Startup Component: Calling startup endpoint...');
        const response = await fetch('/api/startup');
        const data = await response.json();
        console.log('✅ Startup Component: Response:', data);
      } catch (error) {
        console.error('❌ Startup Component: Failed to initialize:', error);
      }
    };

    // Run initialization immediately
    initializeServer();
  }, []);

  // This component doesn't render anything
  return null;
}
