const SOCRATA_BASE = "https://data.cityofnewyork.us/resource/rbed-zzin.json";
const PAGE_SIZE = 1000;

export interface SocrataQuery {
  where: string;
  order?: string;
}

export interface SocrataResult<T> {
  rows: T[];
  /** From the X-SODA2-Truth-Last-Modified response header on the first page. */
  lastModified: string | null;
}

export async function fetchAllRows<T>(query: SocrataQuery): Promise<SocrataResult<T>> {
  const rows: T[] = [];
  const token = process.env.SOCRATA_APP_TOKEN;
  let offset = 0;
  let lastModified: string | null = null;

  for (;;) {
    const params = new URLSearchParams({
      $where: query.where,
      $order: query.order ?? "id,valuedate",
      $limit: String(PAGE_SIZE),
      $offset: String(offset),
    });

    const res = await fetch(`${SOCRATA_BASE}?${params.toString()}`, {
      headers: token ? { "X-App-Token": token } : undefined,
    });

    if (!res.ok) {
      throw new Error(`Socrata request failed: ${res.status} ${res.statusText} — ${await res.text()}`);
    }

    if (offset === 0) {
      lastModified = res.headers.get("x-soda2-truth-last-modified");
    }

    const page = (await res.json()) as T[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return { rows, lastModified };
}
