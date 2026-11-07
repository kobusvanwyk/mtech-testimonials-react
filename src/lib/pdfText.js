// Text shared by the exported PDF (TestimonialPDF) and the PDF Settings preview.

export const PDF_DISCLAIMER =
    "This testimonial describes an individual's personal experience and is not a claim " +
    'that any product treats, cures or prevents any disease.'
export const PDF_COPYRIGHT = 'Mtech Testimonials · Mannatech SA · mtechtestimonials.co.za'

export function buildContactItems(settings) {
    const items = []
    if (settings.pdf_contact_name)     items.push(settings.pdf_contact_name)
    if (settings.pdf_contact_phone)    items.push(`Tel: ${settings.pdf_contact_phone}`)
    if (settings.pdf_contact_email)    items.push(settings.pdf_contact_email)
    if (settings.pdf_contact_whatsapp) items.push(`WhatsApp: ${settings.pdf_contact_whatsapp}`)
    return items
}
