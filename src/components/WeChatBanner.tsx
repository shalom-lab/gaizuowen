import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';

function isWeChatBrowser(): boolean {
  try {
    return /MicroMessenger/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

/**
 * WeChat works fine for capture + grading. Only save-file / install-to-home
 * are limited — hint gently, never block her from using the app here.
 */
export const WeChatBanner: React.FC = () => {
  const [visible, setVisible] = useState(() => isWeChatBrowser());
  if (!visible) return null;

  return (
    <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
      <div className="flex items-start gap-2.5">
        <ExternalLink className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 text-[12px] text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-800">微信里可以直接批改</p>
          <p className="mt-1">
            拍照、提交、看结果都没问题。若要「保存文件」或「安装到桌面」，可点右上角
            <b> ··· </b>→「在浏览器打开」后再操作；不需要也可以继续用。
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="p-1 rounded-lg text-slate-400 active:bg-slate-100 shrink-0"
          aria-label="关闭提示"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
