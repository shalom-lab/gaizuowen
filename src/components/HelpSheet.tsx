import React, { useState } from 'react';
import {
  X,
  BookOpen,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  CircleHelp,
} from 'lucide-react';
import {
  HELP_INTRO,
  HELP_STEPS,
  HELP_KEY,
  HELP_FAQ,
  HELP_COLORS,
} from '../data/helpContent';

interface HelpSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 使用介绍 — same facts as README.md, shaped as a revisitable intro page.
 *
 * Not a one-shot onboarding: she can reopen it anytime from the header.
 * A near-full sheet (not a route) stays consistent with 设置 / 批改记录 and
 * avoids client-side routing on GitHub Pages.
 */
export const HelpSheet: React.FC<HelpSheetProps> = ({ isOpen, onClose }) => {
  const [faqOpen, setFaqOpen] = useState(false);
  const [colorsOpen, setColorsOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      <div
        className="sheet-panel sheet-panel-wide h-[min(92vh,720px)] md:h-[min(85vh,720px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-4 pt-2 pb-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <CircleHelp className="w-4 h-4 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900">使用介绍</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 active:bg-slate-100" aria-label="关闭">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-6">
          {/* ---- Hero ---- */}
          <section className="rounded-2xl bg-gradient-to-br from-rose-50 via-white to-slate-50 border border-rose-100 px-4 py-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-rose-600 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 leading-tight">作文批改助手</h3>
                <p className="text-[12px] text-rose-700 font-semibold mt-0.5">拍作文 · 出批注 · 照着抄</p>
              </div>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed">{HELP_INTRO}</p>
          </section>

          {/* ---- Steps as a journey ---- */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-1">怎么用</h3>
            <p className="text-[11px] text-slate-400 mb-4">六步上手，随时可以回来看</p>
            <ol className="relative space-y-0">
              {HELP_STEPS.map((step, i) => {
                const last = i === HELP_STEPS.length - 1;
                return (
                  <li key={step.title} className="relative flex gap-3">
                    {!last && (
                      <span
                        className="absolute left-[13px] top-8 bottom-0 w-px bg-rose-100"
                        aria-hidden
                      />
                    )}
                    <span className="relative z-[1] shrink-0 w-7 h-7 rounded-full bg-rose-600 text-white text-[12px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className={`min-w-0 flex-1 ${last ? 'pb-0' : 'pb-5'}`}>
                      <div className="text-[14px] font-bold text-slate-800 leading-snug pt-0.5">
                        {step.title}
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {step.lines.map((line) => (
                          <li key={line} className="text-[12px] text-slate-600 leading-relaxed">
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* ---- API Key ---- */}
          <section className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3">
            <h3 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              {HELP_KEY.title}
            </h3>

            <div>
              <div className="text-[11px] font-bold text-amber-900 mb-1">去哪里申请</div>
              <a
                href={HELP_KEY.url}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-rose-700 underline break-all inline-flex items-center gap-1"
              >
                {HELP_KEY.url}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">{HELP_KEY.urlHint}</p>
            </div>

            <div>
              <div className="text-[11px] font-bold text-amber-900 mb-1">{HELP_KEY.whatTitle}</div>
              <p className="text-[12px] text-amber-900 leading-relaxed">{HELP_KEY.what}</p>
            </div>

            <div>
              <div className="text-[11px] font-bold text-amber-900 mb-1">{HELP_KEY.costTitle}</div>
              <p className="text-[12px] text-amber-900 leading-relaxed">{HELP_KEY.cost}</p>
            </div>

            <div>
              <div className="text-[11px] font-bold text-amber-900 mb-1">{HELP_KEY.careTitle}</div>
              <p className="text-[12px] text-amber-900 leading-relaxed">{HELP_KEY.careLead}</p>
              <ul className="mt-1.5 space-y-1">
                {HELP_KEY.care.map((c) => (
                  <li key={c} className="text-[12px] text-amber-900 leading-relaxed flex gap-1.5">
                    <span className="shrink-0">{c.startsWith('本应用') ? '✅' : '❌'}</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-amber-200">
              <div className="text-[11px] font-bold text-amber-900 mb-1">{HELP_KEY.leakedTitle}</div>
              <p className="text-[12px] text-amber-900 leading-relaxed">{HELP_KEY.leaked}</p>
            </div>
          </section>

          {/* ---- Secondary: collapsed by default so the page reads as an intro ---- */}
          <section className="space-y-2 pb-1">
            <button
              type="button"
              onClick={() => setFaqOpen((v) => !v)}
              className="w-full flex items-center justify-between px-1 py-2 text-left"
            >
              <span className="text-sm font-bold text-slate-900">常见问题</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${faqOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {faqOpen && (
              <div className="space-y-3 pb-2">
                {HELP_FAQ.map((item) => (
                  <div key={item.q}>
                    <div className="text-[12px] font-semibold text-slate-800">{item.q}</div>
                    <div className="text-[12px] text-slate-600 mt-0.5 leading-relaxed">{item.a}</div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setColorsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-1 py-2 text-left border-t border-slate-100"
            >
              <span className="text-sm font-bold text-slate-900">界面上的颜色含义</span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${colorsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {colorsOpen && (
              <div className="space-y-2 pb-2">
                {HELP_COLORS.map((row) => (
                  <div key={row.color} className="flex gap-3 text-[12px]">
                    <span className="font-semibold text-slate-700 shrink-0 w-[42%]">{row.color}</span>
                    <span className="text-slate-600">{row.meaning}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-100 shrink-0">
          <p className="text-[11px] text-slate-400 text-center mb-2.5 leading-relaxed">
            打开网页 → 填一次 Key → 拍作文 → 提交后接着拍下一篇 → 坐下来照抄批注
          </p>
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-rose-600 text-white font-bold text-base shadow-lg shadow-rose-200 active:scale-[0.98] transition-transform"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
