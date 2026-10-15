import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  GripVertical,
} from 'lucide-react';
import { GradingSubmission, UploadedImagePage } from '../types';
import { compressImage } from '../utils/imageCompress';
import { useHorizontalSwipe } from '../utils/horizontalSwipe';
import { PhotoViewer } from './PhotoViewer';

interface CaptureScreenProps {
  /** Adds the essay to the background queue; returns immediately. */
  onSubmit: (data: GradingSubmission) => void;
  /** How many essays are currently queued or running. */
  queueCount: number;
  hasKey: boolean;
  /** Lets the app avoid auto-opening a result while pages are being collected. */
  onCollectingChange?: (collecting: boolean) => void;
}

const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
const LAST_META_KEY = 'essay-grader:last-meta';
/** Hold this long before a thumbnail enters reorder mode (avoids fighting strip scroll). */
const REORDER_HOLD_MS = 320;

/**
 * Capture and collect. Multi-page essays are gathered page by page, then handed
 * to the background queue — the screen never blocks on grading.
 */
export const CaptureScreen: React.FC<CaptureScreenProps> = ({
  onSubmit,
  queueCount,
  hasKey,
  onCollectingChange,
}) => {
  const [pages, setPages] = useState<UploadedImagePage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [justQueued, setJustQueued] = useState<string | null>(null);
  /** Thumbnail currently being reordered via long-press drag. */
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const [studentName, setStudentName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('六年级');
  const [promptHint, setPromptHint] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const thumbStripRef = useRef<HTMLDivElement>(null);
  /** After a reorder gesture, ignore the synthetic click that would change activeIndex. */
  const suppressThumbClick = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LAST_META_KEY) || '{}');
      if (saved.gradeLevel) setGradeLevel(saved.gradeLevel);
      if (saved.studentName) setStudentName(saved.studentName);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!justQueued) return;
    const t = setTimeout(() => setJustQueued(null), 2600);
    return () => clearTimeout(t);
  }, [justQueued]);

  const pageCountRef = useRef(0);
  useEffect(() => {
    pageCountRef.current = pages.length;
    onCollectingChange?.(pages.length > 0);
  }, [pages, onCollectingChange]);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    const added = await Promise.all(
      list.map(async (file, i) => ({
        id: `p-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        dataUrl: await compressImage(file, 1800, 0.88),
        name: file.name || `第 ${pageCountRef.current + i + 1} 页`,
      }))
    );
    setPages((prev) => {
      const next = [...prev, ...added];
      setActiveIndex(next.length - added.length);
      return next;
    });
  };

  const removePage = (index: number) => {
    setPages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setActiveIndex((cur) =>
        Math.min(Math.max(0, cur >= index ? cur - 1 : cur), Math.max(0, next.length - 1))
      );
      return next;
    });
  };

  const movePage = (from: number, to: number) => {
    setPages((prev) => {
      if (to < 0 || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    // Caller only invokes this for a real move; focus the page that was dragged.
    if (from !== to && to >= 0) setActiveIndex(to);
  };

  const previewSwipe = useHorizontalSwipe({
    enabled: pages.length > 1,
    onSwipeLeft: () => setActiveIndex((i) => Math.min(i + 1, pages.length - 1)),
    onSwipeRight: () => setActiveIndex((i) => Math.max(i - 1, 0)),
  });

  /**
   * Long-press then drag on a thumbnail to reorder.
   * HTML5 draggable is unreliable on mobile; pointer events work on phone and desktop.
   */
  const onThumbPointerDown = (index: number, e: React.PointerEvent) => {
    if (e.button !== 0 || pages.length < 2) return;
    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let from = index;
    let over = index;

    const clearDragUi = () => {
      setDragFrom(null);
      setDragOver(null);
    };

    const hitIndex = (clientX: number): number => {
      const strip = thumbStripRef.current;
      if (!strip) return from;
      const nodes = strip.querySelectorAll<HTMLElement>('[data-page-thumb]');
      let best = from;
      let bestDist = Infinity;
      nodes.forEach((node, i) => {
        const r = node.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const d = Math.abs(clientX - cx);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      return best;
    };

    const timer = window.setTimeout(() => {
      dragging = true;
      suppressThumbClick.current = true;
      setDragFrom(from);
      setDragOver(from);
      try {
        navigator.vibrate?.(12);
      } catch {
        /* no haptic */
      }
    }, REORDER_HOLD_MS);

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging) {
        // Finger moved while waiting — treat as strip scroll, cancel hold.
        if (Math.hypot(dx, dy) > 10) window.clearTimeout(timer);
        return;
      }
      ev.preventDefault();
      const nextOver = hitIndex(ev.clientX);
      if (nextOver !== over) {
        over = nextOver;
        setDragOver(over);
      }
    };

    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (dragging && over !== from) {
        movePage(from, over);
      }
      clearDragUi();
      // Drop the click suppression on the next tick so the click from this gesture is ignored.
      if (suppressThumbClick.current) {
        window.setTimeout(() => {
          suppressThumbClick.current = false;
        }, 0);
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const submit = () => {
    if (pages.length === 0 || !hasKey) return;
    try {
      localStorage.setItem(LAST_META_KEY, JSON.stringify({ gradeLevel, studentName }));
    } catch {
      /* ignore */
    }
    const label = studentName.trim() || `第 ${queueCount + 1} 篇`;
    onSubmit({ images: pages, gradeLevel, studentName, promptHint });
    setPages([]);
    setActiveIndex(0);
    setJustQueued(label);
  };

  const active = pages[activeIndex];

  return (
    <div className="pb-32">
      {justQueued && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>
            <b>已加入后台队列</b>（{justQueued}）。可以继续拍下一篇,批好会提示你。
          </span>
        </div>
      )}

      {pages.length === 0 ? (
        <div className="px-4 pt-8">
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-slate-900">上传作文,生成批注</h1>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              拍下学生作文,后台自动识别并给出可直接抄写的批注
            </p>
            {queueCount > 0 && (
              <p className="mt-2 text-xs text-rose-600 font-semibold">
                后台正在批改 {queueCount} 篇,你可以继续拍。
              </p>
            )}
          </div>

          <div className="space-y-3 max-w-md mx-auto">
            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-200 active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Camera className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-bold">拍照上传</div>
                <div className="text-xs text-rose-100 mt-0.5">对准作文,拍一页即收录一页</div>
              </div>
            </button>

            <button
              onClick={() => libraryRef.current?.click()}
              className="w-full flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 text-slate-800 active:scale-[0.98] transition-transform"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <ImageIcon className="w-6 h-6 text-slate-600" />
              </div>
              <div className="text-left">
                <div className="font-bold">从相册选择</div>
                <div className="text-xs text-slate-500 mt-0.5">可一次选中多张,自动按顺序排列</div>
              </div>
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            多页作文连续拍照收录,全部拍完再一起提交
          </p>
        </div>
      ) : (
        <div className="px-4 pt-4">
          <div
            className="relative rounded-2xl overflow-hidden bg-slate-900 touch-none select-none"
            {...previewSwipe}
          >
            {active && (
              <img
                src={active.dataUrl}
                alt={`第 ${activeIndex + 1} 页`}
                className="w-full max-h-[46vh] object-contain pointer-events-none"
                draggable={false}
              />
            )}
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-xs font-bold pointer-events-none">
              第 {activeIndex + 1} 页 / 共 {pages.length} 页
            </div>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setPreviewOpen(true)}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-white/90 text-slate-700 text-xs font-semibold"
            >
              放大
            </button>
            {pages.length > 1 && (
              <p className="absolute bottom-2 inset-x-0 text-center text-[10px] text-white/70 pointer-events-none">
                左右滑动翻页
              </p>
            )}
          </div>

          <div
            ref={thumbStripRef}
            className={`mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 ${
              dragFrom !== null ? 'touch-none' : ''
            }`}
          >
            {pages.map((p, i) => {
              const isDragging = dragFrom === i;
              const isDropTarget = dragOver === i && dragFrom !== null && dragFrom !== i;
              return (
                <div
                  key={p.id}
                  data-page-thumb
                  onPointerDown={(e) => onThumbPointerDown(i, e)}
                  onClick={() => {
                    if (suppressThumbClick.current) return;
                    setActiveIndex(i);
                  }}
                  className={`relative shrink-0 w-20 h-24 rounded-xl overflow-hidden border-2 transition-all ${
                    isDragging
                      ? 'border-rose-500 opacity-50 scale-95'
                      : isDropTarget
                        ? 'border-rose-400 ring-2 ring-rose-200'
                        : i === activeIndex
                          ? 'border-rose-500 ring-2 ring-rose-200'
                          : 'border-slate-200'
                  }`}
                >
                  <img src={p.dataUrl} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-900/75 text-white text-[10px] text-center font-bold py-0.5 pointer-events-none">
                    {i + 1}
                  </span>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      removePage(i);
                    }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center"
                    aria-label="删除此页"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            <button
              onClick={() => cameraRef.current?.click()}
              className="shrink-0 w-20 h-24 rounded-xl border-2 border-dashed border-rose-300 bg-rose-50/60 flex flex-col items-center justify-center gap-1 text-rose-600"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-bold">继续拍</span>
            </button>
          </div>

          {pages.length > 1 && (
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 px-1">
              <span className="flex items-center gap-1">
                <GripVertical className="w-3.5 h-3.5" />
                长按缩略图拖动排序
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  disabled={activeIndex === 0}
                  className="p-1.5 rounded-lg bg-slate-100 disabled:opacity-30"
                  aria-label="上一页"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveIndex((i) => Math.min(pages.length - 1, i + 1))}
                  disabled={activeIndex === pages.length - 1}
                  className="p-1.5 rounded-lg bg-slate-100 disabled:opacity-30"
                  aria-label="下一页"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setPages([]);
                    setActiveIndex(0);
                  }}
                  className="ml-1 p-1.5 rounded-lg bg-slate-100 text-slate-500"
                  aria-label="清空全部"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setShowOptions((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm"
            >
              <span className="text-slate-700 font-medium">
                {gradeLevel}
                {studentName ? ` · ${studentName}` : ''}
                <span className="text-slate-400 font-normal ml-2">选填</span>
              </span>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showOptions ? 'rotate-90' : ''}`} />
            </button>

            {showOptions && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">年级</label>
                  <div className="grid grid-cols-3 gap-2">
                    {GRADES.map((g) => (
                      <button
                        key={g}
                        onClick={() => setGradeLevel(g)}
                        className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                          gradeLevel === g
                            ? 'bg-rose-600 border-rose-600 text-white font-bold'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">学生姓名</label>
                  <input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="选填"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">批改要求</label>
                  <textarea
                    value={promptHint}
                    onChange={(e) => setPromptHint(e.target.value)}
                    rows={2}
                    placeholder="例如：重点查形近字与标点"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {pages.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={submit}
              disabled={!hasKey}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-base shadow-lg transition-transform active:scale-[0.98] ${
                hasKey
                  ? 'bg-rose-600 text-white shadow-rose-200'
                  : 'bg-slate-200 text-slate-400 shadow-none'
              }`}
            >
              <Sparkles className="w-5 h-5" />
              {hasKey ? `提交批改(${pages.length} 页)` : '请先配置 API Key'}
            </button>
            <p className="mt-1.5 text-center text-[11px] text-slate-400">
              提交后立即可以拍下一篇,不用等
            </p>
          </div>
        </div>
      )}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {previewOpen && pages.length > 0 && (
        <PhotoViewer
          imageUrls={pages.map((p) => p.dataUrl)}
          index={activeIndex}
          onIndexChange={setActiveIndex}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </div>
  );
};
