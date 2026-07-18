// src/sync.ts
import { supabase } from './supabase';
import { db, type Flashcard } from './db';

// Helper: Translate Cloud Data -> Local Format
function mapToLocal(remote: any): Flashcard {
  return {
    id: remote.id,
    question: remote.question,
    answer: remote.answer,
    tags: remote.tags,
    lastReviewed: new Date(remote.last_reviewed),
    updatedAt: new Date(remote.updated_at).getTime(),
    isDeleted: remote.is_deleted
  };
}

// Helper: Translate Local Data -> Cloud Format
function mapToRemote(local: Flashcard, userId: string): any {
  return {
    id: local.id,
    user_id: userId, // We inject the secure user ID here
    question: local.question,
    answer: local.answer,
    tags: local.tags,
    last_reviewed: local.lastReviewed.toISOString(),
    updated_at: new Date(local.updatedAt).toISOString(),
    is_deleted: local.isDeleted
  };
}

export async function syncDatabase() {
  // 1. Get the securely authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No active session');
  
  const userId = session.user.id;

  // 2. Fetch all cloud records for this specific user
  const { data: remoteCards, error } = await supabase
    .from('cards')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new Error('Failed to fetch from cloud');

  // 3. Fetch all local records
  const localCards = await db.cards.toArray();

  // 4. Create lookup maps for blazing fast O(1) comparison
  const remoteMap = new Map(remoteCards?.map(card => [card.id, card]));
  const localMap = new Map(localCards.map(card => [card.id, card]));

  const toPush: any[] = [];
  const toPull: Flashcard[] = [];

  // 5. Compare Local vs Cloud
  for (const local of localCards) {
    const remote = remoteMap.get(local.id);
    
    if (!remote) {
      // Exists locally but not in cloud -> Push
      toPush.push(mapToRemote(local, userId));
    } else {
      // Exists in both -> Compare timestamps
      const remoteTime = new Date(remote.updated_at).getTime();
      if (local.updatedAt > remoteTime) {
        toPush.push(mapToRemote(local, userId)); // Local is newer
      } else if (remoteTime > local.updatedAt) {
        toPull.push(mapToLocal(remote)); // Cloud is newer
      }
    }
  }

  // 6. Find records that ONLY exist in the cloud
  for (const remote of remoteCards || []) {
    if (!localMap.has(remote.id)) {
      toPull.push(mapToLocal(remote));
    }
  }

  // 7. Execute Pull (Bulk update Local DB)
  if (toPull.length > 0) {
    await db.cards.bulkPut(toPull);
  }

  // 8. Execute Push (Bulk Upsert Cloud DB)
  if (toPush.length > 0) {
    const { error: pushError } = await supabase
      .from('cards')
      .upsert(toPush); 

    if (pushError) throw new Error('Failed to push to cloud');
  }
  
  return { pushed: toPush.length, pulled: toPull.length };
}