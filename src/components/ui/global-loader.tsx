'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

export default function GlobalLoader() {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Show loader when pathname changes (navigation)
    setIsNavigating(true);

    // Hide loader after a short delay to prevent flickering
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [pathname]);

  // Show loader on initial page load
  useEffect(() => {
    const handleStart = () => {
      setIsNavigating(true);
    };

    const handleComplete = () => {
      setIsNavigating(false);
    };

    // Listen for route change start
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleStart);
      
      // Listen for Next.js route changes
      const handleRouteChange = () => {
        setIsNavigating(true);
      };

      const handleRouteComplete = () => {
        setIsNavigating(false);
      };

      // Add event listeners for route changes
      window.addEventListener('popstate', handleRouteChange);
      
      // Use a custom event for route changes
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      history.pushState = function(...args) {
        originalPushState.apply(history, args);
        handleRouteChange();
      };
      
      history.replaceState = function(...args) {
        originalReplaceState.apply(history, args);
        handleRouteChange();
      };

      return () => {
        window.removeEventListener('beforeunload', handleStart);
        window.removeEventListener('popstate', handleRouteChange);
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
      };
    }
  }, []);

  if (!isNavigating) return null;

  return (
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
        <Spin
          indicator={
            <LoadingOutlined
              style={{
                fontSize: '32px',
                color: '#1890ff',
              }}
              spin
            />
          }
        />
        <div
          style={{
            color: '#d9d9d9',
            fontSize: '16px',
            fontWeight: 500,
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
  );
}
