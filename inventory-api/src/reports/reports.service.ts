import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ExcelGenerator } from './generators/excel.generator';
import { PdfGenerator } from './generators/pdf.generator';

@Injectable()
export class ReportsService {
  constructor(
    private dataSource: DataSource,
    private excelGenerator: ExcelGenerator,
    private pdfGenerator: PdfGenerator,
  ) {}

  // 1. Fetch Data
  async getGlobalAssetRegisterData() {
    const query = `
      SELECT 
        i.barcode,
        i.name as "itemName",
        c.name as "companyName",
        cat.name as "categoryName",
        i.status,
        i.condition,
        i."purchasePrice",
        TO_CHAR(i."purchaseDate", 'YYYY-MM-DD') as "purchaseDate"
      FROM items i
      JOIN companies c ON c.id = i."companyId"
      JOIN item_categories cat ON cat.id = i."categoryId"
      ORDER BY c.name, i.barcode
    `;
    return this.dataSource.query(query);
  }

  // 2. Generate Excel
  async exportGlobalAssetRegisterExcel(): Promise<Buffer> {
    const data = await this.getGlobalAssetRegisterData();
    const columns = [
      { header: 'Barcode', key: 'barcode', width: 25 },
      { header: 'Item Name', key: 'itemName', width: 30 },
      { header: 'Company', key: 'companyName', width: 25 },
      { header: 'Category', key: 'categoryName', width: 20 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Condition', key: 'condition', width: 15 },
      { header: 'Price', key: 'purchasePrice', width: 15 },
      { header: 'Date', key: 'purchaseDate', width: 15 },
    ];
    return this.excelGenerator.generateBuffer(data, columns, 'Global Assets');
  }

  // 3. Generate PDF
  async exportGlobalAssetRegisterPdf(): Promise<Buffer> {
    const data = await this.getGlobalAssetRegisterData();
    
    let tableRows = '';
    data.forEach((row: any) => {
      tableRows += `
        <tr>
          <td>${row.barcode}</td>
          <td>${row.itemName}</td>
          <td>${row.companyName}</td>
          <td>${row.status}</td>
          <td>$${row.purchasePrice || '0.00'}</td>
        </tr>
      `;
    });

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Name</th>
            <th>Company</th>
            <th>Status</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    const fullHtml = this.pdfGenerator.buildReportHtmlWrapper('Global Asset Register', tableHtml);
    return this.pdfGenerator.generatePdfFromHtml(fullHtml);
  }
}
