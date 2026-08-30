'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MediaUploader from '@/components/admin/MediaUploader';
import Img from '@/components/Img';
import {
  saveCollection,
  deleteCollection,
  saveSubCollection,
  deleteSubCollection,
} from '@/app/admin/actions';

type Collection = { slug: string; label: string; copy: string | null; image_url: string | null; sort_order: number };
type SubCollection = {
  slug: string;
  label: string;
  collection_slug: string;
  copy: string | null;
  image_url: string | null;
  sort_order: number;
};

/** Key products are counted by: "<category label>␟<sub_category label>". */
const countKey = (category: string, sub: string) => `${category}␟${sub}`;

export default function CollectionsManager({
  collections,
  subCollections,
  counts,
}: {
  collections: Collection[];
  subCollections: SubCollection[];
  /** Product count per category/sub-category pair, for the drill-down links. */
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const refresh = () => router.refresh();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', opacity: pending ? 0.6 : 1 }}>
      {collections.map((c) => (
        <CollectionCard
          key={c.slug}
          collection={c}
          subs={subCollections.filter((s) => s.collection_slug === c.slug)}
          counts={counts}
          onChange={refresh}
          start={start}
        />
      ))}

      {adding ? (
        <CollectionEditor
          onCancel={() => setAdding(false)}
          onSave={(input) =>
            start(async () => {
              const res = await saveCollection(input);
              if (res.ok) {
                setAdding(false);
                refresh();
              } else alert(res.message);
            })
          }
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} style={addBtn}>
          + New collection
        </button>
      )}
    </div>
  );
}

function CollectionCard({
  collection,
  subs,
  counts,
  onChange,
  start,
}: {
  collection: Collection;
  subs: SubCollection[];
  counts: Record<string, number>;
  onChange: () => void;
  start: (cb: () => void) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [addingSub, setAddingSub] = useState(false);

  const collectionTotal = subs.reduce(
    (sum, s) => sum + (counts[countKey(collection.label, s.label)] ?? 0),
    0,
  );

  return (
    <div style={card}>
      {editing ? (
        <CollectionEditor
          collection={collection}
          onCancel={() => setEditing(false)}
          onSave={(input) =>
            start(async () => {
              const res = await saveCollection({ ...input, slug: collection.slug });
              if (res.ok) {
                setEditing(false);
                onChange();
              } else alert(res.message);
            })
          }
        />
      ) : (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: '#15140f', flexShrink: 0 }}>
            {collection.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <Img src={collection.image_url} alt="" sizes="64px" widths={[64, 128, 192]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <p style={{ margin: 0, fontSize: '1.05rem' }}>{collection.label}</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--ink-mute)' }}>
              {subs.length} sub-collection{subs.length !== 1 ? 's' : ''} · /{collection.slug} ·{' '}
              {collectionTotal} product{collectionTotal !== 1 ? 's' : ''}
            </p>
          </div>
          {/* Straight into the admin product list, pre-filtered to this
              category — the drill-down the collections page needed. */}
          <Link href={`/admin/products?category=${encodeURIComponent(collection.label)}`} style={miniBtnLink}>
            View products
          </Link>
          <button type="button" onClick={() => setEditing(true)} style={miniBtn}>Edit</button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete "${collection.label}" and its sub-collections?`))
                start(async () => {
                  const res = await deleteCollection(collection.slug);
                  if (res.ok) onChange();
                  else alert(res.message);
                });
            }}
            style={{ ...miniBtn, color: '#e08a8a', borderColor: 'rgba(224,138,138,0.4)' }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Sub-collections — a card each, because each one carries the image
          the shop uses as that sub-collection's card background. A chip had
          nowhere to show or change it. */}
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
          Sub-collections
        </p>
        <div style={subGrid}>
          {subs.map((s) => (
            <SubCard
              key={s.slug}
              sub={s}
              collectionLabel={collection.label}
              count={counts[countKey(collection.label, s.label)] ?? 0}
              onChange={onChange}
              start={start}
            />
          ))}
        </div>

        <div style={{ marginTop: '0.85rem' }}>
          {addingSub ? (
            <SubCollectionEditor
              onCancel={() => setAddingSub(false)}
              onSave={(input) =>
                start(async () => {
                  const res = await saveSubCollection({ ...input, collection_slug: collection.slug });
                  if (res.ok) {
                    setAddingSub(false);
                    onChange();
                  } else alert(res.message);
                })
              }
            />
          ) : (
            <button type="button" onClick={() => setAddingSub(true)} style={{ ...miniBtn, borderStyle: 'dashed', color: 'var(--gold)' }}>
              + Sub-collection
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CollectionEditor({
  collection,
  onSave,
  onCancel,
}: {
  collection?: Collection;
  onSave: (input: { label: string; copy: string | null; image_url: string | null }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(collection?.label ?? '');
  const [copy, setCopy] = useState(collection?.copy ?? '');
  const [image, setImage] = useState<string[]>(collection?.image_url ? [collection.image_url] : []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Collection name" style={input} />
      <input value={copy} onChange={(e) => setCopy(e.target.value)} placeholder="Short description (optional)" style={input} />
      <MediaUploader label="Collection image" accept="image" value={image} onChange={setImage} />
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button type="button" onClick={() => onSave({ label, copy: copy || null, image_url: image[0] ?? null })} style={saveBtn}>Save</button>
        <button type="button" onClick={onCancel} style={miniBtn}>Cancel</button>
      </div>
    </div>
  );
}

/**
 * One sub-collection: its shop card image, name, product count, and the
 * controls to change or remove it. The image is what the storefront renders
 * as that card's background, so it is editable here rather than only being
 * inherited from whichever product happened to sort first.
 */
function SubCard({
  sub,
  collectionLabel,
  count,
  onChange,
  start,
}: {
  sub: SubCollection;
  collectionLabel: string;
  count: number;
  onChange: () => void;
  start: (cb: () => void) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div style={subCard}>
        <SubCollectionEditor
          sub={sub}
          onCancel={() => setEditing(false)}
          onSave={(input) =>
            start(async () => {
              const res = await saveSubCollection({
                ...input,
                slug: sub.slug,
                collection_slug: sub.collection_slug,
              });
              if (res.ok) {
                setEditing(false);
                onChange();
              } else alert(res.message);
            })
          }
        />
      </div>
    );
  }

  return (
    <div style={subCard}>
      <Link
        href={`/admin/products?category=${encodeURIComponent(collectionLabel)}&sub=${encodeURIComponent(sub.label)}`}
        style={{ ...subChipLink, display: 'block' }}
        title={`View ${count} product${count !== 1 ? 's' : ''} in ${sub.label}`}
      >
        <div style={subThumb}>
          {sub.image_url ? (
            <Img
              src={sub.image_url}
              alt=""
              sizes="180px"
              widths={[180, 360, 540]}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '0.7rem', color: 'var(--ink-mute)' }}>No image</span>
          )}
        </div>
        <p style={{ margin: '0.6rem 0 0', fontSize: '0.9rem' }}>{sub.label}</p>
        <p style={{ margin: '0.15rem 0 0', fontSize: '0.74rem', color: 'var(--ink-mute)' }}>
          {count} product{count !== 1 ? 's' : ''}
        </p>
      </Link>

      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem' }}>
        <button type="button" onClick={() => setEditing(true)} style={{ ...miniBtn, flex: 1, padding: '0.35rem 0.5rem' }}>
          Edit
        </button>
        <button
          type="button"
          aria-label={`Delete ${sub.label}`}
          onClick={() => {
            if (confirm(`Delete sub-collection "${sub.label}"?`))
              start(async () => {
                const res = await deleteSubCollection(sub.slug);
                if (res.ok) onChange();
                else alert(res.message);
              });
          }}
          style={{ ...miniBtn, padding: '0.35rem 0.6rem', color: '#e08a8a', borderColor: 'rgba(224,138,138,0.4)' }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/** Create/edit form for a sub-collection, including its card image. */
function SubCollectionEditor({
  sub,
  onSave,
  onCancel,
}: {
  sub?: SubCollection;
  onSave: (input: { label: string; copy: string | null; image_url: string | null }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(sub?.label ?? '');
  const [copy, setCopy] = useState(sub?.copy ?? '');
  const [image, setImage] = useState<string[]>(sub?.image_url ? [sub.image_url] : []);

  const submit = () => {
    if (!label.trim()) return;
    onSave({ label: label.trim(), copy: copy || null, image_url: image[0] ?? null });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Sub-collection name"
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') onCancel();
        }}
        style={input}
      />
      <input
        value={copy}
        onChange={(e) => setCopy(e.target.value)}
        placeholder="Short description (optional)"
        style={input}
      />
      <MediaUploader label="Card image" accept="image" value={image} onChange={setImage} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={submit} style={saveBtn}>Save</button>
        <button type="button" onClick={onCancel} style={miniBtn}>Cancel</button>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)' };
// Styled by the admin layout stylesheet.
const input: React.CSSProperties = { width: '100%' };
const miniBtn: React.CSSProperties = { padding: '0.45rem 0.9rem', borderRadius: 7, border: '1px solid var(--line-strong)', background: 'transparent', color: 'var(--ink)', fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' };
const miniBtnLink: React.CSSProperties = { ...miniBtn, textDecoration: 'none', display: 'inline-block' };
const saveBtn: React.CSSProperties = { ...miniBtn, background: 'var(--gold)', color: '#0e0e0e', border: 'none', fontWeight: 600 };
const addBtn: React.CSSProperties = { ...miniBtn, padding: '0.9rem', borderStyle: 'dashed', color: 'var(--gold)' };
const subGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.85rem' };
const subCard: React.CSSProperties = { border: '1px solid var(--line-strong)', borderRadius: 10, padding: '0.7rem', background: 'rgba(255,255,255,0.02)' };
// Square, matching the 1:1 the storefront now uses for every product image.
const subThumb: React.CSSProperties = { aspectRatio: '1 / 1', borderRadius: 7, overflow: 'hidden', background: '#15140f', display: 'grid', placeItems: 'center' };
const subChipLink: React.CSSProperties = { color: 'inherit', textDecoration: 'none' };
