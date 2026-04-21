/**
 * Next.js Instrumentation Hook
 * Runs once when the server starts. Sets up a periodic interval
 * to check for upcoming routines/key dates and send push notifications.
 */
export async function register() {
  // Only run on the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Wait a few seconds for the server to fully start
    setTimeout(async () => {
      console.log('[Instrumentation] Starting background push notification checker (every 60s)...')

      const runCheck = async () => {
        try {
          const { checkAndSendNotifications } = await import('@/lib/push-check')
          const result = await checkAndSendNotifications()

          if (result.sent > 0) {
            console.log(
              `[PushCheck] Sent ${result.sent} notification(s) to ${result.checked} user(s).`
            )
          }
        } catch (error) {
          // Silently handle errors — the DB might not be ready yet on first boot
          console.error('[PushCheck] Error during periodic check:', error)
        }
      }

      // Run immediately, then every 60 seconds
      await runCheck()
      setInterval(runCheck, 60_000)
    }, 5000) // 5 second delay for server boot
  }
}
