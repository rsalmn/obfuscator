import { tokenize } from "./tokenizer.js";

export function obfuscateLuau(code) {
  const tokens = tokenize(code);

  /* ===============================
     CONFIG & STATE
  =============================== */

  const keywords = new Set([
    "local","function","end","if","then","else","elseif",
    "for","while","do","repeat","until","return",
    "break","continue","nil","true","false"
  ]);

  const scopes = [{}];
  const renameMap = new Map();
  const usedNames = new Set();

  const stringPool = [];
  const stringIndex = new Map();

  /* ===============================
     HELPERS
  =============================== */

  function genName() {
    let name;
    do {
      name =
        "_l" +
        Math.random().toString(36).replace(/[^a-z]/g, "").slice(0, 6);
    } while (usedNames.has(name));
    usedNames.add(name);
    return name;
  }

  function currentScope() {
    return scopes[scopes.length - 1];
  }

  function xorEncode(str, k = 11) {
    let out = "";
    for (let i = 0; i < str.length; i++) {
      out += String.fromCharCode(str.charCodeAt(i) ^ k);
    }
    return out;
  }

  /* ===============================
     PASS 1: ANALYZE + TRANSFORM
  =============================== */

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    const next = tokens[i + 1];

    // ---- scope open
    if (t.value === "function" || t.value === "do" || t.value === "then") {
      scopes.push({});
    }

    // ---- scope close
    if (t.value === "end" || t.value === "until") {
      scopes.pop();
    }

    // ---- local declaration
    if (
      t.value === "local" &&
      next &&
      next.type === "id"
    ) {
      const original = next.value;
      const obf = genName();
      currentScope()[original] = obf;
      renameMap.set(original, obf);
      next.value = obf;
      continue;
    }

    // ---- identifier replacement (SAFE)
    if (
      t.type === "id" &&
      !keywords.has(t.value) &&
      !(prev && (prev.value === "." || prev.value === ":")) &&
      !(next && next.value === ":")
    ) {
      for (let s = scopes.length - 1; s >= 0; s--) {
        if (scopes[s][t.value]) {
          t.value = scopes[s][t.value];
          break;
        }
      }
    }

    // ---- string pooling
    if (t.type === "string") {
      const raw = t.value.slice(1, -1);

      if (!stringIndex.has(raw)) {
        stringIndex.set(raw, stringPool.length + 1);
        stringPool.push(xorEncode(raw));
      }

      const idx = stringIndex.get(raw);
      t.value = `__STR[${idx}]`;
    }
  }

  /* ===============================
     BUILD OUTPUT
  =============================== */

  const body = tokens.map(t => t.value).join("");

  const runtime = `
local function __d(s)
  local t = {}
  for i = 1, #s do
    t[i] = string.char(bit32.bxor(s:byte(i), 11))
  end
  return table.concat(t)
end

local __STR = {
${stringPool.map(s => `  __d("${s}")`).join(",\n")}
}
`;

  return `
${runtime}

return (function()
${body}
end)()
`.trim();
}
