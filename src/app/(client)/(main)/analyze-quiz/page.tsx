'use client';

import { useAuthStore } from '../../../../stores/auth-store';
import AnalyzeQuiz from '../../../../components/AnalyzeQuiz';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin, message } from 'antd';

export default function AnalyzeQuizPage() {
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

  const handleQuizComplete = (data: any) => {
    console.log('Quiz completed with data:', data);
    message.success('Analysis request submitted successfully!');
    // You can add additional logic here, like redirecting to results page
  };

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

  return <AnalyzeQuiz onComplete={handleQuizComplete} />;
}
