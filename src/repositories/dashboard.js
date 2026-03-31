export default class DashboardRepository {
  _db;
  constructor(db) {
    this._db = db;
  }

  async getSummary(userId) {
    const { rows } = await this._db.query(
      `WITH visit_totals AS (
              SELECT 
                        user_id,
                        COUNT(*)                AS total_visits,
                        COALESCE(SUM(new_swarm), 0)           AS total_new_swarm,
                        COALESCE(SUM(new_honey_super), 0)     AS total_new_honey_super,
                        COALESCE(SUM(removed_swarm), 0)       AS total_removed_swarm,
                        COALESCE(SUM(removed_honey_super), 0) AS total_removed_honey_super
              FROM visits
              GROUP BY user_id 
            )
           , apiary_counts AS (
              SELECT 
              user_id, 
              COUNT(*) AS total_apiaries, 
              COALESCE(SUM(swarm), 0) AS total_swarms, 
              COALESCE(SUM(honey_super), 0) AS total_honey_supers
              FROM apiaries
              GROUP BY user_id
              )
              SELECT
              
                     COALESCE(v.user_id, a.user_id) AS user_id,
                     COALESCE(v.total_visits, 0) AS total_visits,
                      COALESCE(v.total_new_swarm, 0) AS total_new_swarm,
                      COALESCE(v.total_new_honey_super, 0) AS total_new_honey_super,
                      COALESCE(v.total_removed_swarm, 0) AS total_removed_swarm,
                      COALESCE(v.total_removed_honey_super, 0) AS total_removed_honey_super,
                      COALESCE(a.total_apiaries, 0) AS total_apiaries,
                      COALESCE(a.total_swarms, 0) AS initial_swarms,
                      COALESCE(a.total_honey_supers, 0) AS initial_honey_supers
                     FROM visit_totals v
                     FULL JOIN apiary_counts a ON v.user_id = a.user_id
                     WHERE COALESCE(v.user_id, a.user_id) = $1::uuid
                     `,
      [userId],
    );
    return rows[0];
  }

  async getMonthlySummary(userId) {
    const { rows } = await this._db.query(
      `SELECT
              TO_CHAR(date, 'Mon') AS month,
              COUNT(*) AS total_visits,
              COALESCE(SUM(new_swarm), 0) AS total_new_swarm,
              COALESCE(SUM(new_honey_super), 0) AS total_new_honey_super,
              COALESCE(SUM(removed_swarm), 0) AS total_removed_swarm,
              COALESCE(SUM(removed_honey_super), 0) AS total_removed_honey_super
        FROM visits
        WHERE user_id = $1::uuid
        GROUP BY TO_CHAR(date, 'Mon')
        ORDER BY TO_CHAR(date, 'Mon') DESC
      `,
      [userId],
    );
    return rows;
  }

  async getSalesSummary(userId) {
    const { rows } = await this._db.query(
      `
     SELECT
      $1::uuid AS user_id,
    COALESCE((SELECT SUM(value) FROM expenses e WHERE e.user_id = $1), 0) AS total_expenses,
    COALESCE((SELECT SUM(amount) FROM sales s WHERE s.user_id = $1), 0) AS total_amount_sales,
    COALESCE((SELECT SUM(value) FROM sales s WHERE s.user_id = $1), 0) AS total_value_sales;
      `,
      [userId],
    );
    return rows[0];
  }
}
