export function tokenize(code) {
  const tokens = [];
  const re =
    /(--.*$)|("([^"\\]|\\.)*")|(\b[a-zA-Z_]\w*\b)|(\S)/gm;

  let m;
  while ((m = re.exec(code))) {
    if (m[1]) tokens.push({ type: "comment", value: m[1] });
    else if (m[2]) tokens.push({ type: "string", value: m[2] });
    else if (m[4]) tokens.push({ type: "id", value: m[4] });
    else tokens.push({ type: "sym", value: m[5] });
  }
  return tokens;
}
