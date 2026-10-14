import React, { useState } from 'react';
import { X, Trash2, Search, BookOpen } from 'lucide-react';
import { StoredEssayRecord } from '../utils/indexedDb';

/**
 * Batch grading produces many entries on the same day, so a bare date makes the
 * newest-first ordering invisible. Show a relative time instead.
 */
function formatWhen(ts: number): string {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;

  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;

  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  if (new Date(now).toDateString() === d.toDateString()) return `今天 ${hh}:${mm}`;

  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mo}-${dd} ${hh}:${mm}`;
}

interface HistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  records: StoredEssayRecord[];
  onSelect: (record: StoredEssayRecord) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export const HistorySheet: React.FC<HistorySheetProps> = ({
  isOpen,
  onClose,
  records,
  onSelect,
  onDelete,
  onClearAll,
}) => {
  const [query, setQuery] = useState('');
  if (!isOpen) return null;

  const q = query.trim().toLowerCase();
  const filtered = q
    ? records.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.studentName?.toLowerCase().includes(q) ||
          r.gradeLevel?.toLowerCase().includes(q)
      )
    : records;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle */}
        <div className="pt-2.5 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-slate-900">
            批改记录
            <span className="text-xs text-slate-400 font-normal ml-2">{records.length} 篇</span>
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 active:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {records.length > 0 && (
          <div className="px-4 pb-2 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索学生姓名或作文题目"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <BookOpen className="w-9 h-9 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">
                {q ? '没有找到匹配的记录' : '还没有批改记录'}
              </p>
              <p className="text-xs text-slate-300 mt-1">批改完成后会自动保存到本机浏览器</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className="flex gap-3 p-3 rounded-2xl border border-slate-200 bg-white active:bg-slate-50"
                >
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    {r.imageUrls?.[0] ? (
                      <img src={r.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                        无图
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-sm text-slate-800 truncate">《{r.title}》</span>
                      <span className="text-sm font-bold text-rose-600 tabular-nums shrink-0">
                        {r.overallScore}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>{r.studentName}</span>
                      <span>·</span>
                      <span>{r.gradeLevel}</span>
                      {r.pageCount > 1 && (
                        <>
                          <span>·</span>
                          <span>{r.pageCount}页</span>
                        </>
                      )}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {formatWhen(r.createdAt)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`删除《${r.title}》的批改记录？`)) onDelete(r.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-300 active:text-red-600 active:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => {
                  if (confirm('确定清空全部批改记录？此操作无法撤销。')) onClearAll();
                }}
                className="w-full py-2.5 text-xs text-slate-400 active:text-red-600"
              >
                清空全部记录
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
