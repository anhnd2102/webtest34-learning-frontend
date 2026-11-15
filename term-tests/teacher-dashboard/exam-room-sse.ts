// NGUỒN: file .ts này; exam-room-sse.js do `npm run build` sinh ra (xem candidate/text-utils.ts). Import nội bộ viết
// không có `?rev=`; dashboard không dùng rev chung nên build không thêm vào đây.
// buffer: phần còn dở của lần đọc trước; chunk: dữ liệu mới vừa đọc.
export interface SseEvent { event: string, data: any }

export function parseSseChunk(buffer: string, chunk: string): { buffer: string, events: SseEvent[] } {
  const input = buffer + chunk.replace(/\r\n/g, '\n');
  const frames = input.split('\n\n');
  const remainder = frames.pop() ?? '';
  const events = frames.flatMap((frame): SseEvent[] => {
    let event = 'message';
    const data: string[] = [];
    for (const line of frame.split('\n')) {
      if (!line || line.startsWith(':')) continue;
      const colon = line.indexOf(':');
      const field = colon < 0 ? line : line.slice(0, colon);
      const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
      if (field === 'event') event = value;
      if (field === 'data') data.push(value);
    }
    if (!data.length) return [];
    try { return [{ event, data: JSON.parse(data.join('\n')) }]; }
    catch { return []; }
  });
  return { buffer: remainder, events };
}
