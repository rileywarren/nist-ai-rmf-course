import { useMemo, useState, useEffect } from 'react';

const FUNCTION_LABELS = ['GOVERN', 'MAP', 'MEASURE', 'MANAGE'];

const FUNCTION_HINTS = {
  govern:
    [
      'Start with authority, accountability, and context definitions first.',
      'Use clear governance language so leadership and operators are aligned.',
      'Assign who approves, who monitors, and how evidence is stored.',
    ],
  map: [
    'Ground every risk statement in intended use and affected stakeholders.',
    'Describe impact chains (economic, social, technical, and legal).',
    'Include residual risk decisions at early stages to prevent surprises.',
  ],
  measure: [
    'Prefer measurable criteria for each trustworthiness dimension.',
    'Set TEVV checkpoints before release and during live operation.',
    'Plan independent review, especially where harm uncertainty is high.',
  ],
  manage: [
    'Balance treatment with benefit and operational practicality.',
    'Document mitigation owners, communication, and escalation timing.',
    'Close each risk with a review-ready decision and monitoring trigger.',
  ],
};

function normalizeResponseMap(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return raw;
}

function normalizeStepIndex(stepId, steps) {
  if (typeof stepId !== 'number') return 1;
  if (stepId < 1) return 1;
  if (stepId > 5) return 5;
  if (stepId === 5) return 5;
  return stepId;
}

function normalizeSteps(definition) {
  const definitionSteps = Array.isArray(definition?.steps) ? definition.steps : [];
  return definitionSteps.slice(0, 4).map((step, index) => ({
    ...step,
    id: step?.id || `step-${index + 1}`,
    title: step?.title || `Step ${index + 1}`,
    description: step?.description || '',
    fields: Array.isArray(step?.fields) ? step.fields : [],
  }));
}

export default function CapstoneProject({ definition = {}, savedProgress = {}, onSave }) {
  const definitionSteps = useMemo(() => normalizeSteps(definition), [definition]);
  const options = Array.isArray(definition?.systemOptions) ? definition.systemOptions : [];

  const initialSystem = typeof savedProgress?.selectedSystem === 'string' ? savedProgress.selectedSystem : '';
  const initialCurrentStep = normalizeStepIndex(savedProgress?.currentStep ?? (initialSystem ? 1 : 0), definitionSteps);

  const [selectedSystem, setSelectedSystem] = useState(initialSystem);
  const [currentStep, setCurrentStep] = useState(initialCurrentStep);
  const [responses, setResponses] = useState(() => normalizeResponseMap(savedProgress?.responses));
  const [fieldDraft, setFieldDraft] = useState('');
  const [activeHint, setActiveHint] = useState(null);
  const [sidebarHintOpen, setSidebarHintOpen] = useState(false);
  const [summaryReady, setSummaryReady] = useState(false);

  const selectedSystemObj = useMemo(() => options.find((option) => option.id === selectedSystem) || null, [options, selectedSystem]);

  useEffect(() => {
    if (!onSave) return;

    const timeout = setTimeout(() => {
      onSave({
        selectedSystem: selectedSystem || null,
        currentStep,
        responses,
      });
    }, 300);

    return () => clearTimeout(timeout);
  }, [selectedSystem, currentStep, responses, onSave]);

  const setCurrentStepValue = (stepNumber) => setCurrentStep(Math.max(0, Math.min(5, stepNumber)));

  const stepDefinition = currentStep >= 1 && currentStep <= 4 ? definitionSteps[currentStep - 1] : null;

  const updateResponse = (fieldId, value) => {
    setResponses((prev) => {
      const next = { ...prev };
      const stepId = stepDefinition?.id || 'system';
      const stepFields = { ...(next[stepId] || {}) };
      stepFields[fieldId] = value;
      next[stepId] = stepFields;
      return next;
    });
  };

  const currentValues = stepDefinition ? responses[stepDefinition.id] || {} : {};

  const handleSelectSystem = (systemId) => {
    setSelectedSystem(systemId);
    setCurrentStep(1);
  };

  const handleNext = () => {
    if (currentStep >= 1 && currentStep <= definitionSteps.length) {
      if (currentStep === definitionSteps.length) {
        setCurrentStep(5);
      } else {
        setCurrentStepValue(currentStep + 1);
      }
      setSummaryReady(false);
    }
  };

  const handleBack = () => {
    if (currentStep <= 1) {
      setCurrentStep(0);
      return;
    }
    if (currentStep === 5) {
      setCurrentStep(definitionSteps.length);
      return;
    }
    setCurrentStepValue(currentStep - 1);
  };

  const handleStartOver = () => {
    setSelectedSystem('');
    setCurrentStep(0);
    setResponses({});
    setSummaryReady(false);
    onSave?.({
      selectedSystem: null,
      currentStep: 0,
      responses: {},
    });
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="sticky top-0 z-10 -mx-2 border-b border-slate-200 bg-white/95 px-2 pb-3 md:px-0">
        <p className="text-sm font-semibold text-slate-700">Capstone Risk Management Plan</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="font-semibold text-slate-900">Step {Math.min(currentStep, 4)} of 4</p>
          <span className="text-xs uppercase tracking-wide text-slate-500">NIST AI RMF</span>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-2 text-xs font-medium text-slate-700">
          {FUNCTION_LABELS.map((label, index) => (
            <span
              key={label}
              className={`rounded-full px-2 py-1 text-center ${
                currentStep === index + 1 ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {label}
            </span>
          ))}
        </div>

        {selectedSystemObj ? (
          <p className="mt-2 text-sm text-slate-600">System: {selectedSystemObj.name}</p>
        ) : null}
      </header>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-lg font-semibold text-slate-900">Project summary</h3>
        <p className="mt-2 text-sm text-slate-600">{definition.description || 'Complete all four phases to generate a full AI RMF plan.'}</p>
      </div>

      {currentStep === 0 ? (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Choose your target system</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {options.map((option) => {
              const selected = option.id === selectedSystem;
              return (
                <article
                  key={option.id}
                  className={`cursor-pointer rounded-xl border p-4 transition ${
                    selected ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white'
                  }`}
                  onClick={() => handleSelectSystem(option.id)}
                >
                  <p className="text-lg font-bold">{option.name}</p>
                  <p className="mt-2 text-sm text-slate-700">{option.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">{option.riskLevel || 'High'} • {option.sector || 'General'}</p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {stepDefinition ? (
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">{stepDefinition.title}</h3>
          <p className="text-sm text-slate-600">{stepDefinition.description}</p>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold">Context reminder</p>
            <p className="mt-1 text-sm text-slate-700">You are working on: {selectedSystemObj?.name}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="space-y-3">
            {stepDefinition.fields.map((field) => {
              const fieldValue = currentValues[field.id] || '';
              const hint = FUNCTION_HINTS[stepDefinition.id?.toLowerCase()]?.[0] || field.hint;
              const hintKey = `${stepDefinition.id}-${field.id}`;
              const isHintOpen = activeHint === hintKey;

              return (
                <label key={field.id} className="block space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{field.label}</span>
                    <button
                      type="button"
                      onClick={() => setActiveHint(isHintOpen ? null : hintKey)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600"
                    >
                      Need a hint?
                    </button>
                  </div>

                  {isHintOpen ? <p className="text-xs text-slate-600">{hint}</p> : null}
                  <textarea
                    value={fieldValue}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setFieldDraft(nextValue);
                      updateResponse(field.id, nextValue);
                    }}
                    onBlur={() => setFieldDraft('')}
                    rows={4}
                    className="w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900"
                    placeholder="Write a detailed response..."
                  />
                </label>
              );
            })}
            </div>

            <aside className="rounded-lg border border-slate-200 bg-white p-4">
              <button
                type="button"
                onClick={() => setSidebarHintOpen((prev) => !prev)}
                className="w-full rounded-md border border-slate-300 px-2 py-1 text-left text-xs font-semibold text-slate-700"
              >
                Need a hint? {sidebarHintOpen ? 'Hide' : 'Show'}
              </button>
              {sidebarHintOpen ? (
                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  {(FUNCTION_HINTS[stepDefinition.id?.toLowerCase()] || []).map((hintLine, index) => (
                    <p key={`${stepDefinition.id}-hint-${index}`}>
                      <span className="font-semibold">{stepDefinition.id?.toUpperCase()} {index + 1}:</span> {hintLine}
                    </p>
                  ))}
                </div>
              ) : null}
            </aside>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {currentStep === 4 ? 'Review Summary' : 'Save & Continue'}
            </button>
          </div>
        </section>
      ) : null}

      {currentStep === 5 ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Step 5: Final Summary</h3>
            <div className="space-x-2">
              <button
                type="button"
                onClick={() => setSummaryReady(true)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Generate Summary
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Start Over
              </button>
            </div>
          </div>

          <style>{`
            @media print {
              .no-print { display: none !important; }
            }
          `}</style>

          {summaryReady ? (
            <div id="capstone-summary" className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-lg font-bold">Capstone Plan: {selectedSystemObj?.name}</h4>
              <p className="text-sm text-slate-700">{definition.description}</p>

              <div className="space-y-4">
                {definitionSteps.map((step) => {
                  const data = responses[step.id] || {};
                  return (
                    <article key={step.id} className="rounded-md border border-slate-200 bg-white p-3">
                      <p className="font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{step.description}</p>
                      <div className="mt-2 space-y-2">
                        {step.fields.map((field) => (
                          <div key={field.id}>
                            <p className="text-sm font-semibold text-slate-800">{field.label}</p>
                            <p className="text-sm text-slate-700">{data[field.id] || 'No response provided.'}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="no-print flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to Manage
            </button>
          </div>
        </section>
      ) : null}

      {currentStep > 0 && currentStep <= 4 ? (
        <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          Draft is saved automatically as you type. Use Back and Save controls to move between steps with confidence.
        </p>
      ) : null}

      {fieldDraft ? <p className="text-[10px] text-slate-500">{selectedSystemObj ? 'Editing:' : 'Choose a system first.'}</p> : null}
    </section>
  );
}
