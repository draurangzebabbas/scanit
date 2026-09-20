'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ScannerProps {
  onScanSuccess: (upc: string) => void;
  onCancel?: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<string>('Initializing camera...');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [torchAvailable, setTorchAvailable] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [scannedEffect, setScannedEffect] = useState<boolean>(false);
  const [manualUpc, setManualUpc] = useState<string>('');

  const streamRef = useRef<MediaStream | null>(null);
  const detectorIntervalRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(920, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  };

  const triggerHaptic = () => {
    if ('vibrate' in navigator) {
      try { navigator.vibrate([70, 40, 70]); } catch (e) {}
    }
  };

  const handleDetectedBarcode = (text: string, format?: string) => {
    if (!text || isProcessingRef.current) return;
    const clean = text.trim();
    if (clean.length < 3) return;

    isProcessingRef.current = true;
    playBeep();
    triggerHaptic();
    setScannedEffect(true);

    const fmtText = format ? ` [${format.toUpperCase()}]` : '';
    setStatus(`✓ Scanned: ${clean}${fmtText}`);

    setTimeout(() => {
      stopCamera();
      onScanSuccess(clean);
      isProcessingRef.current = false;
    }, 150);
  };

  const startCamera = async () => {
    if (isScanning) return;
    isProcessingRef.current = false;
    setStatus('Starting camera stream...');

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { min: 1280, ideal: 1920 },
            height: { min: 720, ideal: 1080 },
          },
        });
      } catch (err) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          setTorchAvailable(true);
        }
        if (track.applyConstraints) {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] }).catch(() => {});
        }
      }

      setIsScanning(true);
      setStatus('Scanning barcodes (UPC, EAN, Code128, QR)...');

      if ('BarcodeDetector' in window) {
        try {
          const supported = await (window as any).BarcodeDetector.getSupportedFormats().catch(() => [
            'upc_a', 'upc_e', 'ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code'
          ]);
          const detector = new (window as any).BarcodeDetector({ formats: supported });

          detectorIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState !== 4 || isProcessingRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const b = barcodes[0];
                if (b && b.rawValue) {
                  handleDetectedBarcode(b.rawValue, b.format);
                }
              }
            } catch (e) {}
          }, 80);
          return;
        } catch (e) {}
      }
    } catch (error: any) {
      setIsScanning(false);
      setStatus('Camera access denied or unavailable. Please use manual entry.');
    }
  };

  const stopCamera = () => {
    if (detectorIntervalRef.current) {
      clearInterval(detectorIntervalRef.current);
      detectorIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setTorchOn(false);
    setTorchAvailable(false);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const nextTorch = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: nextTorch } as any] });
      setTorchOn(nextTorch);
    } catch (e) {}
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUpc.trim()) return;
    stopCamera();
    onScanSuccess(manualUpc.trim());
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4 sm:p-6 space-y-4 font-mono flex flex-col items-center justify-center">
      {/* Viewport Container */}
      <div className="relative overflow-hidden rounded-xl bg-black shadow-lg border border-gray-200 dark:border-gray-800 aspect-[3/4] max-h-[60vh] w-full">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />

        {/* Framing Overlay & Laser Animation */}
        <div
          className={`absolute left-[8%] right-[8%] top-[25%] h-[35%] rounded-lg border-2 transition-all duration-200 pointer-events-none overflow-hidden ${
            scannedEffect
              ? 'border-blue-400 bg-blue-500/20'
              : 'border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]'
          }`}
        >
          <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_#1d77ff] animate-[laser_2s_ease-in-out_infinite_alternate]" />
        </div>

        <div className="absolute bottom-4 left-0 right-0 text-center px-4">
          <p className="text-xs font-medium text-white/90 drop-shadow">
            Align barcode inside frame
          </p>
        </div>

        {torchAvailable && (
          <button
            onClick={toggleTorch}
            className={`absolute top-4 right-4 rounded-lg px-3 py-1.5 text-xs font-bold backdrop-blur-md transition ${
              torchOn
                ? 'bg-amber-400 text-slate-950'
                : 'bg-black/60 text-white hover:bg-black/80'
            }`}
          >
            {torchOn ? '🔦 Torch ON' : '💡 Torch'}
          </button>
        )}
      </div>

      {/* Status Bar */}
      <div className="w-full rounded-lg bg-white dark:bg-slate-900 px-4 py-2.5 text-center text-xs font-mono text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
        {status}
      </div>

      {/* Action Buttons */}
      <div className="w-full flex gap-2">
        {!isScanning ? (
          <button
            onClick={startCamera}
            className="flex-1 rounded-lg bg-blue-600 py-3 text-xs font-bold text-white transition hover:bg-blue-500 shadow-sm"
          >
            Restart Camera
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            Pause Camera
          </button>
        )}

        {onCancel && (
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Back
          </button>
        )}
      </div>

      {/* Manual Entry */}
      <form onSubmit={handleManualSubmit} className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-4 space-y-2">
        <label className="block text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
          Manual Barcode / UPC Entry
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={manualUpc}
            onChange={(e) => setManualUpc(e.target.value)}
            placeholder="e.g. 012345678905"
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-mono text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};
