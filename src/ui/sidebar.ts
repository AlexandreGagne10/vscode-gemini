// src/ui/sidebar.ts
import * as vscode from 'vscode';
import { AiProvider } from '../providers/aiProvider';
import { FileManager } from '../providers/fileManager';
import { getNonce } from '../utils/helpers';

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  
  constructor(
    private readonly _extensionUri: vscode.Uri,
    private aiProvider: AiProvider,
    private fileManager: FileManager
  ) {}
  
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };
    
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    
    // Gérer les messages du webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'generate-text':
          this.handleGenerateText(data.value);
          break;
        case 'generate-code':
          this.handleGenerateCode(data.value, data.context);
          break;
        case 'change-model':
          this.handleChangeModel(data.value);
          break;
        case 'toggle-error-detection':
          this.handleToggleErrorDetection(data.value);
          break;
        case 'get-config':
          this.sendConfiguration();
          break;
      }
    });
    
    // Envoyer la configuration initiale
    this.sendConfiguration();
  }
  
  private async handleGenerateText(prompt: string) {
    if (!this._view) {
      return;
    }
    
    this._view.webview.postMessage({
      type: 'status',
      value: 'generating'
    });
    
    try {
      const result = await this.aiProvider.generateText(prompt);
      
      this._view.webview.postMessage({
        type: 'generation-result',
        value: result
      });
    } catch (error) {
      this._view.webview.postMessage({
        type: 'error',
        value: `Erreur: ${error}`
      });
    }
  }
  
  private async handleGenerateCode(prompt: string, context: string) {
    if (!this._view) {
      return;
    }
    
    this._view.webview.postMessage({
      type: 'status',
      value: 'generating'
    });
    
    try {
      const result = await this.aiProvider.generateCode(prompt, context);
      
      this._view.webview.postMessage({
        type: 'generation-result',
        value: result
      });
    } catch (error) {
      this._view.webview.postMessage({
        type: 'error',
        value: `Erreur: ${error}`
      });
    }
  }
  
  private async handleChangeModel(modelName: string) {
    if (!this._view) {
      return;
    }
    
    try {
      await this.aiProvider.setModel(modelName);
      
      this._view.webview.postMessage({
        type: 'model-changed',
        value: modelName
      });
      
      vscode.window.showInformationMessage(`Modèle changé: ${modelName}`);
    } catch (error) {
      this._view.webview.postMessage({
        type: 'error',
        value: `Erreur lors du changement de modèle: ${error}`
      });
    }
  }
  
  private async handleToggleErrorDetection(enabled: boolean) {
    const config = vscode.workspace.getConfiguration('vscode-gemini');
    await config.update('autoFixErrors', enabled, vscode.ConfigurationTarget.Global);
  }
  
  private async sendConfiguration() {
    if (!this._view) {
      return;
    }
    
    const config = vscode.workspace.getConfiguration('vscode-gemini');
    const apiKey = config.get<string>('apiKey');
    const currentModel = this.aiProvider.getCurrentModel();
    const availableModels = this.aiProvider.getAvailableModels();
    const autoFixErrors = config.get<boolean>('autoFixErrors');
    
    this._view.webview.postMessage({
      type: 'config',
      value: {
        apiKey: apiKey ? '******' : undefined,
        currentModel,
        availableModels,
        autoFixErrors
      }
    });
  }
  
  private _getHtmlForWebview(webview: vscode.Webview) {
    // Use a nonce to only allow a specific script to be run
    const nonce = getNonce();
    
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <title>Gemini AI</title>
        <style>
        :root {
          --container-padding: 16px;
          --input-padding-vertical: 6px;
          --input-padding-horizontal: 8px;
          --input-margin-vertical: 4px;
          --input-margin-horizontal: 0;
          --button-padding-vertical: 6px;
          --button-padding-horizontal: 12px;
          --color-bg: var(--vscode-editor-background);
          --color-fg: var(--vscode-editor-foreground);
          --color-input-bg: var(--vscode-input-background);
          --color-input-fg: var(--vscode-input-foreground);
          --color-accent: var(--vscode-button-background);
          --color-accent-hover: var(--vscode-button-hoverBackground);
          --color-border: var(--vscode-panel-border);
          --color-success: var(--vscode-terminal-ansiGreen);
          --color-warning: var(--vscode-terminal-ansiYellow);
          --color-error: var(--vscode-terminal-ansiRed);
        }
        
        body {
          background-color: var(--color-bg);
          color: var(--color-fg);
          font-family: var(--vscode-font-family);
          font-weight: var(--vscode-font-weight);
          font-size: var(--vscode-font-size);
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        
        .header {
          padding: var(--container-padding);
          border-bottom: 1px solid var(--color-border);
        }
        
        .header h2 {
          margin-top: 0;
          margin-bottom: 10px;
          font-weight: normal;
        }
        
        .config-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .model-select {
          padding: var(--input-padding-vertical) var(--input-padding-horizontal);
          border: 1px solid var(--color-border);
          background-color: var(--color-input-bg);
          color: var(--color-input-fg);
          border-radius: 2px;
        }
        
        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .container {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: var(--container-padding);
          overflow: auto;
        }
        
        .input-section {
          display: flex;
          flex-direction: column;
          margin-bottom: 20px;
        }
        
        textarea {
          background-color: var(--color-input-bg);
          color: var(--color-input-fg);
          border: 1px solid var(--color-border);
          padding: var(--input-padding-vertical) var(--input-padding-horizontal);
          border-radius: 2px;
          resize: vertical;
          font-family: var(--vscode-editor-font-family);
          font-size: var(--vscode-editor-font-size);
        }
        
        .context-section {
          margin-top: 8px;
          margin-bottom: 10px;
        }
        
        .buttons {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }
        
        button {
          padding: var(--button-padding-vertical) var(--button-padding-horizontal);
          border: none;
          border-radius: 2px;
          cursor: pointer;
          font-size: 13px;
        }
        
        .primary-btn {
          background-color: var(--color-accent);
          color: var(--vscode-button-foreground);
        }
        
        .primary-btn:hover {
          background-color: var(--color-accent-hover);
        }
        
        .secondary-btn {
          background-color: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
        }
        
        .secondary-btn:hover {
          background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .output-section {
          display: flex;
          flex-direction: column;
          flex: 1;
          border: 1px solid var(--color-border);
          border-radius: 2px;
        }
        
        .output-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background-color: var(--vscode-panelSectionHeader-background);
          border-bottom: 1px solid var(--color-border);
        }
        
        .output-actions {
          display: flex;
          gap: 4px;
        }
        
        .output-actions button {
          background: none;
          border: none;
          padding: 4px;
          color: var(--color-fg);
          opacity: 0.8;
        }
        
        .output-actions button:hover:not(:disabled) {
          opacity: 1;
        }
        
        .output-content {
          flex: 1;
          padding: 12px;
          overflow: auto;
          background-color: var(--vscode-panel-background);
        }
        
        .placeholder {
          color: var(--vscode-disabledForeground);
          font-style: italic;
        }
        
        pre {
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
          font-family: var(--vscode-editor-font-family);
          font-size: var(--vscode-editor-font-size);
        }
        
        .status-bar {
          padding: 4px var(--container-padding);
          border-top: 1px solid var(--color-border);
          background-color: var(--vscode-statusBar-background);
          color: var(--vscode-statusBar-foreground);
          font-size: 12px;
        }
        
        details {
          margin-bottom: 8px;
        }
        
        summary {
          cursor: pointer;
          padding: 4px 0;
        }
        
        /* Icônes */
        .icon {
          font-size: 14px;
        }
        
        /* Messages d'état */
        .status-success {
          color: var(--color-success);
        }
        
        .status-warning {
          color: var(--color-warning);
        }
        
        .status-error {
          color: var(--color-error);
        }
        </style>
    </head>
    <body>
        <header class="header">
            <h2>Gemini AI</h2>
            <div class="config-section">
                <label for="model-select">Modèle:</label>
                <select id="model-select" class="model-select">
                    <option value="gemini-pro">Gemini Pro</option>
                    <option value="gemini-pro-vision">Gemini Pro Vision</option>
                    <option value="gemini-ultra">Gemini Ultra</option>
                </select>
                <div class="checkbox-container">
                    <input type="checkbox" id="auto-fix-errors" />
                    <label for="auto-fix-errors">Corriger automatiquement les erreurs</label>
                </div>
            </div>
        </header>
        
        <div class="container">
            <div class="input-section">
                <textarea id="prompt-input" placeholder="Posez une question ou décrivez ce que vous voulez faire..." rows="4"></textarea>
                <div class="context-section">
                    <details>
                        <summary>Contexte additionnel (code)</summary>
                        <textarea id="context-input" placeholder="Ajoutez du code ou du contexte supplémentaire ici..." rows="6"></textarea>
                    </details>
                </div>
                <div class="buttons">
                    <button id="generate-text-btn" class="primary-btn">Générer du texte</button>
                    <button id="generate-code-btn" class="secondary-btn">Générer du code</button>
                </div>
            </div>
            
            <div class="output-section">
                <div class="output-header">
                    <span>Résultat</span>
                    <div class="output-actions">
                        <button id="copy-btn" title="Copier" disabled>
                            <span class="icon">📋</span>
                        </button>
                        <button id="insert-btn" title="Insérer dans l'éditeur" disabled>
                            <span class="icon">📝</span>
                        </button>
                        <button id="save-btn" title="Enregistrer dans un fichier" disabled>
                            <span class="icon">💾</span>
                        </button>
                    </div>
                </div>
                <div id="output" class="output-content">
                    <div class="placeholder">Les résultats de Gemini apparaîtront ici.</div>
                </div>
            </div>
        </div>
        
        <div id="status-bar" class="status-bar">
            <span id="status">Prêt</span>
        </div>
        
        <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            let outputContent = '';
            
            // Éléments de l'interface
            const promptInput = document.getElementById('prompt-input');
            const contextInput = document.getElementById('context-input');
            const generateTextBtn = document.getElementById('generate-text-btn');
            const generateCodeBtn = document.getElementById('generate-code-btn');
            const output = document.getElementById('output');
            const copyBtn = document.getElementById('copy-btn');
            const insertBtn = document.getElementById('insert-btn');
            const saveBtn = document.getElementById('save-btn');
            const modelSelect = document.getElementById('model-select');
            const autoFixErrors = document.getElementById('auto-fix-errors');
            const statusBar = document.getElementById('status');
            
            // Fonctions
            function updateOutputContent(content) {
                outputContent = content;
                output.innerHTML = '<pre>' + escapeHtml(content) + '</pre>';
                copyBtn.disabled = !content;
                insertBtn.disabled = !content;
                saveBtn.disabled = !content;
            }
            
            function escapeHtml(text) {
                return text
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }
            
            function updateStatus(status) {
                statusBar.textContent = status;
            }
            
            // Gestionnaires d'événements
            generateTextBtn.addEventListener('click', () => {
                const prompt = promptInput.value.trim();
                if (prompt) {
                    vscode.postMessage({
                        type: 'generate-text',
                        value: prompt
                    });
                }
            });
            
            generateCodeBtn.addEventListener('click', () => {
                const prompt = promptInput.value.trim();
                const context = contextInput.value.trim();
                if (prompt) {
                    vscode.postMessage({
                        type: 'generate-code',
                        value: prompt,
                        context: context
                    });
                }
            });
            
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(outputContent)
                    .then(() => updateStatus('Copié dans le presse-papiers'))
                    .catch(err => updateStatus('Erreur: Impossible de copier'));
            });
            
            insertBtn.addEventListener('click', () => {
                vscode.postMessage({
                    type: 'insert-to-editor',
                    value: outputContent
                });
            });
            
            saveBtn.addEventListener('click', () => {
                vscode.postMessage({
                    type: 'save-to-file',
                    value: outputContent
                });
            });
            
            modelSelect.addEventListener('change', () => {
                vscode.postMessage({
                    type: 'change-model',
                    value: modelSelect.value
                });
            });
            
            autoFixErrors.addEventListener('change', () => {
                vscode.postMessage({
                    type: 'toggle-error-detection',
                    value: autoFixErrors.checked
                });
            });
            
            // Réception des messages
            window.addEventListener('message', event => {
                const message = event.data;
                
                switch (message.type) {
                    case 'generation-result':
                        updateOutputContent(message.value);
                        updateStatus('Génération terminée');
                        break;
                    case 'status':
                        if (message.value === 'generating') {
                            updateStatus('Génération en cours...');
                        }
                        break;
                    case 'error':
                        updateStatus(message.value);
                        break;
                    case 'config':
                        const config = message.value;
                        if (config.currentModel) {
                            modelSelect.value = config.currentModel;
                        }
                        if (config.autoFixErrors !== undefined) {
                            autoFixErrors.checked = config.autoFixErrors;
                        }
                        break;
                    case 'model-changed':
                        updateStatus('Modèle changé: ' + message.value);
                        break;
                }
            });
            
            // Demander la configuration au chargement
            vscode.postMessage({ type: 'get-config' });
        </script>
    </body>
    </html>`;
  }
}