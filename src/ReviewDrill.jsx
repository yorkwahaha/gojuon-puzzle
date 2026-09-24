import { answerOf, promptOf } from './kana.js';

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

  return (
    <div className="review" role="dialog" aria-modal="true" aria-labelledby="review-title">
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
                aria-label={mode.listen ? '播放讀音' : `題目 ${promptOf(item, mode)}`}
              >
                <b>{promptOf(item, mode)}</b>
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
                    {answerOf(item, mode)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="review-match">
            <div className="review-col" role="group" aria-label="題目">
              {leftOrder.map((item) => {
                const isOk = matched.includes(item.id);
                const isOn = leftId === item.id;
                const isBad = wrong && isOn;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`review-tile${isOk ? ' is-ok' : ''}${isOn ? ' is-on' : ''}${isBad ? ' is-wrong' : ''}`}
                    disabled={spectate || isOk}
                    onClick={() => {
                      onSpeak?.(item);
                      onPickLeft(item.id);
                    }}
                    aria-label={`${promptOf(item, mode)}，錯 ${counts[item.id] || 0} 次`}
                  >
                    <b>{promptOf(item, mode)}</b>
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
                    <b>{answerOf(item, mode)}</b>
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
