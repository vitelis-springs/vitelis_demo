import { AnalyzeRepository } from '../analyze/analyze.repository';
import { SalesMinerRepository } from '../sales-miner/sales-miner.repository';
import { YamlService } from '../../services/yamlService.server';

export class WebhookService {
  static async updateBizMinerProgress(executionId: string, step: number) {
    const updatedAnalyze = await AnalyzeRepository.updateByExecutionId(executionId, {
      executionStep: step,
      executionStatus: step > 0 ? 'inProgress' : 'started',
    } as any);

    if (!updatedAnalyze) {
      return { success: false, error: 'Analyze record not found with the provided executionId' };
    }

    console.log(`✅ WebhookService: Updated executionStep to ${step} for executionId: ${executionId}`);

    return {
      success: true,
      data: {
        executionId: updatedAnalyze.executionId,
        executionStep: updatedAnalyze.executionStep,
        executionStatus: updatedAnalyze.executionStatus,
      },
    };
  }

  static async updateBizMinerResult(
    executionId: string,
    data: string,
    summary?: string,
    improvementLeverages?: string,
    headToHead?: string,
    sources?: string
  ) {
    const analyzeRecord = await AnalyzeRepository.findByExecutionId(executionId);

    if (!analyzeRecord) {
      return { success: false, error: 'Analyze record not found with the provided executionId' };
    }

    analyzeRecord.resultText = data;
    analyzeRecord.summary = summary;
    analyzeRecord.improvementLeverages = improvementLeverages;
    analyzeRecord.headToHead = headToHead;
    analyzeRecord.sources = sources;
    analyzeRecord.executionStatus = 'finished';
    analyzeRecord.status = 'finished';

    const updatedAnalyze = await analyzeRecord.save();

    console.log(`✅ WebhookService: Updated result for executionId: ${executionId}`);

    return {
      success: true,
      data: {
        executionId: updatedAnalyze.executionId,
        resultText: updatedAnalyze.resultText,
        summary: updatedAnalyze.summary,
        improvementLeverages: updatedAnalyze.improvementLeverages,
        headToHead: updatedAnalyze.headToHead,
        sources: updatedAnalyze.sources,
        executionStatus: updatedAnalyze.executionStatus,
        status: updatedAnalyze.status,
      },
    };
  }

  static async updateSalesMinerProgress(executionId: string, step: number) {
    const updated = await SalesMinerRepository.updateByExecutionId(executionId, {
      executionStep: step,
      executionStatus: step > 0 ? 'inProgress' : 'started',
    } as any);

    if (!updated) {
      return { success: false, error: 'SalesMiner analyze record not found with the provided executionId' };
    }

    console.log(`✅ WebhookService: Updated SalesMiner executionStep to ${step} for executionId: ${executionId}`);

    return {
      success: true,
      data: {
        executionId: updated.executionId,
        executionStep: updated.executionStep,
        executionStatus: updated.executionStatus,
      },
    };
  }

  static async updateSalesMinerResult(executionId: string, yamlFile: File) {
    if (!YamlService.isValidYamlFile(yamlFile.name, yamlFile.type)) {
      return { success: false, error: 'Invalid YAML file type. Only .yaml and .yml files are allowed.' };
    }

    const fileBuffer = Buffer.from(await yamlFile.arrayBuffer());
    const uploadResult = await YamlService.uploadAndProcessYaml(
      fileBuffer,
      yamlFile.name,
      yamlFile.type || 'application/x-yaml',
      'salesminer-yaml-files'
    );

    if (!uploadResult.success) {
      return { success: false, error: `Failed to upload YAML file: ${uploadResult.error}` };
    }

    const yamlFileUrl = uploadResult.url;
    console.log('✅ WebhookService: YAML file uploaded to S3:', yamlFileUrl);

    const record = await SalesMinerRepository.findByExecutionId(executionId);

    if (!record) {
      return { success: false, error: 'SalesMiner analyze record not found with the provided executionId' };
    }

    record.yamlFile = yamlFileUrl;
    record.status = 'finished';
    record.executionStatus = 'finished';
    const updated = await record.save();

    console.log(`✅ WebhookService: Updated SalesMiner yamlFile for executionId: ${executionId}`);

    return {
      success: true,
      data: {
        executionId: updated.executionId,
        yamlFile: updated.yamlFile,
        status: updated.status,
        executionStatus: updated.executionStatus,
        s3Url: yamlFileUrl,
      },
    };
  }
}
