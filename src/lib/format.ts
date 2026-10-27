import type { Job, JobPart, JobStatus, MovementType } from '@/data/types'

const thb = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
})

export const formatTHB = (n: number) => thb.format(n)

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Bangkok',
  })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Bangkok',
  })

export type StatusTone = 'neutral' | 'progress' | 'warning' | 'success' | 'danger'

export const STATUS: Record<JobStatus, { label: string; tone: StatusTone }> = {
  pending_intake: { label: 'รอรับงาน', tone: 'neutral' },
  received: { label: 'รับงานแล้ว', tone: 'neutral' },
  queued: { label: 'รอดำเนินการ', tone: 'progress' },
  repairing: { label: 'กำลังซ่อม', tone: 'progress' },
  waiting_parts: { label: 'รออะไหล่', tone: 'warning' },
  completed: { label: 'ซ่อมสำเร็จ', tone: 'success' },
  delivered: { label: 'ส่งมอบงานแล้ว', tone: 'success' },
  cancelled: { label: 'ยกเลิกงาน', tone: 'danger' },
}

export const STATUS_ORDER = Object.keys(STATUS) as JobStatus[]

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  in: 'รับเข้า',
  out: 'เบิกออก',
  job_issue: 'เบิกใช้ในใบงาน',
  job_return: 'คืนจากใบงาน',
  adjust: 'ปรับยอด',
  void: 'ยกเลิกรายการ',
}

export const activeParts = (job: Job): JobPart[] =>
  job.parts.filter((p) => !p.cancelled)

export function jobTotals(job: Job) {
  const parts = activeParts(job)
  const partsTotal = parts.reduce((s, p) => s + p.qty * p.unitPrice, 0)
  const partsCost = parts.reduce((s, p) => s + p.qty * p.unitCost, 0)
  const grandTotal = partsTotal + job.laborCost + job.otherCost
  return { partsTotal, partsCost, grandTotal, profit: grandTotal - partsCost }
}

/** Suggested restock: bring the part back to twice its minimum. */
export const suggestedRestock = (qtyOnHand: number, minQty: number) =>
  Math.max(minQty * 2 - qtyOnHand, 0)
