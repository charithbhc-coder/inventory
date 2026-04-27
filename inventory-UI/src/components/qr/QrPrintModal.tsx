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

    const W_MM = labelW, H_MM = labelH;
    // Render at 203 DPI (ZD230 native) so the image is crisp on the label printer
    const DPI = 203;
    const PX = (mm: number) => Math.round((mm / 25.4) * DPI);

    const W_PX = PX(W_MM);
    const H_PX = PX(H_MM);

    const out = document.createElement('canvas');
    out.width = W_PX;
    out.height = H_PX;
    const ctx = out.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W_PX, H_PX);

    const isSmall = H_MM <= 35 && W_MM >= H_MM;

    if (isSmall) {
      // Horizontal layout: QR left (20mm square, vertically centered) | divider | text right
      const PAD_PX = PX(2);
      const QR_PX = H_PX - PAD_PX * 2; // fill height minus 2mm top+bottom padding (~20mm)

      // Draw QR centred vertically
      const qrY = (H_PX - QR_PX) / 2;
      ctx.drawImage(qrCanvas, PAD_PX, qrY, QR_PX, QR_PX);

      // Divider line
      const divX = PAD_PX + QR_PX + PX(1.5);
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(divX, PAD_PX, 1, H_PX - PAD_PX * 2);

      // Text area
      const textX = divX + PX(1.5);
      const textW = W_PX - textX - PAD_PX;

      // "SCAN TO OPEN" hint
      ctx.fillStyle = '#aaaaaa';
      ctx.font = `${PX(2.8)}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillText('SCAN TO OPEN', textX, H_PX * 0.26);

      // Asset code — fit font to available width
      let codeFontSize = PX(4.5);
      ctx.font = `900 ${codeFontSize}px 'Courier New', monospace`;
      if (ctx.measureText(assetCode).width > textW) {
        codeFontSize = Math.floor(codeFontSize * textW / ctx.measureText(assetCode).width);
      }
      ctx.font = `900 ${codeFontSize}px 'Courier New', monospace`;
      ctx.fillStyle = '#000000';
      ctx.fillText(assetCode, textX, H_PX * 0.55);

      // Item name — fit font to available width
      const safeName = itemName.length > 24 ? itemName.substring(0, 24) + '…' : itemName;
      let nameFontSize = PX(3);
      ctx.font = `600 ${nameFontSize}px Arial`;
      if (ctx.measureText(safeName).width > textW) {
        nameFontSize = Math.floor(nameFontSize * textW / ctx.measureText(safeName).width);
      }
      ctx.font = `600 ${nameFontSize}px Arial`;
      ctx.fillStyle = '#444444';
      ctx.fillText(safeName, textX, H_PX * 0.80);

    } else {
      // Vertical layout: QR centred, text below
      const PAD_PX = PX(5);
      const QR_PX = Math.min(W_PX - PAD_PX * 2, PX(H_MM * 0.6));
      const qrX = (W_PX - QR_PX) / 2;

      ctx.drawImage(qrCanvas, qrX, PAD_PX, QR_PX, QR_PX);

      const baseY = PAD_PX + QR_PX + PX(3);
      ctx.fillStyle = '#aaaaaa';
      ctx.font = `${PX(3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('SCAN TO OPEN ASSET', W_PX / 2, baseY);

      ctx.fillStyle = '#000000';
      ctx.font = `900 ${PX(5)}px 'Courier New', monospace`;
      ctx.fillText(assetCode, W_PX / 2, baseY + PX(7));

      const safeName = itemName.length > 40 ? itemName.substring(0, 40) + '…' : itemName;
      ctx.fillStyle = '#444444';
      ctx.font = `600 ${PX(4)}px Arial`;
      ctx.fillText(safeName, W_PX / 2, baseY + PX(14));
    }

    const imgData = out.toDataURL('image/png');

    const printWin = window.open('', '_blank', 'width=400,height=300');
    if (!printWin) { alert('Allow pop-ups for this site to print QR labels.'); return; }

    printWin.document.write(`<!DOCTYPE html><html><head>
<title>Label – ${assetCode}</title>
<style>
  @page{size:${W_MM}mm ${H_MM}mm;margin:0}
  *{margin:0;padding:0}
  html,body{width:${W_MM}mm;height:${H_MM}mm;overflow:hidden;background:#fff}
  img{width:${W_MM}mm;height:${H_MM}mm;display:block}
</style></head>
<body>
  <img src="${imgData}" style="width:${W_MM}mm;height:${H_MM}mm"/>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
        setTimeout(function(){ window.close(); }, 600);
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
