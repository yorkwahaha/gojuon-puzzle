import { useEffect, useRef, useState } from 'react';
import PlayBoard from './PlayBoard.jsx';
import { CHARTS } from './kana.js';
import { BOARD_SIZES } from './grid.js';
import { MODE_BY_ID, SHAPE_CHOICES } from './modes.js';
import { PUZZLES, puzzleById } from './puzzleImages.js';
import {
  clearTeacherSession,
  createRoom,
  endRoom,
  isStudentOnline,
  linksFor,
  parseRoomFromUrl,
  readTeacherSession,
  subscribeRoom,
} from './room.js';

function setTeacherUrl(room) {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  if (room) url.searchParams.set('room', room);
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
  const stored = readTeacherSession();
  const [room, setRoom] = useState(() => {
    if (stored && (!boot.room || stored.code === boot.room)) return stored.code;
    return boot.room;
  });
  const [live, setLive] = useState(null);
  const [copied, setCopied] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const copyTimer = useRef(null);
  const livePuzzle = puzzleById(live?.config?.puzzleId);
  const liveMode = MODE_BY_ID[live?.config?.modeId];
  const liveSize = BOARD_SIZES.find((item) => item.id === live?.config?.sizeId);
  const liveShape = SHAPE_CHOICES.find((item) => item.id === (live?.config?.shape || 'jigsaw'));
  const studentOnline = isStudentOnline(live);
  const sessionOk = Boolean(room && readTeacherSession()?.code === room);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);

  useEffect(() => {
    if (!room || !sessionOk) return undefined;
    setTeacherUrl(room);
    return subscribeRoom(room, setLive);
  }, [room, sessionOk]);

  async function copyStudentLink() {
    if (!room) return;
    const { student } = linksFor(room);
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
          setTeacherUrl(existing.code);
          return;
        }
      }
      clearTeacherSession();
      const code = await createRoom();
      setRoom(code);
      setLive({ phase: 'empty', heartbeat: 0 });
      setTeacherUrl(code);
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
    setLive(null);
    setRoomError('');
    clearTeacherSession();
    await openRoom(true);
  }

  if (room && sessionOk && (live?.phase === 'play' || live?.phase === 'review' || live?.phase === 'done') && live?.config?.seed != null && liveMode && !live?.ended) {
    return (
      <div className="app is-play">
        <div className="grain" />
        {!studentOnline ? <p className="watch-offline">學生暫時離線</p> : null}
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
                  : live?.error === 'not_found'
                    ? '教室已過期，請重新開一間。'
                    : waiting
                      ? '把下面連結傳給學生，等他進來。'
                      : studentOnline
                        ? '學生正在選關。'
                        : '學生暫時離線。'}
            </p>
            {ended ? null : (
              <>
                <p className="watch-url">{linksFor(room).student}</p>
                <p className="watch-hint">貼進 Zoom 即可。學生用自己的網路打開正式站，不必同一 Wi-Fi。</p>
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
          <p className="watch-hint">教室只收一位學生。開啟後把學生連結貼進 Zoom。遊戲畫面不會出現這個入口。</p>
          {roomError ? <p className="watch-error">{roomError}</p> : null}
          <div className="watch-actions">
            <button className="start-btn" type="button" onClick={() => openRoom(false)}>開啟教室</button>
          </div>
        </section>
      </main>
    </div>
  );
}
