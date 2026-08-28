import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  BookOpen, VolumeX, Users, Edit3, Wrench, Coffee,
  Play, Pause, RotateCcw, Maximize2, Minimize2, X, Type, Palette, Bold,
  Camera, Download, Upload, Award, ChevronRight, ChevronDown, Plus, UserX,
  Moon, Smartphone, ClipboardList, Cloud, CloudOff, Save
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getScoreColor, getStatusById, type StatusOption } from '../lib/constants';
import type { LessonRecord, StudentStatus, TaskItem } from '../types';
import { downloadJSON, parseSnap } from '../lib/storage';
import { getSupabaseClient, getCurrentUser, supabaseEnabled, LESSONS_TABLE } from '../lib/supabase';

// --- Bilingual Text Component ---
interface DualTextProps {
  en: string;
  zh: string;
  center?: boolean;
  light?: boolean;
}
const DualText = ({ en, zh, center = false, light = false }: DualTextProps) => (
  <div className={`flex flex-col ${center ? 'items-center' : 'items-start'} leading-tight`}>
    <span className={`font-semibold ${light ? 'text-slate-100' : 'text-slate-800'}`}>{en}</span>
    <span className={`text-[0.65rem] md:text-xs mt-0.5 ${light ? 'text-slate-300' : 'text-slate-500'}`}>{zh}</span>
  </div>
);

// --- Status Constants (from constants.ts) ---
const STATUS_OPTIONS: StatusOption[] = [
  { id: 'read', en: 'Self Reading', zh: '自己閱讀', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'quiet', en: 'Keep Quiet', zh: '保持安靜', icon: VolumeX, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'discuss', en: 'Group Discussion', zh: '小組討論', icon: Users, color: 'text-green-500', bg: 'bg-green-50' },
  { id: 'exercise', en: 'Write Exercises', zh: '寫習題', icon: Edit3, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'task', en: 'Task Operation', zh: '操作任務', icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'rest', en: 'Rest Time', zh: '休息', icon: Coffee, color: 'text-teal-500', bg: 'bg-teal-50' },
];

const genId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

interface MagicBoardProps {
  /** 存檔到雲端成功後觸發（讓歷史統計重新整理） */
  onSaved?: () => void;
}

export default function MagicBoard({ onSaved }: MagicBoardProps) {
  // -- Board Settings State --
  const [wbFontSize, setWbFontSize] = useLocalStorage('cmb_wbFontSize', 36);
  const [wbColor, setWbColor] = useLocalStorage('cmb_wbColor', '#ffffff');
  const [wbBold, setWbBold] = useLocalStorage('cmb_wbBold', false);
  const [currentDate, setCurrentDate] = useState('');
  const boardRef = useRef<HTMLDivElement>(null);

  // -- Class Info State --
  const [className, setClassName] = useLocalStorage('cmb_className', '202');

  // -- Colorful Welcome Text --
  const [welcomeNodes] = useState<{ char: string; color: string }[]>(() => {
    const text = "Welcome to Joy's Class";
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
      '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
    ];
    return text.split('').map((char) => ({
      char,
      color: char === ' ' ? 'inherit' : colors[Math.floor(Math.random() * colors.length)]
    }));
  });

  // -- Preparation --
  const [prepTitle, setPrepTitle] = useLocalStorage('cmb_prepTitle', 'Preparation / 課前準備');
  const [prepContent, setPrepContent] = useLocalStorage('cmb_prepContent', 'Please put your phone in the designated place, clear your desk, and get ready for class.\n請把手機放到指定位置，將桌面收乾淨，準備上課。');

  // -- Tasks --
  const [boardTitle, setBoardTitle] = useLocalStorage('cmb_boardTitle', '今日重點任務：');
  const [tasks, setTasks] = useLocalStorage<TaskItem[]>('cmb_tasks', []);
  const [activeTaskId, setActiveTaskId] = useState<string | null>('prep');

  // -- Reminder --
  const [reminderTitle, setReminderTitle] = useLocalStorage('cmb_reminderTitle', 'Reminder / 溫馨提醒');
  const [reminderContent, setReminderContent] = useLocalStorage('cmb_reminderContent', "Finish today's tasks today! Please complete all tasks for this week by the weekend at the latest!\n今日事今日畢，最慢請在周末完成本周各項任務！");

  const handleAddTask = () => {
    const newId = genId();
    setTasks([...tasks, { id: newId, title: `${tasks.length + 1}. 新任務事項`, content: '' }]);
    setActiveTaskId(newId);
  };

  const handleDeleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(tasks.filter((t) => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const handleTaskTitleChange = (id: string, newTitle: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, title: newTitle } : t)));
  };

  const handleTaskContentBlur = (id: string, htmlContent: string) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, content: htmlContent } : t)));
  };

  // -- Timer --
  const [timerTask, setTimerTask] = useLocalStorage('cmb_timerTask', '');
  const [timerInput, setTimerInput] = useLocalStorage('cmb_timerInput', '10');
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [showTimerOverlay, setShowTimerOverlay] = useState(false);
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (timerActive) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil(((endTimeRef.current ?? 0) - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) setTimerActive(false);
      }, 250);
      setTimeLeft(Math.max(0, Math.ceil(((endTimeRef.current ?? 0) - Date.now()) / 1000)));
    }
    return () => { if (interval) clearInterval(interval); };
  }, [timerActive]);

  const toggleTimer = (fromSidebar = false) => {
    if (!timerActive && timeLeft === 0) {
      const totalSeconds = parseInt(timerInput) * 60 || 0;
      setTimeLeft(totalSeconds);
      if (totalSeconds > 0) {
        endTimeRef.current = Date.now() + totalSeconds * 1000;
        setTimerActive(true);
      }
      if (fromSidebar) setShowTimerOverlay(true);
    } else if (timerActive) {
      endTimeRef.current = null;
      setTimerActive(false);
      if (fromSidebar) setShowTimerOverlay(true);
    } else {
      endTimeRef.current = Date.now() + timeLeft * 1000;
      setTimerActive(true);
      if (fromSidebar) setShowTimerOverlay(true);
    }
  };

  const resetTimer = () => {
    setTimerActive(false);
    endTimeRef.current = null;
    setTimeLeft(parseInt(timerInput) * 60 || 0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // -- Picker --
  const [pickerTotal, setPickerTotal] = useLocalStorage('cmb_pickerTotal', 20);
  const [pickerCount, setPickerCount] = useLocalStorage('cmb_pickerCount', 1);
  const [pickedNumbers, setPickedNumbers] = useState<number[]>([]);

  // -- Status --
  const [activeStatus, setActiveStatus] = useState<StatusOption | null>(null);

  // -- Contribution (動態人數) --
  const [studentCount, setStudentCount] = useLocalStorage('cmb_studentCount', 21);
  const [contributions, setContributions] = useLocalStorage<number[]>('cmb_contributions', Array(21).fill(0));
  const [showContributionOverlay, setShowContributionOverlay] = useState(false);

  // -- Student Status --
  const [studentStatus, setStudentStatus] = useLocalStorage<StudentStatus>('cmb_studentStatus', {
    absent: '', sleeping: '', phone: '',
  });

  // -- Export --
  const [isCapturing, setIsCapturing] = useState(false);

  // 當 studentCount 改變時同步 contributions 長度
  useEffect(() => {
    setContributions((prev) => {
      const next = Array(studentCount).fill(0);
      for (let i = 0; i < studentCount && i < prev.length; i++) next[i] = prev[i];
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentCount]);

  // -- Initial Setup (日期) --
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    setCurrentDate(`${y}年${m}月${d}日 星期${days[now.getDay()]}`);
  }, []);

  // --- Picker Logic ---
  const handlePick = () => {
    const total = Number(pickerTotal);
    const count = Number(pickerCount);
    if (isNaN(total) || total <= 0 || isNaN(count) || count <= 0) return;
    const actualCount = Math.min(count, total);
    let allNums = Array.from({ length: total }, (_, i) => i + 1);
    const results: number[] = [];
    for (let i = 0; i < actualCount; i++) {
      const randomIndex = Math.floor(Math.random() * allNums.length);
      results.push(allNums[randomIndex]);
      allNums.splice(randomIndex, 1);
    }
    setPickedNumbers(results);
  };

  // --- Contribution Logic ---
  const handleContributionClick = (index: number, delta = 1) => {
    setContributions((prev) => prev.map((score, i) => {
      if (i !== index) return score;
      return Math.max(0, Math.min(10, score + delta));
    }));
  };

  const handleContributionContextMenu = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setContributions((prev) => prev.map((score, i) => {
      if (i !== index) return score;
      return Math.max(0, score - 1);
    }));
  };

  const handleAddAll = () => {
    setContributions((prev) => prev.map((score) => Math.min(10, score + 1)));
  };

  // --- 組裝本節課紀錄 ---
  const collectLesson = (): LessonRecord => {
    return {
      className: className || '未命名班級',
      date: currentDate.split(' ')[0],
      activeStatus: activeStatus?.id ?? null,
      tasks,
      prepTitle,
      prepContent,
      boardTitle,
      reminderTitle,
      reminderContent,
      contributions,
      studentCount,
      studentStatus,
    };
  };

  // --- 套用載入的課堂紀錄 ---
  const applyLesson = (lesson: LessonRecord) => {
    setClassName(lesson.className || className);
    setTasks(lesson.tasks || []);
    setPrepTitle(lesson.prepTitle || prepTitle);
    setPrepContent(lesson.prepContent || prepContent);
    setBoardTitle(lesson.boardTitle || boardTitle);
    setReminderTitle(lesson.reminderTitle || reminderTitle);
    setReminderContent(lesson.reminderContent || reminderContent);
    if (lesson.studentCount && lesson.studentCount > 0) setStudentCount(lesson.studentCount);
    if (lesson.contributions && lesson.contributions.length) setContributions(lesson.contributions);
    setStudentStatus(lesson.studentStatus || { absent: '', sleeping: '', phone: '' });
    if (lesson.activeStatus) setActiveStatus(getStatusById(lesson.activeStatus) ?? null);
  };

  // --- Export: 拍照 ---
  const takePhoto = async () => {
    if (isCapturing || !boardRef.current) return;
    setIsCapturing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 150));
      const canvas = await html2canvas(boardRef.current, {
        backgroundColor: '#4a5e4b',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `${className}_課堂板書_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('截圖失敗:', err);
      alert('拍照失敗，請再試一次。\nCapture failed, please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  // --- Export: TXT ---
  const exportTXT = () => {
    let txtContent = '';
    txtContent += `班級\t${className || '未命名班級'}\n`;
    txtContent += `日期\t${currentDate.split(' ')[0]}\n\n`;
    txtContent += `[今日重點任務]\n`;
    tasks.forEach((t) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = t.content;
      const cleanContent = (tempDiv.innerText || '').replace(/\n/g, ' ');
      txtContent += `${t.title}\t${cleanContent}\n`;
    });
    txtContent += `\n[課堂學生紀錄]\n`;
    txtContent += `座號\t貢獻次數\t缺席\t睡覺\t手機\n`;

    const absentArr = studentStatus.absent.split(',').map((s) => s.trim()).filter(Boolean);
    const sleepingArr = studentStatus.sleeping.split(',').map((s) => s.trim()).filter(Boolean);
    const phoneArr = studentStatus.phone.split(',').map((s) => s.trim()).filter(Boolean);

    for (let i = 0; i < studentCount; i++) {
      const seatNum = (i + 1).toString();
      const score = contributions[i] ?? 0;
      const isAbsent = absentArr.includes(seatNum) ? 'V' : '';
      const isSleeping = sleepingArr.includes(seatNum) ? 'V' : '';
      const isPhone = phoneArr.includes(seatNum) ? 'V' : '';
      if (score > 0 || isAbsent || isSleeping || isPhone) {
        txtContent += `${seatNum}\t${score}\t${isAbsent}\t${isSleeping}\t${isPhone}\n`;
      }
    }

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${className || 'Class'}_課堂紀錄_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // --- Export: JSON 備份 ---
  const exportJSON = () => {
    const date = currentDate.split(' ')[0] || new Date().toISOString().slice(0, 10);
    downloadJSON(`${className || 'Class'}_課堂備份_${date}.json`, collectLesson());
  };

  // --- Import: JSON 備份 ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const lesson = parseSnap(String(e.target?.result));
        applyLesson(lesson);
        alert('備份已匯入！\nBackup imported successfully.');
      } catch (err) {
        alert(`匯入失敗：${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  // --- Cloud: 存到 Supabase ---
  const [cloudMsg, setCloudMsg] = useState('');
  const saveToCloud = async () => {
    const db = getSupabaseClient();
    if (!db) {
      setCloudMsg('未設定雲端資料庫 (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)，請見 README');
      return;
    }
    const user = await getCurrentUser();
    if (!user) {
      setCloudMsg('尚未登入，無法存到雲端。請重新整理頁面登入。');
      return;
    }
    const lesson = collectLesson();
    const { error } = await db.from(LESSONS_TABLE).insert([{ ...lesson, owner_id: user.id }]);
    if (error) {
      console.error(error);
      setCloudMsg(`雲端存檔失敗：${error.message}`);
    } else {
      setCloudMsg(`已於 ${new Date().toLocaleTimeString()} 存檔到雲端`);
      onSaved?.();
      setTimeout(() => setCloudMsg(''), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] flex flex-col lg:flex-row p-4 gap-4 text-slate-800">
      {/* ================= LEFT MAIN: BLACKBOARD & OVERLAY ================= */}
      <div className="flex-1 flex flex-col relative gap-3 min-h-[60vh]">

        {/* Toolbar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl select-none">🎉</span>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="輸入班級..."
              className="text-xl font-bold tracking-wide bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-500 focus:outline-none w-16 md:w-20 text-slate-800 py-1 transition-colors"
            />
            <div className="text-lg md:text-xl font-extrabold tracking-wide select-none ml-2 flex gap-[1px]">
              {welcomeNodes.map((node, i) => (
                <span key={i} style={{ color: node.color }}>{node.char}</span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
              <Palette className="w-4 h-4 text-slate-400" />
              <input type="color" value={wbColor} onChange={(e) => setWbColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
              <Type className="w-4 h-4 text-slate-400 ml-2" />
              <input type="range" min="16" max="120" value={wbFontSize} onChange={(e) => setWbFontSize(Number(e.target.value))} className="w-20 accent-slate-600" />
              <button onClick={() => setWbBold(!wbBold)} className={`p-1.5 ml-2 rounded-md border transition-colors ${wbBold ? 'bg-slate-200 border-slate-300 text-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                <Bold className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={takePhoto} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors">
                <Camera className="w-4 h-4" />
                <DualText en="Take Photo" zh="拍照存檔" />
              </button>
              <button onClick={exportTXT} className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                <DualText en="Export TXT" zh="匯出試算表文字" />
              </button>
              <button onClick={exportJSON} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                <DualText en="Export JSON" zh="匯出備份" />
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-1.5 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 rounded-lg transition-colors">
                <Upload className="w-4 h-4" />
                <DualText en="Import JSON" zh="匯入備份" />
              </button>
              <button onClick={saveToCloud} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-700 border border-slate-800 rounded-lg transition-colors">
                {supabaseEnabled ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
                <DualText en={supabaseEnabled ? 'Save Cloud' : 'Cloud Off'} zh={supabaseEnabled ? '存到雲端' : '雲端未設定'} light />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportJSON(f);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        </div>

        {cloudMsg && (
          <div className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm">{cloudMsg}</div>
        )}

        <style>{`
          .magic-board-content img { max-width: 100%; height: auto; border-radius: 12px; margin-top: 16px; margin-bottom: 16px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3); }
          .task-content-area:empty:before { content: "點擊此處貼上圖片或輸入細節內容..."; color: rgba(255, 255, 255, 0.3); font-style: italic; }
        `}</style>

        {/* Blackboard */}
        <div className="bg-[#a67c52] p-3 rounded-2xl shadow-lg flex-1 flex flex-col relative">
          <div ref={boardRef} className="bg-[#4a5e4b] rounded-xl flex-1 relative flex flex-col overflow-hidden">
            <div className="absolute top-5 right-6 text-white/80 text-sm font-medium tracking-widest z-10 select-none drop-shadow-md">
              {currentDate}
            </div>

            <div className="flex-1 w-full p-8 pt-16 overflow-y-auto magic-board-content">
              {/* Preparation */}
              {!isCapturing && (
                <div className="mb-6 pb-6 border-b border-white/20 border-dashed">
                  <div className={`rounded-xl border transition-all duration-300 ${activeTaskId === 'prep' ? 'bg-white/10 border-white/20 pb-4' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                    <div className="flex items-center gap-3 p-4 cursor-pointer group" onClick={() => setActiveTaskId(activeTaskId === 'prep' ? null : 'prep')}>
                      {activeTaskId === 'prep' ? <ChevronDown className="w-6 h-6 text-emerald-300 shrink-0" /> : <ChevronRight className="w-6 h-6 text-white/50 shrink-0" />}
                      <input
                        value={prepTitle}
                        onChange={(e) => setPrepTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="輸入課前準備標題..."
                        className={`flex-1 bg-transparent focus:outline-none font-bold transition-all ${activeTaskId === 'prep' ? 'text-emerald-300 text-2xl' : 'text-white/80 text-xl'}`}
                      />
                    </div>
                    {activeTaskId === 'prep' && (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => setPrepContent(e.currentTarget.innerHTML)}
                        dangerouslySetInnerHTML={{ __html: prepContent }}
                        className="px-4 ml-10 focus:outline-none min-h-[80px] break-words whitespace-pre-wrap task-content-area"
                        style={{ fontSize: `${wbFontSize}px`, color: wbColor, fontWeight: wbBold ? 'bold' : 'normal', lineHeight: '1.5' }}
                      />
                    )}
                  </div>
                </div>
              )}

              <input
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                className="w-full bg-transparent text-white/95 text-3xl font-bold mb-8 focus:outline-none placeholder-white/40"
                placeholder="在此輸入大標題 (例如：今日重點任務)"
              />

              <div className="space-y-3">
                {tasks.map((task) => {
                  const isActive = activeTaskId === task.id;
                  return (
                    <div key={task.id} className={`rounded-xl border transition-all duration-300 ${isActive ? 'bg-white/10 border-white/20 pb-4' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                      <div className="flex items-center gap-3 p-4 cursor-pointer group" onClick={() => setActiveTaskId(isActive ? null : task.id)}>
                        {isActive ? <ChevronDown className="w-6 h-6 text-emerald-300 shrink-0" /> : <ChevronRight className="w-6 h-6 text-white/50 shrink-0" />}
                        <input
                          value={task.title}
                          onChange={(e) => handleTaskTitleChange(task.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="輸入任務標題..."
                          className={`flex-1 bg-transparent focus:outline-none font-bold transition-all ${isActive ? 'text-emerald-300 text-2xl' : 'text-white/80 text-xl'}`}
                        />
                        {!isCapturing && (
                          <button onClick={(e) => handleDeleteTask(task.id, e)} className="opacity-0 group-hover:opacity-100 text-red-300/70 hover:text-red-300 transition-opacity p-2 rounded-lg hover:bg-white/10" title="刪除此任務">
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      {(isActive || isCapturing) && (
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => handleTaskContentBlur(task.id, e.currentTarget.innerHTML)}
                          dangerouslySetInnerHTML={{ __html: task.content }}
                          className="px-4 ml-10 focus:outline-none min-h-[80px] break-words whitespace-pre-wrap task-content-area pb-4"
                          style={{ fontSize: `${wbFontSize}px`, color: wbColor, fontWeight: wbBold ? 'bold' : 'normal', lineHeight: '1.5' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {!isCapturing && (
                <button onClick={handleAddTask} className="mt-6 ml-4 flex items-center gap-2 text-white/50 hover:text-white transition-colors px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-white/50 hover:bg-white/5 w-fit">
                  <Plus className="w-5 h-5" />
                  <span className="font-medium tracking-wider">新增任務項目</span>
                </button>
              )}

              {!isCapturing && (
                <div className="mt-8 pt-4 border-t border-white/20 border-dashed">
                  <div className={`rounded-xl border transition-all duration-300 ${activeTaskId === 'reminder' ? 'bg-white/10 border-white/20 pb-4' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
                    <div className="flex items-center gap-3 p-4 cursor-pointer group" onClick={() => setActiveTaskId(activeTaskId === 'reminder' ? null : 'reminder')}>
                      {activeTaskId === 'reminder' ? <ChevronDown className="w-6 h-6 text-emerald-300 shrink-0" /> : <ChevronRight className="w-6 h-6 text-white/50 shrink-0" />}
                      <input
                        value={reminderTitle}
                        onChange={(e) => setReminderTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="輸入提醒標題..."
                        className={`flex-1 bg-transparent focus:outline-none font-bold transition-all ${activeTaskId === 'reminder' ? 'text-emerald-300 text-2xl' : 'text-white/80 text-xl'}`}
                      />
                    </div>
                    {activeTaskId === 'reminder' && (
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => setReminderContent(e.currentTarget.innerHTML)}
                        dangerouslySetInnerHTML={{ __html: reminderContent }}
                        className="px-4 ml-10 focus:outline-none min-h-[80px] break-words whitespace-pre-wrap task-content-area"
                        style={{ fontSize: `${wbFontSize}px`, color: wbColor, fontWeight: wbBold ? 'bold' : 'normal', lineHeight: '1.5' }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Contribution & Status snapshot for export */}
            {isCapturing && (
              <div className="p-8 pt-0 text-white/90 shrink-0">
                <div className="border-t border-white/20 pt-5">
                  <h3 className="text-xl font-bold mb-4 tracking-widest text-emerald-100 flex items-center gap-2">
                    <Award className="w-5 h-5" /> 課堂貢獻版紀錄
                  </h3>
                  <div className="flex flex-wrap gap-3 mb-6">
                    {contributions.some((s) => s > 0) ? (
                      contributions.map((score, index) => score > 0 ? (
                        <div key={index} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl border border-white/20 shadow-sm">
                          <span className="font-bold text-lg">{index + 1}號</span>
                          <span className="text-emerald-200 text-sm">({score}次)</span>
                        </div>
                      ) : null)
                    ) : (
                      <span className="text-white/50">目前無任何紀錄</span>
                    )}
                  </div>
                  {(studentStatus.absent || studentStatus.sleeping || studentStatus.phone) && (
                    <>
                      <h3 className="text-xl font-bold mb-4 tracking-widest text-orange-100 flex items-center gap-2 pt-4 border-t border-white/10">
                        <ClipboardList className="w-5 h-5" /> 學生狀況紀錄
                      </h3>
                      <div className="flex flex-col gap-2 text-lg">
                        {studentStatus.absent && (
                          <div className="flex items-center gap-3">
                            <span className="text-red-300 font-bold w-24">缺席座號：</span>
                            <span className="text-white">{studentStatus.absent}</span>
                          </div>
                        )}
                        {studentStatus.sleeping && (
                          <div className="flex items-center gap-3">
                            <span className="text-indigo-300 font-bold w-24">睡覺座號：</span>
                            <span className="text-white">{studentStatus.sleeping}</span>
                          </div>
                        )}
                        {studentStatus.phone && (
                          <div className="flex items-center gap-3">
                            <span className="text-orange-300 font-bold w-24">手機座號：</span>
                            <span className="text-white">{studentStatus.phone}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TIMER OVERLAY */}
        {showTimerOverlay && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-3xl">
            <button onClick={() => setShowTimerOverlay(false)} className="absolute top-6 right-6 p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
              <Minimize2 className="w-6 h-6" />
            </button>
            <div className="text-center w-full max-w-4xl px-4">
              <h2 className="text-4xl md:text-5xl text-slate-500 font-medium tracking-widest mb-12">
                {timerTask || 'Ready / 準備'}
              </h2>
              <div className="text-[6rem] md:text-[12rem] font-mono tracking-tighter text-slate-800 mb-16 leading-none shadow-sm bg-slate-50 rounded-3xl py-8 border border-slate-100">
                {formatTime(timeLeft)}
              </div>
              <div className="flex gap-4 justify-center">
                <button onClick={() => toggleTimer(false)} className={`px-12 py-6 rounded-3xl flex items-center justify-center gap-4 font-medium transition-all text-2xl ${timerActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 hover:scale-105' : 'bg-slate-800 text-white hover:bg-slate-700 hover:scale-105 shadow-lg'}`}>
                  {timerActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                  <DualText en={timerActive ? 'Pause' : 'Start'} zh={timerActive ? '暫停' : '開始'} center light={!timerActive} />
                </button>
                <button onClick={resetTimer} className="px-8 py-6 bg-slate-100 text-slate-600 rounded-3xl hover:bg-slate-200 transition-all hover:scale-105 flex items-center justify-center shadow-sm border border-slate-200">
                  <RotateCcw className="w-8 h-8" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STATUS OVERLAY (超大圖示+文字，適合投影) */}
        {activeStatus && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-3xl">
            <button onClick={() => setActiveStatus(null)} className="absolute top-6 right-6 p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className={`p-12 rounded-full ${activeStatus.bg} ${activeStatus.color} mb-8 shadow-inner`}>
              <activeStatus.icon className="w-40 h-40 md:w-64 md:h-64" strokeWidth={1.5} />
            </div>
            <h2 className={`text-6xl md:text-8xl font-bold tracking-tight mb-4 ${activeStatus.color}`}>
              {activeStatus.en}
            </h2>
            <p className="text-4xl md:text-5xl text-slate-500 font-medium tracking-widest mt-2">
              {activeStatus.zh}
            </p>
            <p className="mt-8 text-slate-400 text-sm">按右上角 ✕ 或任意鍵關閉</p>
          </div>
        )}
      </div>

      {/* ================= RIGHT SIDEBAR: TOOLS ================= */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4 overflow-y-auto max-h-screen pb-6 pr-2">

        {/* Tool 1: Contribution Board */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col gap-3 mb-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
                <Award className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <DualText en="Contribution Board" zh="課堂貢獻版" />
              </div>
              <button onClick={() => setShowContributionOverlay(true)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors mr-1" title="全螢幕放大">
                <Maximize2 className="w-4 h-4" />
              </button>
              <button onClick={() => setContributions(Array(studentCount).fill(0))} className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="flex gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <label className="text-[0.6rem] text-slate-400 whitespace-nowrap font-medium">人數</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={studentCount}
                  onChange={(e) => {
                    const n = parseInt(e.target.value);
                    if (!isNaN(n) && n > 0) setStudentCount(n);
                  }}
                  className="w-10 bg-transparent text-center text-sm font-bold text-slate-700 focus:outline-none"
                  title="設定學生人數"
                />
              </div>
              <button onClick={handleAddAll} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded-lg text-xs font-medium transition-colors">
                <Plus className="w-3 h-3" /> 全班加分
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-4 relative">
            {contributions.map((score, index) => (
              <button
                key={index}
                onClick={() => handleContributionClick(index)}
                onContextMenu={(e) => handleContributionContextMenu(index, e)}
                className={`w-full aspect-square rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${getScoreColor(score)} hover:opacity-80`}
                title="左鍵加分 / 右鍵扣分"
              >
                {index + 1}
              </button>
            ))}
          </div>

          <div className="flex flex-col xl:flex-row items-center justify-between text-[0.65rem] text-slate-400 border-t border-slate-100 pt-3 gap-2">
            <span>Points Level / 點擊次數 (0-10):</span>
            <div className="flex gap-1 flex-wrap justify-center">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                <div key={s} className={`w-4 h-4 rounded-full border ${getScoreColor(s)} flex items-center justify-center text-[0.5rem] font-bold`}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tool 1.5: Student Status */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <DualText en="Student Status" zh="學生狀況紀錄" />
            </div>
            <button onClick={() => setStudentStatus({ absent: '', sleeping: '', phone: '' })} className="text-xs flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
          <div className="space-y-4">
            {[
              { key: 'absent', icon: UserX, bg: 'bg-red-50', text: 'text-red-500', ring: 'focus:ring-red-200', en: 'Absent / 缺席座號' },
              { key: 'sleeping', icon: Moon, bg: 'bg-indigo-50', text: 'text-indigo-500', ring: 'focus:ring-indigo-200', en: 'Sleeping / 睡覺座號' },
              { key: 'phone', icon: Smartphone, bg: 'bg-orange-50', text: 'text-orange-500', ring: 'focus:ring-orange-200', en: 'Using Phone / 手機座號' },
            ].map((row) => {
              const Icon = row.icon as LucideIcon;
              return (
                <div key={row.key} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${row.bg} ${row.text} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[0.65rem] text-slate-400 mb-1 font-medium">{row.en}</div>
                    <input
                      type="text"
                      value={studentStatus[row.key as keyof StudentStatus]}
                      onChange={(e) => setStudentStatus({ ...studentStatus, [row.key]: e.target.value })}
                      className={`w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 ${row.ring} text-sm`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tool 2: Timer */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <Play className="w-5 h-5" />
            </div>
            <DualText en="Countdown Timer" zh="魔法計時器" />
          </div>
          <div className="space-y-4">
            <div>
              <DualText en="Current Task" zh="目前任務事項" />
              <input
                type="text"
                value={timerTask}
                onChange={(e) => setTimerTask(e.target.value)}
                placeholder="e.g. Math Quiz / 數學平時測驗"
                className="mt-2 w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm"
              />
            </div>
            <div>
              <DualText en="Minutes" zh="設定分鐘數" />
              <input
                type="number"
                min="1"
                value={timerInput}
                onChange={(e) => {
                  setTimerInput(e.target.value);
                  if (!timerActive) setTimeLeft(parseInt(e.target.value) * 60 || 0);
                }}
                className="mt-2 w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm text-center"
              />
            </div>
            <div className="py-4 flex flex-col items-center justify-center bg-slate-800 rounded-2xl text-white shadow-inner relative group cursor-pointer" onClick={() => setShowTimerOverlay(true)}>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-4 h-4 text-slate-400" />
              </div>
              <span className="text-slate-400 text-xs tracking-wider uppercase mb-1">{timerTask || 'Ready / 準備'}</span>
              <span className="text-5xl font-mono tracking-tighter">{formatTime(timeLeft)}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleTimer(true)} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${timerActive ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                {timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <DualText en={timerActive ? 'Pause' : 'Start'} zh={timerActive ? '暫停' : '開始'} center light={!timerActive} />
              </button>
              <button onClick={resetTimer} className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tool 3: Picker */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <Users className="w-5 h-5" />
            </div>
            <DualText en="Random Picker" zh="班級點名版" />
          </div>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <DualText en="Total" zh="總人數" />
              <input type="number" min="1" value={pickerTotal} onChange={(e) => setPickerTotal(Number(e.target.value))} className="mt-2 w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm text-center" />
            </div>
            <div className="flex-1">
              <DualText en="Count" zh="一次抽幾個" />
              <input type="number" min="1" value={pickerCount} onChange={(e) => setPickerCount(Number(e.target.value))} className="mt-2 w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-sm text-center" />
            </div>
          </div>
          <button onClick={handlePick} className="w-full py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center mb-4">
            <DualText en="Draw Numbers" zh="開始抽籤" center light />
          </button>
          {pickedNumbers.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap gap-2 justify-center">
              {pickedNumbers.map((num, idx) => (
                <div key={idx} className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-700">
                  {num}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tool 4: Status Icons */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <Maximize2 className="w-5 h-5" />
            </div>
            <DualText en="Classroom Status" zh="班級秩序管理圖示" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status.id}
                onClick={() => setActiveStatus(status)}
                className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-2 border border-slate-100 transition-all hover:scale-105 ${status.bg} hover:shadow-sm`}
              >
                <status.icon className={`w-8 h-8 ${status.color}`} />
                <DualText en={status.en} zh={status.zh} center />
              </button>
            ))}
          </div>
        </div>

        {/* Tool 5: Save/Export helper */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-600">
              <Save className="w-5 h-5" />
            </div>
            <DualText en="Save & Backup" zh="存檔與備份" />
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            將本節課內容存成 JSON 備份檔（可隨時匯入還原），或存到雲端資料庫做歷史統計。
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={exportJSON} className="w-full py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-sm font-medium transition-colors">
              匯出本節課 JSON
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 rounded-xl text-sm font-medium transition-colors">
              匯入 JSON 備份
            </button>
            <button onClick={saveToCloud} className="w-full py-2.5 bg-slate-800 text-white hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {supabaseEnabled ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
              {supabaseEnabled ? '存到雲端資料庫' : '雲端未設定'}
            </button>
          </div>
        </div>
      </div>

      {/* ================= FULLSCREEN CONTRIBUTION OVERLAY ================= */}
      {showContributionOverlay && (
        <div className="fixed inset-0 bg-[#f4f1ea] z-50 flex flex-col items-center justify-center p-4 md:p-8">
          <button onClick={() => setShowContributionOverlay(false)} className="absolute top-6 right-6 p-4 bg-white hover:bg-slate-100 text-slate-600 rounded-full transition-colors shadow-sm border border-slate-200 z-10">
            <Minimize2 className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          <div className="w-full max-w-6xl flex flex-col gap-6 md:gap-8 h-full py-8 md:py-12">
            <div className="flex flex-col md:flex-row items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-200 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">課堂貢獻版</h2>
                  <p className="text-slate-500 font-medium">Contribution Board</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={handleAddAll} className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-lg font-bold transition-colors">
                  <Plus className="w-6 h-6" /> 全班加分
                </button>
                <button onClick={() => setContributions(Array(studentCount).fill(0))} className="flex items-center gap-2 px-6 py-3 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl text-lg font-bold transition-colors">
                  <RotateCcw className="w-6 h-6" /> 重置 (Reset)
                </button>
              </div>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-4 md:gap-6 flex-1 min-h-0">
              {contributions.map((score, index) => (
                <button
                  key={index}
                  onClick={() => handleContributionClick(index)}
                  onContextMenu={(e) => handleContributionContextMenu(index, e)}
                  className={`w-full h-full min-h-[80px] rounded-full flex flex-col items-center justify-center font-bold border-4 transition-colors ${getScoreColor(score)} hover:scale-105 shadow-sm`}
                  title="左鍵加分 / 右鍵扣分"
                >
                  <span className="text-3xl md:text-5xl mb-1 md:mb-2">{index + 1}</span>
                  <span className="text-sm md:text-lg opacity-80">{score} 次</span>
                </button>
              ))}
            </div>
            <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-4 mt-auto shrink-0">
              <span className="text-base md:text-lg text-slate-500 font-bold">Points Level / 點擊次數 (0-10):</span>
              <div className="flex gap-2 flex-wrap justify-center">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                  <div key={s} className={`w-10 h-10 md:w-12 md:h-12 rounded-full border-2 ${getScoreColor(s)} flex items-center justify-center text-lg md:text-xl font-bold`}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
