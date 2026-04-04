export default class ApiaryRepository {
  _db;
  constructor(db) {
    this._db = db;
  }

  async getAll(userId, year = new Date().getFullYear()) {
    const { rows } = await this._db.query(
      `WITH visit_totals AS (
         SELECT apiary_id,
                COUNT(*)                AS total_visits,
                SUM(new_swarm)           AS total_new_swarm,
                SUM(new_honey_super)     AS total_new_honey_super,
                SUM(removed_swarm)       AS total_removed_swarm,
                SUM(removed_honey_super) AS total_removed_honey_super
         FROM visits
         WHERE user_id = $1
           AND EXTRACT(YEAR FROM date) = $2
         GROUP BY apiary_id
       )
       SELECT ap.*,
              COALESCE(v.total_visits, 0)                AS total_visits,
              COALESCE(v.total_new_swarm, 0)           AS total_new_swarm,
              COALESCE(v.total_new_honey_super, 0)     AS total_new_honey_super,
              COALESCE(v.total_removed_swarm, 0)       AS total_removed_swarm,
              COALESCE(v.total_removed_honey_super, 0) AS total_removed_honey_super
       FROM apiaries ap
       LEFT JOIN visit_totals v ON v.apiary_id = ap.id
       WHERE ap.user_id = $1
       ORDER BY (total_removed_honey_super) DESC`,
      [userId, year],
    );
    return rows;
  }

  async getById(id, userId, year = new Date().getFullYear()) {
    const { rows: apiaryRows } = await this._db.query(
      `WITH visit_totals AS (
         SELECT
           apiary_id,
           SUM(new_swarm) AS total_new_swarm,
           SUM(new_honey_super) AS total_new_honey_super,
           SUM(removed_swarm) AS total_removed_swarm,
           SUM(removed_honey_super) AS total_removed_honey_super
         FROM visits
         WHERE user_id = $2
           AND EXTRACT(YEAR FROM date) = $3
         GROUP BY apiary_id
       )
       SELECT
         ap.*,
         COALESCE(v.total_new_swarm, 0) AS total_new_swarm,
         COALESCE(v.total_new_honey_super, 0) AS total_new_honey_super,
         COALESCE(v.total_removed_swarm, 0) AS total_removed_swarm,
         COALESCE(v.total_removed_honey_super, 0) AS total_removed_honey_super
       FROM apiaries ap
       LEFT JOIN visit_totals v ON v.apiary_id = ap.id
       WHERE ap.id = $1 AND ap.user_id = $2`,
      [id, userId, year],
    );
    const apiary = apiaryRows[0] ?? null;
    if (!apiary) return null;

    const { rows: visits } = await this._db.query(
      `SELECT *
       FROM visits
       WHERE apiary_id = $1
         AND user_id = $2
         AND EXTRACT(YEAR FROM date) = $3
       ORDER BY date DESC`,
      [id, userId, year],
    );
    return { ...apiary, visits };
  }

  async create({
    name,
    location,
    swarm,
    honey_super,
    predominant_bloom,
    beeType,
    image_link,
    apiaryStrength,
    floweringStrength,
    user_id,
  }) {
    const { rows } = await this._db.query(
      `INSERT INTO apiaries (
         name,
         location,
         swarm,
         honey_super,
         predominant_bloom,
         "beeType",
         image_link,
         "apiaryStrength",
         "floweringStrength",
         user_id
       )
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10) RETURNING *`,
      [
        name,
        location,
        swarm,
        honey_super,
        predominant_bloom,
        beeType ? JSON.stringify(beeType) : null,
        image_link,
        apiaryStrength,
        floweringStrength,
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
      location,
      swarm,
      honey_super,
      predominant_bloom,
      beeType,
      image_link,
      apiaryStrength,
      floweringStrength,
    },
  ) {
    const { rows } = await this._db.query(
      `UPDATE apiaries
       SET name = $1,
           location = $2,
           swarm = $3,
           honey_super = $4,
           predominant_bloom = $5,
           "beeType" = $6::jsonb,
           image_link = $7,
           "apiaryStrength" = $8,
           "floweringStrength" = $9
         WHERE id = $10 AND user_id = $11 RETURNING *`,
      [
        name,
        location,
        swarm,
        honey_super,
        predominant_bloom,
        beeType ? JSON.stringify(beeType) : null,
        image_link,
        apiaryStrength,
        floweringStrength,
        id,
        userId,
      ],
    );
    return rows[0] ?? null;
  }

  async updateStrengths(id, userId, { apiaryStrength, floweringStrength }) {
    const { rows } = await this._db.query(
      `UPDATE apiaries
       SET "apiaryStrength" = $1,
           "floweringStrength" = $2
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [apiaryStrength, floweringStrength, id, userId],
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
