/**
 * Dyrected SDK caps collection.find() queries at a maximum of 100 documents per page.
 * This utility iterates through all pages (using parallel fetching for remaining pages)
 * to retrieve the complete dataset.
 */
export async function fetchAllDocs(client: any, slug: string, options: any = {}): Promise<any[]> {
  try {
    const firstRes = await client.collection(slug).find({
      ...options,
      limit: 100,
      page: 1,
    });
    const firstDocs = Array.isArray(firstRes) ? firstRes : (firstRes?.docs || []);
    const totalPages = Number(firstRes?.totalPages) || 1;

    if (totalPages <= 1 || firstDocs.length < 100) {
      return firstDocs;
    }

    const pagePromises: Promise<any[]>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(
        (async (pageNumber: number) => {
          try {
            const pageRes = await client.collection(slug).find({
              ...options,
              limit: 100,
              page: pageNumber,
            });
            return Array.isArray(pageRes) ? pageRes : (pageRes?.docs || []);
          } catch (err) {
            console.error(`Error fetching page ${pageNumber} of ${slug}:`, err);
            return [];
          }
        })(p)
      );
    }

    const pagesDocs = await Promise.all(pagePromises);
    return firstDocs.concat(...pagesDocs);
  } catch (err) {
    console.error(`Failed to fetch all docs from ${slug}:`, err);
    return [];
  }
}
