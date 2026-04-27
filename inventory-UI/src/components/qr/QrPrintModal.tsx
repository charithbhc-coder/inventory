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
    const canvas = getCanvas();
    if (!canvas) return;
    const qrDataUrl = canvas.toDataURL('image/png');
    const safeName = itemName.length > 32 ? itemName.substring(0, 32) + '…' : itemName;

    const W = labelW, H = labelH;
    const isSmall = H <= 35; // compact horizontal layout for small labels

    // For small labels (e.g. 50×25mm): QR left | code+name right
    // For larger labels / A4: centered QR with text below
    const bodyStyle = isSmall
      ? `display:flex;align-items:center;padding:1.5mm;gap:2mm;`
      : `display:flex;flex-direction:column;align-items:center;justify-content:center;padding:5mm;gap:3mm;`;

    const qrSizeMm = isSmall ? Math.min(H - 3, W * 0.42) : Math.min(W - 10, H * 0.65);
    const codePt   = isSmall ? 6.5  : 11;
    const namePt   = isSmall ? 5.5  : 9;
    const hintPt   = isSmall ? 4.5  : 7;

    const contentHtml = isSmall
      ? `<div class="qr" style="width:${qrSizeMm}mm;height:${qrSizeMm}mm;flex-shrink:0">
           <img src="${qrDataUrl}" style="width:100%;height:100%;display:block;image-rendering:crisp-edges"/>
         </div>
         <div style="width:.3mm;height:${qrSizeMm}mm;background:#ccc;flex-shrink:0"></div>
         <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:1mm;overflow:hidden">
           <div style="font-size:${hintPt}pt;color:#aaa;text-transform:uppercase;letter-spacing:.07em">Scan to open</div>
           <div style="font-size:${codePt}pt;font-weight:900;font-family:'Courier New',monospace;color:#000;letter-spacing:.03em;word-break:break-all;line-height:1.25">${assetCode}</div>
           <div style="font-size:${namePt}pt;color:#444;font-weight:600;line-height:1.3;word-break:break-word">${safeName}</div>
         </div>`
      : `<div style="width:${qrSizeMm}mm;height:${qrSizeMm}mm">
           <img src="${qrDataUrl}" style="width:100%;height:100%;display:block;image-rendering:crisp-edges"/>
         </div>
         <div style="font-size:${hintPt}pt;color:#aaa;text-transform:uppercase;letter-spacing:.1em">Scan to open asset</div>
         <div style="font-size:${codePt}pt;font-weight:900;font-family:'Courier New',monospace;color:#000;letter-spacing:.05em;text-align:center">${assetCode}</div>
         <div style="font-size:${namePt}pt;color:#444;font-weight:600;text-align:center;max-width:${W - 10}mm">${safeName}</div>`;

    const printWin = window.open('', '_blank', 'width=400,height=300');
    if (!printWin) { alert('Allow pop-ups for this site to print QR labels.'); return; }

    printWin.document.write(`<!DOCTYPE html><html><head>
<title>Label – ${assetCode}</title>
<style>
  @page{size:${W}mm ${H}mm;margin:0!important}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}mm;height:${H}mm;overflow:hidden;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{${bodyStyle}font-family:Arial,sans-serif;}
  @media print{html,body{width:${W}mm;height:${H}mm}}
</style></head>
<body>
  ${contentHtml}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
        setTimeout(function(){ window.close(); }, 500);
      }, 200);
    };
  </script>
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
