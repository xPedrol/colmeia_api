export default class ApiaryRepository {
  _db;
  constructor(db) {
    this._db = db;
  }

  async getAll(userId) {
    const { rows } = await this._db.query(
      "SELECT * FROM apiaries WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    return rows;
  }

  async getById(id, userId) {
    const { rows: apiaryRows } = await this._db.query(
      "SELECT * FROM apiaries WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    const apiary = apiaryRows[0] ?? null;
    if (!apiary) return null;

    const { rows: visits } = await this._db.query(
      "SELECT * FROM visits WHERE apiary_id = $1 ORDER BY date DESC",
      [id],
    );
    return { ...apiary, visits };
  }

  async create({ name, location, swarm, honey_super, image_link, user_id }) {
    const { rows } = await this._db.query(
      `INSERT INTO apiaries (name, location, swarm, honey_super, image_link, user_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, location, swarm, honey_super, image_link, user_id],
    );
    return rows[0];
  }

  async update(id, userId, { name, location, swarm, honey_super, image_link }) {
    const { rows } = await this._db.query(
      `UPDATE apiaries
       SET name = $1, location = $2, swarm = $3, honey_super = $4, image_link = $5
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [name, location, swarm, honey_super, image_link, id, userId],
    );
    return rows[0] ?? null;
  }

  async delete(id, userId) {
    const { rowCount } = await this._db.query(
      "DELETE FROM apiaries WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return rowCount > 0;
  }
}
