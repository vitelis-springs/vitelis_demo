'use client';

import { useAuth } from '../../hooks/useAuth';
import { Card, Typography, Space, Tag, Button } from 'antd';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export default function AuthStatus() {
  const { 
    isAuthenticated, 
    isLoggedIn, 
    user, 
    token, 
    logout 
  } = useAuth();

  return (
    <Card 
      style={{ 
        background: '#1f1f1f', 
        border: '1px solid #303030',
        marginBottom: '16px'
      }}
    >
      <Title level={4} style={{ color: '#58bfce', marginBottom: '16px' }}>
        🔐 Authentication Status
      </Title>
      
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text strong style={{ color: '#d9d9d9' }}>Status: </Text>
          <Tag color={isAuthenticated ? 'success' : 'error'}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </Tag>
        </div>
        
        <div>
          <Text strong style={{ color: '#d9d9d9' }}>Store State: </Text>
          <Tag color={isLoggedIn ? 'success' : 'error'}>
            {isLoggedIn ? 'Logged In' : 'Not Logged In'}
          </Tag>
        </div>
        
        {user && (
          <div>
            <Text strong style={{ color: '#d9d9d9' }}>User: </Text>
            <Text style={{ color: '#8c8c8c' }}>
              {user.email} ({user.role})
            </Text>
          </div>
        )}
        
        <div>
          <Text strong style={{ color: '#d9d9d9' }}>Token: </Text>
          <Text style={{ color: '#8c8c8c' }}>
            {token ? `${token.substring(0, 20)}...` : 'None'}
          </Text>
        </div>
        
        <div>
          <Text strong style={{ color: '#d9d9d9' }}>Company: </Text>
          <Text style={{ color: '#8c8c8c' }}>
            {user?.companyName || 'Not set'}
          </Text>
        </div>
        
        {isAuthenticated && (
          <Button 
            type="primary" 
            danger 
            icon={<LogoutOutlined />}
            onClick={logout}
            style={{ marginTop: '8px' }}
          >
            Logout
          </Button>
        )}
      </Space>
    </Card>
  );
}
