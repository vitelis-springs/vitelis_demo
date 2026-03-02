'use client';

import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  message as antMessage,
  Avatar,
  Button,
  Card,
  Empty,
  List,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  useGetAllVitelisSalesAnalyzes,
  useGetVitelisSalesAnalyzesByUser,
  useVitelisSalesAnalyzeService,
} from '../../hooks/api/useVitelisSalesAnalyzeService';
import { useAuth } from '../../hooks/useAuth';

const { Text } = Typography;

export default function VitelisSalesAnalysisHistory() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { deleteVitelisSalesAnalyze } = useVitelisSalesAnalyzeService();

  const userQuery = useGetVitelisSalesAnalyzesByUser(
    user?._id || null,
    currentPage,
    pageSize
  );
  const adminQuery = useGetAllVitelisSalesAnalyzes(currentPage, pageSize, {
    enabled: isAdmin(),
  });

  const { data: analysesData, isLoading: isLoadingAnalyses } =
    isAdmin() ? adminQuery : userQuery;

  useEffect(() => {
    if (analysesData) {
      if ('data' in analysesData && Array.isArray(analysesData.data)) {
        setAnalyses(analysesData.data);
        setTotal(analysesData.total);
      } else if (Array.isArray(analysesData)) {
        setAnalyses(analysesData);
        setTotal(analysesData.length);
      }
    }
  }, [analysesData]);

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
      await deleteVitelisSalesAnalyze.mutateAsync(analysisId);
      setAnalyses((prev) => prev.filter((a) => a._id !== analysisId));
      antMessage.success('VitelisSales analysis deleted successfully');
    } catch (error) {
      console.error('Error deleting VitelisSales analysis:', error);
      antMessage.error('Failed to delete VitelisSales analysis');
    }
  };

  const handleAnalysisClick = (analysisId: string) => {
    router.push(`/analyze-vitelis-sales-quiz?analyzeId=${analysisId}`);
  };

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
              padding: '60px 20px',
            }}
          >
            <Space direction="vertical" size="large">
              <Spin size="large" />
              <Text style={{ color: '#8c8c8c' }}>
                Loading VitelisSales analysis history...
              </Text>
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
                style: { marginTop: '24px' },
              }}
              style={{ minWidth: '400px', width: '100%' }}
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
                    width: '100%',
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
                        icon={<ThunderboltOutlined />}
                        style={{ backgroundColor: '#722ed1' }}
                      />
                    }
                    title={
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <Text
                            strong
                            style={{ color: '#d9d9d9', fontSize: '16px' }}
                          >
                            {analysis.companyName || 'Unnamed Company'}
                          </Text>
                          {isAdmin() && analysis.user && (
                            <Text
                              style={{ color: '#722ed1', fontSize: '12px' }}
                            >
                              User: {analysis.user.firstName}{' '}
                              {analysis.user.lastName} ({analysis.user.email})
                            </Text>
                          )}
                        </div>
                        <Space>
                          <Tag
                            color={
                              analysis.status === 'finished'
                                ? 'green'
                                : analysis.status === 'progress'
                                  ? 'blue'
                                  : analysis.status === 'error'
                                    ? 'red'
                                    : analysis.status === 'canceled'
                                      ? 'orange'
                                      : 'orange'
                            }
                            style={{ fontSize: '12px' }}
                          >
                            {analysis.status === 'finished' ? (
                              <>
                                <CheckCircleOutlined /> Completed
                              </>
                            ) : analysis.status === 'progress' ? (
                              <>
                                <LoadingOutlined /> In Progress
                              </>
                            ) : analysis.status === 'error' ? (
                              <>
                                <ExclamationCircleOutlined /> Error
                              </>
                            ) : analysis.status === 'canceled' ? (
                              <>
                                <StopOutlined /> Canceled
                              </>
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
                      <Space
                        direction="vertical"
                        size={4}
                        style={{ width: '100%' }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: '16px',
                            flexWrap: 'wrap',
                          }}
                        >
                          {analysis.useCase && (
                            <Text
                              style={{
                                color: '#8c8c8c',
                                fontSize: '12px',
                              }}
                            >
                              <strong>Use Case:</strong> {analysis.useCase}
                            </Text>
                          )}
                          {analysis.generatedReportId && (
                            <Text
                              style={{
                                color: '#8c8c8c',
                                fontSize: '12px',
                              }}
                            >
                              <strong>Report ID:</strong>{' '}
                              {analysis.generatedReportId}
                            </Text>
                          )}
                        </div>
                        {analysis.executionId && (
                          <Text
                            style={{ color: '#722ed1', fontSize: '12px' }}
                          >
                            Execution ID: {analysis.executionId}
                          </Text>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <ClockCircleOutlined
                            style={{ color: '#8c8c8c', fontSize: '12px' }}
                          />
                          <Text
                            style={{ color: '#8c8c8c', fontSize: '12px' }}
                          >
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
              padding: '60px 20px',
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text style={{ color: '#8c8c8c' }}>
                  No VitelisSales analysis history found. Start a new VitelisSales
                  analysis to see it here.
                </Text>
              }
            />
          </Card>
        )}
      </div>

      {analyses.length > 0 && (
        <Card
          style={{
            background: '#1f1f1f',
            border: '1px solid #303030',
            borderRadius: '12px',
            marginTop: '16px',
            flexShrink: 0,
          }}
          styles={{ body: { padding: '16px' } }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              textAlign: 'center',
            }}
          >
            <div>
              <Text
                style={{
                  color: '#d9d9d9',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                {analyses.length}
              </Text>
              <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
                Total Analyses
              </div>
            </div>
            <div>
              <Text
                style={{
                  color: '#d9d9d9',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                {analyses.filter((a) => a.status === 'finished').length}
              </Text>
              <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
                Completed
              </div>
            </div>
            <div>
              <Text
                style={{
                  color: '#d9d9d9',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                {analyses.filter((a) => a.status === 'progress').length}
              </Text>
              <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
                In Progress
              </div>
            </div>
            <div>
              <Text
                style={{
                  color: '#d9d9d9',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                {analyses.filter((a) => a.status === 'error').length}
              </Text>
              <div style={{ color: '#8c8c8c', fontSize: '12px' }}>Errors</div>
            </div>
            <div>
              <Text
                style={{
                  color: '#d9d9d9',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                {analyses.filter((a) => a.status === 'canceled').length}
              </Text>
              <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
                Canceled
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
