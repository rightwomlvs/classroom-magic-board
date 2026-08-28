import { useState } from 'react';
import { Lock, Mail, LogIn, UserPlus, Cloud } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
        // 成功後 AuthContext 會自動切換，此畫面會卸載
      } else {
        try {
          await register(email.trim(), password);
          setMessage('註冊成功！請檢查 email 收件匣完成驗證，再回來登入。');
        } catch (err) {
          if ((err as Error).message === 'REGISTER_EMAIL_CONFIRM') {
            setMessage('帳號已建立，請檢查 email 完成驗證後再登入。');
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      setError(translateError((err as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#4a5e4b] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold text-slate-800">課堂魔法白板</h1>
          <p className="text-slate-500 text-sm">Classroom Magic Board</p>
          <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-medium">
            <Cloud className="w-3.5 h-3.5" /> 雲端歷史統計需要登入
          </span>
        </div>

        {/* mode toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          {([
            { id: 'login' as const, label: '登入', icon: LogIn },
            { id: 'register' as const, label: '註冊', icon: UserPlus },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => { setMode(t.id); setError(''); setMessage(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${mode === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">密碼</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          {message && <p className="text-emerald-600 text-sm bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">{message}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50"
          >
            {busy ? '處理中...' : mode === 'login' ? '登入' : '建立帳號'}
          </button>
        </form>

        <p className="text-[0.7rem] text-slate-400 mt-6 text-center leading-relaxed">
          僅登入者可編輯並累積歷史統計。此登入僅保護你的雲端資料，不會影響本機白板使用。
        </p>
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email 或密碼錯誤。';
  if (msg.includes('Email not confirmed')) return 'Email 尚未驗證，請先到信箱完成驗證。';
  if (msg.includes('User already registered')) return '此 Email 已註冊過，請直接登入。';
  if (msg.includes('Password should be at least')) return '密碼至少要 6 個字元。';
  if (msg.includes('Unable to validate email address')) return 'Email 格式無效。';
  return msg;
}
