import * as React from 'react'
import type { Job } from '@/data/types'
import { STATUS, STATUS_ORDER } from '@/lib/format'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, NativeSelect } from '@/components/shared'

export type JobFormValues = Omit<Job, 'id' | 'jobNo' | 'parts' | 'history'>

export const emptyJob = (): JobFormValues => ({
  receivedAt: new Date().toISOString(),
  customerName: '',
  phone: '',
  address: '',
  brand: '',
  model: '',
  serialNo: '',
  symptom: '',
  diagnosis: '',
  technicianId: '',
  status: 'received',
  laborCost: 0,
  otherCost: 0,
  note: '',
})

const toLocalInput = (iso: string) => {
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export function JobForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: JobFormValues
  submitLabel: string
  onSubmit: (v: JobFormValues) => boolean
  onCancel?: () => void
}) {
  const { technicians } = useStore()
  const [v, setV] = React.useState(initial)
  const [saving, setSaving] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const set = <K extends keyof JobFormValues>(k: K, val: JobFormValues[K]) => setV((p) => ({ ...p, [k]: val }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    const err: Record<string, string> = {}
    if (!v.customerName.trim()) err.customerName = 'กรุณากรอกชื่อลูกค้า'
    if (!/^0\d{8,9}$/.test(v.phone.replace(/[-\s]/g, ''))) err.phone = 'เบอร์โทรไม่ถูกต้อง'
    if (!v.symptom.trim()) err.symptom = 'กรุณาระบุอาการเสีย'
    setErrors(err)
    if (Object.keys(err).length) return
    setSaving(true)
    const ok = onSubmit(v)
    if (!ok) setSaving(false)
  }

  const err = (k: string) => errors[k] && <span className="text-sm text-destructive">{errors[k]}</span>

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <section className="space-y-3 rounded-md border bg-background p-4">
        <h2 className="text-lg font-semibold">ข้อมูลลูกค้า</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="วันที่รับงาน">
            <Input type="datetime-local" className="h-11" value={toLocalInput(v.receivedAt)}
              onChange={(e) => e.target.value && set('receivedAt', new Date(e.target.value).toISOString())} />
          </Field>
          <Field label="ชื่อลูกค้า *">
            <Input className="h-11" value={v.customerName} onChange={(e) => set('customerName', e.target.value)} aria-invalid={!!errors.customerName} />
            {err('customerName')}
          </Field>
          <Field label="เบอร์โทร *">
            <Input className="h-11" type="tel" inputMode="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} aria-invalid={!!errors.phone} />
            {err('phone')}
          </Field>
          <Field label="ที่อยู่">
            <Input className="h-11" value={v.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-3 rounded-md border bg-background p-4">
        <h2 className="text-lg font-semibold">ข้อมูลเครื่องและอาการ</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="ยี่ห้อ">
            <Input className="h-11" value={v.brand} onChange={(e) => set('brand', e.target.value)} />
          </Field>
          <Field label="รุ่นเครื่อง">
            <Input className="h-11" value={v.model} onChange={(e) => set('model', e.target.value)} />
          </Field>
          <Field label="หมายเลขเครื่อง (S/N)">
            <Input className="h-11" value={v.serialNo} onChange={(e) => set('serialNo', e.target.value)} />
          </Field>
        </div>
        <Field label="อาการเสียที่ลูกค้าแจ้ง *">
          <Textarea rows={2} value={v.symptom} onChange={(e) => set('symptom', e.target.value)} aria-invalid={!!errors.symptom} />
          {err('symptom')}
        </Field>
        <Field label="ผลการตรวจเช็ก / สาเหตุ">
          <Textarea rows={2} value={v.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} />
        </Field>
      </section>

      <section className="space-y-3 rounded-md border bg-background p-4">
        <h2 className="text-lg font-semibold">การดำเนินงานและค่าใช้จ่าย</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ช่างผู้รับผิดชอบ">
            <NativeSelect value={v.technicianId} onChange={(e) => set('technicianId', e.target.value)}>
              <option value="">— ยังไม่ระบุ —</option>
              {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="สถานะงาน">
            <NativeSelect value={v.status} onChange={(e) => set('status', e.target.value as JobFormValues['status'])}>
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
            </NativeSelect>
          </Field>
          <Field label="ค่าแรง (บาท)">
            <Input className="h-11" type="number" inputMode="decimal" min={0} step="0.01" value={v.laborCost}
              onChange={(e) => set('laborCost', Math.max(0, Number(e.target.value) || 0))} />
          </Field>
          <Field label="ค่าใช้จ่ายอื่น ๆ (บาท)">
            <Input className="h-11" type="number" inputMode="decimal" min={0} step="0.01" value={v.otherCost}
              onChange={(e) => set('otherCost', Math.max(0, Number(e.target.value) || 0))} />
          </Field>
        </div>
        <Field label="หมายเหตุ">
          <Textarea rows={2} value={v.note} onChange={(e) => set('note', e.target.value)} />
        </Field>
      </section>

      <div className="sticky bottom-20 z-10 flex gap-2 rounded-md border bg-background/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        {onCancel && (
          <Button type="button" variant="outline" size="lg" className="flex-1 md:flex-none" onClick={onCancel}>
            ยกเลิก
          </Button>
        )}
        <Button type="submit" size="lg" className="flex-1 md:flex-none" disabled={saving}>
          {saving ? 'กำลังบันทึก…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
