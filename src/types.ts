export interface TaskItem {
  id: string;
  title: string;
  content: string;
}

export interface StudentStatus {
  absent: string;
  sleeping: string;
  phone: string;
}

export interface LessonRecord {
  id?: string;
  created_at?: string;
  className: string;
  date: string; // YYYY-MM-DD
  activeStatus?: string | null; // 當次投影的狀態 id
  tasks: TaskItem[];
  prepTitle: string;
  prepContent: string;
  boardTitle: string;
  reminderTitle: string;
  reminderContent: string;
  contributions: number[]; // 每位學生貢獻次數
  studentCount: number;
  studentStatus: StudentStatus;
}

export interface SnapExport {
  version: number;
  savedAt: string;
  lesson: LessonRecord;
}

/** 貢獻顏色等級 */
export const SCORE_LEGEND = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
