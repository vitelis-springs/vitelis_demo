'use client';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  LoadingOutlined,
  RobotOutlined,
  StopOutlined
} from '@ant-design/icons';
import {
  message as antMessage,
  Avatar,
  Button,
  Card,
  Empty,
  Layout,
  List,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAnalyzeService, useGetAllAnalyzes, useGetAnalyzesByUser } from '../../hooks/api/useAnalyzeService';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../ui/sidebar';
import SalesMinerAnalysisHistory from './salesminer-analysis-history';

const { Content } = Layout;
const { Title, Text } = Typography;

// Regular Analysis History Component
function RegularAnalysisHistory() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const { deleteAnalyze } = useAnalyzeService();
  
  // Use different hooks based on role
  const userQuery = useGetAnalyzesByUser(user?._id || null, currentPage, pageSize);
  const adminQuery = useGetAllAnalyzes(currentPage, pageSize);
  
  const { data: analysesData, isLoading: isLoadingAnalyses, refetch } = isAdmin() ? adminQuery : userQuery;

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
    if (analysesData) {
      // Handle both new paginated format and potential old format (though we updated the API)
      if ('data' in analysesData && Array.isArray(analysesData.data)) {
        setAnalyses(analysesData.data);
        setTotal(analysesData.total);
      } else if (Array.isArray(analysesData)) {
        // Fallback for old format if something goes wrong
        setAnalyses(analysesData);
        setTotal(analysesData.length);
      }
    }
  }, [analysesData]);

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
      // Refetch to update list and total count
      refetch();
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

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                onChange: handlePageChange,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                position: 'bottom',
                align: 'center',
                style: { marginTop: '24px' }
              }}
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
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <Text strong style={{ color: '#d9d9d9', fontSize: '16px' }}>
                            {analysis.companyName || 'Unnamed Company'}
                          </Text>
                          {isAdmin() && analysis.user && (
                            <Text style={{ color: '#58bfce', fontSize: '12px' }}>
                              User: {analysis.user.firstName} {analysis.user.lastName} ({analysis.user.email})
                            </Text>
                          )}
                        </div>
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
  );
}

// Main Analysis History Component with Tabs
export default function AnalysisHistory() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('regular');

  const tabItems = [
    {
      key: 'regular',
      label: (
        <span>
          <FileTextOutlined />
          Regular Analysis
        </span>
      ),
      children: <RegularAnalysisHistory />,
    },
    {
      key: 'salesminer',
      label: (
        <span>
          <RobotOutlined />
          SalesMiner Analysis
        </span>
      ),
      children: <SalesMinerAnalysisHistory />,
    },
  ];

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
            </div>

            {/* Tabs */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column'
                }}
                tabBarStyle={{
                  background: '#1f1f1f',
                  border: '1px solid #303030',
                  borderRadius: '12px 12px 0 0',
                  margin: 0,
                  padding: '0 16px'
                }}
                tabStyle={{
                  color: '#8c8c8c',
                  fontSize: '14px',
                  fontWeight: 500
                }}
                activeTabStyle={{
                  color: '#58bfce'
                }}
                styles={{
                  content: {
                    flex: 1,
                    background: '#141414',
                    border: '1px solid #303030',
                    borderTop: 'none',
                    borderRadius: '0 0 12px 12px',
                    padding: '24px'
                  }
                }}
              />
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
