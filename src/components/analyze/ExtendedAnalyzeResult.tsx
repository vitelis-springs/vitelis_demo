'use client';

import { CheckCircleOutlined, DownloadOutlined, DownOutlined, FileTextOutlined, LinkOutlined, ToolOutlined, TrophyOutlined } from '@ant-design/icons';
import { Button, Card, Collapse, Layout, message, Space, Typography } from 'antd';
import { markdownToDocModel } from 'lib/parse-markdown';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { AnalysisContent, AnalysisData, exportAnalysisReportDocx } from '../../lib/docx-export.client';
import { extractKPIDataFromMarkdown, splitMarkdownAroundKPITable } from '../../lib/kpi-extractor.client';
import KpiRadarChart from '../charts/KpiRadarChart';
import Sidebar from '../ui/sidebar';

const { Title, Text } = Typography;
const { Content } = Layout;
const { Panel } = Collapse;

interface AnalyzeQuizData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
  language?: string;
  additionalInformation?: string;
}

interface ExtendedAnalyzeResultProps {
  quizData: AnalyzeQuizData;
  summary?: string;
  improvementLeverages?: string;
  headToHead?: string;
  sources?: string;
  onReset: () => void;
}

export default function ExtendedAnalyzeResult({ 
  quizData, 
  summary, 
  improvementLeverages, 
  headToHead, 
  sources, 
  onReset 
}: ExtendedAnalyzeResultProps) {
  const [activePanels, setActivePanels] = useState<string[]>(['summary']);

  const handlePanelChange = (key: string | string[]) => {
    setActivePanels(Array.isArray(key) ? key : [key]);
  };

  // Extract KPI data for radar chart
  const kpiData = summary ? extractKPIDataFromMarkdown(summary) : null;
  
  // Split summary to insert chart after table
  const summaryParts = summary ? splitMarkdownAroundKPITable(summary) : null;

 


  const handleExportToDocx = async () => {
    console.log('🔵 Export button clicked');
    
    try {
      // Show loading message
      message.loading('Generating DOCX document...', 0);
      
      const analysisData: AnalysisData = {
        companyName: quizData.companyName,
        businessLine: quizData.businessLine,
        country: quizData.country,
        useCase: quizData.useCase,
        timeline: quizData.timeline,
        language: quizData.language,
        additionalInformation: quizData.additionalInformation
      };

      const [summaryModel, improvementModel, headToHeadModel, sourcesModel] =
        await Promise.all([
          summary && summary.trim()
            ? markdownToDocModel(summary)
            : Promise.resolve(null),
          improvementLeverages && improvementLeverages.trim()
            ? markdownToDocModel(improvementLeverages)
            : Promise.resolve(null),
          headToHead && headToHead.trim()
            ? markdownToDocModel(headToHead)
            : Promise.resolve(null),
          sources && sources.trim()
            ? markdownToDocModel(sources)
            : Promise.resolve(null),
        ]);

      const analysisContent: AnalysisContent = {
        summary: summaryModel,
        improvementLevers: improvementModel,
        improvementLeverages: improvementModel,
        headToHead: headToHeadModel,
        sources: sourcesModel,
      };

  
      await exportAnalysisReportDocx(analysisData, analysisContent, 'Bizminer Analysis');
      
      // Hide loading and show success
      message.destroy();
      message.success('Analysis report exported successfully!');
    } catch (error) {
      // Hide loading
      message.destroy();
      
      console.error('❌ Export error:', error);
      
      // Show detailed error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to export report. Please try again.';
      
      message.error(errorMessage);
    }
  };


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
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
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
                  Analysis Report
                </Title>
                <Text style={{ color: '#8c8c8c' }}>
                  Comprehensive analysis with detailed insights
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
                    Analysis Parameters
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
                            title="Performance Comparison"
                          />
                          </div>
                          
                          {/* Content after table */}
                          {summaryParts.afterTable && renderMarkdownContent(summaryParts.afterTable, '')}
                        </>
                      ) : (
                        renderMarkdownContent(summary, 'No summary available yet. Please wait for the analysis to complete.')
                      )}
                    </div>
                  </Panel>

                  {/* Head to Head Section */}
                  <Panel 
                    header={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <TrophyOutlined style={{ color: '#58bfce', marginRight: '12px', fontSize: '18px' }} />
                        <Title level={4} style={{ color: '#58bfce', margin: 0 }}>
                          Head to Head Analysis
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
                      {renderMarkdownContent(headToHead, 'No head-to-head analysis available yet. Please wait for the analysis to complete.')}
                    </div>
                  </Panel>

                  

                  {/* Improvement Leverages Section */}
                  <Panel 
                    header={
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <ToolOutlined style={{ color: '#58bfce', marginRight: '12px', fontSize: '18px' }} />
                        <Title level={4} style={{ color: '#58bfce', margin: 0 }}>
                          Improvement Leverages
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
                      {renderMarkdownContent(improvementLeverages, 'No improvement leverages available yet. Please wait for the analysis to complete.')}
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
                      {renderMarkdownContent(sources, 'No sources available yet. Please wait for the analysis to complete.')}
                    </div>
                  </Panel>
                </Collapse>
              </Card>

              {/* Action Buttons */}
              <div style={{ textAlign: 'center' }}>
                <Space>
                  <Button
                    size="large"
                    icon={<DownloadOutlined />}
                    onClick={handleExportToDocx}
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #434343',
                      color: '#d9d9d9',
                      borderRadius: '8px',
                      height: '48px',
                      padding: '0 24px',
                      transition: 'all 0.3s ease'
                    }}
                    className="custom-button"
                  >
                    Export to DOCX
                  </Button>
                  {/* <Button
                    size="large"
                    icon={<FilePdfOutlined />}
                    onClick={handleExportToPdf}
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #434343',
                      color: '#d9d9d9',
                      borderRadius: '8px',
                      height: '48px',
                      padding: '0 24px',
                      transition: 'all 0.3s ease'
                    }}
                    className="custom-button"
                  >
                    Export to PDF
                  </Button> */}
                  <Button
                    size="large"
                    onClick={onReset}
                    style={{
                      background: '#1f1f1f',
                      border: '1px solid #434343',
                      color: '#d9d9d9',
                      borderRadius: '8px',
                      height: '48px',
                      padding: '0 24px',
                      transition: 'all 0.3s ease'
                    }}
                    className="custom-button"
                  >
                    Start New Analysis
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
