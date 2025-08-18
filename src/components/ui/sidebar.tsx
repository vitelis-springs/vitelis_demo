'use client';

import { useAuthStore } from '../../stores/auth-store';
import {
  Layout,
  Menu,
  Typography,
  Card,
  Space,
  Avatar,
  Button,
} from 'antd';
import {
  MessageOutlined,
  HistoryOutlined,
  UserOutlined,
  LogoutOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

const { Sider } = Layout;
const { Title } = Typography;

export default function Sidebar() {
  const { email, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const menuItems = [
    // {
    //   key: '/analyze',
    //   icon: <MessageOutlined style={{ fontSize: '18px' }} />,
    //   label: 'Analyze Chat',
    // },
    {
      key: '/analyze-quiz',
      icon: <FileTextOutlined style={{ fontSize: '18px' }} />,
      label: 'Analyze Quiz',
    },
    {
      key: '/history',
      icon: <HistoryOutlined style={{ fontSize: '18px' }} />,
      label: 'My Reports',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  return (
    <Sider
      width={280}
      style={{
        background: '#1f1f1f',
        borderRight: '1px solid #303030',
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0,
        zIndex: 1000,
      }}
    >
      <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', margin: 0 }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <Image
            src="/logo.png"
            alt="Vitelis Logo"
            width={120}
            height={40}
            style={{ objectFit: 'contain' }}
          />
        </div>

        {/* Navigation Menu */}
        <div style={{ flex: 1 }}>
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#d9d9d9',
              fontSize: '16px',
            }}
            theme="dark"
          />
        </div>

        {/* User Info and Logout - Combined at bottom */}
        <Card
          style={{
            background: '#262626',
            border: '1px solid #434343',
            marginTop: 'auto',
          }}
          bodyStyle={{ padding: '16px' }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Avatar
                size={40}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#58bfce' }}
              />
              <div>
                <Title level={5} style={{ margin: 0, color: '#fff' }}>
                  {email}
                </Title>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                  Online
                </div>
              </div>
            </div>
            <Button
              type="primary"
              danger
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{ width: '100%' }}
            >
              Logout
            </Button>
          </Space>
        </Card>
      </div>
    </Sider>
  );
}
