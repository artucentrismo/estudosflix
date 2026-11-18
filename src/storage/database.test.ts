import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import {
  DATABASE_NAME,
  STORE_NAMES,
  closeDatabaseForTests,
  getAllRecords,
  getRecord,
  putRecord,
  deleteRecord,
  type BaseRecord,
} from "./database";

describe("EstudosFlix IndexedDB foundation", () => {
  beforeEach(async () => {
    await closeDatabaseForTests();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Database deletion blocked in test."));
    });
  });

  it("creates every version-one store", async () => {
    await putRecord("disciplines", {
      id: "discipline-1",
      name: "Matemática",
      ...timestamps(),
    } as BaseRecord);
    const request = indexedDB.open(DATABASE_NAME);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect([...db.objectStoreNames]).toEqual(expect.arrayContaining([...STORE_NAMES]));
    db.close();
  });

  it("persists, reads, lists and deletes a record", async () => {
    const record = { id: "d-1", name: "História", ...timestamps() };
    await putRecord("disciplines", record);
    expect(await getRecord("disciplines", "d-1")).toMatchObject({ id: "d-1", name: "História" });
    expect(await getAllRecords("disciplines")).toHaveLength(1);
    await deleteRecord("disciplines", "d-1");
    expect(await getRecord("disciplines", "d-1")).toBeUndefined();
  });

  it("stores settings by key", async () => {
    await putRecord("settings", { key: "theme", value: "light", updatedAt: new Date().toISOString() });
    expect(await getRecord("settings", "theme")).toMatchObject({ value: "light" });
  });
});

function timestamps() {
  const now = new Date().toISOString();
  return { createdAt: now, updatedAt: now };
}
