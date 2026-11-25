import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { decodeQrContent } from '../lib/db';

export interface QRScanResult {
  itemId: string;
  unitId: string;
  serial: string;
}

interface QRScannerProps {
  onResult: (result: QRScanResult) => void;
  onClose: () => void;
}

export function QRScanner({ onResult, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const resolvedRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleResult = useCallback(
    (result: QRScanResult) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      stopStream();
      onResult(result);
    },
    [onResult, stopStream],
  );

  useEffect(() => {
    let active = true;

    function scanFrame() {
      if (!active || resolvedRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code?.data) {
        const decoded = decodeQrContent(code.data);
        if (decoded) {
          handleResult(decoded);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    }

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        rafRef.current = requestAnimationFrame(scanFrame);
      } catch {
        if (active) setCameraError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้งานกล้องก่อน');
      }
    }

    startCamera();

    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [handleResult]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3 className="modal-title">📷 สแกน QR Code</h3>
          <button
            className="close-btn"
            onClick={() => {
              stopStream();
              onClose();
            }}
          >
            ×
          </button>
        </div>

        {cameraError ? (
          <div
            style={{ padding: '24px', textAlign: 'center', color: 'var(--color-error, #f87171)' }}
          >
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>📵</div>
            <p>{cameraError}</p>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ width: '100%', borderRadius: '8px', display: 'block' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            <div
              style={{
                textAlign: 'center',
                marginTop: '12px',
                color: 'var(--color-text-secondary)',
                fontSize: '13px',
              }}
            >
              🔲 จัดให้ QR Code อยู่กลางเฟรม...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
