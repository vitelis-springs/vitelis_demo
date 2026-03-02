'use client';

import VitelisSalesQuiz from '@components/vitelis-sales/VitelisSalesQuiz';
import { useAuth } from '../../../hooks/useAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Result, Spin } from 'antd';

export default function AnalyzeVitelisSalesQuizPage() {
  const { isLoggedIn, isAdmin } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, isLoading, router]);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#141414',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  if (!isAdmin()) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#141414',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Result
          status="403"
          title="Admin access required"
          subTitle="You do not have permission to view VitelisSales analysis."
          extra={
            <Button type="primary" onClick={() => router.push('/history')}>
              Go to My Reports
            </Button>
          }
        />
      </div>
    );
  }

  return <VitelisSalesQuiz onComplete={() => {}} />;
}
