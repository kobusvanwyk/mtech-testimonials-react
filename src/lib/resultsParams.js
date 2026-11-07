// Sort + "With photos only" for the Home and Search results (ResultsControls).
// Sort only orders; photos is a separate on/off filter.
export const SORTS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
]

// Read sort + photos from the URL. An old ?sort=photos link still works.
export function readResultsParams(searchParams) {
    const raw = searchParams.get('sort')
    return {
        sort: raw === 'oldest' ? 'oldest' : 'newest',
        photos: searchParams.get('photos') === '1' || raw === 'photos',
    }
}

// Write sort + photos into a params object, leaving defaults out of the URL.
export function writeResultsParams(out, { sort, photos }) {
    if (sort && sort !== 'newest') out.sort = sort
    if (photos) out.photos = '1'
    return out
}
