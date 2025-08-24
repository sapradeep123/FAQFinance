// src/routes/upload.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { v4 as uuidv4 } from 'uuid';
import * as XLSX from 'xlsx';

// lazy import to avoid circular
const { db } = require('../db');

const UPLOAD_DIR = path.resolve(process.cwd(), 'data', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

export const uploadRouter = Router();

/** POST /api/upload-xlsx -> save original XLSX and queue parse */
uploadRouter.post('/upload-xlsx', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'file is required' });

    const ft = await fileTypeFromBuffer(req.file.buffer);
    const okMime = new Set([
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ]);
    if (!ft || (!okMime.has(ft.mime) && !req.file.originalname.toLowerCase().endsWith('.xlsx'))) {
      return res.status(415).json({ error: 'Unsupported file type (expect .xlsx)' });
    }

    const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const id = uuidv4();
    const storedName = `${id}.xlsx`;
    const storedPath = path.join(UPLOAD_DIR, storedName);
    fs.writeFileSync(storedPath, req.file.buffer);

    db.prepare(`
      INSERT INTO uploads (id, original_name, stored_path, mime, size_bytes, sha256, uploaded_by, uploaded_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.file.originalname,
      storedPath,
      ft?.mime ?? 'application/octet-stream',
      req.file.size,
      sha256,
      req.headers['x-user'] ?? null,
      Date.now(),
      'queued'
    );

    // parse async (don’t block HTTP)
    setImmediate(() => parseUpload(id).catch(e => {
      db.prepare(`UPDATE uploads SET status='failed', parse_error=? WHERE id=?`).run(e?.message ?? 'unknown', id);
      console.error('parse failed', e);
    }));

    return res.json({ upload_id: id, status: 'queued' });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: 'upload failed' });
  }
});

/** GET /api/uploads -> list recent uploads */
uploadRouter.get('/uploads', (_req, res) => {
  const rows = db.prepare(`
    SELECT id, original_name, size_bytes, sha256, uploaded_at, status
    FROM uploads
    ORDER BY uploaded_at DESC
    LIMIT 200
  `).all();
  res.json(rows);
});

async function parseUpload(uploadId: string) {
  const row = db.prepare(`SELECT stored_path FROM uploads WHERE id=?`).get(uploadId) as { stored_path: string } | undefined;
  if (!row) throw new Error('upload not found');

  const wb = XLSX.readFile(row.stored_path, { cellDates: true, raw: false });

  const insert = db.prepare(`
    INSERT OR REPLACE INTO parsed_rows (upload_id, sheet_name, row_index, row_json)
    VALUES (@upload_id, @sheet_name, @row_index, @row_json)
  `);
  const tx = db.transaction((batch: any[]) => batch.forEach(i => insert.run(i)));

  const batch: any[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });
    rows.forEach((r, idx) => {
      batch.push({ upload_id: uploadId, sheet_name: sheetName, row_index: idx, row_json: JSON.stringify(r) });
    });
  }
  tx(batch);

  db.prepare(`UPDATE uploads SET status='parsed', parse_error=NULL WHERE id=?`).run(uploadId);
}
