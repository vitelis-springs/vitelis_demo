import { NextRequest, NextResponse } from 'next/server';
import { extractAuthFromRequest } from '../../../../lib/auth';
import { ExportService } from './export.service';

export class ExportController {
  static async generateDocx(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAuthFromRequest(request);
      if (!auth.success) return auth.response;

      const body = await request.json();
      const { quizData, content, reportType } = body;

      if (!quizData || !content) {
        return NextResponse.json(
          { error: 'Missing required data: quizData and content are required' },
          { status: 400 }
        );
      }

      const { buffer, filename } = await ExportService.generateDocx(
        quizData,
        content,
        reportType || 'Bizminer Analysis'
      );

      const uint8Array = new Uint8Array(buffer);

      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    } catch (error) {
      console.error('❌ ExportController.generateDocx:', error);
      return NextResponse.json(
        { error: 'Failed to generate DOCX document', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }
}
