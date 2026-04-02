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

        // Add Barcode Image to PDF
        doc.image(barcodeBuffer, 5, 20, { width: 120 });
        doc.fontSize(6);
        doc.text(barcodeText, 5, 55, { width: 120, align: 'center' });

        // Generate QR code for deep link (PWA)
        const qrUrl = `https://ims.yourcompany.com/items/${barcodeText}`;
        const qrDataUrl = await qrcode.toDataURL(qrUrl, { margin: 1, width: 150 });
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        
        // Add QR code to the right side of the label
        doc.image(qrBuffer, 130, 20, { width: 45, height: 45 });

        // Timestamp / Date
        doc.fontSize(5);
        doc.text(`ID: ${item.id.substring(0, 8)}`, 5, 65);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
