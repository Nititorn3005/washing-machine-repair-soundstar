export type JobStatus =
  | 'pending_intake'
  | 'received'
  | 'queued'
  | 'repairing'
  | 'waiting_parts'
  | 'completed'
  | 'delivered'
  | 'cancelled'

export interface Technician {
  id: string
  name: string
}

export interface Part {
  id: string
  code: string
  name: string
  category: string
  compatible: string
  qtyOnHand: number
  unit: string
  costPrice: number
  sellPrice: number
  minQty: number
  location: string
  note: string
}

/** A part actually issued to a work order. Prices are snapshotted at issue time. */
export interface JobPart {
  id: string
  partId: string
  partCode: string
  partName: string
  qty: number
  unit: string
  unitCost: number
  unitPrice: number
  issuedAt: string
  note: string
  cancelled: boolean
}

export interface Job {
  id: string
  jobNo: string
  receivedAt: string
  customerName: string
  phone: string
  address: string
  brand: string
  model: string
  serialNo: string
  symptom: string
  diagnosis: string
  technicianId: string
  status: JobStatus
  laborCost: number
  otherCost: number
  note: string
  parts: JobPart[]
  history: { at: string; text: string }[]
}

export type MovementType = 'in' | 'out' | 'job_issue' | 'job_return' | 'adjust' | 'void'

export interface StockMovement {
  id: string
  at: string
  partId: string
  type: MovementType
  qty: number // signed: + adds stock, - removes stock
  jobNo?: string
  note: string
  voided: boolean
}
