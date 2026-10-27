import * as React from 'react'
import { Info } from 'lucide-react'
import type { JobStatus } from '@/data/types'
import { STATUS, type StatusTone } from '@/lib/format'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const TONE: Record<StatusTone, string> = {
  neutral: 'bg-secondary text-foreground border-border',
  progress: 'bg-orange-50 text-warning border-orange-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-300',
  success: 'bg-green-50 text-success border-green-200',
  danger: 'bg-red-50 text-destructive border-red-200',
}

export function StatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  const s = STATUS[status]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium whitespace-nowrap',
        TONE[s.tone],
        className,
      )}
    >
      {s.label}
    </span>
  )
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}

/** Company letterhead for printed work orders, receipts and reports. */
export function CompanyDocHeader({ docTitle, right }: { docTitle: string; right?: React.ReactNode }) {
  const { company } = useStore()
  return (
    <div className="mb-5 border-b-[3px] border-brand-dark pb-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5 text-sm leading-snug">
          <p className="text-lg font-bold text-brand-dark">
            {company.name} {company.branch}
          </p>
          <p>{company.address}</p>
          <p>
            เลขประจำตัวผู้เสียภาษี {company.taxId} &nbsp;·&nbsp; โทร. {company.phones.join(', ')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">{docTitle}</p>
          {right}
        </div>
      </div>
    </div>
  )
}

export function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        className,
      )}
      {...props}
    />
  )
}

export function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'ยืนยัน',
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
            ไม่ใช่ กลับไป
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PreviewNotice() {
  return (
    <div className="no-print mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>
        ตัวอย่างหน้าจอ: ข้อมูลที่แสดงเป็นข้อมูลสาธิตและยังไม่บันทึกลงฐานข้อมูลกลาง
        (จะเชื่อมต่อ Supabase ในขั้นถัดไป)
      </p>
    </div>
  )
}

export function StatCard({ label, value, tone = 'neutral' }: { label: string; value: React.ReactNode; tone?: StatusTone }) {
  const bar: Record<StatusTone, string> = {
    neutral: 'border-l-brand-dark',
    progress: 'border-l-warning',
    warning: 'border-l-amber-500',
    success: 'border-l-success',
    danger: 'border-l-destructive',
  }
  return (
    <div className={cn('rounded-md border border-l-4 bg-background p-3', bar[tone])}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  )
}
