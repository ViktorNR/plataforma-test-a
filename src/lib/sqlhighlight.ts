/** Resaltado de sintaxis MySQL (seguro para el navegador y el servidor). */
export type TokenKind = 'kw' | 'type' | 'fn' | 'str' | 'num' | 'com' | 'id' | 'tx';
export interface SqlToken {
  k: TokenKind;
  s: string;
}

const words = (s: string) => new Set(s.split(/\s+/).filter(Boolean));

const KEYWORDS = words(`
SELECT FROM WHERE GROUP BY HAVING ORDER LIMIT OFFSET DISTINCT ALL AS ON USING JOIN INNER LEFT RIGHT FULL OUTER CROSS NATURAL
UNION INTERSECT EXCEPT AND OR NOT IN IS NULL LIKE BETWEEN EXISTS ANY SOME CASE WHEN THEN ELSE END ASC DESC
INSERT INTO VALUES UPDATE SET DELETE REPLACE CREATE ALTER DROP TRUNCATE RENAME TABLE VIEW DATABASE SCHEMA INDEX UNIQUE
PRIMARY KEY FOREIGN REFERENCES CONSTRAINT DEFAULT AUTO_INCREMENT CHECK ADD COLUMN MODIFY CHANGE TO IF
USE SHOW DESCRIBE EXPLAIN PROCEDURE FUNCTION TRIGGER RETURNS RETURN BEGIN DECLARE CALL DELIMITER DETERMINISTIC READS SQL DATA
BEFORE AFTER FOR EACH ROW NEW OLD IN OUT INOUT WHILE DO LOOP REPEAT UNTIL LEAVE ITERATE ELSEIF CURSOR OPEN FETCH CLOSE HANDLER
COMMIT ROLLBACK START TRANSACTION GRANT REVOKE WITH RECURSIVE OVER PARTITION TRUE FALSE ENGINE CHARSET COLLATE CASCADE RESTRICT
DUPLICATE TEMPORARY EXISTS CONTAINS MODIFIES NO SIGNAL SQLSTATE MESSAGE_TEXT SECURITY DEFINER INVOKER
`);

const TYPES = words(`
INT INTEGER TINYINT SMALLINT MEDIUMINT BIGINT DECIMAL NUMERIC FLOAT DOUBLE REAL BIT BOOLEAN BOOL
CHAR VARCHAR TEXT TINYTEXT MEDIUMTEXT LONGTEXT BLOB MEDIUMBLOB LONGBLOB BINARY VARBINARY ENUM
DATE DATETIME TIMESTAMP TIME YEAR JSON
`);

const FUNCTIONS = words(`
COUNT SUM AVG MIN MAX ROUND CEIL CEILING FLOOR ABS MOD POWER SQRT CONCAT CONCAT_WS UPPER LOWER LENGTH CHAR_LENGTH SUBSTRING SUBSTR LEFT RIGHT
TRIM LTRIM RTRIM REPLACE LPAD RPAD NOW CURDATE CURTIME CURRENT_DATE CURRENT_TIMESTAMP DATE_FORMAT DATEDIFF TIMESTAMPDIFF DATE_ADD DATE_SUB ADDDATE
YEAR MONTH DAY DAYOFWEEK HOUR MINUTE SECOND EXTRACT IFNULL COALESCE NULLIF IF CAST CONVERT GROUP_CONCAT LAST_INSERT_ID ROW_NUMBER RANK DENSE_RANK
`);

const NAME_AFTER = new Set(['TABLE', 'VIEW', 'INTO', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'DATABASE', 'SCHEMA', 'UPDATE', 'JOIN', 'FROM', 'ON', 'REFERENCES', 'EXISTS', 'INDEX']);

const RE = /(--[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\[\s\S]|'')*'|"(?:[^"\\]|\\[\s\S])*")|(`[^`\n]*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_$]*)|(\s+)|([\s\S])/g;

export function tokenizeSql(src: string): SqlToken[] {
  const out: SqlToken[] = [];
  RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  let last = '';
  while ((m = RE.exec(src))) {
    if (m[1]) out.push({ k: 'com', s: m[1] });
    else if (m[2]) out.push({ k: 'str', s: m[2] });
    else if (m[3]) out.push({ k: 'id', s: m[3] });
    else if (m[4]) out.push({ k: 'num', s: m[4] });
    else if (m[5]) {
      const up = m[5].toUpperCase();
      const call = /^\s*\(/.test(src.slice(RE.lastIndex, RE.lastIndex + 12)) && !NAME_AFTER.has(last) && !KEYWORDS.has(up) ;
      const kind: TokenKind = TYPES.has(up) && !call ? 'type' : FUNCTIONS.has(up) && (call || !KEYWORDS.has(up)) ? 'fn' : KEYWORDS.has(up) ? 'kw' : TYPES.has(up) ? 'type' : call ? 'fn' : 'id';
      out.push({ k: kind, s: m[5] });
      last = up;
    } else out.push({ k: 'tx', s: m[0] });
  }
  return out;
}
