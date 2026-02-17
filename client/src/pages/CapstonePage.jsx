import { useEffect, useState } from 'react';

import CapstoneProject from '../components/CapstoneProject';
import { getCapstone, getProgress, saveCapstone } from '../utils/api';

export default function CapstonePage() {
  const [definition, setDefinition] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    setIsLoading(true);
    Promise.all([getCapstone(), getProgress()])
      .then(([capstoneResult, progressResult]) => {
        if (!active) return;
        setDefinition(capstoneResult || {});
        setProgressData((progressResult && progressResult.capstone) || {});
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error?.message || 'Unable to load capstone data.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-3 animate-pulse">
            <div className="h-6 w-2/3 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-200" />
            <div className="h-44 rounded bg-slate-200" />
          </div>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="rounded-xl border border-rose-300 bg-rose-50 p-6">
        <p className="text-sm font-semibold text-rose-800">{loadError}</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Capstone</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">{definition?.title || 'Capstone Project'}</h1>
        <p className="mt-2 text-slate-600">{definition?.description || 'Build a complete AI RMF plan.'}</p>
      </header>

      <CapstoneProject
        definition={definition || {}}
        savedProgress={progressData || {}}
        onSave={async (payload) => {
          const updated = await saveCapstone(payload);
          setProgressData((updated && updated.capstone) || payload);
        }}
      />
    </div>
  );
}
