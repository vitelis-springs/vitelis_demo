import { NextRequest, NextResponse } from 'next/server';
import { extractAuthFromRequest } from '../../../../lib/auth';
import { AnalyzeService } from './analyze.service';

export class AnalyzeController {
  static async get(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAuthFromRequest(request);
      if (!auth.success) return auth.response;

      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const userId = searchParams.get('userId');

      if (id) {
        const analyze = await AnalyzeService.getAnalyzeById(id);
        if (!analyze) {
          return NextResponse.json({ error: 'Analyze record not found' }, { status: 404 });
        }
        return NextResponse.json(analyze);
      }

      if (userId) {
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const result = await AnalyzeService.getAnalyzesByUser(userId, page, limit);
        return NextResponse.json(result);
      }

      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const analyzes = await AnalyzeService.getAllAnalyzes(page, limit);
      return NextResponse.json(analyzes);
    } catch (error) {
      console.error('Error in AnalyzeController.get:', error);
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
        const updatedAnalyze = await AnalyzeService.updateAnalyze(analyzeId, data);
        if (!updatedAnalyze) {
          return NextResponse.json({ error: 'Analyze record not found' }, { status: 404 });
        }
        return NextResponse.json(updatedAnalyze);
      }

      const newAnalyze = await AnalyzeService.createAnalyzeWithCredits(
        data,
        auth.user.userId,
        auth.user.role
      );
      return NextResponse.json(newAnalyze);
    } catch (error) {
      console.error('Error in AnalyzeController.create:', error);
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

      const deleted = await AnalyzeService.deleteAnalyze(id);
      if (!deleted) {
        return NextResponse.json({ error: 'Analyze record not found' }, { status: 404 });
      }

      return NextResponse.json({ message: 'Analyze record deleted' });
    } catch (error) {
      console.error('Error in AnalyzeController.delete:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
}
