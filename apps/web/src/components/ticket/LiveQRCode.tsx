import { QRCodeSVG } from 'qrcode.react';

export interface LiveQRCodeProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
  title?: string;
}

export default function LiveQRCode({
  value,
  size = 320,
  level = 'H',
  includeMargin = true,
  className = '',
  title = 'Ticket QR code'
}: LiveQRCodeProps) {
  if (!value) {
    return null;
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm ${className}`} aria-label={title}>
      <QRCodeSVG value={value} size={size} level={level} includeMargin={includeMargin} />
    </div>
  );
}
