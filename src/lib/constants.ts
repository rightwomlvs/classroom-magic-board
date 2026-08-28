import type { LucideIcon } from 'lucide-react';
import {
  BookOpen, VolumeX, Users, Edit3, Wrench, Coffee,
} from 'lucide-react';

export interface StatusOption {
  id: string;
  en: string;
  zh: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const STATUS_OPTIONS: StatusOption[] = [
  { id: 'read', en: 'Self Reading', zh: '自己閱讀', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'quiet', en: 'Keep Quiet', zh: '保持安靜', icon: VolumeX, color: 'text-red-500', bg: 'bg-red-50' },
  { id: 'discuss', en: 'Group Discussion', zh: '小組討論', icon: Users, color: 'text-green-500', bg: 'bg-green-50' },
  { id: 'exercise', en: 'Write Exercises', zh: '寫習題', icon: Edit3, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  { id: 'task', en: 'Task Operation', zh: '操作任務', icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'rest', en: 'Rest Time', zh: '休息', icon: Coffee, color: 'text-teal-500', bg: 'bg-teal-50' },
];

export function getStatusById(id: string | null | undefined): StatusOption | undefined {
  return STATUS_OPTIONS.find((s) => s.id === id);
}

/** 貢獻分數顏色 */
export function getScoreColor(score: number): string {
  switch (score) {
    case 0: return 'bg-slate-100 text-slate-400 border-slate-200';
    case 1: return 'bg-sky-100 text-sky-700 border-sky-200';
    case 2: return 'bg-sky-200 text-sky-800 border-sky-300';
    case 3: return 'bg-green-100 text-green-700 border-green-200';
    case 4: return 'bg-green-200 text-green-800 border-green-300';
    case 5: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 6: return 'bg-yellow-200 text-yellow-800 border-yellow-300';
    case 7: return 'bg-orange-100 text-orange-700 border-orange-200';
    case 8: return 'bg-orange-200 text-orange-800 border-orange-300';
    case 9: return 'bg-red-100 text-red-700 border-red-200';
    case 10: return 'bg-red-200 text-red-800 border-red-300';
    default: return 'bg-slate-100 text-slate-400 border-slate-200';
  }
}
