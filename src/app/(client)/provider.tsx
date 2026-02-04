// app/providers.jsx

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ConfigProvider, App } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { antdTheme, antdLightTheme } from '../../config/theme';
import { useThemeStore } from '../../stores/theme-store';

export default function Provider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

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

  const isDarkTheme = theme === 'dark';

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = isDarkTheme ? 'dark' : 'light';
  }, [theme, isDarkTheme]);

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
