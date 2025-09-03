'use client';

import React, { useState } from 'react';
import { Card, Typography, Select, Layout } from 'antd';
import Sidebar from '../../../components/ui/sidebar';

const { Title, Text } = Typography;
const { Option } = Select;

export default function SettingsPage() {
  const [theme, setTheme] = useState('dark');

  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: '#141414' }}>
        <div style={{ padding: '24px' }}>
          <Card style={{ background: '#1f1f1f', border: '1px solid #303030', borderRadius: '12px' }}>
            <Title level={2} style={{ color: '#58bfce', marginBottom: '24px' }}>
              Settings
            </Title>
            
            <div style={{ marginBottom: '24px' }}>
              <Text style={{ color: '#d9d9d9', fontSize: '16px', marginBottom: '8px', display: 'block' }}>
                Theme
              </Text>
              <Select
                value={theme}
                onChange={setTheme}
                style={{ width: '200px' }}
                size="large"
              >
                <Option value="dark">Dark</Option>
                <Option value="light">Light</Option>
              </Select>
            </div>
          </Card>
        </div>
      </Layout>
    </Layout>
  );
}
