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

    // Give the iframe real pixel dimensions (off-screen) so the browser
    // actually renders its contents. width:0/hidden iframes are never painted.
    const iframe = document.createElement('iframe');
    iframe.id = 'qr-print-frame';
    iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${labelW}mm;height:${labelH}mm;border:0;background:white`;
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    // Absolute centering works in all print contexts.
    // No @page size override: let the ZD230 Windows driver control the label dimensions.
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><title></title>
<style>
  @page { margin: 0; }
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  img {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    display: block;
  }
</style>
</head><body>
  <img src="${imgData}" />
</body></html>`);
    doc.close();

    // 500ms lets the browser fully paint the iframe before print() fires.
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1500);
    }, 500);
  };


  const handleSave = () => {
    const canvas = getCanvas();
    if (!canvas) return;

    // We'll create a larger canvas to fit the QR + the label below it
    const PADDING = 20;
    const CODE_H = 30; // Height for the asset code text area
    const TOTAL_TEXT_H = CODE_H;

    const out = document.createElement('canvas');
    out.width = canvas.width + (PADDING * 2);
    out.height = canvas.height + TOTAL_TEXT_H + PADDING;

    const ctx = out.getContext('2d')!;

    // 1. Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);

    // 2. Draw QR Code (centered)
    ctx.drawImage(canvas, PADDING, PADDING);

    // 3. Draw Asset Code
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
          background: 'var(--bg-surface)', borderRadius: 24, overflow: 'hidden',
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
          <span style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-main)' }}>
            Asset QR Code
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
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
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 12, textAlign: 'center' }}>
            {itemName}
          </div>
        </div>

        {/* Label size controls */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Label Size
          </div>
          {/* Presets */}
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
                  color: labelW === p.w && labelH === p.h ? '#ffe053' : 'var(--text-muted)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Custom inputs */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>W mm</span>
              <input
                type="number" min={20} max={300} value={labelW}
                onChange={e => setLabelW(Number(e.target.value))}
                style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'var(--search-bg)', color: 'var(--text-main)', fontSize: 12, outline: 'none', textAlign: 'center' }}
              />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>×</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>H mm</span>
              <input
                type="number" min={15} max={300} value={labelH}
                onChange={e => setLabelH(Number(e.target.value))}
                style={{ width: '100%', padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'var(--search-bg)', color: 'var(--text-main)', fontSize: 12, outline: 'none', textAlign: 'center' }}
              />
            </div>
          </div>
        </div>

        {/* Print tip */}
        <div style={{ margin: '0 20px 12px', padding: '8px 12px', borderRadius: 8, background: 'rgba(255,224,83,0.07)', border: '1px solid rgba(255,224,83,0.18)' }}>
          <p style={{ fontSize: 10, color: 'rgba(255,224,83,0.8)', fontWeight: 700, margin: 0, lineHeight: 1.5 }}>
            In the print dialog: select <b>ZD230</b> as printer, then under <b>More settings</b> uncheck <b>Headers and footers</b>.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, padding: '0 20px 20px' }}>
          <button
            onClick={handlePrint}
            style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              background: '#1b2d3e', color: '#ffe053',
              fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, cursor: 'pointer',
            }}
          >
            <Printer size={15} /> Print
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: '1px solid rgba(255,224,83,0.25)',
              background: 'rgba(255,224,83,0.08)', color: '#ffe053',
              fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8, cursor: 'pointer',
            }}
          >
            <Download size={15} /> Save PNG
          </button>
        </div>
      </div>
    </div>
  );
}
