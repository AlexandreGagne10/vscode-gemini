// src/providers/errorDetector.ts
import * as vscode from 'vscode';
import { AiProvider } from './aiProvider';
import { FileManager } from './fileManager';

export class ErrorDetector {
  private disposable: vscode.Disposable | undefined;
  
  constructor(
    private aiProvider: AiProvider,
    private fileManager: FileManager
  ) {}
  
  /**
   * Démarre la détection automatique des erreurs
   */
  public startDetection(): void {
    if (this.disposable) {
      this.stopDetection();
    }
    
    // Écoute les diagnostics (erreurs et avertissements)
    this.disposable = vscode.languages.onDidChangeDiagnostics(this.handleDiagnostics.bind(this));
    
    vscode.window.showInformationMessage('Détection automatique des erreurs activée');
  }
  
  /**
   * Arrête la détection automatique des erreurs
   */
  public stopDetection(): void {
    if (this.disposable) {
      this.disposable.dispose();
      this.disposable = undefined;
    }
    
    vscode.window.showInformationMessage('Détection automatique des erreurs désactivée');
  }
  
  /**
   * Traite les diagnostics pour détecter et corriger les erreurs
   */
  private async handleDiagnostics(event: vscode.DiagnosticChangeEvent): Promise<void> {
    // Vérifie si la correction automatique est activée
    const config = vscode.workspace.getConfiguration('vscode-gemini');
    const isAutoFixEnabled = config.get<boolean>('autoFixErrors');
    
    if (!isAutoFixEnabled) {
      return;
    }
    
    // Pour chaque URI modifié
    for (const uri of event.uris) {
      const diagnostics = vscode.languages.getDiagnostics(uri);
      const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
      
      if (errors.length === 0) {
        continue;
      }
      
      // Obtenir le document
      try {
        const document = await vscode.workspace.openTextDocument(uri);
        const fileName = uri.fsPath.split('/').pop() || '';
        
        // Pour chaque erreur, tenter de la corriger
        for (const error of errors) {
          const range = error.range;
          const errorMessage = error.message;
          const codeWithError = document.getText(range);
          
          if (!codeWithError) {
            continue;
          }
          
          // Afficher une notification avec l'option de correction
          const action = await vscode.window.showErrorMessage(
            `Erreur détectée dans ${fileName}: ${errorMessage}`,
            'Corriger automatiquement'
          );
          
          if (action === 'Corriger automatiquement') {
            await this.fixErrorInDocument(document, range, codeWithError, fileName);
          }
        }
      } catch (err) {
        console.error('Erreur lors de la gestion des diagnostics:', err);
      }
    }
  }
  
  /**
   * Tente de corriger une erreur dans un document
   */
  private async fixErrorInDocument(
    document: vscode.TextDocument,
    range: vscode.Range,
    codeWithError: string,
    fileName: string
  ): Promise<void> {
    try {
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Correction d'erreur avec Gemini",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: "Analyse de l'erreur..." });
        
        try {
          const fixedCode = await this.aiProvider.fixError(codeWithError, fileName);
          
          if (fixedCode && fixedCode !== codeWithError) {
            // Créer une modification pour appliquer la correction
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, range, fixedCode);
            
            // Appliquer la modification
            await vscode.workspace.applyEdit(edit);
            
            progress.report({ increment: 100, message: "Erreur corrigée!" });
            vscode.window.showInformationMessage('Erreur corrigée avec succès');
          } else {
            progress.report({ increment: 100, message: "Aucune correction trouvée" });
            vscode.window.showInformationMessage("Gemini n'a pas pu trouver de correction pour cette erreur");
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Erreur lors de la correction: ${error}`);
        }
        
        return Promise.resolve();
      });
    } catch (error) {
      console.error('Erreur lors de la tentative de correction:', error);
    }
  }
  
  /**
   * Tente de corriger une erreur dans un code donné
   */
  public async fixError(code: string, fileName: string): Promise<string> {
    return this.aiProvider.fixError(code, fileName);
  }
}