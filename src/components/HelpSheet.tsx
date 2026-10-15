import React from 'react';
import { X, AlertTriangle, ExternalLink, ShieldAlert } from 'lucide-react';
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
 * 使用帮助 — the same guide as 使用说明.md, readable inside the app.
 *
 * This matters because the teacher opens the page on her phone and will never go
 * looking for a README on GitHub; "Key 去哪拿" is the one thing that blocks her
 * completely, so it has to be answerable without leaving the app.
 *
 * A bottom sheet (not a route) keeps it consistent with 设置 / 批改记录, and
 * avoids needing any client-side routing on GitHub Pages.
 */
export const HelpSheet: React.FC<HelpSheetProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-t-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-2.5 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        <div className="px-4 pt-3 pb-3 flex items-center justify-between shrink-0 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">使用帮助</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 active:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] space-y-6">
          <p className="text-[13px] text-slate-600 leading-relaxed">{HELP_INTRO}</p>

          {/* ---- Steps ---- */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3">六步上手</h3>
            <ol className="space-y-4">
              {HELP_STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-slate-800">{step.title}</div>
                    <ul className="mt-1.5 space-y-1">
                      {step.lines.map((line) => (
                        <li key={line} className="text-[12px] text-slate-600 leading-relaxed flex gap-1.5">
                          <span className="text-slate-300 shrink-0">·</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
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

          {/* ---- FAQ ---- */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3">常见问题</h3>
            <div className="space-y-2">
              {HELP_FAQ.map((item) => (
                <div key={item.q} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="text-[12px] font-semibold text-slate-800 flex gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    {item.q}
                  </div>
                  <div className="text-[12px] text-slate-600 mt-1 pl-5 leading-relaxed">{item.a}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ---- Colours ---- */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3">界面上的颜色含义</h3>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              {HELP_COLORS.map((row, i) => (
                <div
                  key={row.color}
                  className={`flex gap-3 px-3 py-2.5 text-[12px] ${
                    i % 2 ? 'bg-slate-50/70' : 'bg-white'
                  }`}
                >
                  <span className="font-semibold text-slate-700 shrink-0 w-[42%]">{row.color}</span>
                  <span className="text-slate-600">{row.meaning}</span>
                </div>
              ))}
            </div>
          </section>

          <p className="text-[11px] text-slate-400 leading-relaxed text-center pt-2">
            一句话总结：打开网页 → 填一次 Key → 拍作文 → 提交后接着拍下一篇 → 坐下来照抄批注。
          </p>
        </div>
      </div>
    </div>
  );
};
