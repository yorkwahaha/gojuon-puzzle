import { useEffect, useRef } from 'react';
import { answerOf, promptOf } from './kana.js';

function PromptFace({ item, mode, index }) {
  if (!mode.listen) return <b lang={mode.prompt === 'roma' ? undefined : 'ja'}>{promptOf(item, mode)}</b>;
  return (
    <b className="is-listen">
      <svg className="review-speaker" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9h3.2L12 5.2v13.6L7.2 15H4V9z" fill="currentColor" />
        <path d="M15.4 9.2a4.2 4.2 0 0 1 0 5.6M17.8 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>{index + 1}</span>
    </b>
  );
}

function promptLabel(item, mode, index, counts) {
  const misses = `錯 ${counts[item.id] || 0} 次`;
  if (mode.listen) return `第 ${index + 1} 題，播放讀音，${misses}`;
  return `${promptOf(item, mode)}，${misses}`;
}

export default function ReviewDrill({
  items,
  counts,
  mode,
  kind,
  leftOrder,
  rightOrder,
  options,
  matched,
  leftId,
  rightId,
  choicePick,
  wrong,
  spectate,
  onSpeak,
  onPickLeft,
  onPickRight,
  onPickChoice,
}) {
  const doneCount = matched.length;
  const total = items.length;
  const rootRef = useRef(null);
  useEffect(() => {
    rootRef.current?.querySelector('button:not([disabled])')?.focus();
  }, []);

  return (
    <div className="review" ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className={`review-card${mode.answer === 'roma' ? ' is-roma' : ''}`}>
        <p className="stamp">習</p>
        <h2 id="review-title">錯字複習</h2>
        <p>
          {spectate
            ? `本關最容易搞混的 ${total} 個字 · 觀戰中`
            : `本關最容易搞混的 ${total} 個字，對上才算過`}
        </p>
        <p className="review-meter" aria-live="polite">{doneCount} / {total}</p>

        {kind === 'choice' ? (
          <div className="review-choice">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="review-prompt is-solo"
                onClick={() => onSpeak?.(item)}
                aria-label={mode.listen ? '第 1 題，播放讀音' : `題目 ${promptOf(item, mode)}`}
              >
                <PromptFace item={item} mode={mode} index={0} />
                <small>錯 {counts[item.id] || 0} 次</small>
              </button>
            ))}
            <div className="review-options" role="group" aria-label="選出正確讀法">
              {options.map((item) => {
                const isOn = choicePick === item.id;
                const isOk = matched.includes(item.id);
                const isBad = wrong && isOn;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`review-opt${isOk ? ' is-ok' : ''}${isOn ? ' is-on' : ''}${isBad ? ' is-wrong' : ''}`}
                    disabled={spectate || isOk}
                    onClick={() => onPickChoice(item.id)}
                  >
                    <span lang={mode.answer === 'roma' ? undefined : 'ja'}>{answerOf(item, mode)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="review-match">
            <div className="review-col" role="group" aria-label="題目">
              {leftOrder.map((item, index) => {
                const isOk = matched.includes(item.id);
                const isOn = leftId === item.id;
                const isBad = wrong && isOn;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`review-tile${isOk ? ' is-ok' : ''}${isOn ? ' is-on' : ''}${isBad ? ' is-wrong' : ''}`}
                    disabled={isOk || (spectate && !mode.listen)}
                    onClick={() => {
                      if (!spectate) onPickLeft(item.id);
                      else onSpeak?.(item);
                    }}
                    aria-label={promptLabel(item, mode, index, counts)}
                  >
                    <PromptFace item={item} mode={mode} index={index} />
                    <small>錯 {counts[item.id] || 0} 次</small>
                  </button>
                );
              })}
            </div>
            <div className="review-col" role="group" aria-label="答案">
              {rightOrder.map((item) => {
                const isOk = matched.includes(item.id);
                const isOn = rightId === item.id;
                const isBad = wrong && isOn;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`review-tile is-answer${isOk ? ' is-ok' : ''}${isOn ? ' is-on' : ''}${isBad ? ' is-wrong' : ''}`}
                    disabled={spectate || isOk}
                    onClick={() => onPickRight(item.id)}
                    aria-label={answerOf(item, mode)}
                  >
                    <b lang={mode.answer === 'roma' ? undefined : 'ja'}>{answerOf(item, mode)}</b>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
