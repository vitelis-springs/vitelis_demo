import type { AnalysisData } from "../../lib/docx";

type SupportedDocxLocale = "en" | "de";

interface DisclaimerSectionConfig {
  title: string;
  bullets: string[];
}

export interface DisclaimerConfig {
  heading: string;
  headingStyle: string;
  fontFamily: string;
  fontSize: number;
  introParagraphs: string[];
  sections: DisclaimerSectionConfig[];
  footerLines: string[];
}

export interface DocxLocaleStrings {
  locale: SupportedDocxLocale;
  creator: string;
  analysisParametersHeading: string;
  coverTitle: (data: AnalysisData) => string;
  disclaimer: DisclaimerConfig;
}

const formatReportTitle = (data: AnalysisData, reportWord: string) => {
  const parts = [data.companyName, data.country, data.useCase, reportWord].filter(
    (value) => value.trim().length > 0
  );

  const base = parts.join(" ").replace(/\s+/g, " ").trim();
  const timelineSuffix =
    data.timeline && data.timeline.trim().length > 0
      ? ` (${data.timeline.trim()})`
      : "";

  return `${base}${timelineSuffix}`.trim();
};

const englishDisclaimer: DisclaimerConfig = {
  heading: "Disclaimer",
  headingStyle: "Heading1",
  fontFamily: "Aptos",
  fontSize: 9,
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
};

const germanDisclaimer: DisclaimerConfig = {
  heading: "Hinweis",
  headingStyle: englishDisclaimer.headingStyle,
  fontFamily: englishDisclaimer.fontFamily,
  fontSize: englishDisclaimer.fontSize,
  introParagraphs: [
    "Vitelis-Analysen, einschließlich Blind-Spot-Bewertungen, Effizienz-Scores, Efficiency Mining, Effizienzberichte, Know Your Company sowie Aussagen in diesem Dokument („Inhalt“), sind Einschätzungen zur relativen Performance, zu potenziellen Risiken oder zur Effizienz verschiedener Unternehmen zum Zeitpunkt der Veröffentlichung. Sie sind keine Aussagen über aktuelle oder historische Fakten hinsichtlich finanzieller Solidität, operativer Zuverlässigkeit, Compliance-Status oder über die definitive Sicherheit von Geschäftsbeziehungen.",
    "Der Inhalt wird teilweise mithilfe KI-gestützter oder algorithmischer Methoden („KI-Inhalte“) erstellt, die öffentlich verfügbare Informationen, proprietäre Rahmenwerke und weitere Datenquellen („Eingabedaten“) nutzen. Vitelis garantiert nicht die Authentizität, Vollständigkeit oder Genauigkeit der Eingabedaten. Referenzen, Risikoabschätzungen, „Top Blind Spots“, Effizienz-Scores oder andere Zusammenfassungen stellen keine Empfehlung oder Aufforderung zum Geschäftsabschluss dar und ersetzen keine professionelle Due-Diligence oder unabhängige finanzielle, operative bzw. Compliance-Prüfung.",
  ],
  sections: [
    {
      title:
        "Vitelis lehnt sämtliche ausdrücklichen oder stillschweigenden Garantien ab, unter anderem:",
      bullets: [
        "Handelsüblichkeit oder Eignung für einen bestimmten Zweck oder Einsatz.",
        "Genauigkeit, Vollständigkeit oder Aktualität des Inhalts oder der daraus abgeleiteten Ergebnisse.",
        "Fehlerfreiheit der KI-Inhalte, der Eingabedaten oder der zur Erstellung verwendeten Software.",
        "Ununterbrochene Funktionsweise oder Kompatibilität des Inhalts mit externen Systemen oder Software.",
        "Gewährleistung zukünftiger finanzieller, operativer oder Compliance-Ergebnisse eines Unternehmens.",
      ],
    },
    {
      title: "Datenschutz:",
      bullets: [
        "Vitelis kann öffentlich verfügbare oder vom Nutzer bereitgestellte Informationen verarbeiten, um KI-gestützte Erkenntnisse zu erzeugen. Personenbezogene Daten werden nur genutzt, wenn sie das Unternehmen ausdrücklich bereitstellt und über entsprechende Rechte bzw. Einwilligungen verfügt.",
        "Vitelis speichert oder verarbeitet keine sensiblen personenbezogenen Daten über das erforderliche Maß hinaus. Anonymisierte oder aggregierte Daten können zur Verbesserung der KI-Modelle verwendet werden.",
        "Nutzer müssen sicherstellen, dass keine vertraulichen Daten ohne Zustimmung oder Anonymisierung übermittelt werden. Vitelis haftet nicht für unbefugte Offenlegungen, wenn Nutzer gegen diese Vorgaben verstoßen.",
      ],
    },
    {
      title: "KI-generierte Inhalte:",
      bullets: [
        "Teile des Inhalts können automatisch oder mit KI-Unterstützung erstellt werden. Solche Ergebnisse können Vorhersagen, Risikoabschätzungen oder Effizienznährungen enthalten und auf Mustern in den Eingabedaten basieren.",
        "Auch bei Plausibilitätsprüfungen können KI-Ausgaben Ungenauigkeiten, Auslassungen oder Spekulationen enthalten. Kritische Erkenntnisse sollten unabhängig verifiziert werden.",
      ],
    },
    {
      title: "Haftungsbeschränkung:",
      bullets: [
        "Vitelis oder seine Vertreter haften unter keinen Umständen für direkte, indirekte, besondere, zufällige oder Folgeschäden (einschließlich finanzieller Verluste, Betriebsunterbrechungen oder Reputationsschäden), die aus der Nutzung oder dem Vertrauen auf den Inhalt entstehen.",
        "Nutzer treffen Entscheidungen (z. B. finanzielle, operative, Compliance-Entscheidungen) auf eigenes Risiko. Unternehmen müssen die Ergebnisse mit internen Governance-Strukturen, offiziellen Audits, Expertenrat und relevanten Prüfungen abgleichen.",
      ],
    },
    {
      title: "Keine Garantie oder Empfehlung:",
      bullets: [
        "Der Inhalt ist keine Garantie für die zukünftige Performance, Stabilität oder Compliance eines Unternehmens und stellt keine Empfehlung für dessen Produkte oder Dienstleistungen dar.",
        "Die Nennung von Drittquellen, Software oder Unternehmen impliziert keine Partnerschaft, Empfehlung oder Zugehörigkeit, sofern dies nicht ausdrücklich angegeben ist.",
      ],
    },
    {
      title: "Transparenz von KI und Modellen:",
      bullets: [
        "Vitelis verwendet proprietäre Methoden und KI-Modelle zur Erstellung des Inhalts. Die internen Funktionsweisen werden möglicherweise nicht vollständig offengelegt, und es können Annahmen oder Heuristiken bestehen. Es wird nicht zugesichert, dass KI-Ergebnisse offiziellen Audits oder regulatorischen Feststellungen entsprechen.",
        "Vitelis behält sich vor, KI oder Rahmenwerke ohne Ankündigung zu aktualisieren, was zu veränderten Ergebnissen führen kann.",
      ],
    },
    {
      title: "Zukünftige Änderungen & Aktualität:",
      bullets: [
        "Der Inhalt spiegelt die Einschätzung von Vitelis zu einem bestimmten Zeitpunkt wider und berücksichtigt keine nicht offengelegten oder künftigen Änderungen in Performance, Strategie oder Risikolandschaft eines Unternehmens.",
        "Vitelis ist nicht verpflichtet, den Inhalt zu aktualisieren, wenn neue Daten verfügbar werden oder sich die Umstände eines Unternehmens ändern.",
      ],
    },
    {
      title: "Geltendes Recht:",
      bullets: [
        "Die hier beschriebenen Haftungsausschlüsse, Beschränkungen und Garantien unterliegen dem Recht des Rechtsraums, in dem Vitelis hauptsächlich tätig ist, oder dem in einer Servicevereinbarung genannten Recht.",
        "Rechtsstreitigkeiten im Zusammenhang mit dem Inhalt werden entsprechend dem geltenden Recht und den in den Servicevereinbarungen festgelegten Verfahren beigelegt.",
      ],
    },
    {
      title: "Einverständnis mit den Bedingungen:",
      bullets: [
        "Durch Zugriff auf den Inhalt bestätigt der Nutzer, diese Hinweise vollständig gelesen zu haben, ihnen zuzustimmen und sie als Bestandteil jeder Vereinbarung mit Vitelis über Analysen oder KI-Inhalte anzuerkennen.",
      ],
    },
  ],
  footerLines: [
    "Kontakt: info@vitelis.com | www.vitelis.com",
    "Bitte lesen Sie den Hinweis am Ende des Dokuments sorgfältig.",
    "© 2025 Vitelis Inc., alle Rechte vorbehalten.",
  ],
};

const docxLocales: Record<SupportedDocxLocale, DocxLocaleStrings> = {
  en: {
    locale: "en",
    creator: "Vitelis AI Research",
    analysisParametersHeading: "Analysis Parameters",
    coverTitle: (data) => formatReportTitle(data, "Report"),
    disclaimer: englishDisclaimer,
  },
  de: {
    locale: "de",
    creator: "Vitelis KI Forschung",
    analysisParametersHeading: "Analyseparameter",
    coverTitle: (data) => formatReportTitle(data, "Bericht"),
    disclaimer: germanDisclaimer,
  },
};

const resolveLocale = (language?: string): SupportedDocxLocale => {
  if (!language) {
    return "en";
  }

  const normalized = language.toLowerCase().trim();
  if (
    normalized.startsWith("de") ||
    normalized.includes("german") ||
    normalized.includes("deutsch")
  ) {
    return "de";
  }

  return "en";
};

export const getDocxLocaleStrings = (language?: string): DocxLocaleStrings => {
  const key = resolveLocale(language);
  return docxLocales[key];
};


