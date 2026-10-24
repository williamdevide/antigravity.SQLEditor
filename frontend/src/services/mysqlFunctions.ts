import alasql from 'alasql';

/**
 * Converte de forma segura strings de data/hora (inclusive formato YYYY-MM-DD sem hora)
 * em instâncias Date no fuso horário local sem deslocamentos indesejados de UTC.
 */
export function parseSqlDate(val: any): Date {
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return new Date(NaN);
    if (trimmed.toLowerCase() === 'now' || trimmed === 'CURRENT_TIMESTAMP') return new Date();
    const m = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (m) {
      const year = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      const hour = m[4] ? parseInt(m[4], 10) : 0;
      const minute = m[5] ? parseInt(m[5], 10) : 0;
      const second = m[6] ? parseInt(m[6], 10) : 0;
      return new Date(year, month, day, hour, minute, second);
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(val);
}

/**
 * Formata um valor de data conforme a especificação de DATE_FORMAT do MySQL.
 * Suporta os principais especificadores de formatação MySQL.
 */
export function formatMySQLDate(dateVal: any, formatStr?: string): string {
  if (dateVal === null || dateVal === undefined || dateVal === '') {
    return '';
  }

  const d = parseSqlDate(dateVal);
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
  'upper', 'lower', 'ucase', 'lcase', 'length', 'len', 'char_length', 'character_length', 'mid', 'substring', 'substr',
  'round', 'floor', 'ceil', 'ceiling', 'abs', 'coalesce', 'nullif', 'concat', 'concat_ws',
  // MySQL Registradas
  'date_format', 'now', 'curdate', 'current_date', 'curtime', 'current_time',
  'datediff', 'timediff', 'timestampdiff', 'year', 'month', 'day', 'hour', 'minute', 'second',
  'ifnull', 'str_to_date', 'trim', 'ltrim', 'rtrim', 'reverse', 'lpad', 'rpad',
  'mod', 'dayname', 'monthname', 'dayofweek', 'weekday', 'dayofyear', 'week', 'quarter',
  'left', 'right', 'replace'
]);

/**
 * Calcula a diferença entre duas datas segundo a unidade especificada,
 * idêntico ao TIMESTAMPDIFF(unit, datetime_expr1, datetime_expr2) do MySQL.
 * Retorna (datetime_expr2 - datetime_expr1) convertido na unidade especificada.
 */
export function calculateTimestampDiff(unit: any, d1Val: any, d2Val: any): number | null {
  const d1 = parseSqlDate(d1Val);
  const d2 = parseSqlDate(d2Val);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;

  const u = String(unit).toLowerCase().trim().replace(/['"`]/g, '');
  const diffMs = d2.getTime() - d1.getTime();

  if (u === 'year' || u === 'sql_tsi_year') {
    let years = d2.getFullYear() - d1.getFullYear();
    const mDiff = d2.getMonth() - d1.getMonth();
    if (mDiff < 0 || (mDiff === 0 && d2.getDate() < d1.getDate())) {
      years--;
    }
    return years;
  }
  if (u === 'quarter' || u === 'sql_tsi_quarter') {
    const months = calculateTimestampDiff('month', d1, d2);
    return months !== null ? Math.floor(months / 3) : null;
  }
  if (u === 'month' || u === 'sql_tsi_month') {
    let months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    if (d2.getDate() < d1.getDate()) {
      months--;
    }
    return months;
  }
  if (u === 'week' || u === 'sql_tsi_week') {
    return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
  }
  if (u === 'day' || u === 'sql_tsi_day') {
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }
  if (u === 'hour' || u === 'sql_tsi_hour') {
    return Math.floor(diffMs / (1000 * 60 * 60));
  }
  if (u === 'minute' || u === 'sql_tsi_minute') {
    return Math.floor(diffMs / (1000 * 60));
  }
  if (u === 'second' || u === 'sql_tsi_second') {
    return Math.floor(diffMs / 1000);
  }
  if (u === 'microsecond' || u === 'sql_tsi_microsecond') {
    return Math.floor(diffMs * 1000);
  }
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Pré-processa uma instrução SQL para traduzir funções MySQL incompatíveis com o parser rígido do AlaSQL
 * Ex: DATEDIFF(d1, d2) -> MYSQL_DATEDIFF(d1, d2)
 *     LEFT(col, n) -> MYSQL_LEFT(col, n)
 *     RIGHT(col, n) -> MYSQL_RIGHT(col, n)
 */
export function preprocessSqlQuery(sql: string): string {
  if (!sql) return sql;

  // 1. Substitui DATEDIFF(...) por MYSQL_DATEDIFF(...)
  let res = sql.replace(/\bDATEDIFF\s*\(/gi, 'MYSQL_DATEDIFF(');

  // 2. Substitui chamadas de função LEFT( por MYSQL_LEFT( e RIGHT( por MYSQL_RIGHT(
  // Somente quando seguidas por parênteses (chamada de função, e não cláusulas JOIN)
  res = res.replace(/\bLEFT\s*\(/gi, 'MYSQL_LEFT(');
  res = res.replace(/\bRIGHT\s*\(/gi, 'MYSQL_RIGHT(');

  return res;
}

/**
 * Registra extensões de funções MySQL no motor AlaSQL
 */
export function registerMySQLFunctions(engine: typeof alasql = alasql): void {
  const engineFn = (engine as any).fn || {};
  const engineStdfn = (engine as any).stdfn || {};

  // 1. DATE_FORMAT
  const dateFn = (dateVal: any, formatStr?: any) => formatMySQLDate(dateVal, formatStr);
  engineFn.DATE_FORMAT = dateFn;
  engineFn.date_format = dateFn;
  engineFn.DateFormat = dateFn;
  engineStdfn.DATE_FORMAT = dateFn;
  engineStdfn.date_format = dateFn;

  // 2. NOW / CURRENT_TIMESTAMP
  const nowFn = () => {
    const d = new Date();
    return formatMySQLDate(d, '%Y-%m-%d %H:%i:%s');
  };
  engineFn.NOW = nowFn;
  engineFn.now = nowFn;
  engineStdfn.NOW = nowFn;
  engineStdfn.now = nowFn;

  // 3. CURDATE / CURRENT_DATE
  const curdateFn = () => {
    const d = new Date();
    return formatMySQLDate(d, '%Y-%m-%d');
  };
  engineFn.CURDATE = curdateFn;
  engineFn.curdate = curdateFn;
  engineFn.CURRENT_DATE = curdateFn;
  engineFn.current_date = curdateFn;
  engineStdfn.CURDATE = curdateFn;
  engineStdfn.curdate = curdateFn;
  engineStdfn.CURRENT_DATE = curdateFn;
  engineStdfn.current_date = curdateFn;

  // 4. CURTIME / CURRENT_TIME
  const curtimeFn = () => {
    const d = new Date();
    return formatMySQLDate(d, '%H:%i:%s');
  };
  engineFn.CURTIME = curtimeFn;
  engineFn.curtime = curtimeFn;
  engineFn.CURRENT_TIME = curtimeFn;
  engineFn.current_time = curtimeFn;
  engineStdfn.CURTIME = curtimeFn;
  engineStdfn.curtime = curtimeFn;

  // 5. DATEDIFF / MYSQL_DATEDIFF & TIMESTAMPDIFF
  // Suporta tanto 2 parâmetros (MySQL: d1 - d2 em dias) quanto 3 parâmetros (unit, d1, d2)
  const datediffFn = (arg1: any, arg2: any, arg3?: any) => {
    if (arg3 !== undefined) {
      // 3 argumentos: (unit, d1, d2)
      return calculateTimestampDiff(arg1, arg2, arg3);
    }
    // 2 argumentos MySQL padrão: DATEDIFF(d1, d2) -> d1 - d2
    if (arg1 === null || arg1 === undefined || arg2 === null || arg2 === undefined) return null;
    const date1 = parseSqlDate(arg1);
    const date2 = parseSqlDate(arg2);
    if (isNaN(date1.getTime()) || isNaN(date2.getTime())) return null;
    const diffTime = date1.getTime() - date2.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };
  engineFn.DATEDIFF = datediffFn;
  engineFn.datediff = datediffFn;
  engineFn.MYSQL_DATEDIFF = datediffFn;
  engineFn.mysql_datediff = datediffFn;
  engineStdfn.DATEDIFF = datediffFn;
  engineStdfn.datediff = datediffFn;

  // 5.1 TIMESTAMPDIFF
  engineFn.TIMESTAMPDIFF = calculateTimestampDiff;
  engineFn.timestampdiff = calculateTimestampDiff;
  engineStdfn.TIMESTAMPDIFF = calculateTimestampDiff;
  engineStdfn.timestampdiff = calculateTimestampDiff;

  // 6. LENGTH / CHAR_LENGTH / LEN
  const lengthFn = (val: any) => {
    if (val === null || val === undefined) return null;
    return String(val).length;
  };
  engineFn.LENGTH = lengthFn;
  engineFn.length = lengthFn;
  engineFn.LEN = lengthFn;
  engineFn.len = lengthFn;
  engineFn.CHAR_LENGTH = lengthFn;
  engineFn.char_length = lengthFn;
  engineFn.CHARACTER_LENGTH = lengthFn;
  engineFn.character_length = lengthFn;
  engineStdfn.LENGTH = lengthFn;
  engineStdfn.length = lengthFn;
  engineStdfn.LEN = lengthFn;
  engineStdfn.len = lengthFn;
  engineStdfn.CHAR_LENGTH = lengthFn;
  engineStdfn.char_length = lengthFn;
  engineStdfn.CHARACTER_LENGTH = lengthFn;
  engineStdfn.character_length = lengthFn;

  // 7. CONCAT & CONCAT_WS
  const concatFn = (...args: any[]) => {
    if (args.length === 0) return '';
    return args.map(a => (a === null || a === undefined ? '' : String(a))).join('');
  };
  engineFn.CONCAT = concatFn;
  engineFn.concat = concatFn;
  engineStdfn.CONCAT = concatFn;
  engineStdfn.concat = concatFn;

  const concatWsFn = (separator: any, ...args: any[]) => {
    return args
      .filter(a => a !== null && a !== undefined)
      .map(String)
      .join(separator ?? '');
  };
  engineFn.CONCAT_WS = concatWsFn;
  engineFn.concat_ws = concatWsFn;
  engineStdfn.CONCAT_WS = concatWsFn;
  engineStdfn.concat_ws = concatWsFn;

  // 7.1 UPPER & LOWER / UCASE & LCASE
  const upperFn = (val: any) => (val === null || val === undefined ? null : String(val).toUpperCase());
  const lowerFn = (val: any) => (val === null || val === undefined ? null : String(val).toLowerCase());
  engineFn.UPPER = upperFn;
  engineFn.upper = upperFn;
  engineFn.UCASE = upperFn;
  engineFn.ucase = upperFn;
  engineStdfn.UPPER = upperFn;
  engineStdfn.upper = upperFn;
  engineStdfn.UCASE = upperFn;
  engineStdfn.ucase = upperFn;

  engineFn.LOWER = lowerFn;
  engineFn.lower = lowerFn;
  engineFn.LCASE = lowerFn;
  engineFn.lcase = lowerFn;
  engineStdfn.LOWER = lowerFn;
  engineStdfn.lower = lowerFn;
  engineStdfn.LCASE = lowerFn;
  engineStdfn.lcase = lowerFn;

  // 7.2 SUBSTRING / SUBSTR / MID (com indexação 1-based MySQL)
  const substringFn = (str: any, pos: any, len?: any) => {
    if (str === null || str === undefined) return null;
    const s = String(str);
    const p = Number(pos) || 1;
    const start = p > 0 ? p - 1 : (p < 0 ? s.length + p : 0);
    if (len !== undefined) {
      const l = Number(len) || 0;
      return s.substr(start, Math.max(0, l));
    }
    return s.substr(start);
  };
  engineFn.SUBSTRING = substringFn;
  engineFn.substring = substringFn;
  engineFn.SUBSTR = substringFn;
  engineFn.substr = substringFn;
  engineFn.MID = substringFn;
  engineFn.mid = substringFn;
  engineStdfn.SUBSTRING = substringFn;
  engineStdfn.substring = substringFn;
  engineStdfn.SUBSTR = substringFn;
  engineStdfn.substr = substringFn;
  engineStdfn.MID = substringFn;
  engineStdfn.mid = substringFn;

  // 8. LEFT & RIGHT
  const leftFn = (str: any, len: any) => {
    if (str === null || str === undefined) return null;
    const l = Number(len) || 0;
    return String(str).slice(0, Math.max(0, l));
  };
  const rightFn = (str: any, len: any) => {
    if (str === null || str === undefined) return null;
    const l = Number(len) || 0;
    if (l <= 0) return '';
    return String(str).slice(-l);
  };
  engineFn.MYSQL_LEFT = leftFn;
  engineFn.mysql_left = leftFn;
  engineFn.MYSQL_RIGHT = rightFn;
  engineFn.mysql_right = rightFn;

  // 9. STRING UTILITIES: REVERSE, LPAD, RPAD, TRIM
  engineFn.REVERSE = (str: any) => (str === null || str === undefined ? null : String(str).split('').reverse().join(''));
  engineFn.reverse = engineFn.REVERSE;
  engineFn.LPAD = (str: any, len: any, pad = ' ') => {
    if (str === null || str === undefined) return null;
    return String(str).padStart(Number(len) || 0, String(pad));
  };
  engineFn.lpad = engineFn.LPAD;
  engineFn.RPAD = (str: any, len: any, pad = ' ') => {
    if (str === null || str === undefined) return null;
    return String(str).padEnd(Number(len) || 0, String(pad));
  };
  engineFn.rpad = engineFn.RPAD;

  // 10. MATH UTILITIES: MOD, ROUND, FLOOR, CEIL, ABS
  engineFn.MOD = (n: any, m: any) => {
    const num = Number(n);
    const mod = Number(m);
    if (isNaN(num) || isNaN(mod) || mod === 0) return null;
    return num % mod;
  };
  engineFn.mod = engineFn.MOD;

  const roundFn = (val: any, decimals: any = 0) => {
    const num = Number(val);
    if (isNaN(num)) return null;
    const factor = Math.pow(10, Number(decimals) || 0);
    return Math.round(num * factor) / factor;
  };
  engineFn.ROUND = roundFn;
  engineFn.round = roundFn;
  engineStdfn.ROUND = roundFn;
  engineStdfn.round = roundFn;

  const floorFn = (val: any) => (isNaN(Number(val)) ? null : Math.floor(Number(val)));
  engineFn.FLOOR = floorFn;
  engineFn.floor = floorFn;
  engineStdfn.FLOOR = floorFn;
  engineStdfn.floor = floorFn;

  const ceilFn = (val: any) => (isNaN(Number(val)) ? null : Math.ceil(Number(val)));
  engineFn.CEIL = ceilFn;
  engineFn.ceil = ceilFn;
  engineFn.CEILING = ceilFn;
  engineFn.ceiling = ceilFn;
  engineStdfn.CEIL = ceilFn;
  engineStdfn.ceil = ceilFn;
  engineStdfn.CEILING = ceilFn;
  engineStdfn.ceiling = ceilFn;

  engineFn.ABS = (val: any) => (isNaN(Number(val)) ? null : Math.abs(Number(val)));
  engineFn.abs = engineFn.ABS;
  engineStdfn.ABS = engineFn.ABS;
  engineStdfn.abs = engineFn.ABS;

  // 11. DAYNAME, MONTHNAME, DAYOFWEEK, WEEKDAY
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  engineFn.DAYNAME = (dVal: any) => {
    const d = new Date(dVal);
    if (isNaN(d.getTime())) return null;
    return dayNames[d.getDay()];
  };
  engineFn.dayname = engineFn.DAYNAME;
  engineFn.MONTHNAME = (dVal: any) => {
    const d = new Date(dVal);
    if (isNaN(d.getTime())) return null;
    return monthNames[d.getMonth()];
  };
  engineFn.monthname = engineFn.MONTHNAME;
  engineFn.DAYOFWEEK = (dVal: any) => {
    const d = new Date(dVal);
    if (isNaN(d.getTime())) return null;
    return d.getDay() + 1; // 1 = Sunday ... 7 = Saturday
  };
  engineFn.dayofweek = engineFn.DAYOFWEEK;
  engineFn.WEEKDAY = (dVal: any) => {
    const d = new Date(dVal);
    if (isNaN(d.getTime())) return null;
    return (d.getDay() + 6) % 7; // 0 = Monday ... 6 = Sunday
  };
  engineFn.weekday = engineFn.WEEKDAY;

  // 12. TIMEDIFF
  const timediffFn = (t1: any, t2: any) => {
    const parseSec = (t: any) => {
      if (typeof t === 'string' && t.includes(':')) {
        const parts = t.split(':').map(Number);
        return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
      }
      const d = new Date(t);
      if (!isNaN(d.getTime())) return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
      return 0;
    };
    const diffSec = parseSec(t1) - parseSec(t2);
    const sign = diffSec < 0 ? '-' : '';
    const absSec = Math.abs(diffSec);
    const h = String(Math.floor(absSec / 3600)).padStart(2, '0');
    const m = String(Math.floor((absSec % 3600) / 60)).padStart(2, '0');
    const s = String(absSec % 60).padStart(2, '0');
    return `${sign}${h}:${m}:${s}`;
  };
  engineFn.TIMEDIFF = timediffFn;
  engineFn.timediff = timediffFn;

  // 13. Funções de Componentes de Data
  const getPart = (d: any, part: 'year' | 'month' | 'day' | 'hour' | 'min' | 'sec') => {
    const date = parseSqlDate(d);
    if (isNaN(date.getTime())) return null;
    if (part === 'year') return date.getFullYear();
    if (part === 'month') return date.getMonth() + 1;
    if (part === 'day') return date.getDate();
    if (part === 'hour') return date.getHours();
    if (part === 'min') return date.getMinutes();
    if (part === 'sec') return date.getSeconds();
    return null;
  };
  const yearPartFn = (d: any) => getPart(d, 'year');
  engineFn.YEAR = yearPartFn;
  engineFn.year = yearPartFn;
  engineStdfn.YEAR = yearPartFn;
  engineStdfn.year = yearPartFn;

  const monthPartFn = (d: any) => getPart(d, 'month');
  engineFn.MONTH = monthPartFn;
  engineFn.month = monthPartFn;
  engineStdfn.MONTH = monthPartFn;
  engineStdfn.month = monthPartFn;

  const dayPartFn = (d: any) => getPart(d, 'day');
  engineFn.DAY = dayPartFn;
  engineFn.day = dayPartFn;
  engineStdfn.DAY = dayPartFn;
  engineStdfn.day = dayPartFn;

  const hourPartFn = (d: any) => getPart(d, 'hour');
  engineFn.HOUR = hourPartFn;
  engineFn.hour = hourPartFn;
  engineStdfn.HOUR = hourPartFn;
  engineStdfn.hour = hourPartFn;

  const minPartFn = (d: any) => getPart(d, 'min');
  engineFn.MINUTE = minPartFn;
  engineFn.minute = minPartFn;
  engineStdfn.MINUTE = minPartFn;
  engineStdfn.minute = minPartFn;

  const secPartFn = (d: any) => getPart(d, 'sec');
  engineFn.SECOND = secPartFn;
  engineFn.second = secPartFn;
  engineStdfn.SECOND = secPartFn;
  engineStdfn.second = secPartFn;

  // 14. IFNULL
  const ifnullFn = (val: any, defaultVal: any) => (val === null || val === undefined ? defaultVal : val);
  engineFn.IFNULL = ifnullFn;
  engineFn.ifnull = ifnullFn;

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
