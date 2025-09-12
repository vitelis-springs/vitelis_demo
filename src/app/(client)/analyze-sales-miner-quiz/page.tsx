'use client';

import { useAuthStore } from '../../../stores/auth-store';
import AnalyzeSalesMinerQuiz from '@components/analize-sales-miner/AnalyzeSalesMinerQuiz';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

export default function AnalyzeSalesMinerQuizPage() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait a bit for auth state to load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/');
    }
  }, [isLoggedIn, router, isLoading]);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#141414',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return null; // Don't render anything while redirecting
  }

  return <AnalyzeSalesMinerQuiz onComplete={() => {}} />;
}
