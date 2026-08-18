export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.VERCEL) {
    console.log('[Cron Engine] Starting internal Node.js polling for Docker environment');
    
    // Ping the reminders cron route every 60 seconds
    setInterval(async () => {
      try {
        const res = await fetch('http://localhost:3000/api/cron/reminders');
        if (!res.ok) {
          console.error('[Cron Engine] Failed to trigger reminders API');
        }
      } catch (e) {
        // Silent catch: Next.js might still be booting up during the first few seconds
      }
    }, 60000); // 1 minute
  }
}
