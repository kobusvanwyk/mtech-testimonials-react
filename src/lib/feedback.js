import { createContext, useContext } from 'react'

// Shared confirm dialog and toasts (ui-guide #modal, #toast). The provider
// lives in components/FeedbackProvider.jsx and wraps the whole app.
//
//   const confirm = useConfirm()
//   if (!(await confirm({ title: 'Delete image?', body: '…', confirmLabel: 'Delete', tone: 'danger' }))) return
//
//   const toast = useToast()
//   toast.error('The image could not be deleted. Try again.')
//   toast.success('Saved')

export const FeedbackContext = createContext(null)

export function useConfirm() {
    return useContext(FeedbackContext).confirm
}

export function useToast() {
    return useContext(FeedbackContext).toast
}

// Turn a caught error into a sentence people can act on. The raw error goes to
// the console for debugging; the screen never shows things like
// "Failed to execute 'json' on 'Response'".
export function friendlyError(err, lead) {
    if (err) console.error(err)
    const msg = String(err?.message || err || '')
    const offline = /json|fetch|network|load failed|unexpected end|timed? ?out|5\d\d/i.test(msg)
    return offline
        ? `${lead} The server did not respond. Check your connection and try again in a moment.`
        : `${lead} Try again in a moment. If it keeps happening, let the developer know.`
}
