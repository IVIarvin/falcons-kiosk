import type { Database } from './db';
import { assert } from './errors';
type ExtraAction = 'freeCheckout' | 'reservePatch' | 'confirmPatchOrder';
export async function replayRequest<T>(
  db: Database,
  userId: string,
  action: ExtraAction,
  key: string,
  hash: string,
): Promise<T | undefined> {
  const [row] = await db.query<{ request_hash: string; result: T }>(
    'SELECT request_hash,result FROM extra_requests WHERE user_id=$1 AND action=$2 AND idempotency_key=$3',
    [userId, action, key],
  );
  if (!row) return undefined;
  assert(row.request_hash === hash, 'Cette confirmation appartient à une autre opération.');
  return row.result;
}
export async function saveRequest(
  db: Database,
  userId: string,
  action: ExtraAction,
  key: string,
  hash: string,
  result: unknown,
) {
  await db.query(
    'INSERT INTO extra_requests(user_id,action,idempotency_key,request_hash,result) VALUES($1,$2,$3,$4,$5)',
    [userId, action, key, hash, JSON.stringify(result)],
  );
}
