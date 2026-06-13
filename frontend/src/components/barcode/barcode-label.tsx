"use client";

import { useEffect, useRef } from "react";

interface Medicine {
  name: string;
  sku: string;
  batch: string;
  expiry: string;
  mrp: number;
  barcode: string;
  manufacturer?: string;
}

interface LabelConfig {
  size: string;
  showName: boolean;
  showMRP: boolean;
  showBatch: boolean;
  showExpiry: boolean;
  showManufacturer: boolean;
}

interface BarcodeLabelProps {
  medicine: Medicine;
  config: LabelConfig;
  className?: string;
}

const sizeMap: Record<string, { width: number; height: number }> = {
  small: { width: 144, height: 72 },
  medium: { width: 200, height: 100 },
  large: { width: 288, height: 144 },
  a4: { width: 240, height: 120 },
};

function drawBarcode(canvas: HTMLCanvasElement, value: string, width: number, barWidth = 2) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // Simple Code128-like visual barcode (decorative)
  const pattern = value.split("").flatMap((c) => {
    const code = c.charCodeAt(0) % 16;
    return [
      1,
      code % 2 === 0 ? 1 : 0,
      (code >> 1) % 2 === 0 ? 1 : 0,
      (code >> 2) % 2 === 0 ? 1 : 0,
      (code >> 3) % 2 === 0 ? 1 : 0,
      0,
    ];
  });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let x = 0;
  ctx.fillStyle = "#000";
  pattern.forEach((bit) => {
    if (bit) ctx.fillRect(x, 0, barWidth, canvas.height);
    x += barWidth;
  });
}

export default function BarcodeLabel({
  medicine,
  config,
  className = "",
}: BarcodeLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dims = sizeMap[config.size] || sizeMap.medium;
  const barcodeHeight = Math.round(dims.height * 0.35);

  useEffect(() => {
    if (canvasRef.current) {
      drawBarcode(canvasRef.current, medicine.barcode, dims.width - 16);
    }
  }, [medicine.barcode, dims.width, config.size]);

  return (
    <div
      className={`bg-white border border-gray-300 rounded p-2 flex flex-col gap-1 font-mono select-none ${className}`}
      style={{ width: dims.width, minHeight: dims.height }}
    >
      {config.showName && (
        <p
          className="font-bold text-gray-900 leading-tight"
          style={{ fontSize: config.size === "small" ? 8 : config.size === "medium" ? 10 : 12 }}
        >
          {medicine.name}
        </p>
      )}

      {/* Barcode canvas */}
      <div className="flex justify-center my-1">
        <canvas
          ref={canvasRef}
          width={dims.width - 16}
          height={barcodeHeight}
          className="block"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* Barcode number */}
      <p
        className="text-center text-gray-700 tracking-wider"
        style={{ fontSize: 7 }}
      >
        {medicine.barcode}
      </p>

      {/* Info rows */}
      <div
        className="grid grid-cols-2 gap-x-2 gap-y-0.5"
        style={{ fontSize: config.size === "small" ? 7 : 8 }}
      >
        {config.showMRP && (
          <p className="text-gray-900 font-bold">
            MRP: &#8377;{medicine.mrp.toFixed(2)}
          </p>
        )}
        {config.showBatch && (
          <p className="text-gray-600">Batch: {medicine.batch}</p>
        )}
        {config.showExpiry && (
          <p className="text-gray-600">Exp: {medicine.expiry}</p>
        )}
        {config.showManufacturer && medicine.manufacturer && (
          <p className="text-gray-500 col-span-2 truncate">{medicine.manufacturer}</p>
        )}
      </div>
    </div>
  );
}
