export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, error: 'Method Not Allowed' });
  }

  const { licenseKey } = req.body || {};
  const expected = process.env.LICENSE_KEY;

  if (!expected) {
    return res.status(500).json({ valid: false, error: 'LICENSE_KEY is not configured' });
  }

  return res.status(200).json({ valid: licenseKey === expected });
}
