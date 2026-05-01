export default class DashboardRepository {
  _db;
  constructor(db) {
    this._db = db;
  }

  async getSummary(userId, year = new Date().getFullYear()) {
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
              WHERE EXTRACT(YEAR FROM date) = $2
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
      [userId, year],
    );
    if (rows.length === 0) {
      return {
        user_id: userId,
        total_visits: 0,
        total_new_swarm: 0,
        total_new_honey_super: 0,
        total_removed_swarm: 0,
        total_removed_honey_super: 0,
        total_apiaries: 0,
        initial_swarms: 0,
        initial_honey_supers: 0,
      };
    }
    return rows[0];
  }

  async getMonthlySummary(userId, year = new Date().getFullYear()) {
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
          AND EXTRACT(YEAR FROM date) = $2
        GROUP BY TO_CHAR(date, 'Mon')
        ORDER BY TO_CHAR(date, 'Mon') DESC
      `,
      [userId, year],
    );
    return rows;
  }

  async getExpensesByCategory(userId, year = new Date().getFullYear()) {
    const { rows } = await this._db.query(
      `SELECT
              ec.id AS category_id,
              ec.name AS category_name,
              COALESCE(SUM(e.value), 0) AS total_value
        FROM expense_categories ec
        LEFT JOIN expenses e
          ON e.category_id = ec.id
          AND e.user_id = $1::uuid
          AND EXTRACT(YEAR FROM e.date) = $2
        WHERE ec.user_id = $1::uuid
        GROUP BY ec.id, ec.name
        ORDER BY total_value DESC, ec.name ASC
      `,
      [userId, year],
    );
    return rows;
  }

  async getMonthlyVisits(userId, year = new Date().getFullYear()) {
    const { rows } = await this._db.query(
      `SELECT
              TO_CHAR(date, 'Mon') AS month,
              COUNT(*) AS total_visits
        FROM visits
        WHERE user_id = $1::uuid
          AND EXTRACT(YEAR FROM date) = $2
        GROUP BY TO_CHAR(date, 'Mon')
        ORDER BY TO_CHAR(date, 'Mon') DESC
      `,
      [userId, year],
    );
    return rows;
  }

  async getSalesSummary(userId, year = new Date().getFullYear()) {
    const { rows } = await this._db.query(
      `
     SELECT
      $1::uuid AS user_id,
    COALESCE((SELECT SUM(value) FROM expenses e WHERE e.user_id = $1 AND EXTRACT(YEAR FROM e.date) = $2), 0) AS total_expenses,
    COALESCE((SELECT SUM(amount) FROM sales s WHERE s.user_id = $1 AND EXTRACT(YEAR FROM s.date) = $2), 0) AS total_amount_sales,
    COALESCE((SELECT SUM(value) FROM sales s WHERE s.user_id = $1 AND EXTRACT(YEAR FROM s.date) = $2), 0) AS total_value_sales;
      `,
      [userId, year],
    );
    if (rows.length === 0) {
      return {
        user_id: userId,
        total_expenses: 0,
        total_amount_sales: 0,
        total_value_sales: 0,
      };
    }
    return rows[0];
  }
  /**
   * Retorna, para cada apiário do usuário, por ano, o número de melgueiras retiradas e o número de visitas
   */
  async getApiaryYearlyStats(userId, year = new Date().getFullYear()) {
    const { rows } = await this._db.query(
      `SELECT
        a.id AS apiary_id,
        a.name AS apiary_name,
        COUNT(v.id) AS total_visits,
        COALESCE(SUM(v.new_honey_super), 0) AS total_new_honey_supers,
        COALESCE(SUM(v.removed_honey_super), 0) AS total_removed_honey_supers
      FROM apiaries a
      INNER JOIN visits v ON v.apiary_id = a.id
        AND v.user_id = a.user_id
        AND EXTRACT(YEAR FROM v.date) = $2
      WHERE a.user_id = $1
      GROUP BY a.id, a.name
      ORDER BY a.name ASC
      `,
      [userId, year],
    );
    return rows;
  }
}
