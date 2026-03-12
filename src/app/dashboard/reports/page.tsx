// app/dashboard/reports/page.tsx
import { FileText } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Reports</h1>
        <p className="text-sm text-gray-400">
          Reports are coming in a future update. Stay tuned!
        </p>
      </div>
    </div>
  )
}
