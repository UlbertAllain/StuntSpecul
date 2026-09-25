import { ApiError } from "./http";

type Variables = Record<string, string | undefined>;

export type FirestoreConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

export type FirestoreDoc<T extends Record<string, unknown>> = {
  id: string;
  data: T;
  updateTime: string;
};

export type FirestorePrecondition =
  | { exists: boolean }
  | { updateTime: string };

export type FirestoreWrite = {
  path: string;
  data?: Record<string, unknown>;
  delete?: boolean;
  mergeFields?: string[];
  precondition?: FirestorePrecondition;
};

export type FirestoreQueryOperator = "EQUAL" | "GREATER_THAN_OR_EQUAL";

export type FirestoreQueryOptions = {
  where?: {
    field: string;
    op: FirestoreQueryOperator;
    value: unknown;
  };
  orderBy?: {
    field: string;
    direction: "ASCENDING" | "DESCENDING";
  }[];
  limit?: number;
  offset?: number;
};

export class FirestoreError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "FirestoreError";
    this.status = status;
    this.code = code;
  }
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

export function firestoreConfig(values: Variables): FirestoreConfig | null {
  const projectId = values.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = values.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = values.FIREBASE_PRIVATE_KEY?.trim();
  const supplied = [projectId, clientEmail, privateKey].filter(Boolean).length;

  if (supplied === 0) return null;
  if (supplied !== 3) {
    throw new ApiError(
      503,
      "Konfigurasi Firebase belum lengkap.",
      "firebase_not_configured",
    );
  }

  return {
    projectId: projectId!,
    clientEmail: clientEmail!,
    privateKey: normalizePrivateKey(privateKey!),
  };
}

function base64Url(input: string | Uint8Array) {
  const buffer =
    typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  return buffer.toString("base64url");
}

function pemBytes(pem: string) {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  return Uint8Array.from(Buffer.from(body, "base64"));
}

function encodeValue(value: unknown): Record<string, unknown> {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: encodeFields(value as Record<string, unknown>),
      },
    };
  }
  throw new TypeError("Nilai Firestore tidak didukung.");
}

function encodeFields(value: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, encodeValue(item)]),
  );
}

function decodeValue(value: Record<string, unknown>): unknown {
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value)
    return new Date(String(value.timestampValue)).getTime();
  if ("arrayValue" in value) {
    const array = value.arrayValue as { values?: Record<string, unknown>[] };
    return (array.values ?? []).map(decodeValue);
  }
  if ("mapValue" in value) {
    const map = value.mapValue as {
      fields?: Record<string, Record<string, unknown>>;
    };
    return decodeFields(map.fields ?? {});
  }
  return null;
}

function decodeFields(fields: Record<string, Record<string, unknown>>) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]),
  );
}

function documentId(name: string) {
  const marker = "/documents/";
  const index = name.indexOf(marker);
  const path = index >= 0 ? name.slice(index + marker.length) : name;
  return decodeURIComponent(path.split("/").at(-1) || "");
}

function encodePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export class FirestoreRest {
  private config: FirestoreConfig;
  private accessToken = "";
  private accessTokenExpiresAt = 0;
  private signingKey?: CryptoKey;

  constructor(config: FirestoreConfig) {
    this.config = config;
  }

  private documentRoot() {
    return `projects/${this.config.projectId}/databases/(default)/documents`;
  }

  private root() {
    return `https://firestore.googleapis.com/v1/${this.documentRoot()}`;
  }

  private async token() {
    if (this.accessToken && this.accessTokenExpiresAt > Date.now() + 60_000) {
      return this.accessToken;
    }

    const now = Math.floor(Date.now() / 1000);
    const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = base64Url(
      JSON.stringify({
        iss: this.config.clientEmail,
        scope: "https://www.googleapis.com/auth/datastore",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      }),
    );
    const unsigned = `${header}.${payload}`;

    this.signingKey ??= await crypto.subtle.importKey(
      "pkcs8",
      pemBytes(this.config.privateKey),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      this.signingKey,
      new TextEncoder().encode(unsigned),
    );
    const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const payloadResult = (await response.json().catch(() => null)) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
      error_description?: string;
    } | null;

    if (!response.ok || !payloadResult?.access_token) {
      throw new FirestoreError(
        response.status || 503,
        payloadResult?.error || "firebase_auth_failed",
        payloadResult?.error_description ||
          "Firebase service account tidak dapat diautentikasi.",
      );
    }

    this.accessToken = payloadResult.access_token;
    this.accessTokenExpiresAt =
      Date.now() + (payloadResult.expires_in ?? 3600) * 1000;
    return this.accessToken;
  }

  private async request<T>(
    url: string,
    init: RequestInit = {},
    allowNotFound = false,
  ): Promise<T | null> {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });

    if (allowNotFound && response.status === 404) return null;

    const payload = (await response.json().catch(() => null)) as
      | { error?: { status?: string; message?: string } }
      | T
      | null;

    if (!response.ok) {
      const error = payload as {
        error?: { status?: string; message?: string };
      } | null;
      throw new FirestoreError(
        response.status,
        error?.error?.status || "firestore_error",
        error?.error?.message || "Firestore request gagal.",
      );
    }

    return payload as T;
  }

  async get<T extends Record<string, unknown>>(
    path: string,
  ): Promise<FirestoreDoc<T> | null> {
    const result = await this.request<{
      name: string;
      fields?: Record<string, Record<string, unknown>>;
      updateTime: string;
    }>(`${this.root()}/${encodePath(path)}`, {}, true);

    if (!result) return null;
    return {
      id: documentId(result.name),
      data: decodeFields(result.fields ?? {}) as T,
      updateTime: result.updateTime,
    };
  }

  async list<T extends Record<string, unknown>>(
    collectionPath: string,
    maxItems = 5000,
  ): Promise<FirestoreDoc<T>[]> {
    const items: FirestoreDoc<T>[] = [];
    let pageToken = "";

    while (items.length < maxItems) {
      const url = new URL(`${this.root()}/${encodePath(collectionPath)}`);
      url.searchParams.set(
        "pageSize",
        String(Math.min(1000, maxItems - items.length)),
      );
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const result = await this.request<{
        documents?: {
          name: string;
          fields?: Record<string, Record<string, unknown>>;
          updateTime: string;
        }[];
        nextPageToken?: string;
      }>(url.toString());

      for (const document of result?.documents ?? []) {
        items.push({
          id: documentId(document.name),
          data: decodeFields(document.fields ?? {}) as T,
          updateTime: document.updateTime,
        });
      }

      pageToken = result?.nextPageToken || "";
      if (!pageToken) break;
    }

    return items;
  }

  async query<T extends Record<string, unknown>>(
    collectionId: string,
    options: FirestoreQueryOptions = {},
  ): Promise<FirestoreDoc<T>[]> {
    if (!collectionId || collectionId.includes("/")) {
      throw new TypeError("Structured query hanya mendukung koleksi root.");
    }

    const structuredQuery: Record<string, unknown> = {
      from: [{ collectionId }],
    };

    if (options.where) {
      structuredQuery.where = {
        fieldFilter: {
          field: { fieldPath: options.where.field },
          op: options.where.op,
          value: encodeValue(options.where.value),
        },
      };
    }

    if (options.orderBy?.length) {
      structuredQuery.orderBy = options.orderBy.map((item) => ({
        field: { fieldPath: item.field },
        direction: item.direction,
      }));
    }

    if (options.offset !== undefined) {
      structuredQuery.offset = Math.max(0, Math.trunc(options.offset));
    }

    if (options.limit !== undefined) {
      structuredQuery.limit = Math.max(
        1,
        Math.min(1000, Math.trunc(options.limit)),
      );
    }

    const result = await this.request<
      {
        document?: {
          name: string;
          fields?: Record<string, Record<string, unknown>>;
          updateTime: string;
        };
      }[]
    >(`${this.root()}:runQuery`, {
      method: "POST",
      body: JSON.stringify({ structuredQuery }),
    });

    return (result ?? []).flatMap((item) => {
      if (!item.document) return [];
      return [
        {
          id: documentId(item.document.name),
          data: decodeFields(item.document.fields ?? {}) as T,
          updateTime: item.document.updateTime,
        },
      ];
    });
  }

  async set(
    path: string,
    data: Record<string, unknown>,
    options: {
      mergeFields?: string[];
      precondition?: FirestorePrecondition;
    } = {},
  ) {
    await this.commit([
      {
        path,
        data,
        mergeFields: options.mergeFields,
        precondition: options.precondition,
      },
    ]);
  }

  async delete(path: string, precondition?: FirestorePrecondition) {
    await this.commit([{ path, delete: true, precondition }]);
  }

  async commit(writes: FirestoreWrite[]) {
    const body = {
      writes: writes.map((write) => {
        const currentDocument = write.precondition
          ? "exists" in write.precondition
            ? { exists: write.precondition.exists }
            : { updateTime: write.precondition.updateTime }
          : undefined;

        if (write.delete) {
          return {
            delete: `${this.documentRoot()}/${encodePath(write.path)}`,
            ...(currentDocument ? { currentDocument } : {}),
          };
        }

        return {
          update: {
            name: `${this.documentRoot()}/${encodePath(write.path)}`,
            fields: encodeFields(write.data || {}),
          },
          ...(write.mergeFields?.length
            ? { updateMask: { fieldPaths: write.mergeFields } }
            : {}),
          ...(currentDocument ? { currentDocument } : {}),
        };
      }),
    };

    await this.request(
      `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
        this.config.projectId,
      )}/databases/(default)/documents:commit`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  }
}

export function createFirestoreRest(config: FirestoreConfig) {
  return new FirestoreRest(config);
}
