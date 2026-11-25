import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { encodeQrContent, type Unit } from '../lib/db';

interface QRCodeCardProps {
  unit: Unit;
  itemName: string;
}

export function QRCodeCard({ unit, itemName }: QRCodeCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, encodeQrContent(unit), {
      width: 180,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(console.error);
  }, [unit]);

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>QR Code - ${unit.serial}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: 'Sarabun', sans-serif;
              background: white;
            }
            img { width: 180px; height: 180px; display: block; }
            .serial { font-size: 16px; font-weight: 700; margin: 8px 0 4px; color: #111; }
            .item   { font-size: 13px; color: #555; margin: 2px 0; }
            .uid    { font-size: 10px; color: #999; margin-top: 4px; word-break: break-all; max-width: 200px; text-align: center; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="QR Code" />
          <div class="serial">${unit.serial}</div>
          <div class="item">${itemName}</div>
          <div class="uid">ID: ${unit._id}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        padding: '16px',
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}
    >
      <canvas ref={canvasRef} />
      <span style={{ fontSize: '13px', color: '#222', fontWeight: 700 }}>{unit.serial}</span>
      <span style={{ fontSize: '11px', color: '#666' }}>{itemName}</span>
      <button
        onClick={handlePrint}
        style={{
          marginTop: '4px',
          padding: '5px 14px',
          fontSize: '12px',
          cursor: 'pointer',
          border: '1px solid #ccc',
          borderRadius: '6px',
          background: '#f5f5f5',
          color: '#333',
        }}
      >
        🖨️ พิมพ์ป้าย
      </button>
    </div>
  );
}
