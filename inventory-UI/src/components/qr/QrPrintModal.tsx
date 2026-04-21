import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Printer, Download } from 'lucide-react';

interface QrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  assetCode: string;
}

export default function QrPrintModal({ isOpen, onClose, itemId, itemName, assetCode }: QrPrintModalProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const deepLink = `${window.location.origin}/inventory/items/${itemId}`;

  const getCanvas = (): HTMLCanvasElement | null =>
    wrapperRef.current?.querySelector('canvas') ?? null;

  const handlePrint = () => {
    const canvas = getCanvas();
    if (!canvas) return;
    const qrDataUrl = canvas.toDataURL('image/png');

    const printWin = window.open('', '_blank', 'width=420,height=560');
    if (!printWin) { alert('Allow pop-ups for this site to print QR codes.'); return; }

    printWin.document.write(`<!DOCTYPE html><html><head>
<title>QR – ${assetCode}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;
    min-height:100vh;padding:24px;font-family:'Courier New',monospace;background:#fff}
  .card{border:3px solid #ffe053;border-radius:16px;padding:16px;
    display:flex;flex-direction:column;align-items:center;gap:8px;
    box-shadow:0 4px 20px rgba(0,0,0,.12)}
  img{width:220px;height:220px;display:block;image-rendering:pixelated}
  .code{font-size:13px;font-weight:900;color:#1b2d3e;letter-spacing:.1em}
  .name{font-size:11px;color:#555;margin-top:10px;text-align:center;max-width:260px;font-weight:600}
  @media print{body{padding:10px;justify-content:flex-start;padding-top:20px}}
</style></head>
<body>
  <div class="card">
    <img src="${qrDataUrl}" />
    <div class="code">${assetCode}</div>
  </div>
  <div class="name">${itemName}</div>
  <script>window.onload=()=>window.print();</script>
</body></html>`);
    printWin.document.close();
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, padding: 20 }}>
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
