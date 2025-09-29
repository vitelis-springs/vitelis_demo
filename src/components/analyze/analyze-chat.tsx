'use client';

import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../ui/sidebar';
import { Layout, Card, Typography, Button } from 'antd';
import { useRouter } from 'next/navigation';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function AnalyzeChat() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: '#141414' }}>
        <Content style={{ 
          padding: '24px',
          background: '#141414',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Card
            style={{
              background: '#1f1f1f',
              border: '1px solid #303030',
              borderRadius: '12px',
              textAlign: 'center',
              padding: '40px',
              maxWidth: '600px'
            }}
          >
            <Title level={2} style={{ color: '#58bfce', marginBottom: '16px' }}>
              Analyze Chat
            </Title>
            <Text style={{ color: '#8c8c8c', marginBottom: '24px', display: 'block' }}>
              This feature is coming soon. For now, you can use the analysis quiz to get started.
            </Text>
            <Button
              type="primary"
              size="large"
              onClick={() => router.push('/analyze-quiz')}
              style={{
                background: '#58bfce',
                border: '1px solid #58bfce',
                borderRadius: '8px',
                height: '48px',
                padding: '0 24px',
              }}
            >
              Start Analysis Quiz
            </Button>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}

