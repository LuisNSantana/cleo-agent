import {
  checkIfCleanupNeeded,
  cleanupBase64Messages,
} from "@/lib/cleanup-messages"
import { validateUserIdentity } from "@/lib/server/api"

export async function POST(req: Request) {
  try {
    const { userId, action } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: "User ID required" }), {
        status: 400,
      })
    }

    const supabase = await validateUserIdentity(userId, true) // Require authentication
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401 }
      )
    }

    if (action === "check") {
      const needsCleanup = await checkIfCleanupNeeded(supabase)
      return new Response(JSON.stringify({ needsCleanup }), { status: 200 })
    } else if (action === "cleanup") {
      await cleanupBase64Messages(supabase)
      return new Response(
        JSON.stringify({ success: true, message: "Cleanup completed" }),
        { status: 200 }
      )
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'check' or 'cleanup'" }),
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error in cleanup API:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    })
  }
}
