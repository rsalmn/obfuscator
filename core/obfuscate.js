import { tokenize } from "./tokenizer.js";

export function obfuscateLuau(code) {
  const tokens = tokenize(code);

  const scopes = [{}];
  const keywords = new Set([
    "local","function","end","if","then","else","elseif",
    "for","while","do","repeat","until","return",
    "break","continue","nil","true","false"
  ]);

  function genName() {
    return "_x" + Math.random().toString(36).slice(2, 8);
  }

  function currentScope() {
    return scopes[scopes.length - 1];
  }

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    // buka scope baru
    if (t.value === "function" || t.value === "do" || t.value === "then") {
      scopes.push({});
    }

    // tutup scope
    if (t.value === "end" || t.value === "until") {
      scopes.pop();
    }

    // local variable declaration
    if (
      t.value === "local" &&
      tokens[i + 1] &&
      tokens[i + 1].type === "id"
    ) {
      const original = tokens[i + 1].value;
      const obf = genName();
      currentScope()[original] = obf;
      tokens[i + 1].value = obf;
      continue;
    }

    // identifier replacement (scope-aware)
    if (t.type === "id" && !keywords.has(t.value)) {
      for (let s = scopes.length - 1; s >= 0; s--) {
        if (scopes[s][t.value]) {
          t.value = scopes[s][t.value];
          break;
        }
      }
    }

    // string encoding + runtime decode
    if (t.type === "string") {
      const raw = t.value.slice(1, -1);
      const encoded = xorEncode(raw);
      t.value = `__d("${encoded}")`;
    }
  }

  const body = tokens.map(t => t.value).join("");

  return `
local function __d(s)
  local t = {}
  for i = 1, #s do
    t[i] = string.char(bit32.bxor(s:byte(i), 11))
  end
  return table.concat(t)
end

return (function()
${body}
end)()
`.trim();
}

// =====================
// helpers
// =====================

function xorEncode(str, k = 11) {
  let out = "";
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ k);
  }
  return out;
}
