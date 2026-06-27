'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import MediaUploader from '@/components/admin/MediaUploader';
import {
  saveCollection,
  deleteCollection,
  saveSubCollection,
  deleteSubCollection,
} from '@/app/admin/actions';

type Collection = { slug: string; label: string; copy: string | null; image_url: string | null; sort_order: number };
type SubCollection = { slug: string; label: string; collection_slug: string; copy: string | null; sort_order: number };

export default function CollectionsManager({
  collections,
  subCollections,
}: {
  collections: Collection[];
  subCollections: SubCollection[];
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
  onChange,
  start,
}: {
  collection: Collection;
  subs: SubCollection[];
  onChange: () => void;
  start: (cb: () => void) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [addingSub, setAddingSub] = useState(false);

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
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: '#15140f', flexShrink: 0 }}>
            {collection.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={collection.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '1.05rem' }}>{collection.label}</p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--ink-mute)' }}>
              {subs.length} sub-collection{subs.length !== 1 ? 's' : ''} · /{collection.slug}
            </p>
          </div>
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

      {/* Sub-collections */}
      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {subs.map((s) => (
            <span key={s.slug} style={subChip}>
              {s.label}
              <button
                type="button"
                aria-label="Remove"
                onClick={() => {
                  if (confirm(`Delete sub-collection "${s.label}"?`))
                    start(async () => {
                      const res = await deleteSubCollection(s.slug);
                      if (res.ok) onChange();
                      else alert(res.message);
                    });
                }}
                style={{ marginLeft: 6, background: 'none', border: 'none', color: 'var(--ink-mute)', cursor: 'pointer' }}
              >
                ×
              </button>
            </span>
          ))}
          {addingSub ? (
            <SubEditor
              onCancel={() => setAddingSub(false)}
              onSave={(label) =>
                start(async () => {
                  const res = await saveSubCollection({ label, collection_slug: collection.slug });
                  if (res.ok) {
                    setAddingSub(false);
                    onChange();
                  } else alert(res.message);
                })
              }
            />
          ) : (
            <button type="button" onClick={() => setAddingSub(true)} style={{ ...subChip, cursor: 'pointer', color: 'var(--gold)' }}>
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

function SubEditor({ onSave, onCancel }: { onSave: (label: string) => void; onCancel: () => void }) {
  const [label, setLabel] = useState('');
  return (
    <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Sub-collection name"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && label.trim()) onSave(label.trim());
          if (e.key === 'Escape') onCancel();
        }}
        style={{ ...input, width: 200, padding: '0.4rem 0.6rem' }}
      />
      <button type="button" onClick={() => label.trim() && onSave(label.trim())} style={miniBtn}>Add</button>
      <button type="button" onClick={onCancel} style={{ ...miniBtn, padding: '0.35rem 0.6rem' }}>×</button>
    </span>
  );
}

const card: React.CSSProperties = { border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)' };
const input: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-strong)', borderRadius: 8, padding: '0.65rem 0.9rem', color: 'var(--ink)', fontSize: '0.92rem', width: '100%' };
const miniBtn: React.CSSProperties = { padding: '0.45rem 0.9rem', borderRadius: 7, border: '1px solid var(--line-strong)', background: 'transparent', color: 'var(--ink)', fontSize: '0.74rem', letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' };
const saveBtn: React.CSSProperties = { ...miniBtn, background: 'var(--gold)', color: '#0e0e0e', border: 'none', fontWeight: 600 };
const addBtn: React.CSSProperties = { ...miniBtn, padding: '0.9rem', borderStyle: 'dashed', color: 'var(--gold)' };
const subChip: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', padding: '0.4rem 0.75rem', borderRadius: 999, border: '1px solid var(--line-strong)', fontSize: '0.8rem', color: 'var(--ink-soft)' };
