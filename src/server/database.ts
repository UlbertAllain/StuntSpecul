import type { Client, InStatement, InValue, ResultSet } from "@libsql/client";

export interface QueryResult<T = Record<string, unknown>> {
  results: T[];
  success: true;
}
export interface PreparedStatement {
  bind(...values: InValue[]): PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<QueryResult<T>>;
  run(): Promise<QueryResult>;
}
export interface Database {
  prepare(sql: string): PreparedStatement;
  batch(statements: PreparedStatement[]): Promise<QueryResult[]>;
}

type QueryClient = Pick<Client, "execute" | "batch">;

function rows<T>(result: ResultSet): QueryResult<T> {
  return {
    results: result.rows.map((row) =>
      Object.fromEntries(result.columns.map((column) => [column, row[column]])),
    ) as T[],
    success: true,
  };
}

export function createDatabase(client: QueryClient): Database {
  const queries = new WeakMap<PreparedStatement, InStatement>();
  function prepare(sql: string, args: InValue[] = []): PreparedStatement {
    const query = { sql, args };
    const statement: PreparedStatement = {
      bind: (...values) => prepare(sql, values),
      async first<T>() {
        return rows<T>(await client.execute(query)).results[0] ?? null;
      },
      async all<T>() {
        return rows<T>(await client.execute(query));
      },
      async run() {
        return rows(await client.execute(query));
      },
    };
    queries.set(statement, query);
    return statement;
  }
  return {
    prepare,
    async batch(statements) {
      if (!statements.length) return [];
      const batch = statements.map((statement) => {
        const query = queries.get(statement);
        if (!query) throw new Error("Statement belongs to another database");
        return query;
      });
      return (await client.batch(batch, "write")).map((result) => rows(result));
    },
  };
}

export function unavailableDatabase(): Database {
  const unavailable = () => {
    throw new Error(
      "SQL database is disabled because Firestore is the active data provider.",
    );
  };

  return {
    prepare: unavailable,
    async batch() {
      return unavailable();
    },
  };
}
