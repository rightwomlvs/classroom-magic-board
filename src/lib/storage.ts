import type { LessonRecord, SnapExport } from '../types';

const LS_PREFIX = 'cmb_';

export function getLS(key: string): unknown | null {
  try {
    const raw = window.localStorage.getItem(LS_PREFIX + key);
    return raw !== null ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLS(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    // 忽略 (隱私模式等)
  }
}

/** 把整節課打包成可匯出的 JSON */
export function buildSnap(lesson: LessonRecord): SnapExport {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    lesson,
  };
}

/** 解析匯入的 JSON，回傳 LessonRecord；格式錯誤拋出 Error */
export function parseSnap(raw: string): LessonRecord {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('JSON 格式錯誤');
  }
  if (data && typeof data === 'object' && 'lesson' in data) {
    const snap = data as SnapExport;
    if (snap.version !== 1) {
      throw new Error('不支援的備份版本');
    }
    if (!snap.lesson || typeof snap.lesson !== 'object') {
      throw new Error('備份內容缺少課堂資料');
    }
    return snap.lesson;
  }
  throw new Error('不是有效的課堂備份檔');
}

/** 觸發瀏覽器下載 JSON 檔 */
export function downloadJSON(filename: string, lesson: LessonRecord): void {
  const snap = buildSnap(lesson);
  const blob = new Blob([JSON.stringify(snap, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 建立預設空課堂（以首次讀取人數為準） */
export function emptyContributions(count: number): number[] {
  return Array(count).fill(0);
}
