import { useMemo, useState } from 'react';

import DiagramViewer from './DiagramViewer';
import DragDrop from './DragDrop';
import FlashCards from './FlashCards';
import TradeoffSlider from './TradeoffSlider';

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inlineMarkdown(text) {
  const escaped = escapeHtml(text);

  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5">$1</code>');
}

function markdownToHtml(content) {
  const raw = String(content || '').trim();
  if (!raw) return '<p></p>';

  const paragraphs = raw.split(/\n{2,}/);
  return paragraphs
    .map((paragraph) => `<p>${inlineMarkdown(paragraph).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function TextSection({ section }) {
  return (
    <div
      className="prose prose-slate max-w-none text-[15px] leading-7"
      dangerouslySetInnerHTML={{ __html: markdownToHtml(section?.content || '') }}
    />
  );
}

function calloutStyle(style) {
  if (style === 'warning') return 'border-amber-300 bg-amber-50 text-amber-900';
  if (style === 'tip') return 'border-sky-300 bg-sky-50 text-sky-900';
  if (style === 'definition') return 'border-indigo-300 bg-indigo-50 text-indigo-900';
  return 'border-slate-300 bg-slate-50 text-slate-900';
}

function CalloutSection({ section }) {
  return (
    <aside className={`rounded-xl border p-4 ${calloutStyle(section?.style)}`}>
      {section?.title ? <p className="text-sm font-semibold">{section.title}</p> : null}
      {section?.content ? <p className="mt-2 text-sm leading-6">{section.content}</p> : null}
    </aside>
  );
}

function PollInteractive({ section }) {
  const options = Array.isArray(section?.options) ? section.options : [];
  const [selected, setSelected] = useState('');

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      {section?.question ? <p className="text-sm font-semibold text-slate-900">{section.question}</p> : null}
      <div className="space-y-2">
        {options.map((option, index) => {
          const label = typeof option === 'string' ? option : option?.label || `Option ${index + 1}`;
          const value = typeof option === 'string' ? option : option?.value || label;
          const isSelected = selected === value;

          return (
            <label
              key={`${value}-${index}`}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${
                isSelected ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'
              }`}
            >
              <input
                type="radio"
                name={section?.question || 'poll'}
                checked={isSelected}
                onChange={() => setSelected(value)}
              />
              <span className="text-sm text-slate-800">{label}</span>
            </label>
          );
        })}
      </div>
      {selected ? <p className="text-xs text-sky-700">Saved response: {selected}</p> : null}
    </section>
  );
}

function CheckboxAnalysisInteractive({ section }) {
  const options = Array.isArray(section?.options) ? section.options : [];
  const [selected, setSelected] = useState(() => new Set());
  const [submitted, setSubmitted] = useState(false);

  const toggleOption = (optionId) => {
    if (submitted) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(optionId)) next.delete(optionId);
      else next.add(optionId);
      return next;
    });
  };

  const summary = useMemo(() => {
    const correctIds = new Set(options.filter((option) => option?.correct).map((option) => option.id));
    let hits = 0;
    correctIds.forEach((id) => {
      if (selected.has(id)) hits += 1;
    });

    return {
      hits,
      total: correctIds.size,
      perfect: hits === correctIds.size,
    };
  }, [options, selected]);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      {section?.question ? <p className="text-sm font-semibold text-slate-900">{section.question}</p> : null}

      <div className="space-y-2">
        {options.map((option, index) => {
          const id = option?.id || `option-${index + 1}`;
          const checked = selected.has(id);

          return (
            <label key={id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <input type="checkbox" checked={checked} onChange={() => toggleOption(id)} disabled={submitted} className="mt-1" />
              <span className="text-sm text-slate-800">{option?.label || `Option ${index + 1}`}</span>
            </label>
          );
        })}
      </div>

      {!submitted ? (
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Check Analysis
        </button>
      ) : (
        <p className={`rounded-lg border p-3 text-sm ${summary.perfect ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          You selected {summary.hits} of {summary.total} key concerns.
        </p>
      )}
    </section>
  );
}

function ChecklistInteractive({ section }) {
  const items = Array.isArray(section?.items) ? section.items : [];
  const [checked, setChecked] = useState(() => new Set());

  const toggle = (id) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      {section?.instruction ? <p className="text-sm font-semibold text-slate-900">{section.instruction}</p> : null}
      <div className="space-y-2">
        {items.map((item, index) => {
          const id = item?.id || `check-${index + 1}`;
          const label = item?.label || String(item);
          const isChecked = checked.has(id);

          return (
            <label key={id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <input type="checkbox" checked={isChecked} onChange={() => toggle(id)} className="mt-1" />
              <span className="text-sm text-slate-800">{label}</span>
            </label>
          );
        })}
      </div>
      <p className="text-xs text-slate-600">Completed: {checked.size}/{items.length}</p>
    </section>
  );
}

function WorksheetInteractive({ section }) {
  const fields = Array.isArray(section?.fields) ? section.fields : [];
  const [values, setValues] = useState(() => ({}));

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      {section?.prompt ? <p className="text-sm font-semibold text-slate-900">{section.prompt}</p> : null}
      {fields.length === 0 ? <p className="text-sm text-slate-600">No worksheet fields were configured.</p> : null}

      {fields.map((field, index) => {
        const id = field?.id || `field-${index + 1}`;
        const value = values[id] || '';

        return (
          <label key={id} className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">{field?.label || `Field ${index + 1}`}</span>
            <textarea
              rows={3}
              value={value}
              onChange={(event) => setValues((prev) => ({ ...prev, [id]: event.target.value }))}
              placeholder={field?.placeholder || 'Write your response'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        );
      })}

      {Object.keys(values).length > 0 ? <p className="text-xs text-sky-700">Responses are kept in this session.</p> : null}
    </section>
  );
}

function DecisionTreeInteractive({ section }) {
  const nodes = Array.isArray(section?.nodes) ? section.nodes : [];
  const nodeMap = useMemo(
    () => new Map(nodes.filter((node) => node?.id).map((node) => [node.id, node])),
    [nodes],
  );

  const defaultStart = section?.startNodeId || nodes[0]?.id || null;
  const [currentNodeId, setCurrentNodeId] = useState(defaultStart);
  const [result, setResult] = useState(null);

  const currentNode = currentNodeId ? nodeMap.get(currentNodeId) : null;
  const choices = Array.isArray(currentNode?.choices) ? currentNode.choices : [];

  const choose = (choice) => {
    if (!choice || result) return;

    if (choice.result || choice.feedback) {
      setResult({
        level: choice.result || 'completed',
        message: choice.feedback || 'Decision path completed.',
      });
      return;
    }

    if (choice.nextNodeId && nodeMap.has(choice.nextNodeId)) {
      setCurrentNodeId(choice.nextNodeId);
    }
  };

  const reset = () => {
    setCurrentNodeId(defaultStart);
    setResult(null);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      {section?.prompt ? <p className="text-sm font-semibold text-slate-900">{section.prompt}</p> : null}
      {!currentNode ? (
        <p className="text-sm text-slate-600">Decision tree content is not configured.</p>
      ) : (
        <>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-800">{currentNode.prompt || 'Choose the next action.'}</p>
          </div>

          <div className="space-y-2">
            {choices.map((choice, index) => (
              <button
                type="button"
                key={`${currentNode.id}-choice-${index}`}
                onClick={() => choose(choice)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
              >
                {choice?.label || `Choice ${index + 1}`}
              </button>
            ))}
          </div>
        </>
      )}

      {result ? (
        <p className={`rounded-lg border p-3 text-sm ${result.level === 'excellent' ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
          {result.message}
        </p>
      ) : null}

      <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700">
        Reset Path
      </button>
    </section>
  );
}

function RankingInteractive({ section }) {
  const initialItems = useMemo(() => {
    const items = Array.isArray(section?.items) ? section.items : [];
    return items.map((item, index) => ({
      id: item?.id || `rank-${index + 1}`,
      label: item?.label || String(item),
    }));
  }, [section]);

  const [items, setItems] = useState(initialItems);

  const move = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= items.length) return;

    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">{section?.instruction || 'Rank the items by priority.'}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-sm text-slate-800">{index + 1}. {item.label}</p>
            <div className="flex gap-1">
              <button type="button" onClick={() => move(index, index - 1)} className="rounded border border-slate-300 px-2 py-1 text-xs">↑</button>
              <button type="button" onClick={() => move(index, index + 1)} className="rounded border border-slate-300 px-2 py-1 text-xs">↓</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function InteractiveSection({ section }) {
  const type = section?.interactiveType;

  if (type === 'poll') return <PollInteractive section={section} />;
  if (type === 'checkboxAnalysis') return <CheckboxAnalysisInteractive section={section} />;
  if (type === 'checklist') return <ChecklistInteractive section={section} />;
  if (type === 'worksheet') return <WorksheetInteractive section={section} />;
  if (type === 'decisionTree') return <DecisionTreeInteractive section={section} />;
  if (type === 'ranking') return <RankingInteractive section={section} />;
  if (type === 'dragDrop') return <DragDrop instruction={section?.instruction} items={section?.items} zones={section?.zones} />;
  if (type === 'flashcards') return <FlashCards cards={section?.cards} />;
  if (type === 'diagramExplore') {
    return <DiagramViewer diagramId={section?.diagramId} hotspots={section?.hotspots || []} />;
  }
  if (type === 'tradeoffSlider') {
    return <TradeoffSlider instruction={section?.instruction} sliders={section?.sliders} tradeoffRules={section?.tradeoffRules} />;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-700">Interactive type <code>{type || 'unknown'}</code> is not configured yet.</p>
      {section?.instruction ? <p className="mt-2 text-sm text-slate-600">{section.instruction}</p> : null}
    </section>
  );
}

function SectionRenderer({ section }) {
  if (!section || typeof section !== 'object') return null;

  if (section.type === 'text') return <TextSection section={section} />;
  if (section.type === 'callout') return <CalloutSection section={section} />;

  if (section.type === 'diagram') {
    return (
      <div className="space-y-2">
        <DiagramViewer diagramId={section?.diagramId} hotspots={[]} />
        {section?.caption ? <p className="text-xs text-slate-500">{section.caption}</p> : null}
      </div>
    );
  }

  if (section.type === 'interactive') return <InteractiveSection section={section} />;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
      Unsupported section type: {section.type}
    </div>
  );
}

export default function LessonViewer({ lesson }) {
  const sections = Array.isArray(lesson?.sections) ? lesson.sections : [];

  return (
    <div className="space-y-4">
      {sections.length === 0 ? <p className="text-sm text-slate-600">No lesson sections are available.</p> : null}

      {sections.map((section, index) => (
        <SectionRenderer key={`${section?.type || 'section'}-${index}`} section={section} />
      ))}

      {Array.isArray(lesson?.keyTakeaways) && lesson.keyTakeaways.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Key Takeaways</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {lesson.keyTakeaways.map((takeaway, index) => (
              <li key={`takeaway-${index}`}>{takeaway}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
