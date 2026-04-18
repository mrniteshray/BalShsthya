import fs from 'fs';
import path from 'path';

// Returns saved contact messages from uploads/contact_messages
export default async function listContactMessages(req, res) {
  // Allow only in development by default, or when an ADMIN_SECRET matches
  const adminSecret = process.env.ADMIN_SECRET;
  const provided = req.headers['x-admin-secret'];

  if (process.env.NODE_ENV !== 'development') {
    if (!adminSecret || provided !== adminSecret) {
      return res.status(403).json({ success: false, message: 'Forbidden: admin access required' });
    }
  }

  try {
    const dir = path.resolve(process.cwd(), 'uploads', 'contact_messages');
    const exists = fs.existsSync(dir);
    if (!exists) return res.json({ success: true, messages: [] });

    const files = await fs.promises.readdir(dir);
    const messages = [];

    for (const file of files) {
      if (!file.toLowerCase().endsWith('.json')) continue;
      try {
        const raw = await fs.promises.readFile(path.join(dir, file), 'utf8');
        const parsed = JSON.parse(raw);
        messages.push({ file, content: parsed });
      } catch (e) {
        messages.push({ file, content: null, error: String(e) });
      }
    }

    // newest first
    messages.sort((a, b) => b.file.localeCompare(a.file));

    return res.json({ success: true, messages });
  } catch (err) {
    console.error('Error listing contact messages:', err);
    return res.status(500).json({ success: false, message: 'Failed to list contact messages' });
  }
}
