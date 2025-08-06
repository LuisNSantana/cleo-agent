/**
 * Utility script to clean up messages with base64 content in the database
 * This helps reduce database size and prevents scroll issues
 */

export async function cleanupBase64Messages(supabase: any): Promise<void> {
  try {
    console.log("Starting cleanup of messages with base64 content...")

    // Find messages that contain base64 data
    const { data: messagesWithBase64, error: fetchError } = await supabase
      .from("messages")
      .select("id, content")
      .ilike("content", "%data:application/pdf%")
      .limit(100) // Process in batches

    if (fetchError) {
      console.error("Error fetching messages:", fetchError)
      return
    }

    if (!messagesWithBase64 || messagesWithBase64.length === 0) {
      console.log("No messages with base64 content found.")
      return
    }

    console.log(
      `Found ${messagesWithBase64.length} messages with base64 content`
    )

    // Clean up each message
    for (const message of messagesWithBase64) {
      try {
        let cleanContent = message.content

        // Remove base64 data URLs and replace with file placeholders
        cleanContent = cleanContent.replace(
          /data:application\/pdf;base64,[A-Za-z0-9+/=]+/g,
          "[PDF CONTENT REMOVED - ARCHIVO PROCESADO]"
        )

        cleanContent = cleanContent.replace(
          /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g,
          "[IMAGE CONTENT REMOVED - IMAGEN PROCESADA]"
        )

        // Truncate very long content
        if (cleanContent.length > 5000) {
          cleanContent =
            cleanContent.substring(0, 5000) +
            "\n\n[... CONTENIDO TRUNCADO PARA MEJORAR RENDIMIENTO ...]"
        }

        // Update the message
        const { error: updateError } = await supabase
          .from("messages")
          .update({ content: cleanContent })
          .eq("id", message.id)

        if (updateError) {
          console.error(`Error updating message ${message.id}:`, updateError)
        } else {
          console.log(`Cleaned message ${message.id}`)
        }
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error)
      }
    }

    console.log("Cleanup completed successfully")
  } catch (error) {
    console.error("Error during cleanup:", error)
  }
}

/**
 * Check if cleanup is needed (for automatic maintenance)
 */
export async function checkIfCleanupNeeded(supabase: any): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .ilike("content", "%data:application/pdf%")

    if (error) {
      console.error("Error checking for base64 messages:", error)
      return false
    }

    return (count || 0) > 0
  } catch (error) {
    console.error("Error in cleanup check:", error)
    return false
  }
}
