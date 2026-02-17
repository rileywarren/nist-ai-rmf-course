import { useMemo, useState } from 'react';

export default function FlashCards({ cards = [], onComplete }) {
  const safeCards = useMemo(
    () =>
      Array.isArray(cards)
        ? cards
            .filter((card) => card && (typeof card.front === 'string' || typeof card.back === 'string'))
            .map((card) => ({
              front: card.front || '',
              back: card.back || '',
            }))
        : [],
    [cards],
  );

  const totalCards = safeCards.length;
  const [currentDeck, setCurrentDeck] = useState(() => safeCards.map((_, index) => index));
  const [seen, setSeen] = useState(() => new Set());
  const [reviewDeck, setReviewDeck] = useState(() => new Set());
  const [flipped, setFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);

  const currentCard = currentDeck[currentIndex] != null ? safeCards[currentDeck[currentIndex]] : null;
  const doneCount = seen.size;
  const progress = totalCards === 0 ? 0 : Math.round((doneCount / totalCards) * 100);
  const isReviewRound = seen.size === totalCards && reviewDeck.size > 0;

  if (safeCards.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-600">No flash cards are available for this module yet.</p>
      </section>
    );
  }

  const moveToNextCard = (nextResult) => {
    if (!currentCard) return;

    const currentCardIndex = currentDeck[currentIndex];
    const nextSeen = new Set(seen);
    const nextReview = new Set(reviewDeck);

    nextSeen.add(currentCardIndex);
    if (nextResult === 'review') {
      nextReview.add(currentCardIndex);
    } else {
      nextReview.delete(currentCardIndex);
    }

    const isAtEnd = currentIndex + 1 >= currentDeck.length;

    if (isAtEnd) {
      const nextDeckIds = Array.from(nextReview);

      if (nextDeckIds.length > 0) {
        setCurrentDeck(nextDeckIds);
        setCurrentIndex(0);
        setReviewDeck(nextReview);
        setFlipped(false);
        setSeen(nextSeen);
        return;
      }

      setSeen(nextSeen);
      setCompleted(true);
      onComplete?.({ seenCount: nextSeen.size, totalCount: totalCards });
      return;
    }

    setSeen(nextSeen);
    setReviewDeck(nextReview);
    setCurrentIndex((prev) => prev + 1);
    setFlipped(false);
  };

  const handleNeedReview = () => moveToNextCard('review');
  const handleGotIt = () => moveToNextCard('gotIt');

  if (completed) {
    return (
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-2xl font-bold text-slate-900">All done!</p>
        <p className="text-sm text-slate-600">You reviewed {doneCount} cards.</p>
      </section>
    );
  }

  const reviewCountLabel = isReviewRound ? reviewDeck.size : totalCards;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <style>{`
        .card-container { perspective: 1000px; }
        .card-inner {
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s;
          width: 100%;
          min-height: 280px;
        }
        .card-inner.flipped {
          transform: rotateY(180deg);
        }
        .card-side {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          border-radius: 1rem;
          backface-visibility: hidden;
          text-align: center;
        }
        .card-back {
          transform: rotateY(180deg);
          background: #f1f5f9;
          color: #334155;
        }
      `}</style>

      <div className="space-y-2">
        <p className="text-sm text-slate-600">
          {isReviewRound ? 'Review card' : 'Card'} {Math.min(currentIndex + 1, currentDeck.length)} of {reviewCountLabel}
        </p>
        <div className="h-2 w-full rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-sky-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        {isReviewRound ? (
          <p className="text-sm text-sky-700">You have {reviewDeck.size} cards to review. Let&apos;s go through them again.</p>
        ) : null}
      </div>

      <div className="card-container">
        <article className="mx-auto max-w-[500px]">
          <button
            type="button"
            className={`card-inner w-full min-h-[260px] ${flipped ? 'flipped' : ''}`} 
            onClick={() => setFlipped((prev) => !prev)}
          >
            <div className="card-side rounded-2xl border border-slate-200 bg-white shadow-md">
              <p className="text-2xl font-semibold text-slate-900">{currentCard?.front}</p>
            </div>
            <div className="card-side card-back rounded-2xl border border-slate-200 shadow-md">
              <p className="text-base text-slate-700">{currentCard?.back}</p>
            </div>
          </button>
        </article>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setFlipped((prev) => !prev)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Flip
        </button>
        {flipped && (
          <>
            <button
              type="button"
              onClick={handleGotIt}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Got it ✓
            </button>
            <button
              type="button"
              onClick={handleNeedReview}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              Need Review ✗
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-slate-500">Tip: flip each card first, then choose how confident you are.</p>
    </section>
  );
}
