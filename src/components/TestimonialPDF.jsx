import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet,
    Font,
} from '@react-pdf/renderer'

import regularTtf  from '../assets/fonts/PlusJakartaSans-Regular.ttf'
import mediumTtf   from '../assets/fonts/PlusJakartaSans-Medium.ttf'
import semiBoldTtf from '../assets/fonts/PlusJakartaSans-SemiBold.ttf'
import boldTtf     from '../assets/fonts/PlusJakartaSans-Bold.ttf'
import { displayName, hidesAuthor, normaliseNameMode } from '../lib/displayName'
import italicTtf   from '../assets/fonts/PlusJakartaSans-Italic.ttf'
import { PDF_DISCLAIMER, PDF_COPYRIGHT, buildContactItems } from '../lib/pdfText'

// Branded A4 export (ui-guide #p-pdf, DESIGN.md "PDF export preview"):
// logo header over a teal rule, the story, then a footer on every page with
// the associate's contact details and the legal disclaimer every public PDF carries.

// ─── Fonts ───────────────────────────────────────────────────────────────────
Font.register({
    family: 'PlusJakartaSans',
    fonts: [
        { src: regularTtf,  fontWeight: 400, fontStyle: 'normal' },
        { src: italicTtf,   fontWeight: 400, fontStyle: 'italic' },
        { src: mediumTtf,   fontWeight: 500, fontStyle: 'normal' },
        { src: semiBoldTtf, fontWeight: 600, fontStyle: 'normal' },
        { src: boldTtf,     fontWeight: 700, fontStyle: 'normal' },
    ],
})

Font.registerHyphenationCallback(word => [word])

// ─── Colours (design tokens; react-pdf cannot read CSS variables) ──────────
const C = {
    accent:        '#03B09F', // --accent: the header rule
    accentInk:     '#027268', // --accent-ink: teal text
    accentTint:    '#e6f8f6', // --accent-tint: condition chip ground
    secondaryInk:  '#6b7d13', // --secondary-ink: product chip text
    secondaryTint: '#f6faea', // --secondary-tint: product chip ground
    navy:          '#1a1a2e', // --dark: title and contact name
    body:          '#333333', // guide .pdf-preview body text
    muted:         '#64748b', // --text-3: meta line, section labels
    label:         '#9D9FA2', // guide .pdf-preview .db: header label
    border:        '#e2e8f0', // --border
    footRule:      '#e0e0e0', // guide .pdf-preview .pf rule
    footText:      '#777777', // guide .pdf-preview .pf text
    white:         '#ffffff',
}

const PAGE_X = 44

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
    page: {
        backgroundColor: C.white,
        fontFamily: 'PlusJakartaSans',
        fontSize: 11,
        paddingTop: 36,
        paddingHorizontal: PAGE_X,
        // paddingBottom is set per document to clear the fixed footer
    },

    // ── Header: logo left, label right, teal rule ─────────
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        marginBottom: 24,
        borderBottomWidth: 2,
        borderBottomColor: C.accent,
    },
    logo: {
        height: 34,
        maxWidth: 200,
        objectFit: 'contain',
        objectPositionX: 'left',
    },
    logoFallback: {
        fontSize: 15,
        fontWeight: 700,
        color: C.navy,
        letterSpacing: 0.5,
    },
    headerLabel: {
        fontSize: 7.5,
        fontWeight: 700,
        color: C.label,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },

    // ── Title + meta ─────────────────────────────────
    title: {
        fontSize: 24,
        fontWeight: 700,
        color: C.navy,
        lineHeight: 1.25,
        marginBottom: 6,
    },
    meta: {
        fontSize: 10,
        color: C.muted,
        marginBottom: 14,
    },

    // ── Tags (filled tint, as .tag-condition / .tag-product) ─────
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
    },
    chip: {
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 5,
        marginBottom: 5,
    },
    chipCondition: { backgroundColor: C.accentTint },
    chipProduct:   { backgroundColor: C.secondaryTint },
    chipText:          { fontSize: 8.5, fontWeight: 600 },
    chipTextCondition: { color: C.accentInk },
    chipTextProduct:   { color: C.secondaryInk },

    // ── Story ────────────────────────────────────────
    paragraph: {
        fontSize: 11,
        color: C.body,
        lineHeight: 1.7,
        marginBottom: 10,
    },
    listItem: {
        fontSize: 11,
        color: C.body,
        lineHeight: 1.6,
        marginBottom: 4,
        paddingLeft: 12,
    },

    // ── Gallery ──────────────────────────────────────
    gallerySection: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: C.border,
    },
    sectionLabel: {
        fontSize: 7.5,
        fontWeight: 700,
        color: C.muted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 10,
    },
    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },

    // ── Footer (fixed: on every page, out of the content flow) ──
    footer: {
        position: 'absolute',
        left: PAGE_X,
        right: PAGE_X,
        bottom: 26,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: C.footRule,
    },
    contact: {
        marginBottom: 8,
    },
    contactLabel: {
        fontSize: 7,
        fontWeight: 700,
        color: C.accentInk,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 3,
    },
    contactRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    contactItem: {
        fontSize: 9.5,
        fontWeight: 600,
        color: C.navy,
    },
    contactSep: {
        fontSize: 9.5,
        color: C.label,
        marginHorizontal: 6,
    },
    tagline: {
        fontSize: 8.5,
        color: C.muted,
        marginTop: 2,
    },
    disclaimer: {
        fontSize: 7.5,
        color: C.footText,
        lineHeight: 1.5,
    },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-ZA', {
        year: 'numeric', month: 'long', day: 'numeric',
    })
}


// Parse inline **bold** and _italic_ into styled runs (mirrors the web renderer
// in src/pages/Single.jsx). This both renders emphasis and strips the raw markup
// so no literal ** or _ characters end up in the exported PDF.
function inlineRuns(text) {
    const runs = []
    const regex = /(\*\*(.+?)\*\*|_(.+?)_)/g
    let last = 0, match
    while ((match = regex.exec(text)) !== null) {
        if (match.index > last) runs.push({ t: text.slice(last, match.index) })
        if (match[0].startsWith('**')) runs.push({ t: match[2], bold: true })
        else runs.push({ t: match[3], italic: true })
        last = match.index + match[0].length
    }
    if (last < text.length) runs.push({ t: text.slice(last) })
    // Safety net: drop any unmatched/stray markers so they never show in the PDF
    return runs.map(r => ({ ...r, t: r.t.replace(/\*\*|__/g, '') }))
}

const runStyle = (r) =>
    r.bold   ? { fontWeight: 700 } :
    r.italic ? { fontStyle: 'italic' } :
    undefined

// Turn story text into PDF blocks, handling bullets (- ), numbered lists (1. )
// and inline emphasis, matching how the public page renders the same text.
function renderStory(text, paraStyle, listItemStyle) {
    const lines = (text || '').split('\n')
    const blocks = []
    lines.forEach((line, i) => {
        if (!line.trim()) return
        const ul = /^- (.+)/.exec(line)
        const ol = /^(\d+)\. (.+)/.exec(line)
        let prefix = null, content = line
        if (ul)      { prefix = '•  ';            content = ul[1] }
        else if (ol) { prefix = `${ol[1]}.  `;    content = ol[2] }
        const runs = inlineRuns(content)
        blocks.push(
            <Text key={i} style={prefix ? listItemStyle : paraStyle}>
                {prefix && <Text>{prefix}</Text>}
                {runs.map((r, j) => (
                    <Text key={j} style={runStyle(r)}>{r.t}</Text>
                ))}
            </Text>
        )
    })
    return blocks
}

// ─── Component ────────────────────────────────────────────────────────────────
// settings.pdf_logo_url: the admin's logo (base64 by the time it gets here).
// settings._brand_logo: the Mtech Testimonials logo as a PNG, used when no
// custom logo is set (react-pdf cannot draw SVG files).
export function TestimonialPDF({ testimonial: t, settings = {} }) {
    const logoSrc      = settings.pdf_logo_url?.trim() || settings._brand_logo || null
    const contactItems = buildContactItems(settings)
    const tagline      = settings.pdf_footer_tagline?.trim()
    const gallery      = (t.gallery_urls || []).slice(0, 6)

    // Meta line visibility, default to showing unless explicitly turned off
    const nameMode = normaliseNameMode(settings.name_display)
    const showName = settings.pdf_show_name !== 'false' && !hidesAuthor(nameMode)
    const showDate = settings.pdf_show_date !== 'false' && settings.show_dates !== 'false'
    const nameText = showName ? `By ${displayName(t, nameMode) || 'Anonymous'}` : ''
    const dateText = showDate ? formatDate(t.created_at) : ''
    const metaText = [nameText, dateText].filter(Boolean).join('   ·   ')

    // Reserve room for the fixed footer so story text never runs under it.
    const footerH = 26 + 10 + 24 + (contactItems.length ? 30 : 0) + (tagline ? 14 : 0)
    const pageStyle = { ...S.page, paddingBottom: footerH + 16 }

    // ── Dynamic gallery grid ──────────────────────────────────────────────────
    // A4 content width = 595 - (44 * 2) = 507pt
    const CONTENT_W = 595 - PAGE_X * 2
    const GAP       = 8
    const cols      = gallery.length === 1 ? 1 : gallery.length === 2 ? 2 : 3
    const imgW      = (CONTENT_W - GAP * (cols - 1)) / cols - 0.5
    const imgH      = cols === 1 ? Math.min(imgW * 0.6, 280) : imgW * 0.68
    const galleryImageStyle = (i) => ({
        width:        imgW,
        height:       imgH,
        objectFit:    'cover',
        borderRadius: 6,
        marginRight:  (i + 1) % cols === 0 ? 0 : GAP,
        marginBottom: GAP,
    })

    // ── Font scaling ──────────────────────────────────────────────────────────
    const charCount  = (t.story_text || '').length
    const threshold  = parseInt(settings.pdf_font_threshold, 10) || 1200
    const isCompact  = charCount > threshold
    const bodySize   = isCompact ? 9.5 : 11
    const titleStyle = { ...S.title, fontSize: isCompact ? 20 : 24 }
    const metaStyle  = { ...S.meta,  fontSize: isCompact ? 9  : 10 }
    const paraStyle  = { ...S.paragraph, fontSize: bodySize }

    return (
        <Document
            title={t.title || 'Testimonial'}
            author="Mtech Testimonials"
            subject="Testimonial"
        >
            <Page size="A4" style={pageStyle}>

                {/* ── Header ── (the logos already read "Testimonials Database",
                     so the label only shows beside the text fallback) */}
                <View style={S.header}>
                    {logoSrc
                        ? <Image src={logoSrc} style={S.logo} />
                        : <>
                            <Text style={S.logoFallback}>Mtech Testimonials</Text>
                            <Text style={S.headerLabel}>Testimonials Database</Text>
                        </>
                    }
                </View>

                {/* ── Title + meta ── */}
                <Text style={titleStyle}>{t.title || 'Testimonial'}</Text>
                {metaText !== '' && <Text style={metaStyle}>{metaText}</Text>}

                {/* ── Condition + product chips ── */}
                {((t.conditions?.length > 0) || (t.products?.length > 0)) && (
                    <View style={S.tagsRow}>
                        {(t.conditions || []).map((c, i) => (
                            <View key={`c${i}`} style={[S.chip, S.chipCondition]}>
                                <Text style={[S.chipText, S.chipTextCondition]}>{c}</Text>
                            </View>
                        ))}
                        {(t.products || []).map((p, i) => (
                            <View key={`p${i}`} style={[S.chip, S.chipProduct]}>
                                <Text style={[S.chipText, S.chipTextProduct]}>{p}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Story ── */}
                {renderStory(t.story_text, paraStyle, { ...S.listItem, fontSize: bodySize })}

                {/* ── Gallery ── */}
                {gallery.length > 0 && (
                    <View style={S.gallerySection} wrap={false}>
                        <Text style={S.sectionLabel}>Photos</Text>
                        <View style={S.galleryGrid}>
                            {gallery.map((url, i) => (
                                <Image key={i} src={url} style={galleryImageStyle(i)} />
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Footer: contact, then disclaimer, on every page ── */}
                <View fixed style={S.footer}>
                    {(contactItems.length > 0 || tagline) && (
                        <View style={S.contact}>
                            {contactItems.length > 0 && (
                                <>
                                    <Text style={S.contactLabel}>Contact me today</Text>
                                    <View style={S.contactRow}>
                                        {contactItems.map((item, i) => (
                                            <View key={i} style={{ flexDirection: 'row' }}>
                                                {i > 0 && <Text style={S.contactSep}>·</Text>}
                                                <Text style={S.contactItem}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}
                            {tagline && <Text style={S.tagline}>{tagline}</Text>}
                        </View>
                    )}
                    <Text style={S.disclaimer}>
                        {PDF_DISCLAIMER} © {new Date().getFullYear()} {PDF_COPYRIGHT}
                    </Text>
                </View>

            </Page>
        </Document>
    )
}
