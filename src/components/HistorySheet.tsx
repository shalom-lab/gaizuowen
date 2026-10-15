import React, { useMemo, useState } from 'react';
import { X, Trash2, Search, BookOpen, Check, FileDown, AlertTriangle } from 'lucide-react';
import { StoredEssayRecord } from '../utils/indexedDb';
import { scoreStyle } from '../utils/scoreStyle';

interface HistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  records: StoredEssayRecord[];
  /** Essay ids whose result has not been opened yet (shown with a 新 chip). */
  unreadIds?: Set<string>;
  onSelect: (record: StoredEssayRecord) => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
  onClearAll: () => void;
  /** Export the chosen essays as a printable document. */
  onExport: (records: StoredEssayRecord[]) => void;
}

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

/** In-app confirmation — native confirm() is unreliable in mobile webviews. */
type PendingAction =
  | { kind: 'deleteOne'; id: string; title: string }
  | { kind: 'deleteMany'; ids: string[] }
  | { kind: 'clearAll' }
  | null;

export const HistorySheet: React.FC<HistorySheetProps> = ({
  isOpen,
  onClose,
  records,
  unreadIds,
  onSelect,
  onDelete,
  onDeleteMany,
  onClearAll,
  onExport,
}) => {
  const [query, setQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingAction>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.title?.toLowerCase().includes(q) ||
        r.studentName?.toLowerCase().includes(q) ||
        r.gradeLevel?.toLowerCase().includes(q)
    );
  }, [records, query]);

  if (!isOpen) return null;

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((r) => r.id)));

  const selectedRecords = records.filter((r) => selected.has(r.id));

  const runPending = () => {
    if (!pending) return;
    if (pending.kind === 'deleteOne') onDelete(pending.id);
    else if (pending.kind === 'deleteMany') {
      onDeleteMany(pending.ids);
      exitSelect();
    } else if (pending.kind === 'clearAll') {
      onClearAll();
      exitSelect();
    }
    setPending(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-t-3xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-2.5 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* ---- Header ---- */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
          <h2 className="text-base font-bold text-slate-900">
            批改记录
            <span className="text-xs text-slate-400 font-normal ml-2">{records.length} 篇</span>
          </h2>
          <div className="flex items-center gap-1">
            {records.length > 0 && (
              <button
                onClick={() => (selectMode ? exitSelect() : setSelectMode(true))}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold active:scale-95 ${
                  selectMode ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {selectMode ? '取消' : '选择'}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 active:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ---- Search ---- */}
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
            {selectMode && (
              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 px-1">
                <span>已选 {selected.size} 篇</span>
                <button onClick={selectAll} className="text-rose-600 font-semibold">
                  全选当前 {filtered.length} 篇
                </button>
              </div>
            )}
          </div>
        )}

        {/* ---- List ---- */}
        <div className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <BookOpen className="w-9 h-9 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">{query ? '没有找到匹配的记录' : '还没有批改记录'}</p>
              <p className="text-xs text-slate-300 mt-1">批改完成后会自动保存到本机浏览器</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filtered.map((r) => {
                const style = scoreStyle(r.overallScore, r.letterGrade);
                const isSel = selected.has(r.id);
                const isNew = unreadIds?.has(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => (selectMode ? toggle(r.id) : onSelect(r))}
                    className={`flex gap-3 p-3 rounded-2xl border bg-white transition-all ${
                      isSel ? 'border-rose-400 ring-2 ring-rose-200' : 'border-slate-200 active:bg-slate-50'
                    }`}
                  >
                    {selectMode && (
                      <span
                        className={`shrink-0 self-center w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSel ? 'bg-rose-600 border-rose-600' : 'border-slate-300'
                        }`}
                      >
                        {isSel && <Check className="w-3 h-3 text-white" />}
                      </span>
                    )}

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
                        {/* Score colour now reflects the actual grade. */}
                        <span className={`text-sm font-bold tabular-nums shrink-0 ${style.text}`}>
                          {r.overallScore}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                        <span>{r.studentName}</span>
                        <span>·</span>
                        <span>{r.gradeLevel}</span>
                        {r.pageCount > 1 && (
                          <>
                            <span>·</span>
                            <span>{r.pageCount}页</span>
                          </>
                        )}
                        <span className={`px-1.5 rounded border ${style.bg} ${style.text} ${style.border}`}>
                          {r.letterGrade}
                        </span>
                        {isNew && (
                          <span className="px-1.5 rounded bg-emerald-500 text-white font-bold">新</span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400">{formatWhen(r.createdAt)}</span>
                        {!selectMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPending({ kind: 'deleteOne', id: r.id, title: r.title });
                            }}
                            className="p-1.5 rounded-lg text-slate-300 active:text-red-600 active:bg-red-50"
                            aria-label="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!selectMode && (
                <button
                  onClick={() => setPending({ kind: 'clearAll' })}
                  className="w-full py-2.5 text-xs text-slate-400 active:text-red-600"
                >
                  清空全部记录
                </button>
              )}
            </div>
          )}
        </div>

        {/* ---- Selection action bar ---- */}
        {selectMode && (
          <div className="shrink-0 border-t border-slate-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPending({ kind: 'deleteMany', ids: [...selected] })}
                disabled={selected.size === 0}
                className="flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              <button
                onClick={() => onExport(selectedRecords)}
                disabled={selected.size === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-rose-600 text-white text-sm font-bold shadow-lg shadow-rose-200 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none active:scale-[0.98]"
              >
                <FileDown className="w-4 h-4" />
                导出批注文档（{selected.size}）
              </button>
            </div>
          </div>
        )}

        {/* ---- Confirmation ---- */}
        {pending && (
          <div className="absolute inset-0 z-10 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    {pending.kind === 'clearAll'
                      ? '清空全部批改记录？'
                      : pending.kind === 'deleteMany'
                        ? `删除选中的 ${pending.ids.length} 篇？`
                        : `删除《${pending.title}》？`}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {pending.kind === 'clearAll'
                      ? '所有批改记录、原文与批注都会被删除，无法恢复。'
                      : '删除后无法恢复。'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setPending(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 active:bg-slate-50"
                >
                  取消
                </button>
                <button
                  onClick={runPending}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold active:scale-[0.98]"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
