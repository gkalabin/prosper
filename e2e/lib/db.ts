import mysql, {
  Pool,
  PoolOptions,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';

const config: PoolOptions = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
  supportBigNumbers: true,
  // Encode JS Dates as UTC strings to match the Go backend's
  // DATETIME convention. Without this, timestamps inserted
  // by fixtures are read back by Go with an offset equal to the
  // local-vs-UTC difference, breaking interval-bound queries.
  timezone: 'Z',
};

export const pool: Pool = mysql.createPool(config);

export async function query<T extends RowDataPacket[]>(
  sql: string,
  params: unknown[] = []
): Promise<T> {
  const [rows] = await pool.query<T>(sql, params);
  return rows;
}

export async function exec(
  sql: string,
  params: unknown[] = []
): Promise<ResultSetHeader> {
  const [res] = await pool.query<ResultSetHeader>(sql, params);
  return res;
}

// insert runs an INSERT and returns the new row id.
export async function insert(
  sql: string,
  params: unknown[] = []
): Promise<number> {
  const res = await exec(sql, params);
  return res.insertId;
}
