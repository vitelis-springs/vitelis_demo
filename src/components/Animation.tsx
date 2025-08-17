'use client';

import React, { useState, useEffect } from 'react';
import { Steps, Card, Button, Space, Typography, message, Spin, Layout } from 'antd';
import { 
  UserOutlined, 
  SolutionOutlined, 
  LoadingOutlined, 
  SmileOutlined,
  CheckCircleOutlined 
} from '@ant-design/icons';
import { useGetExecutionDetails } from '@hooks/api/useN8NService';
import Sidebar from './ui/sidebar';

const { Title, Text } = Typography;

interface AnimationProps {
  title?: string;
  description?: string;
  executionId: string;
  companyName?: string;
  onComplete?: () => void;
}

export default function Animation({ 
  title = "Analysis in Progress", 
  description = "Your company analysis is being processed. This may take a few minutes.",
  executionId,
  companyName,
  onComplete
}: AnimationProps) {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Poll execution details
  const { data: executionDetails, isLoading: isLoadingExecution } = useGetExecutionDetails(
    executionId,
    {
      refetchInterval: 5000, // Poll every 3 seconds
      enabled: !!executionId
    }
  );

  const steps = [
    {
      title: 'Started',
      description: 'Workflow initiated',
      icon: <UserOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 1: Workflow Started</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Your analysis request for <Text style={{ color: '#58bfce', fontWeight: 'bold' }}>{companyName || 'the company'}</Text> has been received and the workflow has been initiated.
            <br />
            Execution ID: <Text style={{ color: '#58bfce' }}>{executionId}</Text>
          </Text>
        </Card>
      )
    },
    {
      title: 'Processing',
      description: 'Analyzing data',
      icon: <SolutionOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 2: Data Processing</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Your company data is being processed and analyzed. This step involves
            data validation and preparation for the analysis phase.
            {executionDetails?.customData?.step && (
              <div style={{ marginTop: '8px' }}>
                <Text style={{ color: '#58bfce' }}>Current step: {executionDetails.customData.step}</Text>
              </div>
            )}
          </Text>
        </Card>
      )
    },
    {
      title: 'Analysis',
      description: 'Running analysis',
      icon: <LoadingOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 3: Analysis Running</Title>
          <Text style={{ color: '#8c8c8c' }}>
            The AI analysis is now running. This may take a few minutes depending
            on the complexity of your analysis.
            {executionDetails?.customData?.step && (
              <div style={{ marginTop: '8px' }}>
                <Text style={{ color: '#58bfce' }}>Current step: {executionDetails.customData.step}</Text>
              </div>
            )}
          </Text>
        </Card>
      )
    },
    {
      title: 'Finalizing',
      description: 'Preparing results',
      icon: <SmileOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 4: Finalizing Results</Title>
          <Text style={{ color: '#8c8c8c' }}>
            The analysis is being finalized and results are being prepared for display.
            {executionDetails?.customData?.step && (
              <div style={{ marginTop: '8px' }}>
                <Text style={{ color: '#58bfce' }}>Current step: {executionDetails.customData.step}</Text>
              </div>
            )}
          </Text>
        </Card>
      )
    },
    {
      title: 'Complete',
      description: 'Analysis ready',
      icon: <CheckCircleOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 5: Analysis Complete</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Congratulations! Your company analysis has been completed successfully.
            The results are ready for review.
          </Text>
        </Card>
      )
    }
  ];

  const next = async () => {
    if (current === 2) {
      // Simulate loading for step 3
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLoading(false);
    }
    
    const nextStep = current + 1;
    setCurrent(nextStep);
    message.success(`Moved to step ${nextStep + 1}`);
    
    // If we've reached the end, call onComplete
    if (nextStep === steps.length - 1) {
      setTimeout(() => {
        onComplete?.();
      }, 2000); // Wait 2 seconds after reaching the last step
    }
  };

  const prev = () => {
    setCurrent(current - 1);
    message.info(`Moved back to step ${current}`);
  };

  const reset = () => {
    setCurrent(0);
    message.info('Reset to first step');
  };

  return (
    <div style={{ 
      padding: '24px', 
      background: '#141414', 
      minHeight: '100vh',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <style jsx>{`
        .animation-steps .ant-steps-item-title {
          white-space: normal !important;
          word-wrap: break-word !important;
          line-height: 1.2 !important;
          max-width: 100px !important;
          text-align: center !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 40px !important;
        }
        
        .animation-steps .ant-steps-item-description {
          white-space: normal !important;
          word-wrap: break-word !important;
          line-height: 1.2 !important;
          max-width: 100px !important;
          text-align: center !important;
          font-size: 12px !important;
        }
        
        .animation-steps .ant-steps-item {
          flex: 1 !important;
          min-width: 0 !important;
        }
        
        .animation-steps .ant-steps-item-container {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }
      `}</style>
      <Card 
        style={{ 
          background: '#1f1f1f', 
          border: '1px solid #303030',
          borderRadius: '12px'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ color: '#58bfce', marginBottom: '8px' }}>
            {companyName ? `Analysis in Progress: ${companyName}` : title}
          </Title>
          <Text style={{ color: '#8c8c8c' }}>
            {companyName 
              ? `Your analysis for ${companyName} is being processed. This may take a few minutes.`
              : description
            }
          </Text>
        </div>

        <Steps
          current={current}
          items={steps.map((item, index) => ({
            title: item.title,
            description: item.description,
            icon: index === 2 && loading ? <LoadingOutlined spin /> : item.icon,
            status: index < current ? 'finish' : index === current ? 'process' : 'wait'
          }))}
          style={{ marginBottom: '24px' }}
          className="animation-steps"
        />

        <div style={{ marginTop: '24px' }}>
          {steps[current]?.content}
        </div>

        <div style={{ 
          marginTop: '24px', 
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: '12px'
        }}>
          {current > 0 && (
            <Button 
              onClick={prev}
              style={{
                background: '#1f1f1f',
                border: '1px solid #303030',
                color: '#d9d9d9'
              }}
            >
              Previous
            </Button>
          )}
          
          {current < steps.length - 1 && (
            <Button 
              type="primary" 
              onClick={next}
              loading={loading}
              style={{
                background: '#58bfce',
                border: '1px solid #58bfce'
              }}
            >
              Next
            </Button>
          )}
          
          {current === steps.length - 1 && (
            <Button 
              type="primary"
              onClick={reset}
              style={{
                background: '#52c41a',
                border: '1px solid #52c41a'
              }}
            >
              Reset
            </Button>
          )}
        </div>

        <div style={{ 
          marginTop: '16px', 
          textAlign: 'center' 
        }}>
          <Text style={{ color: '#8c8c8c' }}>
            Step {current + 1} of {steps.length}
          </Text>
        </div>
      </Card>
    </div>
  );
}
