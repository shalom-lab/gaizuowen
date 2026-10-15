import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'deepseek-zuowen-install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function isWeChat(): boolean {
  try {
    return /MicroMessenger/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

/**
 * Android Chrome (and some Harmony browsers) fire beforeinstallprompt.
 * Surface a one-tap「安装到桌面」— the main path for our teacher audience.
 */
export const InstallBanner: React.FC = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || isWeChat()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* ignore */
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!visible || !deferred) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setVisible(false);
  };

  return (
    <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
      <div className="flex items-start gap-2.5">
        <Download className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-rose-900">安装到手机桌面</p>
          <p className="mt-1 text-[11px] text-rose-800/90 leading-relaxed">
            装好后从桌面图标打开，全屏使用，保存文件也更稳定。
          </p>
          <button
            onClick={install}
            className="mt-2.5 px-3.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold active:scale-95"
          >
            立即安装
          </button>
        </div>
        <button
          onClick={dismiss}
          className="p-1 rounded-lg text-rose-400 active:bg-rose-100 shrink-0"
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
