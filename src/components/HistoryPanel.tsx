import { useEffect, useState, useCallback } from 'react';
import { CloudOff, RefreshCw, Award, ClipboardList, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import type { LessonRecord } from '../types';
import { getSupabaseClient, supabaseEnabled, LESSONS_TABLE } from '../lib/supabase';
import { getScoreColor, getStatusById } from '../lib/constants';

interface HistoryPanelProps {
  /** 外部觸發的重新整理計數（例如存檔後 +1） */
  refreshKey?: number;
}

export default function HistoryPanel({ refreshKey = 0 }: HistoryPanelProps) {
  const [records, setRecords] = useState<LessonRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = getSupabaseClient();
    if (!db) {
      setRecords([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error } = await db
        .from(LESSONS_TABLE)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRecords((data ?? []) as LessonRecord[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const handleDelete = async (id: string) => {
    const db = getSupabaseClient();
    if (!db) return;
    if (!window.confirm('確定刪除這節課的紀錄？此操作無法復原。')) return;
    const { error } = await db.from(LESSONS_TABLE).delete().eq('id', id);
    if (error) {
      alert(`刪除失敗：${error.message}`);
    }
    load();
  };

  // ---- 統計：全班總貢獻 ---- //
  const totalContributions = (r: LessonRecord) =>
    (r.contributions ?? []).reduce((sum, c) => sum + Math.min(10, c), 0);

  // ---- 統計：有貢獻學生數 ---- //
  const contributedCount = (r: LessonRecord) =>
    (r.contributions ?? []).filter((c) => c > 0).length;

  // ---- 統計：某狀況人數 ---- //
  const statusCount = (r: LessonRecord, key: 'absent' | 'sleeping' | 'phone') => {
    const raw = (r.studentStatus ?? {})[key] ?? '';
    return raw.split(',').map((s: string) => s.trim()).filter(Boolean).length;
  };

  const totals = {
    lessons: records.length,
    contributions: records.reduce((sum, r) => sum + totalContributions(r), 0),
    absents: records.reduce((sum, r) => sum + statusCount(r, 'absent'), 0),
    sleepings: records.reduce((sum, r) => sum + statusCount(r, 'sleeping'), 0),
    phones: records.reduce((sum, r) => sum + statusCount(r, 'phone'), 0),
  };

  // ---- 各座號累計貢獻（跨節課） ---- //
  const maxStudents = records.reduce((m, r) => Math.max(m, r.studentCount ?? 0), 0);
  const seatTotals: number[] = Array(maxStudents).fill(0);
  records.forEach((r) => {
    (r.contributions ?? []).forEach((c, i) => {
      if (i < seatTotals.length) seatTotals[i] += c;
    });
  });

  return (
    <div className="min-h-screen bg-[#f4f1ea] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">課堂歷史統計</h1>
            <p className="text-slate-500">History & Statistics</p>
          </div>
          <div className="flex items-center gap-2">
            {!supabaseEnabled && (
              <span className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm">
                <CloudOff className="w-4 h-4" /> 雲端未設定，無法載入歷史
              </span>
            )}
            <button
              onClick={load}
              disabled={!supabaseEnabled}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 重新整理
            </button>
          </div>
        </div>

        {!supabaseEnabled && (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 text-center">
            <p className="text-slate-500">
              請在專案根目錄的 <code className="bg-slate-100 px-1.5 py-0.5 rounded">.env</code> 設定{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> 與{' '}
              <code className="bg-slate-100 px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> 後重啟，才能使用歷史統計。
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-2xl p-4 mb-4 text-sm">
            載入失敗：{error}
          </div>
        )}

        {/* Summary cards */}
        {supabaseEnabled && records.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="text-xs text-slate-400 font-medium">總節數</div>
              <div className="text-3xl font-bold text-slate-800">{totals.lessons}</div>
              <div className="text-xs text-slate-400">課堂次數</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="text-xs text-slate-400 font-medium">累計貢獻</div>
              <div className="text-3xl font-bold text-emerald-600">{totals.contributions}</div>
              <div className="text-xs text-slate-400">次（總和）</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="text-xs text-slate-400 font-medium">缺席</div>
              <div className="text-3xl font-bold text-red-600">{totals.absents}</div>
              <div className="text-xs text-slate-400">人次</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="text-xs text-slate-400 font-medium">睡覺／手機</div>
              <div className="text-3xl font-bold text-indigo-600">{totals.sleepings + totals.phones}</div>
              <div className="text-xs text-slate-400">人次</div>
            </div>
          </div>
        )}

        {supabaseEnabled && records.length === 0 && !loading && (
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-slate-200 text-center">
            <Award className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">還沒有任何課堂紀錄。在白板頁按「存到雲端」即可開始累積歷史統計。</p>
          </div>
        )}

        {/* Per-seat contribution totals (cross-lesson) */}
        {supabaseEnabled && records.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" /> 各座號累計貢獻
            </h2>
            <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
              {seatTotals.map((score, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 ${getScoreColor(Math.min(10, score))}`}
                  title={`座號 ${i + 1}：累計 ${score} 次`}
                >
                  <span className="font-bold text-lg">{i + 1}</span>
                  <span className="text-xs opacity-80">{score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed records list */}
        {supabaseEnabled && (
          <div className="space-y-3">
            {records.map((r) => {
              const status = getStatusById(r.activeStatus);
              const isOpen = expanded === r.id;
              return (
                <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div
                    className="flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-slate-50"
                    onClick={() => setExpanded(isOpen ? null : (r.id ?? null))}
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                      <div>
                        <div className="font-bold text-slate-800">{r.className} · {r.date}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(r.created_at ?? '').toLocaleString()}
                          {status ? ` · 狀態：${status.zh}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden md:inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                        <Award className="w-3 h-3" /> 貢獻 {totalContributions(r)}次 / {contributedCount(r)}人
                      </span>
                      <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-lg">
                        <ClipboardList className="w-3 h-3" /> 缺席{statusCount(r, 'absent')} 睡{statusCount(r, 'sleeping')} 手機{statusCount(r, 'phone')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (r.id) handleDelete(r.id);
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="刪除這節課紀錄"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-slate-100 p-5">
                      {/* 任務 */}
                      <h3 className="font-bold text-slate-700 mb-2">{r.boardTitle || '今日重點任務'}</h3>
                      {r.tasks && r.tasks.length > 0 ? (
                        <ul className="space-y-2 mb-4">
                          {r.tasks.map((t) => (
                            <li key={t.id} className="text-sm">
                              <span className="font-semibold text-slate-700">{t.title}</span>
                              <div className="text-slate-500 text-xs whitespace-pre-wrap line-clamp-3">{stripHtml(t.content)}</div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-400 text-sm mb-4">本節課無任務紀錄</p>
                      )}

                      {/* 課前準備 / 提醒 */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        {r.prepContent && (
                          <div className="bg-slate-50 rounded-xl p-3">
                            <div className="font-semibold text-slate-700 text-sm mb-1">{r.prepTitle}</div>
                            <p className="text-slate-500 text-xs whitespace-pre-wrap line-clamp-3">{stripHtml(r.prepContent)}</p>
                          </div>
                        )}
                        {r.reminderContent && (
                          <div className="bg-slate-50 rounded-xl p-3">
                            <div className="font-semibold text-slate-700 text-sm mb-1">{r.reminderTitle}</div>
                            <p className="text-slate-500 text-xs whitespace-pre-wrap line-clamp-3">{stripHtml(r.reminderContent)}</p>
                          </div>
                        )}
                      </div>

                      {/* 貢獻明細 */}
                      <h4 className="font-bold text-slate-700 mb-2 text-sm">貢獻明細</h4>
                      {r.contributions && r.contributions.some((c) => c > 0) ? (
                        <div className="flex flex-wrap gap-2">
                          {r.contributions.map((score, i) => score > 0 ? (
                            <span key={i} className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${getScoreColor(score)}`}>
                              {i + 1}號 · {score}次
                            </span>
                          ) : null)}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-xs">無貢獻紀錄</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** 移除 HTML，保留純文字（供歷史明細顯示） */
function stripHtml(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
  const div = document.createElement('div');
  div.innerHTML = html;
  return (div.innerText || '').replace(/\n{3,}/g, '\n\n');
}
