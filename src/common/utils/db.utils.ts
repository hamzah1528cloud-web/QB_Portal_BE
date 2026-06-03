export function mapDoc<T>(doc: any): T | null {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return { id: _id.toString(), ...rest } as unknown as T;
}

export function mapDocs<T>(docs: any[]): T[] {
  return docs.map((d) => mapDoc<T>(d)!);
}
