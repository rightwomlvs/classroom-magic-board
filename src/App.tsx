import { useState } from 'react';
import { LogOut } from 'lucide-react';
import MagicBoard from './components/MagicBoard';
import HistoryPanel from './components/HistoryPanel';
import LoginScreen from './components/LoginScreen';
import { AuthProvider, useAuth, supabaseEnabled } from './lib/AuthContext';

type TabId = 'board' | 'history';

function AppInner() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<TabId>('board');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = () => setRefreshKey((k) => k + 1);

  // 有雲端設定但尚未登入 → 顯示登入畫面
  if (supabaseEnabled && !user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      {/* Top navigation */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center gap-1">
          <div className="mr-4 flex items-center gap-2 select-none">
            <span className="text-xl">🎉</span>
            <span className="font-bold text-slate-800 hidden sm:inline">Joy's Classroom Board</span>
          </div>
          {([
            { id: 'board' as TabId, label: '課堂白板', zh: 'Magic Board' },
            { id: 'history' as TabId, label: '歷史統計', zh: 'History' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2">
            {supabaseEnabled && user && (
              <span className="hidden md:inline text-xs text-slate-400 truncate max-w-[180px]">
                {user.email}
              </span>
            )}
            {supabaseEnabled && (
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                title="登出"
              >
                <LogOut className="w-4 h-4" /> 登出
              </button>
            )}
          </div>
        </div>
      </nav>

      {tab === 'board' ? (
        <MagicBoard onSaved={handleSaved} />
      ) : (
        <HistoryPanel refreshKey={refreshKey} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
