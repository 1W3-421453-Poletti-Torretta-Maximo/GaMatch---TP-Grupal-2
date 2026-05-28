export function parseNeo4jValue(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'object' && typeof obj.toNumber === 'function') {
    return obj.toNumber();
  }
  if (Array.isArray(obj)) {
    return obj.map(parseNeo4jValue);
  }
  if (typeof obj === 'object') {
    const result: any = {};
    for (const key in obj) {
      result[key] = parseNeo4jValue(obj[key]);
    }
    return result;
  }
  return obj;
}
