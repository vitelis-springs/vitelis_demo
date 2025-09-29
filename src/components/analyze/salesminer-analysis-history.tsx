'use client';

import { useAuth } from '../../hooks/useAuth';
import {
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
  RobotOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  StopOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useSalesMinerAnalyzeService, useGetSalesMinerAnalyzesByUser } from '../../hooks/api/useSalesMinerAnalyzeService';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function SalesMinerAnalysisHistory() {
  const { user } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const { deleteSalesMinerAnalyze } = useSalesMinerAnalyzeService();
  const { data: analysesData, isLoading: isLoadingAnalyses, refetch } = useGetSalesMinerAnalyzesByUser(user?._id || null);

  const fetchAnalyses = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error fetching SalesMiner analyses:', error);
      antMessage.error('Failed to fetch SalesMiner analysis history');
    }
  };

  useEffect(() => {
    console.log('📊 SalesMinerAnalysisHistory: analysesData changed:', analysesData);
    console.log('📊 SalesMinerAnalysisHistory: user ID being used:', user?._id);
    if (analysesData && analysesData.data) {
      console.log('📊 SalesMinerAnalysisHistory: Setting analyses from data:', analysesData.data);
      setAnalyses(analysesData.data);
    } else if (analysesData) {
      console.log('📊 SalesMinerAnalysisHistory: Setting analyses directly:', analysesData);
      setAnalyses(analysesData);
    }
  }, [analysesData, user?._id]);

  useEffect(() => {
    console.log('📊 SalesMinerAnalysisHistory: user changed:', user);
  }, [user]);

  useEffect(() => {
    console.log('📊 SalesMinerAnalysisHistory: analyses state changed:', analyses);
    console.log('📊 SalesMinerAnalysisHistory: analyses length:', analyses.length);
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
      await deleteSalesMinerAnalyze.mutateAsync(analysisId);
      setAnalyses(prev => prev.filter(analysis => analysis._id !== analysisId));
      antMessage.success('SalesMiner analysis deleted successfully');
    } catch (error) {
      console.error('Error deleting SalesMiner analysis:', error);
      antMessage.error('Failed to delete SalesMiner analysis');
    }
  };

  const handleAnalysisClick = (analysisId: string) => {
    // Navigate to SalesMiner analyze quiz page with analysis ID
    router.push(`/analyze-sales-miner-quiz?analyzeId=${analysisId}`);
  };

  const handleYamlFileClick = (yamlFileUrl: string) => {
    if (yamlFileUrl) {
      window.open(yamlFileUrl, '_blank');
    }
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
        {console.log('📊 SalesMinerAnalysisHistory: Rendering - isLoadingAnalyses:', isLoadingAnalyses, 'analyses.length:', analyses.length)}
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
              <Text style={{ color: '#8c8c8c' }}>Loading SalesMiner analysis history...</Text>
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
                        icon={<RobotOutlined />}
                        style={{ backgroundColor: '#52c41a' }}
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
                          <Text style={{ color: '#52c41a', fontSize: '12px' }}>
                            Execution ID: {analysis.executionId}
                          </Text>
                        )}
                        {analysis.yamlFile && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Button
                              type="link"
                              size="small"
                              icon={<LinkOutlined />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleYamlFileClick(analysis.yamlFile);
                              }}
                              style={{ 
                                color: '#52c41a', 
                                padding: 0, 
                                height: 'auto',
                                fontSize: '12px'
                              }}
                            >
                              View YAML File
                            </Button>
                          </div>
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
                  No SalesMiner analysis history found. Start a new SalesMiner analysis to see it here.
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
            <div>
              <Text style={{ color: '#d9d9d9', fontSize: '20px', fontWeight: 'bold' }}>
                {analyses.filter(a => a.yamlFile).length}
              </Text>
              <div style={{ color: '#8c8c8c', fontSize: '12px' }}>With YAML</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

