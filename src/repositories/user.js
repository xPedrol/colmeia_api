import { passwordResetTemplate } from "../templates/passwordReset.js";
import { LOGO_PATH, LOGO_CID } from "../templates/base.js";

export default class UserRepository {
  _db;
  emailService;
  constructor(db, mailService) {
    this._db = db;
    this.emailService = mailService;
  }

  async getAllUsers() {
    const { rows } = await this._db.query("SELECT * FROM users");
    return rows;
  }

  async getUserByEmail(email) {
    const { rows } = await this._db.query(
      "SELECT * FROM users WHERE email = $1",
      [email],
    );
    return rows[0] ?? null;
  }

  async getUserByEmailAndPassword(email, password) {
    const { rows } = await this._db.query(
      "SELECT * FROM users WHERE email = $1 AND password = $2",
      [email, password],
    );
    return rows[0] ?? null;
  }

  async getUserById(id) {
    const { rows } = await this._db.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    return rows[0];
  }

  async createUser(name, email, password) {
    const { rows } = await this._db.query(
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, email, password],
    );
    return rows[0];
  }

  async updateUser(id, name, email, password) {
    const { rows } = await this._db.query(
      "UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4 RETURNING *",
      [name, email, password, id],
    );
    return rows[0];
  }

  async deleteUser(id) {
    await this._db.query("DELETE FROM users WHERE id = $1", [id]);
    return true;
  }

  async sendResetPasswordEmail(email, code, userName) {
    const html = passwordResetTemplate({ code, userName });
    await this.emailService.sendEmail(
      email,
      "Recuperar Senha — Colmeia Pro",
      html,
      [{ filename: "logo.png", path: LOGO_PATH, cid: LOGO_CID }],
    );
    return true;
  }

  async setPasswordResetCode(email, codeHash, expiresAt) {
    const { rows } = await this._db.query(
      "UPDATE users SET reset_code_hash = $1, reset_code_expires_at = $2, reset_code_attempts = 0 WHERE email = $3 RETURNING *",
      [codeHash, expiresAt, email],
    );
    return rows[0] ?? null;
  }

  async incrementResetCodeAttempts(email) {
    const { rows } = await this._db.query(
      "UPDATE users SET reset_code_attempts = reset_code_attempts + 1 WHERE email = $1 RETURNING reset_code_attempts",
      [email],
    );
    return rows[0]?.reset_code_attempts ?? 0;
  }

  async clearPasswordResetCode(email) {
    await this._db.query(
      "UPDATE users SET reset_code_hash = NULL, reset_code_expires_at = NULL, reset_code_attempts = 0 WHERE email = $1",
      [email],
    );
    return true;
  }

  async resetPassword(email, newPassword) {
    const { rows } = await this._db.query(
      "UPDATE users SET password = $1 WHERE email = $2 RETURNING *",
      [newPassword, email],
    );
    return rows[0];
  }
}
