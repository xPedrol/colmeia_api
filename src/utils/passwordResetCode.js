import crypto from "node:crypto";
import { comparePassword, hashPassword } from "./bcrypt.js";

export const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
export const MAX_RESET_CODE_ATTEMPTS = 5;

export const generateResetCode = () =>
  String(crypto.randomInt(0, 1000000)).padStart(6, "0");

export const hashResetCode = async (code) => hashPassword(code);

export const compareResetCode = async (code, hash) =>
  comparePassword(code, typeof hash === "string" ? hash.trim() : "");

export const getResetCodeExpiryDate = () =>
  new Date(Date.now() + PASSWORD_RESET_TTL_MS);

export const isResetCodeExpired = (expiresAt) =>
  Date.now() > new Date(expiresAt).getTime();
