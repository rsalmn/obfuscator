import { tokenize } from "./tokenizer.js";

export function obfuscateLuau(code) {
  const tokens = tokenize(code);
  const scopes = [{}];
  let idCounter = 0;

  function gen() {
    return "_x" + Math.random().toString(36).slice(2, 8);
  }

  function currentScope() {
    return scopes[scopes.length - 1];
  }

  const keywords = new Set([
    "local","function","end","if","then","else",
    "for","while","do","return"
  ]);

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    // new scope
    if (t.value === "function" || t.value === "do") {
      scopes.push({});
    }

    // end scope
    if (t.value === "end") {
      scopes.pop();
    }

    // local variable
    if (t.value === "local" && tokens[i+1]?.type === "id") {
      const name = tokens[i+1].value;
      const obf = gen();
      currentScope()[name] = obf;
      tokens[i+1].value = obf;
      continue;
    }

    // replace identifier
    if (t.type === "id" && !keywords.has(t.value)) {
      for (let s = scopes.length - 1; s >= 0; s--) {
        if (scopes[s][t.value]) {
          t.value = scopes[s][t.value];
          break;
        }
      }
    }
  }

  return build(tokens);
}

function build(tokens) {
  return tokens.map(t => t.value).join("");
}
