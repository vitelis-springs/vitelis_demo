// app/providers.jsx

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConfigProvider, App } from 'antd';
import { useState } from 'react';
import { antdTheme, antdLightTheme } from '../../config/theme';

export default function Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  );

  // Use dark theme by default
  const [isDarkTheme] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={isDarkTheme ? antdTheme : antdLightTheme}>
        <App>
          {children}
        </App>
      </ConfigProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
