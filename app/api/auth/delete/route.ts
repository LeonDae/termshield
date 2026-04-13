import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize a supabase admin client with the service role key
// to bypass Row Level Security and delete users.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: Request) {
  try {
    // 1. We need to verify the user making the request.
    // The client should send the token in the Authorization header.
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    // Initialize regular client to verify token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized or invalid token' }, { status: 401 });
    }

    // 2. Now use admin client to delete the user
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
