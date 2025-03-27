import * as vscode from 'vscode';
import { GeminiApiService } from './api/geminiApi';
import { SidebarProvider } from './ui/sidebar';
import { FileManager } from './providers/fileManager';
import { ErrorDetector } from './providers/errorDetector';
import { AiProvider } from './providers/aiProvider';

let errorDetectionStatusBar: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log('Extension "vscode-gemini" is now active');

  // Initialiser les services
  const geminiApiService = new GeminiApiService();
  const aiProvider = new AiProvider(geminiApiService);
  const fileManager = new FileManager();
  const errorDetector = new ErrorDetector(aiProvider, fileManager);
  
  // Créer le fournisseur de barre latérale
  const sidebarProvider = new SidebarProvider(context.extensionUri, aiProvider, fileManager);
  
  // Enregistrer le fournisseur de vue
  const sidebarView = vscode.window.registerWebviewViewProvider(
    "geminiView",
    sidebarProvider
  );
  
  // Créer un élément de barre d'état pour afficher l'état de la détection d'erreurs
  errorDetectionStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  errorDetectionStatusBar.text = "Gemini: Détection d'erreurs désactivée";
  errorDetectionStatusBar.command = "vscode-gemini.toggleErrorDetection";
  errorDetectionStatusBar.show();
  
  // Commande pour ouvrir Gemini
  const openGeminiCommand = vscode.commands.registerCommand('vscode-gemini.openGemini', () => {
    vscode.commands.executeCommand('workbench.view.extension.gemini-sidebar');
  });
  
  // Commande pour générer du code
  const generateCodeCommand = vscode.commands.registerCommand('vscode-gemini.generateCode', async () => {
    const editor = vscode.window.activeTextEditor;
    
    if (editor) {
      const selection = editor.selection;
      const text = editor.document.getText(selection);
      
      const prompt = await vscode.window.showInputBox({
        placeHolder: "Décrivez ce que vous voulez générer",
        prompt: "Gemini générera du code basé sur cette description"
      });
      
      if (prompt) {
        vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: "Génération de code avec Gemini",
          cancellable: false
        }, async (progress) => {
          progress.report({ increment: 0 });
          
          try {
            const result = await aiProvider.generateCode(prompt, text);
            
            if (result) {
              editor.edit(editBuilder => {
                editBuilder.replace(selection, result);
              });
            }
            
            progress.report({ increment: 100 });
          } catch (error) {
            vscode.window.showErrorMessage(`Erreur lors de la génération de code: ${error}`);
          }
          
          return Promise.resolve();
        });
      }
    }
  });
  
  // Commande pour corriger une erreur
  const fixErrorCommand = vscode.commands.registerCommand('vscode-gemini.fixError', async () => {
    const editor = vscode.window.activeTextEditor;
    
    if (editor) {
      const selection = editor.selection;
      const text = editor.document.getText(selection);
      
      vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Correction d'erreur avec Gemini",
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0 });
        
        try {
          const result = await errorDetector.fixError(text, editor.document.fileName);
          
          if (result) {
            editor.edit(editBuilder => {
              editBuilder.replace(selection, result);
            });
          }
          
          progress.report({ increment: 100 });
        } catch (error) {
          vscode.window.showErrorMessage(`Erreur lors de la correction: ${error}`);
        }
        
        return Promise.resolve();
      });
    }
  });
  
  // Commande pour activer/désactiver la détection d'erreurs
  const toggleErrorDetectionCommand = vscode.commands.registerCommand('vscode-gemini.toggleErrorDetection', () => {
    const config = vscode.workspace.getConfiguration('vscode-gemini');
    const isEnabled = config.get<boolean>('autoFixErrors');
    
    config.update('autoFixErrors', !isEnabled, vscode.ConfigurationTarget.Global).then(() => {
      updateErrorDetectionStatus(!isEnabled);
    });
  });
  
  // Écouter les changements de configuration
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('vscode-gemini.autoFixErrors')) {
      const config = vscode.workspace.getConfiguration('vscode-gemini');
      const isEnabled = config.get<boolean>('autoFixErrors');
      updateErrorDetectionStatus(isEnabled);
      
      if (isEnabled) {
        errorDetector.startDetection();
      } else {
        errorDetector.stopDetection();
      }
    }
  }));
  
  // Initialiser l'état de détection d'erreurs
  const config = vscode.workspace.getConfiguration('vscode-gemini');
  const isErrorDetectionEnabled = config.get<boolean>('autoFixErrors');
  updateErrorDetectionStatus(isErrorDetectionEnabled);
  
  if (isErrorDetectionEnabled) {
    errorDetector.startDetection();
  }
  
  // Ajouter les souscriptions au contexte
  context.subscriptions.push(
    sidebarView,
    openGeminiCommand,
    generateCodeCommand,
    fixErrorCommand,
    toggleErrorDetectionCommand,
    errorDetectionStatusBar
  );
}

function updateErrorDetectionStatus(isEnabled: boolean | undefined) {
  if (isEnabled) {
    errorDetectionStatusBar.text = "Gemini: Détection d'erreurs activée";
    errorDetectionStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else {
    errorDetectionStatusBar.text = "Gemini: Détection d'erreurs désactivée";
    errorDetectionStatusBar.backgroundColor = undefined;
  }
}

export function deactivate() {}