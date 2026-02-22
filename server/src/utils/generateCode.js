
// src/utils/generateCode.js
module.exports = function generateCode(prefix = "IZN") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = (n = 6) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${rand(6)}`; // contoh: IZN-2025-4GZ8QM
};
