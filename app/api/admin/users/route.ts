import { NextRequest, NextResponse } from 'next/server';
import { requireRole, createServerSupabaseClient } from '@/lib/auth';

/**
 * GET /api/admin/users
 *
 * Get all users (admin only)
 */
export async function GET(request: NextRequest) {
  const user = await requireRole(request, ['admin']);
  if (user instanceof NextResponse) return user;

  try {
    const supabase = createServerSupabaseClient();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Get users with subscription info
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        *,
        subscription:subscriptions(plan_type, status)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Get total count
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: totalUsers || 0,
        totalPages: Math.ceil((totalUsers || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
