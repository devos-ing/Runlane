import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { StorageWrite } from "@earendil-works/pi-durable";
import {
  type SqliteDatabase,
  type SqliteStatement,
  SqliteStorage,
  type SqliteValue,
} from "@earendil-works/pi-durable/storage/sqlite";
import {
  active,
  type JsonObject,
  RunlaneError,
  type RunRecord,
  type TraceEvent,
  type Workspace,
} from "./types.ts";

/** Adapts Bun's synchronous database to Pi durable's public storage facade. */
function database(path: string): SqliteDatabase {
  const db = new Database(path, { create: true, strict: true });
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;",
  );
  return {
    /** Executes storage schema and transaction SQL. */
    exec(sql) {
      db.exec(sql);
    },
    /** Wraps a reusable Bun statement with Pi durable's generic read interface. */
    prepare(sql): SqliteStatement {
      const statement = db.prepare(sql);
      return {
        /** Runs a mutation with positional bindings. */
        run(...params: SqliteValue[]) {
          statement.run(...params);
        },
        /** Returns one detached database row when present. */
        get<T extends object>(...params: SqliteValue[]) {
          return (statement.get(...params) ?? undefined) as T | undefined;
        },
        /** Returns all matching database rows. */
        all<T extends object>(...params: SqliteValue[]) {
          return statement.all(...params) as T[];
        },
      };
    },
    /** Commits a synchronous batch or rolls the entire batch back. */
    transaction<T>(callback: () => T): T {
      return db.transaction(callback).immediate();
    },
    /** Flushes the WAL and releases the database handle. */
    close() {
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      db.close();
    },
  };
}

/** Stores workspace and run checkpoints using Pi durable atomic document writes. */
export class RunStore {
  private readonly documents = new Map<
    string,
    { storageId: number; value: Workspace | RunRecord }
  >();
  private writes: Promise<unknown> = Promise.resolve();

  /** Retains the one storage owner used by all service mutations. */
  private constructor(private readonly storage: SqliteStorage) {}

  /** Opens durable records and reconstructs the service's current snapshots. */
  static async open(path: string): Promise<RunStore> {
    const storage = await SqliteStorage.open(database(path));
    const store = new RunStore(storage);
    let cursor;
    do {
      const page = await storage.scanDocuments(
        { scope: { kind: "session" }, at: "current" },
        cursor,
        100,
        BACKGROUND_CONTEXT,
      );
      for (const record of page.items) {
        if (record.kind !== "workspace" && record.kind !== "run") continue;
        const document = await storage.document(
          record.id,
          "current",
          BACKGROUND_CONTEXT,
        );
        if (
          !document ||
          document.version !== 1 ||
          typeof document.value.id !== "string"
        ) {
          throw new RunlaneError(
            "STORE_VERSION",
            "Stored data is not supported by this Runlane version.",
            500,
          );
        }
        store.documents.set(document.value.id, {
          storageId: record.id,
          value: document.value as Workspace | RunRecord,
        });
      }
      cursor = page.next;
    } while (cursor);
    return store;
  }

  /** Serializes a mutation and leaves reads unchanged until its commit succeeds. */
  private mutate<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.writes.then(operation);
    this.writes = next.catch(() => {});
    return next;
  }

  /** Persists one complete record, including its transition and event history. */
  private async persist(
    kind: "workspace" | "run",
    value: Workspace | RunRecord,
  ): Promise<void> {
    const existing = this.documents.get(value.id);
    const storageId = existing?.storageId ?? (await this.storage.mintId());
    const content = {
      version: 1,
      kind: "base" as const,
      value: JSON.parse(JSON.stringify(value)),
    };
    const write: StorageWrite = existing
      ? { type: "document.change", id: storageId, content }
      : {
          type: "document.create",
          record: {
            id: storageId,
            kind,
            key: value.id,
            scope: { kind: "session" },
          },
          content,
        };
    await this.storage.commit([write], BACKGROUND_CONTEXT);
    this.documents.set(value.id, { storageId, value: structuredClone(value) });
  }

  /** Returns registered workspaces without sharing mutable storage objects. */
  workspaces(): Workspace[] {
    return [...this.documents.values()]
      .filter(({ value }) => value.id.startsWith("ws_"))
      .map(({ value }) => structuredClone(value as Workspace));
  }

  /** Resolves one workspace or reports an unknown identity. */
  workspace(id: string): Workspace {
    const value = this.workspaces().find((workspace) => workspace.id === id);
    if (!value)
      throw new RunlaneError(
        "WORKSPACE_NOT_FOUND",
        "Workspace not found.",
        404,
      );
    return value;
  }

  /** Registers a canonical root once while retaining its stable workspace identity. */
  addWorkspace(root: string, name: string): Promise<Workspace> {
    return this.mutate(async () => {
      const existing = this.workspaces().find(
        (workspace) => workspace.root === root,
      );
      if (existing) return existing;
      const value = { id: `ws_${randomUUID()}`, root, name };
      await this.persist("workspace", value);
      return value;
    });
  }

  /** Returns current run snapshots, optionally restricted to a workspace. */
  runs(workspaceId?: string): RunRecord[] {
    return [...this.documents.values()]
      .filter(({ value }) => value.id.startsWith("run_"))
      .map(({ value }) => structuredClone(value as RunRecord))
      .filter((run) => !workspaceId || run.workspaceId === workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Reads a run without exposing the store's mutable checkpoint. */
  run(id: string): RunRecord {
    const record = this.documents.get(id);
    if (!record || !id.startsWith("run_"))
      throw new RunlaneError("RUN_NOT_FOUND", "Run not found.", 404);
    return structuredClone(record.value as RunRecord);
  }

  /** Commits a submitted run before the service returns its identity. */
  createRun(run: RunRecord): Promise<void> {
    return this.mutate(async () => {
      if (this.documents.has(run.id))
        throw new RunlaneError("DUPLICATE_RUN", "Run already exists.", 409);
      await this.persist("run", run);
    });
  }

  /** Applies one transition and its events atomically to the latest checkpoint. */
  updateRun(id: string, change: (run: RunRecord) => void): Promise<RunRecord> {
    return this.mutate(async () => {
      const run = this.run(id);
      change(run);
      run.updatedAt = new Date().toISOString();
      await this.persist("run", run);
      return run;
    });
  }

  /** Records service interruption without replaying unfinished invocations. */
  async recover(): Promise<void> {
    for (const run of this.runs().filter((run) => active(run.status))) {
      await this.updateRun(run.id, (current) => {
        current.status = "interrupted";
        appendEvent(current, "run.interrupted", {
          reason: "service_restarted",
        });
      });
    }
  }

  /** Finishes queued storage mutations before closing Pi durable. */
  async close(): Promise<void> {
    await this.writes;
    await this.storage.close(BACKGROUND_CONTEXT);
  }
}

/** Appends an attributable lifecycle fact inside the owning run checkpoint. */
export function appendEvent(
  run: RunRecord,
  type: string,
  data: JsonObject = {},
): TraceEvent {
  const event = {
    seq: run.events.length + 1,
    at: new Date().toISOString(),
    type,
    data,
  };
  run.events.push(event);
  return event;
}
