import * as YAML from 'yaml';
import { AWSS3Service } from '../../../lib/aws-s3';

export interface YamlProcessingResult {
  isValid: boolean;
  parsedContent?: any;
  error?: string;
  metadata?: {
    keys: string[];
    size: number;
    type: string;
    processedAt: string;
  };
}

export interface YamlUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  bucket?: string;
  error?: string;
  processingResult?: YamlProcessingResult;
}

export class YamlService {
  /**
   * Validate YAML content
   */
  static validateYaml(content: string): YamlProcessingResult {
    try {
      const parsedContent = YAML.parse(content);
      
      return {
        isValid: true,
        parsedContent,
        metadata: {
          keys: Object.keys(parsedContent || {}),
          size: content.length,
          type: typeof parsedContent,
          processedAt: new Date().toISOString(),
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown YAML parsing error',
        metadata: {
          keys: [],
          size: content.length,
          type: 'invalid',
          processedAt: new Date().toISOString(),
        }
      };
    }
  }

  /**
   * Upload YAML file to S3 and validate it
   */
  static async uploadAndProcessYaml(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string = 'application/x-yaml',
    folder: string = 'yaml-files'
  ): Promise<YamlUploadResult> {
    try {
      // Validate YAML content first
      const fileContent = fileBuffer.toString('utf8');
      const validationResult = this.validateYaml(fileContent);

      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Invalid YAML file: ${validationResult.error}`,
          processingResult: validationResult
        };
      }

      // Upload to S3
      const uploadResult = await AWSS3Service.uploadFile(
        fileBuffer,
        fileName,
        contentType,
        folder
      );

      console.log('✅ YamlService: YAML file uploaded successfully:', uploadResult);

      return {
        success: true,
        url: uploadResult.url,
        key: uploadResult.key,
        bucket: uploadResult.bucket,
        processingResult: validationResult
      };

    } catch (error) {
      console.error('❌ YamlService: Error uploading YAML file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Process YAML content for SalesMiner analysis
   */
  static processYamlForSalesMiner(parsedYaml: any): any {
    try {
      console.log('🔄 YamlService: Processing YAML for SalesMiner analysis...');
      
      // Extract relevant fields for SalesMiner analysis
      const processedData = {
        // Add your custom processing logic here
        // For example, extract specific fields that are relevant for analysis
        extractedFields: this.extractRelevantFields(parsedYaml),
        originalStructure: parsedYaml,
        processedAt: new Date().toISOString(),
        yamlType: typeof parsedYaml,
        yamlKeys: Object.keys(parsedYaml || {}),
      };

      console.log('✅ YamlService: YAML processing completed for SalesMiner');
      return processedData;

    } catch (error) {
      console.error('❌ YamlService: Error processing YAML for SalesMiner:', error);
      throw new Error(`Failed to process YAML for SalesMiner: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract relevant fields from YAML content
   * Customize this method based on your YAML structure requirements
   */
  private static extractRelevantFields(parsedYaml: any): any {
    const relevantFields: any = {};

    // Example field extraction - customize based on your YAML structure
    if (parsedYaml && typeof parsedYaml === 'object') {
      // Extract common fields that might be relevant for analysis
      const commonFields = ['name', 'title', 'description', 'version', 'type', 'category', 'tags'];
      
      commonFields.forEach(field => {
        if (parsedYaml[field] !== undefined) {
          relevantFields[field] = parsedYaml[field];
        }
      });

      // Extract nested fields if they exist
      if (parsedYaml.metadata) {
        relevantFields.metadata = parsedYaml.metadata;
      }

      if (parsedYaml.config) {
        relevantFields.config = parsedYaml.config;
      }

      if (parsedYaml.spec) {
        relevantFields.spec = parsedYaml.spec;
      }
    }

    return relevantFields;
  }

  /**
   * Validate file type for YAML
   */
  static isValidYamlFile(fileName: string, mimeType?: string): boolean {
    const allowedExtensions = ['.yaml', '.yml'];
    const allowedMimeTypes = [
      'application/x-yaml',
      'text/yaml',
      'text/x-yaml',
      'application/yaml',
      'text/plain' // Sometimes YAML files are served as text/plain
    ];

    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    return allowedExtensions.includes(fileExtension) || 
           (mimeType ? allowedMimeTypes.includes(mimeType) : false);
  }

  /**
   * Get YAML file size limit
   */
  static getMaxFileSize(): number {
    return 100 * 1024 * 1024; // 100MB
  }
}

export default YamlService;
