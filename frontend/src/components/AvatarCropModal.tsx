import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  X,
  Move,
  RotateCcw
} from 'lucide-react';

interface AvatarCropModalProps {
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  onClose: () => void;
}

const VIEWPORT_SIZE = 260; // Preview circle diameter in px
const OUTPUT_SIZE = 400;   // High-res output avatar diameter in px
const OUTPUT_RATIO = OUTPUT_SIZE / VIEWPORT_SIZE;

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({
  imageSrc,
  onCropComplete,
  onClose
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Measure natural dimensions once image loads
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({
      width: img.naturalWidth || VIEWPORT_SIZE,
      height: img.naturalHeight || VIEWPORT_SIZE
    });
  };

  // Base fit so that at scale=1.0 (100%), the image neatly covers the circular viewport
  const baseFit = naturalSize
    ? Math.max(VIEWPORT_SIZE / naturalSize.width, VIEWPORT_SIZE / naturalSize.height)
    : 1;
  const baseW = naturalSize ? naturalSize.width * baseFit : VIEWPORT_SIZE;
  const baseH = naturalSize ? naturalSize.height * baseFit : VIEWPORT_SIZE;

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

  // Mouse wheel zoom (allows 20% to 350%)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
    setScale((prev) => Math.min(Math.max(0.2, Number((prev + zoomFactor).toFixed(2))), 3.5));
  };

  // Reset all adjustments
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Perform crop to 400x400 canvas - guaranteed pixel-perfect match with preview
  const handleApplyCrop = () => {
    if (!imageRef.current) return;
    const img = imageRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();
    // 1. Move origin to canvas center
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

    // 2. Apply drag translation scaled to canvas resolution
    ctx.translate(position.x * OUTPUT_RATIO, position.y * OUTPUT_RATIO);

    // 3. Apply rotation around center
    ctx.rotate((rotation * Math.PI) / 180);

    // 4. Apply user zoom scale
    ctx.scale(scale, scale);

    // 5. Draw image centered
    const canvasDrawW = baseW * OUTPUT_RATIO;
    const canvasDrawH = baseH * OUTPUT_RATIO;
    ctx.drawImage(
      img,
      -canvasDrawW / 2,
      -canvasDrawH / 2,
      canvasDrawW,
      canvasDrawH
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
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
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
              Drag to position, use slider or pills to zoom in & out
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
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
            style={{ width: `${VIEWPORT_SIZE}px`, height: `${VIEWPORT_SIZE}px` }}
            className="relative rounded-full overflow-hidden border-2 border-indigo-500 shadow-2xl bg-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            title="Click and drag to reposition image. Scroll or use slider to zoom."
          >
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              onLoad={handleImageLoad}
              draggable={false}
              style={{
                width: `${baseW}px`,
                height: `${baseH}px`,
                maxWidth: 'none',
                maxHeight: 'none',
                transform: `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
                transformOrigin: 'center center',
                userSelect: 'none'
              }}
              className="pointer-events-none transition-transform duration-75 ease-out shrink-0"
            />

            {/* Circular focus indicator guide */}
            <div className="absolute inset-0 pointer-events-none rounded-full border border-white/25 shadow-inner flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white/40 ring-4 ring-white/10" />
            </div>
          </div>
        </div>

        {/* Drag Helper Notice */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
          <Move className="w-3.5 h-3.5 text-indigo-500" />
          <span>Click & drag inside the circle to center your face</span>
        </div>

        {/* Zoom Controls & Presets */}
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-[11px]">Zoom Level</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                title="Reset zoom and position"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.2, Number((s - 0.1).toFixed(2))))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="0.2"
              max="3.5"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-600 cursor-pointer"
            />

            <button
              type="button"
              onClick={() => setScale((s) => Math.min(3.5, Number((s + 0.1).toFixed(2))))}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ml-1 border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Zoom Presets */}
          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/40">
            <span className="text-[10px] text-slate-400 font-medium">Quick Zoom:</span>
            <div className="flex items-center gap-1.5">
              {[
                { label: '50%', value: 0.5 },
                { label: '100% (Fit)', value: 1.0 },
                { label: '150%', value: 1.5 },
                { label: '200%', value: 2.0 }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setScale(preset.value)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                    Math.abs(scale - preset.value) < 0.04
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
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
