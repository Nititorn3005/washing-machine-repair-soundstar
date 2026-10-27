import { supabase } from './supabase';

export async function getSnapshot() {
  const [jobs, items, staff, parts, txs] = await Promise.all([
    supabase.from('repair_jobs').select('*').order('created_at', { ascending: false }),
    supabase.from('inventory_items').select('*').order('name'),
    supabase.from('staff').select('id, name, username, role, created_at'),
    supabase.from('repair_job_parts').select('*'),
    supabase.from('inventory_transactions').select('*').order('created_at', { ascending: false })
  ]);

  return {
    jobs: jobs.data || [],
    inventory: items.data || [],
    staff: staff.data || [],
    jobParts: parts.data || [],
    transactions: txs.data || []
  };
}

export async function createJob(jobData: any) {
  const { data, error } = await supabase
    .from('repair_jobs')
    .insert([jobData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateJob(id: string, updates: any) {
  const { data, error } = await supabase
    .from('repair_jobs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function issueJobPart(jobId: string, partId: string, quantity: number, reason: string) {
  const { data, error } = await supabase.rpc('issue_job_part_safe', {
    p_job_id: jobId,
    p_part_id: partId,
    p_qty: quantity,
    p_reason: reason
  });

  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.message);
  return data;
}

export async function savePart(partData: any) {
  const { data, error } = await supabase
    .from('inventory_items')
    .upsert([partData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function recordMovement(partId: string, type: 'IN' | 'OUT' | 'ADJUST', quantity: number, reason: string) {
  // ดึงยอดปัจจุบันก่อนปรับ
  const { data: item } = await supabase.from('inventory_items').select('stock_qty').eq('id', partId).single();
  if (!item) throw new Error('ไม่พบอะไหล่');

  let newQty = item.stock_qty;
  if (type === 'IN') newQty += quantity;
  else if (type === 'OUT') {
    if (item.stock_qty < quantity) throw new Error('อะไหล่ในสต๊อกไม่พอ');
    newQty -= quantity;
  } else if (type === 'ADJUST') newQty = quantity;

  await supabase.from('inventory_items').update({ stock_qty: newQty, updated_at: new Date().toISOString() }).eq('id', partId);
  const { data, error } = await supabase.from('inventory_transactions').insert([{ part_id: partId, type, quantity, reason }]).select().single();
  
  if (error) throw new Error(error.message);
  return data;
}
