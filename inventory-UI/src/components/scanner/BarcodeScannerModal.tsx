import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, CameraDevice } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw, Zap, SwitchCamera } from 'lucide-react';
import toast from 'react-hot-toast';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  const [isCameraStarted, setIsCameraStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);
  
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'reader-viewport';

  const stopScanner = useCallback(async () => {
    if (qrCodeRef.current && qrCodeRef.current.isScanning) {
      try { await qrCodeRef.current.stop(); } catch { /* ignore */ }
    }
  }, []);

  // 1. Fetch cameras once when modal opens
  useEffect(() => {
    let isMounted = true;
    
    if (isOpen) {
      Html5Qrcode.getCameras()
        .then(devices => {
          if (!isMounted) return;
          if (devices && devices.length > 0) {
            setCameras(devices);
            
            // Try to guess the back camera based on labels
            let defaultId = devices[0].id;
            for (const d of devices) {
              const lbl = d.label.toLowerCase();
              if (lbl.includes('back') || lbl.includes('rear') || lbl.includes('environment')) {
                defaultId = d.id;
                break;
              }
            }
            // Fallback: often the last camera is the back camera on Android
            if (defaultId === devices[0].id && devices.length > 1) {
              defaultId = devices[devices.length - 1].id;
            }
            
            setActiveCameraId(defaultId);
          } else {
            setError('No cameras found.');
          }
        })
        .catch(() => {
          if (isMounted) {
            setError('Camera access denied. Please allow camera permissions.');
            toast.error('Camera permission required.');
          }
        });
    } else {
      // Reset state on close
      setIsCameraStarted(false);
      setError(null);
      setScanned(null);
      setCameras([]);
      setActiveCameraId(null);
    }
    
    return () => { isMounted = false; };
  }, [isOpen]);

  // 2. Start scanner when activeCameraId is set or changed
  useEffect(() => {
    let isMounted = true;
    if (!isOpen || !activeCameraId) return;

    const startScanner = async () => {
      try {
        await stopScanner(); // clear any previous instance
        if (!isMounted) return;

        const html5QrCode = new Html5Qrcode(containerId, { 
          verbose: false,
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ] 
        });
        qrCodeRef.current = html5QrCode;

        const config = {
          fps: 30,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
          disableFlip: false,
          videoConstraints: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        };

        const handleScan = (text: string) => {
          if (!isMounted) return;
          
          // IMPORTANT: Do NOT call .stop() inside the scan callback. 
          // Pause prevents further scans while we show success, avoiding crashes.
          if (qrCodeRef.current?.isScanning) {
            try { qrCodeRef.current.pause(); } catch { /* ignore */ }
          }
          
          setScanned(text);
          setTimeout(() => { if (isMounted) onScan(text); }, 400); 
        };

        await html5QrCode.start(
          { deviceId: { exact: activeCameraId } },
          config,
          handleScan,
          () => { /* ignore */ }
        );

        if (isMounted) setIsCameraStarted(true);
        else await stopScanner();
      } catch (err) {
        if (isMounted) {
          console.error('Camera failed to start:', err);
          setError('Failed to start camera feed. It might be in use by another app.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, activeCameraId, onScan, stopScanner]);

  const handleFlipCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setIsCameraStarted(false); // briefly show loading ring
    setActiveCameraId(cameras[nextIndex].id);
  };

  if (!isOpen) return null;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={s.iconCircle}>
              <Camera size={20} color="var(--accent-yellow)" />
            </div>
            <div>
              <h3 style={s.title}>Asset Scanner</h3>
              <p style={s.subtitle}>Point camera at a QR code label</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {cameras.length > 1 && (
              <button onClick={handleFlipCamera} style={s.actionBtn} title="Switch Camera">
                <SwitchCamera size={18} />
              </button>
            )}
            <button onClick={onClose} style={s.actionBtn}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Camera Body */}
        <div style={s.body}>

          {/* Loading */}
          {!isCameraStarted && !error && !scanned && (
            <div style={s.centered}>
              <RefreshCw size={36} className="spin" color="var(--accent-yellow)" />
              <span style={{ marginTop: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 13 }}>
                {cameras.length === 0 ? 'Requesting Permissions...' : 'Starting Camera...'}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={s.centered}>
              <AlertCircle size={36} color="#ef4444" />
              <p style={{ marginTop: 14, textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 1.6 }}>
                {error}
              </p>
              {cameras.length > 1 && (
                <button onClick={handleFlipCamera} style={s.retryBtn}>Try Another Camera</button>
              )}
            </div>
          )}

          {/* Success Flash */}
          {scanned && (
            <div style={s.centered}>
              <div style={s.successRing}>
                <Zap size={32} color="#10b981" />
              </div>
              <span style={{ marginTop: 14, color: '#10b981', fontWeight: 700, fontSize: 14 }}>
                QR Code Detected!
              </span>
              <span style={{ marginTop: 6, color: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'monospace', maxWidth: 280, textAlign: 'center', wordBreak: 'break-all' }}>
                {scanned.length > 60 ? scanned.slice(0, 60) + '…' : scanned}
              </span>
            </div>
          )}

          {/* Camera viewport — hidden when not scanning */}
          <div
            id={containerId}
            style={{ ...s.reader, display: (isCameraStarted && !scanned && !error) ? 'block' : 'none' }}
          />

          {/* Scan frame overlay */}
          {isCameraStarted && !scanned && !error && (
            <div style={s.scanOverlay}>
              <div style={corner('topLeft')} />
              <div style={corner('topRight')} />
              <div style={corner('bottomLeft')} />
              <div style={corner('bottomRight')} />
              <div style={s.scanLine} />
            </div>
          )}
        </div>

        {/* Footer */}
        {isCameraStarted && !scanned && !error && (
          <div style={s.footer}>
            <div style={s.footerDot} />
            <span>Scanning for KTMG-VAULT asset QR codes</span>
          </div>
        )}
      </div>

      <style>{`
        #${containerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 0 !important;
        }
        #${containerId} img { display: none !important; }
        #${containerId} > div:last-child { display: none !important; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes scanMove {
          0%   { top: 6px;  opacity: 1; }
          46%  { top: calc(100% - 6px); opacity: 1; }
          50%  { opacity: 0; }
          52%  { top: 6px; opacity: 0; }
          56%  { opacity: 1; }
          100% { top: 6px; opacity: 1; }
        }
        @keyframes successPulse {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.12); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Corner bracket helper ────────────────────────────────────────────────────
const CORNER_BASE: React.CSSProperties = { position: 'absolute', width: 22, height: 22 };
const YELLOW = '3px solid var(--accent-yellow)';
const cornerMap: Record<string, React.CSSProperties> = {
  topLeft:     { top: 0, left: 0,    borderTop: YELLOW,    borderLeft: YELLOW,   borderRadius: '4px 0 0 0' },
  topRight:    { top: 0, right: 0,   borderTop: YELLOW,    borderRight: YELLOW,  borderRadius: '0 4px 0 0' },
  bottomLeft:  { bottom: 0, left: 0, borderBottom: YELLOW, borderLeft: YELLOW,   borderRadius: '0 0 0 4px' },
  bottomRight: { bottom: 0, right: 0,borderBottom: YELLOW, borderRight: YELLOW,  borderRadius: '0 0 4px 0' },
};
const corner = (pos: string): React.CSSProperties => ({ ...CORNER_BASE, ...cornerMap[pos] });

// ─── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.92)',
    backdropFilter: 'blur(12px)',
    zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%', maxWidth: 400,
    background: '#0f0f13',
    borderRadius: 24,
    overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 40px 100px rgba(0,0,0,0.9)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  header: {
    padding: '20px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 12,
    background: 'rgba(255,224,83,0.12)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(255,224,83,0.25)',
  },
  title:    { margin: 0, fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.2px' },
  subtitle: { margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 },
  actionBtn: {
    background: 'rgba(255,255,255,0.07)', border: 'none',
    width: 36, height: 36, borderRadius: 10,
    color: 'rgba(255,255,255,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  body: {
    position: 'relative',
    width: '100%', aspectRatio: '1',
    background: '#000', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  reader: {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
  },
  centered: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: 32, width: '100%',
  },
  scanOverlay: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 220, height: 220,
    pointerEvents: 'none',
  },
  scanLine: {
    position: 'absolute',
    left: 4, right: 4, top: 6, height: 2,
    background: 'linear-gradient(90deg, transparent, var(--accent-yellow), transparent)',
    borderRadius: 2,
    boxShadow: '0 0 8px var(--accent-yellow)',
    animation: 'scanMove 1.8s ease-in-out infinite',
  },
  footer: {
    padding: '12px 20px',
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  footerDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0,
  },
  retryBtn: {
    marginTop: 20, padding: '10px 24px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10, color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  },
  successRing: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'rgba(16,185,129,0.12)',
    border: '2px solid rgba(16,185,129,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    animation: 'successPulse 0.4s ease-out forwards',
  },
};
