export default class UserRepository {
  _db;
  constructor(db) {
    this._db = db;
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
}
