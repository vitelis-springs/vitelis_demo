import {
  generateAnalysisDocxBuffer,
  type AnalysisContent,
  type AnalysisData,
} from '../../../../lib/docx/docx-generator';

export class ExportService {
  static async generateDocx(
    quizData: AnalysisData,
    content: AnalysisContent,
    reportType: 'Bizminer Analysis' | 'SalesMiner Analysis' = 'Bizminer Analysis'
  ): Promise<{ buffer: Buffer; filename: string }> {
    const buffer = await generateAnalysisDocxBuffer(quizData, content, reportType);

    const filename = `${quizData.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${reportType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`;

    return { buffer, filename };
  }
}
