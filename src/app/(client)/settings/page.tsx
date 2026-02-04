'use client';
import { Card, Typography, Select, Layout } from 'antd';
import Sidebar from '../../../components/ui/sidebar';
import { useThemeStore } from '../../../stores/theme-store';

const { Title, Text } = Typography;
const { Option } = Select;

export default function SettingsPage() {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--app-bg-layout)' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: 'var(--app-bg-layout)' }}>
        <div style={{ padding: '24px' }}>
          <Card style={{ background: 'var(--chart-card-bg)', border: '1px solid var(--chart-border)', borderRadius: '12px' }}>
            <Title level={2} style={{ color: 'var(--chart-primary)', marginBottom: '24px' }}>
              Settings
            </Title>
            
            <div style={{ marginBottom: '24px' }}>
              <Text style={{ color: 'var(--chart-text)', fontSize: '16px', marginBottom: '8px', display: 'block' }}>
                Theme
              </Text>
              <Select
                value={theme}
                onChange={(value) => setTheme(value as 'dark' | 'light')}
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
