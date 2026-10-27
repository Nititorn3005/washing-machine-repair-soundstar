import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowLeft, Pencil, Plus, Printer, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { formatDate, formatDateTime, formatTHB, jobTotals } from '@/lib/format'
import type { Job, JobPart } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { JobForm } from '@/components/job-form'
import { CompanyDocHeader, ConfirmDialog, Field, PreviewNotice, StatusBadge } from '@/components/shared'

export const Route = createFileRoute('/jobs/$jobId')({
  component: JobDetailPage,
})

type DocType = 'ใบงานซ่อม' | 'ใบรับงาน' | 'สรุปค่าซ่อม'

function JobDetailPage() {
  const { jobId } = Route.useParams()
  const { jobs, technicians, updateJob, cancelJobPart } = useStore()
  const job = jobs.find((j) => j.id === jobId)
  const [editing, setEditing] = React.useState(false)
  const [adding, setAdding] = React.useState(false)
  const [cancelTarget, setCancelTarget] = React.useState<JobPart | null>(null)
  const [docType, setDocType] = React.useState<DocType>('ใบงานซ่อม')

  if (!job) {
    return (
      <div className="rounded-md border bg-background p-10 text-center">
        <p className="mb-4 text-lg">ไม่พบใบงานนี้</p>
        <Button asChild variant="outline"><Link to="/">กลับไปหน้าใบงาน</Link></Button>
      </div>
    )
  }

  const tech = technicians.find((t) => t.id === job.technicianId)?.name ?? '—'
  const totals = jobTotals(job)
  const locked = job.status === 'delivered' || job.status === 'cancelled'

  const print = (t: DocType) => {
    setDocType(t)
    setTimeout(() => window.print(), 50)
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-2xl font-bold">แก้ไขใบงาน {job.jobNo}</h1>
        <JobForm
          initial={job}
          submitLabel="บันทึกการแก้ไข"
          onCancel={() => setEditing(false)}
          onSubmit={(v) => {
            const r = updateJob(job.id, v)
            if (!r.ok) {
              toast.error(r.error)
              return false
            }
            toast.success('บันทึกการแก้ไขสำเร็จ')
            setEditing(false)
            return true
          }}
        />
      </div>
    )
  }

  const showParts = docType !== 'ใบรับงาน'
  const active = job.parts.filter((p) => !p.cancelled)

  return (
    <>
      <PreviewNotice />
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="lg" className="-ml-2">
          <Link to="/"><ArrowLeft /> ใบงานทั้งหมด</Link>
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="lg" onClick={() => setEditing(true)}><Pencil /> แก้ไข</Button>
          <Button variant="outline" size="lg" onClick={() => print('ใบรับงาน')}><Printer /> ใบรับงาน</Button>
          <Button variant="outline" size="lg" onClick={() => print('ใบงานซ่อม')}><Printer /> ใบงานซ่อม</Button>
          <Button variant="outline" size="lg" onClick={() => print('สรุปค่าซ่อม')}><Printer /> สรุปค่าซ่อม</Button>
        </div>
      </div>

      <article className="print-sheet rounded-md border bg-background p-4 shadow-sm sm:p-6">
        <CompanyDocHeader
          docTitle={docType}
          right={
            <div className="space-y-1 text-sm">
              <p>เลขที่ <span className="font-semibold">{job.jobNo}</span></p>
              <p>วันที่รับงาน {formatDate(job.receivedAt)}</p>
              <StatusBadge status={job.status} className="no-print" />
            </div>
          }
        />

        <div className="grid gap-4 text-[15px] sm:grid-cols-2 print:grid-cols-2">
          <InfoBlock title="ข้อมูลลูกค้า" rows={[
            ['ชื่อลูกค้า', job.customerName],
            ['เบอร์โทร', job.phone],
            ['ที่อยู่', job.address || '—'],
          ]} />
          <InfoBlock title="ข้อมูลเครื่อง" rows={[
            ['ยี่ห้อ / รุ่น', `${job.brand} ${job.model}`],
            ['หมายเลขเครื่อง', job.serialNo || '—'],
            ['ช่างผู้รับผิดชอบ', tech],
          ]} />
        </div>

        <div className="mt-4 grid gap-4 text-[15px] sm:grid-cols-2 print:grid-cols-2">
          <TextBlock title="อาการเสียที่แจ้ง" text={job.symptom} />
          <TextBlock title="ผลการตรวจเช็ก / สาเหตุ" text={job.diagnosis || '—'} />
        </div>

        {showParts && (
          <section className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">รายการอะไหล่ที่ใช้</h2>
              {!locked && (
                <Button className="no-print" onClick={() => setAdding(true)}><Plus /> เบิกอะไหล่</Button>
              )}
            </div>

            {job.parts.length === 0 ? (
              <p className="rounded-md border border-dashed p-6 text-center text-muted-foreground">ยังไม่มีการเบิกอะไหล่ในใบงานนี้</p>
            ) : (
              <>
                {/* Mobile cards (screen only) */}
                <ul className="space-y-2 md:hidden print:hidden">
                  {job.parts.map((p) => (
                    <li key={p.id} className={`rounded-md border p-3 ${p.cancelled ? 'bg-muted text-muted-foreground opacity-80' : ''}`}>
                      <div className="flex justify-between gap-2">
                        <span className="font-medium">{p.partName}</span>
                        <span className="font-semibold">{formatTHB(p.qty * p.unitPrice)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {p.partCode} · {p.qty} {p.unit} × {formatTHB(p.unitPrice)}
                      </p>
                      <p className="text-sm text-muted-foreground">เบิก {formatDateTime(p.issuedAt)}{p.note && ` · ${p.note}`}</p>
                      {!p.cancelled && !locked && (
                        <Button variant="outline" size="sm" className="mt-2 border-destructive/40 text-destructive" onClick={() => setCancelTarget(p)}>
                          <Undo2 /> ยกเลิกรายการ / คืนสต๊อก
                        </Button>
                      )}
                      {p.cancelled && <p className="mt-1 text-sm">ยกเลิกแล้ว (คืนสต๊อกแล้ว)</p>}
                    </li>
                  ))}
                </ul>

                <table className="hidden w-full border-collapse text-[14px] md:table print:table">
                  <thead>
                    <tr className="bg-secondary text-left print:bg-transparent">
                      <th className="border px-2 py-2 font-semibold">#</th>
                      <th className="border px-2 py-2 font-semibold">รหัสอะไหล่</th>
                      <th className="border px-2 py-2 font-semibold">ชื่ออะไหล่</th>
                      <th className="border px-2 py-2 text-right font-semibold">จำนวน</th>
                      <th className="border px-2 py-2 font-semibold">หน่วย</th>
                      <th className="border px-2 py-2 text-right font-semibold">ราคา/หน่วย</th>
                      <th className="border px-2 py-2 text-right font-semibold">ราคารวม</th>
                      <th className="border px-2 py-2 font-semibold">วันที่เบิก</th>
                      <th className="border px-2 py-2 font-semibold">หมายเหตุ</th>
                      <th className="no-print border px-2 py-2"><span className="sr-only">จัดการ</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {job.parts.map((p, i) => (
                      <tr key={p.id} className={p.cancelled ? 'text-muted-foreground line-through print:hidden' : ''}>
                        <td className="border px-2 py-2">{i + 1}</td>
                        <td className="border px-2 py-2 whitespace-nowrap">{p.partCode}</td>
                        <td className="border px-2 py-2">{p.partName}</td>
                        <td className="border px-2 py-2 text-right">{p.qty}</td>
                        <td className="border px-2 py-2">{p.unit}</td>
                        <td className="border px-2 py-2 text-right whitespace-nowrap">{formatTHB(p.unitPrice)}</td>
                        <td className="border px-2 py-2 text-right font-medium whitespace-nowrap">{formatTHB(p.qty * p.unitPrice)}</td>
                        <td className="border px-2 py-2 whitespace-nowrap">{formatDate(p.issuedAt)}</td>
                        <td className="border px-2 py-2">{p.cancelled ? 'ยกเลิกแล้ว' : p.note}</td>
                        <td className="no-print border px-2 py-2">
                          {!p.cancelled && !locked && (
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setCancelTarget(p)}>
                              <Undo2 /> ยกเลิก
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </section>
        )}

        {showParts && (
          <section className="mt-6 flex justify-end">
            <dl className="w-full max-w-sm space-y-1 text-[15px] print:max-w-[45%]">
              <Row label={`ค่าอะไหล่รวม (${active.length} รายการ)`} value={formatTHB(totals.partsTotal)} />
              <Row label="ค่าแรง" value={formatTHB(job.laborCost)} />
              <Row label="ค่าใช้จ่ายอื่น ๆ" value={formatTHB(job.otherCost)} />
              <div className="mt-2 flex justify-between border-t-2 border-brand-dark pt-2 text-lg font-bold">
                <dt>ยอดรวมทั้งสิ้น</dt>
                <dd>{formatTHB(totals.grandTotal)}</dd>
              </div>
              <div className="no-print mt-3 rounded-md bg-secondary p-2 text-sm text-muted-foreground">
                <Row label="ต้นทุนอะไหล่ (ภายใน)" value={formatTHB(totals.partsCost)} />
                <Row label="กำไรขั้นต้น (ภายใน)" value={formatTHB(totals.profit)} />
              </div>
            </dl>
          </section>
        )}

        {job.note && <TextBlock title="หมายเหตุ" text={job.note} className="mt-4" />}

        <div className="print-only mt-16">
          <div className="grid grid-cols-2 gap-16 text-center text-sm">
            <div><div className="border-t border-black pt-1">ลูกค้า</div><p className="mt-1">วันที่ ____/____/______</p></div>
            <div><div className="border-t border-black pt-1">ผู้รับงาน / ช่าง</div><p className="mt-1">วันที่ ____/____/______</p></div>
          </div>
        </div>
      </article>

      <section className="no-print mt-4 rounded-md border bg-background p-4">
        <h2 className="mb-2 text-lg font-semibold">ประวัติใบงาน</h2>
        <ol className="space-y-2 border-l-2 border-border pl-4">
          {[...job.history].reverse().map((h, i) => (
            <li key={i} className="text-[15px]">
              <span className="text-sm text-muted-foreground">{formatDateTime(h.at)}</span>
              <p>{h.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <AddPartDialog job={job} open={adding} onOpenChange={setAdding} />
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        title="ยกเลิกรายการอะไหล่?"
        description={cancelTarget ? `ยกเลิก ${cancelTarget.partName} จำนวน ${cancelTarget.qty} ${cancelTarget.unit} และคืนเข้าสต๊อก รายการนี้จะยังแสดงในประวัติว่าถูกยกเลิก` : ''}
        confirmLabel="ยืนยันยกเลิกรายการ"
        onConfirm={() => {
          if (!cancelTarget) return
          const r = cancelJobPart(job.id, cancelTarget.id)
          if (r.ok) toast.success('ยกเลิกรายการและคืนสต๊อกแล้ว')
          else toast.error(r.error)
        }}
      />
    </>
  )
}

function InfoBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-md border p-3">
      <h2 className="mb-1.5 font-semibold text-brand-dark">{title}</h2>
      <dl className="space-y-1">
        {rows.map(([k, val]) => (
          <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="break-words">{val}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function TextBlock({ title, text, className = '' }: { title: string; text: string; className?: string }) {
  return (
    <div className={`rounded-md border p-3 ${className}`}>
      <h2 className="mb-1 font-semibold text-brand-dark">{title}</h2>
      <p className="whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd className="font-medium whitespace-nowrap">{value}</dd>
    </div>
  )
}

function AddPartDialog({ job, open, onOpenChange }: { job: Job; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { parts, issueJobPart } = useStore()
  const [q, setQ] = React.useState('')
  const [partId, setPartId] = React.useState('')
  const [qty, setQty] = React.useState(1)
  const [note, setNote] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setQ('')
      setPartId('')
      setQty(1)
      setNote('')
      setSaving(false)
    }
  }, [open])

  const term = q.trim().toLowerCase()
  const matches = parts.filter((p) => !term || `${p.code} ${p.name} ${p.compatible}`.toLowerCase().includes(term)).slice(0, 8)
  const part = parts.find((p) => p.id === partId)

  const submit = () => {
    if (saving || !part) return
    setSaving(true)
    const r = issueJobPart(job.id, part.id, qty, note)
    if (r.ok) {
      toast.success(`เบิก ${part.name} ${qty} ${part.unit} สำเร็จ`)
      onOpenChange(false)
    } else {
      toast.error(r.error)
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เบิกอะไหล่เข้าใบงาน {job.jobNo}</DialogTitle>
          <DialogDescription>ระบบตัดสต๊อกครั้งเดียวเมื่อกดยืนยัน</DialogDescription>
        </DialogHeader>
        <Input type="search" className="h-11" placeholder="ค้นหารหัส ชื่อ หรือรุ่นที่รองรับ" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหาอะไหล่" />
        <ul className="max-h-60 space-y-1 overflow-y-auto">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                disabled={p.qtyOnHand <= 0}
                onClick={() => setPartId(p.id)}
                className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-left disabled:opacity-50 ${partId === p.id ? 'border-primary bg-red-50' : ''}`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-sm text-muted-foreground">{p.code} · {formatTHB(p.sellPrice)}/{p.unit}</span>
                </span>
                <span className={`shrink-0 text-sm ${p.qtyOnHand <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {p.qtyOnHand <= 0 ? 'หมด' : `คงเหลือ ${p.qtyOnHand}`}
                </span>
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="p-3 text-center text-muted-foreground">ไม่พบอะไหล่</li>}
        </ul>
        {part && (
          <div className="space-y-3 rounded-md bg-secondary p-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={`จำนวน (${part.unit})`}>
                <Input type="number" inputMode="numeric" min={1} max={part.qtyOnHand} className="h-11 bg-background" value={qty}
                  onChange={(e) => setQty(Math.max(0, Number(e.target.value) || 0))} />
              </Field>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">ราคารวม</p>
                <p className="text-xl font-bold">{formatTHB(qty * part.sellPrice)}</p>
              </div>
            </div>
            <Field label="หมายเหตุ">
              <Input className="h-11 bg-background" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button size="lg" disabled={!part || saving || qty <= 0} onClick={submit}>
            {saving ? 'กำลังบันทึก…' : 'ยืนยันเบิกอะไหล่'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
