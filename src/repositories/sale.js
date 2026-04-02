export default class SaleRepository {
  _db;
  constructor(db) {
    this._db = db;
  }

  async getAll(userId, year = new Date().getFullYear()) {
    const { rows } = await this._db.query(
      `SELECT *
       FROM sales
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM date) = $2
       ORDER BY date DESC`,
      [userId, year],
    );
    return rows;
  }

  async getById(id, userId, year = new Date().getFullYear()) {
    const { rows } = await this._db.query(
      `SELECT *
       FROM sales
       WHERE id = $1
         AND user_id = $2
         AND EXTRACT(YEAR FROM date) = $3`,
      [id, userId, year],
    );
    return rows[0] ?? null;
  }

  async create({ amount, value, date, user_id }) {
    const { rows } = await this._db.query(
      `INSERT INTO sales (amount, value, date, user_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [amount, value, date, user_id],
    );
    return rows[0];
  }

  async update(id, userId, { amount, value, date }) {
    const { rows } = await this._db.query(
      `UPDATE sales
       SET amount = $1, value = $2, date = $3
       WHERE id = $4 AND user_id = $5 RETURNING *`,
      [amount, value, date, id, userId],
    );
    return rows[0] ?? null;
  }

  async delete(id, userId) {
    const { rowCount } = await this._db.query(
      "DELETE FROM sales WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return rowCount > 0;
  }
}
