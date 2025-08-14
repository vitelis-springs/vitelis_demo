'use client';

import { useAuthStore } from '../../../../stores/auth-store';
import ChatHistory from '../../../../components/analyze/chat-history';

export default function HistoryPage() {
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
        Please log in to access the history page.
      </div>
    );
  }

  return <ChatHistory />;
}
