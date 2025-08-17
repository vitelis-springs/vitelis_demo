import React, { useState } from 'react';
import { Button, Card, List, Space, Typography, message } from 'antd';
import { 
  useAnalyzeService, 
  useGetAnalyzesByUser, 
  useGetAnalyze,
  useGetLatestProgress,
  type AnalyzeData 
} from './useAnalyzeService';
import { useAuthStore } from '../../stores/auth-store';

const { Title, Text } = Typography;

export default function AnalyzeServiceExample() {
  const { email } = useAuthStore();
  const [selectedAnalyzeId, setSelectedAnalyzeId] = useState<string | null>(null);

  // Service hooks
  const { createAnalyze, updateAnalyze, deleteAnalyze } = useAnalyzeService();

  // Query hooks
  const { data: analyzes, isLoading: isLoadingAnalyzes } = useGetAnalyzesByUser(email);
  const { data: selectedAnalyze, isLoading: isLoadingSelected } = useGetAnalyze(selectedAnalyzeId);
  const { data: latestProgress } = useGetLatestProgress(email);

  // Create new analyze
  const handleCreateAnalyze = async () => {
    const newAnalyzeData: AnalyzeData = {
      companyName: 'Example Company',
      businessLine: 'Technology',
      country: 'United States',
      useCase: 'Leadership',
      timeline: 'Q1 2025',
      userId: email,
      status: 'progress',
      currentStep: 0,
      executionStatus: 'started',
      executionStep: 0
    };

    try {
      await createAnalyze.mutateAsync(newAnalyzeData);
      message.success('Analyze record created successfully!');
    } catch (error) {
      message.error('Failed to create analyze record');
    }
  };

  // Update analyze
  const handleUpdateAnalyze = async (id: string) => {
    const updateData = {
      id,
      status: 'finished' as const,
      executionStatus: 'finished' as const,
      executionStep: 5
    };

    try {
      await updateAnalyze.mutateAsync(updateData);
      message.success('Analyze record updated successfully!');
    } catch (error) {
      message.error('Failed to update analyze record');
    }
  };

  // Delete analyze
  const handleDeleteAnalyze = async (id: string) => {
    try {
      await deleteAnalyze.mutateAsync(id);
      message.success('Analyze record deleted successfully!');
    } catch (error) {
      message.error('Failed to delete analyze record');
    }
  };

  return (
    <div style={{ padding: '24px', background: '#141414', minHeight: '100vh' }}>
      <Card style={{ background: '#1f1f1f', border: '1px solid #303030' }}>
        <Title level={2} style={{ color: '#58bfce', marginBottom: '24px' }}>
          Analyze Service Example
        </Title>

        {/* Create Button */}
        <Space style={{ marginBottom: '24px' }}>
          <Button 
            type="primary" 
            onClick={handleCreateAnalyze}
            loading={createAnalyze.isPending}
            style={{ background: '#58bfce', border: '#58bfce' }}
          >
            Create New Analyze
          </Button>
        </Space>

        {/* Latest Progress */}
        {latestProgress && (
          <Card 
            style={{ 
              background: '#262626', 
              border: '1px solid #434343',
              marginBottom: '24px' 
            }}
          >
            <Title level={4} style={{ color: '#58bfce' }}>
              Latest Progress
            </Title>
            <Text style={{ color: '#d9d9d9' }}>
              Company: {latestProgress.companyName} | 
              Status: {latestProgress.status} | 
              Step: {latestProgress.currentStep} | 
              Execution: {latestProgress.executionStatus} ({latestProgress.executionStep})
            </Text>
          </Card>
        )}

        {/* Analyzes List */}
        <Card style={{ background: '#262626', border: '1px solid #434343' }}>
          <Title level={4} style={{ color: '#58bfce', marginBottom: '16px' }}>
            Your Analyzes ({analyzes?.length || 0})
          </Title>

          {isLoadingAnalyzes ? (
            <Text style={{ color: '#8c8c8c' }}>Loading analyzes...</Text>
          ) : (
            <List
              dataSource={analyzes || []}
              renderItem={(analyze) => (
                <List.Item
                  style={{ 
                    border: '1px solid #434343', 
                    marginBottom: '8px',
                    padding: '12px',
                    borderRadius: '8px',
                    background: selectedAnalyzeId === analyze._id ? '#1f1f1f' : 'transparent'
                  }}
                  actions={[
                    <Button 
                      key="view" 
                      size="small"
                      onClick={() => setSelectedAnalyzeId(analyze._id)}
                      style={{ color: '#58bfce', border: '#58bfce' }}
                    >
                      View
                    </Button>,
                    <Button 
                      key="update" 
                      size="small"
                      onClick={() => handleUpdateAnalyze(analyze._id)}
                      loading={updateAnalyze.isPending}
                      style={{ color: '#52c41a', border: '#52c41a' }}
                    >
                      Update
                    </Button>,
                    <Button 
                      key="delete" 
                      size="small" 
                      danger
                      onClick={() => handleDeleteAnalyze(analyze._id)}
                      loading={deleteAnalyze.isPending}
                    >
                      Delete
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Text style={{ color: '#d9d9d9' }}>
                        {analyze.companyName} - {analyze.useCase}
                      </Text>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                          Business: {analyze.businessLine} | Country: {analyze.country}
                        </Text>
                        <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                          Status: {analyze.status} | Step: {analyze.currentStep} | 
                          Execution: {analyze.executionStatus} ({analyze.executionStep})
                        </Text>
                        <Text style={{ color: '#8c8c8c', fontSize: '12px' }}>
                          Created: {new Date(analyze.createdAt).toLocaleDateString()}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* Selected Analyze Details */}
        {selectedAnalyzeId && (
          <Card 
            style={{ 
              background: '#262626', 
              border: '1px solid #434343',
              marginTop: '24px' 
            }}
          >
            <Title level={4} style={{ color: '#58bfce', marginBottom: '16px' }}>
              Selected Analyze Details
            </Title>

            {isLoadingSelected ? (
              <Text style={{ color: '#8c8c8c' }}>Loading details...</Text>
            ) : selectedAnalyze ? (
              <div style={{ color: '#d9d9d9' }}>
                <p><strong>ID:</strong> {selectedAnalyze._id}</p>
                <p><strong>Company:</strong> {selectedAnalyze.companyName}</p>
                <p><strong>Business Line:</strong> {selectedAnalyze.businessLine}</p>
                <p><strong>Country:</strong> {selectedAnalyze.country}</p>
                <p><strong>Use Case:</strong> {selectedAnalyze.useCase}</p>
                <p><strong>Timeline:</strong> {selectedAnalyze.timeline}</p>
                <p><strong>Status:</strong> {selectedAnalyze.status}</p>
                <p><strong>Current Step:</strong> {selectedAnalyze.currentStep}</p>
                <p><strong>Execution ID:</strong> {selectedAnalyze.executionId || 'N/A'}</p>
                <p><strong>Execution Status:</strong> {selectedAnalyze.executionStatus || 'N/A'}</p>
                <p><strong>Execution Step:</strong> {selectedAnalyze.executionStep || 'N/A'}</p>
                <p><strong>Created:</strong> {new Date(selectedAnalyze.createdAt).toLocaleString()}</p>
                <p><strong>Updated:</strong> {new Date(selectedAnalyze.updatedAt).toLocaleString()}</p>
              </div>
            ) : (
              <Text style={{ color: '#8c8c8c' }}>No analyze selected</Text>
            )}
          </Card>
        )}
      </Card>
    </div>
  );
}
