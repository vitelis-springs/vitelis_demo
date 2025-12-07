'use client';

import {
    AuditOutlined,
    BarChartOutlined,
    FileTextOutlined,
    LoadingOutlined,
    SafetyCertificateOutlined,
    SearchOutlined,
    UserOutlined
} from '@ant-design/icons';
import { useAnalyzeService } from '@hooks/api/useAnalyzeService';
import { useGetExecutionDetails } from '@hooks/api/useN8NService';
import { Button, Card, Layout, Progress, Steps, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import Sidebar from '../ui/sidebar';

const { Title, Text } = Typography;
const { Content } = Layout;

interface SalesMinerAnimationProps {
  title?: string;
  description?: string;
  executionId: string;
  companyName?: string;
  executionStep?: number;
  analyzeId?: string;
  analyzeData?: any;
  onComplete?: () => void;
}

export default function SalesMinerAnimation({ 
  title = "SalesMiner Analysis in Progress", 
  description = "Your sales analysis is being processed. This may take a few minutes.",
  executionId,
  companyName,
  executionStep,
  analyzeId,
  analyzeData,
  onComplete
}: SalesMinerAnimationProps) {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const { updateAnalyze } = useAnalyzeService();

  // Poll execution details
  const { data: executionDetails } = useGetExecutionDetails(
    executionId,
    "salesminer",
    {
      refetchInterval: 5000, // Poll every 5 seconds
      enabled: !!executionId
    }
  );

  // Check analyze status for errors
  useEffect(() => {
    if (analyzeData) {
      
      if (analyzeData.status === 'error' || analyzeData.status === 'canceled' || analyzeData.status === 'crashed') {
        setExecutionError(`Analysis ${analyzeData.status}. Please try again.`);
      }
    }
  }, [analyzeData]);

  // Handle execution status changes
  useEffect(() => {
    if (executionDetails) {
      
      if (executionDetails.status === 'canceled' || executionDetails.status === 'error' || executionDetails.status === 'crashed') {
        console.error('❌ SalesMiner Animation: Execution failed with status:', executionDetails.status);
        
        // Update Analyze status to 'error' when execution fails
        if (executionDetails.status === 'canceled' || executionDetails.status === 'error' || executionDetails.status === 'crashed') {
          if (analyzeId) {
            updateAnalyze.mutateAsync({
              id: analyzeId,
              status: executionDetails.status,
              executionStatus: executionDetails.status
            }).then(() => {
            }).catch((error) => {
              console.error('❌ SalesMiner Animation: Failed to update analyze status:', error);
            });
          } else {
            console.warn('⚠️ SalesMiner Animation: No analyzeId provided, cannot update status');
          }
        }
      }
    }
  }, [executionDetails, analyzeId]);

  const steps = [
    {
      title: 'Initialising',
      description: 'Workflow initiated',
      icon: <UserOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 1: Initialising</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Your analysis request for <Text style={{ color: '#58bfce', fontWeight: 'bold' }}>{companyName || 'the company'}</Text> has been received and the workflow has been initiated.
            <br />
            Execution ID: <Text style={{ color: '#58bfce' }}>{executionId}</Text>
          </Text>
        </Card>
      )
    },
    {
      title: 'Research',
      description: 'Gathering data',
      icon: <SearchOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 2: Research</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Researching and gathering comprehensive data about <Text style={{ color: '#58bfce', fontWeight: 'bold' }}>{companyName || 'the company'}</Text>.
           
          </Text>
        </Card>
      )
    },
    {
      title: 'Validation',
      description: 'Validating sources',
      icon: <SafetyCertificateOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 3: Sources Validation</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Validating and cross-referencing all data sources to ensure accuracy and reliability.
            This step ensures the quality of information used in the analysis.
        
          </Text>
        </Card>
      )
    },
    {
      title: 'Scoring',
      description: 'Calculating scores',
      icon: <BarChartOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 4: Scoring</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Applying scoring algorithms and metrics to evaluate the company's performance
            across various dimensions and criteria.
        
          </Text>
        </Card>
      )
    },
    {
      title: 'Report',
      description: 'Generating report',
      icon: <FileTextOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 5: Report Building</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Compiling all findings and insights into a comprehensive analysis report.
            This includes visualizations, recommendations, and detailed analysis.
          
          </Text>
        </Card>
      )
    },
    {
      title: 'Result Evaluation',
      description: 'Final review',
      icon: <AuditOutlined />,
      content: (
        <Card style={{ marginTop: 16, background: '#1f1f1f', border: '1px solid #303030' }}>
          <Title level={4} style={{ color: '#d9d9d9' }}>Step 6: Result Evaluation</Title>
          <Text style={{ color: '#8c8c8c' }}>
            Final quality check and evaluation of the analysis results.
            Ensuring all insights are accurate and actionable.
          
          </Text>
        </Card>
      )
    }
  ];

  // Update current step based on executionStep prop
  useEffect(() => {
    if (executionStep !== undefined) {
      const newStep = Math.min(executionStep, steps.length - 1);
      if (newStep !== current) {
        console.log(`🔄 SalesMiner Animation: Updating step from ${current} to ${newStep} based on executionStep: ${executionStep}`);
        setCurrent(newStep);
      }
    }
  }, [executionStep, current, steps.length]);

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
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Card style={{ 
              background: '#1f1f1f', 
              border: '1px solid #303030', 
              borderRadius: '12px',
              width: '100%',
              maxWidth: '1200px'
            }}>
              <style jsx>{`
                .animation-steps .ant-steps-item-title {
                  white-space: normal !important;
                  word-wrap: break-word !important;
                  line-height: 1.2 !important;
                  max-width: 120px !important;
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
                  max-width: 120px !important;
                  text-align: center !important;
                  font-size: 12px !important;
                }
                
                .animation-steps .ant-steps-item {
                  flex: 1 !important;
                  min-width: 0 !important;
                  margin: 0 8px !important;
                }
                
                .animation-steps .ant-steps-item-container {
                  display: flex !important;
                  flex-direction: column !important;
                  align-items: center !important;
                }

                /* Active step animation */
                .animation-steps .ant-steps-item-process .ant-steps-item-icon {
                  animation: rainbow-glow 3s ease-in-out infinite !important;
                  box-shadow: 0 0 20px rgba(88, 191, 206, 0.6) !important;
                }

                .animation-steps .ant-steps-item-process .ant-steps-item-icon .anticon {
                  animation: icon-color-shift 3s ease-in-out infinite !important;
                }

                .animation-steps .ant-steps-item-process .ant-steps-item-title {
                  color: #58bfce !important;
                  font-weight: bold !important;
                  animation: text-glow 2s ease-in-out infinite !important;
                }

                .animation-steps .ant-steps-item-process .ant-steps-item-description {
                  color: #58bfce !important;
                  animation: text-glow 2s ease-in-out infinite !important;
                }

                /* Rainbow glow animation for active step icon */
                @keyframes rainbow-glow {
                  0% {
                    box-shadow: 0 0 20px rgba(88, 191, 206, 0.8);
                  }
                  16.66% {
                    box-shadow: 0 0 20px rgba(24, 144, 255, 0.8);
                  }
                  33.33% {
                    box-shadow: 0 0 20px rgba(82, 196, 26, 0.8);
                  }
                  50% {
                    box-shadow: 0 0 20px rgba(250, 173, 20, 0.8);
                  }
                  66.66% {
                    box-shadow: 0 0 20px rgba(245, 34, 45, 0.8);
                  }
                  83.33% {
                    box-shadow: 0 0 20px rgba(114, 46, 209, 0.8);
                  }
                  100% {
                    box-shadow: 0 0 20px rgba(88, 191, 206, 0.8);
                  }
                }

                /* Icon color shift animation */
                @keyframes icon-color-shift {
                  0% {
                    color: #58bfce;
                  }
                  16.66% {
                    color: #1890ff;
                  }
                  33.33% {
                    color: #52c41a;
                  }
                  50% {
                    color: #faad14;
                  }
                  66.66% {
                    color: #f5222d;
                  }
                  83.33% {
                    color: #722ed1;
                  }
                  100% {
                    color: #58bfce;
                  }
                }

                /* Text glow animation */
                @keyframes text-glow {
                  0% {
                    text-shadow: 0 0 5px rgba(88, 191, 206, 0.3);
                  }
                  50% {
                    text-shadow: 0 0 10px rgba(88, 191, 206, 0.6);
                  }
                  100% {
                    text-shadow: 0 0 5px rgba(88, 191, 206, 0.3);
                  }
                }

                /* Bounce animation for active step icon */
                .animation-steps .ant-steps-item-process .ant-steps-item-icon {
                  animation: rainbow-glow 3s ease-in-out infinite, bounce 1.5s ease-in-out infinite !important;
                }

                @keyframes bounce {
                  0%, 20%, 50%, 80%, 100% {
                    transform: translateY(0) scale(1);
                  }
                  40% {
                    transform: translateY(-5px) scale(1.05);
                  }
                  60% {
                    transform: translateY(-3px) scale(1.02);
                  }
                }

                /* Processing dots animation */
                @keyframes processing-dots {
                  0%, 80%, 100% {
                    transform: scale(0.8);
                    opacity: 0.5;
                  }
                  40% {
                    transform: scale(1.2);
                    opacity: 1;
                  }
                }
              `}</style>
              
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Title level={2} style={{ 
                  color: executionError 
                    ? (analyzeData?.status === 'canceled' ? '#faad14' : '#ff4d4f')
                    : '#58bfce', 
                  marginBottom: '8px' 
                }}>
                  {executionError 
                    ? `SalesMiner Analysis ${analyzeData?.status === 'canceled' ? 'Canceled' : 'Failed'}: ${companyName || 'Company'}`
                    : companyName 
                      ? `SalesMiner Analysis in Progress: ${companyName}` 
                      : title
                  }
                </Title>
                <Text style={{ 
                  color: executionError 
                    ? (analyzeData?.status === 'canceled' ? '#ffe58f' : '#ffa39e')
                    : '#8c8c8c' 
                }}>
                  {executionError 
                    ? `Execution was stopped on step ${current + 1}`
                    : companyName 
                      ? `Your sales analysis for ${companyName} is being processed. This may take a few minutes.`
                      : description
                  }
                </Text>
              </div>

              {/* Error Display */}
              {executionError && (
                <Card 
                  style={{ 
                    marginBottom: '24px', 
                    background: '#2a1f1f', 
                    border: `1px solid ${analyzeData?.status === 'canceled' ? '#faad14' : '#ff4d4f'}`,
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <Title level={4} style={{ 
                      color: analyzeData?.status === 'canceled' ? '#faad14' : '#ff4d4f', 
                      marginBottom: '8px' 
                    }}>
                      {analyzeData?.status === 'canceled' ? '⏹️ Execution Canceled' : '❌ Execution Failed'}
                    </Title>
                    <Text style={{ 
                      color: analyzeData?.status === 'canceled' ? '#ffe58f' : '#ffa39e' 
                    }}>
                      {executionError}
                    </Text>
                    <div style={{ marginTop: '16px' }}>
                      <Button 
                        type="primary" 
                        danger={analyzeData?.status !== 'canceled'}
                        style={{
                          background: analyzeData?.status === 'canceled' ? '#faad14' : undefined,
                          borderColor: analyzeData?.status === 'canceled' ? '#faad14' : undefined,
                          color: analyzeData?.status === 'canceled' ? '#000' : undefined
                        }}
                        onClick={() => window.location.href = '/analyze-sales-miner-quiz'}
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <Steps
                current={current}
                items={steps.map((item, index) => ({
                  title: item.title,
                  description: item.description,
                  style: {width: '170px'},
                  icon: index === 2 && loading ? <LoadingOutlined spin /> : item.icon,
                  status: executionError 
                    ? (index < current ? 'finish' : index === current ? (analyzeData?.status === 'canceled' ? 'process' : 'error') : 'wait')
                    : (index < current ? 'finish' : index === current ? 'process' : 'wait')
                }))}
                style={{ marginBottom: '24px', }}
                className="animation-steps"
              />
              
              <style jsx>{`
                .animation-steps .ant-steps-item-finish .ant-steps-item-icon .ant-steps-icon {
                  color: ${executionError && analyzeData?.status === 'canceled' ? '#faad14' : '#fff'} !important;
                }
                .animation-steps .ant-steps-item-process .ant-steps-item-icon .ant-steps-icon {
                  color: ${executionError && analyzeData?.status === 'canceled' ? '#faad14' : '#fff'} !important;
                }
              `}</style>

              {/* Progress indicator using Ant Design Progress component */}
              <div style={{ 
                marginTop: '16px', 
                marginBottom: '16px',
                padding: '0 20px'
              }}>
                <div style={{ '--ant-progress-stroke-width': '8px' } as React.CSSProperties}>
                  <Progress
                    percent={Math.round(((current + 1) / steps.length) * 100)}
                    strokeColor={executionError 
                      ? (analyzeData?.status === 'canceled' ? '#faad14' : '#ff4d4f')
                      : {
                        '0%': '#58bfce',
                        '25%': '#1890ff',
                        '50%': '#52c41a',
                        '75%': '#faad14',
                        '100%': '#f5222d',
                      }
                    }
                    trailColor="#303030"
                    showInfo={false}
                    status={executionError ? 'exception' : 'active'}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                {executionError ? (
                  <Card style={{ 
                    marginTop: 16, 
                    background: analyzeData?.status === 'canceled' ? '#2a1f1f' : '#2a1f1f', 
                    border: `1px solid ${analyzeData?.status === 'canceled' ? '#faad14' : '#ff4d4f'}` 
                  }}>
                    <Title level={4} style={{ 
                      color: analyzeData?.status === 'canceled' ? '#faad14' : '#ff4d4f' 
                    }}>
                      Step {current + 1}: {steps[current]?.title}
                    </Title>
                    <Text style={{ 
                      color: analyzeData?.status === 'canceled' ? '#ffe58f' : '#ffa39e' 
                    }}>
                      Execution stopped on this step. The SalesMiner analysis workflow encountered an issue and could not continue.
                    </Text>
                  </Card>
                ) : (
                  steps[current]?.content
                )}
              </div>

              <div style={{ 
                marginTop: '16px', 
                textAlign: 'center' 
              }}>
                <Text style={{ 
                  color: executionError 
                    ? (analyzeData?.status === 'canceled' ? '#faad14' : '#ff4d4f')
                    : '#8c8c8c' 
                }}>
                  {executionError 
                    ? `Step ${current + 1} of ${steps.length} • Execution ${analyzeData?.status === 'canceled' ? 'Canceled' : 'Failed'}`
                    : `Step ${current + 1} of ${steps.length} • ${Math.round(((current + 1) / steps.length) * 100)}% Complete`
                  }
                </Text>
                {!executionError && (
                  <div style={{ 
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#58bfce',
                      animation: 'processing-dots 1.4s ease-in-out infinite'
                    }} />
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#58bfce',
                      animation: 'processing-dots 1.4s ease-in-out infinite 0.2s'
                    }} />
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#58bfce',
                      animation: 'processing-dots 1.4s ease-in-out infinite 0.4s'
                    }} />
                    <Text style={{ color: '#58bfce', fontSize: '12px', marginLeft: '8px' }}>
                      Processing...
                    </Text>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
