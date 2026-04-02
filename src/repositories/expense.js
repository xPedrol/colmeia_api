export default class ExpenseRepository {
  _db;
  constructor(db) {
    this._db = db;
  }

  async getAll(userId, year = new Date().getFullYear()) {
    const { rows } = await this._db.query(
      `SELECT e.*, ec.name AS category_name
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.category_id = ec.id
       WHERE e.user_id = $1
         AND EXTRACT(YEAR FROM e.date) = $2
       ORDER BY e.date DESC`,
      [userId, year],
    );
    return rows;
  }

  async getById(id, userId, year = new Date().getFullYear()) {
    const { rows: expenseRows } = await this._db.query(
      `SELECT e.*, ec.name AS category_name
       FROM expenses e
       LEFT JOIN expense_categories ec ON e.category_id = ec.id
       WHERE e.id = $1
         AND e.user_id = $2
         AND EXTRACT(YEAR FROM e.date) = $3`,
      [id, userId, year],
    );
    const expense = expenseRows[0] ?? null;
    if (!expense) return null;
    const { rows: categoryRows } = await this._db.query(
      "SELECT * FROM expense_categories WHERE id = $1",
      [expense.category_id],
    );
    return { ...expense, category: categoryRows[0] ?? null };
  }

  async create({ value, date, description, category_id, user_id }) {
    const { rows } = await this._db.query(
      `INSERT INTO expenses (value, date, description, category_id, user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [value, date, description, category_id, user_id],
    );
    return rows[0];
  }

  async update(id, userId, { value, date, description, category_id }) {
    const { rows } = await this._db.query(
      `UPDATE expenses
       SET value = $1, date = $2, description = $3, category_id = $4
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [value, date, description, category_id, id, userId],
    );
    return rows[0] ?? null;
  }

  async delete(id, userId) {
    const { rowCount } = await this._db.query(
      "DELETE FROM expenses WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return rowCount > 0;
  }
}
