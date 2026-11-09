/* Formatação pt-BR (vírgula decimal). Só apresentação: não calcula nada. */
export function num(v, casas = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: casas, maximumFractionDigits: casas,
  });
}
/* Lê "0,5", "0.5" ou "1/3" vindo de um campo. Retorna NaN se inválido. */
export function lerNumero(txt) {
  const s = String(txt).trim().replace(",", ".");
  if (s.includes("/")) {
    const [a, b] = s.split("/");
    return Number(a) / Number(b);
  }
  return s === "" ? NaN : Number(s);
}
