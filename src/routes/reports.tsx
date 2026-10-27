import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Printer } from 'lucide-react'
import { useStore } from '@/lib/store'
import { STATUS, STATUS_ORDER, formatDate, formatDateTime, formatTHB, jobTotals, suggestedRestock } from '@/lib/format'
import type { JobStatus } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CompanyDocHeader, Field, NativeSelect, PageTitle, PreviewNotice, StatCard, StatusBadge } from '@/components/shared'

export const Route = createFileRoute('/reports')({
  component: ReportsPage,
})

const th = 'border-b bg-secondary px-2 py-2 text-left font-semibold print:bg-transparent'
const td = 'border-b px-2 py-2'

function ReportsPage() {
  const { jobs, technicians, parts } = useStore()
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [status, setStatus] = React.useState<JobStatus | ''>('')
  const [tech, setTech] = React.useState('')

  const day = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' })
  const filtered = jobs
    .filter((j) => (!from || day(j.receivedAt) >= from) && (!to || day(j.receivedAt) <= to))
    .filter((j) => !status || j.status === status)
    .filter((j) => !tech || j.technicianId === tech)
    .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))

  const count = (s: JobStatus) => filtered.filter((j) => j.status === s).length
  const techName = (id: string) => technicians.find((t) => t.id === id)?.name ?? 'ไม่ระบุช่าง'
  const byTech = [...technicians.map((t) => t.id), ''].map((id) => ({
    id,
    name: techName(id),
    jobs: filtered.filter((j) => j.technicianId === id),
  })).filter((r) => r.jobs.length > 0)

  const sum = filtered.reduce(
    (s, j) => {
      const t = jobTotals(j)
      return { parts: s.parts + t.partsTotal, labor: s.labor + j.laborCost, other: s.other + j.otherCost, total: s.total + t.grandTotal, cost: s.cost + t.partsCost }
    },
    { parts: 0, labor: 0, other: 0, total: 0, cost: 0 },
  )

  const issues = filtered
    .flatMap((j) => j.parts.filter((p) => !p.cancelled).map((p) => ({ ...p, jobNo: j.jobNo, jobId: j.id })))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
  const low = parts.filter((p) => p.qtyOnHand <= p.minQty)

  const periodLabel = from || to ? `ช่วงวันที่ ${from ? formatDate(from) : 'เริ่มต้น'} – ${to ? formatDate(to) : 'ปัจจุบัน'}` : 'ทุกช่วงเวลา'

  return (
    <>
      <PreviewNotice />
      <PageTitle title="รายงาน">
        <Button variant="outline" size="lg" onClick={() => window.print()}><Printer /> พิมพ์รายงาน</Button>
      </PageTitle>

      <div className="no-print mb-4 grid grid-cols-2 gap-3 rounded-md border bg-background p-3 md:grid-cols-4">
        <Field label="ตั้งแต่วันที่"><Input type="date" className="h-11" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="ถึงวันที่"><Input type="date" className="h-11" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        <Field label="สถานะ">
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as JobStatus | '')}>
            <option value="">ทุกสถานะ</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="ช่าง">
          <NativeSelect value={tech} onChange={(e) => setTech(e.target.value)}>
            <option value="">ช่างทุกคน</option>
            {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </NativeSelect>
        </Field>
      </div>

      <article className="print-sheet space-y-6 rounded-md border bg-background p-4 sm:p-6">
        <CompanyDocHeader docTitle="รายงานสรุปงานซ่อม" right={<p className="text-sm">{periodLabel}</p>} />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 print:grid-cols-5">
          <StatCard label="งานทั้งหมด" value={filtered.length} />
          <StatCard label="กำลังซ่อม" value={count('repairing')} tone="progress" />
          <StatCard label="รออะไหล่" value={count('waiting_parts')} tone="warning" />
          <StatCard label="ซ่อมสำเร็จ" value={count('completed')} tone="success" />
          <StatCard label="ส่งมอบแล้ว" value={count('delivered')} tone="success" />
        </div>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-brand-dark">จำนวนงานแยกตามช่าง</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-[14px]">
              <thead><tr><th className={th}>ช่าง</th><th className={`${th} text-right`}>จำนวนงาน</th><th className={`${th} text-right`}>สำเร็จ/ส่งมอบ</th><th className={`${th} text-right`}>ยอดรวม</th></tr></thead>
              <tbody>
                {byTech.map((r) => (
                  <tr key={r.id || 'none'}>
                    <td className={td}>{r.name}</td>
                    <td className={`${td} text-right`}>{r.jobs.length}</td>
                    <td className={`${td} text-right`}>{r.jobs.filter((j) => j.status === 'completed' || j.status === 'delivered').length}</td>
                    <td className={`${td} text-right`}>{formatTHB(r.jobs.reduce((s, j) => s + jobTotals(j).grandTotal, 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-brand-dark">ค่าใช้จ่ายแยกตามใบงาน</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[14px]">
              <thead>
                <tr>
                  <th className={th}>เลขที่ใบงาน</th><th className={th}>วันที่</th><th className={th}>ลูกค้า</th><th className={th}>สถานะ</th>
                  <th className={`${th} text-right`}>ค่าอะไหล่</th><th className={`${th} text-right`}>ค่าแรง</th><th className={`${th} text-right`}>อื่น ๆ</th><th className={`${th} text-right`}>ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => {
                  const t = jobTotals(j)
                  return (
                    <tr key={j.id}>
                      <td className={td}><Link to="/jobs/$jobId" params={{ jobId: j.id }} className="font-medium text-brand-dark hover:underline">{j.jobNo}</Link></td>
                      <td className={`${td} whitespace-nowrap`}>{formatDate(j.receivedAt)}</td>
                      <td className={td}>{j.customerName}</td>
                      <td className={td}><StatusBadge status={j.status} className="text-xs" /></td>
                      <td className={`${td} text-right whitespace-nowrap`}>{formatTHB(t.partsTotal)}</td>
                      <td className={`${td} text-right whitespace-nowrap`}>{formatTHB(j.laborCost)}</td>
                      <td className={`${td} text-right whitespace-nowrap`}>{formatTHB(j.otherCost)}</td>
                      <td className={`${td} text-right font-semibold whitespace-nowrap`}>{formatTHB(t.grandTotal)}</td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">ไม่มีข้อมูลในเงื่อนไขที่เลือก</td></tr>}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="px-2 py-2" colSpan={4}>รวมทั้งหมด</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{formatTHB(sum.parts)}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{formatTHB(sum.labor)}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{formatTHB(sum.other)}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{formatTHB(sum.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">ต้นทุนอะไหล่รวม {formatTHB(sum.cost)} · กำไรขั้นต้น {formatTHB(sum.total - sum.cost)}</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-brand-dark">ประวัติการเบิกอะไหล่</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[14px]">
              <thead><tr><th className={th}>วันที่เบิก</th><th className={th}>ใบงาน</th><th className={th}>อะไหล่</th><th className={`${th} text-right`}>จำนวน</th><th className={`${th} text-right`}>ราคารวม</th></tr></thead>
              <tbody>
                {issues.map((p) => (
                  <tr key={p.id}>
                    <td className={`${td} whitespace-nowrap`}>{formatDateTime(p.issuedAt)}</td>
                    <td className={td}>{p.jobNo}</td>
                    <td className={td}>{p.partCode} · {p.partName}</td>
                    <td className={`${td} text-right`}>{p.qty} {p.unit}</td>
                    <td className={`${td} text-right whitespace-nowrap`}>{formatTHB(p.qty * p.unitPrice)}</td>
                  </tr>
                ))}
                {issues.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">ไม่มีการเบิกอะไหล่</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-brand-dark">อะไหล่ใกล้หมด / หมดสต๊อก</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[14px]">
              <thead><tr><th className={th}>รหัส</th><th className={th}>ชื่ออะไหล่</th><th className={`${th} text-right`}>คงเหลือ</th><th className={`${th} text-right`}>ขั้นต่ำ</th><th className={`${th} text-right`}>แนะนำเติม</th></tr></thead>
              <tbody>
                {low.map((p) => (
                  <tr key={p.id}>
                    <td className={td}>{p.code}</td>
                    <td className={td}>{p.name}</td>
                    <td className={`${td} text-right ${p.qtyOnHand <= 0 ? 'font-bold text-destructive' : ''}`}>{p.qtyOnHand} {p.unit}</td>
                    <td className={`${td} text-right`}>{p.minQty}</td>
                    <td className={`${td} text-right font-semibold`}>{suggestedRestock(p.qtyOnHand, p.minQty)}</td>
                  </tr>
                ))}
                {low.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">สต๊อกเพียงพอทุกรายการ</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </article>
    </>
  )
}
