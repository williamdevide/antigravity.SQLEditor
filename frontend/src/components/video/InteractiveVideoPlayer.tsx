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

            {/* MEIO: SIMULAÇÃO VISUAL DA TELA (Gravação de Tela Real - SQLEditor v3.2.5) */}
            <div className="absolute inset-0 flex items-stretch justify-stretch p-2 pt-11 pb-14 overflow-hidden bg-[#0e1117]">
              {/* Moldura da Janela do Navegador / SO (Screencast Fidedigno) */}
              <div className="w-full h-full rounded-xl bg-[#14171f] border border-white/20 shadow-2xl flex flex-col overflow-hidden relative font-sans">
                {/* 1. Barra de Topo da Janela (Window Chrome & Status de Gravação) */}
                <div className="h-7 bg-[#1c212d] border-b border-white/10 px-3 flex items-center justify-between shrink-0 select-none text-[10px] text-white/60">
                  <div className="flex items-center gap-2">
                    {/* Botões de Janela macOS/Windows */}
                    <div className="flex items-center gap-1.5 mr-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]/50 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50 shadow-xs" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]/50 shadow-xs" />
                    </div>
                    {/* Aba do Navegador Ativa */}
                    <div className="px-2.5 py-0.5 rounded-t-md bg-[#14171f] border-t border-x border-white/10 text-white font-medium flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[12px] text-[#FF6B00]">database</span>
                      <span className="truncate max-w-[180px]">SQLEditor v3.2.5 • SENAI Ourinhos</span>
                      <span className="text-[10px] text-white/40 ml-1">×</span>
                    </div>
                  </div>

                  {/* Barra de Endereço URL Minimalista */}
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/40 border border-white/10 text-[10px] text-white/50 w-64 justify-center">
                    <span className="material-symbols-outlined text-[11px] text-emerald-400">lock</span>
                    <span className="font-mono text-white/70">sqleditor.senai.br/app</span>
                  </div>

                  {/* Indicador de Gravação de Tela Ativa */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 font-mono text-[9px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      <span>REC</span>
                      <span className="hidden md:inline">60 FPS</span>
                    </div>
                  </div>
                </div>

                {/* 2. Navbar Real Oficial do SQLEditor v3.2.5 */}
                <div className="h-8 bg-[#181d28] border-b border-white/10 px-3 flex items-center justify-between shrink-0 select-none text-[11px]">
                  <div className="flex items-center gap-3">
                    {/* Logotipo e Versão */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#FF6B00] to-[#FF8533] flex items-center justify-center text-white shadow-xs">
                        <span className="material-symbols-outlined text-[13px]">database</span>
                      </div>
                      <span className="font-extrabold text-white tracking-tight">SQLEditor</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#FF6B00]/20 text-[#FF6B00] font-bold border border-[#FF6B00]/30">
                        v3.2.5
                      </span>
                    </div>

                    {/* Seletor de Banco Ativo */}
                    <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/40 border border-white/10 text-white/90">
                      <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                      <span className="font-mono font-bold text-[10px]">ecommerce_db</span>
                      <span className="text-[9px] text-white/40">▾</span>
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded ml-1 font-mono">
                        AlaSQL
                      </span>
                    </div>
                  </div>

                  {/* Alternador de Visão (Editor | SQL-DER | DER) */}
                  <div className="flex items-center p-0.5 rounded-lg bg-black/50 border border-white/10 font-mono text-[10px]">
                    <div
                      className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all ${
                        activeVideo.id === 'editor-sql' || activeVideo.id === 'normalization' || activeVideo.id === 'gallery-backup'
                          ? 'bg-[#FF6B00] text-white font-bold shadow-xs'
                          : 'text-white/60'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[11px]">terminal</span>
                      <span className="hidden sm:inline">Editor</span>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all ${
                        activeVideo.id === 'split-view'
                          ? 'bg-[#29B6F6] text-white font-bold shadow-xs'
                          : 'text-white/60'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[11px]">vertical_split</span>
                      <span className="hidden sm:inline">SQL-DER</span>
                    </div>
                    <div
                      className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all ${
                        activeVideo.id === 'er-studio'
                          ? 'bg-[#FF6B00] text-white font-bold shadow-xs'
                          : 'text-white/60'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[11px]">account_tree</span>
                      <span className="hidden sm:inline">DER</span>
                    </div>
                  </div>

                  {/* Botão de Executar Principal */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="px-2.5 py-0.5 rounded-md bg-[#00E676] hover:bg-[#00c864] text-neutral-950 font-bold font-mono text-[10px] flex items-center gap-1 shadow-xs transition-all"
                    >
                      <span className="material-symbols-outlined text-[13px]">play_arrow</span>
                      <span>Executar</span>
                      <span className="hidden lg:inline text-[8px] opacity-70 bg-black/10 px-1 rounded">
                        Ctrl+Enter
                      </span>
                    </button>
                    <div className="w-5 h-5 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
                      <span className="material-symbols-outlined text-[12px]">settings</span>
                    </div>
                  </div>
                </div>

                {/* 3. Área de Trabalho Principal Simulada */}
                <div className="flex-1 relative overflow-hidden bg-[#10131a] flex">
                  {/* CENA 1: LABORATÓRIO SQL & MONACO EDITOR EM USO REAL */}
                  {activeVideo.id === 'editor-sql' && (
                    <div className="w-full h-full flex flex-col">
                      <div className="flex-1 flex overflow-hidden">
                        {/* Schema Explorer Lateral Esquerdo */}
                        <div className="w-36 md:w-44 bg-[#141822] border-r border-white/10 flex flex-col text-[10px] select-none shrink-0">
                          <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between text-white/50 font-mono font-bold uppercase tracking-wider text-[9px]">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[11px] text-[#FF6B00]">folder_open</span>
                              <span>Esquema</span>
                            </span>
                            <span className="text-[9px] text-white/40">4 tab</span>
                          </div>
                          <div className="p-1 space-y-0.5 overflow-hidden font-mono">
                            <div className="px-1.5 py-1 rounded bg-[#FF6B00]/15 text-[#FF6B00] font-bold flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[11px]">table_chart</span>
                              <span>clientes</span>
                              <span className="text-[8px] text-white/40 ml-auto">4 col</span>
                            </div>
                            <div className="px-1.5 py-1 rounded text-white/70 hover:bg-white/5 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[11px] text-amber-400">table_chart</span>
                              <span>pedidos</span>
                              <span className="text-[8px] text-white/40 ml-auto">5 col</span>
                            </div>
                            <div className="px-1.5 py-1 rounded text-white/70 hover:bg-white/5 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[11px] text-blue-400">table_chart</span>
                              <span>produtos</span>
                              <span className="text-[8px] text-white/40 ml-auto">4 col</span>
                            </div>
                            <div className="px-1.5 py-1 rounded text-white/70 hover:bg-white/5 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[11px] text-purple-400">table_chart</span>
                              <span>itens_pedido</span>
                              <span className="text-[8px] text-white/40 ml-auto">4 col</span>
                            </div>
                          </div>
                          <div className="mt-auto p-1.5 border-t border-white/5 text-[9px] text-emerald-400/80 font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>100% Offline (Dexie)</span>
                          </div>
                        </div>

                        {/* Painel Central: Monaco Editor */}
                        <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
                          {/* Abas do Editor */}
                          <div className="h-6 bg-[#252526] border-b border-black flex items-center px-1 text-[10px] select-none shrink-0 font-mono">
                            <div className="px-2.5 py-1 bg-[#1e1e1e] border-t border-[#FF6B00] text-white font-bold flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[11px] text-amber-400">code</span>
                              <span>consultas.sql</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" />
                            </div>
                            <div className="px-2.5 py-1 text-white/50 hover:bg-white/5 flex items-center gap-1">
                              <span>relatorio.sql</span>
                            </div>
                            <div className="px-1.5 py-1 text-white/30 hover:text-white cursor-pointer">+</div>
                          </div>

                          {/* Área de Código com Numeração de Linhas e Syntax Highlighting Real */}
                          <div className="flex-1 p-2 font-mono text-[10px] leading-relaxed overflow-hidden flex select-none">
                            <div className="w-5 text-white/30 text-right pr-2 select-none border-r border-white/10 space-y-0.5">
                              <div>1</div>
                              <div>2</div>
                              <div>3</div>
                              <div>4</div>
                              <div>5</div>
                              <div>6</div>
                              <div>7</div>
                            </div>
                            <div className="flex-1 pl-2.5 space-y-0.5 overflow-hidden">
                              <div className="text-white/40">-- {activeScene.screenContent.headline}</div>
                              <div>
                                <span className="text-[#569cd6] font-bold">SELECT </span>
                                <span className="text-[#9cdcfe]">c.nome</span>
                                <span className="text-white/80">, </span>
                                <span className="text-[#dcdcaa]">COUNT</span>
                                <span className="text-white/80">(</span>
                                <span className="text-[#9cdcfe]">p.id</span>
                                <span className="text-white/80">) </span>
                                <span className="text-[#569cd6] font-bold">AS </span>
                                <span className="text-[#4ec9b0]">total_pedidos</span>
                              </div>
                              <div>
                                <span className="text-[#569cd6] font-bold">FROM </span>
                                <span className="text-[#4ec9b0]">clientes </span>
                                <span className="text-[#9cdcfe]">c</span>
                              </div>
                              <div>
                                <span className="text-[#569cd6] font-bold">INNER JOIN </span>
                                <span className="text-[#4ec9b0]">pedidos </span>
                                <span className="text-[#9cdcfe]">p </span>
                                <span className="text-[#569cd6] font-bold">ON </span>
                                <span className="text-[#9cdcfe]">p.cliente_id </span>
                                <span className="text-white/80">= </span>
                                <span className="text-[#9cdcfe]">c.id</span>
                              </div>
                              <div>
                                <span className="text-[#569cd6] font-bold">GROUP BY </span>
                                <span className="text-[#9cdcfe]">c.id</span>
                                <span className="text-white/80">, </span>
                                <span className="text-[#9cdcfe]">c.nome</span>
                              </div>
                              <div>
                                <span className="text-[#569cd6] font-bold">ORDER BY </span>
                                <span className="text-[#4ec9b0]">total_pedidos </span>
                                <span className="text-[#569cd6] font-bold">DESC</span>
                                <span className="text-white/80">;</span>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-[#00E676] pt-1">
                                <span className="w-1.5 h-3 bg-[#00E676] animate-pulse" />
                                <span className="text-white/50">Pronto para executar (Ctrl+Enter)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Painel Inferior: Console de Resultados e Grid Tabular Real */}
                      <div className="h-28 bg-[#161a24] border-t border-white/10 flex flex-col shrink-0 select-none">
                        <div className="px-3 py-1 bg-[#1a1f2c] border-b border-white/10 flex items-center justify-between text-[10px] font-mono">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-emerald-400 font-bold">
                              <span className="material-symbols-outlined text-[13px]">check_circle</span>
                              <span>Sucesso (3ms)</span>
                            </span>
                            <span className="text-white/40">•</span>
                            <span className="text-white/70">3 registros retornados</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px]">
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">CSV</span>
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">JSON</span>
                          </div>
                        </div>
                        {/* Tabela de Dados Formatada */}
                        <div className="flex-1 overflow-hidden p-1.5">
                          <table className="w-full text-left font-mono text-[9px] border-collapse">
                            <thead>
                              <tr className="border-b border-white/15 text-white/50 bg-black/30">
                                <th className="p-1 pl-2">id</th>
                                <th className="p-1">nome</th>
                                <th className="p-1">cidade</th>
                                <th className="p-1 text-right">total_pedidos</th>
                                <th className="p-1 pr-2 text-right">receita_total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-white/90">
                              <tr className="hover:bg-white/5">
                                <td className="p-1 pl-2 text-amber-400 font-bold">1</td>
                                <td className="p-1 text-white font-semibold">Carlos Silva</td>
                                <td className="p-1 text-white/70">Ourinhos - SP</td>
                                <td className="p-1 text-right text-emerald-400 font-bold">8</td>
                                <td className="p-1 pr-2 text-right text-[#00E676]">R$ 4.250,00</td>
                              </tr>
                              <tr className="hover:bg-white/5 bg-white/[0.02]">
                                <td className="p-1 pl-2 text-amber-400 font-bold">2</td>
                                <td className="p-1 text-white font-semibold">Mariana Costa</td>
                                <td className="p-1 text-white/70">Santa Cruz - SP</td>
                                <td className="p-1 text-right text-emerald-400 font-bold">5</td>
                                <td className="p-1 pr-2 text-right text-[#00E676]">R$ 2.890,50</td>
                              </tr>
                              <tr className="hover:bg-white/5">
                                <td className="p-1 pl-2 text-amber-400 font-bold">3</td>
                                <td className="p-1 text-white font-semibold">Rodrigo Lima</td>
                                <td className="p-1 text-white/70">Assis - SP</td>
                                <td className="p-1 text-right text-emerald-400 font-bold">3</td>
                                <td className="p-1 pr-2 text-right text-[#00E676]">R$ 1.420,00</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CENA 2: ESTÚDIO DER & MODELAGEM VISUAL COMPLETA EM USO REAL */}
                  {activeVideo.id === 'er-studio' && (
                    <div className="w-full h-full flex flex-col relative">
                      {/* Toolbar do Estúdio DER Oficial */}
                      <div className="h-7 bg-[#161a24] border-b border-white/10 px-3 flex items-center justify-between text-[10px] select-none shrink-0 font-mono">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="px-2 py-0.5 rounded bg-[#FF6B00] text-white font-bold flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[11px]">add</span>
                            <span>Nova Tabela</span>
                          </button>
                          <button
                            type="button"
                            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/90 flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[11px] text-amber-400">auto_fix_high</span>
                            <span>Organizar ↔ Restaurar</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/60">
                          <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10">100%</span>
                          <span className="material-symbols-outlined text-[13px] hover:text-white cursor-pointer">
                            crop_free
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">download</span>
                            <span>Exportar HD ▾</span>
                          </span>
                        </div>
                      </div>

                      {/* Canvas Interativo com Grid Pontilhado Técnico */}
                      <div
                        className="flex-1 relative overflow-hidden flex items-center justify-around p-6 select-none"
                        style={{
                          backgroundColor: '#0d1117',
                          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)',
                          backgroundSize: '16px 16px',
                        }}
                      >
                        {/* Linha Ortogonal 90° de Chave Estrangeira com Laser Flow Animado */}
                        {activeScene.screenContent.connectedLine && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                            {/* Linha Sólida de Fundo */}
                            <path
                              d="M 230 115 L 290 115 L 290 95 L 350 95"
                              stroke="#FF6B00"
                              strokeWidth="2.5"
                              fill="none"
                            />
                            {/* Feixe Laser Fluindo */}
                            <path
                              d="M 230 115 L 290 115 L 290 95 L 350 95"
                              stroke="#FFE600"
                              strokeWidth="2"
                              strokeDasharray="6 4"
                              fill="none"
                              className="animate-pulse"
                            />
                            {/* Pontos de Conexão com Cardinalidade */}
                            <circle cx="230" cy="115" r="4.5" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="1.5" />
                            <circle cx="350" cy="95" r="4.5" fill="#FF6B00" stroke="#FFFFFF" strokeWidth="1.5" />
                          </svg>
                        )}

                        {/* Card da Tabela: clientes (Pai / PK) */}
                        <div className="w-44 rounded-xl bg-[#1e222d] border border-[#4F46E5] shadow-2xl overflow-hidden font-mono text-[10px] z-20 animate-in zoom-in-95">
                          <div className="px-2.5 py-1.5 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white font-bold flex items-center justify-between text-[10px]">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">table_chart</span>
                              <span>clientes</span>
                            </span>
                            <span className="text-[9px] bg-black/30 px-1 rounded">4 col</span>
                          </div>
                          <div className="p-1.5 space-y-1 bg-[#141822]">
                            <div className="px-1.5 py-0.5 rounded bg-[#4F46E5]/20 text-white font-bold flex items-center justify-between border border-[#4F46E5]/40">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px] text-amber-400">key</span>
                                <span>id</span>
                              </span>
                              <span className="text-[8px] text-amber-300 font-mono">INT [PK]</span>
                            </div>
                            <div className="px-1.5 py-0.5 rounded text-white/80 flex items-center justify-between">
                              <span>nome</span>
                              <span className="text-[8px] text-white/40">VARCHAR</span>
                            </div>
                            <div className="px-1.5 py-0.5 rounded text-white/80 flex items-center justify-between">
                              <span>email</span>
                              <span className="text-[8px] text-white/40">VARCHAR</span>
                            </div>
                            <div className="px-1.5 py-0.5 rounded text-white/80 flex items-center justify-between">
                              <span>cidade</span>
                              <span className="text-[8px] text-white/40">VARCHAR</span>
                            </div>
                          </div>
                        </div>

                        {/* Card da Tabela: pedidos (Filha / FK) */}
                        <div className="w-48 rounded-xl bg-[#1e222d] border border-[#FF6B00] shadow-2xl overflow-hidden font-mono text-[10px] z-20 animate-in zoom-in-95">
                          <div className="px-2.5 py-1.5 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white font-bold flex items-center justify-between text-[10px]">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">table_chart</span>
                              <span>pedidos</span>
                            </span>
                            <span className="text-[9px] bg-black/30 px-1 rounded">4 col</span>
                          </div>
                          <div className="p-1.5 space-y-1 bg-[#141822]">
                            <div className="px-1.5 py-0.5 rounded text-white/80 flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px] text-amber-400">key</span>
                                <span>id</span>
                              </span>
                              <span className="text-[8px] text-amber-300">INT [PK]</span>
                            </div>
                            <div className="px-1.5 py-0.5 rounded bg-[#FF6B00]/30 text-white font-bold flex items-center justify-between border border-[#FF6B00] ring-1 ring-[#FF6B00]/60">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[11px] text-[#FF6B00]">link</span>
                                <span>cliente_id</span>
                              </span>
                              <span className="text-[8px] text-[#FFB300] font-mono">INT [FK]</span>
                            </div>
                            <div className="px-1.5 py-0.5 rounded text-white/80 flex items-center justify-between">
                              <span>data_pedido</span>
                              <span className="text-[8px] text-white/40">DATE</span>
                            </div>
                            <div className="px-1.5 py-0.5 rounded text-white/80 flex items-center justify-between">
                              <span>valor_total</span>
                              <span className="text-[8px] text-white/40">DECIMAL</span>
                            </div>
                          </div>
                        </div>

                        {/* Painel Lateral do Inspetor Aberto (Drawer Oficial) */}
                        {activeScene.screenContent.inspectorOpen && (
                          <div className="absolute right-2 top-2 bottom-2 w-52 rounded-xl bg-[#181d28] border border-[#FF6B00] p-3 shadow-2xl z-30 font-mono text-[9px] flex flex-col justify-between animate-in slide-in-from-right duration-200">
                            <div className="space-y-2">
                              <div className="font-bold text-[#FF6B00] flex items-center justify-between border-b border-white/10 pb-1.5">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">tune</span>
                                  <span>Inspetor FK</span>
                                </span>
                                <span className="text-white/40">✕</span>
                              </div>
                              <div className="space-y-1 text-white/80">
                                <div><strong className="text-white">Origem:</strong> pedidos (cliente_id)</div>
                                <div><strong className="text-white">Destino:</strong> clientes (id)</div>
                                <div><strong className="text-white">Cardinalidade:</strong> 1 : N (Muitos)</div>
                              </div>
                              <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[8px]">
                                Relação formalizada com integridade referencial.
                              </div>
                            </div>
                            <div className="space-y-1 pt-2 border-t border-white/10">
                              <button
                                type="button"
                                className="w-full py-1 rounded bg-[#29B6F6]/20 text-[#29B6F6] hover:bg-[#29B6F6]/30 border border-[#29B6F6]/40 font-bold flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[10px]">sync_alt</span>
                                <span>Tornar 1:1</span>
                              </button>
                              <button
                                type="button"
                                className="w-full py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40 font-bold flex items-center justify-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[10px]">delete</span>
                                <span>Excluir Relacionamento</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CENA 3: SPLIT-VIEW REATIVO (SQL ↔ DER AO VIVO) EM USO REAL */}
                  {activeVideo.id === 'split-view' && (
                    <div className="w-full h-full flex flex-col">
                      <div className="h-6 bg-[#161a24] border-b border-white/10 px-3 flex items-center justify-between text-[10px] select-none shrink-0 font-mono">
                        <span className="text-emerald-400 flex items-center gap-1 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>LiveSchema Parser Ativo (Sincronização Contínua)</span>
                        </span>
                        <span className="text-white/50 text-[9px]">50% Editor | 50% Canvas</span>
                      </div>

                      <div className="flex-1 grid grid-cols-2 divide-x divide-white/10 overflow-hidden">
                        {/* Metade Esquerda: Monaco Editor */}
                        <div className="bg-[#1e1e1e] flex flex-col p-2 font-mono text-[9px] overflow-hidden">
                          <div className="text-white/50 border-b border-white/10 pb-1 flex items-center gap-1 mb-1">
                            <span className="material-symbols-outlined text-[11px] text-amber-400">bolt</span>
                            <span>script_ao_vivo.sql</span>
                          </div>
                          <div className="space-y-0.5 text-white/90 overflow-hidden">
                            <div className="text-[#569cd6] font-bold">CREATE TABLE <span className="text-[#4ec9b0]">produtos</span> (</div>
                            <div className="pl-3 text-white/80">id <span className="text-[#569cd6]">INT PRIMARY KEY</span>,</div>
                            <div className="pl-3 text-white/80">nome <span className="text-[#569cd6]">VARCHAR(100)</span>,</div>
                            <div className="pl-3 text-white/80">preco <span className="text-[#569cd6]">DECIMAL(10,2)</span>,</div>
                            <div className="pl-3 text-white/80">categoria_id <span className="text-[#569cd6]">INT</span></div>
                            <div className="text-white/80">);</div>
                            <div className="pt-1 text-[#569cd6] font-bold">ALTER TABLE <span className="text-[#4ec9b0]">produtos</span> ADD FOREIGN KEY (categoria_id)</div>
                            <div className="pl-3 text-[#569cd6] font-bold">REFERENCES <span className="text-[#4ec9b0]">categorias</span>(id);</div>
                          </div>
                        </div>

                        {/* Metade Direita: Canvas DER em Tempo Real */}
                        <div
                          className="flex flex-col p-3 relative overflow-hidden items-center justify-center gap-3 select-none"
                          style={{
                            backgroundColor: '#0d1117',
                            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
                            backgroundSize: '12px 12px',
                          }}
                        >
                          {/* Mini Tabelas Desenhadas Automaticamente */}
                          <div className="w-36 rounded-lg bg-[#1e222d] border border-[#29B6F6] p-1.5 shadow-lg text-[8px] font-mono">
                            <div className="font-bold text-[#29B6F6] border-b border-white/10 pb-0.5">categorias</div>
                            <div className="text-amber-300">🔑 id INT [PK]</div>
                            <div className="text-white/70">titulo VARCHAR</div>
                          </div>

                          <div className="w-1.5 h-6 bg-[#29B6F6] rounded-full animate-pulse" />

                          <div className="w-36 rounded-lg bg-[#1e222d] border border-[#FF6B00] p-1.5 shadow-lg text-[8px] font-mono">
                            <div className="font-bold text-[#FF6B00] border-b border-white/10 pb-0.5">produtos</div>
                            <div className="text-amber-300">🔑 id INT [PK]</div>
                            <div className="text-white/70">nome VARCHAR</div>
                            <div className="text-[#FF6B00] font-bold">🔗 categoria_id [FK]</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CENA 4: MODELO LÓGICO & DICIONÁRIO 1FN–3FN EM USO REAL */}
                  {activeVideo.id === 'normalization' && (
                    <div className="w-full h-full flex flex-col p-3 overflow-hidden select-none font-mono">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-amber-400">menu_book</span>
                          <span className="text-xs font-bold text-white">Dicionário &amp; Formas Normais</span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Tabela: tab1
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-bold">Linter Pedagógico SENAI Ativo</span>
                      </div>

                      {/* Card do Linter de Normalização com Caso Real de 3FN */}
                      <div className="my-auto space-y-2 max-w-xl mx-auto w-full">
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-[10px] space-y-2">
                          <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                            <span className="material-symbols-outlined text-[15px]">warning</span>
                            <span>Violação de 3ª Forma Normal Detectada!</span>
                          </div>
                          <div className="text-white/90 leading-relaxed">
                            A coluna <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">nome_cargo</code> depende transitivamente de <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">id_cargo</code>, que não faz parte da Chave Primária (<code className="text-emerald-400">id</code>).
                          </div>
                          <div className="p-2 rounded bg-black/50 border border-white/10 text-[9px] text-white/70">
                            <strong>Fórmula de Normalização:</strong> id ➔ id_cargo ➔ nome_cargo (Dependência Transitiva X ➔ Y ➔ Z).
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[#181d28] border border-white/10 text-[10px]">
                          <span className="text-white/70">Deseja aplicar a correção pedagógica automática?</span>
                          <button
                            type="button"
                            className="px-3 py-1 rounded-md bg-[#00E676] text-neutral-950 font-bold text-[10px] flex items-center gap-1 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
                            <span>Decompor em tabela 'cargos'</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CENA 5: GALERIA DE MODELOS, CARREGAMENTO RÁPIDO & SUPER-BACKUP */}
                  {activeVideo.id === 'gallery-backup' && (
                    <div className="w-full h-full flex flex-col p-3 overflow-hidden select-none font-mono">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-[#FF6B00]">school</span>
                          <span className="text-xs font-bold text-white">Galeria de Modelos &amp; Prática Guiada</span>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                          Super-Backup .sqleditor.json
                        </span>
                      </div>

                      {/* Modal de Carregamento Progressivo (Simulação Real da Barra de Carregamento) */}
                      {activeScene.screenContent.progressBarPct ? (
                        <div className="my-auto max-w-md mx-auto w-full p-4 rounded-xl bg-[#181d28] border border-[#FF6B00]/50 shadow-2xl space-y-3">
                          <div className="flex items-center justify-between text-[11px] font-bold text-white">
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-[#FF6B00] animate-spin">
                                sync
                              </span>
                              <span>Instanciando escolaidiomas...</span>
                            </span>
                            <span className="text-[var(--accent-yellow)]">
                              {activeScene.screenContent.progressBarPct}%
                            </span>
                          </div>
                          {/* Barra de Progresso Real */}
                          <div className="w-full h-2.5 rounded-full bg-black/60 p-0.5 overflow-hidden border border-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFE600] transition-all duration-300 shadow-sm"
                              style={{ width: `${activeScene.screenContent.progressBarPct}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-white/60">
                            <span>6 de 8 tabelas criadas no AlaSQL</span>
                            <span className="text-emerald-400 font-bold">● Alta Performance</span>
                          </div>
                        </div>
                      ) : (
                        /* Grid de Cards de Bancos da Galeria */
                        <div className="my-auto grid grid-cols-3 gap-3">
                          <div className="p-2.5 rounded-xl bg-[#181d28] border border-[#FF6B00]/40 text-[9px] space-y-1.5">
                            <div className="font-bold text-white flex items-center justify-between">
                              <span>escolaidiomas</span>
                              <span className="text-[#FF6B00]">Aula 04</span>
                            </div>
                            <div className="text-white/60">Cursos, turmas, alunos e matrículas relacionais.</div>
                            <div className="flex gap-1 pt-1">
                              <span className="px-1.5 py-0.5 rounded bg-[#FF6B00] text-white font-bold">Abrir DER</span>
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">Laboratório</span>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#181d28] border border-white/10 text-[9px] space-y-1.5">
                            <div className="font-bold text-white flex items-center justify-between">
                              <span>pizzaria_db</span>
                              <span className="text-emerald-400">Aula 02</span>
                            </div>
                            <div className="text-white/60">Pedidos, sabores, clientes e entregadores.</div>
                            <div className="flex gap-1 pt-1">
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">Abrir DER</span>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#181d28] border border-white/10 text-[9px] space-y-1.5">
                            <div className="font-bold text-white flex items-center justify-between">
                              <span>ecommerce_senai</span>
                              <span className="text-blue-400">Gabarito</span>
                            </div>
                            <div className="text-white/60">Normalização 3FN completa com 12 tabelas.</div>
                            <div className="flex gap-1 pt-1">
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/80">Abrir DER</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Toast Inferior Informativo */}
                      {activeScene.screenContent.toastText && (
                        <div className="mt-auto px-3 py-1.5 rounded-lg bg-[#00E676]/20 border border-[#00E676]/40 text-[#00E676] text-[10px] flex items-center gap-1.5 animate-in fade-in">
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          <span>{activeScene.screenContent.toastText}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ponteiro Autêntico do Mouse do Sistema Operacional (Screen Recording Real) */}
                <div
                  className="absolute z-50 pointer-events-none transition-all duration-300 ease-out"
                  style={{
                    left: `${activeScene.cursorX ?? 50}%`,
                    top: `${activeScene.cursorY ?? 50}%`,
                  }}
                >
                  <div className="relative">
                    {/* Vetor SVG de Cursor Real do Mouse (Estilo Windows/macOS) */}
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      className={`drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-transform ${
                        activeScene.cursorClick ? 'scale-90 rotate-[-4deg]' : 'scale-100'
                      }`}
                      fill="none"
                    >
                      <path
                        d="M3 2L10 22L13 14L21 11L3 2Z"
                        fill="#111827"
                        stroke="#FFFFFF"
                        strokeWidth="1.75"
                        strokeLinejoin="round"
                      />
                    </svg>

                    {/* Onda Concêntrica de Clique Real (Click Ripple Effect) */}
                    {activeScene.cursorClick && (
                      <span className="absolute -top-2 -left-2 w-8 h-8 rounded-full border-2 border-[#FFE600] bg-[#FFE600]/20 animate-ping pointer-events-none" />
                    )}

                    {/* Etiqueta de Ação do Cursor */}
                    {activeScene.cursorClick && (
                      <span className="absolute left-4 top-2 text-[9px] font-mono font-bold bg-neutral-900/90 text-[#FFE600] px-1.5 py-0.5 rounded shadow border border-[#FFE600]/40 whitespace-nowrap">
                        {activeScene.actionTitle.includes('Ctrl+Enter')
                          ? 'Ctrl+Enter'
                          : activeScene.actionTitle.includes('Arrastando')
                          ? 'Conectando FK'
                          : 'Clique'}
                      </span>
                    )}
                  </div>
                </div>
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

