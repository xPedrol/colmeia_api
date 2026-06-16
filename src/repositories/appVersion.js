export default class AppVersionRepository {
  _db;

  constructor(db) {
    this._db = db;
  }

  async get() {
    const { rows } = await this._db.query(
      'SELECT version, apk_url AS "apkUrl", updated_at AS "updatedAt" FROM app_version WHERE id = 1',
    );
    return rows[0] ?? null;
  }

  async upsert(version, apkUrl) {
    const { rows } = await this._db.query(
      `INSERT INTO app_version (id, version, apk_url)
       VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE
       SET version = EXCLUDED.version, apk_url = EXCLUDED.apk_url, updated_at = now()
       RETURNING version, apk_url AS "apkUrl", updated_at AS "updatedAt"`,
      [version, apkUrl],
    );
    return rows[0];
  }
}
