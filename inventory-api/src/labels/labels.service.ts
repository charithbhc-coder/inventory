import { Injectable } from '@nestjs/common';
import { Item } from '../items/entities/item.entity';
import * as bwipjs from 'bwip-js';
import PDFDocument from 'pdfkit';
import * as qrcode from 'qrcode';

@Injectable()
export class LabelsService {

  async generateItemLabel(item: Item): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: [2.5 * 72, 1 * 72], // 180pt x 72pt (2.5" x 1" landscape label)
          margin: 0,
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Item Name
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text(item.name || 'Unknown Item', 5, 8, { width: 170, ellipsis: true });
        
        // Generate Barcode
        const barcodeText = item.barcode || item.id.substring(0, 12);
        const barcodeBuffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: barcodeText,
          scale: 4,              // Higher scale for sharpness
          height: 12,            // Slightly taller bars
          includetext: false,
        });

        // Add Barcode Image to PDF - Center it vertically/horizontally
        // Y=22 (after 9pt font + padding)
        doc.image(barcodeBuffer, 5, 22, { width: 170 });
        
        // Barcode Text (centered)
        doc.font('Helvetica').fontSize(7);
        doc.text(barcodeText, 5, 48, { width: 170, align: 'center' });

        // Metadata Footer
        doc.fontSize(6);
        doc.text(`Internal ID: ${item.id.substring(0, 12)}`, 5, 60);
        doc.text(`Category: ${item.category?.name || 'N/A'}`, 100, 60, { width: 75, align: 'right' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
