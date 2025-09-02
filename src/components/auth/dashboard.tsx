'use client';

import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../ui/sidebar';
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Avatar,
  Tag,
  List,
  Descriptions,
  Progress,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

export default function Dashboard() {
  const { user } = useAuth();

  const recentActivities = [
    {
      title: 'Login successful',
      description: 'You logged in to your account',
      time: 'Just now',
      icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    },
    {
      title: 'Session started',
      description: 'New session created',
      time: '2 minutes ago',
      icon: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
    },
    {
      title: 'Settings updated',
      description: 'Theme preferences saved',
      time: '5 minutes ago',
      icon: <SettingOutlined style={{ color: '#722ed1' }} />,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: '#141414' }}>
        <Content style={{ 
          padding: '24px',
          background: '#141414',
          minHeight: '100vh'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={2} style={{ margin: 0, color: '#58bfce' }}>
                Welcome back, {user?.email || 'User'}!
              </Title>
              <Paragraph style={{ margin: '8px 0 0 0', color: '#8c8c8c' }}>
                Here's what's happening with your account today.
              </Paragraph>
            </div>

            {/* Stats Cards */}
            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
              <Col xs={24} sm={12} lg={8}>
                <Card style={{ background: '#1f1f1f', border: '1px solid #303030' }}>
                  <Statistic
                    title={<span style={{ color: '#d9d9d9' }}>Active Sessions</span>}
                    value={1}
                    prefix={<LockOutlined style={{ color: '#58bfce' }} />}
                    valueStyle={{ color: '#58bfce' }}
                  />
                  <Text type="secondary" style={{ color: '#8c8c8c' }}>Current session active</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Card style={{ background: '#1f1f1f', border: '1px solid #303030' }}>
                  <Statistic
                    title={<span style={{ color: '#d9d9d9' }}>Storage Used</span>}
                    value={2.4}
                    suffix="GB"
                    prefix={<DatabaseOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Progress 
                    percent={24} 
                    size="small" 
                    style={{ marginTop: '8px' }}
                    strokeColor="#52c41a"
                    trailColor="#303030"
                  />
                  <Text type="secondary" style={{ color: '#8c8c8c' }}>Out of 10 GB available</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <Card style={{ background: '#1f1f1f', border: '1px solid #303030' }}>
                  <Statistic
                    title={<span style={{ color: '#d9d9d9' }}>System Status</span>}
                    value="Online"
                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a', fontSize: '24px' }}
                  />
                  <Text type="secondary" style={{ color: '#8c8c8c' }}>All systems operational</Text>
                </Card>
              </Col>
            </Row>

            {/* Main Content */}
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <Card 
                  title={<span style={{ color: '#d9d9d9' }}>Authentication Details</span>}
                  style={{ background: '#1f1f1f', border: '1px solid #303030' }}
                  size="default"
                >
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label={<span style={{ color: '#d9d9d9' }}>Email</span>}>
                      <Text strong style={{ color: '#fff' }}>{email}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#d9d9d9' }}>Authentication</span>}>
                      <Tag color="blue">Client-side with Zustand</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#d9d9d9' }}>Storage</span>}>
                      <Tag color="green">Persistent (localStorage)</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#d9d9d9' }}>Session</span>}>
                      <Tag color="success">Active</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#d9d9d9' }}>Last Login</span>}>
                      <Text style={{ color: '#fff' }}>{new Date().toLocaleString()}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card 
                  title={<span style={{ color: '#d9d9d9' }}>System Information</span>}
                  style={{ background: '#1f1f1f', border: '1px solid #303030' }}
                  size="default"
                >
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label={<span style={{ color: '#d9d9d9' }}>Platform</span>}>
                      <Tag color="purple">Next.js 15</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#d9d9d9' }}>State Management</span>}>
                      <Tag color="orange">Zustand</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#d9d9d9' }}>UI Framework</span>}>
                      <Tag color="cyan">Ant Design</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#d9d9d9' }}>Language</span>}>
                      <Tag color="blue">TypeScript</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#d9d9d9' }}>Version</span>}>
                      <Text strong style={{ color: '#fff' }}>1.0.0</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>

            {/* Recent Activity */}
            <Card 
              title={<span style={{ color: '#d9d9d9' }}>Recent Activity</span>}
              style={{ 
                background: '#1f1f1f', 
                border: '1px solid #303030',
                marginTop: '24px' 
              }}
            >
              <List
                itemLayout="horizontal"
                dataSource={recentActivities}
                style={{ background: 'transparent' }}
                renderItem={(item) => (
                  <List.Item style={{ borderBottom: '1px solid #303030' }}>
                    <List.Item.Meta
                      avatar={<Avatar icon={item.icon} style={{ backgroundColor: '#303030' }} />}
                      title={<span style={{ color: '#d9d9d9' }}>{item.title}</span>}
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary" style={{ color: '#8c8c8c' }}>{item.description}</Text>
                          <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                            {item.time}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            {/* Quick Actions */}
            <Card 
              title={<span style={{ color: '#d9d9d9' }}>Quick Actions</span>}
              style={{ 
                background: '#1f1f1f', 
                border: '1px solid #303030',
                marginTop: '24px' 
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Card 
                    size="small" 
                    hoverable
                    style={{ 
                      background: '#262626', 
                      border: '1px solid #434343',
                      cursor: 'pointer'
                    }}
                  >
                    <Space direction="vertical" align="center" style={{ width: '100%' }}>
                      <Avatar size={48} icon={<UserOutlined />} style={{ backgroundColor: '#58bfce' }} />
                      <Text strong style={{ color: '#d9d9d9' }}>Profile Settings</Text>
                      <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        Manage your account
                      </Text>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card 
                    size="small" 
                    hoverable
                    style={{ 
                      background: '#262626', 
                      border: '1px solid #434343',
                      cursor: 'pointer'
                    }}
                  >
                    <Space direction="vertical" align="center" style={{ width: '100%' }}>
                      <Avatar size={48} icon={<SettingOutlined />} style={{ backgroundColor: '#52c41a' }} />
                      <Text strong style={{ color: '#d9d9d9' }}>Preferences</Text>
                      <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        Customize your experience
                      </Text>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Card 
                    size="small" 
                    hoverable
                    style={{ 
                      background: '#262626', 
                      border: '1px solid #434343',
                      cursor: 'pointer'
                    }}
                  >
                    <Space direction="vertical" align="center" style={{ width: '100%' }}>
                      <Avatar size={48} icon={<DatabaseOutlined />} style={{ backgroundColor: '#722ed1' }} />
                      <Text strong style={{ color: '#d9d9d9' }}>Data Management</Text>
                      <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                        View and manage data
                      </Text>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
