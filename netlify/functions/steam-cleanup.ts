import { getStore } from '@netlify/blobs';
export const config = { schedule: '17 * * * *' };
export default async () => {
  const store = getStore({ name: 'steam-oauth', consistency: 'strong' });
  const now = Math.floor(Date.now() / 1000);
  for await (const page of store.list({ paginate: true })) {
    const expired = page.blobs.filter(
      (blob) =>
        /^(flow|nonce|code|token)\/\d+\//.test(blob.key) &&
        Number(blob.key.split('/')[1]) < now - 60,
    );
    for (let offset = 0; offset < expired.length; offset += 20)
      await Promise.all(
        expired
          .slice(offset, offset + 20)
          .map((blob) => store.delete(blob.key)),
      );
  }
  return new Response(null, { status: 204 });
};
