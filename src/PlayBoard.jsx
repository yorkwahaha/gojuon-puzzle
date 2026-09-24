import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CHARTS, answerOf, chartCells, glyphFor, promptOf } from './kana.js';
import { MODE_BY_ID } from './modes.js';
import { BOARD_SIZES, sizeCount } from './grid.js';
import {
  TAB_FRAC,
  faceBackground,
  fittedImage,
  makeJigsaw,
  pieceEdges,
  piecePath,
  seeded,
  shuffle,
} from './jigsaw.js';
import { playComplete, playPickup, playSnap, primeKana, resumeBgm, setBgmMuted, speakKana } from './audio.js';
import { formatTime, loadPrefs, recordLevelBest, savePrefs } from './storage.js';
import { playSnapshot } from './room.js';
import { choiceOptions, topMissed } from './review.js';
import Fireworks from './Fireworks.jsx';
import ReviewDrill from './ReviewDrill.jsx';

function JigStroke({ d }) {
  return (
    <svg className="jig-stroke" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function SpeakerIcon({ off }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h3.2L12 5.2v13.6L7.2 15H4V9z" fill="currentColor" />
      {off ? (
        <path d="M15.2 9.2 20 14m0-4.8-4.8 4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      ) : (
        <path d="M15.4 9.2a4.2 4.2 0 0 1 0 5.6M17.8 7a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function PlayBoard({
  config,
  onExit,
  spectate = false,
  liveState = null,
  onLiveState,
  watching = false,
  onCopyLink,
}) {
  const { modeId, chartId, puzzle, sizeId, seed, shape = 'jigsaw' } = config;
  const mode = MODE_BY_ID[modeId];
  const size = BOARD_SIZES.find((item) => item.id === sizeId) || BOARD_SIZES[0];
  const { cols, rows } = size;
  const need = sizeCount(size);

  const cells = useMemo(() => {
    const pool = shuffle(chartCells(chartId), seeded(seed));
    return pool.slice(0, Math.min(need, pool.length));
  }, [chartId, need, seed]);

  const trayOrder = useMemo(
    () => shuffle(cells, seeded(seed + 91)),
    [cells, seed]
  );

  const jig = useMemo(() => makeJigsaw(cols, rows, seed), [cols, rows, seed]);
  const tabs = shape !== 'rect';

  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const barRef = useRef(null);
  const panRef = useRef(null);
  const ignoreSlotClick = useRef(false);
  const [dragging, setDragging] = useState(null);
  const [hotSlotId, setHotSlotId] = useState(null);
  const startedAt = useRef(performance.now());
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [placed, setPlaced] = useState(() => new Set());
  const [selected, setSelected] = useState(null);
  const [focusSlot, setFocusSlot] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [missCounts, setMissCounts] = useState({});
  const [wrongId, setWrongId] = useState(null);
  const [wrongPieceId, setWrongPieceId] = useState(null);
  const wrongTimer = useRef(null);
  const reviewTimer = useRef(null);
  const settled = useRef(false);
  const [reviewItems, setReviewItems] = useState(null);
  const [matched, setMatched] = useState([]);
  const [reviewLeft, setReviewLeft] = useState(null);
  const [reviewRight, setReviewRight] = useState(null);
  const [choicePick, setChoicePick] = useState(null);
  const [reviewWrong, setReviewWrong] = useState(false);
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [imgSize, setImgSize] = useState(null);
  const [bgmOff, setBgmOff] = useState(() => {
    const off = loadPrefs().bgmMuted;
    setBgmMuted(off);
    return off;
  });
  const [showMenu, setShowMenu] = useState(false);
  const [trayScroll, setTrayScroll] = useState({ left: 0, span: 1, view: 1 });
  const galleryAt = useRef(0);
  const wallStartedAt = useRef(Date.now());

  const placedView = spectate ? new Set(liveState?.placed || []) : placed;
  const remaining = trayOrder.filter((cell) => !placedView.has(cell.id));
  const complete = placedView.size === cells.length && cells.length > 0;
  const selectedView = spectate ? cells.find((item) => item.id === liveState?.selected) || null : selected;
  const focusView = spectate ? cells.find((item) => item.id === liveState?.focusSlot) || null : focusSlot;
  const mistakesView = spectate ? liveState?.mistakes || 0 : mistakes;
  const wrongView = spectate ? liveState?.wrongId ?? null : wrongId;
  const wrongPieceView = spectate ? liveState?.wrongPieceId ?? null : wrongPieceId;
  const doneView = spectate ? liveState?.phase === 'done' : done;
  const reviewLive = spectate ? liveState?.review : null;
  const reviewItemsView = spectate
    ? (reviewLive?.keys || []).map((id) => cells.find((item) => item.id === id)).filter(Boolean)
    : reviewItems;
  const missCountsView = spectate ? reviewLive?.counts || {} : missCounts;
  const matchedView = spectate ? reviewLive?.matched || [] : matched;
  const reviewLeftView = spectate ? reviewLive?.leftId ?? null : reviewLeft;
  const reviewRightView = spectate ? reviewLive?.rightId ?? null : reviewRight;
  const choicePickView = spectate ? reviewLive?.choicePick ?? null : choicePick;
  const reviewWrongView = spectate ? Boolean(reviewLive?.wrong) : reviewWrong;
  const reviewing = Boolean(reviewItemsView?.length) && !doneView;

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const update = () => {
      const box = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const padX = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
      const padY = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      setStage({
        w: Math.max(box.width - padX, 1),
        h: Math.max(box.height - padY, 1),
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (doneView || reviewing) return undefined;
    const tick = () => {
      if (spectate) {
        const start = liveState?.startedAt;
        setElapsed(start ? Math.max(0, Date.now() - start) : 0);
        return;
      }
      setElapsed(performance.now() - startedAt.current);
    };
    tick();
    const id = window.setInterval(tick, 80);
    return () => window.clearInterval(id);
  }, [doneView, liveState?.startedAt, reviewing, spectate]);

  const cell = Math.min(stage.w / cols, stage.h / rows);
  const frame = { w: cell * cols, h: cell * rows };
  const tabFrac = tabs ? TAB_FRAC : 0;
  const tab = cell * tabFrac;
  const fit = fittedImage(cols, rows, imgSize?.w, imgSize?.h);

  const slots = useMemo(() => {
    const total = cols * rows;
    return Array.from({ length: total }, (_, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      return {
        index,
        col,
        row,
        cell: cells[index] || null,
        edges: tabs
          ? pieceEdges(col, row, cols, rows, jig)
          : { top: 0, right: 0, bottom: 0, left: 0 },
      };
    });
  }, [cells, cols, jig, rows, tabs]);

  const reviewKind = reviewItemsView?.length === 1 ? 'choice' : 'match';
  const reviewIds = (reviewItemsView || []).map((item) => item.id).join('|');
  const leftOrder = useMemo(
    () => reviewIds.split('|').filter(Boolean).map((id) => cells.find((item) => item.id === id)).filter(Boolean),
    [cells, reviewIds]
  );
  const rightOrder = useMemo(
    () => shuffle([...leftOrder], seeded(seed + 404)),
    [leftOrder, seed]
  );
  const options = useMemo(
    () => (leftOrder.length === 1 ? choiceOptions(leftOrder[0], cells, seeded(seed + 505)) : []),
    [cells, leftOrder, seed]
  );

  function toggleBgm(event) {
    event?.stopPropagation();
    const next = !bgmOff;
    setBgmOff(next);
    setBgmMuted(next);
    savePrefs({ bgmMuted: next });
  }

  function onGalleryClick() {
    if (performance.now() - galleryAt.current < 450) return;
    setShowMenu(true);
  }

  useEffect(() => {
    const image = new Image();
    image.onload = () => setImgSize({ w: image.naturalWidth, h: image.naturalHeight });
    image.src = puzzle.url;
  }, [puzzle.url]);

  useEffect(() => {
    if (spectate) return undefined;
    resumeBgm();
    return undefined;
  }, [spectate]);

  useEffect(() => () => {
    if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
    if (reviewTimer.current) window.clearTimeout(reviewTimer.current);
  }, []);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const measure = () => {
      setTrayScroll({
        left: track.scrollLeft,
        span: Math.max(track.scrollWidth, 1),
        view: Math.max(track.clientWidth, 1),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    track.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener('scroll', measure);
    };
  }, [remaining.length]);

  useEffect(() => {
    if (spectate || !complete || settled.current) return undefined;
    settled.current = true;
    const ms = performance.now() - startedAt.current;
    setElapsed(ms);
    recordLevelBest(puzzle.id, sizeId, ms);
    playComplete();
    const weak = topMissed(cells, missCounts);
    if (weak.length) {
      setReviewItems(weak);
      return undefined;
    }
    setDone(true);
    galleryAt.current = performance.now();
    return undefined;
  }, [cells, complete, missCounts, puzzle.id, sizeId, spectate]);

  useEffect(() => {
    if (!onLiveState || spectate) return undefined;
    onLiveState(playSnapshot({
      config,
      placed,
      mistakes,
      selected: selected?.id ?? null,
      focusSlot: focusSlot?.id ?? null,
      wrongId,
      wrongPieceId,
      startedAt: wallStartedAt.current,
      done: done || (complete && !reviewItems),
      review: reviewItems
        ? {
          keys: reviewItems.map((item) => item.id),
          counts: missCounts,
          matched,
          leftId: reviewLeft,
          rightId: reviewRight,
          choicePick,
          wrong: reviewWrong,
        }
        : null,
    }));
    return undefined;
  }, [choicePick, complete, config, done, focusSlot, matched, missCounts, mistakes, onLiveState, placed, reviewItems, reviewLeft, reviewRight, reviewWrong, selected, spectate, wrongId, wrongPieceId]);

  function speak(cellData) {
    speakKana(cellData.key);
  }

  function finishReview() {
    setDone(true);
    galleryAt.current = performance.now();
  }

  function flashReviewWrong() {
    setReviewWrong(true);
    if (reviewTimer.current) window.clearTimeout(reviewTimer.current);
    reviewTimer.current = window.setTimeout(() => {
      setReviewLeft(null);
      setReviewRight(null);
      setChoicePick(null);
      setReviewWrong(false);
      reviewTimer.current = null;
    }, 520);
  }

  function pickReviewLeft(id) {
    if (spectate) return;
    const item = cells.find((cellData) => cellData.id === id);
    if (item) speak(item);
    if (reviewRight) {
      if (id === reviewRight) {
        setMatched((prev) => (prev.includes(id) ? prev : [...prev, id]));
        setReviewLeft(null);
        setReviewRight(null);
        setReviewWrong(false);
        return;
      }
      setReviewLeft(id);
      flashReviewWrong();
      return;
    }
    setReviewLeft(id);
  }

  function pickReviewRight(id) {
    if (spectate) return;
    if (reviewLeft) {
      if (id === reviewLeft) {
        setMatched((prev) => (prev.includes(id) ? prev : [...prev, id]));
        setReviewLeft(null);
        setReviewRight(null);
        setReviewWrong(false);
        return;
      }
      setReviewRight(id);
      flashReviewWrong();
      return;
    }
    setReviewRight(id);
  }

  function pickReviewChoice(id) {
    if (spectate || !reviewItems?.[0]) return;
    setChoicePick(id);
    if (id === reviewItems[0].id) {
      setMatched([id]);
      setReviewWrong(false);
      return;
    }
    flashReviewWrong();
  }

  useEffect(() => {
    if (spectate || !reviewItems || done) return undefined;
    if (matched.length < reviewItems.length) return undefined;
    const id = window.setTimeout(finishReview, 560);
    return () => window.clearTimeout(id);
  }, [done, matched.length, reviewItems, spectate]);

  function place(piece, slotCell) {
    if (!piece || !slotCell || placed.has(slotCell.id)) return;
    speak(slotCell);
    if (piece.id === slotCell.id) {
      playSnap();
      setPlaced((prev) => {
        const next = new Set(prev);
        next.add(slotCell.id);
        return next;
      });
      setSelected(null);
      setFocusSlot(null);
      return;
    }
    setMistakes((value) => value + 1);
    setMissCounts((prev) => ({ ...prev, [slotCell.id]: (prev[slotCell.id] || 0) + 1 }));
    setSelected(null);
    setFocusSlot(null);
    setWrongId(slotCell.id);
    setWrongPieceId(piece.id);
    if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
    wrongTimer.current = window.setTimeout(() => {
      setWrongId((current) => (current === slotCell.id ? null : current));
      setWrongPieceId((current) => (current === piece.id ? null : current));
      wrongTimer.current = null;
    }, 520);
  }

  function onSlotClick(slot) {
    if (spectate || ignoreSlotClick.current) return;
    if (!slot.cell || placed.has(slot.cell.id)) return;
    if (selected) {
      place(selected, slot.cell);
      return;
    }
    if (mode.listen) speak(slot.cell);
    setFocusSlot(slot.cell);
  }

  function slotIdAt(x, y) {
    const hits = document.elementsFromPoint(x, y);
    for (const node of hits) {
      const slot = node.closest?.('.slot');
      if (slot?.dataset.slotId && !slot.disabled && !slot.classList.contains('is-placed')) {
        return slot.dataset.slotId;
      }
    }
    const slots = document.querySelectorAll('.slot:not(:disabled)');
    for (const slot of slots) {
      if (!slot.dataset.slotId || slot.classList.contains('is-placed')) continue;
      const box = slot.getBoundingClientRect();
      if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) {
        return slot.dataset.slotId;
      }
    }
    return null;
  }

  function unbindPiecePointer(pan) {
    if (!pan) return;
    window.removeEventListener('pointermove', pan.move, { capture: true });
    window.removeEventListener('pointerup', pan.up, { capture: true });
    window.removeEventListener('pointercancel', pan.up, { capture: true });
  }

  function onPiecePointerDown(event, cellData) {
    if (spectate) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    unbindPiecePointer(panRef.current);
    const pan = {
      type: 'piece',
      pointerId: event.pointerId,
      cell: cellData,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      wasSelected: selected?.id === cellData.id,
      focusSlot,
    };
    pan.move = (next) => onPiecePointerMove(next);
    pan.up = (next) => onPiecePointerUp(next);
    panRef.current = pan;
    window.addEventListener('pointermove', pan.move, { capture: true, passive: false });
    window.addEventListener('pointerup', pan.up, { capture: true });
    window.addEventListener('pointercancel', pan.up, { capture: true });
    playPickup();
    primeKana(cellData.key);
    setSelected(cellData);
    setDragging({ cell: cellData, x: event.clientX, y: event.clientY });
  }

  function onPiecePointerMove(event) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId || pan.type !== 'piece') return;
    event.preventDefault();
    if (Math.hypot(event.clientX - pan.x, event.clientY - pan.y) > 4) pan.moved = true;
    setDragging({ cell: pan.cell, x: event.clientX, y: event.clientY });
    setHotSlotId(slotIdAt(event.clientX, event.clientY));
  }

  function onPiecePointerUp(event) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    unbindPiecePointer(pan);
    panRef.current = null;
    ignoreSlotClick.current = true;
    window.setTimeout(() => {
      ignoreSlotClick.current = false;
    }, 0);
    setDragging(null);
    setHotSlotId(null);
    if (event.type === 'pointercancel') {
      setSelected(pan.cell);
      return;
    }
    const id = slotIdAt(event.clientX, event.clientY);
    const slotCell = cells.find((item) => item.id === id);
    if (slotCell) {
      place(pan.cell, slotCell);
      return;
    }
    if (!pan.moved && pan.focusSlot) {
      place(pan.cell, pan.focusSlot);
      return;
    }
    if (!pan.moved && pan.wasSelected) setSelected(null);
    else setSelected(pan.cell);
  }

  function scrollTray(dir) {
    trackRef.current?.scrollBy({ left: dir * Math.min(320, stage.w * 0.4), behavior: 'smooth' });
  }

  function scrollFromBarX(clientX) {
    const bar = barRef.current;
    const track = trackRef.current;
    if (!bar || !track) return;
    const box = bar.getBoundingClientRect();
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (maxScroll <= 0) return;
    const thumbW = Math.max(48, (track.clientWidth / track.scrollWidth) * box.width);
    const maxX = Math.max(1, box.width - thumbW);
    const x = Math.min(maxX, Math.max(0, clientX - box.left - thumbW / 2));
    track.scrollLeft = (x / maxX) * maxScroll;
  }

  function onBarPointerDown(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    scrollFromBarX(event.clientX);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // pointer may already have ended
    }
  }

  function onBarPointerMove(event) {
    if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
    event.preventDefault();
    scrollFromBarX(event.clientX);
  }

  function onTrackPointerDown(event) {
    if (event.target.closest('.chip')) return;
    if (panRef.current?.type === 'piece') return;
    const track = trackRef.current;
    if (!track) return;
    panRef.current = {
      type: 'pan',
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scroll: track.scrollLeft,
    };
  }

  function onTrackPointerMove(event) {
    const pan = panRef.current;
    const track = trackRef.current;
    if (!pan || pan.type !== 'pan' || pan.pointerId !== event.pointerId || !track) return;
    track.scrollLeft = pan.scroll - (event.clientX - pan.x);
  }

  function onTrackPointerUp(event) {
    const pan = panRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;
    if (pan.type === 'pan') panRef.current = null;
  }

  function onTrackWheel(event) {
    const track = trackRef.current;
    if (!track) return;
    event.preventDefault();
    track.scrollLeft += event.deltaY + event.deltaX;
  }

  const fontScale = mode.answer === 'roma' || mode.prompt === 'roma'
    ? Math.max(11, Math.min(cell * 0.28, 22))
    : Math.max(14, Math.min(cell * 0.38, 32));
  const trayOverflow = trayScroll.span > trayScroll.view + 2;
  const thumbWidthPct = Math.min(100, Math.max((48 / Math.max(trayScroll.view, 1)) * 100, (trayScroll.view / trayScroll.span) * 100));
  const thumbTravel = 100 - thumbWidthPct;
  const thumbLeftPct = trayOverflow
    ? (trayScroll.left / (trayScroll.span - trayScroll.view)) * thumbTravel
    : 0;

  return (
    <section className={`play${spectate ? ' is-spectate' : ''}${tabs ? '' : ' is-rect'}`}>
      <svg className="clip-defs" aria-hidden="true">
        <defs>
          {slots.map((slot) => (
            <clipPath key={slot.index} id={`jig-${slot.index}`} clipPathUnits="objectBoundingBox">
              <path d={piecePath(slot.edges, tabs)} />
            </clipPath>
          ))}
        </defs>
      </svg>

      <header className="hud">
        {spectate ? null : (
          <button className="ghost-btn" type="button" onClick={onExit}>離開</button>
        )}
        {spectate && onCopyLink ? (
          <button className="ghost-btn" type="button" onClick={onCopyLink}>複製學生連結</button>
        ) : null}
        {spectate || watching ? (
          <span className="watch-seal" aria-label={spectate ? '觀戰中' : '老師觀看中'}>觀</span>
        ) : null}
        {spectate ? null : (
          <button
            className={`icon-btn${bgmOff ? ' is-off' : ''}`}
            type="button"
            onClick={toggleBgm}
            aria-label={bgmOff ? '開啟配樂' : '關閉配樂'}
            title={bgmOff ? '開啟配樂' : '關閉配樂'}
          >
            <SpeakerIcon off={bgmOff} />
          </button>
        )}
        <div className="hud-title">
          <strong>{spectate ? '觀戰中' : `${mode.title}${tabs ? '' : ' · 進階'}`}</strong>
          <span>{CHARTS[chartId].name} · {size.label} · {puzzle.name}</span>
        </div>
        <div className="hud-stats">
          <div className="timer" aria-live="off">{formatTime(elapsed)}</div>
          <div className="hud-meter" aria-live="polite">
            <b>{placedView.size}</b>
            <small>/{cells.length}{mistakesView ? ` · 誤 ${mistakesView}` : ''}</small>
          </div>
        </div>
      </header>

      <div className="stage" ref={stageRef}>
        <div
          className="board-frame"
          style={{
            width: frame.w,
            height: frame.h,
            '--cols': cols,
            '--rows': rows,
            '--tab': `${tab}px`,
          }}
        >
          {slots.map((slot) => {
            const isFiller = !slot.cell;
            const isPlaced = isFiller || (slot.cell && placedView.has(slot.cell.id));
            const isFocus = slot.cell && (focusView?.id === slot.cell.id || (!spectate && hotSlotId === slot.cell.id));
            const isWrong = slot.cell && wrongView === slot.cell.id;
            return (
              <button
                key={slot.index}
                type="button"
                disabled={isFiller}
                data-slot-id={slot.cell?.id || ''}
                data-key={slot.cell?.key || ''}
                className={[
                  'slot',
                  isPlaced ? 'is-placed' : '',
                  isFiller ? 'is-filler' : '',
                  isFocus ? 'is-focus' : '',
                  isWrong ? 'is-wrong' : '',
                ].filter(Boolean).join(' ')}
                style={{
                  zIndex: doneView ? 1 : (isPlaced ? 24 : 2) + slot.row + slot.col,
                  fontSize: fontScale,
                }}
                onClick={() => onSlotClick(slot)}
                aria-label={
                  isFiller
                    ? '補齊畫面的空格'
                    : isPlaced
                      ? '已揭開'
                      : mode.listen
                        ? '點擊聽發音'
                        : `底盤 ${promptOf(slot.cell, mode)}`
                }
              >
                <span
                  className="slot-face"
                  style={{
                    clipPath: `url(#jig-${slot.index})`,
                    backgroundImage: isPlaced ? `url(${puzzle.url})` : undefined,
                    ...faceBackground(slot.col, slot.row, cell, fit, tabFrac),
                  }}
                >
                  {isPlaced ? null : <span className="slot-glyph">{promptOf(slot.cell, mode)}</span>}
                </span>
                {isPlaced ? null : <JigStroke d={piecePath(slot.edges, tabs)} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="conveyor">
        <button className="conveyor-arrow" type="button" onClick={() => scrollTray(-1)} aria-label="向左看更多碎片">‹</button>
        <div className="conveyor-main">
          <div
            className="conveyor-track"
            id="conveyor-track"
            ref={trackRef}
            onPointerDown={onTrackPointerDown}
            onPointerMove={onTrackPointerMove}
            onPointerUp={onTrackPointerUp}
            onPointerCancel={onTrackPointerUp}
            onWheel={onTrackWheel}
          >
            {remaining.map((cellData) => {
              const slot = slots.find((item) => item.cell?.id === cellData.id);
              const isLifted = dragging?.cell.id === cellData.id;
              return (
                <button
                  key={cellData.id}
                  type="button"
                  data-key={cellData.key}
                  className={[
                    'chip',
                    selectedView?.id === cellData.id ? 'is-selected' : '',
                    wrongPieceView === cellData.id ? 'is-wrong' : '',
                    mode.answer === 'roma' ? 'is-roma' : '',
                    isLifted ? 'is-dragging' : '',
                  ].filter(Boolean).join(' ')}
                  onPointerDown={(event) => onPiecePointerDown(event, cellData)}
                  draggable={false}
                  aria-label={`碎片 ${answerOf(cellData, mode)}`}
                >
                  <span className="chip-hit" aria-hidden="true" />
                  <span
                    className="chip-face"
                    style={{ clipPath: slot ? `url(#jig-${slot.index})` : undefined }}
                  >
                    <span className="slot-glyph">{answerOf(cellData, mode)}</span>
                  </span>
                  {slot ? <JigStroke d={piecePath(slot.edges, tabs)} /> : null}
                </button>
              );
            })}
          </div>
          <div
            className={`conveyor-bar${trayOverflow ? '' : ' is-full'}`}
            ref={barRef}
            role="scrollbar"
            aria-label="滑動查看更多碎片"
            aria-orientation="horizontal"
            aria-controls="conveyor-track"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(trayOverflow ? (trayScroll.left / (trayScroll.span - trayScroll.view)) * 100 : 0)}
            aria-disabled={!trayOverflow}
            onPointerDown={trayOverflow ? onBarPointerDown : undefined}
            onPointerMove={trayOverflow ? onBarPointerMove : undefined}
          >
            <i className="conveyor-bar-thumb" style={{ width: `${thumbWidthPct}%`, left: `${thumbLeftPct}%` }} />
          </div>
        </div>
        <button className="conveyor-arrow" type="button" onClick={() => scrollTray(1)} aria-label="向右看更多碎片">›</button>
      </div>

      {dragging ? (
        <div
          className={`drag-ghost${mode.answer === 'roma' ? ' is-roma' : ''}`}
          style={{ left: dragging.x, top: dragging.y }}
        >
          <span
            className="chip-face"
            style={{
              clipPath: (() => {
                const slot = slots.find((item) => item.cell?.id === dragging.cell.id);
                return slot ? `url(#jig-${slot.index})` : undefined;
              })(),
            }}
          >
            <span className="slot-glyph">{answerOf(dragging.cell, mode)}</span>
          </span>
        </div>
      ) : null}

      {reviewing ? (
        <ReviewDrill
          items={reviewItemsView}
          counts={missCountsView}
          mode={mode}
          kind={reviewKind}
          leftOrder={leftOrder}
          rightOrder={rightOrder}
          options={options}
          matched={matchedView}
          leftId={reviewLeftView}
          rightId={reviewRightView}
          choicePick={choicePickView}
          wrong={reviewWrongView}
          spectate={spectate}
          onSpeak={spectate ? undefined : speak}
          onPickLeft={pickReviewLeft}
          onPickRight={pickReviewRight}
          onPickChoice={pickReviewChoice}
        />
      ) : null}

      {doneView ? (
        <div className="gallery" onClick={spectate ? undefined : onGalleryClick} role="presentation">
          <img className="gallery-photo" src={puzzle.url} alt={puzzle.name} />
          {spectate ? null : <Fireworks />}
          {showMenu || spectate ? (
            <div className="gallery-card" onClick={(event) => event.stopPropagation()}>
              <p className="stamp">完</p>
              <h2>整張圖揭開了</h2>
              <p>{formatTime(elapsed)} · {puzzle.name} · {size.label} · 誤放 {mistakesView} 次</p>
              {spectate ? null : (
                <button className="start-btn" type="button" onClick={onExit}>回主頁</button>
              )}
            </div>
          ) : (
            <p className="gallery-hint">點擊畫面繼續</p>
          )}
          {spectate ? null : (
            <button
              className={`icon-btn gallery-bgm${bgmOff ? ' is-off' : ''}`}
              type="button"
              onClick={toggleBgm}
              aria-label={bgmOff ? '開啟配樂' : '關閉配樂'}
            >
              <SpeakerIcon off={bgmOff} />
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
