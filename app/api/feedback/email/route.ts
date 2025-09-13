import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { message, userId } = await req.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 })
    }

    const TO = process.env.FEEDBACK_EMAIL_TO || "information@huminarylabs.com"
    const HOST = process.env.SMTP_HOST
    const PORT = process.env.SMTP_PORT
    const USER = process.env.SMTP_USER
    const PASS = process.env.SMTP_PASS
    const FROM = process.env.EMAIL_FROM || "Cleo Feedback <no-reply@cleo-agent.com>"

    // If SMTP not configured, no-op (still return 200 so UI stays snappy)
    if (!HOST || !PORT || !USER || !PASS) {
      console.warn("Feedback email skipped: SMTP env not configured")
      return NextResponse.json({ ok: true, emailed: false })
    }

  const { createTransport } = await import("nodemailer")
  const transporter = createTransport({
      host: HOST,
      port: Number(PORT),
      secure: Number(PORT) === 465, // true for 465, false for others
      auth: { user: USER, pass: PASS },
    })

    const subject = `New Cleo feedback${userId ? ` from ${userId}` : ""}`
    const text = `Feedback received\n\nUser: ${userId || "anonymous"}\n\nMessage:\n${message}`

    await transporter.sendMail({
      from: FROM,
      to: TO,
      subject,
      text,
    })

    return NextResponse.json({ ok: true, emailed: true })
  } catch (err) {
    console.error("Feedback email error", err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
