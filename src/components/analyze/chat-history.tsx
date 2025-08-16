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
  message as antMessage,
  Spin,
} from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { chatService, Chat } from '../../app/server/services/chatService';
import { useRouter } from 'next/navigation';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function ChatHistory() {
  const { email } = useAuthStore();
  const router = useRouter();
  const [chatSessions, setChatSessions] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const chats = await chatService.getChats(email);
      setChatSessions(chats);
    } catch (error) {
      console.error('Error fetching chats:', error);
      antMessage.error('Failed to fetch chat history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (email) {
      fetchChats();
    }
  }, [email]);

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await chatService.deleteChat(sessionId, email);
      setChatSessions(prev => prev.filter(session => session._id !== sessionId));
      antMessage.success('Chat deleted successfully');
    } catch (error) {
      console.error('Error deleting chat:', error);
      antMessage.error('Failed to delete chat');
    }
  };

  const handleRefreshHistory = () => {
    fetchChats();
  };

  const handleChatClick = (chatId: string) => {
    // Navigate to analyze page with chat ID
    router.push(`/analyze?chatId=${chatId}`);
  };

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
          height: '100vh'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ 
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0
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
                loading={loading}
                style={{
                  background: '#1f1f1f',
                  border: '1px solid #303030',
                  color: '#d9d9d9'
                }}
              >
                Refresh
              </Button>
            </div>

            {/* Chat Sessions List - Scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <style jsx>{`
                .ant-list .ant-list-items {
                  min-width: 600px !important;
                }
                .ant-list-item {
                  min-width: 600px !important;
                }
              `}</style>
              {loading ? (
                <Card
                  style={{
                    background: '#1f1f1f',
                    border: '1px solid #303030',
                    borderRadius: '12px',
                    textAlign: 'center',
                    padding: '60px 20px'
                  }}
                >
                  <Space direction="vertical" size="large">
                    <Spin size="large" />
                    <Text style={{ color: '#8c8c8c' }}>Loading chat history...</Text>
                  </Space>
                </Card>
              ) : chatSessions.length > 0 ? (
                <div style={{ minWidth: '400px' }}>
                  <List
                    dataSource={chatSessions}
                    style={{ 
                      minWidth: '400px',
                      width: '100%'
                    }}
                    renderItem={(session) => (
                      <List.Item
                        style={{
                          background: '#1f1f1f',
                          border: '1px solid #303030',
                          borderRadius: '12px',
                          marginBottom: '16px',
                          padding: '20px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          minWidth: '400px',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#262626';
                          e.currentTarget.style.borderColor = '#434343';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#1f1f1f';
                          e.currentTarget.style.borderColor = '#303030';
                        }}
                        onClick={() => handleChatClick(session._id)}
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
                                    handleDeleteSession(session._id);
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
                                  {formatTimeAgo(session.updatedAt)}
                                </Text>
                              </div>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </div>
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
            </div>

            {/* Stats Card - Reduced height */}
            {chatSessions.length > 0 && (
              <Card
                style={{
                  background: '#1f1f1f',
                  border: '1px solid #303030',
                  borderRadius: '12px',
                  marginTop: '16px',
                  flexShrink: 0
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                  <div>
                    <Text style={{ color: '#d9d9d9', fontSize: '20px', fontWeight: 'bold' }}>
                      {chatSessions.length}
                    </Text>
                    <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Total Sessions</div>
                  </div>
                  <div>
                    <Text style={{ color: '#d9d9d9', fontSize: '20px', fontWeight: 'bold' }}>
                      {chatSessions.reduce((sum, session) => sum + session.messageCount, 0)}
                    </Text>
                    <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Total Messages</div>
                  </div>
                  <div>
                    <Text style={{ color: '#d9d9d9', fontSize: '20px', fontWeight: 'bold' }}>
                      {Math.round(chatSessions.reduce((sum, session) => sum + session.messageCount, 0) / chatSessions.length)}
                    </Text>
                    <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Avg Messages</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
