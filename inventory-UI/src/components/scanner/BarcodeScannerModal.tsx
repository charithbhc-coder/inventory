import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export default function BarcodeScannerModal({ isOpen, onClose, onScan }: BarcodeScannerModalProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the DOM element is ready
      const timer = setTimeout(() => {
        const scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            formatsToSupport: [ 
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8
            ],
            videoConstraints: {
              facingMode: "environment"
            }
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            scanner.clear().then(() => {
              onScan(decodedText);
            });
          },
          (/* errorMessage */) => {
            // parse error, ignore for now
          }
        );
        scannerRef.current = scanner;
      }, 300);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
        }
      };
    }
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Camera size={20} color="var(--accent-yellow)" />
            <h3 style={styles.title}>Scan Barcode</h3>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              ...styles.closeBtn, 
              width: 48, height: 48, 
              background: 'var(--accent-red)', 
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}
          >
            <X size={28} />
          </button>
        </div>

        <div style={styles.body}>
          <div id="reader" style={styles.reader}></div>
          
          <div style={styles.hint}>
            <AlertCircle size={16} />
            <span>Position the barcode or QR code within the frame to scan.</span>
          </div>
        </div>
      </div>

      <style>{`
        #reader {
          border: none !important;
          background: #000 !important;
        }
        #reader__dashboard_section_csr button {
          background: var(--accent-yellow) !important;
          color: #000 !important;
          border: none !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          font-size: 11px !important;
          cursor: pointer !important;
          margin-top: 10px !important;
        }
        #reader__scan_region {
           background: #000 !important;
        }
        #reader__status_span {
          color: #fff !important;
          font-size: 12px !important;
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    backdropFilter: 'blur(10px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 500,
    background: 'var(--bg-surface)',
    borderRadius: 24,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
  },
  header: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--border-dark)',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: '#fff',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    color: '#fff',
    width: 40,
    height: 40,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  body: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: '#0a0a0a',
  },
  reader: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  hint: {
    marginTop: 20,
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  }
};
