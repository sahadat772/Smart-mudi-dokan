type Data = Record<string, any>;

const DELETE_FIELD = Symbol("delete-field");

export class FakeTimestamp {
  private readonly value: Date;
  constructor(value: Date) { this.value = value; }
  toDate() { return new Date(this.value); }
  toISOString() { return this.value.toISOString(); }
  valueOf() { return this.value.valueOf(); }
}

function cloneValue(value: any): any {
  if (value instanceof FakeTimestamp) return new FakeTimestamp(value.toDate());
  if (value instanceof Date) return new Date(value);
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    const out: Data = {};
    for (const [key, item] of Object.entries(value)) out[key] = cloneValue(item);
    return out;
  }
  return value;
}

function normalizeWrite(value: any): any {
  const typeName = value?.constructor?.name || "";
  if (typeName === "ServerTimestampTransform") return new FakeTimestamp(new Date());
  if (typeName === "DeleteTransform") return DELETE_FIELD;
  if (value instanceof FakeTimestamp) return new FakeTimestamp(value.toDate());
  if (value instanceof Date) return new FakeTimestamp(value);
  if (Array.isArray(value)) return value.map(normalizeWrite);
  if (value && typeof value === "object") {
    const out: Data = {};
    for (const [key, item] of Object.entries(value)) {
      const normalized = normalizeWrite(item);
      if (normalized !== DELETE_FIELD) out[key] = normalized;
    }
    return out;
  }
  return value;
}

function compareValues(left: any, right: any): number {
  const toComparable = (value: any) => {
    if (value instanceof FakeTimestamp) return value.toDate().valueOf();
    if (value instanceof Date) return value.valueOf();
    if (value && typeof value.toDate === "function") return value.toDate().valueOf();
    return value;
  };
  const a = toComparable(left);
  const b = toComparable(right);
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export class FakeSnapshot {
  readonly exists: boolean;
  readonly id: string;
  private readonly value?: Data;
  constructor(id: string, value?: Data) {
    this.id = id;
    this.value = value;
    this.exists = value !== undefined;
  }
  data() { return this.value === undefined ? undefined : cloneValue(this.value); }
}

class FakeQuerySnapshot {
  readonly docs: FakeSnapshot[];
  readonly size: number;
  readonly empty: boolean;
  constructor(docs: FakeSnapshot[]) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
}

export class FakeDocumentReference {
  readonly db: InMemoryFirestore;
  readonly collectionName: string;
  readonly id: string;
  constructor(db: InMemoryFirestore, collectionName: string, id: string) {
    this.db = db;
    this.collectionName = collectionName;
    this.id = id;
  }
  async get() { return this.db.getDocument(this.collectionName, this.id); }
  async set(data: Data, options?: { merge?: boolean }) { this.db.setDocument(this.collectionName, this.id, data, options); }
  async create(data: Data) { this.db.createDocument(this.collectionName, this.id, data); }
  async update(data: Data) { this.db.updateDocument(this.collectionName, this.id, data); }
  async delete() { this.db.deleteDocument(this.collectionName, this.id); }
}

class FakeQuery {
  protected readonly db: InMemoryFirestore;
  protected readonly collectionName: string;
  protected readonly filters: Array<[string, string, any]>;
  protected readonly ordering: Array<[string, "asc" | "desc"]>;
  protected readonly maxItems: number;
  constructor(
    db: InMemoryFirestore,
    collectionName: string,
    filters: Array<[string, string, any]> = [],
    ordering: Array<[string, "asc" | "desc"]> = [],
    maxItems = Number.POSITIVE_INFINITY,
  ) {
    this.db = db;
    this.collectionName = collectionName;
    this.filters = filters;
    this.ordering = ordering;
    this.maxItems = maxItems;
  }

  where(field: string, op: string, value: any) {
    return new FakeQuery(this.db, this.collectionName, [...this.filters, [field, op, value]], this.ordering, this.maxItems);
  }
  orderBy(field: string, direction: "asc" | "desc" = "asc") {
    return new FakeQuery(this.db, this.collectionName, this.filters, [...this.ordering, [field, direction]], this.maxItems);
  }
  limit(maxItems: number) {
    return new FakeQuery(this.db, this.collectionName, this.filters, this.ordering, maxItems);
  }
  async get() {
    let rows = this.db.listCollection(this.collectionName).filter(({ data }) =>
      this.filters.every(([field, op, expected]) => {
        const actual = data[field];
        const comparison = compareValues(actual, expected);
        if (op === "==") return actual === expected || comparison === 0;
        if (op === ">=") return comparison >= 0;
        if (op === "<=") return comparison <= 0;
        if (op === ">") return comparison > 0;
        if (op === "<") return comparison < 0;
        return false;
      }),
    );
    if (this.ordering.length) {
      rows = rows.sort((a, b) => {
        for (const [field, direction] of this.ordering) {
          const comparison = compareValues(a.data[field], b.data[field]);
          if (comparison) return direction === "asc" ? comparison : -comparison;
        }
        return 0;
      });
    }
    return new FakeQuerySnapshot(rows.slice(0, this.maxItems).map((row) => new FakeSnapshot(row.id, row.data)));
  }
}

class FakeCollectionReference extends FakeQuery {
  private nextId = 0;
  readonly collectionName: string;
  constructor(db: InMemoryFirestore, collectionName: string) {
    super(db, collectionName);
    this.collectionName = collectionName;
  }
  doc(id?: string) {
    const actualId = id || `${this.collectionName}-test-${++this.nextId}`;
    return new FakeDocumentReference(this.db, this.collectionName, actualId);
  }
  async add(data: Data) {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }
}

class FakeTransaction {
  private writes: Array<{ kind: string; ref: FakeDocumentReference; data?: Data; merge?: boolean }> = [];
  private readonly db: InMemoryFirestore;
  constructor(db: InMemoryFirestore) { this.db = db; }
  async get(ref: FakeDocumentReference) { return ref.get(); }
  set(ref: FakeDocumentReference, data: Data, options?: { merge?: boolean }) {
    this.writes.push({ kind: "set", ref, data, merge: options?.merge });
    return this;
  }
  create(ref: FakeDocumentReference, data: Data) {
    this.writes.push({ kind: "create", ref, data });
    return this;
  }
  update(ref: FakeDocumentReference, data: Data) {
    this.writes.push({ kind: "update", ref, data, merge: true });
    return this;
  }
  delete(ref: FakeDocumentReference) {
    this.writes.push({ kind: "delete", ref });
    return this;
  }
  commit() {
    for (const write of this.writes) {
      if (write.kind === "create") this.db.createDocument(write.ref.collectionName, write.ref.id, write.data || {});
      else if (write.kind === "update") this.db.updateDocument(write.ref.collectionName, write.ref.id, write.data || {});
      else if (write.kind === "delete") this.db.deleteDocument(write.ref.collectionName, write.ref.id);
      else this.db.setDocument(write.ref.collectionName, write.ref.id, write.data || {}, { merge: write.merge });
    }
  }
}

export class InMemoryFirestore {
  private readonly documents = new Map<string, Data>();

  collection(name: string) { return new FakeCollectionReference(this, name); }
  key(collectionName: string, id: string) { return `${collectionName}/${id}`; }
  seed(collectionName: string, id: string, data: Data) {
    this.documents.set(this.key(collectionName, id), normalizeWrite(data));
  }
  read(collectionName: string, id: string) {
    const value = this.documents.get(this.key(collectionName, id));
    return value === undefined ? undefined : cloneValue(value);
  }
  dump(collectionName: string) {
    return this.listCollection(collectionName).map(({ id, data }) => ({ id, data: cloneValue(data) }));
  }
  getDocument(collectionName: string, id: string) {
    return new FakeSnapshot(id, this.read(collectionName, id));
  }
  listCollection(collectionName: string) {
    const prefix = `${collectionName}/`;
    return [...this.documents.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, data]) => ({ id: key.slice(prefix.length), data: cloneValue(data) }));
  }
  setDocument(collectionName: string, id: string, data: Data, options?: { merge?: boolean }) {
    const key = this.key(collectionName, id);
    const normalized = normalizeWrite(data);
    const next = options?.merge ? { ...(this.documents.get(key) || {}), ...normalized } : normalized;
    for (const [field, value] of Object.entries(next)) if (value === DELETE_FIELD) delete next[field];
    this.documents.set(key, next);
  }
  createDocument(collectionName: string, id: string, data: Data) {
    if (this.documents.has(this.key(collectionName, id))) throw new Error("Document already exists.");
    this.setDocument(collectionName, id, data);
  }
  updateDocument(collectionName: string, id: string, data: Data) {
    const key = this.key(collectionName, id);
    if (!this.documents.has(key)) throw new Error("Document does not exist.");
    this.setDocument(collectionName, id, data, { merge: true });
  }
  deleteDocument(collectionName: string, id: string) { this.documents.delete(this.key(collectionName, id)); }
  async runTransaction<T>(operation: (tx: FakeTransaction) => Promise<T>) {
    const tx = new FakeTransaction(this);
    const result = await operation(tx);
    tx.commit();
    return result;
  }
  batch() {
    const tx = new FakeTransaction(this);
    return {
      set: (ref: FakeDocumentReference, data: Data) => { tx.set(ref, data); return this; },
      commit: async () => tx.commit(),
    };
  }
}

export function plain(value: any): any {
  if (value instanceof FakeTimestamp) return value.toISOString();
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]));
  }
  return value;
}

