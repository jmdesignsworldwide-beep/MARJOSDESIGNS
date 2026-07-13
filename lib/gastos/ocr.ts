import 'server-only'
import { z } from 'zod'
import type { ParsedReceiptItem } from './types'

/**
 * Lectura de factura con visión de IA (Anthropic). SERVER-ONLY.
 *
 * La API key vive SOLO en el servidor (ANTHROPIC_API_KEY, marcada Sensitive en
 * Vercel, NUNCA con prefijo NEXT_PUBLIC_ y NUNCA en logs). El modelo transcribe
 * EXACTO lo que ve; si la foto no se puede leer, devuelve readable=false y NO
 * inventa. Nunca redondea ni adivina ítems.
 */

const OCR_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-3-5-sonnet-latest'

export type ReceiptItem = ParsedReceiptItem

export interface ReceiptRead {
  readable: boolean
  reason?: string // por qué no se pudo leer (foto borrosa, etc.)
  merchant: string | null
  date: string | null // YYYY-MM-DD
  total: number | null
  items: ReceiptItem[]
}

/** Resultado del intento de lectura (o un error controlado). */
export type ReceiptOcrResult =
  | { ok: true; data: ReceiptRead }
  | { ok: false; kind: 'unconfigured' | 'error'; message: string }

const numish = z
  .union([z.number(), z.string(), z.null()])
  .transform((v) => {
    if (v === null || v === '') return null
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ''))
    return Number.isFinite(n) ? n : null
  })

const modelSchema = z.object({
  readable: z.boolean(),
  reason: z.string().optional().nullable(),
  merchant: z.string().optional().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  total: numish.optional(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        quantity: numish.optional(),
        unitPrice: numish.optional(),
        lineTotal: numish.optional(),
      }),
    )
    .optional()
    .default([]),
})

const SYSTEM_PROMPT = `Eres un lector de recibos/facturas para un negocio en República Dominicana.
Tu única tarea es TRANSCRIBIR con exactitud lo que aparece en la imagen del recibo.
Reglas ESTRICTAS:
- NO inventes, NO adivines, NO redondees. Transcribe solo lo que se ve.
- Si la imagen está borrosa, cortada, oscura, o NO es un recibo legible, responde
  con readable=false y una razón breve en español. No devuelvas ítems inventados.
- Los montos son en pesos dominicanos (RD$). Devuelve números sin símbolo ni comas de miles.
- La fecha en formato YYYY-MM-DD si es legible; si no, null.
Responde ÚNICAMENTE con JSON válido (sin markdown, sin explicación), con esta forma:
{"readable":true|false,"reason":string|null,"merchant":string|null,"date":"YYYY-MM-DD"|null,"total":number|null,"items":[{"name":string,"quantity":number|null,"unitPrice":number|null,"lineTotal":number|null}]}`

/** Strip code fences and grab the first JSON object. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return body.trim()
  return body.slice(start, end + 1)
}

/**
 * Read a receipt image (base64, no data: prefix). Returns a controlled result;
 * never throws to the caller so the UI can ask for a better photo gracefully.
 */
export async function readReceiptImage(
  base64: string,
  mediaType: string,
): Promise<ReceiptOcrResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      ok: false,
      kind: 'unconfigured',
      message: 'La lectura de factura no está configurada todavía (falta la API key de visión).',
    }
  }

  // Anthropic vision solo admite estos tipos de imagen (no PDF).
  const supported = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
  if (!supported.includes(mediaType)) {
    return {
      ok: false,
      kind: 'error',
      message: 'Para leer la factura, sube una FOTO (JPG/PNG). El PDF se guarda pero no se lee automáticamente.',
    }
  }

  let resp: Response
  try {
    resp = await fetch(OCR_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.RECEIPT_OCR_MODEL ?? DEFAULT_MODEL,
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text', text: 'Transcribe este recibo siguiendo las reglas. Responde solo el JSON.' },
            ],
          },
        ],
      }),
    })
  } catch {
    return { ok: false, kind: 'error', message: 'No se pudo contactar el lector de facturas. Intenta de nuevo.' }
  }

  if (!resp.ok) {
    return { ok: false, kind: 'error', message: 'El lector de facturas no respondió bien. Intenta de nuevo.' }
  }

  let payload: unknown
  try {
    payload = await resp.json()
  } catch {
    return { ok: false, kind: 'error', message: 'Respuesta ilegible del lector. Intenta de nuevo.' }
  }

  const text = (payload as { content?: { type: string; text?: string }[] })?.content
    ?.filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
  if (!text) return { ok: false, kind: 'error', message: 'El lector no devolvió texto. Intenta con otra foto.' }

  let parsed: z.infer<typeof modelSchema>
  try {
    parsed = modelSchema.parse(JSON.parse(extractJson(text)))
  } catch {
    return { ok: false, kind: 'error', message: 'No se pudo interpretar la factura. Toma otra foto más nítida.' }
  }

  const items: ReceiptItem[] = (parsed.items ?? [])
    .map((it) => ({
      name: it.name.slice(0, 200),
      quantity: it.quantity ?? null,
      unitPrice: it.unitPrice ?? null,
      lineTotal: it.lineTotal ?? null,
    }))
    .slice(0, 200)

  // Si el modelo dice ilegible, o dice legible pero no sacó nada útil → pide otra foto.
  if (!parsed.readable || (items.length === 0 && parsed.total == null)) {
    return {
      ok: true,
      data: {
        readable: false,
        reason: parsed.reason || 'La foto no se ve bien para leerla — toma otra más nítida.',
        merchant: parsed.merchant ?? null,
        date: parsed.date ?? null,
        total: parsed.total ?? null,
        items: [],
      },
    }
  }

  return {
    ok: true,
    data: {
      readable: true,
      merchant: parsed.merchant ?? null,
      date: parsed.date ?? null,
      total: parsed.total ?? null,
      items,
    },
  }
}
