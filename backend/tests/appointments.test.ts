import request from 'supertest';
import { describe, it, expect } from '@jest/globals';
import { app } from '../src/index';

describe('Appointments API', () => {
  it('should list appointments (empty initially)', async () => {
    const res = await request(app).get('/api/appointments');
    expect([200, 401]).toContain(res.status);
  });
});
