// XLSX is dynamically imported only when needed (parseExcel)
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ParsedData {
  headers: string[];
  rows: string[][];
}

/** Parse a CSV file into headers + rows */
export async function parseCSV(file: File): Promise<ParsedData> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',' || ch === ';') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => parseCSVLine(line));

  return { headers, rows };
}

/** Parse an Excel file (.xlsx, .xls) into headers + rows */
export async function parseExcel(file: File): Promise<ParsedData> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return { headers: [], rows: [] };

  const raw: string[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
  if (raw.length === 0) return { headers: [], rows: [] };

  const headers = raw[0].map(h => String(h));
  const rows = raw.slice(1).map(row => row.map(cell => String(cell ?? '')));

  return { headers, rows };
}

export type DetectedType = 'text' | 'number' | 'date' | 'email' | 'checkbox';

/** Detect column types from data rows */
export function detectColumnTypes(headers: string[], rows: string[][]): DetectedType[] {
  return headers.map((_, colIndex) => {
    const sampleValues = rows
      .slice(0, 20)
      .map(row => row[colIndex] ?? '')
      .filter(v => v !== '');

    if (sampleValues.length === 0) return 'text';

    // Check email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (sampleValues.every(v => emailRegex.test(v))) return 'email';

    // Check checkbox/boolean
    const boolValues = ['true', 'false', 'sim', 'não', 'nao', 'yes', 'no', '0', '1'];
    if (sampleValues.every(v => boolValues.includes(v.toLowerCase()))) return 'checkbox';

    // Check number
    if (sampleValues.every(v => {
      const cleaned = v.replace(/[R$\s%,]/g, '').replace(',', '.');
      return !isNaN(Number(cleaned)) && cleaned !== '';
    })) return 'number';

    // Check date
    const dateRegex = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/;
    if (sampleValues.every(v => dateRegex.test(v) || !isNaN(Date.parse(v)))) return 'date';

    return 'text';
  });
}

export interface ColumnMapping {
  sourceIndex: number;
  sourceHeader: string;
  targetColumnId: string | null; // null = ignore, 'new' = create new
  targetType: DetectedType;
  ignored: boolean;
}

/** Parse the file based on extension */
export async function parseFile(file: File): Promise<ParsedData> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'csv') return parseCSV(file);
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(file);
  throw new Error(`Formato de arquivo não suportado: .${ext}`);
}

/**
 * Format a raw CSV string value for storage as column_values.value
 * according to the detected column type.
 */
export function formatValueForColumn(rawValue: string, type: DetectedType): unknown {
  if (rawValue === '' || rawValue === null || rawValue === undefined) return null;
  switch (type) {
    case 'number': {
      const cleaned = rawValue.replace(/[R$\s%]/g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? rawValue : num;
    }
    case 'date': {
      const d = new Date(rawValue);
      return isNaN(d.getTime()) ? rawValue : d.toISOString();
    }
    case 'checkbox':
      return ['true', 'sim', 'yes', '1'].includes(rawValue.toLowerCase());
    case 'email':
    case 'text':
    default:
      return rawValue;
  }
}

export interface ImportChunkOptions {
  rows: string[][];
  mappings: ColumnMapping[];
  boardId: string;
  groupId: string;
  userId: string;
  supabase: SupabaseClient;
  onProgress: (done: number, total: number) => void;
}

export interface ImportResult {
  successCount: number;
  partialCount: number; // items created but column_values failed
  errors: { row: number; reason: string }[];
}

const CHUNK_SIZE = 50;

/** Sanitize Supabase error messages to avoid exposing SQL/internal details to users */
function sanitizeErrorMessage(message: string): string {
  // Remove SQL-like details, table names, constraint names etc.
  const sanitized = message
    .replace(/\b(relation|constraint|violates|duplicate key|pg_|sql|query|column)\b.*$/i, 'erro interno')
    .replace(/\(.*?\)/g, '')
    .trim();
  return sanitized.length > 100 ? sanitized.slice(0, 100) + '...' : sanitized;
}

/**
 * Import rows into Supabase in batches of 50 to avoid UI freezes and timeouts.
 * Each chunk is batch-inserted (items first, then column_values) with a
 * setTimeout(0) yield between chunks to keep the UI responsive.
 */
export async function importItemsInChunks({
  rows,
  mappings,
  boardId,
  groupId,
  userId,
  supabase,
  onProgress,
}: ImportChunkOptions): Promise<ImportResult> {
  const activeMappings = mappings.filter(m => !m.ignored && m.targetColumnId && m.targetColumnId !== null);
  const nameMapping = activeMappings[0];
  const valueMappings = activeMappings.slice(1);

  let successCount = 0;
  let partialCount = 0;
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const basePosition = Date.now();

    const itemInserts = chunk.map((row, j) => {
      const rawName = nameMapping
        ? (row[nameMapping.sourceIndex]?.trim() || `Item ${i + j + 1}`)
        : `Item ${i + j + 1}`;
      return {
        board_id: boardId,
        group_id: groupId,
        name: rawName,
        position: basePosition + (i + j) * 10,
        created_by: userId,
      };
    });

    const { data: insertedItems, error: itemsError } = await supabase
      .from('items')
      .insert(itemInserts)
      .select('id');

    if (itemsError || !insertedItems) {
      const errorDetail = sanitizeErrorMessage(itemsError?.message || 'resposta vazia do servidor');
      for (let j = 0; j < chunk.length; j++) {
        errors.push({ row: i + j + 2, reason: `Erro ao criar item: ${errorDetail}` });
      }
    } else {
      const cvInserts: { item_id: string; column_id: string; value: unknown }[] = [];

      insertedItems.forEach((item, j) => {
        const row = chunk[j];
        for (const mapping of valueMappings) {
          if (!mapping.targetColumnId) continue;
          const rawValue = row[mapping.sourceIndex] ?? '';
          if (rawValue === '' && rawValue !== '0') continue;
          cvInserts.push({
            item_id: item.id,
            column_id: mapping.targetColumnId,
            value: formatValueForColumn(rawValue, mapping.targetType),
          });
        }
      });

      if (cvInserts.length > 0) {
        const { error: cvError } = await supabase.from('column_values').insert(cvInserts);
        if (cvError) {
          console.error('column_values insert error:', cvError);
          const errorDetail = sanitizeErrorMessage(cvError.message);
          for (let j = 0; j < insertedItems.length; j++) {
            errors.push({
              row: i + j + 2,
              reason: `Item criado mas valores de colunas falharam: ${errorDetail}`,
            });
          }
          partialCount += insertedItems.length;
        } else {
          successCount += insertedItems.length;
        }
      } else {
        successCount += insertedItems.length;
      }
    }

    onProgress(Math.min(i + CHUNK_SIZE, rows.length), rows.length);
    // Yield to UI thread between chunks to maintain responsiveness
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return { successCount, partialCount, errors };
}
