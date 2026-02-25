import { NextRequest, NextResponse } from 'next/server';
import { ensureDBConnection } from '../../../../lib/mongodb';
import { WebhookService } from './webhook.service';

export class WebhookController {
  static async bizMinerProgress(request: NextRequest): Promise<NextResponse> {
    try {
      await ensureDBConnection();

      const body = await request.json();
      const { executionId, step } = body;

      if (!executionId || step === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: executionId and step' },
          { status: 200 }
        );
      }

      if (typeof step !== 'number' || step < 0) {
        return NextResponse.json(
          { success: false, error: 'Step must be a non-negative number' },
          { status: 200 }
        );
      }

      const result = await WebhookService.updateBizMinerProgress(executionId, step);

      if (!result.success) {
        return NextResponse.json(result, { status: 200 });
      }

      return NextResponse.json({ success: true, message: 'Progress updated successfully', data: result.data });
    } catch (error) {
      console.error('❌ WebhookController.bizMinerProgress:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 200 }
      );
    }
  }

  static async bizMinerResult(request: NextRequest): Promise<NextResponse> {
    try {
      await ensureDBConnection();

      const body = await request.json();
      const { executionId, data, summary, improvementLeverages, headToHead, sources } = body;

      if (!executionId || data === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: executionId and data' },
          { status: 200 }
        );
      }

      const result = await WebhookService.updateBizMinerResult(
        executionId, data, summary, improvementLeverages, headToHead, sources
      );

      if (!result.success) {
        return NextResponse.json(result, { status: 200 });
      }

      return NextResponse.json({ success: true, message: 'Result updated successfully', data: result.data });
    } catch (error) {
      console.error('❌ WebhookController.bizMinerResult:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 200 }
      );
    }
  }

  static async salesMinerProgress(request: NextRequest): Promise<NextResponse> {
    try {
      await ensureDBConnection();

      const body = await request.json();
      const { executionId, step } = body;

      if (!executionId || step === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: executionId and step' },
          { status: 200 }
        );
      }

      if (typeof step !== 'number' || step < 0) {
        return NextResponse.json(
          { success: false, error: 'Step must be a non-negative number' },
          { status: 200 }
        );
      }

      const result = await WebhookService.updateSalesMinerProgress(executionId, step);

      if (!result.success) {
        return NextResponse.json(result, { status: 200 });
      }

      return NextResponse.json({ success: true, message: 'SalesMiner progress updated successfully', data: result.data });
    } catch (error) {
      console.error('❌ WebhookController.salesMinerProgress:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 200 }
      );
    }
  }

  static async salesMinerResult(request: NextRequest, executionId: string): Promise<NextResponse> {
    try {
      await ensureDBConnection();

      if (!executionId) {
        return NextResponse.json({ success: false, error: 'Missing executionId in URL params' }, { status: 400 });
      }

      const formData = await request.formData();
      const yamlFile = formData.get('file') as File;

      if (!yamlFile || yamlFile.size === 0) {
        return NextResponse.json({ success: false, error: 'No YAML file provided' }, { status: 400 });
      }

      const result = await WebhookService.updateSalesMinerResult(executionId, yamlFile);

      if (!result.success) {
        const statusCode = result.error && result.error.includes('Invalid YAML') ? 400 : 500;
        return NextResponse.json(result, { status: statusCode });
      }

      return NextResponse.json({
        success: true,
        message: 'YAML file uploaded and analysis marked as finished',
        data: result.data,
      });
    } catch (error) {
      console.error('❌ WebhookController.salesMinerResult:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 200 }
      );
    }
  }

  static async vitelisSalesProgress(request: NextRequest): Promise<NextResponse> {
    try {
      await ensureDBConnection();

      const body = await request.json();
      const { executionId, step } = body;

      if (!executionId || step === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: executionId and step' },
          { status: 200 }
        );
      }

      if (typeof step !== 'number' || step < 0) {
        return NextResponse.json(
          { success: false, error: 'Step must be a non-negative number' },
          { status: 200 }
        );
      }

      const result = await WebhookService.updateVitelisSalesProgress(executionId, step);

      if (!result.success) {
        return NextResponse.json(result, { status: 200 });
      }

      return NextResponse.json({ success: true, message: 'VitelisSales progress updated successfully', data: result.data });
    } catch (error) {
      console.error('❌ WebhookController.vitelisSalesProgress:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 200 }
      );
    }
  }

  static async vitelisSalesResult(request: NextRequest): Promise<NextResponse> {
    try {
      await ensureDBConnection();

      const body = await request.json();
      const { executionId, generated_report_id } = body;

      if (!executionId) {
        return NextResponse.json(
          { success: false, error: 'Missing required field: executionId' },
          { status: 200 }
        );
      }

      const generatedReportId =
        generated_report_id !== undefined && generated_report_id !== null
          ? Number(generated_report_id)
          : undefined;
      if (generatedReportId !== undefined && !Number.isFinite(generatedReportId)) {
        return NextResponse.json(
          { success: false, error: 'generated_report_id must be a number' },
          { status: 200 }
        );
      }

      const result = await WebhookService.updateVitelisSalesResult(executionId, generatedReportId);

      if (!result.success) {
        return NextResponse.json(result, { status: 200 });
      }

      return NextResponse.json({ success: true, message: 'VitelisSales result updated successfully', data: result.data });
    } catch (error) {
      console.error('❌ WebhookController.vitelisSalesResult:', error);
      return NextResponse.json(
        { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 200 }
      );
    }
  }
}
