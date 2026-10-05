// Bound the actual stream, not just the untrusted Content-Length header.
export async function readSmallJson(request: Request): Promise<unknown> {
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new Error('JSON required');
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Body required');
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 1024) throw new Error('Body too large');
            chunks.push(value);
        }
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } finally { await reader.cancel(); }
}
