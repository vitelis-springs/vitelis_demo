import { NextRequest, NextResponse } from 'next/server';
import { extractAuthFromRequest } from '../../../../lib/auth';
import { SalesMinerService } from './sales-miner.service';

export class SalesMinerController {
  static async get(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAuthFromRequest(request);
      if (!auth.success) return auth.response;

      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const userId = searchParams.get('userId');
      const executionId = searchParams.get('executionId');

      if (id) {
        const analyze = await SalesMinerService.getSalesMinerAnalyzeById(id);
        if (!analyze) {
          return NextResponse.json({ error: 'Sales miner analyze record not found' }, { status: 404 });
        }
        return NextResponse.json(analyze);
      }

      if (executionId) {
        const analyze = await SalesMinerService.getSalesMinerAnalyzeByExecutionId(executionId);
        if (!analyze) {
          return NextResponse.json({ error: 'Sales miner analyze record not found' }, { status: 404 });
        }
        return NextResponse.json(analyze);
      }

      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');

      if (userId) {
        const isAuthorized =
          String(userId).trim() === String(auth.user.userId).trim() ||
          auth.user.role === 'admin';

        if (!isAuthorized) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (userId === 'all') {
          if (auth.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          const result = await SalesMinerService.getSalesMinerAnalyzesByUser('all', page, limit);
          return NextResponse.json(result);
        }

        const result = await SalesMinerService.getSalesMinerAnalyzesByUser(userId, page, limit);
        return NextResponse.json(result);
      }

      // No userId param: admin gets all, user gets own
      if (auth.user.role === 'admin') {
        const result = await SalesMinerService.getSalesMinerAnalyzesByUser('all', page, limit);
        return NextResponse.json(result);
      }

      const result = await SalesMinerService.getSalesMinerAnalyzesByUser(auth.user.userId, page, limit);
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error in SalesMinerController.get:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  static async create(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAuthFromRequest(request);
      if (!auth.success) return auth.response;

      const body = await request.json();
      const { analyzeId, ...data } = body;

      if (analyzeId) {
        const updated = await SalesMinerService.updateSalesMinerAnalyze(analyzeId, data);
        if (!updated) {
          return NextResponse.json({ error: 'Sales miner analyze record not found' }, { status: 404 });
        }
        return NextResponse.json(updated);
      }

      const newAnalyze = await SalesMinerService.createSalesMinerAnalyzeWithCredits(
        data,
        auth.user.userId,
        auth.user.role
      );
      return NextResponse.json(newAnalyze);
    } catch (error) {
      console.error('Error in SalesMinerController.create:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  static async delete(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAuthFromRequest(request);
      if (!auth.success) return auth.response;

      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
      }

      const deleted = await SalesMinerService.deleteSalesMinerAnalyze(id);
      if (!deleted) {
        return NextResponse.json({ error: 'Sales miner analyze record not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Sales miner analyze record deleted' });
    } catch (error) {
      console.error('Error in SalesMinerController.delete:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
}
