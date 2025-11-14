'use client';

import React, { useState } from 'react';
import { Card, Typography, Space, Button, Layout, Collapse } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CheckCircleOutlined, DownOutlined, FileTextOutlined, TrophyOutlined, LinkOutlined, DollarOutlined} from '@ant-design/icons';
import { extractKPIDataFromMarkdown, splitMarkdownAroundKPITable } from '../../lib/kpi-extractor.client';
import KpiRadarChart from '../charts/KpiRadarChart';
import Sidebar from '../ui/sidebar';

const { Title, Text } = Typography;
const { Content } = Layout;
const { Panel } = Collapse;

interface SalesMinerQuizData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  language: string;
  additionalInformation?: string;
}

interface SalesMinerExtendedAnalyzeResultProps {
  quizData: SalesMinerQuizData;
  summary?: string;
  improvementLeverages?: string;
  headToHead?: string;
  sources?: string;
  onReset: () => void;
}

export default function SalesMinerExtendedAnalyzeResult({ 
  quizData, 
  summary, 
  improvementLeverages, 
  headToHead, 
  sources, 
  onReset 
}: SalesMinerExtendedAnalyzeResultProps) {
  const [activePanels, setActivePanels] = useState<string[]>(['summary']);

  const handlePanelChange = (key: string | string[]) => {
    setActivePanels(Array.isArray(key) ? key : [key]);
  };

  // Extract KPI data for radar chart
  const kpiData = summary ? extractKPIDataFromMarkdown(summary) : null;
  
  // Split summary to insert chart after table
  const summaryParts = summary ? splitMarkdownAroundKPITable(summary) : null;

  const renderMarkdownContent = (content: string | undefined, fallbackText: string) => {
    if (!content || content.trim() === '') {
      return (
        <div style={{ 
          color: '#8c8c8c', 
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '20px'
        }}>
          {fallbackText}
        </div>
      );
    }

    return (
      <div style={{ 
        color: '#d9d9d9',
        fontSize: '14px',
        lineHeight: '1.6'
      }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({children}) => <h1 style={{color: '#58bfce', fontSize: '20px', marginBottom: '12px', marginTop: '16px'}}>{children}</h1>,
            h2: ({children}) => <h2 style={{color: '#58bfce', fontSize: '18px', marginBottom: '10px', marginTop: '14px'}}>{children}</h2>,
            h3: ({children}) => <h3 style={{color: '#58bfce', fontSize: '16px', marginBottom: '8px', marginTop: '12px'}}>{children}</h3>,
            h4: ({children}) => <h4 style={{color: '#58bfce', fontSize: '14px', marginBottom: '6px', marginTop: '10px'}}>{children}</h4>,
            p: ({children}) => <p style={{marginBottom: '12px'}}>{children}</p>,
            strong: ({children}) => <strong style={{color: '#ffffff'}}>{children}</strong>,
            a: ({children, href}) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: '#1890ff',
                  textDecoration: 'underline',
                  textDecorationColor: '#1890ff',
                  textDecorationThickness: '1px',
                  textUnderlineOffset: '2px'
                }}
              >
                {children}
              </a>
            ),
            table: ({children}) => (
              <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
                <table style={{
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  marginBottom: '16px',
                  minWidth: '600px'
                }}>
                  {children}
                </table>
              </div>
            ),
            th: ({children}) => (
              <th style={{
                border: '1px solid #434343', 
                padding: '12px 8px', 
                textAlign: 'left', 
                backgroundColor: '#1f1f1f', 
                color: '#58bfce',
                fontWeight: 'bold',
                fontSize: '14px'
              }}>
                {children}
              </th>
            ),
            td: ({children}) => (
              <td style={{
                border: '1px solid #434343', 
                padding: '12px 8px', 
                color: '#d9d9d9',
                fontSize: '14px',
                verticalAlign: 'top'
              }}>
                {children}
              </td>
            ),
            ul: ({children}) => <ul style={{marginBottom: '12px', paddingLeft: '20px'}}>{children}</ul>,
            ol: ({children}) => <ol style={{marginBottom: '12px', paddingLeft: '20px'}}>{children}</ol>,
            li: ({children}) => <li style={{marginBottom: '4px'}}>{children}</li>,
            blockquote: ({children}) => <blockquote style={{borderLeft: '4px solid #58bfce', paddingLeft: '16px', margin: '16px 0', fontStyle: 'italic', color: '#8c8c8c'}}>{children}</blockquote>,
            code: ({children}) => <code style={{backgroundColor: '#1f1f1f', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace'}}>{children}</code>,
            pre: ({children}) => <pre style={{backgroundColor: '#1f1f1f', padding: '16px', borderRadius: '8px', overflow: 'auto', marginBottom: '16px'}}>{children}</pre>
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
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
          <div style={{ width: '100%' }}>
            <Card 
              style={{ 
                background: '#1f1f1f', 
                border: '1px solid #303030',
                borderRadius: '12px'
              }}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <Title level={2} style={{ color: '#58bfce', marginBottom: '8px' }}>
                  SalesMiner Analysis Report
                </Title>
                <Text style={{ color: '#8c8c8c' }}>
                  Comprehensive sales analysis with detailed market insights
                </Text>
              </div>

              {/* Quiz Data Summary */}
              <Card
                style={{
                  background: '#262626',
                  border: '1px solid #434343',
                  borderRadius: '8px',
                  marginBottom: '32px'
                }}
                styles={{ body: { padding: '20px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', padding: 'relative' }}>
                  <Title level={4} style={{ color: '#58bfce', margin: 0 }}>
                    SalesMiner Analysis Parameters
                  </Title>
                  <div style={{ display: 'flex', alignItems: 'center', position: 'absolute', right: '65px', top: '75px' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '12px', fontSize: '32px' }} />
                    <span style={{ color: '#52c41a', fontSize: '24px', fontWeight: '600' }}>Sources verified</span>
                  </div>
                </div>
                <div style={{ color: '#d9d9d9' }}>
                  <p><strong>Company:</strong> {quizData.companyName}</p>
                  <p><strong>Business Line:</strong> {quizData.businessLine}</p>
                  <p><strong>Country:</strong> {quizData.country}</p>
                  <p><strong>Use Case:</strong> {quizData.useCase}</p>
                  <p><strong>Timeline:</strong> {quizData.timeline}</p>
                  <p><strong>Language:</strong> {quizData.language}</p>
                  {quizData.additionalInformation && (
                    <p><strong>Additional Information:</strong> {quizData.additionalInformation}</p>
                  )}
                </div>
              </Card>

              {/* Collapsible Analysis Sections */}
              <Card
                style={{
                  background: '#262626',
                  border: '1px solid #434343',
                  borderRadius: '8px',
                  marginBottom: '32px'
                }}
                styles={{ body: { padding: '0' } }}
              >
                <Collapse
                  activeKey={activePanels}
                  onChange={handlePanelChange}
                  expandIcon={({ isActive }) => (
                    <DownOutlined 
                      style={{ 
                        color: '#58bfce', 
                        fontSize: '16px',
                        transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease'
                      }} 
                    />
                  )}
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
                >
                  {/* Summary Section */}
                  <Panel 
                    header={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <FileTextOutlined style={{ color: '#58bfce', marginRight: '12px', fontSize: '18px' }} />
                        <Title level={4} style={{ color: '#58bfce', margin: 0 }}>
                          Executive Summary
                        </Title>
                      </div>
                    }
                    key="summary"
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #434343',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ padding: '24px' }}>
                      {/* Render summary with chart after table */}
                      {summaryParts && kpiData ? (
                        <>
                          {/* Content before table */}
                          {summaryParts.beforeTable && renderMarkdownContent(summaryParts.beforeTable, '')}
                          
                          {/* KPI Table */}
                          {summaryParts.table && renderMarkdownContent(summaryParts.table, '')}
                          
                          {/* KPI Radar Chart - right after table */}
                          <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                            <KpiRadarChart 
                              data={kpiData} 
                              title="Profile of Top Leaders"
                            />
                          </div>
                          
                          {/* Content after table */}
                          {summaryParts.afterTable && renderMarkdownContent(summaryParts.afterTable, '')}
                        </>
                      ) : (
                        renderMarkdownContent(summary, 'No summary available yet. Please wait for the SalesMiner analysis to complete.')
                      )}
                    </div>
                  </Panel>

                  {/* Head to Head Section */}
                  <Panel 
                    header={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <TrophyOutlined style={{ color: '#58bfce', marginRight: '12px', fontSize: '18px' }} />
                        <Title level={4} style={{ color: '#58bfce', margin: 0 }}>
                          Competitive Analysis
                        </Title>
                      </div>
                    }
                    key="headToHead"
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #434343',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ padding: '24px' }}>
                      {renderMarkdownContent(headToHead, 'No competitive analysis available yet. Please wait for the SalesMiner analysis to complete.')}
                    </div>
                  </Panel>

                  {/* Sources Section */}
                  <Panel 
                    header={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <LinkOutlined style={{ color: '#58bfce', marginRight: '12px', fontSize: '18px' }} />
                        <Title level={4} style={{ color: '#58bfce', margin: 0 }}>
                          Sources & References
                        </Title>
                      </div>
                    }
                    key="sources"
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #434343',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ padding: '24px' }}>
                      {renderMarkdownContent(sources, 'No sources available yet. Please wait for the SalesMiner analysis to complete.')}
                    </div>
                  </Panel>

                  {/* Improvement Leverages Section */}
                  <Panel 
                    header={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <DollarOutlined style={{ color: '#58bfce', marginRight: '12px', fontSize: '18px' }} />
                        <Title level={4} style={{ color: '#58bfce', margin: 0 }}>
                          Revenue Optimization
                        </Title>
                      </div>
                    }
                    key="improvementLeverages"
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #434343',
                      borderRadius: '8px',
                      marginBottom: '8px'
                    }}
                  >
                    <div style={{ padding: '24px' }}>
                      {renderMarkdownContent(improvementLeverages, 'No revenue optimization insights available yet. Please wait for the SalesMiner analysis to complete.')}
                    </div>
                  </Panel>
                </Collapse>
              </Card>

              {/* Action Buttons */}
              <div style={{ textAlign: 'center' }}>
                <Space>
                  <Button
                    size="large"
                    onClick={onReset}
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #434343',
                      color: '#d9d9d9',
                      borderRadius: '8px',
                      height: '48px',
                      padding: '0 24px'
                    }}
                  >
                    Start New SalesMiner Analysis
                  </Button>
                </Space>
              </div>
            </Card>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
