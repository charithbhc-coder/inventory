import { Injectable } from '@nestjs/common';
import { Item } from '../items/entities/item.entity';
import PDFDocument from 'pdfkit';
import * as qrcode from 'qrcode';

@Injectable()
export class LabelsService {

  async generateItemLabel(item: Item): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // 2" x 2" square label — QR-only, optimised for small-size printing
        const W = 2 * 72;   // 144pt
        const H = 2 * 72;   // 144pt
        const PADDING = 6;
        const QR_SIZE = 104;

        const doc = new PDFDocument({ size: [W, H], margin: 0 });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        const assetCode = item.barcode || item.id.substring(0, 12);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173/inventory';
        const deepLink = `${frontendUrl}/items/${item.id}`;

        // Item name
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text(item.name || 'Unknown Item', PADDING, PADDING, {
          width: W - PADDING * 2,
          height: 14,
          ellipsis: true,
          align: 'center',
        });

        // Category (small, below name)
        if (item.category?.name) {
          doc.font('Helvetica').fontSize(6);
          doc.fillColor('#666666');
          doc.text(item.category.name, PADDING, PADDING + 12, { width: W - PADDING * 2, align: 'center' });
          doc.fillColor('#000000');
        }

        // QR code rendered at 3× then scaled down for crisp output
        const qrBuffer = await qrcode.toBuffer(deepLink, {
          type: 'png',
          width: QR_SIZE * 3,
          margin: 1,
          errorCorrectionLevel: 'H',
        });

        const qrX = (W - QR_SIZE) / 2;
        doc.image(qrBuffer, qrX, 22, { width: QR_SIZE, height: QR_SIZE });

        // Asset code
        doc.font('Helvetica-Bold').fontSize(7);
        doc.text(assetCode, PADDING, H - 14, { width: W - PADDING * 2, align: 'center' });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
