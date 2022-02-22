export function splitToBulks<T>(arr: T[], bulkSize = 20): T[][] {
  const bulks: T[][] = [];
  for (let i = 0; i < Math.ceil(arr.length / bulkSize); i++) {
    bulks.push(arr.slice(i * bulkSize, (i + 1) * bulkSize));
  }
  return bulks;
}
