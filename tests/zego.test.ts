import { describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { generateToken04 } from '@/lib/zego';

describe('video tokens', () => {
  const secret = '0123456789abcdef0123456789abcdef';
  it.each([
    [0, 'user', secret, 60, 'appId'],
    [1, '', secret, 60, 'userId'],
    [1, 'user', 'short', 60, 'secret'],
    [1, 'user', secret, 0, 'effectiveTimeInSeconds'],
  ] as const)('rejects invalid token inputs', (app, user, key, seconds, error) => expect(() => generateToken04(app, user, key, seconds, '')).toThrow(error));
  it('encodes the expiry and encrypts the user and payload', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-11T10:00:00Z'));
    const token = generateToken04(123, 'user-1', secret, 600, 'room-1');
    expect(token.startsWith('04')).toBe(true);
    const bytes = Buffer.from(token.slice(2), 'base64');
    expect(Number(bytes.readBigInt64BE(0))).toBe(Date.now() / 1000 + 600);
    const ivLength = bytes.readUInt16BE(8);
    const iv = bytes.subarray(10, 10 + ivLength);
    const encrypted = bytes.subarray(12 + ivLength);
    const decipher = crypto.createDecipheriv('aes-256-cbc', secret, iv);
    const payload = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString());
    expect(payload).toMatchObject({ app_id: 123, user_id: 'user-1', payload: 'room-1', expire: Date.now() / 1000 + 600 });
  });
});
