import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useStore } from '@/lib/store'
import { JobForm, emptyJob } from '@/components/job-form'
import { PageTitle } from '@/components/shared'

export const Route = createFileRoute('/jobs/new')({
  component: NewJobPage,
})

function NewJobPage() {
  const { createJob } = useStore()
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="สร้างใบงานใหม่" />
      <p className="mb-4 text-sm text-muted-foreground">ระบบออกเลขที่ใบงานให้อัตโนมัติเมื่อบันทึก</p>
      <JobForm
        initial={emptyJob()}
        submitLabel="บันทึกใบงาน"
        onCancel={() => navigate({ to: '/' })}
        onSubmit={(v) => {
          const r = createJob(v)
          if (!r.ok) {
            toast.error(r.error)
            return false
          }
          toast.success('บันทึกใบงานสำเร็จ')
          navigate({ to: '/jobs/$jobId', params: { jobId: r.id! } })
          return true
        }}
      />
    </div>
  )
}
