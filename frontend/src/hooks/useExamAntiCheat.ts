import { useEffect, useRef, type MutableRefObject } from 'react';
import type { ExamAlertType } from '../types';

interface UseExamAntiCheatOptions {
  enabled: boolean;
  onAlert: (type: ExamAlertType, details: string, severityMessage: string) => void;
  suppressExitAlertRef?: MutableRefObject<boolean>;
  onPageExitPersist?: (details: string) => void;
}

// Seletores comumente injetados por extensões de IA / copilot / tradutores na página
const KNOWN_AI_EXTENSION_SELECTORS = [
  '[id*="monica"]',
  '[class*="monica"]',
  '[id*="merlin"]',
  '[class*="merlin"]',
  '[id*="sider"]',
  '[class*="sider"]',
  '[id*="chatgpt"]',
  '[class*="chatgpt"]',
  '[id*="copilot"]',
  '[id*="perplexity"]',
  '[id*="claude"]',
  '[id*="gemini-sidebar"]',
  'grammarly-extension',
  'grammarly-desktop-integration',
  'div[data-ext-name]',
];

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

    // 1. Bloqueio de copiar / colar / recortar / arrastar texto
    const handleClipboardBlock = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const actionLabel =
        e.type === 'paste' ? 'colar conteúdo (Paste)' : e.type === 'copy' ? 'copiar conteúdo (Copy)' : 'recortar conteúdo (Cut)';
      triggerThrottledAlert(
        'copy_paste_attempt',
        `Tentativa de ${actionLabel} bloqueada durante a avaliação.`,
        `Ação de ${actionLabel} bloqueada! O uso de área de transferência não é permitido durante o Modo Avaliação.`
      );
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
      // Permite apenas menu interno do SQL Editor caso não seja área de colagem nativa do browser
      if (target && !target.closest('[data-allow-exam-context="true"]')) {
        e.preventDefault();
      }
    };

    const handleKeyDownBlock = (e: KeyboardEvent) => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (ctrlOrCmd && (key === 'c' || key === 'v' || key === 'x')) {
        e.preventDefault();
        e.stopPropagation();
        const op = key === 'v' ? 'Ctrl+V (Colar)' : key === 'c' ? 'Ctrl+C (Copiar)' : 'Ctrl+X (Recortar)';
        triggerThrottledAlert(
          'copy_paste_attempt',
          `Atalho ${op} bloqueado no teclado durante a avaliação.`,
          `O atalho ${op} é proibido durante a avaliação e esta tentativa foi registrada para o professor.`
        );
        return;
      }

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
      // Delay curto para diferenciar troca real de janela de cliques internos em diálogos/monaco
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

    // 3. Detecção e neutralização de extensões de IA / sidebars injetadas na página
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

    const scanSuspiciousElements = () => {
      for (const selector of KNOWN_AI_EXTENSION_SELECTORS) {
        try {
          const found = document.querySelectorAll(selector);
          found.forEach((el) => {
            if (!el.closest('#root') && el.getAttribute('data-exam-flagged') !== 'true') {
              el.setAttribute('data-exam-flagged', 'true');
              neutralizeAndReportExtension(
                el,
                `Elemento suspeito de extensão detectado na página (${selector}).`
              );
            }
          });
        } catch (_) {}
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const el = node as Element;
          // Ignora tudo dentro de #root ou portais explícitos da aplicação
          if (el.id === 'root' || el.closest('#root') || el.getAttribute('data-sql-app-portal') === 'true') {
            return;
          }
          const tag = el.tagName.toLowerCase();
          const hasShadow = Boolean((el as HTMLElement).shadowRoot);
          const isExtensionHint =
            tag.includes('-') ||
            hasShadow ||
            el.tagName.toLowerCase() === 'iframe' ||
            /monica|merlin|sider|chatgpt|copilot|grammarly|claude|gemini|extension/i.test(
              `${el.id} ${typeof el.className === 'string' ? el.className : ''}`
            );

          if (isExtensionHint && el.getAttribute('data-exam-flagged') !== 'true') {
            el.setAttribute('data-exam-flagged', 'true');
            neutralizeAndReportExtension(
              el,
              `Extensão/painel externo injetado na aba detectado (<${tag}> ${el.id || ''}).`.trim()
            );
          }
        });
      }
    });

    // Verificação inicial + observação contínua
    scanSuspiciousElements();
    observer.observe(document.documentElement, { childList: true, subtree: true });

    document.addEventListener('copy', handleClipboardBlock, true);
    document.addEventListener('paste', handleClipboardBlock, true);
    document.addEventListener('cut', handleClipboardBlock, true);
    document.addEventListener('dragstart', handleDragOrDropBlock, true);
    document.addEventListener('drop', handleDragOrDropBlock, true);
    document.addEventListener('contextmenu', handleContextMenuBlock, true);
    document.addEventListener('keydown', handleKeyDownBlock, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    const periodicExtensionCheck = window.setInterval(scanSuspiciousElements, 4000);

    return () => {
      isDisposed = true;
      clearBlurTimer();
      observer.disconnect();
      window.clearInterval(periodicExtensionCheck);
      document.removeEventListener('copy', handleClipboardBlock, true);
      document.removeEventListener('paste', handleClipboardBlock, true);
      document.removeEventListener('cut', handleClipboardBlock, true);
      document.removeEventListener('dragstart', handleDragOrDropBlock, true);
      document.removeEventListener('drop', handleDragOrDropBlock, true);
      document.removeEventListener('contextmenu', handleContextMenuBlock, true);
      document.removeEventListener('keydown', handleKeyDownBlock, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [enabled, suppressExitAlertRef]);
}
