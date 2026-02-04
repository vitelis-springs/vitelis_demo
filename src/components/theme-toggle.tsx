'use client';

import { Switch } from 'antd';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { useEffect } from 'react';
import { useThemeStore } from '../stores/theme-store';

interface ThemeToggleProps {
  onThemeChange?: (isDark: boolean) => void;
}

export default function ThemeToggle({ onThemeChange }: ThemeToggleProps) {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const isDark = theme === 'dark';

  useEffect(() => {
    onThemeChange?.(isDark);
  }, [isDark, onThemeChange]);

  const handleThemeChange = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <BulbOutlined style={{ color: isDark ? '#666' : 'var(--chart-primary)' }} />
      <Switch
        checked={isDark}
        onChange={handleThemeChange}
        checkedChildren="🌙"
        unCheckedChildren="☀️"
      />
      <BulbFilled style={{ color: isDark ? 'var(--chart-primary)' : '#666' }} />
    </div>
  );
}
