import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import DiagramViewer from './DiagramViewer';
import DragDrop from './DragDrop';
import FlashCards from './FlashCards';
import TradeoffSlider from './TradeoffSlider';
import { getTtsVoices, synthesizeTts } from '../utils/api';

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

const TTS_RATE_STORAGE_KEY = 'nist-course-tts-rate';
const TTS_VOICE_STORAGE_KEY = 'nist-course-tts-voice';

function stripMarkdownForSpeech(text) {
  return String(text || '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSpeakableLessonText(lesson) {
  if (!lesson || typeof lesson !== 'object') return '';
  const sections = Array.isArray(lesson.sections) ? lesson.sections : [];
  const parts = [];

  for (const section of sections) {
    if (!section || typeof section !== 'object') continue;
    if (section.type === 'text' && section.content) {
      parts.push(stripMarkdownForSpeech(section.content));
    }
    if (section.type === 'callout') {
      if (section.title) parts.push(stripMarkdownForSpeech(section.title));
      if (section.content) parts.push(stripMarkdownForSpeech(section.content));
    }
  }

  if (Array.isArray(lesson.keyTakeaways) && lesson.keyTakeaways.length > 0) {
    parts.push('Key takeaways.');
    for (const takeaway of lesson.keyTakeaways) {
      parts.push(stripMarkdownForSpeech(takeaway));
    }
  }

  return parts.filter(Boolean).join(' ');
}

function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function sectionLabel(section) {
  if (!section || typeof section !== 'object') return 'Learning Step';
  if (section.type === 'text') return 'Reading';
  if (section.type === 'callout') return 'Concept Highlight';
  if (section.type === 'diagram') return 'Diagram';
  if (section.type !== 'interactive') return 'Learning Step';

  if (section.interactiveType === 'poll') return 'Quick Poll';
  if (section.interactiveType === 'checkboxAnalysis') return 'Risk Analysis Check';
  if (section.interactiveType === 'checklist') return 'Checklist';
  if (section.interactiveType === 'worksheet') return 'Worksheet';
  if (section.interactiveType === 'decisionTree') return 'Decision Path';
  if (section.interactiveType === 'ranking') return 'Priority Ranking';
  if (section.interactiveType === 'dragDrop') return 'Drag and Drop';
  if (section.interactiveType === 'flashcards') return 'Flash Cards';
  if (section.interactiveType === 'diagramExplore') return 'Diagram Explorer';
  if (section.interactiveType === 'tradeoffSlider') return 'Tradeoff Slider';
  return 'Interactive';
}

function messageForConfidence(level) {
  if (level === 'review') return 'Good signal. Replay this lesson with audio and revisit one key takeaway.';
  if (level === 'solid') return 'You are in a strong range. Try the quiz next while concepts are fresh.';
  if (level === 'teach') return 'Excellent. Move to the scenario and apply this in a realistic decision.';
  return '';
}

function TakeawayChallenge({ takeaways }) {
  const safeTakeaways = useMemo(
    () => (Array.isArray(takeaways) ? takeaways.map((item) => String(item || '').trim()).filter(Boolean) : []),
    [takeaways],
  );
  const takeawaySignature = safeTakeaways.join('||');

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState({ attempts: 0, recalled: 0 });

  useEffect(() => {
    setIndex(0);
    setRevealed(false);
    setAnswered(false);
    setScore({ attempts: 0, recalled: 0 });
  }, [takeawaySignature]);

  if (safeTakeaways.length === 0) return null;

  const current = safeTakeaways[index];

  const recordAttempt = (remembered) => {
    if (answered) return;
    setAnswered(true);
    setRevealed(true);
    setScore((prev) => ({
      attempts: prev.attempts + 1,
      recalled: remembered ? prev.recalled + 1 : prev.recalled,
    }));
  };

  const goNext = () => {
    setIndex((prev) => (prev + 1) % safeTakeaways.length);
    setRevealed(false);
    setAnswered(false);
  };

  return (
    <section className="space-y-3 rounded-xl border border-cyan-200 bg-cyan-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-cyan-900">60-Second Takeaway Challenge</p>
        <p className="text-xs font-semibold text-cyan-800">
          Recall Score: {score.recalled}/{score.attempts}
        </p>
      </div>

      <p className="text-sm text-cyan-900">
        Before revealing, restate takeaway {index + 1} in your own words.
      </p>

      <div className="rounded-lg border border-cyan-200 bg-white px-3 py-2">
        {revealed ? (
          <p className="text-sm text-slate-800">{current}</p>
        ) : (
          <p className="text-sm text-slate-700">Hidden. Try recalling first, then reveal.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => recordAttempt(true)}
          disabled={answered}
          className="rounded-lg border border-emerald-300 bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          I Recalled It
        </button>
        <button
          type="button"
          onClick={() => recordAttempt(false)}
          disabled={answered}
          className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reveal Now
        </button>
        <button
          type="button"
          onClick={goNext}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          Next Takeaway
        </button>
      </div>
    </section>
  );
}

function readStoredRate() {
  if (typeof window === 'undefined') return 1;
  const parsed = Number(window.localStorage.getItem(TTS_RATE_STORAGE_KEY));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(1.6, Math.max(0.8, parsed));
}

const DEFAULT_KOKORO_VOICES = [
  'af_heart',
  'af_bella',
  'af_sarah',
  'af_nicole',
  'am_adam',
  'am_michael',
  'bf_emma',
  'bm_george',
];

function LessonAudioControls({ text }) {
  const normalizedText = useMemo(() => String(text || '').trim(), [text]);

  const [voices, setVoices] = useState(DEFAULT_KOKORO_VOICES);
  const [voice, setVoice] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_KOKORO_VOICES[0];
    return window.localStorage.getItem(TTS_VOICE_STORAGE_KEY) || DEFAULT_KOKORO_VOICES[0];
  });
  const [rate, setRate] = useState(readStoredRate);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [speedRange, setSpeedRange] = useState({ min: 0.7, max: 1.4 });

  const audioRef = useRef(null);
  const objectUrlRef = useRef('');
  const requestSignatureRef = useRef('');
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const audio = new Audio();
    audio.preload = 'auto';

    const onPlaying = () => setStatus('playing');
    const onPause = () => {
      if (audio.ended || audio.currentTime === 0) return;
      setStatus('paused');
    };
    const onEnded = () => setStatus('finished');
    const onError = () => {
      setStatus('idle');
      setError('Audio playback failed in this browser.');
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    audioRef.current = audio;

    return () => {
      isMountedRef.current = false;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadVoices = async () => {
      try {
        const payload = await getTtsVoices();
        if (cancelled || !payload || typeof payload !== 'object') return;

        const nextVoices = Array.isArray(payload.voices)
          ? payload.voices.map((item) => String(item || '').trim()).filter(Boolean)
          : [];
        if (nextVoices.length > 0) {
          setVoices(nextVoices);
        }

        const minSpeed = Number(payload.minSpeed);
        const maxSpeed = Number(payload.maxSpeed);
        if (Number.isFinite(minSpeed) && Number.isFinite(maxSpeed) && minSpeed < maxSpeed) {
          setSpeedRange({ min: minSpeed, max: maxSpeed });
        }

        const suggestedDefault = typeof payload.defaultVoice === 'string' ? payload.defaultVoice : '';
        setVoice((current) => {
          if (current && nextVoices.includes(current)) return current;
          if (suggestedDefault && nextVoices.includes(suggestedDefault)) return suggestedDefault;
          if (nextVoices.length > 0) return nextVoices[0];
          return current || DEFAULT_KOKORO_VOICES[0];
        });
      } catch (voiceError) {
        console.warn('Unable to load Kokoro voices:', voiceError);
      }
    };

    loadVoices();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TTS_RATE_STORAGE_KEY, String(rate));
  }, [rate]);

  useEffect(() => {
    setRate((current) => Math.min(speedRange.max, Math.max(speedRange.min, current)));
  }, [speedRange.max, speedRange.min]);

  useEffect(() => {
    if (typeof window === 'undefined' || !voice) return;
    window.localStorage.setItem(TTS_VOICE_STORAGE_KEY, voice);
  }, [voice]);

  const resetAudioSource = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }
    requestSignatureRef.current = '';
  }, []);

  useEffect(() => {
    setError('');
    setStatus('idle');
    resetAudioSource();
  }, [normalizedText, resetAudioSource]);

  const stopPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setStatus('idle');
  }, []);

  const startPlayback = useCallback(async () => {
    if (!normalizedText) return;
    const audio = audioRef.current;
    if (!audio) return;

    setError('');

    if (status === 'paused' && audio.src) {
      try {
        await audio.play();
      } catch (playError) {
        setError('Playback was blocked. Press Play again.');
      }
      return;
    }

    if (status === 'playing' && audio.src) {
      try {
        audio.currentTime = 0;
        await audio.play();
      } catch (playError) {
        setError('Playback was blocked. Press Play again.');
      }
      return;
    }

    const signature = `${normalizedText}::${voice}::${rate}`;
    const shouldGenerate = !audio.src || requestSignatureRef.current !== signature;

    if (shouldGenerate) {
      setStatus('synthesizing');
      try {
        const blob = await synthesizeTts({
          text: normalizedText,
          voice: voice || DEFAULT_KOKORO_VOICES[0],
          speed: rate,
        });
        if (!isMountedRef.current) return;

        const nextUrl = URL.createObjectURL(blob);
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = nextUrl;
        audio.src = nextUrl;
        requestSignatureRef.current = signature;
      } catch (synthesisError) {
        if (!isMountedRef.current) return;
        setStatus('idle');
        setError(synthesisError?.message || 'Unable to generate Kokoro audio right now.');
        return;
      }
    }

    try {
      await audio.play();
    } catch (playError) {
      setStatus('idle');
      setError('Playback was blocked. Press Play again.');
    }
  }, [normalizedText, rate, status, voice]);

  const canPlay = normalizedText.length > 0;
  const speedOptions = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4];
  const validSpeedOptions = speedOptions.filter((value) => value >= speedRange.min && value <= speedRange.max);

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Lesson Audio (Kokoro)</p>
          <p className="text-xs text-slate-600">Neural TTS via local backend model `hexgrad/Kokoro-82M`.</p>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status: {status}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startPlayback}
          disabled={!canPlay || status === 'synthesizing'}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'paused' ? 'Resume' : status === 'synthesizing' ? 'Generating...' : status === 'playing' ? 'Restart' : 'Play'}
        </button>

        <button
          type="button"
          onClick={() => {
            const audio = audioRef.current;
            if (!audio || status !== 'playing') return;
            audio.pause();
            setStatus('paused');
          }}
          disabled={status !== 'playing'}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pause
        </button>

        <button
          type="button"
          onClick={stopPlayback}
          disabled={status === 'idle' || status === 'synthesizing'}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Stop
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          Speed
          <select
            value={String(rate)}
            onChange={(event) => {
              const nextRate = Number(event.target.value);
              setRate(nextRate);
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            {(validSpeedOptions.length > 0 ? validSpeedOptions : [1]).map((value) => (
              <option key={`speed-${value}`} value={String(value)}>
                {value.toFixed(1)}x
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          Voice
          <select
            value={voice}
            onChange={(event) => setVoice(event.target.value)}
            className="max-w-[240px] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
          >
            {voices.map((voiceOption) => (
              <option key={voiceOption} value={voiceOption}>
                {voiceOption}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      {!canPlay ? <p className="text-xs text-slate-600">No readable text found in this lesson.</p> : null}
      {canPlay ? <p className="text-xs text-slate-600">First playback can take a few seconds while Kokoro loads and generates audio.</p> : null}
    </section>
  );
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
  const keyTakeaways = Array.isArray(lesson?.keyTakeaways) ? lesson.keyTakeaways : [];
  const lessonIdentity = `${lesson?.lessonId || lesson?.id || lesson?.title || 'lesson'}-${sections.length}-${keyTakeaways.length}`;

  const [completedSteps, setCompletedSteps] = useState(() => new Set());
  const [confidence, setConfidence] = useState('');

  const speechText = useMemo(() => buildSpeakableLessonText(lesson), [lesson]);

  const estimatedReadingMinutes = useMemo(() => {
    const wordsFromSections = sections.reduce((total, section) => {
      if (!section || typeof section !== 'object') return total;
      if (section.type === 'text') return total + countWords(stripMarkdownForSpeech(section.content));
      if (section.type === 'callout') {
        return total + countWords(stripMarkdownForSpeech(section.title)) + countWords(stripMarkdownForSpeech(section.content));
      }
      return total;
    }, 0);

    const takeawayWords = keyTakeaways.reduce((total, takeaway) => total + countWords(stripMarkdownForSpeech(takeaway)), 0);
    const totalWords = wordsFromSections + takeawayWords;
    return Math.max(1, Math.ceil(totalWords / 180));
  }, [keyTakeaways, sections]);

  useEffect(() => {
    setCompletedSteps(new Set());
    setConfidence('');
  }, [lessonIdentity]);

  const completedCount = completedSteps.size;
  const completionPercent = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-sky-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-cyan-950">Lesson Sprint</p>
          <p className="text-xs font-semibold text-cyan-900">
            Estimated reading: {estimatedReadingMinutes} min
          </p>
        </div>
        <p className="text-sm text-cyan-900">
          Complete each step to keep momentum high.
        </p>
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-cyan-100">
            <div className="h-full rounded-full bg-cyan-600 transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
          <p className="text-xs font-semibold text-cyan-900">
            {completedCount}/{sections.length} steps completed ({completionPercent}%)
          </p>
        </div>
      </section>

      <LessonAudioControls text={speechText} />

      {sections.length === 0 ? <p className="text-sm text-slate-600">No lesson sections are available.</p> : null}

      {sections.map((section, index) => {
        const done = completedSteps.has(index);
        return (
          <article
            key={`${section?.type || 'section'}-${index}`}
            className={`space-y-3 rounded-xl border p-4 ${done ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Step {index + 1} of {sections.length}</p>
                <p className="text-sm font-semibold text-slate-800">{sectionLabel(section)}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setCompletedSteps((prev) => {
                    const next = new Set(prev);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  })
                }
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  done
                    ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {done ? 'Completed' : 'Mark Step Complete'}
              </button>
            </div>
            <SectionRenderer section={section} />
          </article>
        );
      })}

      {keyTakeaways.length > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Key Takeaways</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {keyTakeaways.map((takeaway, index) => (
              <li key={`takeaway-${index}`}>{takeaway}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <TakeawayChallenge takeaways={keyTakeaways} />

      <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">30-Second Confidence Check</p>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'review', label: 'Need Review' },
            { id: 'solid', label: 'Getting It' },
            { id: 'teach', label: 'Can Teach It' },
          ].map((option) => {
            const selected = confidence === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setConfidence(option.id)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                  selected ? 'border-sky-300 bg-sky-100 text-sky-900' : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {confidence ? <p className="text-sm text-slate-700">{messageForConfidence(confidence)}</p> : null}
      </section>
    </div>
  );
}
