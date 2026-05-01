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

    // --- Canvas layout at 203 DPI (ZD230 native) ---
    const DPI = 203;
    const PX = (mm: number) => Math.round((mm / 25.4) * DPI);

    const W_PX = PX(labelW);
    const H_PX = PX(labelH);
    const QR_PX  = PX(20);  // 2cm QR
    const PAD_PX = PX(2);   // 2mm padding
    const GAP_PX = PX(2);   // 2mm gap between QR and text

    const out = document.createElement('canvas');
    out.width  = W_PX;
    out.height = H_PX;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W_PX, H_PX);

    // QR: left side, vertically centred
    const qrX = PAD_PX;
    const qrY = Math.round((H_PX - QR_PX) / 2);
    ctx.drawImage(qrCanvas, qrX, qrY, QR_PX, QR_PX);

    // Text column: right of QR
    const textX = qrX + QR_PX + GAP_PX;
    const textW = W_PX - textX - PAD_PX;
    const midY  = H_PX / 2;

    // Asset ID — upper half, bold monospace
    // Use textW - PX(1.5) as target (1.5mm safety margin) because measureText()
    // is slightly inaccurate and the last char clips without it.
    let codeFontPx = PX(4.5);
    ctx.font = `bold ${codeFontPx}px 'Courier New', monospace`;
    while (ctx.measureText(assetCode).width > textW - PX(1.5) && codeFontPx > 8) {
      codeFontPx -= 1;
      ctx.font = `bold ${codeFontPx}px 'Courier New', monospace`;
    }
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.save();
    ctx.beginPath();
    ctx.rect(textX, 0, textW, midY);
    ctx.clip();
    ctx.fillText(assetCode, textX, midY - PX(1));
    ctx.restore();

    // Item name — lower half, regular sans-serif
    const safeName = itemName.length > 24 ? itemName.substring(0, 24) + '\u2026' : itemName;
    let nameFontPx = PX(3.5);
    ctx.font = `600 ${nameFontPx}px Arial`;
    while (ctx.measureText(safeName).width > textW - PX(1) && nameFontPx > 8) {
      nameFontPx -= 1;
      ctx.font = `600 ${nameFontPx}px Arial`;
    }
    ctx.fillStyle = '#444444';
    ctx.textBaseline = 'top';
    ctx.save();
    ctx.beginPath();
    ctx.rect(textX, midY, textW, H_PX - midY);
    ctx.clip();
    ctx.fillText(safeName, textX, midY + PX(1));
    ctx.restore();

    const imgData = out.toDataURL('image/png');

    // --- Off-screen iframe ---
    // IMPORTANT: use left:-9999px, NOT visibility:hidden without a left offset.
    // visibility:hidden at 0,0 placed a 50x25mm invisible block over the modal
    // and captured all mouse clicks, making the modal appear unresponsive.
    const existingFrame = document.getElementById('qr-print-frame');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'qr-print-frame';
    iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${labelW}mm;height:${labelH}mm;border:0;background:white`;
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // img at exact CSS mm = physical label size. Centering is baked into canvas.
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title></title><style>
  @page { margin: 0; }
  * { margin: 0; padding: 0; }
  body { background: #fff; }
  img {
    display: block;
    width: ${labelW}mm;
    height: ${labelH}mm;
    image-rendering: pixelated;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style></head><body>
  <img src="${imgData}" />
</body></html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
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
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          overflow: 'hidden',
          width: '100%',
          maxWidth: 420,
          border: '1px solid var(--border-dark)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 16px 14px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', borderBottom: '1px solid var(--border-dark)',
          position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1,
        }}>
          <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-main)' }}>
            Asset QR Code
          </span>
          <button onClick={onClose} style={{ background: 'var(--bg-dark)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* QR preview */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 0' }}>
          <div
            ref={wrapperRef}
            style={{
              background: '#fff', borderRadius: 14, padding: 12,
              border: '3px solid #ffe053',
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              maxWidth: '100%',
            }}
          >
            <QRCodeCanvas
              value={deepLink}
              size={Math.min(200, Math.max(140, window.innerWidth - 120))}
              marginSize={1}
              level="H"
              fgColor="#1b2d3e"
              bgColor="#ffffff"
            />
            <span style={{ fontSize: 11, fontWeight: 900, fontFamily: 'monospace', color: '#1b2d3e', letterSpacing: '0.08em', textAlign: 'center', wordBreak: 'break-all' }}>
              {assetCode}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 10, textAlign: 'center', padding: '0 8px' }}>
            {itemName}
          </div>
        </div>

        {/* Label size controls */}
        <div style={{ padding: '16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>
            Label Size
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {LABEL_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { setLabelW(p.w); setLabelH(p.h); }}
                style={{
                  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: '1px solid',
                  borderColor: labelW === p.w && labelH === p.h ? 'var(--accent-yellow)' : 'var(--border-dark)',
                  background: labelW === p.w && labelH === p.h ? 'rgba(255,224,83,0.12)' : 'transparent',
                  color: labelW === p.w && labelH === p.h ? 'var(--accent-yellow)' : 'var(--text-muted)',
                  minHeight: 32,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 100px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>W</span>
              <input
                type="number" value={labelW} onChange={e => setLabelW(Number(e.target.value))}
                style={{ flex: 1, padding: '7px 8px', borderRadius: 6, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', textAlign: 'center', fontSize: 13, minWidth: 60 }}
              />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 16, fontWeight: 300 }}>×</span>
            <div style={{ flex: '1 1 100px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>H</span>
              <input
                type="number" value={labelH} onChange={e => setLabelH(Number(e.target.value))}
                style={{ flex: 1, padding: '7px 8px', borderRadius: 6, border: '1px solid var(--border-dark)', background: 'var(--bg-dark)', color: 'var(--text-main)', textAlign: 'center', fontSize: 13, minWidth: 60 }}
              />
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>mm</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, padding: '0 16px 16px', flexWrap: 'wrap' }}>
          <button
            className="hover-card"
            onClick={handlePrint}
            style={{ flex: '1 1 120px', padding: '12px', borderRadius: 10, border: 'none', background: 'var(--text-main)', color: 'var(--bg-card)', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', minHeight: 44, transition: 'all 0.2s' }}
          >
            <Printer size={15} /> Print
          </button>
          <button
            className="hover-card"
            onClick={handleSave}
            style={{ flex: '1 1 120px', padding: '12px', borderRadius: 10, border: '2px solid var(--text-main)', background: 'transparent', color: 'var(--text-main)', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', minHeight: 44, transition: 'all 0.2s' }}
          >
            <Download size={15} /> Save PNG
          </button>
        </div>
      </div>
    </div>
  );
}