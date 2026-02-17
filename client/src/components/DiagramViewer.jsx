import { useEffect, useMemo, useRef, useState } from 'react';

function normalizeTitle(diagramId) {
  if (!diagramId) return 'Diagram';
  return diagramId
    .replace(/[-_]/g, ' ')
    .replace(/\b(\w)/g, (match) => match.toUpperCase());
}

export default function DiagramViewer({ diagramId, hotspots = [], onAllExplored }) {
  const safeId = typeof diagramId === 'string' && diagramId.trim() ? diagramId.trim() : '';
  const safeHotspots = Array.isArray(hotspots) ? hotspots.filter((item) => item && item.id) : [];
  const hotSpotMap = useMemo(() => {
    const map = new Map();
    safeHotspots.forEach((hotspot) => map.set(String(hotspot.id), hotspot));
    return map;
  }, [safeHotspots]);

  const [svgText, setSvgText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadingError, setLoadingError] = useState('');
  const [explored, setExplored] = useState(() => new Set());
  const [popover, setPopover] = useState(null);

  const containerRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!safeId) {
      setSvgText('');
      setLoading(false);
      setError(true);
      setLoadingError('No diagram selected.');
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(false);
    setLoadingError('');

    fetch(`/diagrams/${safeId}.svg`)
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          throw new Error(`Unable to load diagram (${response.status})`);
        }
        const text = await response.text();
        if (!active) return;
        setSvgText(text);
      })
      .catch((e) => {
        if (!active) return;
        setError(true);
        setLoadingError(e?.message || 'Failed to load diagram');
        setSvgText('');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [safeId]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !svgText) return;

    const cleanup = [];
    const nodes = Array.from(root.querySelectorAll('[data-hotspot-id]'));

    nodes.forEach((node) => {
      const id = String(node.getAttribute('data-hotspot-id') || '');
      const definition = hotSpotMap.get(id);
      if (!definition) return;

      node.style.cursor = 'pointer';
      node.style.transition = 'stroke 0.2s, fill 0.2s, opacity 0.2s';
      node.classList.add('diagram-hotspot-node');
      if (explored.has(id)) {
        node.classList.add('diagram-hotspot-explored');
      }

      const onEnter = (event) => {
        event.preventDefault();
        const rect = node.getBoundingClientRect();
        setPopover({
          id,
          x: Math.min(rect.right + 8, window.innerWidth - 300),
          y: Math.max(8, rect.top + window.scrollY),
          title: definition.label || id,
          content: definition.content || '',
        });
        setExplored((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      };

      node.addEventListener('click', onEnter);
      node.setAttribute('role', 'button');
      node.setAttribute('tabindex', '0');

      cleanup.push(() => {
        node.removeEventListener('click', onEnter);
        node.classList.remove('diagram-hotspot-node', 'diagram-hotspot-explored');
      });
    });

    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, [svgText, hotSpotMap, explored]);

  useEffect(() => {
    const onOutside = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest('[data-hotspot-popup]')) return;
      setPopover(null);
    };

    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  useEffect(() => {
    if (safeHotspots.length === 0) return;
    if (explored.size < safeHotspots.length) return;
    onAllExplored?.();
  }, [explored.size, safeHotspots.length, onAllExplored]);

  const progressText = safeHotspots.length === 0 ? null : `Explored ${explored.size}/${safeHotspots.length} areas`;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <style>{`
        .diagram-hotspot-explored {
          outline: 2px dashed rgba(16, 185, 129, 0.85);
          outline-offset: 2px;
        }
        .diagram-hotspot-node {
          opacity: 0.95;
        }
      `}</style>

      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{normalizeTitle(safeId)}</p>
        {progressText ? <p className="text-xs text-slate-500">{progressText}</p> : null}
      </div>

      {loading && <p className="text-sm text-slate-500">Loading diagram…</p>}

      {!loading && error && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">Couldn&apos;t load diagram: {loadingError}</p>
          <p className="mt-2 text-xs text-amber-800">Tip: check that `/public/diagrams/${safeId}.svg` exists.</p>
          <div className="mt-3 h-40 rounded-lg border border-amber-200 bg-white p-4 text-center text-sm text-slate-700">
            <p className="mt-12 font-semibold">{normalizeTitle(safeId)}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="relative overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div
            ref={containerRef}
            className="mx-auto max-w-[900px]"
            dangerouslySetInnerHTML={{ __html: svgText }}
          />
        </div>
      )}

      {popover && (
        <div
          data-hotspot-popup
          className="pointer-events-auto absolute z-20 max-w-[300px] rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
          style={{ left: `${Math.max(10, popover.x)}px`, top: `${popover.y}px` }}
        >
          <button
            type="button"
            onClick={() => setPopover(null)}
            className="absolute right-2 top-2 rounded-full px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            aria-label="Close hotspot"
          >
            ×
          </button>
          <p className="pr-5 text-sm font-bold text-slate-900">{popover.title}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">{popover.content}</p>
        </div>
      )}

      {!loading && !error && safeHotspots.length === 0 ? (
        <p className="text-xs text-slate-500">No hotspots are defined for this diagram.</p>
      ) : null}

      {!loading && !error && safeHotspots.length > 0 && explored.size === safeHotspots.length ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          You explored all hotspots. Great work building the mental map.
        </p>
      ) : null}
    </section>
  );
}
