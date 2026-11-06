import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Checks the Prisma schema against the model rules in AGENTS.md ("Database"): where blocks go, primary
 * and foreign keys, foreign key and duplicate indexes, snake_case names, timestamps, Float, user ID
 * columns, and the pinned Prisma versions. Prisma validates the syntax; this checks what Prisma
 * accepts but the rules do not.
 */
const MODEL_FILES = globSync("prisma/models/*.prisma").toSorted();

const read = (path: string) => readFileSync(path, "utf8").replaceAll("\r\n", "\n");

type Field = { name: string; type: string; optional: boolean; list: boolean; attrs: string; doc: boolean };
type Model = { name: string; fields: Field[]; blockAttrs: string[] };

const BLOCK = /^(model|enum|view|type|generator|datasource)\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
const SNAKE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
const USER_ID = /^(userId|\w+UserId)$/;

/** The schema's top-level blocks: kind and name. */
const blocks = (schema: string) => [...schema.matchAll(BLOCK)].map(([, kind, name]) => ({ kind: kind!, name: name! }));

function models(schema: string): Model[] {
  return [...schema.matchAll(BLOCK)]
    .filter(([, kind]) => kind === "model")
    .map(([, , name, body]) => {
      const fields: Field[] = [];
      const blockAttrs: string[] = [];
      let doc = false;
      for (const raw of body!.split("\n")) {
        const line = raw.trim();
        if (line.startsWith("///")) {
          doc = true;
          continue;
        }
        const code = line.replace(/\/\/.*$/, "").trim();
        if (code.startsWith("@@")) blockAttrs.push(code);
        else {
          const match = /^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/.exec(code);
          if (match) {
            const [, fieldName, type, list, optional, attrs] = match;
            fields.push({ name: fieldName!, type: type!, list: !!list, optional: !!optional, attrs: attrs!, doc });
          }
        }
        if (code !== "") doc = false;
      }
      return { name: name!, fields, blockAttrs };
    });
}

/** Column lists of one kind of block attribute: @@index, @@unique, or @@id. */
function blockIndexes(model: Model, kind: "index" | "unique" | "id"): string[][] {
  const prefix = `@@${kind}(`;
  return model.blockAttrs
    .filter((attr) => attr.startsWith(prefix))
    .map((attr) => /\[([^\]]*)\]/.exec(attr)?.[1])
    .filter((list): list is string => list !== undefined)
    .map((list) => list.split(",").map((part) => part.trim().replace(/\(.*$/, "")));
}

/** The keys a model has besides plain indexes: @@unique, @@id, and fields marked @unique or @id. */
const keys = (model: Model): string[][] => [
  ...blockIndexes(model, "unique"),
  ...blockIndexes(model, "id"),
  ...model.fields.filter((field) => /@(unique|id)\b/.test(field.attrs)).map((field) => [field.name]),
];

/** Whether an index on `list` starts with `columns`, so it serves lookups by them. */
const startsWith = (list: string[], columns: string[]) => columns.every((column, index) => list[index] === column);

const hasIndexFor = (model: Model, columns: string[]) =>
  [...blockIndexes(model, "index"), ...keys(model)].some((list) => startsWith(list, columns));

/** Every rule broken by the models in this schema text, one message each. */
function violations(schema: string): string[] {
  const all = models(schema);
  const modelNames = new Set(all.map((model) => model.name));
  const found: string[] = [];
  if (/autoincrement\(\)/.test(schema)) found.push("autoincrement() IDs are guessable");
  if (/gen_random_uuid/.test(schema)) found.push("gen_random_uuid() is a v4 default; Prisma Client generates uuid(7)");

  for (const model of all) {
    const at = (field: string) => `${model.name}.${field}`;
    const map = model.blockAttrs.map((attr) => /^@@map\("([^"]*)"\)/.exec(attr)?.[1]).find(Boolean);
    if (!map || !SNAKE.test(map)) found.push(`${model.name}: needs @@map with a snake_case table name`);

    const ids = model.fields.filter((field) => /@id\b/.test(field.attrs));
    if (ids.length === 0 && !model.blockAttrs.some((attr) => attr.startsWith("@@id("))) {
      found.push(`${model.name}: has no primary key`);
    }
    for (const id of ids) {
      const exact =
        id.name === "id" &&
        id.type === "String" &&
        !id.optional &&
        /@default\(uuid\(7\)\)/.test(id.attrs) &&
        /@db\.Uuid\b/.test(id.attrs);
      if (!exact) found.push(`${at(id.name)}: the primary key is id String @id @default(uuid(7)) @db.Uuid`);
    }

    const foreignKeys = model.fields
      .map((field) => /@relation\([^)]*fields:\s*\[([^\]]*)\]/.exec(field.attrs)?.[1])
      .filter((list): list is string => list !== undefined)
      .map((list) => list.split(",").map((part) => part.trim()));
    const foreignKeyColumns = new Set(foreignKeys.flat());

    for (const columns of foreignKeys) {
      if (!hasIndexFor(model, columns)) found.push(`${at(columns.join(", "))}: a foreign key needs an index that starts with it`);
    }

    const plain = blockIndexes(model, "index");
    plain.forEach((columns, position) => {
      const others = [...keys(model), ...plain.filter((_, other) => other !== position)];
      if (others.some((list) => startsWith(list, columns))) {
        found.push(`${model.name}: @@index([${columns.join(", ")}]) repeats an index another one already starts with`);
      }
    });

    for (const field of model.fields) {
      if (modelNames.has(field.type)) continue;
      if (!SNAKE.test(field.name)) {
        const column = /@map\("([^"]*)"\)/.exec(field.attrs)?.[1];
        if (!column || !SNAKE.test(column)) found.push(`${at(field.name)}: needs @map with a snake_case column name`);
      }
      if (field.type === "DateTime" && !/@db\.Timestamptz\b/.test(field.attrs)) {
        found.push(`${at(field.name)}: DateTime needs @db.Timestamptz`);
      }
      if (field.type === "Float" && !field.doc) {
        found.push(`${at(field.name)}: Float needs a /// comment saying why an approximate value is enough; use Decimal otherwise`);
      }
      const uuidColumn = foreignKeyColumns.has(field.name) || USER_ID.test(field.name);
      if (uuidColumn && !(field.type === "String" && !field.list && /@db\.Uuid\b/.test(field.attrs))) {
        found.push(`${at(field.name)}: a foreign key or user ID column is String @db.Uuid`);
      }
      if (USER_ID.test(field.name)) {
        if (foreignKeyColumns.has(field.name)) found.push(`${at(field.name)}: a user ID has no relation`);
        else if (!hasIndexFor(model, [field.name])) found.push(`${at(field.name)}: a user ID column needs an index`);
      }
    }
  }
  return found;
}

describe("Prisma model rules", () => {
  it("keep generator and datasource in schema.prisma, and only models and enums in prisma/models/", () => {
    expect(blocks(read("prisma/schema.prisma")).map(({ kind }) => kind).toSorted()).toEqual(["datasource", "generator"]);
    const misplaced = MODEL_FILES.flatMap((file) =>
      blocks(read(file))
        .filter(({ kind }) => kind !== "model" && kind !== "enum")
        .map(({ kind, name }) => `${file}: ${kind} ${name}`),
    );
    expect(misplaced).toEqual([]);
  });

  it.each(MODEL_FILES)("%s follows the model rules", (file) => {
    expect(violations(read(file))).toEqual([]);
  });

  it("pin prisma, @prisma/client, and @prisma/adapter-pg to the same exact version", () => {
    const { dependencies = {}, devDependencies = {} } = JSON.parse(read("package.json"));
    const versions = ["prisma", "@prisma/client", "@prisma/adapter-pg"].map(
      (name) => dependencies[name] ?? devDependencies[name],
    );
    expect(versions[0]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(new Set(versions)).toEqual(new Set([versions[0]]));
  });
});

describe("the model rule check", () => {
  const VALID = `
model Owner {
  id        String   @id @default(uuid(7)) @db.Uuid
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  userId    String   @map("user_id") @db.Uuid
  items     Item[]

  @@index([userId])
  @@map("owners")
}

model Item {
  id      String  @id @default(uuid(7)) @db.Uuid
  ownerId String  @map("owner_id") @db.Uuid
  owner   Owner   @relation(fields: [ownerId], references: [id])
  price   Decimal @db.Decimal(12, 2)
  /// A sensor reading; an approximate value is enough.
  reading Float?

  @@index([ownerId])
  @@map("items")
}
`;

  it("accepts models that follow the rules", () => {
    expect(violations(VALID)).toEqual([]);
  });

  it.each([
    ["an autoincrement ID", "model A {\n  id Int @id @default(autoincrement())\n  @@map(\"a\")\n}", "autoincrement"],
    ["a v4 UUID default", 'model A {\n  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n  @@map("a")\n}', "gen_random_uuid"],
    ["a uuid() v4 key", 'model A {\n  id String @id @default(uuid()) @db.Uuid\n  @@map("a")\n}', "primary key"],
    ["a key without @db.Uuid", 'model A {\n  id String @id @default(uuid(7))\n  @@map("a")\n}', "primary key"],
    ["no primary key", 'model A {\n  name String\n  @@map("a")\n}', "no primary key"],
    ["no @@map", "model A {\n  id String @id @default(uuid(7)) @db.Uuid\n}", "@@map"],
    ["a camelCase table name", 'model A {\n  id String @id @default(uuid(7)) @db.Uuid\n  @@map("someTable")\n}', "@@map"],
    ["a camelCase column without @map", 'model A {\n  id String @id @default(uuid(7)) @db.Uuid\n  displayName String\n  @@map("a")\n}', "A.displayName: needs @map"],
    ["DateTime without Timestamptz", 'model A {\n  id String @id @default(uuid(7)) @db.Uuid\n  seen DateTime\n  @@map("a")\n}', "Timestamptz"],
    ["Float without a reason", 'model A {\n  id String @id @default(uuid(7)) @db.Uuid\n  amount Float\n  @@map("a")\n}', "Float"],
    ["Float with only a // comment", 'model A {\n  id String @id @default(uuid(7)) @db.Uuid\n  // approximate\n  amount Float\n  @@map("a")\n}', "Float"],
    ["a user ID without @db.Uuid", 'model A {\n  id String @id @default(uuid(7)) @db.Uuid\n  userId String @map("user_id")\n  @@index([userId])\n  @@map("a")\n}', "String @db.Uuid"],
    ["a user ID without an index", 'model A {\n  id String @id @default(uuid(7)) @db.Uuid\n  ownerUserId String @map("owner_user_id") @db.Uuid\n  @@map("a")\n}', "needs an index"],
    [
      "a user ID with a relation",
      'model A {\n  id String @id @default(uuid(7)) @db.Uuid\n  userId String @map("user_id") @db.Uuid\n  user B @relation(fields: [userId], references: [id])\n  @@index([userId])\n  @@map("a")\n}\nmodel B {\n  id String @id @default(uuid(7)) @db.Uuid\n  as A[]\n  @@map("b")\n}',
      "a user ID has no relation",
    ],
  ])("rejects %s", (_, schema, message) => {
    expect(violations(schema).join("\n")).toContain(message);
  });

  it.each([
    ["a foreign key without an index", VALID.replace("  @@index([ownerId])\n", ""), "Item.ownerId: a foreign key needs an index that starts with it"],
    ["a foreign key that is not a UUID", VALID.replace('ownerId String  @map("owner_id") @db.Uuid', 'ownerId Int @map("owner_id")'), "Item.ownerId: a foreign key or user ID column"],
    ["an index that starts with another column", VALID.replace("@@index([ownerId])", "@@index([price, ownerId])"), "a foreign key needs an index that starts with it"],
    ["a second index on a key column", VALID.replace("@@index([ownerId])", "@@index([ownerId])\n  @@unique([ownerId, price])"), "@@index([ownerId]) repeats an index"],
    ["the same index twice", VALID.replace("@@index([ownerId])", "@@index([ownerId])\n  @@index([ownerId])"), "@@index([ownerId]) repeats an index"],
    ["an index on a one-to-one key", VALID.replace('ownerId String  @map("owner_id")', 'ownerId String  @unique @map("owner_id")'), "@@index([ownerId]) repeats an index"],
  ])("rejects %s", (_, schema, message) => {
    expect(violations(schema).join("\n")).toContain(message);
  });

  it.each([
    [
      "a one-to-one key marked @unique",
      VALID.replace("  @@index([ownerId])\n", "").replace('ownerId String  @map("owner_id")', 'ownerId String  @unique @map("owner_id")'),
    ],
    ["a composite unique key that starts with the foreign key", VALID.replace("@@index([ownerId])", "@@unique([ownerId, price])")],
    ["a wider index that starts with the foreign key", VALID.replace("@@index([ownerId])", "@@index([ownerId, price])")],
  ])("accepts %s as the foreign key index", (_, schema) => {
    expect(violations(schema)).toEqual([]);
  });
});
