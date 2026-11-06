import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  X,
  Move
} from 'lucide-react';

interface AvatarCropModalProps {
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  onClose: () => void;
}

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  imageSrc,
  onCropComplete,
  onClose
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle Drag / Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    });
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
    setScale((prev) => Math.min(Math.max(0.5, prev + zoomFactor), 3.5));
  };

  // Perform crop to 400x400 canvas
  const handleApplyCrop = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport diameter is 260px in our modal preview
    const viewportDiameter = 260;
    const outputScale = 400 / viewportDiameter;

    ctx.save();
    // Center of canvas
    ctx.translate(200, 200);
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply offset and scale scaled up to 400x400
    const finalX = position.x * outputScale;
    const finalY = position.y * outputScale;
    const finalScale = scale * outputScale;

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // Fit initial image into viewport
    const baseFit = Math.min(viewportDiameter / imgWidth, viewportDiameter / imgHeight);
    const drawWidth = imgWidth * baseFit * finalScale;
    const drawHeight = imgHeight * baseFit * finalScale;

    ctx.drawImage(
      img,
      finalX - drawWidth / 2,
      finalY - drawHeight / 2,
      drawWidth,
      drawHeight
    );
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], 'profile_avatar.webp', { type: 'image/webp' });
        onCropComplete(croppedFile);
      },
      'image/webp',
      0.95
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl z-10 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Reposition & Crop Profile Photo
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Drag to reposition, use slider to zoom in/out
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Viewport */}
        <div className="flex justify-center py-2">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
            onWheel={handleWheel}
            className="relative w-[260px] h-[260px] rounded-full overflow-hidden border-2 border-indigo-500 shadow-xl bg-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            title="Click and drag to reposition image. Scroll to zoom."
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              draggable={false}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                maxWidth: 'none',
                userSelect: 'none'
              }}
              className="pointer-events-none transition-transform duration-75 ease-out"
            />

            {/* Circular focus indicator grid */}
            <div className="absolute inset-0 pointer-events-none rounded-full border border-white/20 shadow-inner flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
            </div>
          </div>
        </div>

        {/* Drag Helper Notice */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Move className="w-3.5 h-3.5 text-indigo-500" />
          <span>Click & drag inside circle to center your face</span>
        </div>

        {/* Zoom Controls Slider */}
        <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-[11px]">Zoom Level</span>
            <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
              {Math.round(scale * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-600 cursor-pointer"
            />

            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3.0, s + 0.15))}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-1 border border-slate-200 dark:border-slate-700"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save & Apply Avatar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
