'use client';

import React from 'react';
import { Card, Typography, Space, Button } from 'antd';
import ReactMarkdown from 'react-markdown';
import { CheckCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface AnalyzeQuizData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
}

interface AnalyzeResultProps {
  quizData: AnalyzeQuizData;
  onReset: () => void;
}

export default function AnalyzeResult({ quizData, onReset }: AnalyzeResultProps) {
  const preparedAnswer = `\n\n# Leadership Company Analysis Report: Adidas Germany\n**Business Line:** Sportswear | **Period:** Q1 2025 | **Category:** Leadership\n\n## Executive Summary\n\nAdidas Germany demonstrates strong leadership performance in Q1 2025, positioning itself as a Tier 1 player in the German sportswear market with significant competitive advantages over key rivals. The company achieved exceptional financial performance with 13% currency-neutral revenue growth to €6.15 billion, while simultaneously advancing ambitious sustainability targets and diversity initiatives[1][2]. \n\nAdidas maintains leadership across multiple critical dimensions, including strategic vision execution, environmental performance with a 20% reduction in overall greenhouse gas emissions, and diversity advancement with 40.7% women in leadership positions. The company's brand strength is evidenced by achieving its highest Brand Index score in over a decade at 37.1, with substantial improvements across all consumer perception metrics including Impression scores (37.9 to 44.7) and Quality perception (40.0 to 45.6).\n\nHowever, the analysis reveals strategic challenges requiring attention. While Adidas leads in operational excellence and sustainability, communication effectiveness shows mixed results with varying regional performance and digital transformation requirements. The company's marketing investment of €746 million (12.1% of sales) demonstrates commitment to brand building, yet conversion of brand awareness to customer engagement remains inconsistent across markets.\n\nKey competitive positioning shows Adidas significantly outperforming rivals in financial scale and sustainability leadership, while facing challenges in digital innovation and market-specific customer experience optimization. The company's strategic transformation initiatives, including comprehensive upskilling programs and environmental commitments, position it favorably for long-term competitive advantage in the German market.\n\n## KPI Scorecard - Q1 2025 Leadership Benchmark\n\n| Leadership KPI | Adidas Germany | Nike | PUMA | Under Armour | New Balance | ASICS | Ideal |\n|---|---|---|---|---|---|---|---|\n| Strategic Vision & Direction | 85 | 75 | 70 | 65 | 68 | 78 | 95 |\n| Diversity & Inclusion Commitment | 88 | 82 | 85 | 80 | 72 | 77 | 95 |\n| Communication Skills & Transparency | 78 | 85 | 82 | 70 | 75 | 80 | 95 |\n| Upskilling Programs & Digital Development | 82 | 88 | 75 | 72 | 70 | 73 | 95 |\n| Learning Culture & Continuous Development | 85 | 80 | 83 | 75 | 72 | 78 | 95 |\n| Empathy & Support in Leadership | 80 | 75 | 88 | 82 | 74 | 85 | 95 |\n| Environmental Performance | 92 | 78 | 90 | 75 | 70 | 82 | 95 |\n| Brand Awareness & Recognition | 90 | 98 | 72 | 61 | 61 | 72 | 95 |\n\n**Overall Leadership Score: 85** (A-) vs Industry Average: 77 (B+)\n\n## Narrative Findings\n\n### Strategic Vision and Direction Leadership\n\n**Performance Narrative:** Adidas demonstrates exceptional strategic vision execution through consistent double-digit growth and clear communication of long-term objectives. The company achieved 13% currency-neutral revenue growth in Q1 2025, with the Adidas brand specifically growing 17%, outpacing overall company performance[1][3]. CEO Bjørn Gulden's strategic messaging emphasized sustained momentum across all markets and channels, with footwear leading at 17% growth driven by success across Originals, Sportswear, Running, Training, and Performance Basketball categories[2].\n\n**Root Causes:** Strategic clarity emerges from comprehensive transformation initiatives recognizing systemic challenges and implementing systematic solutions. The company's approach to strategic vision encompasses acknowledgment of external uncertainties while maintaining confidence in underlying business fundamentals, as evidenced by maintaining marketing investment at €746 million (12.1% of sales) despite volatile market conditions.\n\n**Competitor Comparison:** Adidas significantly outperforms competitors in strategic vision execution. While Nike faces revenue decline (10% drop in Q1 FY25) and market share erosion, and PUMA implements cost reduction programs targeting 500 job cuts, Adidas maintains growth momentum across all categories. Under Armour's strategic repositioning efforts show early promise but lack the scale and consistency of Adidas' execution.\n\n**Industry Trends & Context:** The global sportswear market increasingly demands integrated sustainability and performance positioning, with consumers expecting authentic brand purpose alignment. Adidas' strategic vision effectively addresses these trends through science-based environmental targets while maintaining product innovation leadership.\n\n**Recommendations:** Enhance regional strategic customization to address geographic performance variations. Strengthen strategic communication around digital transformation initiatives to match operational excellence in traditional channels.\n\n**Visual Suggestions:** Create a strategic vision radar chart showing Adidas vs competitors across growth, sustainability, innovation, and market positioning dimensions. Include a timeline visualization of strategic milestones achieved vs planned targets.\n\n### Diversity and Inclusion Leadership Commitment\n\n**Performance Narrative:** Adidas leads the industry in diversity and inclusion commitment with 40.7% women in leadership positions and systematic progress across all diversity dimensions. The company has set ambitious targets including 50% gender balance in leadership by 2033, supported by comprehensive structural changes including dedicated DEI leadership roles and integrated performance measurement systems.\n\n**Root Causes:** Leadership commitment stems from recognition of business value and systematic investment in structural change. Diversity outcomes result from dedicated leadership through Global Senior Vice President of DEI, market-specific DEI leaders, and integration of diversity metrics into executive compensation frameworks.\n\n**Competitor Comparison:** Adidas significantly outperforms most competitors. While Nike achieves 29% minority representation in VP roles, PUMA maintains 42% female leadership globally, and Under Armour reaches 82% employee engagement, Adidas combines high performance across all diversity metrics with systematic structural support.\n\n**Industry Trends & Context:** Increasing stakeholder expectations for authentic diversity commitment require measurable outcomes rather than aspirational statements. Adidas' approach aligns with best practices through quantifiable targets, executive accountability, and transparent progress reporting.\n\n**Recommendations:** Accelerate progress toward 2033 gender balance targets through enhanced leadership development programs. Expand diversity measurement systems to include advancement rates and retention metrics across demographic groups.\n\n**Visual Suggestions:** Develop diversity progress dashboard showing trajectory toward 2033 targets with quarterly milestones. Create competitive benchmark visualization comparing diversity metrics across key rivals.\n\n### Communication Skills and Transparency\n\n**Performance Narrative:** Adidas demonstrates strong communication effectiveness through transparent financial reporting and clear strategic messaging, achieving Brand Index score of 37.1 - the highest in over a decade. The company improved across all brand health metrics including Impression (37.9 to 44.7), Satisfaction (27.8 to 32.6), and Quality (40.0 to 45.6) scores.\n\n**Root Causes:** Communication effectiveness results from substantial marketing investment (€746 million, 14% increase) and systematic approach to stakeholder engagement. The company's transparency in addressing both achievements and challenges, including external uncertainties affecting guidance, demonstrates mature communication practices.\n\n**Competitor Comparison:** While Nike leads in certain digital engagement metrics, Adidas achieves superior brand health improvements and stakeholder satisfaction. PUMA maintains high employee engagement (91%) but faces communication challenges around restructuring initiatives.\n\n**Industry Trends & Context:** Contemporary communication requires multi-channel approaches integrating traditional and digital platforms while maintaining message consistency across diverse stakeholder groups.\n\n**Recommendations:** Enhance digital communication capabilities to match traditional media effectiveness. Develop more sophisticated crisis communication frameworks for managing external uncertainty while maintaining stakeholder confidence.\n\n**Visual Suggestions:** Brand health improvement visualization showing quarter-over-quarter progress across all metrics. Communication effectiveness matrix comparing internal vs external stakeholder satisfaction.\n\n### Environmental Performance and Sustainability Leadership\n\n**Performance Narrative:** Adidas achieves exceptional environmental performance with 20% reduction in overall greenhouse gas emissions across all scope categories. The company exceeded industry averages with Scope 1 and 2 emissions decreasing 17% and Scope 3 emissions reducing 20% compared to baseline measurements, demonstrating successful implementation of science-based targets aligned with 1.5°C pathway requirements.\n\n**Root Causes:** Environmental leadership results from comprehensive strategy implementation including 99% recycled polyester sourcing, systematic supply chain engagement, and commitment to avoid carbon credits except for residual emissions. Innovation initiatives like FUTURECRAFT.LOOP running shoe and \"Choose to Give Back\" resale program demonstrate integrated sustainability and business strategy.\n\n**Competitor Comparison:** Adidas leads environmental performance significantly. While Nike achieves 96% renewable energy usage, PUMA maintains CDP A-rating, and Under Armour commits to net-zero by 2050, Adidas combines superior current performance with systematic implementation across all emission scopes.\n\n**Industry Trends & Context:** Increasing regulatory requirements and consumer expectations for authentic environmental performance drive industry transformation toward circular economy models and science-based target adoption.\n\n**Recommendations:** Accelerate Scope 3 emission reductions through enhanced supplier financing support and transition planning assistance. Expand circular economy initiatives beyond current pilot programs to scale impact.\n\n**Visual Suggestions:** Environmental performance dashboard showing emissions reduction progress by scope category. Competitive environmental leadership matrix comparing current performance vs future commitments.\n\n### Brand Awareness and Recognition\n\n**Performance Narrative:** Adidas maintains exceptional brand awareness in Germany with strong global positioning, achieving highest Brand Index score in over a decade at 37.1. The company demonstrates consistent positive performance across diverse cultural and economic contexts, with double-digit growth in all major regions: Latin America (26%), Emerging Markets (23%), Europe (14%), Greater China (13%), and Japan/South Korea (13%).\n\n**Root Causes:** Brand strength results from sustained marketing investment (€746 million, representing 12.1% of sales) and successful product portfolio management across diverse categories. Strong performance across Originals, Sportswear, Running, Training, and Performance Basketball indicates effective brand positioning strategies.\n\n**Competitor Comparison:** While Nike maintains higher absolute brand awareness (98% in major markets), Adidas achieves superior brand health improvements and regional growth consistency. PUMA shows strong campaign performance but limited market penetration, while Under Armour faces brand awareness challenges in key markets.\n\n**Industry Trends & Context:** Contemporary brand building requires integration of digital and traditional channels while maintaining authentic brand purpose alignment with consumer values around sustainability and social responsibility.\n\n**Recommendations:** Leverage brand health improvements to accelerate market share growth in underperforming regions. Enhance digital brand engagement capabilities to support direct-to-consumer channel expansion.\n\n**Visual Suggestions:** Global brand performance heat map showing regional strength variations. Brand health evolution timeline demonstrating quarterly improvements across all consumer perception metrics.\n\n## Conclusion\n\nAdidas Germany emerges as the clear leadership benchmark in the sportswear industry for Q1 2025, achieving exceptional performance across most critical leadership dimensions. The company's overall Leadership Score of 85 (A-) significantly exceeds the industry average of 77 (B+), driven by outstanding environmental performance (92/100), brand awareness (90/100), and diversity commitment (88/100).\n\nThe strategic leadership transformation demonstrates measurable success through 13% revenue growth, 20% emissions reduction, and achievement of the highest brand health scores in over a decade. Adidas' systematic approach to sustainability leadership, diversity advancement, and stakeholder engagement creates sustainable competitive advantages that position the company favorably for long-term success in the German market.\n\nKey improvement priorities include enhancing digital communication capabilities, accelerating Scope 3 emissions reductions, and strengthening market-specific customer experience optimization. The company's strong foundation across strategic vision, environmental performance, and brand equity provides the platform necessary for addressing these opportunities while maintaining leadership position.\n\nNext steps should focus on leveraging current strengths to address competitive gaps, particularly in digital innovation and regional market penetration. Adidas' comprehensive leadership performance establishes the company as the benchmark for integrated sustainability, operational excellence, and stakeholder value creation in the global sportswear industry.`;

  return (
    <div style={{ 
      padding: '24px', 
      background: '#141414', 
      minHeight: '100vh',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
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
            Analysis Report Generated
          </Title>
          <Text style={{ color: '#8c8c8c' }}>
            Your comprehensive analysis report is ready
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
          bodyStyle={{ padding: '20px' }}
        >
          <Title level={4} style={{ color: '#58bfce', marginBottom: '16px' }}>
            <CheckCircleOutlined style={{ marginRight: '8px' }} />
            Analysis Parameters
          </Title>
          <div style={{ color: '#d9d9d9' }}>
            <p><strong>Company:</strong> {quizData.companyName}</p>
            <p><strong>Business Line:</strong> {quizData.businessLine}</p>
            <p><strong>Country:</strong> {quizData.country}</p>
            <p><strong>Use Case:</strong> {quizData.useCase}</p>
            <p><strong>Timeline:</strong> {quizData.timeline}</p>
          </div>
        </Card>

        {/* Markdown Report */}
        <Card
          style={{
            background: '#262626',
            border: '1px solid #434343',
            borderRadius: '8px',
            marginBottom: '32px'
          }}
          bodyStyle={{ padding: '32px' }}
        >
          <div style={{ 
            color: '#d9d9d9',
            fontSize: '14px',
            lineHeight: '1.6'
          }}>
            <ReactMarkdown
              components={{
                h1: ({children}) => <h1 style={{color: '#58bfce', fontSize: '24px', marginBottom: '16px', marginTop: '24px'}}>{children}</h1>,
                h2: ({children}) => <h2 style={{color: '#58bfce', fontSize: '20px', marginBottom: '12px', marginTop: '20px'}}>{children}</h2>,
                h3: ({children}) => <h3 style={{color: '#58bfce', fontSize: '18px', marginBottom: '10px', marginTop: '16px'}}>{children}</h3>,
                h4: ({children}) => <h4 style={{color: '#58bfce', fontSize: '16px', marginBottom: '8px', marginTop: '14px'}}>{children}</h4>,
                p: ({children}) => <p style={{marginBottom: '12px'}}>{children}</p>,
                strong: ({children}) => <strong style={{color: '#ffffff'}}>{children}</strong>,
                table: ({children}) => <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '16px'}}>{children}</table>,
                th: ({children}) => <th style={{border: '1px solid #434343', padding: '8px', textAlign: 'left', backgroundColor: '#1f1f1f', color: '#58bfce'}}>{children}</th>,
                td: ({children}) => <td style={{border: '1px solid #434343', padding: '8px', color: '#d9d9d9'}}>{children}</td>,
                ul: ({children}) => <ul style={{marginBottom: '12px', paddingLeft: '20px'}}>{children}</ul>,
                ol: ({children}) => <ol style={{marginBottom: '12px', paddingLeft: '20px'}}>{children}</ol>,
                li: ({children}) => <li style={{marginBottom: '4px'}}>{children}</li>,
                blockquote: ({children}) => <blockquote style={{borderLeft: '4px solid #58bfce', paddingLeft: '16px', margin: '16px 0', fontStyle: 'italic', color: '#8c8c8c'}}>{children}</blockquote>,
                code: ({children}) => <code style={{backgroundColor: '#1f1f1f', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace'}}>{children}</code>,
                pre: ({children}) => <pre style={{backgroundColor: '#1f1f1f', padding: '16px', borderRadius: '8px', overflow: 'auto', marginBottom: '16px'}}>{children}</pre>
              }}
            >
              {preparedAnswer}
            </ReactMarkdown>
          </div>
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
              Start New Analysis
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
