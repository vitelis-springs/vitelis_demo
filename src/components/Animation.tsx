'use client';

import React, { useState, useEffect } from 'react';
import { Steps, Card, Button, Space, Typography, message, Spin, Layout } from 'antd';
import { 
  UserOutlined, 
  SolutionOutlined, 
  LoadingOutlined, 
  SmileOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  FileTextOutlined,
  AuditOutlined
} from '@ant-design/icons';
import Sidebar from './ui/sidebar';

const { Title, Text } = Typography;
const { Content } = Layout;

interface AnimationProps {
  title?: string;
  description?: string;
  executionId: string;
  companyName?: string;
  executionStep?: number;
  onComplete?: () => void;
}

export default function Animation({ 
  title = "Analysis in Progress", 
  description = "Your company analysis is being processed. This may take a few minutes.",
  executionId,
  companyName,
  executionStep,
  onComplete
}: AnimationProps) {
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);


  // Poll execution details
  // const { data: executionDetails } = useGetExecutionDetails(
  //   executionId,
  //   {
  //     refetchInterval: 5000, // Poll every 5 seconds
  //     enabled: !!executionId
  //   }
  // );

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
      title: 'Sources Validation',
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
      title: 'Report Building',
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
        console.log(`🔄 Animation: Updating step from ${current} to ${newStep} based on executionStep: ${executionStep}`);
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
          flexDirection: 'column'
        }}>
          <div style={{ maxWidth: '900px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Card style={{ background: '#1f1f1f', border: '1px solid #303030', borderRadius: '12px' }}>
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

                /* Pulse animation for active step */
                @keyframes pulse-glow {
                  0% {
                    transform: scale(1);
                    box-shadow: 0 0 20px rgba(88, 191, 206, 0.6);
                  }
                  50% {
                    transform: scale(1.1);
                    box-shadow: 0 0 30px rgba(88, 191, 206, 0.8);
                  }
                  100% {
                    transform: scale(1);
                    box-shadow: 0 0 20px rgba(88, 191, 206, 0.6);
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

                /* Progress shimmer animation */
                @keyframes progress-shimmer {
                  0% {
                    transform: translateX(-100%);
                  }
                  100% {
                    transform: translateX(100%);
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

              {/* Animated progress indicator */}
              <div style={{ 
                marginTop: '16px', 
                marginBottom: '16px',
                padding: '0 20px'
              }}>
                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: '#303030',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    width: `${((current + 1) / steps.length) * 100}%`,
                    height: '100%',
                    backgroundColor: '#58bfce',
                    borderRadius: '2px',
                    transition: 'width 0.5s ease-in-out',
                    position: 'relative'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '0',
                      right: '0',
                      width: '20px',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent, rgba(88, 191, 206, 0.8), transparent)',
                      animation: 'progress-shimmer 2s ease-in-out infinite'
                    }} />
                  </div>
                </div>
              </div>

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
                
                
               
                
              
              </div>

              <div style={{ 
                marginTop: '16px', 
                textAlign: 'center' 
              }}>
                <Text style={{ color: '#8c8c8c' }}>
                  Step {current + 1} of {steps.length}
                </Text>
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
              </div>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
