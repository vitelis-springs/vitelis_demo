'use client';

import { useAuth } from '../../hooks/useAuth';
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
  FileTextOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useAnalyzeService, useGetAnalyzesByUser } from '../../hooks/api/useAnalyzeService';
import { useRouter } from 'next/navigation';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function AnalysisHistory() {
  const { user } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const { deleteAnalyze } = useAnalyzeService();
  const { data: analysesData, isLoading: isLoadingAnalyses, refetch } = useGetAnalyzesByUser(user?._id || null);

  const fetchAnalyses = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error fetching analyses:', error);
      antMessage.error('Failed to fetch analysis history');
    }
  };

  useEffect(() => {
    console.log('📊 AnalysisHistory: analysesData changed:', analysesData);
    console.log('📊 AnalysisHistory: user ID being used:', user?._id);
    if (analysesData && analysesData.data) {
      console.log('📊 AnalysisHistory: Setting analyses from data:', analysesData.data);
      setAnalyses(analysesData.data);
    } else if (analysesData) {
      console.log('📊 AnalysisHistory: Setting analyses directly:', analysesData);
      setAnalyses(analysesData);
    }
  }, [analysesData, user?._id]);

  useEffect(() => {
    console.log('📊 AnalysisHistory: user changed:', user);
  }, [user]);

  useEffect(() => {
    console.log('📊 AnalysisHistory: analyses state changed:', analyses);
    console.log('📊 AnalysisHistory: analyses length:', analyses.length);
  }, [analyses]);

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

  const handleDeleteAnalysis = async (analysisId: string) => {
    try {
      await deleteAnalyze.mutateAsync(analysisId);
      setAnalyses(prev => prev.filter(analysis => analysis._id !== analysisId));
      antMessage.success('Analysis deleted successfully');
    } catch (error) {
      console.error('Error deleting analysis:', error);
      antMessage.error('Failed to delete analysis');
    }
  };

  const handleRefreshHistory = () => {
    if (user?._id) {
      refetch();
    }
  };

  const handleAnalysisClick = (analysisId: string) => {
    // Navigate to analyze quiz page with analysis ID
    router.push(`/analyze-quiz?analyzeId=${analysisId}`);
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
          flexDirection: 'column'
        }}>
          <div style={{ maxWidth: '1200px', width: '100%', display: 'flex', flexDirection: 'column' }}>
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
                  Analysis History
                </Title>
                <Text style={{ color: '#8c8c8c' }}>
                  Your previous company analysis sessions
                </Text>
              </div>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshHistory}
                                    loading={isLoadingAnalyses}
                style={{
                  background: '#1f1f1f',
                  border: '1px solid #303030',
                  color: '#d9d9d9'
                }}
              >
                Refresh
              </Button>
            </div>

            {/* Analysis List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <style jsx>{`
                .ant-list .ant-list-items {
                  min-width: 600px !important;
                }
                .ant-list-item {
                  min-width: 600px !important;
                }
              `}</style>
              {console.log('📊 AnalysisHistory: Rendering - isLoadingAnalyses:', isLoadingAnalyses, 'analyses.length:', analyses.length)}
              {isLoadingAnalyses ? (
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
                    <Text style={{ color: '#8c8c8c' }}>Loading analysis history...</Text>
                  </Space>
                </Card>
              ) : analyses.length > 0 ? (
                <div style={{ minWidth: '400px' }}>
                  <List
                    dataSource={analyses}
                    style={{ 
                      minWidth: '400px',
                      width: '100%'
                    }}
                    renderItem={(analysis) => (
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
                        onClick={() => handleAnalysisClick(analysis._id)}
                      >
                        <List.Item.Meta
                          avatar={
                            <Avatar
                              size={48}
                              icon={<FileTextOutlined />}
                              style={{ backgroundColor: '#58bfce' }}
                            />
                          }
                          title={
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text strong style={{ color: '#d9d9d9', fontSize: '16px' }}>
                                {analysis.companyName || 'Unnamed Company'}
                              </Text>
                              <Space>
                                <Tag 
                                  color={
                                    analysis.status === 'finished' ? 'green' : 
                                    analysis.status === 'progress' ? 'blue' : 
                                    analysis.status === 'error' ? 'red' :
                                    analysis.status === 'canceled' ? 'orange' : 'orange'
                                  } 
                                  style={{ fontSize: '12px' }}
                                >
                                  {analysis.status === 'finished' ? (
                                    <><CheckCircleOutlined /> Completed</>
                                  ) : analysis.status === 'progress' ? (
                                    <><LoadingOutlined /> In Progress</>
                                  ) : analysis.status === 'error' ? (
                                    <><ExclamationCircleOutlined /> Error</>
                                  ) : analysis.status === 'canceled' ? (
                                    <><StopOutlined /> Canceled</>
                                  ) : (
                                    'Draft'
                                  )}
                                </Tag>
                                <Button
                                  type="text"
                                  icon={<DeleteOutlined />}
                                  size="small"
                                  danger
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAnalysis(analysis._id);
                                  }}
                                  style={{ color: '#ff4d4f' }}
                                />
                              </Space>
                            </div>
                          }
                          description={
                            <Space direction="vertical" size={4} style={{ width: '100%' }}>
                              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                                  <strong>Business:</strong> {analysis.businessLine || 'N/A'}
                                </Text>
                                <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                                  <strong>Country:</strong> {analysis.country || 'N/A'}
                                </Text>
                                <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                                  <strong>Use Case:</strong> {analysis.useCase || 'N/A'}
                                </Text>
                                <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                                  <strong>Timeline:</strong> {analysis.timeline || 'N/A'}
                                </Text>
                              </div>
                              {analysis.executionId && (
                                <Text style={{ color: '#58bfce', fontSize: '12px' }}>
                                  Execution ID: {analysis.executionId}
                                </Text>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ClockCircleOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                                <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                                  {formatTimeAgo(analysis.updatedAt)}
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
                        No analysis history found. Start a new company analysis to see it here.
                      </Text>
                    }
                  />
                </Card>
              )}
            </div>

            {/* Stats Card - Reduced height */}
            {analyses.length > 0 && (
              <Card
                style={{
                  background: '#1f1f1f',
                  border: '1px solid #303030',
                  borderRadius: '12px',
                  marginTop: '16px',
                  flexShrink: 0
                }}
                styles={{ body: { padding: '16px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                  <div>
                    <Text style={{ color: '#d9d9d9', fontSize: '20px', fontWeight: 'bold' }}>
                      {analyses.length}
                    </Text>
                    <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Total Analyses</div>
                  </div>
                  <div>
                    <Text style={{ color: '#d9d9d9', fontSize: '20px', fontWeight: 'bold' }}>
                      {analyses.filter(a => a.status === 'finished').length}
                    </Text>
                    <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Completed</div>
                  </div>
                  <div>
                    <Text style={{ color: '#d9d9d9', fontSize: '20px', fontWeight: 'bold' }}>
                      {analyses.filter(a => a.status === 'progress').length}
                    </Text>
                    <div style={{ color: '#8c8c8c', fontSize: '12px' }}>In Progress</div>
                  </div>
                  <div>
                    <Text style={{ color: '#d9d9d9', fontSize: '20px', fontWeight: 'bold' }}>
                      {analyses.filter(a => a.status === 'error').length}
                    </Text>
                    <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Errors</div>
                  </div>
                  <div>
                    <Text style={{ color: '#d9d9d9', fontSize: '20px', fontWeight: 'bold' }}>
                      {analyses.filter(a => a.status === 'canceled').length}
                    </Text>
                    <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Canceled</div>
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
