import { format } from 'date-fns';

/**
 * Generates a human-readable, sortable barcode string.
 * Format: {CompanyCode}-{CategoryCode}-{YYYYMMDD}-{SEQ4}
 * Example: ACME-LAP-20250615-0042
 */
export function generateBarcodeString(
  companyCode: string,
  categoryCode: string,
  sequenceNumber: number,
): string {
  const date = format(new Date(), 'yyyyMMdd');
  const seq = String(sequenceNumber).padStart(4, '0');
  return `${companyCode.toUpperCase()}-${categoryCode.toUpperCase()}-${date}-${seq}`;
}

/**
 * Generates a printable barcode image as a PNG Buffer using bwip-js.
 * Returns a Buffer that can be sent as image/png or saved to storage.
 */
export async function generateBarcodeImage(barcodeStr: string): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const bwipjs = require('bwip-js');
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer(
      {
        bcid: 'code128',
        text: barcodeStr,
        scale: 4,              // Slightly larger for better detail
        height: 20,            // Doubled height for easier mobile lens focus
        includetext: true,
        textxalign: 'center',
        paddingwidth: 10,      // Add a clean white space around the bars
        paddingheight: 5,
        backgroundcolor: 'ffffff',
      },
      (err: Error, png: Buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(png);
        }
      },
    );
  });
}
