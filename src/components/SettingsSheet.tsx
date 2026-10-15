import React, { useState } from 'react';
import { X, KeyRound, Check, Loader2, Eye, EyeOff, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import {
  Secrets,
  saveApiKey,
  saveBaseUrl,
  clearApiKey,
  clearAllSecrets,
  maskKey,
  DEFAULT_BASE_URL,
} from '../utils/byok';
import { verifyApiKey } from '../../shared/deepseek.mjs';

interface SettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  secrets: Secrets;
  onSecretsChanged: (next: Secrets) => void;
  /** Opens the in-app usage guide. */
  onOpenHelp?: () => void;
}

/**
 * BYOK settings. Password-style input, masked status, optional key test.
 * Nothing is shown in full once saved, and nothing leaves the browser except
 * the request to api.deepseek.com.
 */
export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isOpen,
  onClose,
  secrets,
  onSecretsChanged,
  onOpenHelp,
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [baseInput, setBaseInput] = useState(secrets.baseUrl === DEFAULT_BASE_URL ? '' : secrets.baseUrl);
  const [reveal, setReveal] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!isOpen) return null;

  const buildNextSecrets = (over: Partial<Secrets> = {}): Secrets => ({
    apiKey: keyInput.trim() || secrets.apiKey,
    baseUrl: baseInput.trim() || DEFAULT_BASE_URL,
    fromEnv: false,
    ...over,
  });

  const handleSave = () => {
    if (keyInput.trim()) saveApiKey(keyInput);
    saveBaseUrl(baseInput);
    setKeyInput('');
    onSecretsChanged(buildNextSecrets());
    setTestResult(null);
  };

  const handleTest = async () => {
    const key = keyInput.trim() || secrets.apiKey;
    if (!key) {
      setTestResult({ ok: false, msg: '请先填入 API Key' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const r = await verifyApiKey({ apiKey: key, baseUrl: baseInput.trim() || DEFAULT_BASE_URL });
      setTestResult(r.ok ? { ok: true, msg: '连接成功，密钥可用' } : { ok: false, msg: r.error || '密钥不可用' });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e?.message || '连接失败' });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    if (!confirm('确定清除浏览器中保存的 API Key？')) return;
    clearApiKey();
    setKeyInput('');
    setTestResult(null);
    onSecretsChanged({ ...secrets, apiKey: '', fromEnv: false });
  };

  const handleClearAll = () => {
    if (!confirm('确定清除全部本地配置（API Key、API 地址、GitHub 信息）？')) return;
    clearAllSecrets();
    setKeyInput('');
    setBaseInput('');
    setTestResult(null);
    onSecretsChanged({ apiKey: '', baseUrl: DEFAULT_BASE_URL, fromEnv: false });
  };

  const hasKey = Boolean(secrets.apiKey);
  const savedBase = secrets.baseUrl === DEFAULT_BASE_URL ? '' : secrets.baseUrl;
  const dirty = Boolean(keyInput.trim() || baseInput !== savedBase);

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
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900">设置</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 active:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {/* --- API key --- */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">DeepSeek API Key</label>
              {hasKey ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-700">
                  <Check className="w-3 h-3" />
                  已保存 {secrets.fromEnv ? '（来自本地 .env）' : maskKey(secrets.apiKey)}
                </span>
              ) : (
                <span className="text-[11px] text-amber-700">未设置</span>
              )}
            </div>

            <div className="relative">
              <input
                type={reveal ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={hasKey ? '填入新 Key 可覆盖已保存的' : 'sk-...'}
                className="w-full pl-3 pr-11 py-3 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50"
              />
              <button
                onClick={() => setReveal((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 active:bg-slate-100"
                aria-label={reveal ? '隐藏' : '显示'}
              >
                {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed">
              密钥只保存在本机浏览器（localStorage），不会上传到任何服务器。
              申请地址：
              <a
                href="https://platform.deepseek.com/api_keys"
                target="_blank"
                rel="noreferrer"
                className="text-rose-600 underline ml-0.5 inline-flex items-center gap-0.5"
              >
                platform.deepseek.com
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>

            {/* The one thing that blocks her completely, answerable in place. */}
            {onOpenHelp && (
              <button
                onClick={onOpenHelp}
                className="mt-2 text-[11px] font-semibold text-rose-600 underline"
              >
                不知道去哪拿 Key？查看使用帮助
              </button>
            )}

            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={handleTest}
                disabled={testing || (!keyInput.trim() && !secrets.apiKey)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-40 active:scale-95"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                {testing ? '测试中…' : '测试连接'}
              </button>
              {hasKey && (
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-500 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清除密钥
                </button>
              )}
            </div>

            {testResult && (
              <div
                className={`mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed p-2.5 rounded-lg ${
                  testResult.ok
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {testResult.ok ? <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                {testResult.msg}
              </div>
            )}
          </div>

          {/* --- Advanced --- */}
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs font-semibold text-slate-500 py-1"
          >
            {showAdvanced ? '收起高级设置' : '高级设置（API 地址）'}
          </button>

          {showAdvanced && (
            <div className="space-y-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">API 地址</label>
                <input
                  value={baseInput}
                  onChange={(e) => setBaseInput(e.target.value)}
                  placeholder={DEFAULT_BASE_URL}
                  spellCheck={false}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
                <p className="mt-1 text-[10px] text-slate-400">留空使用官方地址。可用于代理或兼容网关。</p>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                存储键名：<code className="font-mono">deepseek-zuowen-key</code>、
                <code className="font-mono"> deepseek-zuowen-base</code>。
                也可事先写入 localStorage，应用启动会自动读取。
              </p>

              <button
                onClick={handleClearAll}
                className="text-[11px] text-red-600 font-semibold"
              >
                清除全部本地配置
              </button>
            </div>
          )}
        </div>

        {/* --- Save bar --- */}
        <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-100 shrink-0">
          <button
            onClick={handleSave}
            disabled={!dirty}
            className={`w-full py-3.5 rounded-2xl font-bold text-base transition-transform ${
              dirty
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-200 active:scale-[0.98]'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
