'use client';

import { useAuthStore } from '../../stores/auth-store';
import Sidebar from '../ui/sidebar';
import {
  Layout,
  Card,
  Input,
  Button,
  Typography,
  Space,
  Avatar,
  Spin,
  message as antMessage,
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  RobotOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useState, useRef, useEffect } from 'react';
import { chatService, Message as ChatMessage } from '../../services/chatService';
import { useRouter, useSearchParams } from 'next/navigation';
import { log } from 'console';

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface AnalysisData {
  companyName: string;
  businessLine: string;
  country: string;
  useCase: string;
  timeline: string;
}

export default function AnalyzeChat() {
  const { email } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [analysisData, setAnalysisData] = useState<AnalysisData>({
    companyName: '',
    businessLine: '',
    country: '',
    useCase: '',
    timeline: ''
  });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const questions = [
    "What is the name of the company you want to analyze?",
    "What is the main business line or industry of this company?",
    "In which country does this company operate?",
    "What is the specific use case or area you want to analyze? (e.g., Leadership, Marketing, Finance, Operations)",
    "What is your preferred timeline for this analysis? (e.g., Q1 2025, Q1 2024 - Q3 2025)"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

const preparedAnswer = `\n\n# Leadership Company Analysis Report: Adidas Germany\n**Business Line:** Sportswear | **Period:** Q1 2025 | **Category:** Leadership\n\n## Executive Summary\n\nAdidas Germany demonstrates strong leadership performance in Q1 2025, positioning itself as a Tier 1 player in the German sportswear market with significant competitive advantages over key rivals. The company achieved exceptional financial performance with 13% currency-neutral revenue growth to €6.15 billion, while simultaneously advancing ambitious sustainability targets and diversity initiatives[1][2]. \n\nAdidas maintains leadership across multiple critical dimensions, including strategic vision execution, environmental performance with a 20% reduction in overall greenhouse gas emissions, and diversity advancement with 40.7% women in leadership positions. The company's brand strength is evidenced by achieving its highest Brand Index score in over a decade at 37.1, with substantial improvements across all consumer perception metrics including Impression scores (37.9 to 44.7) and Quality perception (40.0 to 45.6).\n\nHowever, the analysis reveals strategic challenges requiring attention. While Adidas leads in operational excellence and sustainability, communication effectiveness shows mixed results with varying regional performance and digital transformation requirements. The company's marketing investment of €746 million (12.1% of sales) demonstrates commitment to brand building, yet conversion of brand awareness to customer engagement remains inconsistent across markets.\n\nKey competitive positioning shows Adidas significantly outperforming rivals in financial scale and sustainability leadership, while facing challenges in digital innovation and market-specific customer experience optimization. The company's strategic transformation initiatives, including comprehensive upskilling programs and environmental commitments, position it favorably for long-term competitive advantage in the German market.\n\n## KPI Scorecard - Q1 2025 Leadership Benchmark\n\n| Leadership KPI | Adidas Germany | Nike | PUMA | Under Armour | New Balance | ASICS | Ideal |\n|---|---|---|---|---|---|---|---|\n| Strategic Vision & Direction | 85 | 75 | 70 | 65 | 68 | 78 | 95 |\n| Diversity & Inclusion Commitment | 88 | 82 | 85 | 80 | 72 | 77 | 95 |\n| Communication Skills & Transparency | 78 | 85 | 82 | 70 | 75 | 80 | 95 |\n| Upskilling Programs & Digital Development | 82 | 88 | 75 | 72 | 70 | 73 | 95 |\n| Learning Culture & Continuous Development | 85 | 80 | 83 | 75 | 72 | 78 | 95 |\n| Empathy & Support in Leadership | 80 | 75 | 88 | 82 | 74 | 85 | 95 |\n| Environmental Performance | 92 | 78 | 90 | 75 | 70 | 82 | 95 |\n| Brand Awareness & Recognition | 90 | 98 | 72 | 61 | 61 | 72 | 95 |\n\n**Overall Leadership Score: 85** (A-) vs Industry Average: 77 (B+)\n\n## Narrative Findings\n\n### Strategic Vision and Direction Leadership\n\n**Performance Narrative:** Adidas demonstrates exceptional strategic vision execution through consistent double-digit growth and clear communication of long-term objectives. The company achieved 13% currency-neutral revenue growth in Q1 2025, with the Adidas brand specifically growing 17%, outpacing overall company performance[1][3]. CEO Bjørn Gulden's strategic messaging emphasized sustained momentum across all markets and channels, with footwear leading at 17% growth driven by success across Originals, Sportswear, Running, Training, and Performance Basketball categories[2].\n\n**Root Causes:** Strategic clarity emerges from comprehensive transformation initiatives recognizing systemic challenges and implementing systematic solutions. The company's approach to strategic vision encompasses acknowledgment of external uncertainties while maintaining confidence in underlying business fundamentals, as evidenced by maintaining marketing investment at €746 million (12.1% of sales) despite volatile market conditions.\n\n**Competitor Comparison:** Adidas significantly outperforms competitors in strategic vision execution. While Nike faces revenue decline (10% drop in Q1 FY25) and market share erosion, and PUMA implements cost reduction programs targeting 500 job cuts, Adidas maintains growth momentum across all categories. Under Armour's strategic repositioning efforts show early promise but lack the scale and consistency of Adidas' execution.\n\n**Industry Trends & Context:** The global sportswear market increasingly demands integrated sustainability and performance positioning, with consumers expecting authentic brand purpose alignment. Adidas' strategic vision effectively addresses these trends through science-based environmental targets while maintaining product innovation leadership.\n\n**Recommendations:** Enhance regional strategic customization to address geographic performance variations. Strengthen strategic communication around digital transformation initiatives to match operational excellence in traditional channels.\n\n**Visual Suggestions:** Create a strategic vision radar chart showing Adidas vs competitors across growth, sustainability, innovation, and market positioning dimensions. Include a timeline visualization of strategic milestones achieved vs planned targets.\n\n### Diversity and Inclusion Leadership Commitment\n\n**Performance Narrative:** Adidas leads the industry in diversity and inclusion commitment with 40.7% women in leadership positions and systematic progress across all diversity dimensions. The company has set ambitious targets including 50% gender balance in leadership by 2033, supported by comprehensive structural changes including dedicated DEI leadership roles and integrated performance measurement systems.\n\n**Root Causes:** Leadership commitment stems from recognition of business value and systematic investment in structural change. Diversity outcomes result from dedicated leadership through Global Senior Vice President of DEI, market-specific DEI leaders, and integration of diversity metrics into executive compensation frameworks.\n\n**Competitor Comparison:** Adidas significantly outperforms most competitors. While Nike achieves 29% minority representation in VP roles, PUMA maintains 42% female leadership globally, and Under Armour reaches 82% employee engagement, Adidas combines high performance across all diversity metrics with systematic structural support.\n\n**Industry Trends & Context:** Increasing stakeholder expectations for authentic diversity commitment require measurable outcomes rather than aspirational statements. Adidas' approach aligns with best practices through quantifiable targets, executive accountability, and transparent progress reporting.\n\n**Recommendations:** Accelerate progress toward 2033 gender balance targets through enhanced leadership development programs. Expand diversity measurement systems to include advancement rates and retention metrics across demographic groups.\n\n**Visual Suggestions:** Develop diversity progress dashboard showing trajectory toward 2033 targets with quarterly milestones. Create competitive benchmark visualization comparing diversity metrics across key rivals.\n\n### Communication Skills and Transparency\n\n**Performance Narrative:** Adidas demonstrates strong communication effectiveness through transparent financial reporting and clear strategic messaging, achieving Brand Index score of 37.1 - the highest in over a decade. The company improved across all brand health metrics including Impression (37.9 to 44.7), Satisfaction (27.8 to 32.6), and Quality (40.0 to 45.6) scores.\n\n**Root Causes:** Communication effectiveness results from substantial marketing investment (€746 million, 14% increase) and systematic approach to stakeholder engagement. The company's transparency in addressing both achievements and challenges, including external uncertainties affecting guidance, demonstrates mature communication practices.\n\n**Competitor Comparison:** While Nike leads in certain digital engagement metrics, Adidas achieves superior brand health improvements and stakeholder satisfaction. PUMA maintains high employee engagement (91%) but faces communication challenges around restructuring initiatives.\n\n**Industry Trends & Context:** Contemporary communication requires multi-channel approaches integrating traditional and digital platforms while maintaining message consistency across diverse stakeholder groups.\n\n**Recommendations:** Enhance digital communication capabilities to match traditional media effectiveness. Develop more sophisticated crisis communication frameworks for managing external uncertainty while maintaining stakeholder confidence.\n\n**Visual Suggestions:** Brand health improvement visualization showing quarter-over-quarter progress across all metrics. Communication effectiveness matrix comparing internal vs external stakeholder satisfaction.\n\n### Environmental Performance and Sustainability Leadership\n\n**Performance Narrative:** Adidas achieves exceptional environmental performance with 20% reduction in overall greenhouse gas emissions across all scope categories. The company exceeded industry averages with Scope 1 and 2 emissions decreasing 17% and Scope 3 emissions reducing 20% compared to baseline measurements, demonstrating successful implementation of science-based targets aligned with 1.5°C pathway requirements.\n\n**Root Causes:** Environmental leadership results from comprehensive strategy implementation including 99% recycled polyester sourcing, systematic supply chain engagement, and commitment to avoid carbon credits except for residual emissions. Innovation initiatives like FUTURECRAFT.LOOP running shoe and \"Choose to Give Back\" resale program demonstrate integrated sustainability and business strategy.\n\n**Competitor Comparison:** Adidas leads environmental performance significantly. While Nike achieves 96% renewable energy usage, PUMA maintains CDP A-rating, and Under Armour commits to net-zero by 2050, Adidas combines superior current performance with systematic implementation across all emission scopes.\n\n**Industry Trends & Context:** Increasing regulatory requirements and consumer expectations for authentic environmental performance drive industry transformation toward circular economy models and science-based target adoption.\n\n**Recommendations:** Accelerate Scope 3 emission reductions through enhanced supplier financing support and transition planning assistance. Expand circular economy initiatives beyond current pilot programs to scale impact.\n\n**Visual Suggestions:** Environmental performance dashboard showing emissions reduction progress by scope category. Competitive environmental leadership matrix comparing current performance vs future commitments.\n\n### Brand Awareness and Recognition\n\n**Performance Narrative:** Adidas maintains exceptional brand awareness in Germany with strong global positioning, achieving highest Brand Index score in over a decade at 37.1. The company demonstrates consistent positive performance across diverse cultural and economic contexts, with double-digit growth in all major regions: Latin America (26%), Emerging Markets (23%), Europe (14%), Greater China (13%), and Japan/South Korea (13%).\n\n**Root Causes:** Brand strength results from sustained marketing investment (€746 million, representing 12.1% of sales) and successful product portfolio management across diverse categories. Strong performance across Originals, Sportswear, Running, Training, and Performance Basketball indicates effective brand positioning strategies.\n\n**Competitor Comparison:** While Nike maintains higher absolute brand awareness (98% in major markets), Adidas achieves superior brand health improvements and regional growth consistency. PUMA shows strong campaign performance but limited market penetration, while Under Armour faces brand awareness challenges in key markets.\n\n**Industry Trends & Context:** Contemporary brand building requires integration of digital and traditional channels while maintaining authentic brand purpose alignment with consumer values around sustainability and social responsibility.\n\n**Recommendations:** Leverage brand health improvements to accelerate market share growth in underperforming regions. Enhance digital brand engagement capabilities to support direct-to-consumer channel expansion.\n\n**Visual Suggestions:** Global brand performance heat map showing regional strength variations. Brand health evolution timeline demonstrating quarterly improvements across all consumer perception metrics.\n\n## Conclusion\n\nAdidas Germany emerges as the clear leadership benchmark in the sportswear industry for Q1 2025, achieving exceptional performance across most critical leadership dimensions. The company's overall Leadership Score of 85 (A-) significantly exceeds the industry average of 77 (B+), driven by outstanding environmental performance (92/100), brand awareness (90/100), and diversity commitment (88/100).\n\nThe strategic leadership transformation demonstrates measurable success through 13% revenue growth, 20% emissions reduction, and achievement of the highest brand health scores in over a decade. Adidas' systematic approach to sustainability leadership, diversity advancement, and stakeholder engagement creates sustainable competitive advantages that position the company favorably for long-term success in the German market.\n\nKey improvement priorities include enhancing digital communication capabilities, accelerating Scope 3 emissions reductions, and strengthening market-specific customer experience optimization. The company's strong foundation across strategic vision, environmental performance, and brand equity provides the platform necessary for addressing these opportunities while maintaining leadership position.\n\nNext steps should focus on leveraging current strengths to address competitive gaps, particularly in digital innovation and regional market penetration. Adidas' comprehensive leadership performance establishes the company as the benchmark for integrated sustainability, operational excellence, and stakeholder value creation in the global sportswear industry.",
    "improvementLeverages": "\n\n# Leadership Company Analysis Report: Adidas Germany\n**Q1 2025 Sportswear Market Analysis**\n\n---\n\nAdidas demonstrates strong leadership capabilities in the German sportswear market during Q1 2025, achieving significant financial momentum with 13% currency-neutral revenue growth to €6.15 billion while advancing key leadership priorities including diversity advancement and sustainability commitments[1][2]. The company's leadership performance reflects a maturing organization successfully balancing growth objectives with stakeholder expectations, evidenced by maintaining women's leadership representation at 40.7% and achieving a 20% reduction in overall greenhouse gas emissions. However, competitive analysis reveals leadership gaps in specific areas, particularly in digital transformation pace and crisis communication effectiveness compared to industry leaders like Nike and emerging competitors. The leadership assessment positions Adidas as a **Tier 1 performer** in strategic vision and environmental leadership, while ranking **Tier 2** in digital upskilling and empathetic support systems relative to best-in-class competitors.\n\n## **KPI Scorecard: Leadership Competitive Benchmark**\n\n| Leadership Dimension | Adidas Germany | Nike Inc. | PUMA SE | Under Armour | New Balance | ASICS Corp. | Industry Best Practice |\n|---------------------|----------------|-----------|---------|--------------|-------------|-------------|----------------------|\n| **Strategic Vision & Direction** | 85 (A-) | 82 (A-) | 75 (B+) | 70 (B) | 72 (B) | 78 (B+) | 87 (A) |\n| **Diversity & Inclusion Commitment** | 82 (A-) | 85 (A) | 80 (A-) | 75 (B+) | 68 (C+) | 70 (B) | 87 (A) |\n| **Communication Skills & Transparency** | 78 (B+) | 80 (A-) | 85 (A) | 72 (B) | 65 (C+) | 75 (B+) | 88 (A) |\n| **Upskilling Programs & Digital Development** | 75 (B+) | 88 (A) | 78 (B+) | 70 (B) | 68 (C+) | 72 (B) | 90 (A) |\n| **Learning Culture & Continuous Development** | 80 (A-) | 82 (A-) | 83 (A-) | 77 (B+) | 70 (B) | 75 (B+) | 85 (A) |\n| **Empathy & Support Systems** | 72 (B) | 78 (B+) | 85 (A) | 80 (A-) | 68 (C+) | 76 (B+) | 85 (A) |\n| **Environmental Performance & Sustainability** | 88 (A) | 84 (A-) | 90 (A) | 75 (B+) | 72 (B) | 85 (A-) | 92 (A) |\n| **Brand Awareness & Recognition** | 86 (A) | 88 (A) | 75 (B+) | 68 (C+) | 70 (B) | 78 (B+) | 90 (A) |\n| **Overall Leadership Index** | **81 (A--)** | **83 (A-)** | **81 (A-)** | **73 (B+)** | **69 (C+)** | **76 (B+)** | **86 (A)** |\n\n*Note: Scores range from 0-100 with letter grades: A (85-100), B (70-84), C (55-69), D (40-54), F (0-39)*\n\n## **Strategic Vision and Direction Leadership**\n\n**Adidas Performance & Drivers:** Adidas demonstrates exceptional strategic vision clarity through consistent execution of its growth strategy, achieving 13% currency-neutral revenue growth to €6.15 billion in Q1 2025[1]. CEO Bjørn Gulden's communication provides specific quantitative guidance while maintaining strategic coherence across global operations, with the company reporting growth across all markets and channels. The strategic decision-making framework balances external uncertainties with business fundamentals, as evidenced by maintaining confidence in long-term direction while acknowledging tariff-related challenges that prevented full-year outlook increases[1].\n\n**Competitor Comparison:** Nike achieves similar strategic vision effectiveness with its four-pillar strategic framework, though recent 10% revenue decline indicates execution challenges. PUMA's strategic vision shows mixed results with new leadership appointment of Arthur Hoeld as CEO, requiring significant cost efficiency programs targeting €100 million EBIT improvements. Under Armour's strategic transformation demonstrates clear vision articulation but faces implementation challenges with 10% revenue decline and $300 million operating losses.\n\n**Context/Trends:** The sportswear industry requires strategic agility to address tariff uncertainty, supply chain disruption, and rapidly changing consumer preferences. Companies demonstrating consistent strategic communication and measurable progress toward long-term objectives achieve superior stakeholder confidence and market positioning.\n\n**Implications/Recommendations:** Adidas should leverage its strategic vision strength to accelerate digital transformation initiatives and enhance regional market adaptation, particularly in challenging markets like North America where competitors face similar headwinds.\n\n## **Diversity and Inclusion Leadership Commitment**\n\n**Adidas Performance & Drivers:** Adidas achieves strong diversity leadership through measurable targets and systematic implementation. Women represent 40.7% of leadership positions (Director level and above) as of December 2024, showing progression from 39.6% in 2023[1]. The German market specifically targets 40% female representation at first and second management levels below the Executive Board by 2025, currently achieving 36.1% and 38.2% respectively. The structural approach includes dedicated Global Senior Vice President of DEI and market-specific DEI leaders, with comprehensive \"Creating an Equal Playing Field for All\" strategy built on People, Culture, and Accountability pillars.\n\n**Competitor Comparison:** Nike leads diversity commitment with 50% female representation targets and historic executive compensation linkage to diversity goals, specifically 29% minority representation by 2025. PUMA maintains 42% female leadership globally with recognition as Financial Times Diversity Leader for five consecutive years. Under Armour achieves 82% employee engagement while implementing accelerated DEI strategy, though specific representation metrics lag industry leaders.\n\n**Context/Trends:** Industry leadership in diversity increasingly requires measurable outcomes, structural accountability mechanisms, and integration with business strategy rather than symbolic commitments. Companies achieving sustained diversity advancement demonstrate systematic approaches with executive accountability and resource allocation.\n\n**Implications/Recommendations:** Adidas should accelerate progress toward German market gender targets while expanding diversity measurement beyond gender to encompass ethnicity and other dimensions, following Nike's comprehensive approach to minority representation tracking.\n\n## **Communication Skills and Transparency**\n\n**Adidas Performance & Drivers:** Adidas demonstrates enhanced communication effectiveness through transparent financial reporting and authentic acknowledgment of challenges and achievements. The company's quarterly results communication provides specific quantitative metrics while contextualizing performance within market conditions. CEO Gulden's commentary exemplifies transparent leadership by explicitly addressing tensions between strong results and external uncertainties, maintaining credibility through balanced messaging[1][2].\n\n**Competitor Comparison:** PUMA achieves exceptional communication effectiveness with 91% employee engagement scores and systematic feedback systems including Peakon Employee Voice platform. Nike demonstrates mixed communication results with strong brand messaging but challenges in crisis communication effectiveness. Under Armour maintains 82% employee engagement despite financial challenges, indicating effective internal communication systems.\n\n**Context/Trends:** Contemporary leadership communication requires multi-channel approaches, real-time feedback systems, and authentic transparency about challenges and uncertainties. Companies achieving superior communication effectiveness integrate employee feedback systems with strategic decision-making processes.\n\n**Implications/Recommendations:** Adidas should implement more sophisticated employee feedback systems similar to PUMA's Peakon platform and enhance crisis communication protocols to maintain stakeholder confidence during volatile periods.\n\n## **Environmental Performance and Sustainability Leadership**\n\n**Adidas Performance & Drivers:** Adidas achieves exceptional environmental leadership with 20% reduction in total greenhouse gas emissions across all scopes, exceeding industry averages and demonstrating successful implementation of science-based targets[1]. The company achieved 70% reduction in Scope 1 and 2 emissions toward its 2025 climate neutrality target, while Scope 3 emissions declined 20% despite business growth challenges. Material innovation contributes significantly with 99% of polyester sourced from recycled materials and systematic circular economy initiatives including the FUTURECRAFT.LOOP running shoe program.\n\n**Competitor Comparison:** PUMA leads environmental performance with CDP A-rating maintenance and 90% absolute greenhouse gas reduction commitments for Scope 1 and 2 emissions by 2030. Nike achieves 96% renewable energy usage (up from 48% in 2020) and 73% Scope 1 and 2 emissions reduction, though faces Scope 3 challenges with 3% increase. Under Armour and New Balance show ambitious targets but limited progress reporting compared to German market leaders.\n\n**Context/Trends:** Environmental leadership increasingly requires comprehensive scope 3 supply chain engagement, measurable interim targets, and transparency about offset usage limitations. Leading companies demonstrate systematic supplier engagement and financing support for decarbonization initiatives.\n\n**Implications/Recommendations:** Adidas should enhance supply chain financing support for thermal transition programs and accelerate circular economy initiatives to maintain environmental leadership positioning against aggressive competitor commitments.\n\n## **Brand Awareness and Recognition**\n\n**Adidas Performance & Drivers:** Adidas demonstrates exceptional brand performance with Brand Index score reaching 37.1 in 2024, the highest in over a decade[1]. Consumer impression metrics improved dramatically from 37.9 to 44.7 (18% improvement), while quality perception increased from 40.0 to 45.6. The company achieved substantial marketing investment increases to €746 million (14% growth, 12.1% of sales) in Q1 2025, supporting global market growth across all regions: Latin America (26%), Emerging Markets (23%), Europe (14%), and Greater China (13%).\n\n**Competitor Comparison:** Nike maintains dominant brand awareness with 98% recognition in Germany and superior global market capitalization of $129.240 billion versus Adidas's $43.54 billion. PUMA achieves strong campaign effectiveness with \"Go Wild\" ranking in top 5% globally, while Under Armour shows 61% German brand awareness with exceptional 79% loyalty among users. New Balance and ASICS maintain solid regional positioning but lag in global brand momentum.\n\n**Context/Trends:** Brand leadership requires sustained marketing investment, authentic messaging alignment with company values, and consistent global execution. Companies achieving superior brand performance demonstrate integrated marketing approaches with measurable consumer engagement improvements.\n\n**Implications/Recommendations:** Adidas should leverage brand momentum strength to expand market share in underperforming regions while maintaining marketing investment levels to defend against competitive pressure from Nike and emerging brands.\n\n## **Conclusion**\n\nAdidas demonstrates strong leadership capabilities across multiple dimensions during Q1 2025, achieving an overall Leadership Index score of 81 (A-) that positions it among industry leaders alongside Nike and PUMA. The company's exceptional performance in strategic vision (85), environmental leadership (88), and brand recognition (86) reflects mature organizational capabilities and sustained competitive advantage in the German sportswear market. However, leadership gaps in empathy and support systems (72) and upskilling programs (75) present opportunities for improvement relative to best-in-class competitors.\n\nThe financial performance foundation of 13% revenue growth and improved margins provides solid platform for continued leadership investment, while the company's systematic approach to diversity advancement and environmental performance creates sustainable competitive differentiation. Adidas leadership should prioritize digital transformation acceleration, enhanced employee support systems, and crisis communication capability development to achieve industry-leading performance across all leadership dimensions.\n\nThe leadership assessment reveals that Adidas possesses the strategic vision and operational capabilities necessary for sustained market leadership in Germany, requiring focused execution improvements in identified gap areas to maximize competitive positioning and stakeholder value creation.\n\n---\n\n## **Top 10 Leadership Improvement Levers**\n\n### **1. Digital Upskilling Platform Enhancement**\n**Pain Point:** Limited comprehensive digital learning infrastructure compared to industry leaders, constraining workforce adaptation to technological change and innovation requirements.\n\n**Evidence:** \n- Adidas scores 75 (B+) in upskilling programs versus Nike's 88 (A) and industry best practice of 90 (A)\n- Competitor analysis shows Nike's acquisition of Celect for AI integration and comprehensive digital learning platforms\n- Missing systematic digital skills assessment and development tracking compared to competitor offerings\n\n**Suggested Fix:** Implement integrated digital learning platform combining AI-powered skill assessment, personalized learning pathways, and real-time progress tracking. Partner with leading technology providers to offer comprehensive curriculum covering artificial intelligence, data analytics, and digital commerce capabilities.\n\n**Impact:** High – Could improve upskilling scores by 10-12 points and accelerate digital transformation capabilities essential for competitive positioning in evolving sportswear market.\n\n**Effort:** Medium – Requires 6-9 month platform development and integration, plus training program content creation and employee onboarding across global operations.\n\n### **2. Employee Feedback and Engagement System Modernization**\n**Pain Point:** Outdated employee feedback mechanisms limiting real-time organizational insight and responsive leadership decision-making compared to competitor best practices.\n\n**Evidence:**\n- PUMA achieves 91% employee engagement through Peakon Employee Voice platform enabling frequent, streamlined feedback collection\n- Under Armour maintains 82% engagement despite financial challenges through systematic feedback systems\n- Adidas lacks comparable real-time feedback infrastructure for rapid response to employee concerns\n\n**Suggested Fix:** Deploy advanced employee feedback platform enabling continuous pulse surveys, anonymous feedback channels, and manager dashboard insights. Implement monthly feedback cycles replacing annual survey approaches, with automated action plan generation and progress tracking.\n\n**Impact:** High – Could improve communication transparency scores by 8-10 points and enhance employee engagement through responsive leadership practices.\n\n**Effort:** Low/Medium – Platform deployment achievable within 3-4 months with existing technology vendors, requiring manager training and change management support.\n\n### **3. Crisis Communication Protocol Enhancement**\n**Pain Point:** Limited systematic crisis communication capabilities constraining leadership effectiveness during volatile market conditions and stakeholder confidence maintenance.\n\n**Evidence:**\n- External uncertainties prevented full-year outlook increases despite strong Q1 performance, indicating communication challenges\n- Competitor Nike demonstrates mixed crisis communication effectiveness despite strong brand positioning\n- Missing structured crisis communication playbooks and stakeholder engagement protocols\n\n**Suggested Fix:** Develop comprehensive crisis communication framework including pre-approved messaging templates, stakeholder mapping, communication channel optimization, and decision-making authority matrices. Establish crisis communication team with quarterly scenario planning exercises.\n\n**Impact:** Medium/High – Enhances stakeholder confidence during challenging periods and supports consistent leadership messaging across multiple constituencies.\n\n**Effort:** Low/Medium – Framework development and team training achievable within 2-3 months, requiring ongoing scenario planning and protocol updates.\n\n### **4. Regional Market Communication Customization**\n**Pain Point:** Limited regional adaptation of communication strategies constraining market penetration effectiveness, particularly in challenging markets requiring localized approaches.\n\n**Evidence:**\n- North America faces headwinds from Yeezy phase-out, achieving only 3% growth versus double-digit growth in other regions\n- Competitor regional performance variations indicate need for targeted communication approaches\n- Missing systematic regional communication strategy development and measurement systems\n\n**Suggested Fix:** Establish regional communication strategy development process including local market research, cultural adaptation protocols, and region-specific messaging development. Implement regional communication effectiveness measurement and optimization systems.\n\n**Impact:** Medium – Could improve regional market performance and brand awareness effectiveness through enhanced local market engagement and relevance.\n\n**Effort:** Medium – Requires regional team development, market research investment, and communication strategy customization across multiple markets.\n\n### **5. Supplier Environmental Performance Support Program**\n**Pain Point:** Limited supplier decarbonization financing and technical support constraining Scope 3 emissions reduction progress and comprehensive environmental leadership achievement.\n\n**Evidence:**\n- Achieved 20% Scope 3 emissions reduction but competitors like PUMA demonstrate more aggressive supplier engagement approaches\n- Missing systematic supplier transition financing and technical assistance programs compared to industry leaders\n- Supply chain engagement training exists but lacks financial support mechanisms for supplier transformation\n\n**Suggested Fix:** Launch supplier decarbonization support program including transition financing options, technical assistance partnerships, and renewable energy procurement facilitation. Establish supplier environmental performance incentive structures and collaborative improvement initiatives.\n\n**Impact:** High – Essential for achieving long-term environmental leadership positioning and comprehensive sustainability target achievement across value chain.\n\n**Effort:** High – Requires substantial financial commitment, partnership development, and supplier engagement infrastructure creation over 12-18 months.\n\n### **6. Diversity Pipeline Development Enhancement**\n**Pain Point:** Limited systematic approaches to building diverse leadership pipelines constraining acceleration of diversity representation targets and long-term inclusive leadership development.\n\n**Evidence:**\n- Current 40.7% women in leadership positions shows progress but requires acceleration to achieve industry-leading positioning\n- Nike demonstrates executive compensation linkage to diversity targets and systematic pipeline development approaches\n- Missing comprehensive leadership pipeline tracking and development support for underrepresented groups\n\n**Suggested Fix:** Implement systematic diversity pipeline development program including targeted recruitment partnerships, mentorship program expansion, leadership development track creation, and succession planning optimization for diverse candidates.\n\n**Impact:** High – Critical for achieving competitive diversity positioning and building sustainable inclusive leadership capabilities for long-term market success.\n\n**Effort:** Medium – Program development and implementation achievable within 6-8 months, requiring partnership establishment and tracking system creation.\n\n### **7. Internal Innovation Lab and Experimentation Platform**\n**Pain Point:** Limited systematic innovation experimentation capabilities constraining workforce creativity development and organizational learning acceleration compared to competitor practices.\n\n**Evidence:**\n- Competitors like Under Armour demonstrate innovation lab approaches supporting both skill development and business innovation\n- Missing structured employee innovation opportunity creation and experimentation support systems\n- Limited evidence of systematic innovation skills development and creative capability building\n\n**Suggested Fix:** Establish internal innovation labs with maker spaces, experimentation funding, cross-functional project opportunities, and innovation skills training. Create innovation challenge programs and collaborative project platforms supporting employee creativity development.\n\n**Impact:** Medium/High – Supports both individual skill development and organizational innovation capability, contributing to competitive differentiation and employee engagement.\n\n**Effort:** Medium/High – Requires physical space investment, equipment procurement, program development, and ongoing project funding over 6-12 months.\n\n### **8. Leadership Development Program Expansion**\n**Pain Point:** Limited comprehensive leadership development infrastructure constraining management capability building and succession planning effectiveness across global operations.\n\n**Evidence:**\n- Strong strategic vision execution suggests leadership capability foundation exists but lacks systematic development programming\n- Competitors demonstrate structured leadership development pathways with measurable progression tracking\n- Missing comprehensive leadership competency development and assessment systems comparable to industry leaders\n\n**Suggested Fix:** Launch comprehensive leadership development academy including multi-tiered programs, 360-degree feedback systems, cross-functional assignment opportunities, and executive coaching support. Implement leadership competency tracking and succession planning integration.\n\n**Impact:** High – Essential for sustaining leadership effectiveness and building organizational capability for continued growth and market leadership.\n\n**Effort:** Medium/High – Program design and implementation requires 8-10 months with significant investment in training infrastructure and coach development.\n\n### **9. Employee Wellbeing and Support System Enhancement**\n**Pain Point:** Limited comprehensive employee wellbeing support infrastructure constraining empathetic leadership effectiveness and organizational resilience during challenging periods.\n\n**Evidence:**\n- Empathy and support systems score of 72 (B) lags competitors like PUMA (85) and Under Armour (80) despite strong business performance\n- Missing systematic employee wellbeing measurement and support program development\n- Limited evidence of comprehensive work-life integration support and mental health resources\n\n**Suggested Fix:** Develop comprehensive employee wellbeing program including mental health resources, flexible work arrangement optimization, family support services, and wellbeing measurement systems. Implement manager training for empathetic leadership and employee support.\n\n**Impact:** Medium/High – Improves employee engagement, retention, and organizational resilience while supporting leadership effectiveness during volatile periods.\n\n**Effort:** Medium – Program development and implementation achievable within 4-6 months with existing resources and vendor partnerships.\n\n### **10. Brand Awareness Optimization in Underperforming Markets**\n**Pain Point:** Inconsistent brand awareness effectiveness across geographic markets limiting growth potential and competitive positioning in key regions requiring strategic attention.\n\n**Evidence:**\n- Strong overall brand performance (86 score) masks regional variations with North America showing only 3% growth\n- Competitors maintain more consistent geographic performance through targeted regional brand strategies\n- Marketing investment of €746 million provides foundation but requires optimization for underperforming markets\n\n**Suggested Fix:** Implement regional brand awareness optimization program including market-specific research, localized campaign development, channel optimization, and performance measurement systems. Establish regional brand performance accountability and continuous improvement processes.\n\n**Impact:** Medium – Supports overall growth acceleration and competitive positioning improvement in strategic markets essential for long-term expansion.\n\n**Effort:** Medium – Regional strategy development and implementation requires 4-6 months with marketing team expansion and research investment.",
    "headToHead": "\n\n# Adidas Leadership Comparison Analysis Report\n**Nike, Inc. Competitive Assessment | Q1 2025**\n\n---\n\n## Competitor Overview\n\nNike, Inc. emerges as a formidable global leadership benchmark in the sportswear industry, demonstrating superior performance across nearly all leadership dimensions during Q1 2025. As the world's largest athletic footwear and apparel company with $51.362 billion in annual revenue, Nike represents a **Tier 1 market leader** with exceptional capabilities in brand management, diversity commitment, and environmental stewardship[1][3]. \n\nNike's leadership strengths center on industry-leading brand recognition (99% awareness score), best-in-class diversity and inclusion initiatives (95% leadership commitment score), and robust environmental performance (92% score) that significantly outpaces most competitors including Adidas. The company's strategic transformation under CEO Elliott Hill, combined with systematic investment in digital capabilities and comprehensive sustainability targets, positions Nike as the primary competitive threat in premium sportswear leadership excellence.\n\n## Head-to-Head KPI Table\n\n| Leadership Driver | Adidas Germany | Nike, Inc. | Gap |\n|-------------------|----------------|------------|-----|\n| Strategic Vision | 92 (A-) | 92 (A-) | 0 |\n| Leadership Commitment | 93 (A) | 95 (A) | +2 |\n| Communication Skills | 91 (A-) | 92 (A-) | +1 |\n| Upskilling Programs | 90 (A-) | 90 (A-) | 0 |\n| Learning Culture | 91 (A-) | 91 (A-) | 0 |\n| Empathy & Support | 92 (A-) | 93 (A-) | +1 |\n| Environmental Performance | 75 (C) | 92 (A-) | +17 |\n| Brand Awareness | 92 (A-) | 99 (A+) | +7 |\n| **Overall Average** | **89.5 (B+)** | **94.3 (A-)** | **+4.8** |\n\n## Narrative Analysis\n\nNike demonstrates measurable leadership superiority over Adidas across six of eight leadership dimensions, with the most significant performance gaps in **Environmental Performance** (+17 points) and **Brand Awareness** (+7 points). These differentials represent substantial competitive advantages that translate into market positioning and stakeholder trust benefits.\n\n**Nike's Environmental Leadership Advantage:** Nike achieved a 73% reduction in Scope 1 and 2 emissions against 2015 baseline targets and reached 96% renewable energy adoption, dramatically outperforming Adidas's 75-score environmental performance[5]. While Adidas achieved a 20% overall greenhouse gas reduction, Nike's systematic approach to supply chain decarbonization and 100% waste diversion from landfill demonstrates more comprehensive environmental leadership. Nike's transparent sustainability reporting and science-based targets execution provides a clear competitive edge in ESG-conscious market segments.\n\n**Brand Awareness Dominance:** Nike's 99% brand recognition score versus Adidas's 92% reflects not just market penetration but depth of consumer engagement. In Germany specifically, Nike maintains 98% awareness among sportswear users with 87% loyalty among current users, significantly exceeding typical industry benchmarks[3]. This brand strength translates into pricing power and market share resilience during economic uncertainty.\n\n**Diversity and Inclusion Leadership:** Nike's 95-score leadership commitment reflects industry-leading practices including executive compensation tied to diversity targets (29% minority representation by 2025) and $140 million investment in racial equality initiatives. Nike's achievement of 49.5% women representation across global operations and systematic mentorship programs for over 2,000 employees demonstrates institutional commitment that exceeds Adidas's strong but less comprehensive diversity efforts.\n\n**Areas Where Adidas Remains Competitive:** Adidas achieves parity with Nike in Strategic Vision (92-92), Upskilling Programs (90-90), and Learning Culture (91-91), indicating that foundational leadership capabilities remain strong. Adidas's Q1 2025 currency-neutral revenue growth of 13% and brand-specific growth of 17% demonstrates that strategic execution capabilities translate into business performance despite leadership measurement gaps[1][3].\n\n## Key Best Practices of Nike, Inc.\n\n**Environmental Leadership Excellence**\n- Science-based emissions targets with 73% reduction in Scope 1&2 emissions exceeding original 65% targets\n- Systematic renewable energy adoption reaching 96% in 2023 from 48% in 2020\n- Comprehensive waste diversion achieving 100% landfill elimination with 80% recycling into new products\n- Transparent sustainability reporting acknowledging Scope 3 challenges while demonstrating concrete progress\n\n**Brand Management Sophistication**\n- Digital-first communication strategy generating 26% of total revenue through direct-to-consumer channels\n- Athlete partnership innovation through Think Tank collaborative development programs\n- Strategic portfolio focus on five core categories: running, basketball, football, training, and sportswear\n- Gender-focused product development addressing 40% female customer base with specialized innovation\n\n**Diversity and Inclusion Integration**\n- Executive compensation directly tied to measurable diversity outcomes including minority representation targets\n- Partnerships with Historically Black Colleges and Universities creating 300% increase in technical internships\n- Global UNITED networks serving 77,800 employees with structured allyship and community programs\n- Comprehensive supplier workforce engagement covering 700,000 workers across 17 countries\n\n**Digital Talent Development**\n- Structured learning programs spanning RunningSTART through XCELERATE high-potential development\n- Strategic technology investments including Celect acquisition for AI-driven customer behavior prediction\n- Metaverse engagement through Roblox partnerships and RTFKT digital acquisition generating 6.7 million visits\n- Comprehensive upskilling infrastructure supporting retail workforce digital commerce capabilities\n\n## SWOT-Style Summary\n\n| **Strengths (Nike vs Adidas)** | **Weaknesses (Nike vs Adidas)** |\n|--------------------------------|----------------------------------|\n| +17 point environmental performance advantage through systematic renewable energy adoption and waste elimination | 10% revenue decline in Q1 FY2025 versus Adidas's 13% growth indicates operational execution challenges |\n| +7 point brand awareness superiority with 99% recognition and 87% customer loyalty in Germany | Market share erosion to premium competitors like Lululemon in key segments |\n| Industry-leading diversity commitment with executive compensation alignment and $140M racial equity investment | Recent strategic leadership transitions may create execution uncertainty during transformation period |\n| Superior digital capabilities with 26% DTC revenue and comprehensive metaverse presence | Scope 3 supply chain emissions increasing 3% despite 30% reduction targets |\n\n| **Opportunities (for Adidas)** | **Threats (from Nike)** |\n|--------------------------------|--------------------------|\n| Adopt Nike's renewable energy acceleration and waste diversion methodologies to close 17-point environmental gap | Nike's brand loyalty strength (87%) could accelerate market share capture during economic uncertainty |\n| Implement executive compensation diversity alignment following Nike's measurable target model | Environmental leadership advantage may influence ESG-focused institutional investor preferences |\n| Leverage Adidas's 13% Q1 growth momentum to demonstrate superior operational execution during Nike's revenue decline period | Digital-first customer engagement generating 26% of Nike revenue threatens traditional retail channels |\n| Capitalize on Nike's strategic transition period to gain market share in premium activewear segments | Nike's systematic supplier engagement across 700,000 workers could set new industry ESG standards requiring matching investment |\n\nThe leadership comparison reveals Nike's significant competitive advantages in environmental stewardship and brand recognition, while highlighting opportunities for Adidas to leverage superior Q1 2025 growth performance and accelerate environmental initiatives to narrow critical leadership gaps.\n\n\n\n# Adidas Leadership Comparison Analysis Report: Adidas vs PUMA SE\n\nThis Leadership Comparison Analysis provides a comprehensive head-to-head evaluation of Adidas against PUMA SE across critical leadership effectiveness dimensions during Q1 2025. The analysis reveals PUMA SE's superior performance in most leadership categories, particularly environmental stewardship and diversity initiatives, while highlighting areas where Adidas maintains competitive positioning.\n\n## **Competitor Overview: PUMA SE**\n\nPUMA SE emerges as a formidable leadership competitor in the German sportswear market, demonstrating exceptional performance across nearly all leadership dimensions despite facing significant financial challenges. The company maintains its position as a **Tier 1 leadership performer** with particular strength in diversity and inclusion (94/100), environmental performance (95/100), and brand awareness (94/100)[1][2]. PUMA's leadership effectiveness is characterized by systematic program execution, quantifiable outcomes, and consistent external recognition, including five consecutive years as a Financial Times \"Leader in Diversity.\"\n\nHowever, PUMA SE's leadership capabilities are tested by substantial business headwinds, including a 63.7% decline in EBIT and implementation of a cost-reduction program targeting 500 global job cuts. Despite these challenges, the company demonstrates resilience through strong direct-to-consumer growth (12% increase) and exceptional brand campaign performance testing in the top 5% globally[1].\n\n## **Head-to-Head KPI Table**\n\n| Leadership Driver | Adidas Germany | PUMA SE | Gap |\n|-------------------|----------------|---------|-----|\n| Strategic Vision | 92 (A) | 91 (A) | -1 |\n| Leadership Commitment (D&I) | 93 (A) | 94 (A) | +1 |\n| Communication Skills | 91 (A) | 93 (A) | +2 |\n| Upskilling Programs | 90 (A-) | 90 (A-) | 0 |\n| Learning Culture | 91 (A) | 92 (A) | +1 |\n| Empathy & Support | 92 (A) | 92 (A) | 0 |\n| Environmental Performance | 75 (C) | 95 (A) | +20 |\n| Brand Awareness | 92 (A) | 94 (A) | +2 |\n| **Overall Leadership (avg)** | **89 (B+)** | **91 (A-)** | **+2** |\n\n## **Narrative Analysis**\n\nPUMA SE outperforms Adidas in six of eight leadership dimensions, with particularly significant advantages in environmental performance (+20 points) and notable strengths in communication skills, diversity commitment, and brand awareness. The most substantial performance gap exists in environmental leadership, where PUMA SE's CDP A-rating across climate change, water security, and forest management significantly exceeds Adidas' mixed environmental performance[2].\n\n**PUMA SE's Key Strengths vs Adidas:**\n\nPUMA SE demonstrates superior **environmental leadership** through quantifiable achievements including 100% renewable electricity use for PUMA entities and 26% renewable energy for Tier 1 suppliers, compared to Adidas' ongoing Scope 3 emissions challenges. PUMA's commitment to 90% absolute greenhouse gas emission reduction by 2030 from a 2017 baseline represents more aggressive targets than Adidas' current trajectory[2].\n\nIn **diversity and inclusion leadership**, PUMA SE's recognition as a Financial Times \"Leader in Diversity\" for five consecutive years, combined with measurable outcomes including 42% female global leadership and representation from 146 nationalities, slightly edges Adidas' strong but less recognized diversity initiatives[1][2].\n\n**Communication effectiveness** represents another PUMA SE advantage, with 91% employee engagement scores and implementation of advanced feedback systems including the Peakon Employee Voice platform, compared to Adidas' solid but less systematic communication infrastructure[2].\n\n**Areas Where Adidas Remains Competitive:**\n\nAdidas maintains slight advantages in **strategic vision clarity** (92 vs 91), particularly evident through consistent double-digit growth messaging and transparent guidance communication despite external uncertainties. Adidas' CEO communications during Q1 2025 demonstrated sophisticated strategic leadership by balancing optimism with prudent risk management[1].\n\nBoth companies achieve equivalent performance in **upskilling programs** (90 each) and **empathy & support** (92 each), indicating that these represent industry-leading practices where neither company demonstrates clear superiority[1][2].\n\n## **Key Best Practices of PUMA SE**\n\n**Environmental Leadership Excellence**\n- Achieved CDP A-rating across climate, water, and forest categories through systematic measurement and improvement programs\n- Implemented science-based targets with 90% absolute GHG reduction commitment by 2030\n- Established comprehensive supply chain environmental requirements including no coal-fired boilers for core factories\n\n**Advanced Communication Systems**\n- Deployed Peakon Employee Voice platform enabling real-time feedback collection requiring only 3-5 minutes per participant\n- Achieved 91% employee engagement scores through systematic listening strategies and response mechanisms\n- Implemented Workday system providing 24/7 access to personnel data and self-service capabilities\n\n**Diversity Leadership Infrastructure**\n- Established structured Employee Resource Groups including BBOLD and Moms Squad with executive sponsorship\n- Achieved measurable representation across 146 nationalities with systematic tracking and accountability\n- Multi-year sponsorship commitments for LGBTQ+ inclusion including Christopher Street Day partnerships\n\n**Learning Culture Integration**\n- Internal leadership role filling rate of 80% demonstrating successful talent development outcomes\n- International Leadership Programs (ILP and ILP²) with intensive 18-month development curricula\n- Partnership with external platforms achieving 92% participant effectiveness ratings\n\n## **SWOT-Style Summary**\n\n| Strengths (PUMA SE vs Adidas) | Weaknesses (PUMA SE vs Adidas) |\n|-------------------------------|--------------------------------|\n| Superior environmental performance and CDP A-ratings | Currently experiencing significant profitability decline (-63.7% EBIT) |\n| Higher employee engagement scores (91% vs Adidas benchmarks) | Implementing substantial workforce reductions (500 positions globally) |\n| Five consecutive years Financial Times Diversity Leader recognition | North American market underperformance (-11% decline) |\n| Advanced digital communication platforms and feedback systems | Leadership transition uncertainty with new CEO appointment |\n\n| **Opportunities (for Adidas)** | **Threats (from PUMA SE)** |\n|--------------------------------|---------------------------|\n| Adopt PUMA SE's systematic environmental measurement and CDP methodologies | PUMA SE's environmental leadership may attract sustainability-focused talent and partnerships |\n| Implement similar real-time employee feedback systems and engagement platforms | Superior diversity recognition may enhance PUMA SE's employer brand and recruitment capability |\n| Leverage Adidas' stronger financial position to accelerate sustainability investments | Advanced communication infrastructure may improve PUMA SE's change management during restructuring |\n| Apply global scale advantages to exceed PUMA SE's renewable energy adoption rates | Systematic learning culture may enable faster organizational transformation and recovery |\n\nThe Leadership Comparison Analysis reveals PUMA SE as a formidable competitor across most leadership dimensions, with particular strengths in environmental stewardship, diversity advancement, and employee engagement systems. While Adidas maintains competitive positioning in strategic vision and equivalent performance in several categories, PUMA SE's systematic approach to leadership measurement and external validation represents a comprehensive leadership model that Adidas could leverage for improvement opportunities, particularly in environmental performance and diversity recognition systems.\n\n\n\n# Adidas Leadership Comparison Analysis Report: Under Armour, Inc.\n\nAdidas demonstrated superior leadership performance versus Under Armour, Inc. across most critical dimensions during Q1 2025, achieving particularly strong advantages in communication skills, upskilling programs, and brand awareness. While Under Armour matched Adidas in diversity commitment and empathetic support, the German sportswear leader maintained a decisive edge in operational excellence and market execution[1][2][3].\n\n## Competitor Overview\n\n**Under Armour, Inc.** positioned itself as a performance-focused athletic brand undergoing strategic transformation during Q1 2025, with mixed leadership performance results. The company demonstrated exceptional strength in diversity and inclusion leadership, achieving 93% scores that matched Adidas, while maintaining strong empathetic support practices that yielded 82% employee engagement rates. Under Armour's strategic vision remained clear with its four-pillar approach (Product, Story, Service, Team), though execution faced headwinds from financial pressures including a 10% revenue decline and $300 million operating loss.\n\nThe American athletic apparel company excelled in creating inclusive workplace culture through nine Teammate Resource Groups spanning over 2,000 members globally, while implementing comprehensive leadership development programs. However, Under Armour struggled with external communication effectiveness and market penetration, particularly evident in the German market where only 7% of sportswear users reported recent brand awareness despite 61% overall brand recognition.\n\n## Head-to-Head KPI Table\n\n| Leadership Driver         | Adidas Germany | Under Armour, Inc. | Gap |\n|--------------------------|----------------|-------------------|-----|\n| Strategic Vision         | 92 (A)         | 91 (A)           | -1  |\n| Leadership Commitment    | 93 (A)         | 93 (A)           | 0   |\n| Communication Skills     | 91 (A)         | 74 (C)           | -17 |\n| Upskilling Programs      | 90 (A-)        | 73 (C)           | -17 |\n| Learning Culture         | 91 (A)         | 90 (A-)          | -1  |\n| Empathy & Support        | 92 (A)         | 92 (A)           | 0   |\n| Environmental Performance| 75 (C)         | 75 (C)           | 0   |\n| Brand Awareness          | 92 (A)         | 76 (C+)          | -16 |\n| **Overall Leadership (avg)** | **89 (B+)**    | **82 (B)**       | **-7** |\n\n## Narrative Analysis\n\nUnder Armour demonstrated competitive leadership capabilities in several key areas while facing significant performance gaps in market-facing dimensions. The company's **diversity and inclusion leadership** matched Adidas at the highest performance tier, with comprehensive structural programs including mandatory inclusion training for all global teammates and specialized cultural competency development for director-level positions. Under Armour's DEI initiatives showed measurable impact through partnerships with Historically Black Colleges and Universities and UN Women's Empowerment Principles, creating authentic community engagement beyond internal organizational boundaries.\n\n**Strategic vision clarity** remained strong at 91 points, just one point behind Adidas, with Under Armour's four-pillar transformation framework providing clear direction despite financial headwinds. CEO Kevin Plank's messaging during Q1 2025 effectively balanced transparency about current challenges with confidence in long-term positioning, stating \"we are not yet where we want to be – but we are no longer where we were.\" This strategic communication helped maintain high employee engagement at 82% despite operational restructuring and significant financial losses.\n\nHowever, Under Armour faced **substantial communication challenges** with a 17-point gap behind Adidas (74 vs 91), particularly in external market communication. The German market exemplified this weakness, where only 7% of sportswear users reported recent Under Armour brand awareness despite 61% overall brand recognition. This low \"buzz\" score of 11% among those familiar with the brand indicated ineffective marketing investment and message delivery compared to Adidas's record-high brand health scores.\n\n**Upskilling and digital talent development** represented another significant gap, with Under Armour scoring 17 points below Adidas (73 vs 90). While Under Armour maintained comprehensive learning infrastructure through Armour U platform and structured leadership programs, effectiveness measurement remained limited during restructuring periods. The company's Fiscal 2025 Restructuring Plan costs between $140-160 million created resource constraints that potentially impacted training investments, contrasting with Adidas's sustained 14% increase in marketing and development spending.\n\n**Brand awareness performance** showed the largest competitive gap at 16 points (76 vs 92), with Under Armour achieving only 14% usage share among German sportswear consumers compared to Adidas's dominant market position. However, Under Armour demonstrated exceptional customer loyalty at 79% among existing users, suggesting strong product satisfaction once consumers trial the brand.\n\n## Key Best Practices of Under Armour, Inc.\n\n**Diversity and Inclusion Excellence**\n- Implemented nine global Teammate Resource Groups spanning over 2,000 members with dedicated DEI leadership structure\n- Achieved measurable BIPOC representation improvements through mandatory inclusion training and cultural competency development\n- Established comprehensive HBCU partnership template with Morgan State University creating talent pipeline development\n\n**Employee Empathy and Support Systems**\n- Maintained 82% employee engagement during financial restructuring through comprehensive wellbeing initiatives\n- Implemented corporate policy prohibiting Friday afternoon meetings after 2pm to protect learning and development time\n- Created \"PreSeason Training\" 90-day onboarding process with systematic support and cultural integration\n\n**Learning Culture Infrastructure**\n- Developed Armour U global learning platform providing worldwide access to product, leadership, and strategy training\n- Established three-tier leadership development pathway from UA Leadership Academy through Leading at UA programs\n- Integrated experiential learning through innovation labs and hackathon initiatives\n\n**Strategic Transformation Management**\n- Articulated clear four-pillar strategic framework (Product, Story, Service, Team) enabling focused execution during challenges\n- Maintained long-term sustainability commitments including 100% renewable energy by 2030 and net-zero emissions by 2050\n- Demonstrated crisis leadership through transparent communication balancing honesty about difficulties with strategic confidence\n\n## SWOT-Style Summary\n\n| **Strengths (Under Armour vs Adidas)**        | **Weaknesses (Under Armour vs Adidas)**       |\n|-----------------------------------------------|-----------------------------------------------|\n| Matched diversity leadership excellence with comprehensive structural programs | Significant communication gaps, especially external market messaging (-17 points) |\n| Exceptional customer loyalty (79%) once brand trial occurs | Limited upskilling effectiveness measurement during restructuring (-17 points) |\n| Strong empathetic leadership maintaining engagement during financial pressure | Substantial brand awareness deficit in key markets (-16 points) |\n| Clear strategic transformation framework with measurable sustainability targets | Financial headwinds creating resource constraints for development investments |\n\n| **Opportunities (for Adidas)**                | **Threats (from Under Armour)**              |\n|-----------------------------------------------|-----------------------------------------------|\n| Leverage superior communication capabilities to further distance brand positioning | Under Armour's sustainability commitments could differentiate if executed effectively |\n| Capitalize on Under Armour's limited German market penetration through increased investment | Strong employee loyalty and engagement could enable rapid capability building |\n| Enhance sustainability leadership while Under Armour focuses on financial recovery | DEI leadership excellence may attract talent and consumer segments valuing inclusion |\n| Strengthen digital upskilling programs where Under Armour shows resource constraints | Authentic strategic transformation narrative could resonate during market uncertainty |\n\nThis analysis reveals that while Under Armour maintains competitive leadership capabilities in specific areas, particularly diversity and empathy, Adidas holds decisive advantages in market-facing capabilities and operational execution that translate directly into business performance and stakeholder engagement.\n\n\n\nASICS Corporation emerges as a formidable competitor to Adidas in the leadership domain, demonstrating superior or comparable performance across nearly all strategic dimensions during Q1 2025. While both companies operate in the high-performance tier across most leadership categories, ASICS Corporation distinguishes itself through exceptional diversity and inclusion commitment (95 vs 93), superior environmental performance (91 vs 75), and marginally stronger empathy and support capabilities (93 vs 92). The Japanese sportswear giant's balanced excellence across all eight leadership drivers positions it as a consistent market leader, contrasting with Adidas's more uneven performance profile that includes a significant weakness in environmental stewardship.\n\n## Competitor Overview\n\nASICS Corporation stands as a **Tier 1 leadership performer** in the global sportswear market, achieving high-performance ratings across all measured leadership dimensions during Q1 2025[1][3]. The company demonstrated exceptional strategic execution with 18.7% revenue growth in EMEA markets while maintaining 72% brand awareness in the German market, indicating successful alignment between leadership capabilities and business outcomes. ASICS Corporation's leadership strengths center on **diversity and inclusion excellence**, achieving best-in-class performance with a score of 95, and **environmental leadership** with a score of 91 compared to Adidas's concerning 75. The company's consistent high performance across empathy and support (93), learning culture (92), and strategic vision (92) reflects systematic leadership development and organizational coherence that translates into sustainable competitive advantages.\n\n## Head-to-Head KPI Table\n\n| Leadership Driver | Adidas Germany | ASICS Corporation | Gap |\n|-------------------|----------------|-------------------|-----|\n| Strategic Vision | 92 (A) | 92 (A) | 0 |\n| Leadership Commitment (D&I) | 93 (A) | 95 (A) | +2 |\n| Communication Skills | 91 (A) | 91 (A) | 0 |\n| Upskilling Programs | 90 (A-) | 90 (A-) | 0 |\n| Learning Culture | 91 (A) | 92 (A) | +1 |\n| Empathy & Support | 92 (A) | 93 (A) | +1 |\n| Environmental Performance | 75 (C) | 91 (A-) | +16 |\n| Brand Awareness | 92 (A) | 90 (A-) | -2 |\n| **Overall Average** | **89 (B+)** | **92 (A-)** | **+3** |\n\n## Narrative Analysis\n\nASICS Corporation demonstrates **superior leadership consistency** compared to Adidas, maintaining high-performance scores across all eight leadership dimensions while Adidas shows significant vulnerability in environmental performance. The most striking competitive advantage lies in environmental stewardship, where ASICS Corporation's 91 score reflects genuine sustainability leadership through 43.1% CO2 emissions reduction and 36.8% renewable energy adoption, contrasting sharply with Adidas's concerning 75 score despite some material innovation success[3][5].\n\n**ASICS Corporation's diversity and inclusion leadership** represents another competitive strength, achieving a 95 score through measurable commitments including 40% female management representation globally and six consecutive years of Gold ranking in the PRIDE Index[3]. This exceeds Adidas's already strong 93 performance, indicating that ASICS Corporation has established more comprehensive and effective diversity frameworks. The company's regional differentiation approach, achieving 49.3% female management in North America while working toward 25% at headquarters by 2026, demonstrates sophisticated understanding of cultural adaptation in global diversity initiatives.\n\nThe **empathy and support dimension** shows ASICS Corporation's marginal advantage (93 vs 92), evidenced through record-high employee engagement scores of 73% and systematic attention to employee wellbeing programs like the 'Move Her Mind Hub' platform[3]. While both companies perform strongly in this area, ASICS Corporation's consistent focus on employee experience across all regions suggests more systematic implementation of supportive leadership practices.\n\nASICS Corporation matches or slightly exceeds Adidas in learning culture (92 vs 91) and maintains parity in strategic vision, communication skills, and upskilling programs. The company's learning framework based on founder Kihachiro Onitsuka's philosophy that \"A company is its people\" creates cultural coherence that supports sustained performance across leadership dimensions[3].\n\n**Adidas maintains a slight edge** in brand awareness (92 vs 90), leveraging its global marketing investment of €746 million in Q1 2025 and achieving record brand health scores[1][2]. However, this advantage appears insufficient to offset ASICS Corporation's systematic leadership superiority across operational dimensions.\n\n## Key Best Practices of ASICS Corporation\n\n**Environmental Leadership Integration**\n- Achieved 43.1% reduction in direct operational CO2 emissions compared to 2015 baseline through systematic decarbonization initiatives\n- Implemented 36.8% renewable electricity adoption across business facilities with clear progress toward clean energy transition\n- Established recycled polyester comprising over 50% of product materials, demonstrating circular economy commitment beyond traditional sustainability approaches\n\n**Diversity and Inclusion Excellence**\n- Maintained six consecutive years of Gold ranking in PRIDE Index through comprehensive LGBTQ+ support including regulatory revisions, training programs, and dedicated help desk systems\n- Implemented differentiated regional diversity targets recognizing cultural contexts while maintaining global consistency (49.3% female management in North America, 39.3% in Europe, 26.3% in Japan)\n- Integrated D&I as one of nine material topics in sustainability framework, ensuring executive accountability and resource allocation\n\n**Employee Engagement and Empathy**\n- Achieved record-high employee engagement score of 73% through systematic attention to workplace experience and action planning across all regions\n- Established comprehensive career development frameworks including mentor programs for new employees and structured career design opportunities at career turning points\n- Created 'Move Her Mind Hub' platform specifically encouraging female employee wellbeing, demonstrating targeted support for diverse employee needs\n\n**Strategic Communication Transparency**\n- Provided comprehensive performance disclosure by channel, region, and product category enabling stakeholder assessment across all business segments\n- Demonstrated clear internal communication through detailed role definitions and strategic rationale in leadership appointments like Andreas Moll as VP of Category\n- CEO communication consistently emphasizes measurable outcomes and forward-looking insights while acknowledging market conditions\n\n## SWOT-Style Summary\n\n| **Strengths (ASICS Corporation vs Adidas)** | **Weaknesses (ASICS Corporation vs Adidas)** |\n|---------------------------------------------|------------------------------------------------|\n| Environmental performance leadership (+16 point advantage) | Slightly lower brand awareness (-2 points) |\n| Best-in-class diversity commitment (95 vs 93) | Regional variance in diversity progress |\n| Superior employee engagement (73% record high) | Smaller global marketing investment scale |\n| Consistent high performance across all drivers | Limited global brand recognition compared to Adidas |\n| Systematic sustainability integration | Less diversified geographic revenue base |\n\n| **Opportunities (for Adidas)** | **Threats (from ASICS Corporation)** |\n|---------------------------------|---------------------------------------|\n| Leverage higher brand awareness for market expansion | ASICS Corporation's environmental leadership attracts sustainability-conscious consumers |\n| Apply global marketing scale to match ASICS engagement | Superior employee engagement creates retention advantages |\n| Address environmental performance gap through increased investment | Diversity excellence positions ASICS for talent acquisition advantages |\n| Utilize financial resources for rapid sustainability improvements | Consistent leadership performance builds long-term competitive moats |\n| Capitalize on broader product portfolio and geographic reach | ASICS Corporation's learning culture supports continuous improvement and adaptation |\n\nASICS Corporation's leadership advantage stems from **systematic excellence and consistent execution** across operational dimensions, while Adidas relies more heavily on brand strength and marketing scale. The environmental performance gap represents Adidas's most significant competitive vulnerability, requiring immediate strategic attention to prevent further market share erosion to sustainability-focused competitors like ASICS Corporation.\n\n\n\nBased on the provided search results and data, I cannot produce a comprehensive Leadership Comparison Analysis Report between Adidas and Decathlon S.A. as requested. The search results contain extensive information about Adidas' Q1 2025 performance, including financial metrics, brand momentum, and strategic initiatives, but do not include any comparable leadership performance data, KPI scores, or strategic information for Decathlon S.A.\n\n## Available Adidas Leadership Data\n\nThe evidence provided shows Adidas achieved strong leadership performance across multiple dimensions in Q1 2025:\n\n**Leadership Effectiveness**: Score of 92 (Grade A) with exceptional performance in Strategic Vision (92), Communication Skills (91), and Empathy & Support (92).\n\n**Diversity & Inclusion**: Score of 93 (Grade A) demonstrating best-in-class leadership commitment with women representing 40.7% of leadership positions.\n\n**Digital Talent Availability**: Score of 90 (Grade A-) reflecting advanced upskilling infrastructure and strong employee engagement.\n\n**Brand Equity**: Score of 92 (Grade A) with the company achieving its highest brand health scores in over a decade at 37.1 in 2024[1][2].\n\n## Missing Competitor Information\n\nTo complete the required Leadership Comparison Analysis Report format, the following Decathlon S.A. information would be needed but is not available in the search results:\n\n- Decathlon S.A. leadership KPI scores across the same eight drivers\n- Strategic vision and direction evidence for Decathlon S.A.\n- Diversity and inclusion metrics and commitments\n- Communication effectiveness examples\n- Learning culture and upskilling program details\n- Environmental performance data\n- Brand awareness and equity metrics\n\n## Adidas Performance Context\n\nThe available data shows Adidas delivered strong Q1 2025 results with currency-neutral revenue growth of 13% reaching €6.15 billion, with the Adidas brand specifically growing 17%[2]. The company achieved double-digit growth across all major markets: Latin America (26%), Emerging Markets (23%), Europe (14%), Greater China (13%), and Japan/South Korea (13%)[2].\n\nWithout comparable Decathlon S.A. performance data and leadership metrics, I cannot provide the head-to-head KPI comparison table, narrative analysis of competitive strengths and weaknesses, best practices identification, or SWOT-style summary that the consulting report format requires.\n\n"
  `
console.log('preparedAnswer', preparedAnswer)
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat - either load existing or prepare for new
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoadingChat(true);
        const chatId = searchParams.get('chatId');

        if (chatId) {
          // Load existing chat
          const chatData = await chatService.getChat(chatId, email);
          setCurrentChatId(chatId);
          
          // Convert database messages to local format
          const localMessages: Message[] = chatData.messages.map(msg => ({
            id: msg._id,
            content: msg.content,
            role: msg.role,
            timestamp: new Date(msg.timestamp),
          }));
          
                      setMessages(localMessages);
            
            // Determine current question based on message count
            const questionCount = localMessages.filter(msg => msg.role === 'user').length;
            setCurrentQuestion(questionCount);
          } else {
            // Prepare for new chat - don't create in DB yet
            setCurrentChatId(null);
            // Show welcome message from assistant (not saved to DB yet)
            setMessages([
              {
                id: 'welcome',
                content: `Welcome! I'll help you analyze a company. Let me gather some information first.

**Question 1 of 5:** What is the name of the company you want to analyze?`,
                role: 'assistant',
                timestamp: new Date(),
              }
            ]);
            setCurrentQuestion(0); // Reset question counter for new chat
          }
      } catch (error) {
        console.error('Error initializing chat:', error);
        antMessage.error('Failed to initialize chat');
      } finally {
        setIsLoadingChat(false);
      }
    };

    if (email) {
      initializeChat();
    }
  }, [email, searchParams]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setInputValue('');
    setIsLoading(true);

    try {
      let chatId = currentChatId;

      // Create new chat if this is the first message
      if (!chatId) {
        const chat = await chatService.createChat(
          email,
          'New Analysis Session',
          inputValue.substring(0, 50) + (inputValue.length > 50 ? '...' : ''),
          inputValue
        );
        chatId = chat._id;
        setCurrentChatId(chatId);
        router.replace(`/analyze?chatId=${chatId}`);
        
        // Save the welcome message to database first (earlier timestamp)
        const welcomeTimestamp = new Date(Date.now() - 1000); // 1 second earlier
        await chatService.addMessage(chatId, `Welcome! I'll help you analyze a company. Let me gather some information first.

**Question 1 of 5:** What is the name of the company you want to analyze?`, 'assistant', email, welcomeTimestamp);
        
        // Note: User message is already saved by createChat, so we don't need to save it again
        
        // Update local messages to include the welcome message from database and user message
        setMessages([
          {
            id: 'welcome-db',
            content: `Welcome! I'll help you analyze a company. Let me gather some information first.

**Question 1 of 5:** What is the name of the company you want to analyze?`,
            role: 'assistant',
            timestamp: welcomeTimestamp,
          },
          userMessage
        ]);
      } else {
        // Save user message to existing chat
        await chatService.addMessage(chatId, inputValue, 'user', email);
        // Add user message to local state for existing chats
        setMessages(prev => [...prev, userMessage]);
      }

      // Handle structured data collection
      const userInput = userMessage.content;
      let isComplete = false;

      // Update analysis data based on current question
      switch (currentQuestion) {
        case 0:
          setAnalysisData(prev => ({ ...prev, companyName: userInput }));
          break;
        case 1:
          setAnalysisData(prev => ({ ...prev, businessLine: userInput }));
          break;
        case 2:
          setAnalysisData(prev => ({ ...prev, country: userInput }));
          break;
        case 3:
          setAnalysisData(prev => ({ ...prev, useCase: userInput }));
          break;
        case 4:
          setAnalysisData(prev => ({ ...prev, timeline: userInput }));
          isComplete = true;
          break;
      }

      // Simulate AI response
      setTimeout(async () => {
        let aiResponse = '';
        
        if (isComplete) {
          // Show the collected data and provide analysis
          const collectedData = { ...analysisData, [currentQuestion === 0 ? 'companyName' : 
            currentQuestion === 1 ? 'businessLine' : 
            currentQuestion === 2 ? 'country' : 
            currentQuestion === 3 ? 'useCase' : 'timeline']: userInput };
          
          aiResponse = `Perfect! I've collected all the information. Here's what I have:

**Company Analysis Data:**
\`\`\`json
${JSON.stringify(collectedData, null, 2)}
\`\`\`

Now I'll analyze ${collectedData.companyName} (${collectedData.businessLine}) based on your ${collectedData.useCase} requirements for the ${collectedData.timeline} timeline.

${preparedAnswer}`;
        } else {
          // Ask next question
          const nextQuestionIndex = currentQuestion + 1;
          aiResponse = `**Question ${nextQuestionIndex + 1} of 5:** ${questions[nextQuestionIndex]}`;
          setCurrentQuestion(nextQuestionIndex);
        }
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          role: 'assistant',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);

        // Save AI response to database
        try {
          await chatService.addMessage(chatId!, aiResponse, 'assistant', email);
        } catch (error) {
          console.error('Error saving AI message:', error);
        }
      }, 1500);
    } catch (error) {
      console.error('Error sending message:', error);
      antMessage.error('Failed to send message');
      setIsLoading(false);
    }
  };

  const generateAIResponse = (userInput: string): string => {
    const responses = [
      "I've analyzed your request and here are my findings...",
      "Based on the data you've provided, I can see several interesting patterns...",
      "Let me break down this analysis for you...",
      "From my perspective, this suggests that...",
      "I've processed your input and here's what I found...",
      "This is an interesting case. Let me analyze it further...",
      "Based on my analysis, I recommend considering...",
      "I've identified several key points in your request...",
    ];
    
    return responses[Math.floor(Math.random() * responses.length)] + 
           " This is a simulated response. In a real application, this would be connected to an AI service like OpenAI's GPT or similar.";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoadingChat) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#141414' }}>
        <Sidebar />
        <Layout style={{ marginLeft: 280, background: '#141414' }}>
          <Content style={{ 
            padding: '0',
            background: '#141414',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Space direction="vertical" size="large" align="center">
              <Spin size="large" />
              <Text style={{ color: '#8c8c8c' }}>Loading chat...</Text>
            </Space>
          </Content>
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout style={{ height: '100vh', background: '#141414', overflow: 'hidden' }}>
      <Sidebar />
      <Layout style={{ marginLeft: 280, background: '#141414', height: '100vh', overflow: 'hidden' }}>
        <Content style={{ 
          padding: '0',
          background: '#141414',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '20px 24px',
            borderBottom: '1px solid #303030',
            background: '#1f1f1f',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
            minHeight: '80px'
          }}>
            <div>
              <Title level={3} style={{ margin: 0, color: '#58bfce' }}>
                AI Analysis Assistant
              </Title>
              <Text style={{ color: '#8c8c8c' }}>
                Ask me anything and I'll help you analyze it
                {currentChatId && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                    (Chat ID: {currentChatId})
                  </span>
                )}
              </Text>
            </div>
            <Button
              type="primary"
              onClick={async () => {
                try {
                  setIsLoadingChat(true);
                  setCurrentChatId(null);
                  setCurrentQuestion(0);
                  setAnalysisData({
                    companyName: '',
                    businessLine: '',
                    country: '',
                    useCase: '',
                    timeline: ''
                  });
                  setMessages([
                    {
                      id: 'welcome',
                      content: `Welcome! I'll help you analyze a company. Let me gather some information first.

**Question 1 of 5:** What is the name of the company you want to analyze?`,
                      role: 'assistant',
                      timestamp: new Date(),
                    }
                  ]);
                  router.replace('/analyze');
                } catch (error) {
                  console.error('Error creating new chat:', error);
                  antMessage.error('Failed to create new chat');
                } finally {
                  setIsLoadingChat(false);
                }
              }}
              style={{
                background: '#58bfce',
                border: 'none',
                borderRadius: '8px',
                height: '40px',
                padding: '0 20px'
              }}
            >
              New Chat
            </Button>
          </div>

          {/* Chat Messages */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            minHeight: 0,
            scrollbarWidth: 'thin',
            scrollbarColor: '#303030 #1f1f1f'
          }}
          className="chat-messages-container"
          >
            <style jsx>{`
              .chat-messages-container::-webkit-scrollbar {
                width: 8px;
              }
              .chat-messages-container::-webkit-scrollbar-track {
                background: #1f1f1f;
                border-radius: 4px;
              }
              .chat-messages-container::-webkit-scrollbar-thumb {
                background: #303030;
                border-radius: 4px;
              }
              .chat-messages-container::-webkit-scrollbar-thumb:hover {
                background: #434343;
              }
            `}</style>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  maxWidth: '800px',
                  margin: '0 auto',
                  width: '100%'
                }}
              >
                <Avatar
                  size={32}
                  icon={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  style={{ 
                    backgroundColor: message.role === 'user' ? '#58bfce' : '#52c41a',
                    flexShrink: 0
                  }}
                />
                <Card
                  style={{
                    background: message.role === 'user' ? '#58bfce' : '#1f1f1f',
                    border: `1px solid ${message.role === 'user' ? '#4ac8d7' : '#303030'}`,
                    borderRadius: '12px',
                    flex: 1
                  }}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <Text style={{ 
                    color: message.role === 'user' ? '#fff' : '#d9d9d9',
                    fontSize: '14px',
                    lineHeight: '1.5'
                  }}>
                    {message.content}
                  </Text>
                  <div style={{ 
                    marginTop: '8px',
                    fontSize: '12px',
                    color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : '#8c8c8c'
                  }}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </Card>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                maxWidth: '800px',
                margin: '0 auto',
                width: '100%'
              }}>
                <Avatar
                  size={32}
                  icon={<RobotOutlined />}
                  style={{ backgroundColor: '#52c41a', flexShrink: 0 }}
                />
                <Card
                  style={{
                    background: '#1f1f1f',
                    border: '1px solid #303030',
                    borderRadius: '12px',
                    flex: 1
                  }}
                  bodyStyle={{ padding: '12px 16px' }}
                >
                  <Space>
                    <Spin indicator={<LoadingOutlined style={{ color: '#58bfce' }} />} />
                    <Text style={{ color: '#8c8c8c' }}>Analyzing...</Text>
                  </Space>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ 
            padding: '20px 24px',
            borderTop: '1px solid #303030',
            background: '#1f1f1f',
            flexShrink: 0
          }}>
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-end'
            }}>
              <TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{
                  background: '#262626',
                  border: '1px solid #434343',
                  borderRadius: '8px',
                  color: '#d9d9d9',
                  resize: 'none'
                }}
                disabled={isLoading}
              />
              <Button
                type="primary"
                icon={<SendOutlined style={{ fontSize: '25px' }} />}
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                style={{
                  background: '#58bfce',
                  border: 'none',
                  borderRadius: '8px',
                  height: '54px',
                  width: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              />
            </div>
            <div style={{ 
              textAlign: 'center', 
              marginTop: '12px',
              fontSize: '12px',
              color: '#8c8c8c'
            }}>
              Press Enter to send • Shift+Enter for new line
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
