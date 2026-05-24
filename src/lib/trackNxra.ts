export async function trackNxraPlayers() {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (!projectId) return;

    try {
        await fetch(`https://${projectId}.supabase.co/functions/v1/nxr4-track`, {
            method: "POST",
            headers: {
                Accept: "application/json",
            },
        });
    } catch (error) {
        console.warn("Failed to trigger NXRA tracking", error);
    }
}
