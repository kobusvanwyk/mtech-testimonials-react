import {
    Document,
    Page,
    Text,
    View,
    Image,
    StyleSheet,
    Font,
} from '@react-pdf/renderer'

// ─── Fonts ───────────────────────────────────────────────────────────────────
Font.register({
    family: 'Inter',
    fonts: [
        {
            src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
            fontWeight: 400,
        },
        {
            src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-Ek-_EeA.woff2',
            fontWeight: 700,
        },
    ],
})

// Hyphenation off — cleaner for short testimonial text
Font.registerHyphenationCallback(word => [word])

// ─── Colours ─────────────────────────────────────────────────────────────────
const C = {
    primary:      '#03B09F',
    primaryDark:  '#028a7c',
    primaryLight: '#e6f8f6',
    secondary:    '#ACC42A',
    secondaryLight: '#f3f8e0',
    dark:         '#1e293b',
    body:         '#334155',
    muted:        '#64748b',
    border:       '#e2e8f0',
    white:        '#ffffff',
    footerText:   '#d1faf6',
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({

    // Page
    page: {
        backgroundColor: C.white,
        fontFamily: 'Inter',
        fontSize: 11,
        paddingBottom: 80,       // space for fixed footer
    },

    // ── Top accent bar ──────────────────────────────
    accentBar: {
        height: 5,
        backgroundColor: C.primary,
        width: '100%',
    },

    // ── Content area ────────────────────────────────
    content: {
        paddingHorizontal: 44,
        paddingTop: 28,
    },

    // ── Header row (label + logo) ────────────────────
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    testimonialLabel: {
        fontSize: 9,
        color: C.primary,
        textTransform: 'uppercase',
        letterSpacing: 2,
        fontWeight: 700,
    },
    logo: {
        width: 130,
        height: 36,
        objectFit: 'contain',
        objectPositionX: 'right',
    },
    logoFallback: {
        fontSize: 15,
        color: C.primary,
        fontWeight: 700,
        letterSpacing: 1.5,
    },

    // ── Title ────────────────────────────────────────
    title: {
        fontSize: 24,
        fontWeight: 700,
        color: C.dark,
        lineHeight: 1.25,
        marginBottom: 10,
    },

    // ── Teal accent underline ────────────────────────
    titleUnderline: {
        height: 3,
        width: 52,
        backgroundColor: C.primary,
        borderRadius: 2,
        marginBottom: 14,
    },

    // ── Meta ─────────────────────────────────────────
    meta: {
        fontSize: 10,
        color: C.muted,
        marginBottom: 16,
    },

    // ── Tags ─────────────────────────────────────────
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 22,
    },
    chip: {
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 5,
        marginBottom: 5,
    },
    chipCondition: {
        backgroundColor: C.primaryLight,
    },
    chipProduct: {
        backgroundColor: C.secondaryLight,
    },
    chipTextCondition: {
        fontSize: 8.5,
        color: C.primaryDark,
        fontWeight: 700,
    },
    chipTextProduct: {
        fontSize: 8.5,
        color: '#6d8000',
        fontWeight: 700,
    },

    // ── Body text ────────────────────────────────────
    paragraph: {
        fontSize: 11,
        color: C.body,
        lineHeight: 1.75,
        marginBottom: 10,
    },

    // ── Gallery ──────────────────────────────────────
    gallerySection: {
        marginTop: 18,
    },
    gallerySectionLabel: {
        fontSize: 9,
        color: C.muted,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 10,
    },
    galleryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    galleryImage: {
        width: 230,
        height: 153,
        objectFit: 'cover',
        borderRadius: 6,
        marginRight: 10,
        marginBottom: 10,
    },

    // ── Divider ──────────────────────────────────────
    divider: {
        height: 1,
        backgroundColor: C.border,
        marginTop: 10,
        marginBottom: 16,
    },

    // ── Footer (absolute, pinned to bottom) ──────────
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: C.primary,
        paddingHorizontal: 44,
        paddingTop: 16,
        paddingBottom: 18,
    },
    footerContactLabel: {
        fontSize: 8,
        color: C.footerText,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 6,
    },
    footerContactRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 6,
    },
    footerSeparator: {
        fontSize: 10,
        color: C.primaryLight,
        marginHorizontal: 8,
    },
    footerContactItem: {
        fontSize: 10,
        color: C.white,
        fontWeight: 400,
    },
    footerTagline: {
        fontSize: 8.5,
        color: C.footerText,
        marginTop: 2,
    },
    footerDivider: {
        height: 1,
        backgroundColor: C.primaryDark,
        marginBottom: 10,
    },
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-ZA', {
        year: 'numeric', month: 'long', day: 'numeric',
    })
}

function buildContactItems(settings) {
    const items = []
    if (settings.pdf_contact_name)     items.push(settings.pdf_contact_name)
    if (settings.pdf_contact_phone)    items.push(`Tel: ${settings.pdf_contact_phone}`)
    if (settings.pdf_contact_email)    items.push(settings.pdf_contact_email)
    if (settings.pdf_contact_whatsapp) items.push(`WhatsApp: ${settings.pdf_contact_whatsapp}`)
    return items
}

// ─── Component ────────────────────────────────────────────────────────────────
export function TestimonialPDF({ testimonial: t, settings = {} }) {
    const hasLogo     = !!settings.pdf_logo_url?.trim()
    const contactItems = buildContactItems(settings)
    const hasFooter   = contactItems.length > 0 || !!settings.pdf_footer_tagline?.trim()
    const paragraphs  = (t.story_text || '').split('\n').filter(p => p.trim())
    const gallery     = (t.gallery_urls || []).slice(0, 6)

    return (
        <Document
            title={t.title || 'Testimonial'}
            author="Mannatech"
            subject="Customer Testimonial"
        >
            <Page size="A4" style={S.page}>

                {/* ── Accent bar ── */}
                <View style={S.accentBar} />

                {/* ── Content ── */}
                <View style={S.content}>

                    {/* Header row */}
                    <View style={S.headerRow}>
                        <Text style={S.testimonialLabel}>Customer Testimonial</Text>
                        {hasLogo
                            ? <Image src={settings.pdf_logo_url} style={S.logo} />
                            : <Text style={S.logoFallback}>MANNATECH</Text>
                        }
                    </View>

                    {/* Title */}
                    <Text style={S.title}>{t.title || 'Testimonial'}</Text>
                    <View style={S.titleUnderline} />

                    {/* Meta */}
                    <Text style={S.meta}>
                        By {t.anonymous ? 'Anonymous' : (t.person_name || 'Unknown')}
                        {'   ·   '}
                        {formatDate(t.created_at)}
                    </Text>

                    {/* Condition + Product chips */}
                    {((t.conditions?.length > 0) || (t.products?.length > 0)) && (
                        <View style={S.tagsRow}>
                            {(t.conditions || []).map((c, i) => (
                                <View key={i} style={[S.chip, S.chipCondition]}>
                                    <Text style={S.chipTextCondition}>{c}</Text>
                                </View>
                            ))}
                            {(t.products || []).map((p, i) => (
                                <View key={i} style={[S.chip, S.chipProduct]}>
                                    <Text style={S.chipTextProduct}>{p}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Story body */}
                    {paragraphs.map((para, i) => (
                        <Text key={i} style={S.paragraph}>{para}</Text>
                    ))}

                    {/* Gallery */}
                    {gallery.length > 0 && (
                        <View style={S.gallerySection}>
                            <View style={S.divider} />
                            <Text style={S.gallerySectionLabel}>Photos</Text>
                            <View style={S.galleryGrid}>
                                {gallery.map((url, i) => (
                                    <Image key={i} src={url} style={S.galleryImage} />
                                ))}
                            </View>
                        </View>
                    )}

                </View>

                {/* ── Footer ── */}
                {hasFooter && (
                    <View style={S.footer} fixed>
                        <View style={S.footerDivider} />
                        {contactItems.length > 0 && (
                            <>
                                <Text style={S.footerContactLabel}>Contact me today</Text>
                                <View style={S.footerContactRow}>
                                    {contactItems.map((item, i) => (
                                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            {i > 0 && <Text style={S.footerSeparator}>·</Text>}
                                            <Text style={S.footerContactItem}>{item}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                        {settings.pdf_footer_tagline?.trim() && (
                            <Text style={S.footerTagline}>{settings.pdf_footer_tagline}</Text>
                        )}
                    </View>
                )}

            </Page>
        </Document>
    )
}
