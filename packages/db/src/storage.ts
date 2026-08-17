export interface PrivateEvidenceStorage {
  put(input: { key: string; bytes: Uint8Array; contentType?: string }): Promise<{ key: string }>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
}
export class NotConfiguredStorage implements PrivateEvidenceStorage {
  async put(input: { key: string }): Promise<{ key: string }> { return { key: input.key }; }
  async get(_key: string): Promise<Uint8Array> { throw new Error("Private evidence storage is not configured"); }
  async delete(_key: string): Promise<void> {}
}
