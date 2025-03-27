// src/providers/aiProvider.ts
import { GeminiApiService, GeminiResponse } from '../api/geminiApi';

export class AiProvider {
  constructor(private geminiApi: GeminiApiService) {}

  public async generateText(prompt: string): Promise<string> {
    const response = await this.geminiApi.generateText(prompt);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.text;
  }

  public async generateCode(prompt: string, context: string = ''): Promise<string> {
    const response = await this.geminiApi.generateCode(prompt, context);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.text;
  }

  public async fixError(code: string, fileName: string): Promise<string> {
    const response = await this.geminiApi.fixError(code, fileName);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    return response.text;
  }

  public getAvailableModels(): string[] {
    return this.geminiApi.getAvailableModels();
  }

  public getCurrentModel(): string {
    return this.geminiApi.getCurrentModel();
  }

  public async setModel(modelName: string): Promise<void> {
    await this.geminiApi.setModel(modelName);
  }
}