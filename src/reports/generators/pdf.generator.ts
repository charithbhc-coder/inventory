import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfGenerator {
  private readonly logger = new Logger(PdfGenerator.name);

  async generatePdfFromHtml(htmlContent: string): Promise<Buffer> {
    const t0 = Date.now();
    this.logger.debug('Launching Puppeteer instance...');
    
    // Use --no-sandbox to avoid issues in some environments (like Docker if added later)
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      
      // We set the content with wait until network idle to ensure fonts/images load if any
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Generate the PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          bottom: '20px',
          left: '20px',
          right: '20px',
        },
      });

      this.logger.debug(`PDF generated in ${Date.now() - t0}ms`);
      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  // Example minimal layout wrapper
  buildReportHtmlWrapper(title: string, tableHtml: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; }
          h1 { color: #1677ff; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px; }
          .timestamp { color: #888; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th, td { border: 1px solid #f0f0f0; padding: 8px 12px; text-align: left; }
          th { background-color: #fafafa; font-weight: bold; }
          tr:nth-child(even) { background-color: #fafafa; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>
        ${tableHtml}
      </body>
      </html>
    `;
  }
}
