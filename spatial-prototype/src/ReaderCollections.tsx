export const readerCollections = [
  { id: 'historical-2025', title: 'Historical issuer disclosures', count: '9 claims',
    scope: 'Dated 2025-12-31 ownership disclosures with issuer attribution, identity and control limits.' },
  { id: 'sector-2026-10', title: 'Qualified sector case panels', count: '20 panels',
    scope: 'Europe–China holdings, South Sudan food funding, Thacker Pass finance and disputes, and RSS self-reported counts. Each retains its own dates and limits.' },
] as const;

/** A collection has its own fresh opt-in; it never extends the original source count. */
export function readerCollectionHref(collection: typeof readerCollections[number]['id'], href: string): string {
  const url = new URL(href);
  url.searchParams.delete('dataset');
  url.searchParams.set('review', collection);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function ReaderCollections() {
  const href = typeof window === 'undefined' ? 'https://local.invalid/spatial/' : window.location.href;
  return <section className="reader-collections" aria-labelledby="reader-collections-title">
    <h2 id="reader-collections-title">Optional source collections</h2>
    <p>Separate qualified readers. These panels are outside the original registry counts and factual map/path network. Choose a collection, then explicitly open its verified reader.</p>
    <ul>{readerCollections.map(collection => <li key={collection.id}>
      <a href={readerCollectionHref(collection.id, href)} target="_blank" rel="noopener noreferrer">
        {collection.title} · {collection.count} <span>(opens a new tab)</span>
      </a>
      <p>{collection.scope}</p>
    </li>)}</ul>
  </section>;
}
