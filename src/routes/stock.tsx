import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Pencil, Plus, Search, SlidersHorizontal, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { MOVEMENT_LABEL, formatDateTime, formatTHB, suggestedRestock } from '@/lib/format'
import type { Part, StockMovement } from '@/data/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog, Field, NativeSelect, PageTitle, PreviewNotice, StatCard } from '@/components/shared'

export const Route = createFileRoute('/stock')({
  component: StockPage,
})

type MoveKind = 'in' | 'out' | 'adjust'

function stockLevel(p: Part) {
  if (p.qtyOnHand <= 0) return { label: 'หมด', cls: 'bg-red-50 text-destructive border-red-200' }
  if (p.qtyOnHand <= p.minQty) return { label: 'ใกล้หมด', cls: 'bg-orange-50 text-warning border-orange-200' }
  return { label: 'ปกติ', cls: 'bg-green-50 text-success border-green-200' }
}

function StockPage() {
  const { parts, movements, voidMovement } = useStore()
  const [q, setQ] = React.useState('')
  const [category, setCategory] = React.useState('')
  const [editPart, setEditPart] = React.useState<Part | 'new' | null>(null)
  const [move, setMove] = React.useState<{ part: Part; kind: MoveKind } | null>(null)
  const [voidTarget, setVoidTarget] = React.useState<StockMovement | null>(null)

  const categories = [...new Set(parts.map((p) => p.category))].sort()
  const term = q.trim().toLowerCase()
  const filtered = parts
    .filter((p) => !category || p.category === category)
    .filter((p) => !term || `${p.code} ${p.name} ${p.compatible} ${p.location}`.toLowerCase().includes(term))
  const low = parts.filter((p) => p.qtyOnHand <= p.minQty)
  const partById = (id: string) => parts.find((p) => p.id === id)
  const stockValue = parts.reduce((s, p) => s + p.qtyOnHand * p.costPrice, 0)

  return (
    <>
      <PreviewNotice />
      <PageTitle title="สต๊อกอะไหล่">
        <Button size="lg" onClick={() => setEditPart('new')}><Plus /> เพิ่มอะไหล่</Button>
      </PageTitle>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="รายการอะไหล่" value={parts.length} />
        <StatCard label="ใกล้หมด" value={parts.filter((p) => p.qtyOnHand > 0 && p.qtyOnHand <= p.minQty).length} tone="progress" />
        <StatCard label="หมดสต๊อก" value={parts.filter((p) => p.qtyOnHand <= 0).length} tone="danger" />
        <StatCard label="มูลค่าสต๊อก (ทุน)" value={<span className="text-xl">{formatTHB(stockValue)}</span>} />
      </div>

      <Tabs defaultValue="list">
        <TabsList className="mb-3 grid h-auto w-full grid-cols-3 sm:w-auto sm:inline-grid">
          <TabsTrigger value="list" className="py-2 text-[15px]">รายการอะไหล่</TabsTrigger>
          <TabsTrigger value="restock" className="py-2 text-[15px]">
            ต้องเติม {low.length > 0 && <span className="ml-1 rounded-full bg-primary px-1.5 text-xs text-white">{low.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="history" className="py-2 text-[15px]">ประวัติสต๊อก</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <div className="mb-3 grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-[1fr_200px]">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหารหัส ชื่อ รุ่นที่รองรับ ตำแหน่ง" aria-label="ค้นหาอะไหล่" className="h-11 pl-10 text-base" />
            </div>
            <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)} aria-label="หมวดหมู่">
              <option value="">ทุกหมวดหมู่</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </div>

          <div className="grid gap-2 lg:grid-cols-2">
            {filtered.map((p) => {
              const lv = stockLevel(p)
              return (
                <div key={p.id} className="rounded-md border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-sm text-muted-foreground">{p.code} · {p.category} · {p.location}</p>
                      <p className="text-sm text-muted-foreground">รองรับ: {p.compatible || '—'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-bold leading-none">{p.qtyOnHand}</p>
                      <p className="text-sm text-muted-foreground">{p.unit}</p>
                      <span className={`mt-1 inline-block rounded-full border px-2 text-xs font-medium ${lv.cls}`}>{lv.label}</span>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 text-sm">
                    <span>ทุน {formatTHB(p.costPrice)}</span>
                    <span>ราคาขาย <b>{formatTHB(p.sellPrice)}</b></span>
                    <span>ขั้นต่ำ {p.minQty}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    <Button variant="outline" size="sm" onClick={() => setMove({ part: p, kind: 'in' })}><ArrowDownToLine /> รับเข้า</Button>
                    <Button variant="outline" size="sm" onClick={() => setMove({ part: p, kind: 'out' })}><ArrowUpFromLine /> เบิกออก</Button>
                    <Button variant="outline" size="sm" onClick={() => setMove({ part: p, kind: 'adjust' })}><SlidersHorizontal /> ปรับยอด</Button>
                    <Button variant="outline" size="sm" onClick={() => setEditPart(p)}><Pencil /> แก้ไข</Button>
                  </div>
                </div>
              )
            })}
          </div>
          {filtered.length === 0 && <p className="rounded-md border bg-background p-8 text-center text-muted-foreground">ไม่พบอะไหล่</p>}
        </TabsContent>

        <TabsContent value="restock">
          {low.length === 0 ? (
            <p className="rounded-md border bg-background p-8 text-center text-muted-foreground">สต๊อกเพียงพอทุกรายการ</p>
          ) : (
            <div className="space-y-2">
              {low.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-md border bg-background p-3">
                  <AlertTriangle className={`size-6 shrink-0 ${p.qtyOnHand <= 0 ? 'text-destructive' : 'text-warning'}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.code} · คงเหลือ {p.qtyOnHand} / ขั้นต่ำ {p.minQty} {p.unit}
                    </p>
                    <p className="text-sm">แนะนำให้เติม <b className="text-brand-dark">{suggestedRestock(p.qtyOnHand, p.minQty)} {p.unit}</b></p>
                  </div>
                  <Button size="sm" onClick={() => setMove({ part: p, kind: 'in' })}>รับเข้า</Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <ul className="divide-y rounded-md border bg-background">
            {movements.map((m) => {
              const p = partById(m.partId)
              return (
                <li key={m.id} className={`flex items-center gap-3 p-3 ${m.voided ? 'opacity-60' : ''}`}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {MOVEMENT_LABEL[m.type]} · {p?.name ?? '—'}
                      {m.voided && <span className="ml-2 rounded bg-secondary px-1.5 text-xs">ยกเลิกแล้ว</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(m.at)}{m.jobNo && ` · ใบงาน ${m.jobNo}`}{m.note && ` · ${m.note}`}
                    </p>
                  </div>
                  <span className={`shrink-0 text-lg font-bold ${m.qty < 0 ? 'text-destructive' : 'text-success'}`}>
                    {m.qty > 0 ? '+' : ''}{m.qty}
                  </span>
                  {!m.voided && !m.jobNo && m.type !== 'void' && (
                    <Button variant="ghost" size="icon" aria-label="ยกเลิกรายการนี้" className="text-destructive" onClick={() => setVoidTarget(m)}>
                      <Undo2 />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </TabsContent>
      </Tabs>

      {editPart && <PartDialog part={editPart === 'new' ? null : editPart} onClose={() => setEditPart(null)} />}
      {move && <MovementDialog part={move.part} kind={move.kind} onClose={() => setMove(null)} />}
      <ConfirmDialog
        open={!!voidTarget}
        onOpenChange={(o) => !o && setVoidTarget(null)}
        title="ยกเลิกรายการที่บันทึกผิด?"
        description="ระบบจะสร้างรายการกลับยอดและปรับจำนวนคงเหลือให้ถูกต้อง รายการเดิมยังคงอยู่ในประวัติ"
        confirmLabel="ยืนยันยกเลิก"
        onConfirm={() => {
          if (!voidTarget) return
          const r = voidMovement(voidTarget.id)
          if (r.ok) toast.success('ยกเลิกรายการและปรับยอดแล้ว')
          else toast.error(r.error)
        }}
      />
    </>
  )
}

const emptyPart: Omit<Part, 'id'> = {
  code: '', name: '', category: '', compatible: '', qtyOnHand: 0, unit: 'ชิ้น',
  costPrice: 0, sellPrice: 0, minQty: 1, location: '', note: '',
}

function PartDialog({ part, onClose }: { part: Part | null; onClose: () => void }) {
  const { savePart } = useStore()
  const [v, setV] = React.useState<Omit<Part, 'id'> & { id?: string }>(part ?? emptyPart)
  const [saving, setSaving] = React.useState(false)
  const set = (k: keyof Part, val: string | number) => setV((p) => ({ ...p, [k]: val }))
  const num = (k: keyof Part) => (e: React.ChangeEvent<HTMLInputElement>) => set(k, Math.max(0, Number(e.target.value) || 0))

  const submit = () => {
    if (saving) return
    setSaving(true)
    const r = savePart(v)
    if (r.ok) {
      toast.success('บันทึกข้อมูลอะไหล่สำเร็จ')
      onClose()
    } else {
      toast.error(r.error)
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{part ? 'แก้ไขอะไหล่' : 'เพิ่มอะไหล่ใหม่'}</DialogTitle>
          <DialogDescription>
            {part ? 'จำนวนคงเหลือปรับได้ผ่านการรับเข้า เบิกออก หรือปรับยอดเท่านั้น' : 'เพิ่มแล้วให้กด “รับเข้า” เพื่อบันทึกจำนวนเริ่มต้น'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="รหัสอะไหล่ *"><Input className="h-11" value={v.code} onChange={(e) => set('code', e.target.value)} /></Field>
          <Field label="ชื่ออะไหล่ *"><Input className="h-11" value={v.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="หมวดหมู่"><Input className="h-11" value={v.category} onChange={(e) => set('category', e.target.value)} /></Field>
          <Field label="ยี่ห้อ / รุ่นที่รองรับ"><Input className="h-11" value={v.compatible} onChange={(e) => set('compatible', e.target.value)} /></Field>
          <Field label="หน่วย"><Input className="h-11" value={v.unit} onChange={(e) => set('unit', e.target.value)} /></Field>
          <Field label="จำนวนขั้นต่ำ"><Input className="h-11" type="number" inputMode="numeric" min={0} value={v.minQty} onChange={num('minQty')} /></Field>
          <Field label="ราคาทุน (บาท)"><Input className="h-11" type="number" inputMode="decimal" min={0} value={v.costPrice} onChange={num('costPrice')} /></Field>
          <Field label="ราคาที่คิดลูกค้า (บาท)"><Input className="h-11" type="number" inputMode="decimal" min={0} value={v.sellPrice} onChange={num('sellPrice')} /></Field>
          <Field label="ตำแหน่งจัดเก็บ"><Input className="h-11" value={v.location} onChange={(e) => set('location', e.target.value)} /></Field>
          <Field label="หมายเหตุ" className="sm:col-span-2"><Textarea rows={2} value={v.note} onChange={(e) => set('note', e.target.value)} /></Field>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="lg" onClick={onClose}>ยกเลิก</Button>
          <Button size="lg" disabled={saving} onClick={submit}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const MOVE_TITLE: Record<MoveKind, string> = { in: 'รับอะไหล่เข้า', out: 'เบิกอะไหล่ออก', adjust: 'ปรับยอดคงเหลือ' }

function MovementDialog({ part, kind, onClose }: { part: Part; kind: MoveKind; onClose: () => void }) {
  const { recordMovement } = useStore()
  const [qty, setQty] = React.useState(kind === 'in' ? suggestedRestock(part.qtyOnHand, part.minQty) || 1 : 1)
  const [note, setNote] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const after = kind === 'in' ? part.qtyOnHand + qty : kind === 'out' ? part.qtyOnHand - qty : part.qtyOnHand + qty

  const submit = () => {
    if (saving) return
    if (kind === 'adjust' && !note.trim()) return toast.error('กรุณาระบุเหตุผลการปรับยอด')
    setSaving(true)
    const r = recordMovement(part.id, kind, qty, note)
    if (r.ok) {
      toast.success('บันทึกรายการสต๊อกสำเร็จ')
      onClose()
    } else {
      toast.error(r.error)
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{MOVE_TITLE[kind]}</DialogTitle>
          <DialogDescription>{part.code} · {part.name} (คงเหลือ {part.qtyOnHand} {part.unit})</DialogDescription>
        </DialogHeader>
        <Field label={kind === 'adjust' ? `จำนวนที่ปรับ (+ เพิ่ม / − ลด) (${part.unit})` : `จำนวน (${part.unit})`}>
          <Input className="h-11" type="number" inputMode="numeric" value={qty}
            min={kind === 'adjust' ? undefined : 1}
            onChange={(e) => setQty(Number(e.target.value) || 0)} />
        </Field>
        <Field label={kind === 'adjust' ? 'เหตุผล *' : 'หมายเหตุ'}>
          <Input className="h-11" value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === 'in' ? 'เช่น เลขที่ใบส่งของ / ผู้จำหน่าย' : ''} />
        </Field>
        <p className={`rounded-md bg-secondary p-3 text-[15px] ${after < 0 ? 'text-destructive' : ''}`}>
          คงเหลือหลังบันทึก: <b>{after} {part.unit}</b>
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="lg" onClick={onClose}>ยกเลิก</Button>
          <Button size="lg" disabled={saving || after < 0} onClick={submit}>{saving ? 'กำลังบันทึก…' : 'ยืนยัน'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
