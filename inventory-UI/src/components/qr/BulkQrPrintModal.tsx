import { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Printer } from 'lucide-react';

const LABEL_PRESETS = [
  { label: 'ZD230 50×25mm', w: 50, h: 25 },
  { label: '62×29mm', w: 62, h: 29 },
  { label: '100×50mm', w: 100, h: 50 },
  { label: 'A4 (Grid)', w: 210, h: 297, isGrid: true },
];

interface BulkQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{ id: string; name: string; barcode: string }>;
  title?: string;
}

export default function BulkQrPrintModal({ isOpen, onClose, items, title = 'Bulk Asset QR Codes' }: BulkQrPrintModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [labelW, setLabelW] = useState(50);
  const [labelH, setLabelH] = useState(25);
  const [isGrid, setIsGrid] = useState(false);

  useEffect(() => {
    const preset = LABEL_PRESETS.find(p => p.w === labelW && p.h === labelH);
    setIsGrid(!!preset?.isGrid);
  }, [labelW, labelH]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (!containerRef.current) return;
    
    // Find all rendered QR canvases
    const canvases = Array.from(containerRef.current.querySelectorAll('canvas'));
    if (!canvases.length) return;

    const DPI = 203;
    const PX = (mm: number) => Math.round((mm / 25.4) * DPI);

    const W_PX = isGrid ? PX(50) : PX(labelW);
    const H_PX = isGrid ? PX(25) : PX(labelH);
    const QR_PX  = PX(20);
    const PAD_PX = PX(2);
    const GAP_PX = PX(2);

    const imgDatas = items.map((item, index) => {
      const qrCanvas = canvases[index];
      if (!qrCanvas) return null;

      const out = document.createElement('canvas');
      out.width  = W_PX;
      out.height = H_PX;
      const ctx = out.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W_PX, H_PX);

      const qrX = PAD_PX;
      const qrY = Math.round((H_PX - QR_PX) / 2);
      ctx.drawImage(qrCanvas, qrX, qrY, QR_PX, QR_PX);

      const textX = qrX + QR_PX + GAP_PX;
      const textW = W_PX - textX - PAD_PX;
      const midY  = H_PX / 2;

      let codeFontPx = PX(4.5);
      ctx.font = `bold ${codeFontPx}px 'Courier New', monospace`;
      while (ctx.measureText(item.barcode).width > textW - PX(1.5) && codeFontPx > 8) {
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
      ctx.fillText(item.barcode, textX, midY - PX(1));
      ctx.restore();

      const safeName = item.name.length > 24 ? item.name.substring(0, 24) + '\u2026' : item.name;
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

      return out.toDataURL('image/png');
    }).filter(Boolean);

    const existingFrame = document.getElementById('qr-print-frame');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'qr-print-frame';
    iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${labelW}mm;height:${labelH}mm;border:0;background:white`;
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    let bodyContent = '';
    
    if (isGrid) {
      bodyContent = `
        <div class="grid-container">
          ${imgDatas.map(src => `<div class="grid-item"><img src="${src}" /></div>`).join('')}
        </div>
      `;
    } else {
      bodyContent = imgDatas.map(src => `<div class="page"><img src="${src}" /></div>`).join('');
    }

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title></title><style>
  @page { margin: ${isGrid ? '10mm' : '0'}; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #fff; }
  
  .page {
    page-break-after: always;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
  }
  
  .page img {
    display: block;
    width: ${labelW}mm;
    height: ${labelH}mm;
    image-rendering: pixelated;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .grid-container {
    display: flex;
    flex-wrap: wrap;
    gap: 2mm;
  }
  
  .grid-item {
    border: 1px dashed #ccc;
    padding: 1mm;
  }
  
  .grid-item img {
    display: block;
    width: 50mm;
    height: 25mm;
    image-rendering: pixelated;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
</style></head><body>${bodyContent}</body></html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 2000);
    }, 500);
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
          background: 'var(--bg-card)', borderRadius: 20, overflow: 'hidden',
          width: '100%', maxWidth: 500, border: '1px solid var(--border-dark)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 32px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 16px 14px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', borderBottom: '1px solid var(--border-dark)', flexShrink: 0
        }}>
          <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-main)' }}>
            {title} ({items.length} items)
          </span>
          <button onClick={onClose} style={{ background: 'var(--bg-dark)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* Hidden QRs container to generate canvases */}
        <div ref={containerRef} style={{ display: 'none' }}>
          {items.map(item => (
            <QRCodeCanvas
              key={item.id}
              value={`${window.location.origin}/inventory/items/${item.id}`}
              size={200}
              marginSize={1}
              level="H"
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 16px', overflowY: 'auto' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, textAlign: 'center', fontWeight: 500 }}>
            You are about to print QR codes for <strong>{items.length}</strong> assets.
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.08em' }}>
            Label Format
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {LABEL_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => { setLabelW(p.w); setLabelH(p.h); setIsGrid(!!p.isGrid); }}
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
          
          {!isGrid && (
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
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, padding: '16px', borderTop: '1px solid var(--border-dark)', background: 'var(--bg-sidebar)' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Printer size={16} /> Print All
          </button>
        </div>
      </div>
    </div>
  );
}
