import { useEffect, useMemo, useRef, useState } from 'react';
import PlayBoard from './PlayBoard.jsx';
import LessonSetup, { fittedSize } from './LessonSetup.jsx';
import { CHARTS } from './kana.js';
import { BOARD_SIZES } from './grid.js';
import { MODE_BY_ID, SHAPE_CHOICES, modeIdOf } from './modes.js';
import { puzzleById } from './puzzleImages.js';
import {
  createRoom,
  endRoom,
  isStudentOnline,
  lessonParams,
  linksFor,
  parseLesson,
  parseRoomFromUrl,
  readTeacherSession,
  subscribeRoom,
} from './room.js';

function setTeacherUrl(room, lesson) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  if (room) url.searchParams.set('room', room);
  if (lesson) {
    for (const [key, value] of lessonParams(lesson)) url.searchParams.set(key, value);
  }
  window.history.replaceState({}, '', url);
}

function EndClassControls({ ended, onEnd }) {
  const [armed, setArmed] = useState(false);
  if (ended) return null;
  if (!armed) {
    return (
      <button className="pref" type="button" onClick={() => setArmed(true)}>
        結束這堂課
      </button>
    );
  }
  return (
    <div className="end-confirm">
      <p>學生畫面會立刻鎖住，這次教室也會作廢。</p>
      <button className="start-btn" type="button" onClick={onEnd}>確定結束</button>
      <button className="pref" type="button" onClick={() => setArmed(false)}>取消</button>
    </div>
  );
}

export default function TeacherDesk() {
  const boot = parseRoomFromUrl();
  const bootLesson = parseLesson();
  const bootMode = bootLesson ? bootLesson.modeId.split('-') : [];
  const stored = readTeacherSession();
  const [room, setRoom] = useState(() => {
    if (stored && (!boot.room || stored.code === boot.room)) return stored.code;
    return boot.room;
  });
  const [boardId, setBoardId] = useState(bootMode[0] || 'kata');
  const [pieceId, setPieceId] = useState(bootMode[1] || 'hira');
  const [chartId, setChartId] = useState(bootLesson?.chartId || 'seion');
  const [sizeId, setSizeId] = useState(() => fittedSize(
    bootLesson?.chartId || 'seion',
    (bootMode[0] || 'kata') === 'listen',
    bootLesson?.sizeId || '8x4',
  ));
  const [shape, setShape] = useState(bootLesson?.shape || 'jigsaw');
  const [puzzleId, setPuzzleId] = useState(() => puzzleById(bootLesson?.puzzleId).id);
  const [live, setLive] = useState(null);
  const [copied, setCopied] = useState(false);
  const [roomError, setRoomError] = useState('');
  const copyTimer = useRef(null);
  const lesson = useMemo(() => ({
    modeId: modeIdOf(boardId, pieceId),
    chartId,
    puzzleId,
    sizeId,
    shape,
  }), [boardId, pieceId, chartId, puzzleId, sizeId, shape]);
  const assignedPuzzle = puzzleById(puzzleId);
  const livePuzzle = puzzleById(live?.config?.puzzleId);
  const liveMode = MODE_BY_ID[live?.config?.modeId];
  const liveSize = BOARD_SIZES.find((item) => item.id === live?.config?.sizeId);
  const liveShape = SHAPE_CHOICES.find((item) => item.id === (live?.config?.shape || 'jigsaw'));
  const studentOnline = isStudentOnline(live);
  const sessionOk = Boolean(room && readTeacherSession()?.code === room);

  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);

  useEffect(() => {
    if (!room || !sessionOk) return undefined;
    return subscribeRoom(room, setLive);
  }, [room, sessionOk]);

  useEffect(() => {
    if (!room || !sessionOk) return;
    setTeacherUrl(room, lesson);
  }, [room, sessionOk, lesson]);

  function pickChart(id) {
    setChartId(id);
    setSizeId((current) => fittedSize(id, boardId === 'listen', current));
  }

  function pickBoard(id) {
    if (id === pieceId) return;
    setBoardId(id);
    setSizeId((current) => fittedSize(chartId, id === 'listen', current));
  }

  function pickPiece(id) {
    if (id === boardId) return;
    setPieceId(id);
  }

  async function copyStudentLink() {
    if (!room) return;
    const { student } = linksFor(room, lesson);
    try {
      await navigator.clipboard.writeText(student);
    } catch {
      window.prompt('複製學生連結', student);
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  async function openRoom(forceNew) {
    setRoomError('');
    try {
      if (!forceNew) {
        const existing = readTeacherSession();
        if (existing) {
          setRoom(existing.code);
          setLive({ phase: 'empty', heartbeat: 0 });
          return;
        }
      }
      const code = await createRoom();
      setRoom(code);
      setLive({ phase: 'empty', heartbeat: 0 });
    } catch {
      setRoomError('教室沒有開成，請確認網路後再試一次。');
    }
  }

  async function confirmEnd() {
    if (!room) return;
    try {
      await endRoom(room);
    } catch {
      setRoomError('結束失敗，請再試一次。');
    }
  }

  async function startFresh() {
    setRoomError('');
    await openRoom(true);
  }

  if (room && sessionOk && (live?.phase === 'play' || live?.phase === 'review' || live?.phase === 'done') && live?.config?.seed != null && liveMode && !live?.ended) {
    return (
      <div className="app is-play">
        <div className="grain" />
        {live?.error === 'offline'
          ? <p className="watch-offline">教室轉送連不上</p>
          : !studentOnline
            ? <p className="watch-offline">學生暫時離線</p>
            : null}
        <PlayBoard
          config={{
            modeId: live.config.modeId,
            chartId: live.config.chartId,
            puzzle: livePuzzle,
            sizeId: live.config.sizeId,
            shape: live.config.shape || 'jigsaw',
            seed: live.config.seed,
          }}
          spectate
          liveState={live}
          onCopyLink={copyStudentLink}
        />
        <div className="teacher-end-bar">
          <EndClassControls ended={Boolean(live?.ended)} onEnd={confirmEnd} />
        </div>
      </div>
    );
  }

  if (room && sessionOk) {
    const waiting = !live || live.phase === 'empty' || !live.phase;
    const inLobby = live?.phase === 'lobby' && !live?.ended;
    const ended = Boolean(live?.ended);
    return (
      <div className="app is-home">
        <div className="grain" />
        <main className="home watch-desk">
          <section className="home-panel watch-panel">
            <p className="kicker">一對一教室</p>
            <h1>教室 {room}</h1>
            <p className="home-mode">
              {ended
                ? '這堂課已結束。學生畫面已鎖定。'
                : live?.error === 'offline'
                  ? '教室轉送連不上，請檢查網路。'
                  : live?.error === 'unauthorized'
                    ? '老師授權已失效，請新開一間教室。'
                  : live?.error === 'not_found'
                    ? '教室已過期，請重新開一間。'
                    : waiting
                      ? '選好這一關，再把連結傳給學生。'
                      : studentOnline
                        ? '學生已進來，還沒開始。'
                        : '學生暫時離線。'}
            </p>
            {ended ? null : (
              <>
                <p className="watch-lobby">
                  學生將玩 {CHARTS[chartId]?.name}
                  {' · '}
                  {MODE_BY_ID[lesson.modeId]?.title}
                  {' · '}
                  {SHAPE_CHOICES.find((item) => item.id === shape)?.label}
                  {' · '}
                  {BOARD_SIZES.find((item) => item.id === sizeId)?.label}
                  {' · '}
                  {assignedPuzzle.name}
                </p>
                <LessonSetup
                  chartId={chartId}
                  boardId={boardId}
                  pieceId={pieceId}
                  shape={shape}
                  sizeId={sizeId}
                  puzzleId={puzzleId}
                  onChart={pickChart}
                  onBoard={pickBoard}
                  onPiece={pickPiece}
                  onShape={setShape}
                  onSize={setSizeId}
                  onPuzzle={setPuzzleId}
                />
                <p className="watch-url">{linksFor(room, lesson).student}</p>
                <p className="watch-hint">貼進 Zoom 即可。學生不能改關卡和圖片。改了選項之後，要把新連結再傳一次。</p>
              </>
            )}
            {inLobby ? (
              <p className="watch-lobby">
                {liveMode?.title || '選關中'}
                {liveShape ? ` · ${liveShape.label}` : ''}
                {' · '}
                {CHARTS[live?.config?.chartId]?.name || ''}
                {liveSize ? ` · ${liveSize.label}` : ''}
                {livePuzzle ? ` · ${livePuzzle.name}` : ''}
              </p>
            ) : null}
            {roomError ? <p className="watch-error">{roomError}</p> : null}
            <div className="watch-actions">
              {ended ? null : (
                <button className="start-btn" type="button" onClick={copyStudentLink}>
                  {copied ? '已複製' : '複製學生連結'}
                </button>
              )}
              <EndClassControls ended={ended} onEnd={confirmEnd} />
              <button className="pref" type="button" onClick={startFresh}>新開一間</button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app is-home">
      <div className="grain" />
      <main className="home watch-desk">
        <section className="home-panel watch-panel">
          <p className="kicker">一對一教室</p>
          <h1>老師觀戰</h1>
          <p className="watch-hint">先選好這一關和圖片。開啟後把學生連結貼進 Zoom，學生不能再改。</p>
          <LessonSetup
            chartId={chartId}
            boardId={boardId}
            pieceId={pieceId}
            shape={shape}
            sizeId={sizeId}
            puzzleId={puzzleId}
            onChart={pickChart}
            onBoard={pickBoard}
            onPiece={pickPiece}
            onShape={setShape}
            onSize={setSizeId}
            onPuzzle={setPuzzleId}
          />
          {roomError ? <p className="watch-error">{roomError}</p> : null}
          <div className="watch-actions">
            <button className="start-btn" type="button" onClick={() => openRoom(false)}>開啟教室</button>
          </div>
        </section>
      </main>
    </div>
  );
}
