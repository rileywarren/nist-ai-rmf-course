import { useMemo, useState } from 'react';

function normalizeGridAxis(values) {
  const safe = Array.isArray(values) && values.length ? values : ['Low', 'Medium', 'High'];
  return safe.slice(0, 3);
}

function cellId(xIndex, yIndex) {
  return `${xIndex}-${yIndex}`;
}

function compareProximity(expectedX, expectedY, placedX, placedY) {
  const dx = Math.abs((expectedX || 0) - (placedX || 0));
  const dy = Math.abs((expectedY || 0) - (placedY || 0));
  if (dx === 0 && dy === 0) return 'exact';
  if (dx <= 1 && dy <= 1) return 'close';
  return 'incorrect';
}

function cellTone(xIndex, yIndex) {
  if (xIndex === 0 && yIndex === 0) return 'bg-emerald-100';
  if ((xIndex === 0 && yIndex === 1) || (xIndex === 1 && yIndex === 0)) return 'bg-emerald-200';
  if (xIndex === 1 && yIndex === 1) return 'bg-amber-100';
  if ((xIndex === 1 && yIndex === 2) || (xIndex === 2 && yIndex === 1)) return 'bg-orange-100';
  if (xIndex === 2 && yIndex === 2) return 'bg-rose-100';
  return 'bg-slate-100';
}

function evaluatePlacements(placements, items, suggestedPlacements) {
  let exact = 0;
  let close = 0;
  const outcomes = {};

  items.forEach((item) => {
    const placed = placements[item.id];
    const suggested = suggestedPlacements[item.id];
    if (!placed || !suggested) {
      outcomes[item.id] = 'incorrect';
      return;
    }

    const relation = compareProximity(suggested.x, suggested.y, placed.x, placed.y);
    outcomes[item.id] = relation;
    if (relation === 'exact') exact += 1;
    if (relation === 'close') close += 1;
  });

  return { exact, close, score: exact + close, outcomes };
}

export default function HeatMap({ items = [], grid = {}, suggestedPlacements = {}, instruction = '' }) {
  const safeItems = Array.isArray(items) ? items : [];
  const xAxis = normalizeGridAxis(grid?.xAxis?.values);
  const yAxis = normalizeGridAxis(grid?.yAxis?.values);

  const [placements, setPlacements] = useState(() =>
    safeItems.reduce((acc, item) => {
      acc[item.id] = null;
      return acc;
    }, {}),
  );
  const [dragging, setDragging] = useState('');
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState(null);

  const cells = useMemo(() => {
    const list = [];
    for (let x = 0; x < xAxis.length; x += 1) {
      for (let y = 0; y < yAxis.length; y += 1) {
        list.push({ id: cellId(x, y), xIndex: x, yIndex: y, label: `${xAxis[x]} / ${yAxis[y]}` });
      }
    }
    return list;
  }, [xAxis, yAxis]);

  const trayItems = useMemo(() => safeItems.filter((item) => !placements[item.id]), [safeItems, placements]);

  const onDragStart = (event, itemId) => {
    if (event.dataTransfer) event.dataTransfer.setData('text/plain', itemId);
    setDragging(itemId);
  };

  const onDrop = (event, x, y) => {
    event.preventDefault();
    const itemId = event.dataTransfer?.getData('text/plain') || dragging;
    if (!itemId) return;
    setPlacements((prev) => ({ ...prev, [itemId]: { x, y } }));
    setDragging('');
  };

  const checkPlacement = () => {
    setResult(evaluatePlacements(placements, safeItems, suggestedPlacements));
  };

  const showSuggested = () => {
    setPlacements((prev) => {
      const next = { ...prev };
      safeItems.forEach((item) => {
        const suggested = suggestedPlacements[item.id];
        if (suggested && typeof suggested.x === 'number' && typeof suggested.y === 'number') {
          next[item.id] = { x: suggested.x, y: suggested.y };
        }
      });
      return next;
    });
    const nextPlacements = safeItems.reduce((acc, item) => {
      const suggested = suggestedPlacements[item.id];
      if (suggested && typeof suggested.x === 'number' && typeof suggested.y === 'number') {
        acc[item.id] = { x: suggested.x, y: suggested.y };
      }
      return acc;
    }, {});
    setResult(evaluatePlacements({ ...placements, ...nextPlacements }, safeItems, suggestedPlacements));
  };

  const onTrayDrop = (event) => {
    event.preventDefault();
    const itemId = event.dataTransfer?.getData('text/plain') || dragging;
    if (!itemId) return;
    setPlacements((prev) => ({ ...prev, [itemId]: null }));
    setDragging('');
  };

  const allPlaced = safeItems.every((item) => placements[item.id]);

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <style>{`
        .heatmap-cell { transition: transform .15s ease; }
        .heatmap-cell:hover { transform: translateY(-2px); }
      `}</style>

      <h2 className="text-xl font-bold text-slate-900">Risk Heat Map</h2>
      <p className="text-sm text-slate-600">{instruction || 'Drag each item into the risk grid and compare with suggested placement.'}</p>

      <div className="grid gap-2" style={{ gridTemplateColumns: `60px repeat(${xAxis.length}, minmax(0, 1fr))` }}>
        <div />
        {xAxis.map((label, index) => (
          <div key={`x-${index}`} className="text-center text-xs font-semibold text-slate-600">
            {label}
          </div>
        ))}

        {yAxis.map((yLabel, yIndex) => {
          const row = [
            <div key={`y-${yIndex}`} className="text-right text-xs font-semibold text-slate-600">
              {yLabel}
            </div>,
          ];

          for (let xIndex = 0; xIndex < xAxis.length; xIndex += 1) {
            const cid = cellId(xIndex, yIndex);
            const inCell = safeItems.filter((item) => {
              const placement = placements[item.id];
              return placement && placement.x === xIndex && placement.y === yIndex;
            });

            row.push(
              <article
                key={cid}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDrop(event, xIndex, yIndex)}
                className={`heatmap-cell min-h-24 rounded-lg border border-slate-200 bg-gradient-to-br ${cellTone(xIndex, yIndex)} p-2`}
              >
                <p className="text-[11px] text-slate-600">{xAxis[xIndex]} / {yAxis[yIndex]}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {inCell.map((item) => {
                    const relation = result?.outcomes?.[item.id] || '';
                    const baseClass = relation === 'exact' ? 'border-emerald-400 bg-emerald-100' : relation === 'close' ? 'border-amber-300 bg-amber-100' : 'border-rose-300 bg-rose-100';
                    return (
                      <button
                        key={`${item.id}-${cid}`}
                        type="button"
                        draggable
                        onDragStart={(event) => onDragStart(event, item.id)}
                        onDragEnd={() => setDragging('')}
                        className={`rounded-full border px-2 py-1 text-xs ${baseClass}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </article>,
            );
          }

          return row;
        })}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-900">Item Tray</p>
          <div
            className="mt-2 flex flex-wrap gap-2 rounded-lg border border-dashed border-slate-200 p-2"
            onDragOver={(event) => {
              event.preventDefault();
              setDragging('tray');
            }}
            onDragLeave={() => setDragging('')}
            onDrop={onTrayDrop}
          >
            {trayItems.length === 0 ? <p className="text-xs text-slate-500">All items placed.</p> : null}
            {trayItems.map((item) => (
            <div key={`tray-${item.id}`} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs">
              <button
                type="button"
                draggable
                onDragStart={(event) => onDragStart(event, item.id)}
                onDragEnd={() => setDragging('')}
                onClick={() => setSelected(selected === item.id ? '' : item.id)}
                className="mr-2"
              >
                ⋮
              </button>
              <span>{item.label}</span>
              {selected === item.id ? <span className="ml-2 text-xs text-slate-500">selected</span> : null}
            </div>
          ))}
        </div>
      </div>

      {selected ? <p className="text-xs text-slate-500">Select a highlighted cell next to place this item.</p> : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={checkPlacement}
          disabled={!allPlaced}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
            allPlaced ? 'bg-sky-600 hover:bg-sky-700' : 'bg-slate-300'
          }`}
        >
          Check Placement
        </button>
        <button
          type="button"
          onClick={showSuggested}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Show Suggested
        </button>
      </div>

      {result ? (
        <p className="rounded-lg border border-slate-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Score: {result.score}/{safeItems.length} matches ({result.exact} exact, {result.close} close)
        </p>
      ) : null}
    </section>
  );
}
