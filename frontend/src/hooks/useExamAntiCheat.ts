import { useEffect, useRef, type MutableRefObject } from 'react';
import {
  recordInternalClipboard,
  isAllowedInternalPaste,
} from '../services/examClipboardGuard';
import type { ExamAlertType } from '../types';

interface UseExamAntiCheatOptions {
  enabled: boolean;
  onAlert: (type: ExamAlertType, details: string, severityMessage: string) => void;
  suppressExitAlertRef?: MutableRefObject<boolean>;
  onPageExitPersist?: (details: string) => void;
}


/**
 * Hook anti-trapaça para Modo Avaliação (bloqueia copiar/colar/arrastar,
 * detecta troca de aba/janela, tentativas de sair/fechar guia e overlays de extensões de IA).
 */
export function useExamAntiCheat({
  enabled,
  onAlert,
  suppressExitAlertRef,
  onPageExitPersist,
}: UseExamAntiCheatOptions) {
  const lastAlertTimeRef = useRef<Record<string, number>>({});
  const onAlertRef = useRef(onAlert);
  const onPageExitPersistRef = useRef(onPageExitPersist);

  useEffect(() => {
    onAlertRef.current = onAlert;
  }, [onAlert]);

  useEffect(() => {
    onPageExitPersistRef.current = onPageExitPersist;
  }, [onPageExitPersist]);

  useEffect(() => {
    if (!enabled) return;

    let isDisposed = false;
    let blurTimer: number | null = null;
    let hasLostFocus = false;

    const clearBlurTimer = () => {
      if (blurTimer !== null) {
        window.clearTimeout(blurTimer);
        blurTimer = null;
      }
    };

    const triggerThrottledAlert = (
      type: ExamAlertType,
      details: string,
      severityMessage: string,
      cooldownMs = 2500
    ) => {
      if (isDisposed) return;
      const now = Date.now();
      const prev = lastAlertTimeRef.current[type] || 0;
      if (now - prev < cooldownMs) return;
      lastAlertTimeRef.current[type] = now;
      onAlertRef.current(type, details, severityMessage);
    };

    // 1. Área de transferência: permite copiar/colar ENTRE abas internas do SQLEditor,
    // bloqueando qualquer colagem externa de fora da prova.
    const extractSelectedTextFromDom = (target: EventTarget | null): string => {
      const el = target as HTMLElement | null;
      if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
        const inputEl = el as HTMLTextAreaElement | HTMLInputElement;
        if (
          typeof inputEl.selectionStart === 'number' &&
          typeof inputEl.selectionEnd === 'number' &&
          inputEl.selectionEnd > inputEl.selectionStart
        ) {
          return inputEl.value.slice(inputEl.selectionStart, inputEl.selectionEnd);
        }
      }
      return window.getSelection()?.toString() || '';
    };

    const handleClipboardGuard = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInsideApp = Boolean(target && target.closest('#root'));

      if (e.type === 'copy' || e.type === 'cut') {
        if (isInsideApp) {
          const selectedText = extractSelectedTextFromDom(e.target);
          if (selectedText) {
            recordInternalClipboard(selectedText);
          }
          // Permite cópia/recorte entre abas da própria avaliação sem gerar alerta
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.type === 'paste') {
        const pastedText = e.clipboardData?.getData('text/plain') || '';
        if (isInsideApp && pastedText && isAllowedInternalPaste(pastedText)) {
          // Colagem originada de uma aba interna da avaliação: permitida
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        triggerThrottledAlert(
          'copy_paste_attempt',
          'Tentativa de colar conteúdo externo bloqueada durante a avaliação.',
          'Colar conteúdo externo de fora do SQLEditor está bloqueado durante o Modo Avaliação! Apenas copiar/colar entre as abas da prova é permitido.'
        );
      }
    };

    const handleDragOrDropBlock = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'drop') {
        triggerThrottledAlert(
          'copy_paste_attempt',
          'Tentativa de arrastar e soltar texto/arquivo bloqueada durante a avaliação.',
          'Arrastar e soltar conteúdo externo está bloqueado no Modo Avaliação.'
        );
      }
    };

    const handleContextMenuBlock = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // Permite apenas menu interno do SQL Editor
      if (target && !target.closest('[data-allow-exam-context="true"]')) {
        e.preventDefault();
      }
    };

    const handleKeyDownBlock = (e: KeyboardEvent) => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Bloqueia atalhos de DevTools (F12, Ctrl+Shift+I/J/C)
      if (
        e.key === 'F12' ||
        (ctrlOrCmd && e.shiftKey && (key === 'i' || key === 'j' || key === 'c'))
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerThrottledAlert(
          'devtools_or_resize',
          `Tentativa de abrir ferramentas de inspeção (${e.key}) detectada.`,
          'A abertura de ferramentas de desenvolvedor/inspeção está bloqueada durante a avaliação.'
        );
        return;
      }

      // Intercepta atalhos de recarregamento ou saída pela barra de endereços (F5, Ctrl+R, Ctrl+L, Alt+D)
      if (
        e.key === 'F5' ||
        (ctrlOrCmd && (key === 'r' || key === 'l')) ||
        (e.altKey && key === 'd')
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerThrottledAlert(
          'page_exit_attempt',
          `Atalho de saída/recarregamento ou navegação (${e.key.toUpperCase()}) bloqueado durante a avaliação.`,
          'Sair da página, recarregar ou digitar outro endereço não é permitido durante a avaliação. Ocorrência registrada.'
        );
      }
    };

    // 2. Detecção de troca de aba, perda de foco ou fechamento/saída da guia
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (suppressExitAlertRef?.current) return;
      const detail =
        'Tentativa de fechar a guia, recarregar ou digitar outro endereço para sair da página durante a avaliação.';
      onPageExitPersistRef.current?.(detail);
      triggerThrottledAlert(
        'page_exit_attempt',
        detail,
        'Tentativa de sair ou fechar a página durante a avaliação detectada e registrada para o professor.',
        1500
      );
      e.preventDefault();
      e.returnValue = '';
    };

    const handlePageHide = () => {
      if (suppressExitAlertRef?.current) return;
      const detail = 'Aluno saiu da página da avaliação ou fechou a guia do navegador.';
      onPageExitPersistRef.current?.(detail);
      triggerThrottledAlert(
        'page_exit_attempt',
        detail,
        'Saída da página de avaliação detectada e registrada para o professor.',
        1500
      );
    };
    const handleVisibilityChange = () => {
      if (isDisposed || suppressExitAlertRef?.current) return;
      if (document.hidden) {
        clearBlurTimer();
        hasLostFocus = true;
        triggerThrottledAlert(
          'tab_switch',
          'Aluno trocou de aba do navegador ou minimizou a janela durante a avaliação.',
          'Você saiu da aba da avaliação! Essa ocorrência foi notificada em tempo real ao professor.',
          1500
        );
      } else {
        hasLostFocus = false;
      }
    };

    const handleWindowFocus = () => {
      clearBlurTimer();
      hasLostFocus = false;
    };

    const handleWindowBlur = () => {
      if (isDisposed || suppressExitAlertRef?.current || hasLostFocus || document.hidden) {
        return;
      }
      clearBlurTimer();
      // Delay para diferenciar troca real de janela de cliques internos em diálogos, popups de abas ou Monaco Editor
      blurTimer = window.setTimeout(() => {
        blurTimer = null;
        if (
          isDisposed ||
          suppressExitAlertRef?.current ||
          document.hidden ||
          document.hasFocus()
        ) {
          return;
        }

        // Se o elemento ativo atual no DOM pertence à aplicação ou aos seus portais flutuantes
        const activeEl = document.activeElement;
        if (
          activeEl &&
          (activeEl.closest('#root') ||
            activeEl.closest('[data-sql-app-portal="true"]') ||
            activeEl.closest('[data-allow-exam-context="true"]'))
        ) {
          return;
        }
        // Evita duplicar alerta caso tab_switch ou page_exit_attempt já tenha disparado no mesmo gesto
        const now = Date.now();
        const recentExitOrTab = Math.max(
          lastAlertTimeRef.current.tab_switch || 0,
          lastAlertTimeRef.current.page_exit_attempt || 0
        );
        if (now - recentExitOrTab < 1500) return;

        hasLostFocus = true;
        triggerThrottledAlert(
          'window_blur',
          'A janela do navegador perdeu foco (abertura de outro aplicativo ou janela paralela).',
          'Mudança de janela ou aplicativo detectada! Mantenha o foco exclusivo na janela da avaliação.',
          2500
        );
      }, 1200);
    };

    // 3. Detecção e neutralização de extensões de IA / sidebars
    // Conforme diretriz: NÃO varre automaticamente/passivamente elementos silenciosos ou inativos pré-existentes.
    // Alerta apenas quando houver ação explícita verificável durante a prova (ex: abertura/injeção dinâmica de nós
    // de assistentes de IA com intenção de uso ou redução abrupta da área útil por painel lateral dockado).
    const neutralizeAndReportExtension = (el: Element, reason: string) => {
      try {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
        (el as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
        (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
      } catch (_) {}
      triggerThrottledAlert(
        'extension_detected',
        reason,
        'Uma extensão ou painel flutuante externo (ex.: assistente de IA) foi detectado nesta aba e bloqueado. O professor foi alertado.',
        5000
      );
    };

    // Detecta abertura súbita de Side Panel do navegador (extensão lateral de IA / DevTools dockado)
    let prevInnerWidth = window.innerWidth;
    let prevOuterWidth = window.outerWidth;
    const handleWindowResize = () => {
      if (isDisposed || suppressExitAlertRef?.current) return;
      const currInnerW = window.innerWidth;
      const currOuterW = window.outerWidth;
      const widthDrop = prevInnerWidth - currInnerW;
      const outerDelta = Math.abs(currOuterW - prevOuterWidth);
      const chromePanelGap = currOuterW - currInnerW;

      prevInnerWidth = currInnerW;
      prevOuterWidth = currOuterW;

      if (widthDrop >= 240 && outerDelta <= 40 && chromePanelGap >= 260) {
        triggerThrottledAlert(
          'extension_detected',
          `Redução brusca da área útil da aba (${widthDrop}px) compatível com abertura de Painel Lateral de IA ou inspeção dockada.`,
          'Painel lateral do navegador detectado durante a avaliação! Feche qualquer barra lateral/extensão e mantenha apenas a janela da prova.',
          5000
        );
      }
    };

    // Observa injeção DINÂMICA de novos elementos de extensões de IA abertas durante a avaliação
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as Element;
          // Ignora rigorosamente tudo dentro do root ou portais da aplicação
          if (
            el.id === 'root' ||
            el.closest('#root') ||
            el.getAttribute('data-sql-app-portal') === 'true' ||
            el.closest('[data-sql-app-portal="true"]')
          ) {
            return;
          }
          const tag = el.tagName.toLowerCase();
          if (tag === 'style' || tag === 'script' || tag === 'link') return;

          const isExplicitAiPattern = /monica|merlin|sider|chatgpt|copilot|perplexity|claude|gemini-sidebar|harpa|maxai|usechatgpt/i.test(
            `${el.id} ${typeof el.className === 'string' ? el.className : ''}`
          );

          if (isExplicitAiPattern && el.getAttribute('data-exam-flagged') !== 'true') {
            el.setAttribute('data-exam-flagged', 'true');
            neutralizeAndReportExtension(
              el,
              `Abertura de assistente de IA externo detectada na página (<${tag}> ${el.id || ''}).`.trim()
            );
          }
        });
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('copy', handleClipboardGuard, true);
    document.addEventListener('paste', handleClipboardGuard, true);
    document.addEventListener('cut', handleClipboardGuard, true);
    document.addEventListener('dragstart', handleDragOrDropBlock, true);
    document.addEventListener('drop', handleDragOrDropBlock, true);
    document.addEventListener('contextmenu', handleContextMenuBlock, true);
    document.addEventListener('keydown', handleKeyDownBlock, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      isDisposed = true;
      clearBlurTimer();
      observer.disconnect();
      document.removeEventListener('copy', handleClipboardGuard, true);
      document.removeEventListener('paste', handleClipboardGuard, true);
      document.removeEventListener('cut', handleClipboardGuard, true);
      document.removeEventListener('dragstart', handleDragOrDropBlock, true);
      document.removeEventListener('drop', handleDragOrDropBlock, true);
      document.removeEventListener('contextmenu', handleContextMenuBlock, true);
      document.removeEventListener('keydown', handleKeyDownBlock, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [enabled, suppressExitAlertRef]);
}
