// Single source of company details used by the header, footer, printed work
// orders and reports. A later milestone loads this from the settings table in
// Supabase; the values below are the official defaults and must not be altered.
export interface CompanyInfo {
  name: string
  branch: string
  address: string
  taxId: string
  phones: string[]
}

export const DEFAULT_COMPANY: CompanyInfo = {
  name: 'บริษัท หาดใหญ่ซาวด์สตาร์ จำกัด',
  branch: '(สำนักงานใหญ่)',
  address:
    '658, 658/1, 658/2, 658/3 ม.1 ถ. เลี่ยงเมือง (สายเอเชีย) ต. ควนลัง อ. หาดใหญ่ จ. สงขลา 90110',
  taxId: '0905558005094',
  phones: ['074298900', '0955641949'],
}

export const fullCompanyName = (c: CompanyInfo) => `${c.name} ${c.branch}`
