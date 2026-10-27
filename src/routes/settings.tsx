import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Lock, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CompanyDocHeader, Field, PageTitle, PreviewNotice } from '@/components/shared'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { company, saveCompany, technicians, addTechnician } = useStore()
  const [c, setC] = React.useState(company)
  const [newTech, setNewTech] = React.useState('')

  return (
    <>
      <PreviewNotice />
      <PageTitle title="ตั้งค่าระบบ" />

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <section className="space-y-3 rounded-md border bg-background p-4">
          <h2 className="text-lg font-semibold">ข้อมูลบริษัท</h2>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            ข้อมูลชุดนี้ใช้แสดงที่หัวเว็บไซต์ ส่วนท้าย ใบงาน ใบรับงาน เอกสารสรุปค่าซ่อม และรายงานทุกประเภท แก้ไขได้จากจุดนี้จุดเดียว
          </p>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <Field label="ชื่อบริษัท"><Input className="h-11" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></Field>
            <Field label="สาขา"><Input className="h-11" value={c.branch} onChange={(e) => setC({ ...c, branch: e.target.value })} /></Field>
          </div>
          <Field label="ที่อยู่"><Textarea rows={2} value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="เลขประจำตัวผู้เสียภาษี"><Input className="h-11" inputMode="numeric" value={c.taxId} onChange={(e) => setC({ ...c, taxId: e.target.value })} /></Field>
            <Field label="เบอร์โทรศัพท์ (คั่นด้วย ,)">
              <Input className="h-11" value={c.phones.join(', ')} onChange={(e) => setC({ ...c, phones: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
            </Field>
          </div>
          <Button size="lg" onClick={() => { saveCompany(c); toast.success('บันทึกข้อมูลบริษัทสำเร็จ') }}>บันทึกข้อมูลบริษัท</Button>

          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">ตัวอย่างหัวเอกสาร</p>
            <div className="rounded-md border p-4"><CompanyDocHeader docTitle="ใบงานซ่อม" /></div>
          </div>
        </section>

        <section className="space-y-3 rounded-md border bg-background p-4">
          <h2 className="text-lg font-semibold">รายชื่อช่าง</h2>
          <ul className="divide-y rounded-md border">
            {technicians.map((t) => <li key={t.id} className="px-3 py-2.5">{t.name}</li>)}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const r = addTechnician(newTech)
              if (r.ok) { toast.success('เพิ่มช่างสำเร็จ'); setNewTech('') } else toast.error(r.error)
            }}
          >
            <Input className="h-11" placeholder="ชื่อช่าง" value={newTech} onChange={(e) => setNewTech(e.target.value)} aria-label="ชื่อช่างใหม่" />
            <Button type="submit" size="lg"><Plus /> เพิ่ม</Button>
          </form>
        </section>
      </div>
    </>
  )
}
