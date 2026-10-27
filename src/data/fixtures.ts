// Demo data for the product preview. Every screen reads from here through
// `src/lib/store.tsx`; the Supabase milestone replaces this module with real
// queries and RPCs, so nothing else should import it directly.
import type { Job, Part, StockMovement, Technician } from './types'

export const technicians: Technician[] = [
  { id: 't1', name: 'ช่างสมชาย' },
  { id: 't2', name: 'ช่างวิทยา' },
  { id: 't3', name: 'ช่างอนุชา' },
]

export const parts: Part[] = [
  { id: 'p1', code: 'WM-BLT-001', name: 'สายพานเครื่องซักผ้า', category: 'สายพาน', compatible: 'Samsung, LG ฝาบน', qtyOnHand: 12, unit: 'เส้น', costPrice: 180, sellPrice: 350, minQty: 5, location: 'ชั้น A1', note: '' },
  { id: 'p2', code: 'WM-PMP-010', name: 'ปั๊มน้ำทิ้ง', category: 'ปั๊ม', compatible: 'LG ฝาหน้า', qtyOnHand: 2, unit: 'ตัว', costPrice: 650, sellPrice: 1200, minQty: 3, location: 'ชั้น B2', note: '' },
  { id: 'p3', code: 'WM-VLV-021', name: 'วาล์วน้ำเข้า 2 ทาง', category: 'วาล์ว', compatible: 'Samsung ทุกรุ่น', qtyOnHand: 0, unit: 'ตัว', costPrice: 320, sellPrice: 650, minQty: 2, location: 'ชั้น B1', note: 'สั่งเพิ่มแล้ว' },
  { id: 'p4', code: 'WM-BRG-6205', name: 'ลูกปืน 6205', category: 'ลูกปืน', compatible: 'Electrolux, Toshiba', qtyOnHand: 20, unit: 'ลูก', costPrice: 90, sellPrice: 250, minQty: 8, location: 'ลิ้นชัก C3', note: '' },
  { id: 'p5', code: 'WM-SEL-030', name: 'ซีลกันน้ำแกนถัง', category: 'ซีล', compatible: 'Electrolux ฝาหน้า', qtyOnHand: 4, unit: 'ชิ้น', costPrice: 120, sellPrice: 300, minQty: 4, location: 'ลิ้นชัก C1', note: '' },
  { id: 'p6', code: 'WM-PCB-100', name: 'แผงวงจรควบคุม', category: 'บอร์ด', compatible: 'Hitachi SF-150', qtyOnHand: 1, unit: 'แผง', costPrice: 2400, sellPrice: 3900, minQty: 1, location: 'ตู้ D', note: '' },
  { id: 'p7', code: 'WM-CAP-012', name: 'คาปาซิเตอร์มอเตอร์ 12µF', category: 'ไฟฟ้า', compatible: 'ทุกยี่ห้อฝาบน', qtyOnHand: 15, unit: 'ตัว', costPrice: 45, sellPrice: 150, minQty: 10, location: 'ลิ้นชัก C2', note: '' },
]

export const jobs: Job[] = [
  {
    id: 'j1', jobNo: 'JOB-2569-10-0001', receivedAt: '2026-10-20T09:15:00+07:00',
    customerName: 'คุณสมศรี ใจดี', phone: '0812345678', address: '12/3 ถ.ราษฎร์อุทิศ ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา',
    brand: 'Samsung', model: 'WA90M5120SG', serialNo: 'S9X120034', symptom: 'ถังไม่หมุน มีเสียงดัง',
    diagnosis: 'สายพานขาด ลูกปืนแตก', technicianId: 't1', status: 'completed', laborCost: 500, otherCost: 0, note: '',
    parts: [
      { id: 'jp1', partId: 'p1', partCode: 'WM-BLT-001', partName: 'สายพานเครื่องซักผ้า', qty: 1, unit: 'เส้น', unitCost: 180, unitPrice: 350, issuedAt: '2026-10-21T10:00:00+07:00', note: '', cancelled: false },
      { id: 'jp2', partId: 'p4', partCode: 'WM-BRG-6205', partName: 'ลูกปืน 6205', qty: 2, unit: 'ลูก', unitCost: 90, unitPrice: 250, issuedAt: '2026-10-21T10:05:00+07:00', note: 'เปลี่ยนคู่', cancelled: false },
    ],
    history: [
      { at: '2026-10-20T09:15:00+07:00', text: 'สร้างใบงาน' },
      { at: '2026-10-21T10:05:00+07:00', text: 'เบิกอะไหล่ 2 รายการ' },
      { at: '2026-10-22T16:30:00+07:00', text: 'เปลี่ยนสถานะเป็น ซ่อมสำเร็จ' },
    ],
  },
  {
    id: 'j2', jobNo: 'JOB-2569-10-0002', receivedAt: '2026-10-23T11:40:00+07:00',
    customerName: 'คุณประเสริฐ ทองดี', phone: '0898765432', address: 'หมู่บ้านพฤกษา ต.ควนลัง อ.หาดใหญ่',
    brand: 'LG', model: 'FM1208N6W', serialNo: '', symptom: 'น้ำไม่ระบาย ขึ้น OE',
    diagnosis: 'ปั๊มน้ำทิ้งเสีย', technicianId: 't2', status: 'waiting_parts', laborCost: 400, otherCost: 100, note: 'ค่าเดินทาง 100 บาท',
    parts: [],
    history: [{ at: '2026-10-23T11:40:00+07:00', text: 'สร้างใบงาน' }],
  },
  {
    id: 'j3', jobNo: 'JOB-2569-10-0003', receivedAt: '2026-10-25T14:00:00+07:00',
    customerName: 'ร้านซักรีดสะอาดใส', phone: '0741234567', address: 'ถ.นิพัทธ์อุทิศ 3 อ.หาดใหญ่',
    brand: 'Electrolux', model: 'EWF10844', serialNo: 'EL8890021', symptom: 'น้ำรั่วใต้เครื่อง',
    diagnosis: '', technicianId: 't3', status: 'repairing', laborCost: 600, otherCost: 0, note: '',
    parts: [
      { id: 'jp3', partId: 'p5', partCode: 'WM-SEL-030', partName: 'ซีลกันน้ำแกนถัง', qty: 1, unit: 'ชิ้น', unitCost: 120, unitPrice: 300, issuedAt: '2026-10-26T09:30:00+07:00', note: '', cancelled: false },
    ],
    history: [{ at: '2026-10-25T14:00:00+07:00', text: 'สร้างใบงาน' }],
  },
  {
    id: 'j4', jobNo: 'JOB-2569-10-0004', receivedAt: '2026-10-26T10:20:00+07:00',
    customerName: 'คุณมาลี ศรีสุข', phone: '0861112233', address: '',
    brand: 'Hitachi', model: 'SF-150XA', serialNo: '', symptom: 'เปิดไม่ติด',
    diagnosis: '', technicianId: 't1', status: 'received', laborCost: 0, otherCost: 0, note: '',
    parts: [], history: [{ at: '2026-10-26T10:20:00+07:00', text: 'สร้างใบงาน' }],
  },
  {
    id: 'j5', jobNo: 'JOB-2569-10-0005', receivedAt: '2026-10-18T08:50:00+07:00',
    customerName: 'คุณวีระ แสงทอง', phone: '0823334444', address: 'ต.คอหงส์ อ.หาดใหญ่',
    brand: 'Toshiba', model: 'AW-J800AT', serialNo: '', symptom: 'มอเตอร์ไม่หมุน',
    diagnosis: 'คาปาซิเตอร์เสื่อม', technicianId: 't2', status: 'delivered', laborCost: 350, otherCost: 0, note: '',
    parts: [
      { id: 'jp4', partId: 'p7', partCode: 'WM-CAP-012', partName: 'คาปาซิเตอร์มอเตอร์ 12µF', qty: 1, unit: 'ตัว', unitCost: 45, unitPrice: 150, issuedAt: '2026-10-18T13:00:00+07:00', note: '', cancelled: false },
    ],
    history: [{ at: '2026-10-18T08:50:00+07:00', text: 'สร้างใบงาน' }, { at: '2026-10-19T15:00:00+07:00', text: 'ส่งมอบงานแล้ว' }],
  },
]

export const movements: StockMovement[] = [
  { id: 'm1', at: '2026-10-15T09:00:00+07:00', partId: 'p1', type: 'in', qty: 13, note: 'รับของจากผู้จำหน่าย', voided: false },
  { id: 'm2', at: '2026-10-15T09:00:00+07:00', partId: 'p4', type: 'in', qty: 22, note: 'รับของจากผู้จำหน่าย', voided: false },
  { id: 'm3', at: '2026-10-18T13:00:00+07:00', partId: 'p7', type: 'job_issue', qty: -1, jobNo: 'JOB-2569-10-0005', note: '', voided: false },
  { id: 'm4', at: '2026-10-21T10:00:00+07:00', partId: 'p1', type: 'job_issue', qty: -1, jobNo: 'JOB-2569-10-0001', note: '', voided: false },
  { id: 'm5', at: '2026-10-21T10:05:00+07:00', partId: 'p4', type: 'job_issue', qty: -2, jobNo: 'JOB-2569-10-0001', note: '', voided: false },
  { id: 'm6', at: '2026-10-26T09:30:00+07:00', partId: 'p5', type: 'job_issue', qty: -1, jobNo: 'JOB-2569-10-0003', note: '', voided: false },
]
