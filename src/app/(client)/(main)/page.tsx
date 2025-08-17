'use client';

import { useAuthStore } from '../../../stores/auth-store';
import LoginForm from '../../../components/auth/login-form';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const router = useRouter();

  useEffect(() => {
    if (isLoggedIn) {
      router.push('/analyze-quiz');
    }
  }, [isLoggedIn, router]);

  if (!isLoggedIn) {
    return <LoginForm />;
  }

  // Show loading while redirecting
  return (
    <div style={{
      minHeight: '100vh',
      background: '#141414',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#d9d9d9'
    }}>
      Redirecting to analyze page...
    </div>
  );
}
