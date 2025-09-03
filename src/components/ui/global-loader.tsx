'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import ClientOnly from './client-only';

export default function GlobalLoader() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentPathname, setCurrentPathname] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Only show loader if we have a previous pathname and it's different
    if (currentPathname && currentPathname !== pathname) {
      setIsNavigating(true);

      // Hide loader after a short delay to prevent flickering
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 300);

      return () => clearTimeout(timer);
    }

    // Update current pathname
    setCurrentPathname(pathname);
  }, [pathname, currentPathname]);

  return (
    <ClientOnly>
      {isNavigating && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(20, 20, 20, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              background: '#1f1f1f',
              border: '1px solid #303030',
              borderRadius: '12px',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            {/* Custom spinner without Ant Design */}
            <div
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid #1890ff',
                borderTop: '3px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <div
              style={{
                color: '#d9d9d9',
                fontSize: '16px',
                fontWeight: '500',
                textAlign: 'center',
              }}
            >
              Loading page...
            </div>
            <div
              style={{
                color: '#8c8c8c',
                fontSize: '14px',
                textAlign: 'center',
                maxWidth: '300px',
              }}
            >
              Please wait while we load the page...
            </div>
          </div>
        </div>
      )}
    </ClientOnly>
  );
}
