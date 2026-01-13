import { obfuscateLuau } from "./core/obfuscate.js";

document.getElementById("run").onclick = () => {
  const input = document.getElementById("input").value;
  if (!input.trim()) return;

  document.getElementById("output").value =
    obfuscateLuau(input);
};
