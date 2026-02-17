import { useMemo, useState, useEffect } from 'react';

import { getGlossary } from '../utils/api';

const MODULE_OPTIONS = Array.from({ length: 8 }, (_, index) => ({
  value: `module-${index + 1}`,
  label: `Module ${index + 1}`,
}));

export default function GlossaryPage() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [expanded, setExpanded] = useState(() => new Set());

  useEffect(() => {
    let active = true;

    getGlossary()
      .then((data) => {
        if (!active) return;
        const rawTerms = Array.isArray(data?.terms) ? data.terms : [];
        setTerms(rawTerms);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Unable to load glossary.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredTerms = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return terms
      .filter((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        const matchesModule = moduleFilter === 'all' || entry.module === moduleFilter;
        if (!matchesModule) return false;
        if (!normalizedSearch) return true;

        const target = `${entry.term || ''} ${entry.definition || ''}`.toLowerCase();
        return target.includes(normalizedSearch);
      })
      .map((entry, index) => ({
        ...entry,
        __id: `${entry.term || 'term'}-${index}`,
      }))
      .sort((a, b) => `${a.term || ''}`.localeCompare(`${b.term || ''}`));
  }, [terms, search, moduleFilter]);

  const toggleExpanded = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3 animate-pulse">
          <div className="h-6 w-40 rounded bg-slate-200" />
          <div className="h-4 w-1/2 rounded bg-slate-200" />
          <div className="h-32 rounded bg-slate-200" />
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Glossary</h1>
        <p className="mt-2 text-sm text-slate-600">Showing {filteredTerms.length} of {terms.length} terms.</p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_240px]">
          <input
            type="text"
            placeholder="Search terms and definitions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          <div className="flex items-center gap-2">
            <label className="w-full text-sm text-slate-600">Module</label>
            <select
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              {MODULE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}

        <div className="space-y-3">
          {filteredTerms.length === 0 ? (
            <p className="text-sm text-slate-600">No terms match your search and filter.</p>
          ) : (
            filteredTerms.map((entry, index) => {
              const expandedNow = expanded.has(entry.__id);
              const base = index % 2 === 0 ? 'bg-slate-50' : 'bg-white';
              return (
                <article
                  key={entry.__id}
                  className={`rounded-lg border border-slate-200 p-4 ${base}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(entry.__id)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <h3 className="text-lg font-bold text-slate-900">{entry.term}</h3>
                    <span className="text-sm text-slate-500">{expandedNow ? 'Hide' : 'Show'}</span>
                  </button>
                  {expandedNow ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-slate-800">{entry.definition}</p>
                      <p className="text-xs text-slate-500">Source: {entry.source || 'NIST AI RMF references'}</p>
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{entry.module || 'General'}</span>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
