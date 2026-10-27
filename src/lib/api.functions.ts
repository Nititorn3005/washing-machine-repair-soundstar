// Server functions = the app's backend (deployed as Netlify Functions).
// The browser only calls these; all Supabase access uses the server-only
// service-role client. Every write validates input with zod, and stock changes
// go through the transactional RPCs in supabase/migrations.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { Job, JobPart, JobStatus, MovementType, Part, StockMovement, Technician } from '@/data/types'
import { DEFAULT_COMPANY, type CompanyInfo } from '@/lib/company'
import { STATUS, STATUS_ORDER } from '@/lib/format'
import { NotConfiguredError, getSupabase } from '@/lib/supabase'

export type Result = { ok: true; id?: string } | { ok: false; error: string }

export interface Snapshot {
  company: CompanyInfo
  technicians: Technician[]
  parts: Part[]
  jobs: Job[]
  movements: StockMovement[]
}

type Row = Record<string, unknown>

const str = (v: unknown) => (v == null ? '' : String(v))
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)

function toMessage(e: unknown): string {
  if (e instanceof NotConfiguredError) return e.message
  const err = e as { code?: string; message?: string }
  // Business-rule errors raised (in Thai) by the RPCs.
  if (err?.code === 'P0001' && err.message) return err.message
  if (err?.code === 'PGRST202' || err?.code === 'PGRST205' || err?.code === '42P01' || err?.code === '42703')
    return 'ฐานข้อมูลยังไม่ได้ติดตั้งโครงสร้างล่าสุด (migration) กรุณาติดต่อผู้ดูแลระบบ'
  console.error('[db]', err?.code, err?.message ?? e)
  return `บันทึกไม่สำเร็จ: ${err?.message ?? 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'}`
}

async function run(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn()
  } catch (e) {
    return { ok: false, error: toMessage(e) }
  }
}

/** Reads every row (PostgREST caps a single response at 1000 rows). */
async function fetchAll(table: string, columns: string, order = 'created_at'): Promise<Row[]> {
  const db = getSupabase()
  const out: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(columns).order(order, { ascending: false }).range(from, from + 999)
    if (error) throw error
    out.push(...((data ?? []) as unknown as Row[]))
    if (!data || data.length < 1000) return out
  }
}

const asStatus = (s: unknown): JobStatus =>
  STATUS_ORDER.includes(s as JobStatus) ? (s as JobStatus) : 'received'

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const getSnapshot = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ ok: true; data: Snapshot } | { ok: false; error: string }> => {
    try {
      const db = getSupabase()
      const [settings, staff, items, jobRows, jobParts, history, txs] = await Promise.all([
        db.from('app_settings').select('value').eq('key', 'company').maybeSingle(),
        fetchAll('staff', 'id, display_name, username, role, active'),
        fetchAll('inventory_items', 'id, item_code, name, category, compatible, unit, quantity, minimum_quantity, cost_price, sell_price, location, note'),
        fetchAll('repair_jobs', 'id, created_at, job_no, status, payload'),
        fetchAll('repair_job_parts', '*', 'issued_at'),
        fetchAll('repair_job_history', 'repair_job_id, at, text', 'at'),
        // Latest movements only; enough for the history screens.
        db.from('inventory_transactions')
          .select('id, created_at, item_id, repair_job_id, transaction_type, quantity, note, voided_at')
          .order('created_at', { ascending: false })
          .limit(1000),
      ])
      if (settings.error) throw settings.error
      if (txs.error) throw txs.error

      const partsByJob = new Map<string, JobPart[]>()
      for (const r of [...jobParts].reverse()) {
        const list = partsByJob.get(str(r.repair_job_id)) ?? []
        list.push({
          id: str(r.id),
          partId: str(r.item_id),
          partCode: str(r.part_code),
          partName: str(r.part_name),
          qty: num(r.qty),
          unit: str(r.unit),
          unitCost: num(r.unit_cost),
          unitPrice: num(r.unit_price),
          issuedAt: str(r.issued_at),
          note: str(r.note),
          cancelled: r.cancelled_at != null,
        })
        partsByJob.set(str(r.repair_job_id), list)
      }
      const historyByJob = new Map<string, Job['history']>()
      for (const r of [...history].reverse()) {
        const list = historyByJob.get(str(r.repair_job_id)) ?? []
        list.push({ at: str(r.at), text: str(r.text) })
        historyByJob.set(str(r.repair_job_id), list)
      }

      const jobs: Job[] = jobRows.map((r) => {
        const p = (typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload ?? {}) as Row
        const id = str(r.id)
        return {
          id,
          jobNo: str(r.job_no),
          receivedAt: str(p.receivedAt ?? r.created_at),
          customerName: str(p.customerName ?? p.customer_name),
          phone: str(p.phone ?? p.customer_phone),
          address: str(p.address),
          brand: str(p.brand),
          model: str(p.model),
          serialNo: str(p.serialNo ?? p.serial_no),
          symptom: str(p.symptom),
          diagnosis: str(p.diagnosis),
          technicianId: str(p.technicianId ?? p.technician_id),
          status: asStatus(r.status ?? p.status),
          laborCost: num(p.laborCost ?? p.labor_cost),
          otherCost: num(p.otherCost ?? p.other_cost),
          note: str(p.note),
          parts: partsByJob.get(id) ?? [],
          history: historyByJob.get(id) ?? [],
        }
      })
      const jobNoById = new Map(jobs.map((j) => [j.id, j.jobNo]))

      const data: Snapshot = {
        company: { ...DEFAULT_COMPANY, ...((settings.data?.value as Partial<CompanyInfo>) ?? {}) },
        technicians: staff
          .filter((s) => s.active !== false && str(s.role).toUpperCase() === 'TECH')
          .map((s) => ({ id: str(s.id), name: str(s.display_name || s.username) }))
          .reverse(),
        parts: items
          .map((r) => ({
            id: str(r.id),
            code: str(r.item_code),
            name: str(r.name),
            category: str(r.category),
            compatible: str(r.compatible),
            qtyOnHand: num(r.quantity),
            unit: str(r.unit),
            costPrice: num(r.cost_price),
            sellPrice: num(r.sell_price),
            minQty: num(r.minimum_quantity),
            location: str(r.location),
            note: str(r.note),
          }))
          .sort((a, b) => a.code.localeCompare(b.code)),
        jobs,
        movements: ((txs.data ?? []) as Row[]).map((r) => ({
          id: str(r.id),
          at: str(r.created_at),
          partId: str(r.item_id),
          type: str(r.transaction_type) as MovementType,
          qty: num(r.quantity),
          jobNo: r.repair_job_id != null ? jobNoById.get(str(r.repair_job_id)) || '-' : undefined,
          note: str(r.note),
          voided: r.voided_at != null,
        })),
      }
      return { ok: true, data }
    } catch (e) {
      return { ok: false, error: toMessage(e) }
    }
  },
)

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

const requestId = z.uuid()
const text = (max = 500) => z.string().trim().max(max)
const money = z.number().min(0).max(10_000_000)

const jobFields = z.object({
  receivedAt: z.iso.datetime({ offset: true }),
  customerName: text(200).min(1, 'กรุณากรอกชื่อลูกค้า'),
  phone: text(30),
  address: text(),
  brand: text(100),
  model: text(100),
  serialNo: text(100),
  symptom: text(2000).min(1, 'กรุณาระบุอาการเสีย'),
  diagnosis: text(2000),
  technicianId: text(100),
  status: z.enum(STATUS_ORDER as [JobStatus, ...JobStatus[]]),
  laborCost: money,
  otherCost: money,
  note: text(2000),
})

function parseError(e: z.ZodError) {
  return `ข้อมูลไม่ถูกต้อง: ${e.issues.map((i) => i.message).join(', ')}`
}

/** Validates with zod but returns a Thai error instead of throwing. */
function input<T extends z.ZodType>(schema: T) {
  return (d: unknown) => {
    const r = schema.safeParse(d)
    return r.success ? { ok: true as const, value: r.data as z.infer<T> } : { ok: false as const, error: parseError(r.error) }
  }
}

export const createJob = createServerFn({ method: 'POST' })
  .validator(input(z.object({ requestId, job: jobFields })))
  .handler(({ data }) =>
    run(async () => {
      if (!data.ok) return data
      const { data: res, error } = await getSupabase().rpc('app_create_job', {
        p_request_id: data.value.requestId,
        p_job: data.value.job,
      })
      if (error) throw error
      return { ok: true, id: String((res as { id: string }).id) }
    }),
  )

export const updateJob = createServerFn({ method: 'POST' })
  .validator(input(z.object({ id: text(100).min(1), patch: jobFields.partial() })))
  .handler(({ data }) =>
    run(async () => {
      if (!data.ok) return data
      const db = getSupabase()
      const { id, patch } = data.value
      const { data: cur, error: readErr } = await db.from('repair_jobs').select('status').eq('id', id).maybeSingle()
      if (readErr) throw readErr
      if (!cur) return { ok: false, error: 'ไม่พบใบงาน' }
      const history =
        patch.status && patch.status !== cur.status ? `เปลี่ยนสถานะเป็น ${STATUS[patch.status].label}` : 'แก้ไขข้อมูลใบงาน'
      const { error } = await db.rpc('app_update_job', { p_job_id: id, p_patch: patch, p_history: history })
      if (error) throw error
      return { ok: true }
    }),
  )

export const issueJobPart = createServerFn({ method: 'POST' })
  .validator(
    input(z.object({ requestId, jobId: text(100).min(1), partId: text(100).min(1), qty: z.number().int().positive().max(100_000), note: text() })),
  )
  .handler(({ data }) =>
    run(async () => {
      if (!data.ok) return data
      const v = data.value
      const { error } = await getSupabase().rpc('app_issue_job_part', {
        p_request_id: v.requestId,
        p_job_id: v.jobId,
        p_item_id: v.partId,
        p_qty: v.qty,
        p_note: v.note,
      })
      if (error) throw error
      return { ok: true }
    }),
  )

export const cancelJobPart = createServerFn({ method: 'POST' })
  .validator(input(z.object({ requestId, jobPartId: text(100).min(1) })))
  .handler(({ data }) =>
    run(async () => {
      if (!data.ok) return data
      const { error } = await getSupabase().rpc('app_cancel_job_part', {
        p_request_id: data.value.requestId,
        p_job_part_id: data.value.jobPartId,
      })
      if (error) throw error
      return { ok: true }
    }),
  )

export const recordMovement = createServerFn({ method: 'POST' })
  .validator(
    input(
      z.object({
        requestId,
        partId: text(100).min(1),
        type: z.enum(['in', 'out', 'adjust']),
        qty: z.number().int().min(-100_000).max(100_000),
        note: text(),
      }),
    ),
  )
  .handler(({ data }) =>
    run(async () => {
      if (!data.ok) return data
      const v = data.value
      const { error } = await getSupabase().rpc('app_record_movement', {
        p_request_id: v.requestId,
        p_item_id: v.partId,
        p_type: v.type,
        p_qty: v.qty,
        p_note: v.note,
      })
      if (error) throw error
      return { ok: true }
    }),
  )

export const voidMovement = createServerFn({ method: 'POST' })
  .validator(input(z.object({ requestId, movementId: text(100).min(1) })))
  .handler(({ data }) =>
    run(async () => {
      if (!data.ok) return data
      const { error } = await getSupabase().rpc('app_void_movement', {
        p_request_id: data.value.requestId,
        p_transaction_id: data.value.movementId,
      })
      if (error) throw error
      return { ok: true }
    }),
  )

export const savePart = createServerFn({ method: 'POST' })
  .validator(
    input(
      z.object({
        id: text(100).optional(),
        code: text(100).min(1, 'กรุณากรอกรหัสอะไหล่'),
        name: text(200).min(1, 'กรุณากรอกชื่ออะไหล่'),
        category: text(100),
        compatible: text(),
        unit: text(30),
        minQty: z.number().int().min(0).max(100_000),
        costPrice: money,
        sellPrice: money,
        location: text(100),
        note: text(2000),
      }),
    ),
  )
  .handler(({ data }) =>
    run(async () => {
      if (!data.ok) return data
      const db = getSupabase()
      const p = data.value
      const { data: dup, error: dupErr } = await db.from('inventory_items').select('id').eq('item_code', p.code).limit(2)
      if (dupErr) throw dupErr
      if ((dup ?? []).some((r) => String(r.id) !== p.id)) return { ok: false, error: 'รหัสอะไหล่นี้มีอยู่แล้ว' }
      // On-hand quantity is never written here; it only changes via movements.
      const row = {
        item_code: p.code,
        name: p.name,
        category: p.category,
        compatible: p.compatible,
        unit: p.unit || 'ชิ้น',
        minimum_quantity: p.minQty,
        cost_price: p.costPrice,
        sell_price: p.sellPrice,
        location: p.location,
        note: p.note,
      }
      if (p.id) {
        const { data: upd, error } = await db
          .from('inventory_items')
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq('id', p.id)
          .select('id')
        if (error) throw error
        if (!upd?.length) return { ok: false, error: 'ไม่พบอะไหล่' }
        return { ok: true, id: p.id }
      }
      const { data: ins, error } = await db.from('inventory_items').insert({ ...row, quantity: 0 }).select('id').single()
      if (error) throw error
      return { ok: true, id: String(ins.id) }
    }),
  )

export const addTechnician = createServerFn({ method: 'POST' })
  .validator(input(z.object({ name: text(100).min(1, 'กรุณากรอกชื่อช่าง') })))
  .handler(({ data }) =>
    run(async () => {
      if (!data.ok) return data
      const { error } = await getSupabase()
        .from('staff')
        .insert({
          display_name: data.value.name,
          username: `tech-${crypto.randomUUID().slice(0, 8)}`,
          role: 'TECH',
          active: true,
        })
      if (error) throw error
      return { ok: true }
    }),
  )

export const saveCompany = createServerFn({ method: 'POST' })
  .validator(
    input(
      z.object({
        name: text(200).min(1),
        branch: text(100),
        address: text(),
        taxId: text(20),
        phones: z.array(text(20)).max(10),
      }),
    ),
  )
  .handler(({ data }) =>
    run(async () => {
      if (!data.ok) return data
      const { error } = await getSupabase()
        .from('app_settings')
        .upsert({ key: 'company', value: data.value, updated_at: new Date().toISOString() })
      if (error) throw error
      return { ok: true }
    }),
  )
