import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    // Verify the token using a regular client with the anon key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized or invalid token' }, { status: 401 });
    }

    // Use the shared admin client (service role) to delete the user
    const supabaseAdmin = createSupabaseServerClient();
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("Failed to delete user:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Account deleted" });
  } catch (error: any) {
    console.error("Error in delete account route:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
