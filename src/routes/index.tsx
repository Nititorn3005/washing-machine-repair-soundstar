import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ChevronRight, Plus, Search } from 'lucide-react'
import { useStore } from '@/lib/store'
import { STATUS, STATUS_ORDER, formatDate, formatTHB, jobTotals } from '@/lib/format'
import type { JobStatus } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, PageTitle, PreviewNotice, StatCard, StatusBadge } from '@/components/shared'

export const Route = createFileRoute('/')({
  component: JobsPage,
})

function JobsPage() {
  const { jobs, technicians } = useStore()
  const [q, setQ] = React.useState('')
  const [status, setStatus] = React.useState<JobStatus | ''>('')

  const techName = (id: string) => technicians.find((t) => t.id === id)?.name ?? '-'
  const term = q.trim().toLowerCase()
  const filtered = jobs
    .filter((j) => !status || j.status === status)
    .filter(
      (j) =>
        !term ||
        [j.jobNo, j.customerName, j.phone, j.model, j.brand, STATUS[j.status].label]
          .join(' ')
          .toLowerCase()
          .includes(term),
    )
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))

  const count = (s: JobStatus) => jobs.filter((j) => j.status === s).length

  return (
    <>
      <PreviewNotice />
      <PageTitle title="ใบงานซ่อม">
        <Button asChild size="lg">
          <Link to="/jobs/new">
            <Plus /> สร้างใบงานใหม่
          </Link>
        </Button>
      </PageTitle>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="งานทั้งหมด" value={jobs.length} />
        <StatCard label="กำลังซ่อม" value={count('repairing')} tone="progress" />
        <StatCard label="รออะไหล่" value={count('waiting_parts')} tone="warning" />
        <StatCard label="ซ่อมสำเร็จ" value={count('completed')} tone="success" />
      </div>

      <div className="mb-4 grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา เลขที่ใบงาน ชื่อลูกค้า เบอร์โทร รุ่นเครื่อง"
            aria-label="ค้นหาใบงาน"
            className="h-11 pl-10 text-base"
          />
        </div>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as JobStatus | '')} aria-label="กรองสถานะ">
          <option value="">ทุกสถานะ</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS[s].label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <p className="mb-2 text-sm text-muted-foreground">พบ {filtered.length} ใบงาน</p>

      {filtered.length === 0 ? (
        <div className="rounded-md border bg-background p-10 text-center text-muted-foreground">
          ไม่พบใบงานที่ตรงกับการค้นหา
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-2 md:hidden">
            {filtered.map((j) => (
              <li key={j.id}>
                <Link
                  to="/jobs/$jobId"
                  params={{ jobId: j.id }}
                  className="flex items-center gap-3 rounded-md border bg-background p-3 active:bg-muted"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-brand-dark">{j.jobNo}</span>
                      <StatusBadge status={j.status} />
                    </div>
                    <p className="truncate font-medium">{j.customerName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {j.brand} {j.model} · {j.phone}
                    </p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatDate(j.receivedAt)} · {techName(j.technicianId)}
                      </span>
                      <span className="font-semibold">{formatTHB(jobTotals(j).grandTotal)}</span>
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>

          {/* Tablet / desktop: table */}
          <div className="hidden overflow-hidden rounded-md border bg-background md:block">
            <table className="w-full text-[15px]">
              <thead className="bg-secondary text-left">
                <tr className="border-b">
                  <th className="px-3 py-3 font-semibold">เลขที่ใบงาน</th>
                  <th className="px-3 py-3 font-semibold">วันที่รับ</th>
                  <th className="px-3 py-3 font-semibold">ลูกค้า</th>
                  <th className="px-3 py-3 font-semibold">เครื่อง</th>
                  <th className="px-3 py-3 font-semibold">ช่าง</th>
                  <th className="px-3 py-3 font-semibold">สถานะ</th>
                  <th className="px-3 py-3 text-right font-semibold">ยอดรวม</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => (
                  <tr key={j.id} className="border-b last:border-0 hover:bg-muted/60">
                    <td className="px-3 py-3">
                      <Link to="/jobs/$jobId" params={{ jobId: j.id }} className="font-semibold text-brand-dark hover:underline">
                        {j.jobNo}
                      </Link>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(j.receivedAt)}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{j.customerName}</div>
                      <div className="text-sm text-muted-foreground">{j.phone}</div>
                    </td>
                    <td className="px-3 py-3">
                      {j.brand} <span className="text-muted-foreground">{j.model}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{techName(j.technicianId)}</td>
                    <td className="px-3 py-3"><StatusBadge status={j.status} /></td>
                    <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                      {formatTHB(jobTotals(j).grandTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}
