import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ pdf: vi.fn(), recognize: vi.fn(), convert: vi.fn(), fromBuffer: vi.fn(), office: vi.fn(), write: vi.fn(), exists: vi.fn(), unlink: vi.fn() }));
vi.mock('pdf-parse', () => ({ default: mocks.pdf }));
vi.mock('tesseract.js', () => ({ default: { recognize: mocks.recognize } }));
vi.mock('pdf2pic', () => ({ fromBuffer: mocks.fromBuffer }));
vi.mock('officeparser', () => ({ default: { parseOfficeAsync: mocks.office } }));
vi.mock('fs', () => ({ writeFileSync: mocks.write, existsSync: mocks.exists, unlinkSync: mocks.unlink }));
import { chunkText, extractTextFromBuffer } from '@/lib/documentParser';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.exists.mockReturnValue(true);
  mocks.office.mockResolvedValue('Office document text');
  mocks.recognize.mockResolvedValue({ data: { text: 'Scanned text' } });
  mocks.fromBuffer.mockReturnValue(mocks.convert);
  mocks.convert.mockResolvedValue({ base64: Buffer.from('image').toString('base64') });
});
describe('document extraction', () => {
  it('reads UTF-8 text', async () => expect(await extractTextFromBuffer(Buffer.from('Hello world'), 'notes.TXT')).toBe('Hello world'));
  it.each(['jpg', 'jpeg', 'png'])('runs OCR for %s', async ext => expect(await extractTextFromBuffer(Buffer.from('image'), `scan.${ext}`)).toBe('Scanned text'));
  it('uses text PDF extraction without OCR', async () => {
    mocks.pdf.mockResolvedValue({ text: 'Readable PDF content. '.repeat(5), numpages: 10 });
    expect(await extractTextFromBuffer(Buffer.from('pdf'), 'notes.pdf')).toContain('Readable');
    expect(mocks.convert).not.toHaveBeenCalled();
  });
  it('limits scanned PDF OCR to five pages and requests base64', async () => {
    mocks.pdf.mockResolvedValue({ text: '', numpages: 20 });
    expect(await extractTextFromBuffer(Buffer.from('pdf'), 'scan.pdf')).toContain('Scanned text');
    expect(mocks.convert).toHaveBeenCalledTimes(5);
    expect(mocks.convert).toHaveBeenCalledWith(1, { responseType: 'base64' });
  });
  it.each(['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'])('extracts %s and removes the temporary file', async ext => {
    expect(await extractTextFromBuffer(Buffer.from('office'), `notes.${ext}`)).toBe('Office document text');
    expect(mocks.unlink).toHaveBeenCalledWith(mocks.write.mock.calls[0][0]);
  });
  it('cleans up temporary files after a parser failure', async () => {
    mocks.office.mockRejectedValueOnce(new Error('Invalid document'));
    await expect(extractTextFromBuffer(Buffer.from('broken'), 'notes.docx')).rejects.toThrow('Invalid document');
    expect(mocks.unlink).toHaveBeenCalledOnce();
  });
  it('rejects unsupported formats', async () => await expect(extractTextFromBuffer(Buffer.from('zip'), 'notes.zip')).rejects.toThrow('Unsupported file type'));
});
describe('text chunking', () => {
  it.each(['', 'short', ' '.repeat(100)])('omits empty or tiny chunks', text => expect(chunkText(text)).toEqual([]));
  it('keeps text smaller than the chunk size intact', () => expect(chunkText('A useful paragraph containing enough detail.')).toEqual(['A useful paragraph containing enough detail.']));
  it('splits long text with bounded chunk lengths', () => {
    const chunks = chunkText('x'.repeat(1200), 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.length <= 400)).toBe(true);
  });
  it.each([[0, 0], [-1, 0], [100, -1], [100, 100], [100, 101], [NaN, 0], [100, Infinity]])('rejects invalid size/overlap %s/%s instead of looping', (size, overlap) => expect(() => chunkText('text', size, overlap)).toThrow(RangeError));
  it('makes progress when a natural break is shorter than the overlap', () => {
    const chunks = chunkText('a'.repeat(230) + '\n' + 'b'.repeat(800), 100, 90);
    expect(chunks.length).toBeLessThan(1100);
    expect(chunks.at(-1)).toContain('b');
  });
});
