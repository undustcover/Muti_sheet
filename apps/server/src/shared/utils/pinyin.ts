import TinyPinyin = require('tiny-pinyin');

export function toPinyinKey(input: any): string {
  if (input == null) return '';
  const s = String(input);
  try {
    const py = TinyPinyin.convertToPinyin(s);
    // 规范化：小写、去除非字母数字空格
    return py.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  } catch {
    return s.toLowerCase();
  }
}