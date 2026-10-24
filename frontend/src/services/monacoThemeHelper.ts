import type { ThemeMode, FontTheme } from '../types';

export function getMonacoThemeName(theme: ThemeMode, fontTheme: FontTheme): string {
  return `sqleditor-${theme}-${fontTheme}`;
}

interface ThemePalette {
  base: 'vs' | 'vs-dark';
  background: string;
  foreground: string;
  lineHighlight: string;
  selection: string;
  cursor: string;
  keyword: string;
  predefined: string;
  type: string;
  string: string;
  number: string;
  comment: string;
  operator: string;
  delimiter: string;
}

const THEME_BACKGROUNDS: Record<ThemeMode, { base: 'vs' | 'vs-dark'; bg: string; fg: string; lineHighlight: string; selection: string }> = {
  dark: {
    base: 'vs-dark',
    bg: '#0F1117',
    fg: '#F0F4F8',
    lineHighlight: '#1A1D27',
    selection: '#26334D',
  },
  graphite: {
    base: 'vs-dark',
    bg: '#1E232B',
    fg: '#E2E8F0',
    lineHighlight: '#2A313C',
    selection: '#364253',
  },
  light: {
    base: 'vs',
    bg: '#F4F6F9',
    fg: '#111827',
    lineHighlight: '#E9ECEF',
    selection: '#CFD4DA',
  },
  beige: {
    base: 'vs',
    bg: '#F5EFEB',
    fg: '#2C2420',
    lineHighlight: '#EDE4DC',
    selection: '#D4C5B6',
  },
};

const FONT_THEME_TOKENS: Record<FontTheme, { dark: Partial<ThemePalette>; light: Partial<ThemePalette> }> = {
  solar: {
    dark: {
      cursor: '#FFE600',
      keyword: 'FFE600',
      predefined: 'FF6B00',
      type: 'FFA726',
      string: '00E676',
      number: '00E5FF',
      comment: '64748B',
      operator: 'FF8533',
      delimiter: '94A3B8',
    },
    light: {
      cursor: '#B45309',
      keyword: 'B45309',
      predefined: 'C2410C',
      type: '9A3412',
      string: '15803D',
      number: '0369A1',
      comment: '78716C',
      operator: 'EA580C',
      delimiter: '57534E',
    },
  },
  cyber: {
    dark: {
      cursor: '#00E5FF',
      keyword: '00E5FF',
      predefined: '00B0FF',
      type: '40C4FF',
      string: '69F0AE',
      number: 'FF4081',
      comment: '546E7A',
      operator: '80D8FF',
      delimiter: 'B0BEC5',
    },
    light: {
      cursor: '#0284C7',
      keyword: '0284C7',
      predefined: '0369A1',
      type: '0E7490',
      string: '0D9488',
      number: 'BE185D',
      comment: '64748B',
      operator: '0284C7',
      delimiter: '475569',
    },
  },
  matrix: {
    dark: {
      cursor: '#00FF66',
      keyword: '00FF66',
      predefined: '76FF03',
      type: '69F0AE',
      string: 'CCFF90',
      number: '00E676',
      comment: '3E6B48',
      operator: 'B2FF59',
      delimiter: '81C784',
    },
    light: {
      cursor: '#15803D',
      keyword: '15803D',
      predefined: '16A34A',
      type: '047857',
      string: '4D7C0F',
      number: '059669',
      comment: '57685D',
      operator: '15803D',
      delimiter: '374151',
    },
  },
  synthwave: {
    dark: {
      cursor: '#E040FB',
      keyword: 'E040FB',
      predefined: 'FF4081',
      type: 'EA80FC',
      string: 'FFD700',
      number: '00E5FF',
      comment: '7E6C88',
      operator: 'FF80AB',
      delimiter: 'CE93D8',
    },
    light: {
      cursor: '#7E22CE',
      keyword: '7E22CE',
      predefined: 'BE185D',
      type: '6D28D9',
      string: 'B45309',
      number: '0369A1',
      comment: '6B7280',
      operator: '9333EA',
      delimiter: '4B5563',
    },
  },
};

/**
 * Registra todos os temas combinados (Interface x Cores das Letras) no Monaco Editor.
 */
export function registerAllMonacoThemes(monaco: any) {
  if (!monaco || !monaco.editor || typeof monaco.editor.defineTheme !== 'function') {
    return;
  }

  const themeModes: ThemeMode[] = ['dark', 'light', 'beige', 'graphite'];
  const fontThemes: FontTheme[] = ['solar', 'cyber', 'matrix', 'synthwave'];

  for (const t of themeModes) {
    const bgInfo = THEME_BACKGROUNDS[t];
    const isDark = bgInfo.base === 'vs-dark';

    for (const f of fontThemes) {
      const tokenTokens = isDark ? FONT_THEME_TOKENS[f].dark : FONT_THEME_TOKENS[f].light;
      const themeId = getMonacoThemeName(t, f);

      monaco.editor.defineTheme(themeId, {
        base: bgInfo.base,
        inherit: true,
        rules: [
          { token: 'keyword', foreground: tokenTokens.keyword },
          { token: 'keyword.sql', foreground: tokenTokens.keyword },
          { token: 'keyword.mysql', foreground: tokenTokens.keyword },
          { token: 'predefined', foreground: tokenTokens.predefined },
          { token: 'predefined.sql', foreground: tokenTokens.predefined },
          { token: 'predefined.mysql', foreground: tokenTokens.predefined },
          { token: 'type', foreground: tokenTokens.type },
          { token: 'type.sql', foreground: tokenTokens.type },
          { token: 'type.mysql', foreground: tokenTokens.type },
          { token: 'string', foreground: tokenTokens.string },
          { token: 'string.sql', foreground: tokenTokens.string },
          { token: 'string.mysql', foreground: tokenTokens.string },
          { token: 'number', foreground: tokenTokens.number },
          { token: 'number.sql', foreground: tokenTokens.number },
          { token: 'number.mysql', foreground: tokenTokens.number },
          { token: 'comment', foreground: tokenTokens.comment },
          { token: 'comment.sql', foreground: tokenTokens.comment },
          { token: 'comment.mysql', foreground: tokenTokens.comment },
          { token: 'operator', foreground: tokenTokens.operator },
          { token: 'operator.sql', foreground: tokenTokens.operator },
          { token: 'operator.mysql', foreground: tokenTokens.operator },
          { token: 'delimiter', foreground: tokenTokens.delimiter },
          { token: 'delimiter.sql', foreground: tokenTokens.delimiter },
          { token: 'delimiter.mysql', foreground: tokenTokens.delimiter },
        ],
        colors: {
          'editor.background': bgInfo.bg,
          'editor.foreground': bgInfo.fg,
          'editor.lineHighlightBackground': bgInfo.lineHighlight,
          'editor.selectionBackground': bgInfo.selection,
          'editorCursor.foreground': tokenTokens.cursor || (isDark ? '#FFFFFF' : '#000000'),
          'editorLineNumber.foreground': isDark ? '#465062' : '#94A3B8',
          'editorLineNumber.activeForeground': tokenTokens.cursor || '#FF6B00',
        },
      });
    }
  }
}
