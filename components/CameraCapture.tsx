import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, RefreshCw, Zap, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageData: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setIsReady(true);
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Не удалось получить доступ к камере. Проверьте разрешения.");
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    
    const imageData = canvasRef.current.toDataURL('image/jpeg', 0.8);
    onCapture(imageData);
    stopCamera();
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="flex-1 relative"
          >
            {/* Camera View */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Overlay Grid / Scan area */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1 rounded-br-lg" />
                
                <div className="absolute inset-0 bg-indigo-500/10 animate-pulse rounded-3xl" />
              </div>
            </div>

            {/* Header Controls */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
              <button 
                onClick={onClose} 
                className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all"
              >
                <X size={24} />
              </button>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">ИИ Сканер</span>
                <div className="flex items-center gap-2 bg-indigo-600/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-indigo-500/30">
                  <Zap size={14} className="text-indigo-400" />
                  <span className="text-[11px] font-black text-white uppercase">Real-time Vision</span>
                </div>
              </div>
              <button 
                onClick={toggleCamera}
                className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white hover:bg-white/20 transition-all"
              >
                <RefreshCw size={24} />
              </button>
            </div>

            {/* Footer Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-10 flex flex-col items-center gap-8 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white/60 text-xs font-medium text-center max-w-[240px]">
                Разместите неисправную деталь или индикатор приборной панели в центре кадра
              </p>
              
              <div className="flex items-center justify-center gap-10">
                <button className="p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white opacity-40">
                  <ImageIcon size={28} />
                </button>
                
                <button 
                  onClick={capturePhoto}
                  disabled={!isReady}
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform disabled:opacity-50"
                >
                  <div className="w-16 h-16 border-4 border-black/10 rounded-full flex items-center justify-center">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full" />
                  </div>
                </button>

                <div className="w-[60px]" /> {/* Spacer */}
              </div>
            </div>
          </motion.div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </AnimatePresence>
  );
};
