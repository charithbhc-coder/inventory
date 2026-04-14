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
          size: [2.5 * 72, 1 * 72], // Dymo/Zebra 2.5" x 1"
          margin: 0,
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Item Name and Category
        doc.fontSize(8);
        doc.text(item.name || 'Unknown Item', 5, 5, { width: 170 });
        
        // Generate Barcode
        const barcodeText = item.barcode || item.id.substring(0, 12);
        const barcodeBuffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: barcodeText,
          scale: 3,
          height: 10,
          includetext: false,
        });

        // Add Barcode Image to PDF - Expanded to utilize full width
        doc.image(barcodeBuffer, 5, 20, { width: 170 });
        doc.fontSize(7);
        doc.text(barcodeText, 5, 50, { width: 170, align: 'center' });

        // Timestamp / Date / ID
        doc.fontSize(6);
        doc.text(`Internal ID: ${item.id.substring(0, 12)}`, 5, 62);
        doc.text(`Category: ${item.category?.name || 'N/A'}`, 100, 62, { align: 'right' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
