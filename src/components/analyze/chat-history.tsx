'use client';

import { useAuthStore } from '../../stores/auth-store';
import Sidebar from '../ui/sidebar';
import {
  Layout,
  Card,
  Typography,
  Space,
  Avatar,
  List,
  Tag,
  Button,
  Empty,
} from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useState } from 'react';

const { Content } = Layout;
const { Title, Text } = Typography;

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  timestamp: Date;
  preview: string;
}

export default function ChatHistory() {
  const { email } = useAuthStore();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'Data Analysis Request',
      lastMessage: 'I\'ve analyzed your request and here are my findings...',
      messageCount: 8,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      preview: 'Can you help me analyze this dataset?'
    },
    {
      id: '2',
      title: 'Market Research Analysis',
      lastMessage: 'Based on the data you\'ve provided, I can see several interesting patterns...',
      messageCount: 12,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      preview: 'I need help with market research analysis'
    },
    {
      id: '3',
      title: 'Performance Optimization',
      lastMessage: 'Let me break down this analysis for you...',
      messageCount: 6,
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      preview: 'How can I optimize my application performance?'
    },
    {
      id: '4',
      title: 'Code Review Request',
      lastMessage: 'From my perspective, this suggests that...',
      messageCount: 15,
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      preview: 'Can you review this code for potential issues?'
    },
  ]);

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
  };

  const handleRefreshHistory = () => {
    // In a real app, this would fetch from API
    console.log('Refreshing chat history...');
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: '#141414' }}>
        <Content style={{ 
          padding: '24px',
          background: '#141414',
          minHeight: '100vh'
        }}>
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ 
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <Title level={2} style={{ margin: 0, color: '#58bfce' }}>
                  Chat History
                </Title>
                <Text style={{ color: '#8c8c8c' }}>
                  Your previous conversations and analysis sessions
                </Text>
              </div>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshHistory}
                style={{
                  background: '#1f1f1f',
                  border: '1px solid #303030',
                  color: '#d9d9d9'
                }}
              >
                Refresh
              </Button>
            </div>

            {/* Chat Sessions List */}
            {chatSessions.length > 0 ? (
              <List
                dataSource={chatSessions}
                renderItem={(session) => (
                  <List.Item
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #303030',
                      borderRadius: '12px',
                      marginBottom: '16px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#262626';
                      e.currentTarget.style.borderColor = '#434343';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#1f1f1f';
                      e.currentTarget.style.borderColor = '#303030';
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          size={48}
                          icon={<MessageOutlined />}
                          style={{ backgroundColor: '#58bfce' }}
                        />
                      }
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong style={{ color: '#d9d9d9', fontSize: '16px' }}>
                            {session.title}
                          </Text>
                          <Space>
                            <Tag color="blue" style={{ fontSize: '12px' }}>
                              {session.messageCount} messages
                            </Tag>
                            <Button
                              type="text"
                              icon={<DeleteOutlined />}
                              size="small"
                              danger
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSession(session.id);
                              }}
                              style={{ color: '#ff4d4f' }}
                            />
                          </Space>
                        </div>
                      }
                      description={
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                            {session.preview}
                          </Text>
                          <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                            Last message: {session.lastMessage.substring(0, 60)}...
                          </Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ClockCircleOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                            <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                              {formatTimeAgo(session.timestamp)}
                            </Text>
                          </div>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Card
                style={{
                  background: '#1f1f1f',
                  border: '1px solid #303030',
                  borderRadius: '12px',
                  textAlign: 'center',
                  padding: '60px 20px'
                }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Text style={{ color: '#8c8c8c' }}>
                      No chat history found. Start a new conversation to see it here.
                    </Text>
                  }
                />
              </Card>
            )}

            {/* Stats Card */}
            <Card
              style={{
                background: '#1f1f1f',
                border: '1px solid #303030',
                borderRadius: '12px',
                marginTop: '24px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                <div>
                  <Text style={{ color: '#d9d9d9', fontSize: '24px', fontWeight: 'bold' }}>
                    {chatSessions.length}
                  </Text>
                  <div style={{ color: '#8c8c8c', fontSize: '14px' }}>Total Sessions</div>
                </div>
                <div>
                  <Text style={{ color: '#d9d9d9', fontSize: '24px', fontWeight: 'bold' }}>
                    {chatSessions.reduce((sum, session) => sum + session.messageCount, 0)}
                  </Text>
                  <div style={{ color: '#8c8c8c', fontSize: '14px' }}>Total Messages</div>
                </div>
                <div>
                  <Text style={{ color: '#d9d9d9', fontSize: '24px', fontWeight: 'bold' }}>
                    {Math.round(chatSessions.reduce((sum, session) => sum + session.messageCount, 0) / chatSessions.length)}
                  </Text>
                  <div style={{ color: '#8c8c8c', fontSize: '14px' }}>Avg Messages</div>
                </div>
              </div>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
