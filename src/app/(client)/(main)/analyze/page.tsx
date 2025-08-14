'use client';

import { useAuthStore } from '../../../../stores/auth-store';
import AnalyzeChat from '../../../../components/analyze/analyze-chat';

export default function AnalyzePage() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  if (!isLoggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#141414',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#d9d9d9'
      }}>
        Please log in to access the analyze page.
      </div>
    );
  }

  return <AnalyzeChat />;
}
