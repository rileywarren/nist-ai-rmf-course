import { useMemo, useState } from 'react';

function toSet(items) {
  return new Set(Array.isArray(items) ? items : []);
}

export default function DragDrop({ instruction = '', items = [], zones = [], onComplete }) {
  const safeItems = Array.isArray(items) ? items : [];
  const safeZones = Array.isArray(zones) ? zones : [];

  const itemIds = useMemo(() => safeItems.map((item) => item.id), [safeItems]);
  const correctZoneByItem = useMemo(
    () =>
      itemIds.reduce((acc, itemId) => {
        for (const zone of safeZones) {
          if (toSet(zone.correctItems).has(itemId)) {
            acc[itemId] = zone.id;
            break;
          }
        }
        return acc;
      }, {}),
    [itemIds, safeZones],
  );

  const [itemZone, setItemZone] = useState(() =>
    safeItems.reduce((acc, item) => {
      acc[item.id] = 'tray';
      return acc;
    }, {}),
  );
  const [dragId, setDragId] = useState('');
  const [dragOverZone, setDragOverZone] = useState('');
  const [hoveredItemId, setHoveredItemId] = useState('');
  const [result, setResult] = useState(null);
  const [showAnswersMode, setShowAnswersMode] = useState(false);

  const allPlaced = safeItems.every((item) => itemZone[item.id] && itemZone[item.id] !== 'tray');

  const evaluateCurrentPlacement = (placements = itemZone) => {
    const correct = [];
    const incorrect = [];

    safeItems.forEach((item) => {
      const expected = correctZoneByItem[item.id];
      if (!expected) return;

      if (placements[item.id] === expected) {
        correct.push(item.id);
      } else {
        incorrect.push(item.id);
      }
    });

    const score = correct.length;
    const total = safeItems.length;
    return { score, total, correct, incorrect };
  };
  const isCorrectByItem = useMemo(() => {
    if (!result) return {};

    const map = {};
    safeItems.forEach((item) => {
      const expected = correctZoneByItem[item.id];
      map[item.id] = expected ? result.correct.includes(item.id) && itemZone[item.id] === expected : false;
    });
    return map;
  }, [result, safeItems, correctZoneByItem, itemZone]);

  const handleDrop = (zoneId, itemId) => {
    if (!itemId) return;
    const nextItemZone = {
      ...itemZone,
      [itemId]: zoneId,
    };

    setItemZone(nextItemZone);
    setDragOverZone('');
    setHoveredItemId('');

    if (showAnswersMode) {
      setResult(evaluateCurrentPlacement(nextItemZone));
    }
  };

  const onDragStart = (event, itemId) => {
    setDragId(itemId);
    if (event && event.dataTransfer) {
      event.dataTransfer.setData('text/plain', itemId);
      event.dataTransfer.effectAllowed = 'move';
    }
  };

  const onDragOver = (event, zoneId) => {
    event.preventDefault();
    setDragOverZone(zoneId);
  };

  const onDrop = (event, zoneId) => {
    event.preventDefault();
    const dropped = (event.dataTransfer && event.dataTransfer.getData('text/plain')) || dragId;
    if (!dropped) return;
    handleDrop(zoneId, dropped);
  };

  const clearPlacement = () => {
    setItemZone(
      safeItems.reduce((acc, item) => {
        acc[item.id] = 'tray';
        return acc;
      }, {}),
    );
    setResult(null);
    setShowAnswersMode(false);
    setDragOverZone('');
    setHoveredItemId('');
  };

  const evaluate = () => {
    const payload = evaluateCurrentPlacement();
    setResult(payload);
    setShowAnswersMode(false);
    onComplete?.(payload);
  };

  const revealAnswers = () => {
    const next = safeItems.reduce((acc, item) => {
      const expected = correctZoneByItem[item.id];
      if (expected) acc[item.id] = expected;
      return acc;
    }, {});

    setItemZone(next);
    const payload = evaluateCurrentPlacement(next);
    setResult(payload);
    setShowAnswersMode(true);
    onComplete?.(payload);
  };

  const handleKeyboardMove = (itemId, zoneId) => {
    if (itemId === 'tray') {
      return;
    }

    handleDrop(zoneId, itemId);
    setHoveredItemId(itemId);
  };

  const getItemStyle = (itemId) => {
    if (!result) {
      return 'border-slate-200/90 bg-white';
    }

    if (isCorrectByItem[itemId]) {
      return 'border-emerald-300 bg-emerald-50';
    }

    return showAnswersMode
      ? 'border-emerald-300 bg-emerald-50'
      : 'border-rose-300 bg-rose-50';
  };

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
      `}</style>

      {instruction ? <p className="text-sm text-slate-700">{instruction}</p> : null}

      <div
        className={`rounded-lg border border-slate-200 bg-slate-50 p-3 transition ${
          dragOverZone === 'tray' ? 'border-sky-400 bg-sky-50' : ''
        }`}
        role="region"
        aria-label="Draggable items tray"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">Item Tray</p>
          {hoveredItemId ? (
            <button
              type="button"
              onClick={() => handleKeyboardMove(hoveredItemId, 'tray')}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600"
            >
              Return selected item to tray
            </button>
          ) : null}
        </div>
        <div
          className="flex min-h-14 flex-wrap gap-2"
          onDragOver={(event) => {
            event.preventDefault();
            setDragOverZone('tray');
          }}
          onDragLeave={() => setDragOverZone('')}
          onDrop={(event) => onDrop(event, 'tray')}
        >
          {safeItems
            .filter((item) => itemZone[item.id] === 'tray')
            .map((item) => {
              const selected = hoveredItemId === item.id;
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(event) => onDragStart(event, item.id)}
                  onDragEnd={() => setDragId('')}
                  className={`relative inline-flex cursor-grab items-center rounded-full border px-4 py-2 shadow-sm transition ${getItemStyle(item.id)} ${
                    selected ? 'outline outline-2 outline-sky-400' : ''
                  } ${dragId === item.id ? 'opacity-60' : ''}`}
                >
                  <span className="mr-2 cursor-grab text-slate-500" aria-hidden>
                    ☰
                  </span>
                  <button
                    type="button"
                    onClick={() => setHoveredItemId(item.id)}
                    className="text-left"
                  >
                    {item.label}
                  </button>
                </div>
              );
            })}
          {!safeItems.some((item) => itemZone[item.id] === 'tray') ? (
            <p className="text-xs text-slate-500">All items are placed.</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {safeZones.map((zone) => {
          const inThisZone = safeItems.filter((item) => itemZone[item.id] === zone.id);
          return (
            <section
              key={zone.id}
            onDragOver={(event) => onDragOver(event, zone.id)}
            onDragLeave={() => setDragOverZone('')}
            onDrop={(event) => onDrop(event, zone.id)}
              className={`min-h-28 rounded-xl border-2 border-dashed p-3 transition ${
                dragOverZone === zone.id ? 'border-sky-400 bg-sky-50' : 'border-slate-300 bg-white'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">{zone.label}</h3>
                {hoveredItemId ? (
                  <button
                    type="button"
                    onClick={() => handleKeyboardMove(hoveredItemId, zone.id)}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600"
                  >
                    Place selected item
                  </button>
                ) : null}
              </div>

              <div className="flex min-h-16 flex-wrap gap-2">
                {inThisZone.length === 0 ? (
                  <p className="text-xs text-slate-500">Drop items here.</p>
                ) : (
                  inThisZone.map((item) => {
                    const isIncorrect = result && !isCorrectByItem[item.id] && !showAnswersMode;
                    return (
                      <button
                        type="button"
                        key={`${zone.id}-${item.id}`}
                        onClick={() => setHoveredItemId(item.id)}
                        className={`relative rounded-full border px-3 py-2 text-left text-sm shadow ${getItemStyle(item.id)} ${
                          isIncorrect ? 'animate-[shake_400ms_ease]' : ''
                        }`}
                        draggable
                        onDragStart={(event) => onDragStart(event, item.id)}
                        onDragEnd={() => setDragId('')}
                        onDragOver={(event) => onDragOver(event, zone.id)}
                        onDrop={(event) => onDrop(event, zone.id)}
                      >
                        {isCorrectByItem[item.id] && result ? <span className="mr-1 text-emerald-600">✓</span> : null}
                        {isIncorrect ? <span className="mr-1 text-rose-600">!</span> : null}
                        {item.label}
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={evaluate}
          disabled={!allPlaced}
          className={`inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white ${
            allPlaced ? 'bg-sky-600 hover:bg-sky-700' : 'bg-slate-300'
          }`}
        >
          Check Answers
        </button>

        <button
          type="button"
          onClick={clearPlacement}
          className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={revealAnswers}
          disabled={safeItems.length === 0}
          className={`inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white ${
            safeItems.length === 0 ? 'bg-slate-300' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          Show Answers
        </button>
      </div>

      {result ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">Result: {result.score}/{result.total} correct</p>
          {allPlaced ? <p className="mt-1 text-xs text-slate-600">Correct items are highlighted green. Incorrect items are highlighted red.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
