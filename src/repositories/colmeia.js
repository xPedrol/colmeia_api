export default class ColmeiaRepository {
  _db;

  constructor(db) {
    this._db = db;
  }

  async getAll(userId) {
    const { rows } = await this._db.query(
      `SELECT c.*
       FROM colmeias c
       JOIN apiaries a ON a.id = c.apiary_id
       WHERE a.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId],
    );
    return rows;
  }

  async getById(id, userId) {
    const { rows } = await this._db.query(
      `SELECT c.*
       FROM colmeias c
       JOIN apiaries a ON a.id = c.apiary_id
       WHERE c.id = $1
         AND a.user_id = $2`,
      [id, userId],
    );
    return rows[0] ?? null;
  }

  async getByApiary(apiaryId, userId) {
    const { rows } = await this._db.query(
      `SELECT c.*
       FROM colmeias c
       JOIN apiaries a ON a.id = c.apiary_id
       WHERE c.apiary_id = $1
         AND a.user_id = $2
       ORDER BY c.created_at DESC`,
      [apiaryId, userId],
    );
    return rows;
  }

  async create({
    name,
    colmeia_type = "isca",
    apiary_id,
    acquisition_date,
    location,
    strength,
    description,
    user_id,
  }) {
    const { rows } = await this._db.query(
      `INSERT INTO colmeias (
         name,
         colmeia_type,
         apiary_id,
         acquisition_date,
         location,
         strength,
         description,
         user_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        colmeia_type,
        apiary_id,
        acquisition_date,
        location,
        strength,
        description,
        user_id,
      ],
    );
    return rows[0];
  }

  async update(
    id,
    userId,
    {
      name,
      colmeia_type = "isca",
      apiary_id,
      acquisition_date,
      location,
      strength,
      description,
    },
  ) {
    const { rows } = await this._db.query(
      `UPDATE colmeias
       SET name = $1,
           colmeia_type = $2,
           apiary_id = $3,
           acquisition_date = $4,
           location = $5,
           strength = $6,
           description = $7
       FROM apiaries a
       WHERE colmeias.id = $8
         AND colmeias.apiary_id = a.id
         AND a.user_id = $9
       RETURNING colmeias.*`,
      [
        name,
        colmeia_type,
        apiary_id,
        acquisition_date,
        location,
        strength,
        description,
        id,
        userId,
      ],
    );
    return rows[0] ?? null;
  }

  async delete(id, userId) {
    const { rowCount } = await this._db.query(
      `DELETE FROM colmeias
       USING apiaries a
       WHERE colmeias.id = $1
         AND colmeias.apiary_id = a.id
         AND a.user_id = $2`,
      [id, userId],
    );
    return rowCount > 0;
  }
}
