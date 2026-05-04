import PageHeader from '../components/PageHeader';

export interface GenericItem {
  title: string;
  meta?: string;
  desc?: string;
  tags?: string[];
  icon?: string;
}

interface Props {
  kicker: string;
  title: string;
  sub?: string;
  items?: GenericItem[];
  layout?: 'list' | 'grid-3' | 'grid-2';
  children?: React.ReactNode;
}

export default function GenericPage({ kicker, title, sub, items, layout = 'list', children }: Props) {
  return (
    <div className="page-wrap">
      <PageHeader kicker={kicker} title={title} sub={sub} />
      {children}
      {items && items.length > 0 && (
        <div className={layout === 'list' ? 'panel' : layout}>
          {layout === 'list' ? (
            items.map((it, i) => (
              <div key={i} className="mission-item">
                <div className="mission-icon">
                  <i className={it.icon ?? 'fa-solid fa-sparkles'} />
                </div>
                <div className="mission-body">
                  <div className="mission-title">{it.title}</div>
                  {it.meta && <div className="mission-meta">{it.meta}</div>}
                  {it.desc && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{it.desc}</div>}
                </div>
                {it.tags && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {it.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                )}
              </div>
            ))
          ) : (
            items.map((it, i) => (
              <div key={i} className="panel">
                {it.icon && (
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: 'var(--grad-aurora)',
                    display: 'grid', placeItems: 'center',
                    marginBottom: 14,
                    boxShadow: 'var(--glow-violet)',
                  }}>
                    <i className={it.icon} style={{ color: '#fff', fontSize: 18 }} />
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
                  {it.title}
                </div>
                {it.meta && <div style={{ fontSize: 11, letterSpacing: 2, color: 'var(--accent-cyan)', marginBottom: 8 }}>{it.meta}</div>}
                {it.desc && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{it.desc}</div>}
                {it.tags && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                    {it.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
