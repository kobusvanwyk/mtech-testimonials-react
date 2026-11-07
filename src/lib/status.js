import { MessageCircle, Send, File as FileIcon, Plus } from 'lucide-react'

// Review status labels and import-source chips, shared by the admin tables,
// Dashboard, Pending Review, Duplicates and the Edit page history.

// Derive the import origin from imported_from (there is no `source` column).
export function importSource(from) {
    const f = (from || '').trim().toLowerCase()
    if (!f) return null
    if (f.startsWith('whatsapp')) return { label: 'WhatsApp', cls: 'whatsapp', Icon: MessageCircle }
    if (f.includes('telegram'))  return { label: 'Telegram', cls: 'telegram', Icon: Send }
    if (f.endsWith('.csv'))      return { label: 'CSV', cls: 'csv', Icon: FileIcon }
    if (f === 'manual_import')   return { label: 'Manual', cls: 'manual', Icon: Plus }
    return { label: 'Imported', cls: 'manual', Icon: Plus }
}

export const STATUS_MAP = {
    pending:       { label: 'Pending',       cls: 'badge-pending' },
    approved:      { label: 'Published',     cls: 'badge-approved' },
    unpublished:   { label: 'Unpublished',   cls: 'badge-unpublished' },
    needs_editing: { label: 'Needs Editing', cls: 'badge-needs-editing' },
    rejected:      { label: 'Rejected',      cls: 'badge-rejected' },
}
