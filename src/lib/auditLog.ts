export async function logAudit(action: string, details: Record<string, unknown> = {}) {
  const entry = {
    id: `AUD${Date.now()}`,
    action,
    details,
    createdAt: new Date().toISOString(),
    userId: details.userId,
    outletId: details.outletId
  };

  if (window.electron?.readData && window.electron?.saveData) {
    try {
      const { data } = await window.electron.readData('audit-logs.json');
      const logs = Array.isArray(data) ? data : [];
      logs.unshift(entry);
      await window.electron.saveData('audit-logs.json', logs.slice(0, 5000));
    } catch (e) {
      console.warn('Failed to persist audit log', e);
    }
  }
}
