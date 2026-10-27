// Preview-only in-memory store. Its action names mirror the Supabase RPCs
// planned in PLAN.md (create_job, issue_job_part, cancel_job_part,
// record_stock_movement, void_stock_movement) so the screens keep working when
// the fixtures are swapped for the real database.
import * as React from 'react'
import * as fx from '@/data/fixtures'
import type { Job, JobPart, JobStatus, Part, StockMovement, Technician } from '@/data/types'
import { DEFAULT_COMPANY, type CompanyInfo } from '@/lib/company'
import { STATUS } from '@/lib/format'

type Result = { ok: true; id?: string } | { ok: false; error: string }

interface Store {
  company: CompanyInfo
  technicians: Technician[]
  parts: Part[]
  jobs: Job[]
  movements: StockMovement[]
  saveCompany: (c: CompanyInfo) => Result
  addTechnician: (name: string) => Result
  createJob: (j: Omit<Job, 'id' | 'jobNo' | 'parts' | 'history'>) => Result
  updateJob: (id: string, patch: Partial<Job>) => Result
  issueJobPart: (jobId: string, partId: string, qty: number, note: string) => Result
  cancelJobPart: (jobId: string, jobPartId: string) => Result
  savePart: (p: Omit<Part, 'id'> & { id?: string }) => Result
  recordMovement: (partId: string, type: 'in' | 'out' | 'adjust', qty: number, note: string) => Result
  voidMovement: (movementId: string) => Result
}

const StoreContext = React.createContext<Store | null>(null)

const uid = () => Math.random().toString(36).slice(2, 10)
const now = () => new Date().toISOString()

function nextJobNo(jobs: Job[]) {
  const d = new Date()
  const prefix = `JOB-${d.getFullYear() + 543}-${String(d.getMonth() + 1).padStart(2, '0')}-`
  const max = jobs
    .filter((j) => j.jobNo.startsWith(prefix))
    .reduce((m, j) => Math.max(m, Number(j.jobNo.slice(prefix.length))), 0)
  return prefix + String(max + 1).padStart(4, '0')
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [company, setCompany] = React.useState(DEFAULT_COMPANY)
  const [technicians, setTechnicians] = React.useState(fx.technicians)
  const [parts, setParts] = React.useState(fx.parts)
  const [jobs, setJobs] = React.useState(fx.jobs)
  const [movements, setMovements] = React.useState(fx.movements)

  const adjustStock = (partId: string, delta: number) =>
    setParts((ps) => ps.map((p) => (p.id === partId ? { ...p, qtyOnHand: p.qtyOnHand + delta } : p)))

  const store: Store = {
    company,
    technicians,
    parts,
    jobs,
    movements,
    saveCompany: (c) => {
      setCompany(c)
      return { ok: true }
    },
    addTechnician: (name) => {
      if (!name.trim()) return { ok: false, error: 'กรุณากรอกชื่อช่าง' }
      setTechnicians((t) => [...t, { id: uid(), name: name.trim() }])
      return { ok: true }
    },
    createJob: (j) => {
      const id = uid()
      const job: Job = { ...j, id, jobNo: nextJobNo(jobs), parts: [], history: [{ at: now(), text: 'สร้างใบงาน' }] }
      setJobs((js) => [job, ...js])
      return { ok: true, id }
    },
    updateJob: (id, patch) => {
      const prev = jobs.find((j) => j.id === id)
      if (!prev) return { ok: false, error: 'ไม่พบใบงาน' }
      const entries = [{ at: now(), text: 'แก้ไขข้อมูลใบงาน' }]
      if (patch.status && patch.status !== prev.status)
        entries[0] = { at: now(), text: `เปลี่ยนสถานะเป็น ${STATUS[patch.status as JobStatus].label}` }
      setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...patch, parts: j.parts, history: [...j.history, ...entries] } : j)))
      return { ok: true }
    },
    issueJobPart: (jobId, partId, qty, note) => {
      const part = parts.find((p) => p.id === partId)
      const job = jobs.find((j) => j.id === jobId)
      if (!part || !job) return { ok: false, error: 'ไม่พบข้อมูลอะไหล่หรือใบงาน' }
      if (!(qty > 0)) return { ok: false, error: 'จำนวนต้องมากกว่า 0' }
      if (qty > part.qtyOnHand) return { ok: false, error: `สต๊อกไม่พอ (คงเหลือ ${part.qtyOnHand} ${part.unit})` }
      const jp: JobPart = {
        id: uid(), partId, partCode: part.code, partName: part.name, qty, unit: part.unit,
        unitCost: part.costPrice, unitPrice: part.sellPrice, issuedAt: now(), note, cancelled: false,
      }
      adjustStock(partId, -qty)
      setMovements((m) => [{ id: uid(), at: now(), partId, type: 'job_issue', qty: -qty, jobNo: job.jobNo, note, voided: false }, ...m])
      setJobs((js) => js.map((j) => j.id === jobId
        ? { ...j, parts: [...j.parts, jp], history: [...j.history, { at: now(), text: `เบิก ${part.name} ${qty} ${part.unit}` }] }
        : j))
      return { ok: true }
    },
    cancelJobPart: (jobId, jobPartId) => {
      const job = jobs.find((j) => j.id === jobId)
      const jp = job?.parts.find((p) => p.id === jobPartId)
      if (!job || !jp) return { ok: false, error: 'ไม่พบรายการ' }
      if (jp.cancelled) return { ok: false, error: 'รายการนี้ถูกยกเลิกไปแล้ว' }
      adjustStock(jp.partId, jp.qty)
      setMovements((m) => [{ id: uid(), at: now(), partId: jp.partId, type: 'job_return', qty: jp.qty, jobNo: job.jobNo, note: 'ยกเลิกรายการในใบงาน', voided: false }, ...m])
      setJobs((js) => js.map((j) => j.id === jobId
        ? { ...j, parts: j.parts.map((p) => (p.id === jobPartId ? { ...p, cancelled: true } : p)), history: [...j.history, { at: now(), text: `ยกเลิก ${jp.partName} ${jp.qty} ${jp.unit} คืนสต๊อก` }] }
        : j))
      return { ok: true }
    },
    savePart: (p) => {
      if (!p.code.trim() || !p.name.trim()) return { ok: false, error: 'กรุณากรอกรหัสและชื่ออะไหล่' }
      if (parts.some((x) => x.code === p.code && x.id !== p.id)) return { ok: false, error: 'รหัสอะไหล่นี้มีอยู่แล้ว' }
      if (p.id) {
        // On-hand quantity only changes through stock movements.
        setParts((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...p, qtyOnHand: x.qtyOnHand } : x)))
      } else {
        setParts((ps) => [...ps, { ...p, id: uid(), qtyOnHand: 0 }])
      }
      return { ok: true }
    },
    recordMovement: (partId, type, qty, note) => {
      const part = parts.find((p) => p.id === partId)
      if (!part) return { ok: false, error: 'ไม่พบอะไหล่' }
      const delta = type === 'in' ? qty : type === 'out' ? -qty : qty
      if (type !== 'adjust' && !(qty > 0)) return { ok: false, error: 'จำนวนต้องมากกว่า 0' }
      if (part.qtyOnHand + delta < 0) return { ok: false, error: 'จำนวนคงเหลือติดลบไม่ได้' }
      adjustStock(partId, delta)
      setMovements((m) => [{ id: uid(), at: now(), partId, type, qty: delta, note, voided: false }, ...m])
      return { ok: true }
    },
    voidMovement: (movementId) => {
      const mv = movements.find((m) => m.id === movementId)
      if (!mv) return { ok: false, error: 'ไม่พบรายการ' }
      if (mv.voided) return { ok: false, error: 'รายการนี้ถูกยกเลิกไปแล้ว' }
      if (mv.jobNo) return { ok: false, error: 'รายการที่ผูกกับใบงาน ให้ยกเลิกจากหน้าใบงาน' }
      const part = parts.find((p) => p.id === mv.partId)
      if (part && part.qtyOnHand - mv.qty < 0) return { ok: false, error: 'ยกเลิกแล้วคงเหลือจะติดลบ' }
      adjustStock(mv.partId, -mv.qty)
      setMovements((m) => [
        { id: uid(), at: now(), partId: mv.partId, type: 'void', qty: -mv.qty, note: 'ยกเลิกรายการที่บันทึกผิด', voided: false },
        ...m.map((x) => (x.id === movementId ? { ...x, voided: true } : x)),
      ])
      return { ok: true }
    },
  }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore() {
  const s = React.useContext(StoreContext)
  if (!s) throw new Error('useStore must be used inside StoreProvider')
  return s
}
