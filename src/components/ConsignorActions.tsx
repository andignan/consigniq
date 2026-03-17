'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Loader2, Save, X } from 'lucide-react'

interface ConsignorActionsProps {
  consignor: {
    id: string
    name: string
    phone: string | null
    email: string | null
    notes: string | null
  }
}

export default function ConsignorActions({ consignor }: ConsignorActionsProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Edit form state
  const [editName, setEditName] = useState(consignor.name)
  const [editPhone, setEditPhone] = useState(consignor.phone || '')
  const [editEmail, setEditEmail] = useState(consignor.email || '')
  const [editNotes, setEditNotes] = useState(consignor.notes || '')

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/consignors/${consignor.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim() || null,
          email: editEmail.trim() || null,
          notes: editNotes.trim() || null,
        }),
      })
      if (res.ok) {
        setEditing(false)
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save')
      }
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (deleteConfirm.trim().toLowerCase() !== consignor.name.trim().toLowerCase()) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/consignors/${consignor.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        router.push('/dashboard/consignors')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete')
        setDeleting(false)
      }
    } catch {
      setError('Failed to delete')
      setDeleting(false)
    }
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setEditing(true); setError('') }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={() => { setShowDelete(true); setError(''); setDeleteConfirm('') }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>

      {/* Edit form overlay */}
      {editing && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
          <h3 className="text-sm font-semibold text-navy-800 mb-3">Edit Consignor</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
              <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
              <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} disabled={saving || !editName.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 rounded-lg transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </button>
            <button onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-navy-800 mb-2">Delete Consignor</h3>
            <p className="text-sm text-gray-600 mb-2">
              This will permanently delete <strong>{consignor.name}</strong> and all their unsold items. This cannot be undone.
            </p>
            <p className="text-sm text-gray-600 mb-3">
              Type <strong>{consignor.name}</strong> to confirm:
            </p>
            <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={consignor.name}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 mb-3 focus:outline-none focus:ring-2 focus:ring-red-500" />
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete}
                disabled={deleteConfirm.trim().toLowerCase() !== consignor.name.trim().toLowerCase() || deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 rounded-lg transition-colors">
                {deleting ? 'Deleting...' : 'Delete Consignor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
