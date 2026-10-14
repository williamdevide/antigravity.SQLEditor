import alasql from 'alasql';

/**
 * Formata um valor de data conforme a especificação de DATE_FORMAT do MySQL.
 * Suporta os principais especificadores de formatação MySQL.
 */
export function formatMySQLDate(dateVal: any, formatStr?: string): string {
  if (dateVal === null || dateVal === undefined || dateVal === '') {
    return '';
  }

  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) {
    // Se não for uma data válida, retorna o valor original como string
    return String(dateVal);
  }

  const format = formatStr || '%Y-%m-%d %H:%i:%s';

  const pad = (n: number, len = 2) => String(n).padStart(len, '0');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysOfWeekShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  const day = d.getDate();
  const hours24 = d.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  const isPM = hours24 >= 12;
  const dayOfWeek = d.getDay(); // 0-6 (0 = Sunday)

  // Dia do ano
  const startOfYear = new Date(year, 0, 1);
  const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  // Substituição de especificadores MySQL
  return format.replace(/%([A-Za-z%])/g, (_, specifier: string) => {
    switch (specifier) {
      case 'Y': return String(year); // Ano com 4 dígitos (ex: 2026)
      case 'y': return String(year).slice(-2); // Ano com 2 dígitos (ex: 26)
      case 'm': return pad(month); // Mês 01-12
      case 'c': return String(month); // Mês 1-12
      case 'd': return pad(day); // Dia do mês 01-31
      case 'e': return String(day); // Dia do mês 1-31
      case 'H': return pad(hours24); // Hora 00-23
      case 'k': return String(hours24); // Hora 0-23
      case 'h':
      case 'I': return pad(hours12); // Hora 01-12
      case 'l': return String(hours12); // Hora 1-12
      case 'i': return pad(minutes); // Minutos 00-59
      case 's':
      case 'S': return pad(seconds); // Segundos 00-59
      case 'p': return isPM ? 'PM' : 'AM'; // AM ou PM
      case 'r': return `${pad(hours12)}:${pad(minutes)}:${pad(seconds)} ${isPM ? 'PM' : 'AM'}`; // 12h
      case 'T': return `${pad(hours24)}:${pad(minutes)}:${pad(seconds)}`; // 24h
      case 'W': return daysOfWeek[dayOfWeek]; // Nome do dia da semana
      case 'a': return daysOfWeekShort[dayOfWeek]; // Nome abreviado do dia
      case 'w': return String(dayOfWeek); // Dia da semana (0=Domingo..6=Sábado)
      case 'M': return months[month - 1]; // Nome do mês
      case 'b': return monthsShort[month - 1]; // Mês abreviado
      case 'j': return pad(dayOfYear, 3); // Dia do ano (001-366)
      case '%': return '%'; // Literal %
      default: return `%${specifier}`;
    }
  });
}

/**
 * Lista de funções SQL nativas e personalizadas registradas
 */
export const KNOWN_SQL_FUNCTIONS = new Set<string>([
  // AlaSQL Nativas
  'count', 'sum', 'avg', 'min', 'max', 'first', 'last',
  'upper', 'lower', 'ucase', 'lcase', 'length', 'len', 'mid', 'substring',
  'round', 'floor', 'ceil', 'abs', 'coalesce', 'nullif', 'concat',
  // MySQL Registradas
  'date_format', 'now', 'curdate', 'current_date', 'curtime', 'current_time',
  'datediff', 'year', 'month', 'day', 'hour', 'minute', 'second',
  'ifnull', 'concat_ws', 'str_to_date'
]);

/**
 * Registra extensões de funções MySQL no motor AlaSQL
 */
export function registerMySQLFunctions(engine: typeof alasql = alasql): void {
  const engineFn = (engine as any).fn || {};

  // 1. DATE_FORMAT
  const dateFn = (dateVal: any, formatStr?: any) => formatMySQLDate(dateVal, formatStr);
  engineFn.DATE_FORMAT = dateFn;
  engineFn.date_format = dateFn;
  engineFn.DateFormat = dateFn;

  // 2. NOW / CURRENT_TIMESTAMP
  const nowFn = () => {
    const d = new Date();
    return formatMySQLDate(d, '%Y-%m-%d %H:%i:%s');
  };
  engineFn.NOW = nowFn;
  engineFn.now = nowFn;

  // 3. CURDATE / CURRENT_DATE
  const curdateFn = () => {
    const d = new Date();
    return formatMySQLDate(d, '%Y-%m-%d');
  };
  engineFn.CURDATE = curdateFn;
  engineFn.curdate = curdateFn;
  engineFn.CURRENT_DATE = curdateFn;
  engineFn.current_date = curdateFn;

  // 4. CURTIME / CURRENT_TIME
  const curtimeFn = () => {
    const d = new Date();
    return formatMySQLDate(d, '%H:%i:%s');
  };
  engineFn.CURTIME = curtimeFn;
  engineFn.curtime = curtimeFn;
  engineFn.CURRENT_TIME = curtimeFn;
  engineFn.current_time = curtimeFn;

  // 5. DATEDIFF (d1, d2) -> retorna diferença em dias (d1 - d2)
  const datediffFn = (d1: any, d2: any) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return null;
    const diffTime = date1.getTime() - date2.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };
  engineFn.DATEDIFF = datediffFn;
  engineFn.datediff = datediffFn;

  // 6. Funções de Componentes de Data
  const getPart = (d: any, part: 'year' | 'month' | 'day' | 'hour' | 'min' | 'sec') => {
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    if (part === 'year') return date.getFullYear();
    if (part === 'month') return date.getMonth() + 1;
    if (part === 'day') return date.getDate();
    if (part === 'hour') return date.getHours();
    if (part === 'min') return date.getMinutes();
    if (part === 'sec') return date.getSeconds();
    return null;
  };
  engineFn.YEAR = (d: any) => getPart(d, 'year');
  engineFn.year = (d: any) => getPart(d, 'year');
  engineFn.MONTH = (d: any) => getPart(d, 'month');
  engineFn.month = (d: any) => getPart(d, 'month');
  engineFn.DAY = (d: any) => getPart(d, 'day');
  engineFn.day = (d: any) => getPart(d, 'day');
  engineFn.HOUR = (d: any) => getPart(d, 'hour');
  engineFn.hour = (d: any) => getPart(d, 'hour');
  engineFn.MINUTE = (d: any) => getPart(d, 'min');
  engineFn.minute = (d: any) => getPart(d, 'min');
  engineFn.SECOND = (d: any) => getPart(d, 'sec');
  engineFn.second = (d: any) => getPart(d, 'sec');

  // 7. IFNULL
  const ifnullFn = (val: any, defaultVal: any) => (val === null || val === undefined ? defaultVal : val);
  engineFn.IFNULL = ifnullFn;
  engineFn.ifnull = ifnullFn;

  // 8. CONCAT_WS (separador, ...valores)
  const concatWsFn = (separator: any, ...args: any[]) => {
    return args
      .filter(a => a !== null && a !== undefined)
      .map(String)
      .join(separator || '');
  };
  engineFn.CONCAT_WS = concatWsFn;
  engineFn.concat_ws = concatWsFn;

  // 9. Funções de Data e Hora Compatíveis (SQLite/MySQL): strftime, julianday, datetime, date, time
  function parseDateParam(val: any): Date {
    if (val === undefined || val === null || val === 'now' || val === 'CURRENT_TIMESTAMP') {
      return new Date();
    }
    if (val instanceof Date) return val;
    if (typeof val === 'number') return new Date(val);
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.toLowerCase() === 'now') return new Date();
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  function applyDateModifiers(date: Date, modifiers: any[]): Date {
    const result = new Date(date.getTime());
    for (const mod of modifiers) {
      if (typeof mod !== 'string') continue;
      const m = mod.trim().toLowerCase();
      const match = m.match(/^([+-]?\d+)\s+(day|days|month|months|year|years|hour|hours|minute|minutes|second|seconds)$/);
      if (match) {
        const amount = parseInt(match[1], 10);
        const unit = match[2];
        if (unit.startsWith('day')) result.setDate(result.getDate() + amount);
        else if (unit.startsWith('month')) result.setMonth(result.getMonth() + amount);
        else if (unit.startsWith('year')) result.setFullYear(result.getFullYear() + amount);
        else if (unit.startsWith('hour')) result.setHours(result.getHours() + amount);
        else if (unit.startsWith('minute')) result.setMinutes(result.getMinutes() + amount);
        else if (unit.startsWith('second')) result.setSeconds(result.getSeconds() + amount);
      } else if (m === 'start of month') {
        result.setDate(1);
        result.setHours(0, 0, 0, 0);
      } else if (m === 'start of year') {
        result.setMonth(0, 1);
        result.setHours(0, 0, 0, 0);
      } else if (m === 'start of day') {
        result.setHours(0, 0, 0, 0);
      }
    }
    return result;
  }

  const strftimeCustom = (format: string, dateVal?: any, ...modifiers: any[]): string => {
    if (!format) return '';
    let d = parseDateParam(dateVal);
    if (modifiers.length > 0) {
      d = applyDateModifiers(d, modifiers);
    }
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');

    return format.replace(/%[a-zA-Z%]/g, (match) => {
      switch (match) {
        case '%Y': return String(d.getFullYear());
        case '%m': return pad(d.getMonth() + 1);
        case '%d': return pad(d.getDate());
        case '%H': return pad(d.getHours());
        case '%M': return pad(d.getMinutes());
        case '%S': return pad(d.getSeconds());
        case '%w': return String(d.getDay());
        case '%W': {
          const firstDay = new Date(d.getFullYear(), 0, 1);
          const pastDays = (d.getTime() - firstDay.getTime()) / 86400000;
          return pad(Math.ceil((pastDays + firstDay.getDay() + 1) / 7));
        }
        case '%j': {
          const firstDay = new Date(d.getFullYear(), 0, 1);
          return pad(Math.floor((d.getTime() - firstDay.getTime()) / 86400000) + 1, 3);
        }
        case '%J': return String((d.getTime() / 86400000) + 2440587.5);
        case '%s': return String(Math.floor(d.getTime() / 1000));
        case '%%': return '%';
        default: return match;
      }
    });
  };

  const juliandayCustom = (dateVal?: any, ...modifiers: any[]): number => {
    let d = parseDateParam(dateVal);
    if (modifiers.length > 0) {
      d = applyDateModifiers(d, modifiers);
    }
    return (d.getTime() / 86400000) + 2440587.5;
  };

  function datetimeCustom(this: any, dateVal?: any, ...modifiers: any[]): any {
    if (new.target) return new Date(dateVal);
    return strftimeCustom('%Y-%m-%d %H:%M:%S', dateVal, ...modifiers);
  }

  function dateCustom(this: any, dateVal?: any, ...modifiers: any[]): any {
    if (new.target) return new Date(dateVal);
    return strftimeCustom('%Y-%m-%d', dateVal, ...modifiers);
  }

  function timeCustom(this: any, dateVal?: any, ...modifiers: any[]): any {
    if (new.target) return new Date(dateVal);
    return strftimeCustom('%H:%M:%S', dateVal, ...modifiers);
  }

  // Importante: No AlaSQL, se engineFn['DATE'] ou engineFn['DATETIME'] existir, o compilador de INSERT
  // trata a coluna como uma classe personalizada e tenta instanciá-la com `new DATE(val)`,
  // o que corrompia as inserções de tabelas com colunas DATE/DATETIME (ex: tb_funcionarios_rh).
  // Para que funções como DATE(), DATETIME() e TIME() funcionem perfeitamente em consultas SQL
  // sem interferir nas inserções de tabelas, nós as registramos no alasql.stdfn (biblioteca padrão)
  // e em engineFn em minúsculas (date, datetime, time).
  const engineStdfn = (engine as any).stdfn || {};
  engineStdfn.DATE = dateCustom;
  engineStdfn.date = dateCustom;
  engineStdfn.DATETIME = datetimeCustom;
  engineStdfn.datetime = datetimeCustom;
  engineStdfn.TIME = timeCustom;
  engineStdfn.time = timeCustom;
  engineStdfn.STRFTIME = strftimeCustom;
  engineStdfn.strftime = strftimeCustom;
  engineStdfn.JULIANDAY = juliandayCustom;
  engineStdfn.julianday = juliandayCustom;

  // Garante que não haja DATE, DATETIME ou TIME maiúsculos em engineFn para evitar conflito com tipos de coluna no INSERT
  delete engineFn.DATE;
  delete engineFn.DATETIME;
  delete engineFn.TIME;

  engineFn.STRFTIME = strftimeCustom;
  engineFn.strftime = strftimeCustom;
  engineFn.JULIANDAY = juliandayCustom;
  engineFn.julianday = juliandayCustom;
  engineFn.date = dateCustom;
  engineFn.datetime = datetimeCustom;
  engineFn.time = timeCustom;

  // Expõe no escopo global para que o avaliador compilado do AlaSQL encontre as funções utilitárias se necessário
  const globalScope: any = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : null);
  if (globalScope) {
    globalScope.STRFTIME = strftimeCustom;
    globalScope.strftime = strftimeCustom;
    globalScope.JULIANDAY = juliandayCustom;
    globalScope.julianday = juliandayCustom;
    globalScope.datetime = datetimeCustom;
    globalScope.date = dateCustom;
    globalScope.time = timeCustom;
  }
}
