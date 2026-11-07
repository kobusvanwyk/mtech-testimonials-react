// Stories are stored as light markdown (**bold**, *italic* or _italic_,
// "- " and "1. " lists). Excerpts and previews need plain text, otherwise the
// raw markers show (for example "**Louise:** I was…").
export function plainStory(text) {
    return (text || '')
        .replace(/<[^>]*>/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/(^|\s)_(.+?)_(?=\s|$|[.,;:!?])/g, '$1$2')
        .replace(/^\s*(- |\d+\. )/gm, '')
        .replace(/\*\*|__/g, '')
        .trim()
}

// Plain-text excerpt cut at a word boundary, with an ellipsis when shortened.
export function storyExcerpt(text, max = 150) {
    const plain = plainStory(text).replace(/\s+/g, ' ')
    if (plain.length <= max) return plain
    const cut = plain.slice(0, max)
    const space = cut.lastIndexOf(' ')
    return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?]+$/, '') + '…'
}
