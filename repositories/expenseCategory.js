export default class ExpenseCategoryRepository {
  _db;
  constructor(db) {
    this._db = db;
  }

  async getAll(userId) {
    const { rows } = await this._db.query(
      "SELECT * FROM expense_categories WHERE user_id = $1 ORDER BY name ASC",
      [userId],
    );
    return rows;
  }

  async getById(id, userId) {
    const { rows } = await this._db.query(
      "SELECT * FROM expense_categories WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return rows[0] ?? null;
  }

  async create({ name, user_id }) {
    const { rows } = await this._db.query(
      "INSERT INTO expense_categories (name, user_id) VALUES ($1, $2) RETURNING *",
      [name, user_id],
    );
    return rows[0];
  }

  async update(id, userId, { name }) {
    const { rows } = await this._db.query(
      "UPDATE expense_categories SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *",
      [name, id, userId],
    );
    return rows[0] ?? null;
  }

  async delete(id, userId) {
    const { rowCount } = await this._db.query(
      "DELETE FROM expense_categories WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return rowCount > 0;
  }
}
