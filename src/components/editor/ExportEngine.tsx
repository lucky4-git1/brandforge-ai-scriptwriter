import { save } from '@tauri-apps/api/dialog';
import { writeTextFile } from '@tauri-apps/api/fs';

export type ExportFormat = 'txt' | 'md' | 'json' | 'docx' | 'pdf' | 'html' | 'gdocs';
export type ScriptFormat = 'plain' | 'production' | 'shot-list' | 'storyboard';

interface ExportOptions {
  content: string;
  brandName: string;
  contentType: string;
  language: string;
  exportFormat: ExportFormat;
  scriptFormat?: ScriptFormat;
}

export class ExportEngine {
  static async export(options: ExportOptions): Promise<void> {
    const { content, brandName, contentType, exportFormat, scriptFormat = 'plain' } = options;
    
    const date = new Date().toISOString().split('T')[0];
    let filename: string;
    let fileContent: string;
    
    switch (exportFormat) {
      case 'txt':
        filename = `${brandName}_${contentType}_${date}.txt`;
        fileContent = this.toTxt(content, scriptFormat);
        break;
      case 'md':
        filename = `${brandName}_${contentType}_${date}.md`;
        fileContent = this.toMarkdown(content, scriptFormat);
        break;
      case 'json':
        filename = `${brandName}_${contentType}_${date}.json`;
        fileContent = this.toJson(content, options);
        break;
      case 'html':
        filename = `${brandName}_${contentType}_${date}.html`;
        fileContent = this.toHtml(content, options);
        break;
      case 'gdocs':
        filename = `${brandName}_${contentType}_${date}_gdocs.html`;
        fileContent = this.toGoogleDocs(content, options);
        break;
      case 'docx':
        filename = `${brandName}_${contentType}_${date}.docx`;
        fileContent = this.toMarkdown(content, scriptFormat);
        break;
      case 'pdf':
        filename = `${brandName}_${contentType}_${date}.pdf`;
        await this.exportAsPdf(content, options);
        return;
      default:
        throw new Error(`Unsupported export format: ${exportFormat}`);
    }
    
    try {
      const filePath = await save({
        defaultPath: filename,
        filters: [
          {
            name: `${exportFormat.toUpperCase()} Files`,
            extensions: [exportFormat === 'gdocs' ? 'html' : exportFormat],
          },
        ],
      });
      
      if (filePath) {
        await writeTextFile(filePath, fileContent);
      }
    } catch (error) {
      console.error('Export error:', error);
      throw new Error(`Export failed: ${error}`);
    }
  }
  
  private static toTxt(content: string, scriptFormat: ScriptFormat): string {
    switch (scriptFormat) {
      case 'production':
        return this.toProductionScript(content);
      case 'shot-list':
        return this.toShotList(content);
      case 'storyboard':
        return this.toStoryboard(content);
      default:
        return content;
    }
  }
  
  private static toMarkdown(content: string, scriptFormat: ScriptFormat): string {
    switch (scriptFormat) {
      case 'production':
        return this.toProductionScriptMarkdown(content);
      case 'shot-list':
        return this.toShotListMarkdown(content);
      case 'storyboard':
        return this.toStoryboardMarkdown(content);
      default:
        return content;
    }
  }
  
  private static toJson(content: string, options: ExportOptions): string {
    return JSON.stringify({
      content,
      brandName: options.brandName,
      contentType: options.contentType,
      language: options.language,
      exportedAt: new Date().toISOString(),
      metadata: {
        wordCount: content.split(/\s+/).filter(w => w.length > 0).length,
        characterCount: content.length,
      },
    }, null, 2);
  }
  
  private static toProductionScript(content: string): string {
    const lines = content.split('\n');
    let result = 'PRODUCTION SCRIPT\n';
    result += '='.repeat(50) + '\n\n';
    
    let currentSection = '';
    for (const line of lines) {
      if (line.startsWith('##')) {
        currentSection = line.replace('##', '').trim();
        result += `\n[${currentSection.toUpperCase()}]\n`;
      } else if (line.trim()) {
        result += `${line}\n`;
      }
    }
    
    return result;
  }
  
  private static toProductionScriptMarkdown(content: string): string {
    const lines = content.split('\n');
    let result = '# Production Script\n\n';
    
    let currentSection = '';
    for (const line of lines) {
      if (line.startsWith('##')) {
        currentSection = line.replace('##', '').trim();
        result += `\n## ${currentSection}\n\n`;
      } else if (line.trim()) {
        result += `${line}\n\n`;
      }
    }
    
    return result;
  }
  
  private static toShotList(content: string): string {
    const lines = content.split('\n');
    let result = 'SHOT LIST\n';
    result += '='.repeat(50) + '\n\n';
    
    let shotNumber = 1;
    for (const line of lines) {
      if (line.startsWith('## SCENE') || line.startsWith('## SCENE-BY-SCENE')) {
        continue;
      } else if (line.trim() && !line.startsWith('##')) {
        result += `SHOT ${shotNumber}: ${line}\n`;
        shotNumber++;
      }
    }
    
    return result;
  }
  
  private static toShotListMarkdown(content: string): string {
    const lines = content.split('\n');
    let result = '# Shot List\n\n';
    
    let shotNumber = 1;
    for (const line of lines) {
      if (line.startsWith('## SCENE') || line.startsWith('## SCENE-BY-SCENE')) {
        continue;
      } else if (line.trim() && !line.startsWith('##')) {
        result += `## Shot ${shotNumber}\n\n${line}\n\n`;
        shotNumber++;
      }
    }
    
    return result;
  }
  
  private static toStoryboard(content: string): string {
    const lines = content.split('\n');
    let result = 'STORYBOARD OUTLINE\n';
    result += '='.repeat(50) + '\n\n';
    
    let frameNumber = 1;
    for (const line of lines) {
      if (line.startsWith('## SCENE') || line.startsWith('## SCENE-BY-SCENE')) {
        continue;
      } else if (line.trim() && !line.startsWith('##')) {
        result += `FRAME ${frameNumber}:\n`;
        result += `  Visual: ${line}\n`;
        result += `  Audio: [Voiceover]\n`;
        result += `  Duration: [2-3s]\n\n`;
        frameNumber++;
      }
    }
    
    return result;
  }
  
  private static toStoryboardMarkdown(content: string): string {
    const lines = content.split('\n');
    let result = '# Storyboard Outline\n\n';
    
    let frameNumber = 1;
    for (const line of lines) {
      if (line.startsWith('## SCENE') || line.startsWith('## SCENE-BY-SCENE')) {
        continue;
      } else if (line.trim() && !line.startsWith('##')) {
        result += `## Frame ${frameNumber}\n\n`;
        result += `**Visual:** ${line}\n\n`;
        result += `**Audio:** [Voiceover]\n\n`;
        result += `**Duration:** [2-3s]\n\n`;
        result += '---\n\n';
        frameNumber++;
      }
    }
    
    return result;
  }

  private static toHtml(content: string, options: ExportOptions): string {
    const lines = content.split('\n');
    let result = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${options.brandName} - ${options.contentType}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 2px solid #FF7EB6; padding-bottom: 10px; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .content { white-space: pre-wrap; color: #333; }
  </style>
</head>
<body>
  <h1>${options.brandName} - ${options.contentType}</h1>
  <div class="meta">
    <p><strong>Language:</strong> ${options.language}</p>
    <p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>
  </div>
  <div class="content">${lines.map(line => `<p>${line}</p>`).join('')}</div>
</body>
</html>`;
    return result;
  }

  private static toGoogleDocs(content: string, options: ExportOptions): string {
    const lines = content.split('\n');
    let result = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${options.brandName} - ${options.contentType} (Google Docs)</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1 { color: #333; border-bottom: 3px solid #4285f4; padding-bottom: 10px; }
    .meta { color: #666; font-size: 0.9em; margin-bottom: 20px; background: #f5f5f5; padding: 10px; border-radius: 4px; }
    .content { white-space: pre-wrap; color: #333; }
    .note { background: #fff3cd; padding: 10px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107; }
  </style>
</head>
<body>
  <h1>${options.brandName} - ${options.contentType}</h1>
  <div class="meta">
    <p><strong>Language:</strong> ${options.language}</p>
    <p><strong>Exported:</strong> ${new Date().toLocaleString()}</p>
  </div>
  <div class="note">
    <strong>Note:</strong> This file is formatted for easy import into Google Docs. Open this HTML file in a browser, then copy and paste into Google Docs, or upload directly to Google Drive and open with Google Docs.
  </div>
  <div class="content">${lines.map(line => `<p>${line}</p>`).join('')}</div>
</body>
</html>`;
    return result;
  }

  private static async exportAsPdf(content: string, options: ExportOptions): Promise<void> {
    // For PDF export, we'll use the browser's print functionality
    // Create a temporary window with the content and trigger print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = this.toHtml(content, options);
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for the content to load, then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      throw new Error('Unable to open print window. Please check your popup blocker settings.');
    }
  }
}
