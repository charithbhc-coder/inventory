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
        // 3.2" x 1" landscape — wider to fit barcode + QR side-by-side
        const W = 3.2 * 72; // 230pt
        const H = 1 * 72;   // 72pt
        const QR_SIZE = 52;
        const QR_X = W - QR_SIZE - 4;

        const doc = new PDFDocument({ size: [W, H], margin: 0 });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const barcodeText = item.barcode || item.id.substring(0, 12);
        const barcodeWidth = QR_X - 10;

        // Item Name
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text(item.name || 'Unknown Item', 5, 8, { width: barcodeWidth, ellipsis: true });

        // Barcode image
        const barcodeBuffer = await bwipjs.toBuffer({
          bcid: 'code128',
          text: barcodeText,
          scale: 4,
          height: 12,
          includetext: false,
        });
        doc.image(barcodeBuffer, 5, 22, { width: barcodeWidth });

        // Barcode text
        doc.font('Helvetica').fontSize(7);
        doc.text(barcodeText, 5, 48, { width: barcodeWidth, align: 'center' });

        // Footer
        doc.fontSize(6);
        doc.text(`ID: ${item.id.substring(0, 8)}`, 5, 60);
        doc.text(item.category?.name || '', QR_X - 40, 60, { width: 40, align: 'right' });

        // QR code — encodes deep link URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173/inventory';
        const deepLink = `${frontendUrl}/items/${item.id}`;
        const qrBuffer = await qrcode.toBuffer(deepLink, { type: 'png', width: QR_SIZE * 2, margin: 1 });
        doc.image(qrBuffer, QR_X, 4, { width: QR_SIZE, height: QR_SIZE });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
