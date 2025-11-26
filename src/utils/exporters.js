export function buildFilename(templateName, ext) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('') + '-' + [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join('');
  const safeTemplate = templateName.replace(/[^a-z0-9-_]+/gi, '_') || 'datamapper';
  return `${safeTemplate}-${ts}.${ext}`;
}

export function toJsonBlob(templateName, url, data) {
  const payload = {
    templateName,
    url,
    extractedAt: new Date().toISOString(),
    data
  };
  const json = JSON.stringify(payload, null, 2);
  return new Blob([json], { type: 'application/json' });
}

export function toCsvBlob(data) {
  // data: { field: [values...] }
  const fields = Object.keys(data);
  const maxLen = Math.max(0, ...fields.map((f) => (data[f] || []).length));
  const rows = [];

  // header
  rows.push(fields.join(','));

  for (let i = 0; i < maxLen; i++) {
    const row = fields
      .map((f) => {
        const val = (data[f] && data[f][i]) || '';
        return csvEscape(val);
      })
      .join(',');
    rows.push(row);
  }

  const csv = rows.join('\n');
  return new Blob([csv], { type: 'text/csv' });
}

function csvEscape(value) {
  const str = String(value || '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toXmlBlob(templateName, url, data) {
  const fields = Object.keys(data);
  const maxLen = Math.max(0, ...fields.map((f) => (data[f] || []).length));

  let xml = '';
  xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<datamapper template="${escapeXml(templateName)}" url="${escapeXml(url)}">\n`;
  xml += `  <generated>${escapeXml(new Date().toISOString())}</generated>\n`;
  xml += '  <records>\n';

  for (let i = 0; i < maxLen; i++) {
    xml += `    <record index="${i}">\n`;
    for (const f of fields) {
      const val = (data[f] && data[f][i]) || '';
      xml += `      <${escapeXmlName(f)}>${escapeXml(val)}</${escapeXmlName(f)}>\n`;
    }
    xml += '    </record>\n';
  }

  xml += '  </records>\n';
  xml += '</datamapper>\n';

  return new Blob([xml], { type: 'application/xml' });
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeXmlName(str) {
  return String(str).replace(/[^A-Za-z0-9_.-]/g, '_');
}
