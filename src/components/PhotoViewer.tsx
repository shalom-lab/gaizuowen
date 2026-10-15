import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHorizontalSwipe } from '../utils/horizontalSwipe';

interface PhotoViewerProps {
  imageUrls: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

/**
 * Full-screen photo checker with finger/mouse horizontal swipe.
 * Shared by 对照原图 and the capture-screen amplify view.
 */
export const PhotoViewer: React.FC<PhotoViewerProps> = ({
  imageUrls,
  index,
  onIndexChange,
  onClose,
}) => {
  const multi = imageUrls.length > 1;

  const swipe = useHorizontalSwipe({
    enabled: multi,
    threshold: 36,
    onSwipeLeft: () => {
      if (index < imageUrls.length - 1) onIndexChange(index + 1);
    },
    onSwipeRight: () => {
      if (index > 0) onIndexChange(index - 1);
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={onClose}>
      <div
        className="flex items-center justify-between px-4 py-3 text-white shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-bold">
          原图 {index + 1} / {imageUrls.length}
        </span>
        <button onClick={onClose} className="p-1.5 rounded-full bg-white/15" aria-label="关闭">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        className="flex-1 flex items-center justify-center p-2 overflow-hidden touch-none select-none"
        onClick={(e) => e.stopPropagation()}
        {...swipe}
      >
        <img
          src={imageUrls[index]}
          alt={`第 ${index + 1} 页`}
          className="max-w-full max-h-full object-contain pointer-events-none"
          draggable={false}
        />
      </div>

      {multi && (
        <div
          className="flex items-center justify-center gap-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onIndexChange(Math.max(0, index - 1))}
            disabled={index === 0}
            className="p-2.5 rounded-full bg-white/15 text-white disabled:opacity-30"
            aria-label="上一页"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-1.5">
            {imageUrls.map((_, i) => (
              <button
                key={i}
                onClick={() => onIndexChange(i)}
                aria-label={`第 ${i + 1} 页`}
                className={`w-2 h-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
          <button
            onClick={() => onIndexChange(Math.min(imageUrls.length - 1, index + 1))}
            disabled={index === imageUrls.length - 1}
            className="p-2.5 rounded-full bg-white/15 text-white disabled:opacity-30"
            aria-label="下一页"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {multi && (
        <p className="pb-3 text-center text-[11px] text-white/40 shrink-0">左右滑动切换页面</p>
      )}
    </div>
  );
};
