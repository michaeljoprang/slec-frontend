const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

jest.mock('../src/config/database', () => {
  return {
    query: jest.fn(),
    getPool: jest.fn()
  };
});

describe('Assessment API endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementation
    db.getPool.mockReturnValue({ query: db.query });
    db.query.mockImplementation((text) => {
      if (!text) return Promise.resolve({});
      if (text.includes('RETURNING id')) {
        return Promise.resolve({ rows: [{ id: 'mock-uuid-123' }] });
      }
      if (text.includes('SELECT * FROM assessments ORDER BY')) {
        return Promise.resolve({ rows: [{ id: '1', score: 100 }] });
      }
      if (text.includes('SELECT * FROM assessments WHERE id =')) {
        // We can override this in specific tests if needed
        return Promise.resolve({ rows: [{ id: '123e4567-e89b-12d3-a456-426614174000', score: 85 }] });
      }
      if (text.includes('SELECT * FROM assessment_sections')) {
        return Promise.resolve({ rows: [{ id: 'sec-1', assessment_id: '123e4567-e89b-12d3-a456-426614174000' }] });
      }
      if (text.includes('SELECT * FROM assessment_answers')) {
        return Promise.resolve({ rows: [{ id: 'ans-1', section_id: 'sec-1' }] });
      }
      return Promise.resolve({});
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('ok');
    });
  });

  describe('POST /api/assessments', () => {
    const validPayload = {
      assessmentType: 'DDT',
      header: {
        tanggal: '2026-10-07',
        namaPeserta: 'Budi Santoso',
        umur: '35',
        golSIM: 'B2 Umum',
        masaBerlakuSIM: '2028-01-01',
        jenisKendaraan: 'Hino 500',
        noPolisi: 'B 1234 CD',
        lokasiTest: 'Jakarta',
        instruktur: 'Ahmad'
      },
      sections: [
        {
          sectionId: 'A',
          items: [
            { itemId: 'A1', answer: 'YES', deductionPoint: 4 },
            { itemId: 'A2', answer: 'YES', deductionPoint: 4 }
          ]
        }
      ]
    };

    it('should create valid DDT assessment with 0 deduction (PASS)', async () => {
      const res = await request(app).post('/api/assessments').send(validPayload);
      
      expect(res.statusCode).toEqual(201);
      expect(res.body.data.id).toEqual('mock-uuid-123');
      expect(res.body.data.totalDeduction).toEqual(0);
      expect(res.body.data.actualPoint).toEqual(100);
      expect(res.body.data.score).toEqual(100);
      expect(res.body.data.result).toEqual('PASS');
    });

    it('should calculate PASS with 30 deduction', async () => {
      const payload = JSON.parse(JSON.stringify(validPayload));
      payload.sections = [
        {
          sectionId: 'B4',
          items: [
            { itemId: 'B4_1', answer: 'NO', deductionPoint: 30 }
          ]
        }
      ];

      const res = await request(app).post('/api/assessments').send(payload);

      expect(res.statusCode).toEqual(201);
      expect(res.body.data.totalDeduction).toEqual(30);
      expect(res.body.data.actualPoint).toEqual(70);
      expect(res.body.data.score).toEqual(70);
      expect(res.body.data.result).toEqual('PASS');
    });

    it('should calculate FAIL with 31 deduction', async () => {
      const payload = JSON.parse(JSON.stringify(validPayload));
      payload.sections = [
        {
          sectionId: 'A',
          items: [{ itemId: 'A1', answer: 'NO', deductionPoint: 31 }]
        }
      ];

      const res = await request(app).post('/api/assessments').send(payload);

      expect(res.statusCode).toEqual(201);
      expect(res.body.data.totalDeduction).toEqual(31);
      expect(res.body.data.actualPoint).toEqual(69);
      expect(res.body.data.score).toEqual(69);
      expect(res.body.data.result).toEqual('FAIL');
    });

    it('should calculate FAIL with 50 deduction', async () => {
      const payload = JSON.parse(JSON.stringify(validPayload));
      payload.sections = [
        {
          sectionId: 'A',
          items: [{ itemId: 'A1', answer: 'NO', deductionPoint: 50 }]
        }
      ];

      const res = await request(app).post('/api/assessments').send(payload);

      expect(res.statusCode).toEqual(201);
      expect(res.body.data.actualPoint).toEqual(50);
      expect(res.body.data.score).toEqual(50);
      expect(res.body.data.result).toEqual('FAIL');
    });

    it('should reject invalid assessment type', async () => {
      const payload = { ...validPayload, assessmentType: 'UNKNOWN' };
      const res = await request(app).post('/api/assessments').send(payload);
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toContain('Invalid or missing assessmentType. Expected: DDT or TMMIN');
    });

    it('should reject missing participant name', async () => {
      const payload = JSON.parse(JSON.stringify(validPayload));
      payload.header.namaPeserta = '';
      const res = await request(app).post('/api/assessments').send(payload);
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors).toContain('Missing required header field: namaPeserta');
    });

    it('should reject invalid answer', async () => {
      const payload = JSON.parse(JSON.stringify(validPayload));
      payload.sections[0].items[0].answer = 'MAYBE';
      const res = await request(app).post('/api/assessments').send(payload);
      expect(res.statusCode).toEqual(400);
      expect(res.body.errors[0]).toMatch(/Invalid answer value/);
    });

    it('should rollback transaction on db failure', async () => {
      db.query.mockImplementationOnce(() => Promise.resolve({})) // BEGIN
        .mockImplementationOnce(() => Promise.reject(new Error('DB Connection Failed'))); // Insert fails

      const res = await request(app).post('/api/assessments').send(validPayload);
      expect(res.statusCode).toEqual(500);
      // rollback should be called
      const rollbackCall = db.query.mock.calls.find(call => call[0] === 'ROLLBACK');
      expect(rollbackCall).toBeDefined();
    });
  });

  describe('GET /api/assessments', () => {
    it('should return a list of assessments', async () => {
      const res = await request(app).get('/api/assessments');
      expect(res.statusCode).toEqual(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/assessments/:id', () => {
    it('should return a specific assessment', async () => {
      const res = await request(app).get('/api/assessments/123e4567-e89b-12d3-a456-426614174000');
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.id).toEqual('123e4567-e89b-12d3-a456-426614174000');
      expect(res.body.data.sections).toHaveLength(1);
      expect(res.body.data.sections[0].answers).toHaveLength(1);
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await request(app).get('/api/assessments/invalid-id');
      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Invalid assessment ID format');
    });

    it('should return 404 if not found', async () => {
      db.query.mockImplementation((text) => {
        if (text.includes('SELECT * FROM assessments WHERE id =')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({});
      });
      const res = await request(app).get('/api/assessments/123e4567-e89b-12d3-a456-426614174000');
      expect(res.statusCode).toEqual(404);
    });
  });
});
