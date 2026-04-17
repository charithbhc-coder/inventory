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
      // Small delay to ensure the DOM element is ready
      const timer = setTimeout(async () => {
        try {
          const html5QrCode = new Html5Qrcode(containerId);
          qrCodeRef.current = html5QrCode;

          const config = {
            fps: 15,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8
            ]
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              // Success! Stop and return
              html5QrCode.stop().then(() => {
                onScan(decodedText);
              }).catch(() => {
                onScan(decodedText);
              });
            },
            () => {
              // Parse error, ignore
            }
          );
          setIsCameraStarted(true);
        } catch (err: any) {
          console.error("Failed to start camera", err);
          setError("Camera access denied or mapping failed. Please check permissions.");
          toast.error("Camera permission is required for scanning.");
        }
      }, 500);

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
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      {/* Absolute Close Button for easiest access on mobile */}
      <button 
        onClick={onClose} 
        style={styles.floatingClose}
        title="Close Camera"
      >
        <X size={32} />
      </button>

      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={styles.iconCircle}>
              <Camera size={20} color="var(--accent-yellow)" />
            </div>
            <div>
              <h3 style={styles.title}>Asset Scanner</h3>
              <p style={styles.subtitle}>Point at a barcode or QR code</p>
            </div>
          </div>
        </div>

        <div style={styles.body}>
          {!isCameraStarted && !error && (
            <div style={styles.loadingContainer}>
              <RefreshCw size={40} className="spin" color="var(--accent-yellow)" />
              <span style={{ marginTop: 16, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Initializing Camera...</span>
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
                <span>Keep the code within the frame</span>
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
    padding: '20px',
  },
  floatingClose: {
    position: 'absolute',
    top: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.9)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 10001,
    boxShadow: '0 10px 30px rgba(239, 68, 68, 0.4)',
    transition: 'transform 0.2s',
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    background: 'var(--bg-surface)',
    borderRadius: 32,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  header: {
    padding: '24px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: 'rgba(255, 224, 83, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 224, 83, 0.2)',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: '2px 0 0',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 500,
  },
  body: {
    padding: '12px 24px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    minHeight: 350,
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
    borderRadius: 20,
    overflow: 'hidden',
    background: '#000',
    boxShadow: 'inset 0 0 20px rgba(0,0,0,1)',
  },
  scanOverlay: {
    position: 'absolute',
    top: 12,
    left: 24,
    right: 24,
    bottom: 32,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  scanFrame: {
    width: 250,
    height: 250,
    border: '2px solid var(--accent-yellow)',
    borderRadius: 24,
    boxShadow: '0 0 0 1000px rgba(0,0,0,0.3)',
    position: 'relative',
  },
  hint: {
    position: 'absolute',
    bottom: 20,
    padding: '10px 16px',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: 50,
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid rgba(255,255,255,0.1)',
  }
};
