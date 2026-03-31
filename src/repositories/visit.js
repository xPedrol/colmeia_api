export default class VisitRepository {
  _db;
  constructor(db) {
    this._db = db;
  }

  async getAll(userId) {
    const { rows } = await this._db.query(
      "SELECT * FROM visits WHERE user_id = $1 ORDER BY date DESC",
      [userId],
    );
    return rows;
  }

  async getByApiary(apiaryId, userId) {
    const { rows } = await this._db.query(
      "SELECT * FROM visits WHERE apiary_id = $1 AND user_id = $2 ORDER BY date DESC",
      [apiaryId, userId],
    );
    return rows;
  }

  async getById(id, userId) {
    const { rows } = await this._db.query(
      "SELECT * FROM visits WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return rows[0] ?? null;
  }

  async create({
    apiary_id,
    date,
    new_swarm,
    new_honey_super,
    removed_swarm,
    removed_honey_super,
    user_id,
  }) {
    const { rows } = await this._db.query(
      `INSERT INTO visits (apiary_id, date, new_swarm, new_honey_super, removed_swarm, removed_honey_super, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        apiary_id,
        date,
        new_swarm,
        new_honey_super,
        removed_swarm,
        removed_honey_super,
        user_id,
      ],
    );
    return rows[0];
  }

  async update(
    id,
    userId,
    {
      apiary_id,
      date,
      new_swarm,
      new_honey_super,
      removed_swarm,
      removed_honey_super,
    },
  ) {
    const { rows } = await this._db.query(
      `UPDATE visits
       SET apiary_id = $1, date = $2, new_swarm = $3, new_honey_super = $4,
           removed_swarm = $5, removed_honey_super = $6
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [
        apiary_id,
        date,
        new_swarm,
        new_honey_super,
        removed_swarm,
        removed_honey_super,
        id,
        userId,
      ],
    );
    return rows[0] ?? null;
  }

  async delete(id, userId) {
    const { rowCount } = await this._db.query(
      "DELETE FROM visits WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return rowCount > 0;
  }
}
