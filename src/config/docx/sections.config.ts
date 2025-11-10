/**
 * DOCX Sections Configuration
 * Content sections order and disclaimer text
 */

export const sectionsConfig = {
  order: [
    "Executive Summary",
    "Head to Head Analysis",
    "Top 20 Improvement Levers",
    "List of Sources",
    "Disclaimer",
  ],
  disclaimer: {
    heading: "Disclaimer",
    headingStyle: "Heading1",
    fontFamily: "Aptos",
    fontSize: 9, // DISCLAIMER_FONT_SIZE
    introParagraphs: [
      `Vitelis analyses, including blind spot assessments, efficiency scores, efficiency mining, efficiency reports, know your company, and statements in the content of this document (the "Content"), are opinions regarding the relative performance, potential risks, or efficiency of various entities as of the date such opinions are expressed. They are not statements of current or historical fact regarding the financial solidity, operational reliability, compliance posture, or definitive safety of transacting with any entity.`,
      `The Content is created, in part, by AI-based or algorithmic methods (the "AI Content"), using publicly available information, proprietary frameworks, and other data sources (the "Input Data") deemed reliable. Vitelis does not guarantee the authenticity, completeness, or accuracy of any Input Data. References, risk assessments, "Top Blind Spots," efficiency scores, or other summaries in the Content do not endorse, recommend, or solicit business with any entity, nor do they replace professional due diligence or independent financial, operational, or compliance audits.`,
    ],
    sections: [
      {
        title:
          "Vitelis disclaims any and all express or implied warranties, including but not limited to:",
        bullets: [
          "Merchantability or Fitness for a particular purpose or use.",
          "Accuracy, Completeness, or Timeliness of the Content, or results derived from it.",
          "Freedom from Errors in the AI Content, Input Data, or the software tools used to generate the analyses.",
          "Uninterrupted Functioning or compatibility of the Content with any external systems or software.",
          "Guarantee of future financial, operational, or compliance outcomes for any entity.",
        ],
      },
      {
        title: "Data Privacy:",
        bullets: [
          `Vitelis may process publicly available or user-provided information to generate AI-based insights. No personal data is intentionally collected or used, except if explicitly provided by the user for analysis, and in such cases, the user represents they have appropriate rights or consents to share it.`,
          `Vitelis does not store or process sensitive personal data beyond what is necessary to perform the requested analyses. De-identified or aggregated data may be used to improve Vitelis's AI models or frameworks.`,
          `Users should ensure no confidential data is provided to Vitelis without proper consent or anonymization. Vitelis is not responsible for unauthorized data disclosures if the user provides such data contrary to established guidelines.`,
        ],
      },
      {
        title: "AI-Generated Content:",
        bullets: [
          "Part of the Content may be automatically generated or assisted by AI. Such AI output can include predictive statements, risk estimations, or efficiency approximations based on patterns in the Input Data.",
          "While Vitelis strives to validate AI outputs for reasonableness, AI-generated Content may contain inaccuracies, omissions, or speculative elements. Users are encouraged to independently verify critical insights.",
        ],
      },
      {
        title: "Limitation of Liability:",
        bullets: [
          `Under no circumstances shall Vitelis or its representatives be liable for any direct, indirect, special, incidental, or consequential damages (including, but not limited to, financial losses, business interruptions, reputational harm) arising from any party's use of or reliance on the Content.`,
          `The user agrees that any decisions (e.g., financial, operational, compliance) made based on the Content are done at their own discretion and risk. Entities must corroborate these findings with internal governance, official audits, expert counsel, and relevant regulatory reviews.`,
        ],
      },
      {
        title: "No Guarantee or Endorsement:",
        bullets: [
          `The Content is not a guarantee of an entity's future performance, stability, or compliance posture, nor is it an endorsement of any entity's services or products.`,
          `Mention of third-party data sources, software, or entities does not imply a partnership, endorsement, or affiliation with those parties unless explicitly stated.`,
        ],
      },
      {
        title: "AI & Model Transparency:",
        bullets: [
          `Vitelis uses proprietary methods and AI models to generate the Content. The internal workings of these models may not be fully disclosed, and certain assumptions or heuristics may exist. No representation is made that AI results will mirror any official audit or regulatory findings.`,
          `Vitelis reserves the right to revise or update its AI or frameworks without notice, which may lead to changed or revised Content outputs over time.`,
        ],
      },
      {
        title: "Future Changes & Timeliness:",
        bullets: [
          `The Content reflects Vitelis's opinion at a particular point in time and does not account for undisclosed or future changes in an entity's performance, strategy, or risk environment.`,
          `Vitelis assumes no duty to update the Content if new data emerges or if the entity's circumstances shift.`,
        ],
      },
      {
        title: "Governing Law:",
        bullets: [
          `The disclaimers, liability limitations, and warranties stated herein shall be governed by the laws of the jurisdiction in which Vitelis primarily operates or as stated in any service agreement with the user.`,
          `Any legal disputes arising from or relating to the Content shall be handled in accordance with the applicable governing law and dispute resolution methods set forth in Vitelis's service agreements.`,
        ],
      },
      {
        title: "Consent to Terms:",
        bullets: [
          "By accessing or using the Content, the user acknowledges they have read this Disclaimer thoroughly, agree to its terms, and accept that it forms part of any agreement or arrangement with Vitelis for receiving analyses or AI-based content.",
        ],
      },
    ],
    footerLines: [
      "Contact us: info@vitelis.com | www.vitelis.com",
      "Please carefully read the disclaimer at the end of the document.",
      "© 2025 Vitelis Inc., all rights reserved.",
    ],
  },
};
