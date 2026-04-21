'use client';

import { useAuth } from '../../hooks/useAuth';
import {
  Layout,
  Menu,
  Typography,
  Card,
  Space,
  Avatar,
  Button,
  Tooltip,
} from 'antd';
import {
  HistoryOutlined,
  UserOutlined,
  LogoutOutlined,
  FileSearchOutlined,
  RadarChartOutlined,
  ShopOutlined,
  TeamOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  AuditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { MenuProps } from 'antd';
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_WIDTH_VAR,
} from './sidebar-layout';

const { Sider } = Layout;
const { Title } = Typography;
const SIDEBAR_STORAGE_KEY = 'app-sidebar-collapsed';

function getLogoUrl(logo: string | null | undefined): string | null {
  if (!logo) return null;
  if (logo.startsWith('http')) return logo;
  return `/api/s3/proxy?key=${encodeURIComponent(logo)}`;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const logoUrl = getLogoUrl(user?.logo);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (savedValue === '1') {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sidebarWidth = collapsed
      ? `${SIDEBAR_COLLAPSED_WIDTH}px`
      : `${SIDEBAR_EXPANDED_WIDTH}px`;

    document.documentElement.style.setProperty(SIDEBAR_WIDTH_VAR, sidebarWidth);
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0');

    return () => {
      document.documentElement.style.setProperty(
        SIDEBAR_WIDTH_VAR,
        `${SIDEBAR_EXPANDED_WIDTH}px`,
      );
    };
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  function getActiveKey(path: string): string {
    if (path.startsWith('/deep-dive')) return '/biz-miner';
    return path;
  }

  const menuItems: MenuProps['items'] = [
    {
      key: '/analyze-quiz',
      icon: <FileSearchOutlined style={{ fontSize: '18px' }} />,
      label: 'Request Report',
    },
    {
      key: '/analyze-sales-miner-quiz',
      icon: <RadarChartOutlined style={{ fontSize: '18px' }} />,
      label: 'SalesMiner Analysis',
    },
    ...(user?.role === 'admin'
      ? [{
          key: '/analyze-vitelis-sales-quiz',
          icon: <AuditOutlined style={{ fontSize: '18px' }} />,
          label: 'VitelisSales Analysis',
        }]
      : []),
    {
      key: '/history',
      icon: <HistoryOutlined style={{ fontSize: '18px' }} />,
      label: 'My Reports',
    },
    
    // Admin separator
    ...(user?.role === 'admin' ? [{
      type: 'divider' as const,
    }, {
      key: 'admin-section',
      type: 'group' as const,
      label: collapsed ? '' : 'ADMIN',
      children: [{
        key: '/biz-miner',
        icon: <DatabaseOutlined style={{ fontSize: '18px' }} />,
        label: 'Biz Miner',
      }, {
        key: '/sales-miner',
        icon: <ShopOutlined style={{ fontSize: '18px' }} />,
        label: 'Sales Miner',
      }, {
        key: '/vitelis-sales',
        icon: <LineChartOutlined style={{ fontSize: '18px' }} />,
        label: 'Vitelis Sales',
      }, {
        key: '/account',
        icon: <TeamOutlined style={{ fontSize: '18px' }} />,
        label: 'Users',
      }]
    }] : []),
    // {
    //   key: '/settings',
    //   icon: <SettingOutlined style={{ fontSize: '18px' }} />,
    //   label: 'Settings',
    // },
      ];
    
    const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  return (
    <Sider
      width={SIDEBAR_EXPANDED_WIDTH}
      collapsed={collapsed}
      collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
      trigger={null}
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
        <div
          debug-id="sidebar-header"
          style={{
            marginBottom: '24px',
            display: 'flex',
            flexDirection: collapsed ? 'column-reverse' : 'row',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ textAlign: collapsed ? 'center' : 'left', flex: 1 }}>
            <Image
              src={logoUrl || "/logo.png"}
              alt={logoUrl ? `${user?.companyName || 'Company'} Logo` : "Vitelis Logo"}
              width={collapsed ? 36 : 120}
              height={collapsed ? 36 : 40}
              style={{ objectFit: 'contain' }}
              unoptimized
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/logo.png";
              }}
            />
          </div>
          <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((value) => !value)}
              style={{
                color: '#d9d9d9',
                border: '1px solid #303030',
                background: '#262626',
                flexShrink: 0,
              }}
            />
          </Tooltip>
        </div>

        {/* Navigation Menu */}
        <div style={{ flex: 1 }}>
          <Menu
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={[getActiveKey(pathname)]}
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
          styles={{ body: { padding: collapsed ? '12px 8px' : '16px' } }}
        >
          <Space
            direction="vertical"
            size="middle"
            style={{ width: '100%', alignItems: collapsed ? 'center' : 'stretch' }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: '12px'
            }}>
              <Avatar
                size={collapsed? 20 :40}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#58bfce' }}
              />
              {!collapsed ? (
                <div>
                  <Title level={5} style={{ margin: 0, color: '#fff' }}>
                    {user?.email || 'User'}
                  </Title>
                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    Online
                  </div>
                </div>
              ) : null}
            </div>
            {collapsed ? (
              <Tooltip title="Logout">
                <Button
                  type="primary"
                  size='small'
                  danger
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                />
              </Tooltip>
            ) : (
              <Button
                type="primary"
               
                danger
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ width: '100%' }}
              >
                Logout
              </Button>
            )}
          </Space>
        </Card>
      </div>
    </Sider>
  );
}
