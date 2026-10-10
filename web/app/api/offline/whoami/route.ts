import { currentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  return Response.json(
    { userId: user?.id ?? null },
    { headers: { 'cache-control': 'no-store' } },
  );
}
