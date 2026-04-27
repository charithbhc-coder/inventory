import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Printer, Download } from 'lucide-react';

const LABEL_PRESETS = [
  { label: 'ZD230 50×25mm', w: 50, h: 25 },
  { label: '62×29mm', w: 62, h: 29 },
  { label: '100×50mm', w: 100, h: 50 },
  { label: 'A4', w: 210, h: 297 },
];

interface QrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  assetCode: string;
}

export default function QrPrintModal({ isOpen, onClose, itemId, itemName, assetCode }: QrPrintModalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [labelW, setLabelW] = useState(50);
  const [labelH, setLabelH] = useState(25);

  if (!isOpen) return null;

  const deepLink = `${window.location.origin}/inventory/items/${itemId}`;

  const getCanvas = (): HTMLCanvasElement | null =>
    wrapperRef.current?.querySelector('canvas') ?? null;

  const handlePrint = () => {
    const qrCanvas = getCanvas();
    if (!qrCanvas) return;

    const imgData = qrCanvas.toDataURL('image/png');

    const existingFrame = document.getElementById('qr-print-frame');
    if (existingFrame) existingFrame.remove();

    // Create a hidden iframe for the print job
    const iframe = document.createElement('iframe');
    iframe.id = 'qr-print-frame';
    // Match the iframe container to the sticker dimensions
    iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${labelW}mm;height:${labelH}mm;border:0;background:white`;
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print QR</title>
        <style>
          /* 1. Tell the printer driver the exact size of the physical sticker */
          @page { 
            size: ${labelW}mm ${labelH}mm; 
            margin: 0; 
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          html, body { 
            width: ${labelW}mm; 
            height: ${labelH}mm; 
            background: #fff; 
            overflow: hidden; 
            display: flex;
            justify-content: center;
            align-items: center;
          }

          img {
            /* 2. Force the QR to be exactly 2cm x 2cm */
            width: 20mm; 
            height: 20mm;
            display: block;
            /* 3. Ensures crisp edges on thermal printers (preventing blur) */
            image-rendering: pixelated; 
            -webkit-print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        <img src="${imgData}" />
      </body>
      </html>
    `);
    doc.close();

    // Small delay to allow the browser to render the image in the iframe
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      // Remove frame after print dialog is closed
      setTimeout(() => iframe.remove(), 2000);
    }, 500);
  };

  const handleSave = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    const PADDING = 20;
    const CODE_H = 30;
    const TOTAL_TEXT_H = CODE_H;

    const out = document.createElement('canvas');
    out.width = canvas.width + (PADDING * 2);
    out.height = canvas.height + TOTAL_TEXT_H + PADDING;

    const ctx = out.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, PADDING, PADDING);

    ctx.fillStyle = '#1b2d3e';
    const fontSize = Math.max(14, Math.floor(canvas.width / 14));
    ctx.font = `900 ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = '1px';
    ctx.fillText(assetCode, out.width / 2, canvas.height + PADDING + (CODE_H * 0.75));

    const link = document.createElement('a');
    link.download = `qr-${assetCode}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#121212', // Replacing var for standalone stability
          borderRadius: 24, overflow: 'hidden',
          width: '100%', maxWidth: 360,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#fff' }}>
            Asset QR Code
          </span>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, width: 32, height: 32, color: '#999', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* QR preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 24px 0' }}>
          <div
            ref={wrapperRef}
            style={{
              background: '#fff', borderRadius: 16, padding: 16,
              border: '3px solid #ffe053',
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            <QRCodeCanvas
              value={deepLink}
              size={200}
              marginSize={1}
              level="H"
              fgColor="#1b2d3e"
              bgColor="#ffffff"
            />
            <span style={{ fontSize: 12, fontWeight: 900, fontFamily: 'monospace', color: '#1b2d3e', letterSpacing: '0.1em' }}>
              {assetCode}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#999', fontWeight: 600, marginTop: 12, textAlign: 'center' }}>
            {itemName}
          </div>
        </div>

        {/* Label size controls */}
        <div style={{ padding: '20px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: '#999', marginBottom: 8 }}>
            Label Size
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {LABEL_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { setLabelW(p.w); setLabelH(p.h); }}
                style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: '1px solid',
                  borderColor: labelW === p.w && labelH === p.h ? '#ffe053' : 'rgba(255,255,255,0.1)',
                  background: labelW === p.w && labelH === p.h ? 'rgba(255,224,83,0.12)' : 'transparent',
                  color: labelW === p.w && labelH === p.h ? '#ffe053' : '#999',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number" value={labelW} onChange={e => setLabelW(Number(e.target.value))}
              style={{ flex: 1, padding: '5px', borderRadius: 6, border: '1px solid #333', background: '#000', color: '#fff', textAlign: 'center' }}
            />
            <span style={{ color: '#666' }}>×</span>
            <input
              type="number" value={labelH} onChange={e => setLabelH(Number(e.target.value))}
              style={{ flex: 1, padding: '5px', borderRadius: 6, border: '1px solid #333', background: '#000', color: '#fff', textAlign: 'center' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px' }}>
          <button
            onClick={handlePrint}
            style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#1b2d3e', color: '#ffe053', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
          >
            <Printer size={15} /> Print
          </button>
          <button
            onClick={handleSave}
            style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(255,224,83,0.25)', background: 'rgba(255,224,83,0.08)', color: '#ffe053', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}
          >
            <Download size={15} /> Save PNG
          </button>
        </div>
      </div>
    </div>
  );
}