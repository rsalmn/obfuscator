export function obfuscateLuau(code) {
  const idMap = {};
  let idCount = 0;

  function genId() {
    return "_x" + (++idCount);
  }

  // 1. rename locals & functions
  code = code.replace(
    /\b(local|function)\s+([a-zA-Z_]\w*)/g,
    (m, k, name) => {
      if (!idMap[name]) idMap[name] = genId();
      return `${k} ${idMap[name]}`;
    }
  );

  // replace identifiers
  for (const k in idMap) {
    code = code.replace(
      new RegExp("\\b" + k + "\\b", "g"),
      idMap[k]
    );
  }

  // 2. encode strings
  code = code.replace(/"([^"]*)"/g, (_, s) => {
    return `"${xorEncode(s)}"`;
  });

  // 3. wrap execution
  return `
local function __d(s)
  local t = {}
  for i = 1, #s do
    t[i] = string.char(bit32.bxor(s:byte(i), 11))
  end
  return table.concat(t)
end

return (function()
${code}
end)()
`.trim();
}

function xorEncode(str, k = 11) {
  return [...str]
    .map(c => String.fromCharCode(c.charCodeAt(0) ^ k))
    .join("");
}
