// src/api/geminiApi.ts
import * as vscode from 'vscode';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export interface GeminiResponse {
  text: string;
  error?: string;
}

export class GeminiApiService {
  private model: GenerativeModel | undefined;
  private apiKey: string | undefined;
  private modelName: string = 'gemini-pro';

  constructor() {
    this.initializeService();
    // Écouter les changements de configuration
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('vscode-gemini.apiKey') || e.affectsConfiguration('vscode-gemini.model')) {
        this.initializeService();
      }
    });
  }

  private initializeService(): void {
    const config = vscode.workspace.getConfiguration('vscode-gemini');
    this.apiKey = config.get<string>('apiKey');
    this.modelName = config.get<string>('model') || 'gemini-pro';

    if (!this.apiKey) {
      vscode.window.showWarningMessage('Clé API Gemini non configurée. Veuillez la définir dans les paramètres.');
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = genAI.getGenerativeModel({ model: this.modelName });
    } catch (error) {
      console.error('Error initializing Gemini API:', error);
      vscode.window.showErrorMessage(`Erreur lors de l'initialisation de l'API Gemini: ${error}`);
    }
  }

  public async generateText(prompt: string): Promise<GeminiResponse> {
    if (!this.model) {
      await this.initializeService();
      
      if (!this.model) {
        return {
          text: '',
          error: 'API Gemini non initialisée. Vérifiez votre clé API dans les paramètres.'
        };
      }
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      return { text };
    } catch (error) {
      console.error('Error generating text with Gemini:', error);
      return {
        text: '',
        error: `Erreur lors de la génération de texte: ${error}`
      };
    }
  }

  public async generateCode(prompt: string, context: string = ''): Promise<GeminiResponse> {
    const enhancedPrompt = context 
      ? `Contexte du code:\n\`\`\`\n${context}\n\`\`\`\n\nTâche: ${prompt}\n\nGénérer uniquement le code sans explications supplémentaires.`
      : `Tâche: ${prompt}\n\nGénérer uniquement le code sans explications supplémentaires.`;
    
    return this.generateText(enhancedPrompt);
  }

  public async fixError(code: string, fileName: string): Promise<GeminiResponse> {
    const fileExtension = fileName.split('.').pop();
    const prompt = `Corrige l'erreur dans ce code ${fileExtension || ''}:\n\`\`\`\n${code}\n\`\`\`\n\nFournis uniquement le code corrigé sans explications supplémentaires.`;
    
    return this.generateText(prompt);
  }

  public getAvailableModels(): string[] {
    return ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'];
  }

  public getCurrentModel(): string {
    return this.modelName;
  }

  public async setModel(modelName: string): Promise<void> {
    if (!['gemini-pro', 'gemini-pro-vision', 'gemini-ultra'].includes(modelName)) {
      throw new Error(`Modèle non pris en charge: ${modelName}`);
    }

    const config = vscode.workspace.getConfiguration('vscode-gemini');
    await config.update('model', modelName, vscode.ConfigurationTarget.Global);
    this.modelName = modelName;
    this.initializeService();
  }
}