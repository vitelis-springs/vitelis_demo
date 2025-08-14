'use client';

import { Button, Switch } from 'antd';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { useState, useEffect } from 'react';

interface ThemeToggleProps {
  onThemeChange?: (isDark: boolean) => void;
}

export default function ThemeToggle({ onThemeChange }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check for saved theme preference or default to light theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDark(shouldUseDark);
    onThemeChange?.(shouldUseDark);
  }, [onThemeChange]);

  const handleThemeChange = (checked: boolean) => {
    setIsDark(checked);
    localStorage.setItem('theme', checked ? 'dark' : 'light');
    onThemeChange?.(checked);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <BulbOutlined style={{ color: isDark ? '#666' : '#1890ff' }} />
      <Switch
        checked={isDark}
        onChange={handleThemeChange}
        checkedChildren="🌙"
        unCheckedChildren="☀️"
      />
      <BulbFilled style={{ color: isDark ? '#1890ff' : '#666' }} />
    </div>
  );
}
