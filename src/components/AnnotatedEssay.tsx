import React, { useMemo } from 'react';
import { EssayParagraph, AnnotationItem } from '../types';
import { TYPE_META } from '../utils/annotationMeta';

interface AnnotatedEssayProps {
  paragraphs: EssayParagraph[];
  annotations: AnnotationItem[];
}

interface Segment {
  start: number;
  end: number;
  ann: AnnotationItem;
}

/**
 * The deliverable view.
 *
 * Two layers, both fully visible by default — nothing needs to be tapped:
 *  1. Inline: the pupil's text untouched, each correction in a bracket
 *     (`一条又粗又粗〔→又粗又长〕`), numbered to match the notes below.
 *  2. Below each paragraph: every note for that paragraph, always expanded,
 *     so the whole essay can be read and copied straight down the page.
 */
export const AnnotatedEssay: React.FC<AnnotatedEssayProps> = ({ paragraphs, annotations }) => {
  /** Non-overlapping segments per paragraph, in reading order. */
  const segmentsByParagraph = useMemo(() => {
    const map = new Map<number, Segment[]>();
    for (const a of annotations) {
      if (typeof a.paragraphIndex !== 'number') continue;
      if (typeof a.charStart !== 'number' || typeof a.charEnd !== 'number') continue;
      const list = map.get(a.paragraphIndex) || [];
      list.push({ start: a.charStart, end: a.charEnd, ann: a });
      map.set(a.paragraphIndex, list);
    }
    for (const [key, list] of map) {
      list.sort((x, y) => x.start - y.start);
      // Drop anything overlapping a previous mark. The anchorer already
      // prevents this, but a bad result must not corrupt the layout.
      const clean: Segment[] = [];
      let cursor = -1;
      for (const s of list) {
        if (s.start >= cursor) {
          clean.push(s);
          cursor = s.end;
        }
      }
      map.set(key, clean);
    }
    return map;
  }, [annotations]);

  /** Notes grouped by paragraph, in reading order. */
  const notesByParagraph = useMemo(() => {
    const map = new Map<number, AnnotationItem[]>();
    for (const a of annotations) {
      if (typeof a.paragraphIndex !== 'number') continue;
      const list = map.get(a.paragraphIndex) || [];
      list.push(a);
      map.set(a.paragraphIndex, list);
    }
    for (const list of map.values()) {
      list.sort((x, y) => (x.order ?? 0) - (y.order ?? 0));
    }
    return map;
  }, [annotations]);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <p className="text-[11px] text-slate-400 leading-relaxed mb-4 pb-3 border-b border-slate-100">
        原文<b>未作改动</b>,错处后面用〔　〕标出正确写法。<b>直线</b>＝要改的地方,<b>波浪线</b>＝好句子;
        每段下方的批注已全部展开,可直接照抄。
      </p>

      <div className="space-y-6">
        {paragraphs.map((p, pIdx) => {
          const segments = segmentsByParagraph.get(p.paragraphIndex) || [];
          const notes = notesByParagraph.get(p.paragraphIndex) || [];

          // Build the inline text: plain runs, marked runs, and 〔→fix〕 brackets.
          const nodes: React.ReactNode[] = [];
          let cursor = 0;

          segments.forEach((seg, i) => {
            const { ann } = seg;
            const meta = TYPE_META[ann.type] || TYPE_META.grammar;

            if (seg.start > cursor) {
              nodes.push(<span key={`t${i}`}>{p.text.slice(cursor, seg.start)}</span>);
            }

            nodes.push(
              <React.Fragment key={ann.id || `s${i}`}>
                <span className={`${meta.textClass} rounded px-0.5`}>
                  {p.text.slice(seg.start, seg.end)}
                </span>
                <span
                  className={`mx-0.5 px-1.5 py-0.5 rounded-md text-[12px] font-sans font-bold border align-baseline whitespace-nowrap ${meta.badgeClass}`}
                >
                  {ann.suggestedText ? `〔→ ${ann.suggestedText}〕` : `〔${ann.category || meta.label}〕`}
                  <sup className="ml-0.5 text-[10px]">{ann.order}</sup>
                </span>
              </React.Fragment>
            );

            cursor = seg.end;
          });

          if (cursor < p.text.length) {
            nodes.push(<span key="tail">{p.text.slice(cursor)}</span>);
          }

          return (
            <div key={p.paragraphIndex ?? pIdx}>
              <p className="text-[16px] font-serif text-slate-800 leading-[2.2] text-justify">
                {nodes.length ? nodes : p.text}
              </p>

              {/* Always-visible notes for this paragraph */}
              {notes.length > 0 && (
                <div className="mt-2.5 ml-1 pl-3 border-l-2 border-slate-200 space-y-2">
                  {notes.map((a) => {
                    const meta = TYPE_META[a.type] || TYPE_META.grammar;
                    return (
                      <div key={a.id} className="flex items-start gap-2">
                        <span
                          className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${meta.chipClass}`}
                        >
                          {a.order}
                        </span>
                        <div className="text-[13px] leading-relaxed min-w-0">
                          {/*
                            Strikethrough means "replace this", so it must never
                            land on a sentence we are praising — that reads as if
                            the good sentence were wrong. Praise gets the wavy
                            line instead, matching the pen mark on paper.
                          */}
                          <span
                            className={`font-serif ${
                              a.suggestedText
                                ? 'text-slate-500 line-through decoration-red-400'
                                : a.type === 'highlight'
                                  ? 'text-amber-900 teacher-wavy-gold'
                                  : 'text-slate-600'
                            }`}
                          >
                            {a.originalText}
                          </span>
                          {a.suggestedText ? (
                            <>
                              <span className="text-slate-300 mx-1">→</span>
                              <span className={`font-serif font-bold px-1.5 py-0.5 rounded border ${meta.fixClass}`}>
                                {a.suggestedText}
                              </span>
                            </>
                          ) : (
                            <span className="ml-1.5 text-[11px] font-bold text-amber-700">
                              {a.category || '好句'}
                            </span>
                          )}
                          <div className="text-slate-600 mt-0.5">{a.explanation}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
