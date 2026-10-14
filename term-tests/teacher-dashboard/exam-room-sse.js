export function parseSseChunk(buffer, chunk) {
  const input = buffer + chunk.replace(/\r\n/g, '\n');
  const frames = input.split('\n\n');
  const remainder = frames.pop();
  const events = frames.flatMap(frame => {
    let event = 'message';
    const data = [];
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
