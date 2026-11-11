/// <reference types="vite/client" />
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ session: vi.fn(), connect: vi.fn() }));
vi.mock('next-auth/next', () => ({ getServerSession: mocks.session }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('@/lib/mongodb', () => ({ default: mocks.connect }));
vi.mock('@/lib/embeddings', () => ({ generateEmbedding: vi.fn() }));
vi.mock('@/lib/documentParser', () => ({ extractTextFromBuffer: vi.fn(), chunkText: vi.fn() }));
vi.mock('pdf-parse', () => ({ default: vi.fn() }));
vi.mock('officeparser', () => ({ default: { parseOfficeAsync: vi.fn() } }));

type Handler = (req: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;
const routes = import.meta.glob([
  '../app/api/student/**/route.ts', '../app/api/instructor/**/route.ts',
  '../app/api/messages/**/route.ts', '../app/api/notifications/**/route.ts',
  '../app/api/user/**/route.ts', '../app/api/classes/**/route.ts', '../app/api/exams/**/route.ts',
], { eager: true }) as Record<string, Record<string, Handler>>;

beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue(null); });
for (const [path, module] of Object.entries(routes)) {
  describe(path.replace('../app', ''), () => {
    for (const [method, handler] of Object.entries(module)) {
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) continue;
      it(`${method} rejects a signed-out request before accessing the database`, async () => {
        const response = await handler(new Request('http://localhost/api/test', { method }), { params: Promise.resolve({ id: '000000000000000000000001', userId: '000000000000000000000002', submissionId: '000000000000000000000003' }) });
        expect(response.status).toBe(401);
        expect(mocks.connect).not.toHaveBeenCalled();
      });
      if (path.includes('/student/') || path.includes('/instructor/')) {
        it(`${method} rejects the wrong role before accessing the database`, async () => {
          mocks.session.mockResolvedValue({ user: { id: 'user-1', role: path.includes('/student/') ? 'instructor' : 'student' } });
          const response = await handler(new Request('http://localhost/api/test', { method }), { params: Promise.resolve({ id: '000000000000000000000001', submissionId: '000000000000000000000003' }) });
          expect(response.status).toBe(401);
          expect(mocks.connect).not.toHaveBeenCalled();
        });
      }
    }
  });
}
