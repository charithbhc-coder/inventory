import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  const [isCameraStarted, setIsCameraStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = "reader-viewport";

  useEffect(() => {
    if (isOpen) {
      // Snapshot the onScan function to avoid dependency issues during the async start
      const handleScan = (text: string) => {
        if (qrCodeRef.current && qrCodeRef.current.isScanning) {
          qrCodeRef.current.stop().then(() => {
            onScan(text);
          }).catch(() => {
            onScan(text);
          });
        }
      };

      // Shorter delay for faster responsiveness
      const timer = setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode(containerId);
          qrCodeRef.current = html5QrCode;

          const config = {
            fps: 24, // Higher FPS for faster movement tracking
            qrbox: { width: 280, height: 180 }, // Rectangle optimized for barcodes
            aspectRatio: 1.0,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
            ]
          };

          await html5QrCode.start(
            { 
              facingMode: "environment"
            },
            config,
            handleScan,
            () => { /* Parse error, ignore */ }
          );
          setIsCameraStarted(true);
        } catch (err: any) {
          console.error("Failed to start camera", err);
          setError("Camera access denied or mapping failed. Please check permissions.");
          toast.error("Camera permission is required for scanning.");
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (qrCodeRef.current && qrCodeRef.current.isScanning) {
          qrCodeRef.current.stop().catch(err => console.error("Error stopping scanner", err));
        }
      };
    } else {
      setIsCameraStarted(false);
      setError(null);
    }
  }, [isOpen]); // Only re-run when isOpen changes

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.iconCircle}>
              <Camera size={20} color="var(--accent-yellow)" />
            </div>
            <div>
              <h3 style={styles.title}>Asset Scanner</h3>
              <p style={styles.subtitle}>Center the barcode in the highlight area</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={24} />
          </button>
        </div>

        <div style={styles.body}>
          {!isCameraStarted && !error && (
            <div style={styles.loadingContainer}>
              <RefreshCw size={40} className="spin" color="var(--accent-yellow)" />
              <span style={{ marginTop: 16, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Connecting Camera...</span>
            </div>
          )}

          {error && (
            <div style={styles.errorContainer}>
              <AlertCircle size={40} color="var(--accent-red)" />
              <p style={{ marginTop: 16, textAlign: 'center' }}>{error}</p>
              <button 
                onClick={onClose} 
                className="outline-btn" 
                style={{ marginTop: 20, color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                Go Back
              </button>
            </div>
          )}
          
          <div 
            id={containerId} 
            style={{ 
              ...styles.reader, 
              display: (isCameraStarted && !error) ? 'block' : 'none' 
            }}
          ></div>

          {isCameraStarted && (
            <div style={styles.scanOverlay}>
              <div style={styles.scanFrame}></div>
              <div style={styles.hint}>
                <AlertCircle size={16} />
                <span>Move closer to focus better</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        #${containerId} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 20px !important;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.95)',
    backdropFilter: 'blur(15px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    width: 44,
    height: 44,
    borderRadius: 14,
    color: 'rgba(255,255,255,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modal: {
    width: '100%',
    maxWidth: 480,
    background: 'var(--bg-surface)',
    borderRadius: 32,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 30px 100px rgba(0,0,0,1)',
    border: '1px solid rgba(255,255,255,0.08)',
    margin: 'auto 0', // Crucial for vertical centering
  },
  header: {
    padding: '28px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: 'rgba(255, 224, 83, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 224, 83, 0.3)',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 500,
  },
  body: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    minHeight: 380, // Slightly taller for more room
    justifyContent: 'center',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: 'var(--text-muted)',
    padding: '0 20px',
  },
  reader: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 24,
    overflow: 'hidden',
    background: '#000',
    boxShadow: 'inset 0 0 40px rgba(0,0,0,1)',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  scanOverlay: {
    position: 'absolute',
    inset: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  scanFrame: {
    width: 280,
    height: 180,
    border: '2px solid var(--accent-yellow)',
    borderRadius: 20,
    boxShadow: '0 0 0 2000px rgba(0,0,0,0.5)', // Darker shroud
    position: 'relative',
    transition: 'all 0.3s ease',
  },
  hint: {
    position: 'absolute',
    bottom: 20,
    padding: '12px 20px',
    background: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: 50,
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    border: '1px solid rgba(255,255,255,0.2)',
    boxShadow: '0 5px 20px rgba(0,0,0,0.3)',
  }
};
