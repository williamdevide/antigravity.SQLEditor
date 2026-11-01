import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { TrainingVideoItem, VideoPillarId } from '../../types/trainingVideo';
import { TRAINING_VIDEOS_CATALOG } from '../../data/trainingVideosCatalog';

interface InteractiveVideoPlayerProps {
  onNavigate: (view: 'workspace' | 'er-diagram' | 'er-model' | 'gallery' | 'settings') => void;
}

export const InteractiveVideoPlayer: React.FC<InteractiveVideoPlayerProps> = ({
  onNavigate,
}) => {
  const [selectedVideoId, setSelectedVideoId] = useState<VideoPillarId>('editor-sql');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [watchedVideos, setWatchedVideos] = useState<Record<string, boolean>>({});
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);

  const activeVideo = useMemo(
    () =>
      TRAINING_VIDEOS_CATALOG.find((v) => v.id === selectedVideoId) ||
      TRAINING_VIDEOS_CATALOG[0],
    [selectedVideoId]
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Relógio do player com requestAnimationFrame / setInterval seguro
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = 100;
    const timer = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + (intervalMs / 1000) * playbackSpeed;
        if (next >= activeVideo.durationSec) {
          // Marca como assistido
          setWatchedVideos((curr) => ({ ...curr, [activeVideo.id]: true }));
          return 0; // Loop contínuo ou reinicia
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, activeVideo.durationSec, activeVideo.id]);

  // Reinicia o tempo ao trocar de vídeo
  const handleSelectVideo = (video: TrainingVideoItem) => {
    setSelectedVideoId(video.id);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  // Legenda sincronizada no tempo atual
  const activeSubtitle = useMemo(() => {
    return activeVideo.subtitles.find(
      (s) => currentTime >= s.startSec && currentTime <= s.endSec
    );
  }, [activeVideo.subtitles, currentTime]);

  // Cena visual correspondente
  const activeScene = useMemo(() => {
    const sorted = [...activeVideo.scenes].sort((a, b) => b.atSec - a.atSec);
    return sorted.find((sc) => currentTime >= sc.atSec) || activeVideo.scenes[0];
  }, [activeVideo.scenes, currentTime]);

  // Formatação MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentTime(pos * activeVideo.durationSec);
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const progressPercent = Math.min(100, (currentTime / activeVideo.durationSec) * 100);

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden flex flex-col shadow-xl transition-all ${
        isTheaterMode ? 'p-6 max-w-7xl mx-auto' : 'p-5'
      }`}
    >
      {/* Cabeçalho da Central de Vídeos */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/15 border border-[#FF6B00]/35 flex items-center justify-center text-[#FF6B00]">
            <span className="material-symbols-outlined text-[22px]">play_circle</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-[var(--text-primary)] tracking-tight">
                Central de Treinamento em Vídeo &amp; Demonstrações Guiadas
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#00E676]/15 border border-[#00E676]/35 text-[#00E676] text-[10px] font-mono font-bold">
                PT-BR • Legendado
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Assista a micro-aulas animadas de 30 a 40 segundos e domine cada ferramenta da disciplina de banco de dados.
            </p>
          </div>
        </div>

        {/* Botão de Ir para a Tela do Vídeo Ativo */}
        <button
          type="button"
          onClick={() => onNavigate(activeVideo.targetView)}
          className="px-3.5 py-1.5 rounded-xl bg-[#FF6B00] hover:bg-[#FF8533] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-[15px]">{activeVideo.icon}</span>
          <span>{activeVideo.targetViewLabel}</span>
          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
        </button>
      </div>

      {/* Grid: Player 16:9 em Destaque + Playlist Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4">
        {/* COLUNA DO PLAYER (8 colunas) */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          {/* Palco do Vídeo 16:9 com Simulação Visual Interativa */}
          <div className="relative aspect-video w-full rounded-2xl bg-neutral-950 border border-[var(--border-color)] overflow-hidden shadow-2xl flex flex-col justify-between select-none">
            {/* Topo do Palco: Badge do Recurso e Título da Cena */}
            <div className="p-3.5 z-20 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
              <div className="flex items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-1 shadow-xs"
                  style={{ backgroundColor: activeVideo.color }}
                >
                  <span className="material-symbols-outlined text-[12px]">{activeVideo.icon}</span>
                  <span>{activeVideo.badge}</span>
                </span>
                <span className="text-xs font-mono font-semibold text-white/90 drop-shadow">
                  {activeScene.actionTitle}
                </span>
              </div>

              <span className="text-[11px] font-mono font-bold text-[var(--accent-yellow)] bg-black/60 px-2 py-0.5 rounded-md border border-white/10">
                {formatTime(currentTime)} / {formatTime(activeVideo.durationSec)}
              </span>
            </div>

            {/* MEIO: SIMULAÇÃO VISUAL DA TELA (Renderizador Animado) */}
            <div className="absolute inset-0 flex items-center justify-center p-6 pt-12 pb-16 overflow-hidden">
              {/* Plano de Fundo com Grid Técnico de IDE */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Cena 1: Laboratório SQL */}
              {activeVideo.id === 'editor-sql' && (
                <div className="w-full h-full rounded-xl bg-[#1e1e1e] border border-white/15 p-4 flex flex-col justify-between shadow-2xl font-mono text-xs text-white">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px] text-white/50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                      <span className="ml-2 text-white font-semibold">consultas.sql</span>
                    </div>
                    <span className="text-[10px] bg-[#00E676]/20 text-[#00E676] px-2 py-0.5 rounded border border-[#00E676]/40">
                      AlaSQL Engine
                    </span>
                  </div>

                  <div className="py-2 space-y-1 text-white/90">
                    <div className="text-[var(--accent-yellow)] font-bold">
                      -- {activeScene.screenContent.headline}
                    </div>
                    <pre className="text-emerald-400 text-xs leading-relaxed overflow-hidden">
                      {activeScene.screenContent.snippetSql}
                    </pre>
                  </div>

                  {activeScene.screenContent.toastText && (
                    <div className="px-3 py-1.5 rounded-lg bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] text-[11px] flex items-center gap-1.5 animate-in fade-in">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span>{activeScene.screenContent.toastText}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Cena 2: Estúdio DER */}
              {activeVideo.id === 'er-studio' && (
                <div className="w-full h-full rounded-xl bg-neutral-900/90 border border-white/15 p-4 relative overflow-hidden flex items-center justify-center">
                  {/* Linha Ortogonal de Chave Estrangeira */}
                  {activeScene.screenContent.connectedLine && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                      <path
                        d="M 180 110 L 260 110 L 260 110 L 320 110"
                        stroke="#FF6B00"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                        fill="none"
                      />
                      <circle cx="180" cy="110" r="4" fill="#FF6B00" />
                      <circle cx="320" cy="110" r="4" fill="#FF6B00" />
                    </svg>
                  )}

                  {/* Cartões de Tabelas */}
                  <div className="w-full flex items-center justify-around gap-6 z-20">
                    {activeScene.screenContent.tablesVisible?.map((tbl) => (
                      <div
                        key={tbl.name}
                        className="w-48 rounded-xl bg-[#252526] border border-[#FF6B00]/60 shadow-xl overflow-hidden font-mono text-xs animate-in zoom-in-95 duration-200"
                      >
                        <div className="px-3 py-1.5 bg-[#FF6B00] text-white font-bold flex items-center justify-between text-[11px]">
                          <span>{tbl.name}</span>
                          <span className="text-[10px] opacity-80">3 col</span>
                        </div>
                        <div className="p-2 space-y-1">
                          {tbl.columns.map((col) => {
                            const isHi = tbl.highlightCol === col;
                            return (
                              <div
                                key={col}
                                className={`px-1.5 py-0.5 rounded text-[10px] flex items-center justify-between ${
                                  isHi
                                    ? 'bg-[#FF6B00]/30 text-white font-bold ring-1 ring-[#FF6B00]'
                                    : 'text-white/80'
                                }`}
                              >
                                <span>{col}</span>
                                <span className="material-symbols-outlined text-[11px] text-white/40">
                                  {col.includes('PK') ? 'key' : col.includes('FK') ? 'link' : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Painel Lateral do Inspetor Aberto */}
                  {activeScene.screenContent.inspectorOpen && (
                    <div className="absolute right-3 top-3 bottom-3 w-52 rounded-xl bg-[#1e1e1e] border border-[#FF6B00] p-3 shadow-2xl z-30 font-mono text-[10px] flex flex-col justify-between animate-in slide-in-from-right duration-200">
                      <div className="space-y-1.5">
                        <div className="font-bold text-[#FF6B00] flex items-center gap-1 border-b border-white/10 pb-1">
                          <span className="material-symbols-outlined text-[13px]">tune</span>
                          <span>Inspetor: {activeScene.screenContent.inspectorField}</span>
                        </div>
                        <div className="text-white/80">Tipo: INT (Chave Estrangeira)</div>
                        <div className="text-white/60">Tabela Pai: clientes (id)</div>
                      </div>
                      <div className="flex gap-1">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px]">
                          Salvar
                        </span>
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px]">
                          Excluir Coluna
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Cena 3: Split-View */}
              {activeVideo.id === 'split-view' && (
                <div className="w-full h-full rounded-xl bg-neutral-900 border border-white/15 p-2 grid grid-cols-2 gap-2 shadow-2xl font-mono text-xs">
                  <div className="rounded-lg bg-[#1e1e1e] border border-white/10 p-3 flex flex-col justify-between">
                    <div className="text-[10px] text-white/50 border-b border-white/10 pb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] text-amber-400">
                        bolt
                      </span>
                      <span>Monaco Editor (Script Ao Vivo)</span>
                    </div>
                    <pre className="text-amber-400 text-[10px] leading-snug overflow-hidden">
                      {activeScene.screenContent.snippetSql}
                    </pre>
                    <span className="text-[9px] text-[#00E676]">● Parser Reativo Ativo</span>
                  </div>

                  <div className="rounded-lg bg-[#252526] border border-[#29B6F6]/50 p-3 flex flex-col justify-between relative overflow-hidden">
                    <div className="text-[10px] text-[#29B6F6] font-bold border-b border-white/10 pb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">account_tree</span>
                      <span>Canvas DER Simultâneo</span>
                    </div>
                    <div className="space-y-1.5 my-auto">
                      {activeScene.screenContent.tablesVisible?.map((t) => (
                        <div
                          key={t.name}
                          className="p-1.5 rounded bg-neutral-800 border border-[#29B6F6]/40 text-[9px] text-white flex items-center justify-between animate-in zoom-in-95"
                        >
                          <span className="font-bold text-[#29B6F6]">{t.name}</span>
                          <span className="text-[8px] opacity-60">{t.columns.length} col</span>
                        </div>
                      ))}
                    </div>
                    <span className="text-[9px] text-white/50">Desenho automático sem rodar</span>
                  </div>
                </div>
              )}

              {/* Cena 4: Modelo Lógico & Dicionário 1FN–3FN */}
              {activeVideo.id === 'normalization' && (
                <div className="w-full h-full rounded-xl bg-neutral-900 border border-white/15 p-4 flex flex-col justify-between shadow-2xl font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-[var(--accent-yellow)] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">menu_book</span>
                      <span>Dicionário &amp; Formas Normais</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Linter Ativo
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-neutral-800/90 border border-white/10 text-[11px] space-y-1 text-white/90">
                    <div className="font-bold text-white">Auditoria de Normalização:</div>
                    <pre className="text-yellow-400 text-[10px] leading-relaxed overflow-hidden">
                      {activeScene.screenContent.snippetSql || activeScene.screenContent.headline}
                    </pre>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-white/60">
                    <span>1FN: Sem campos multivalorados</span>
                    <span className="text-[#00E676] font-bold">Auto-Correção SQL Disponível</span>
                  </div>
                </div>
              )}

              {/* Cena 5: Galeria de Desafios & Backup */}
              {activeVideo.id === 'gallery-backup' && (
                <div className="w-full h-full rounded-xl bg-neutral-900 border border-white/15 p-4 flex flex-col justify-between shadow-2xl font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-bold text-[#FF6B00] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">school</span>
                      <span>Galeria de Modelos &amp; Prática</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                      Super-Backup .sqleditor.json
                    </span>
                  </div>

                  {activeScene.screenContent.progressBarPct && (
                    <div className="p-3 rounded-xl bg-neutral-800 border border-[#FF6B00]/40 space-y-2">
                      <div className="flex justify-between text-[11px] font-bold text-white">
                        <span>Carregando escolaidiomas...</span>
                        <span className="text-[var(--accent-yellow)]">
                          {activeScene.screenContent.progressBarPct}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#FF6B00] to-[#FFB300] transition-all duration-300"
                          style={{ width: `${activeScene.screenContent.progressBarPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-white/80 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-emerald-400">
                      verified
                    </span>
                    <span>{activeScene.screenContent.headline}</span>
                  </div>
                </div>
              )}

              {/* Cursor Virtual Simulado */}
              <div
                className="absolute z-40 pointer-events-none transition-all duration-300 ease-out flex items-center gap-1"
                style={{
                  left: `${activeScene.cursorX ?? 50}%`,
                  top: `${activeScene.cursorY ?? 50}%`,
                }}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 border-white bg-[#FF6B00] shadow-lg transition-transform ${
                    activeScene.cursorClick ? 'scale-150 bg-yellow-400' : 'scale-100'
                  }`}
                />
                {activeScene.cursorClick && (
                  <span className="text-[9px] font-mono font-bold bg-black/80 text-yellow-300 px-1 rounded shadow animate-ping">
                    Click!
                  </span>
                )}
              </div>
            </div>

            {/* BASE: FAIXA DE LEGENDAS EM PORTUGUÊS (Sincronizada em tempo real) */}
            {showSubtitles && activeSubtitle && (
              <div className="absolute bottom-12 left-4 right-4 z-30 flex justify-center pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="max-w-2xl px-4 py-2 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-center shadow-2xl">
                  <p className="text-xs sm:text-sm font-sans font-medium text-white tracking-wide leading-snug">
                    {activeSubtitle.text.split(activeSubtitle.emphasis || '___').map((part, i, arr) => (
                      <React.Fragment key={i}>
                        {part}
                        {i < arr.length - 1 && (
                          <strong className="text-[var(--accent-yellow)] font-bold px-1 bg-white/10 rounded">
                            {activeSubtitle.emphasis}
                          </strong>
                        )}
                      </React.Fragment>
                    ))}
                  </p>
                </div>
              </div>
            )}

            {/* CONTROLES DO VÍDEO (Barra Inferior Estilo YouTube/Cinema) */}
            <div className="p-3 z-30 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col gap-2">
              {/* Timeline Interativa Scrubber */}
              <div
                onClick={handleSeek}
                className="w-full h-2 rounded-full bg-white/20 hover:h-2.5 transition-all cursor-pointer relative overflow-hidden"
              >
                <div
                  className="h-full bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FFB300] rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Botões de Ação do Player */}
              <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer transition-colors"
                    title={isPlaying ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {isPlaying ? 'pause' : 'play_arrow'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentTime(0)}
                    className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white cursor-pointer transition-colors"
                    title="Reiniciar vídeo"
                  >
                    <span className="material-symbols-outlined text-[18px]">replay</span>
                  </button>

                  <span className="font-mono text-[11px] text-white/70">
                    {formatTime(currentTime)} / {formatTime(activeVideo.durationSec)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Seletor de Velocidade */}
                  <button
                    type="button"
                    onClick={cycleSpeed}
                    className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 font-mono text-[11px] font-bold text-white cursor-pointer"
                    title="Alternar velocidade"
                  >
                    {playbackSpeed}x
                  </button>

                  {/* Alternar Legendas (CC) */}
                  <button
                    type="button"
                    onClick={() => setShowSubtitles((s) => !s)}
                    className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold cursor-pointer transition-colors ${
                      showSubtitles
                        ? 'bg-[var(--accent-yellow)] text-black'
                        : 'bg-white/10 text-white/60 hover:text-white'
                    }`}
                    title={showSubtitles ? 'Ocultar legendas' : 'Exibir legendas em PT-BR'}
                  >
                    CC
                  </button>

                  {/* Modo Expandido */}
                  <button
                    type="button"
                    onClick={() => setIsTheaterMode((t) => !t)}
                    className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white cursor-pointer"
                    title={isTheaterMode ? 'Modo normal' : 'Modo cinema expandido'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isTheaterMode ? 'close_fullscreen' : 'fit_screen'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo Pedagógico do Vídeo Ativo */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-start gap-3">
            <span
              className="p-2 rounded-lg text-white shrink-0 mt-0.5"
              style={{ backgroundColor: activeVideo.color }}
            >
              <span className="material-symbols-outlined text-[18px]">{activeVideo.icon}</span>
            </span>
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-[var(--text-primary)]">
                {activeVideo.title} — {activeVideo.subtitle}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {activeVideo.summary}
              </p>
            </div>
          </div>
        </div>

        {/* COLUNA DA PLAYLIST (4 colunas) */}
        <div className="lg:col-span-4 flex flex-col space-y-2.5">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
              Playlist de Treinamento ({TRAINING_VIDEOS_CATALOG.length} aulas)
            </span>
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              {Object.keys(watchedVideos).length}/{TRAINING_VIDEOS_CATALOG.length} concluídos
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[460px] pr-1">
            {TRAINING_VIDEOS_CATALOG.map((vid, idx) => {
              const isSelected = vid.id === activeVideo.id;
              const isWatched = watchedVideos[vid.id];

              return (
                <div
                  key={vid.id}
                  onClick={() => handleSelectVideo(vid)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-[var(--bg-primary)] border-[#FF6B00] shadow-md ring-1 ring-[#FF6B00]/40'
                      : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border-[var(--border-color)]'
                  }`}
                >
                  <div className="relative shrink-0 w-12 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden">
                    <span
                      className="material-symbols-outlined text-[24px]"
                      style={{ color: vid.color }}
                    >
                      {vid.icon}
                    </span>
                    {isSelected && (
                      <span className="absolute inset-0 bg-[#FF6B00]/25 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-[18px] animate-pulse">
                          play_arrow
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {idx + 1}. {vid.badge}
                      </span>
                      {isWatched && (
                        <span className="material-symbols-outlined text-[15px] text-[#00E676]">
                          check_circle
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                      {vid.title.replace(/^\d+\.\s*/, '')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono font-semibold text-[var(--accent-yellow)]">
                        {vid.durationSec}s
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">•</span>
                      <span className="text-[10px] text-[var(--text-muted)]">Legendas PT-BR</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

