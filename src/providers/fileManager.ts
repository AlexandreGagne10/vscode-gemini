// src/providers/fileManager.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class FileManager {
  /**
   * Lit le contenu d'un fichier dans l'espace de travail
   * @param filePath Chemin du fichier relatif à l'espace de travail
   */
  public async readFile(filePath: string): Promise<string> {
    const fullPath = this.getFullPath(filePath);
    
    return new Promise((resolve, reject) => {
      fs.readFile(fullPath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(data);
      });
    });
  }

  /**
   * Écrit du contenu dans un fichier de l'espace de travail
   * @param filePath Chemin du fichier relatif à l'espace de travail
   * @param content Contenu à écrire
   */
  public async writeFile(filePath: string, content: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    
    // Créer le répertoire parent s'il n'existe pas
    const dirPath = path.dirname(fullPath);
    await this.createDirectoryIfNotExists(dirPath);
    
    return new Promise((resolve, reject) => {
      fs.writeFile(fullPath, content, 'utf8', (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve();
      });
    });
  }

  /**
   * Supprime un fichier de l'espace de travail
   * @param filePath Chemin du fichier relatif à l'espace de travail
   */
  public async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    
    return new Promise((resolve, reject) => {
      fs.unlink(fullPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve();
      });
    });
  }

  /**
   * Vérifie si un fichier existe dans l'espace de travail
   * @param filePath Chemin du fichier relatif à l'espace de travail
   */
  public async fileExists(filePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filePath);
    
    return new Promise((resolve) => {
      fs.access(fullPath, fs.constants.F_OK, (err) => {
        resolve(!err);
      });
    });
  }

  /**
   * Liste les fichiers dans un répertoire
   * @param dirPath Chemin du répertoire relatif à l'espace de travail
   */
  public async listFiles(dirPath: string): Promise<string[]> {
    const fullPath = this.getFullPath(dirPath);
    
    return new Promise((resolve, reject) => {
      fs.readdir(fullPath, (err, files) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(files);
      });
    });
  }

  /**
   * Obtient le chemin complet d'un fichier à partir de l'espace de travail
   * @param relativePath Chemin relatif dans l'espace de travail
   */
  private getFullPath(relativePath: string): string {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      throw new Error("Aucun espace de travail ouvert");
    }
    
    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    return path.join(workspaceRoot, relativePath);
  }

  /**
   * Crée un répertoire s'il n'existe pas
   * @param dirPath Chemin du répertoire
   */
  private async createDirectoryIfNotExists(dirPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.mkdir(dirPath, { recursive: true }, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve();
      });
    });
  }
}