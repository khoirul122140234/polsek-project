// utils/generateCode.js
export function generateStatusCode(len = 28) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/1/O/I biar jelas
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}
