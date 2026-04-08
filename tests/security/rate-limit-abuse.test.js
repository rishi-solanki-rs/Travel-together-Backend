import { jest } from '@jest/globals';
import runtimeAbuseGuard from '../../src/middlewares/runtimeAbuseGuard.js';
import { malwareScanHook } from '../../src/operations/security/runtimeSecurity.service.js';

describe('Phase 8 rate limit and abuse controls', () => {
  test('runtime abuse guard allows normal request profile', () => {
    const req = {
      headers: { 'content-length': '128' },
      ip: '127.0.0.1',
    };
    const res = {};
    const next = jest.fn();

    runtimeAbuseGuard(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('7) malware upload rejection path blocks known suspicious filename patterns', async () => {
    process.env.MALWARE_BLOCK_PATTERNS = 'eicar,test-malware';
    const safe = await malwareScanHook({ filePath: '/tmp/eicar-sample.jpg', originalname: 'holiday.jpg' });
    expect(safe).toBe(false);
  });
});
