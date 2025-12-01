export function buildFilename(templateName, ext) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate())
  ].join('') + '-' + [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join('');
  const safeTemplate = templateName.replace(/[^a-z0-9-_]+/gi, '_') || 'tn_datamapper';
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

export function toYamlBlob(templateName, url, data) {
  const payload = {
    templateName,
    url,
    extractedAt: new Date().toISOString(),
    data
  };

  const yaml = toYaml(payload);
  return new Blob([yaml], { type: 'text/yaml' });
}

function toYaml(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return String(obj);

  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj
      .map(item => `${pad}- ${formatYamlValue(item, indent + 1)}`)
      .join('\n');
  }

  return Object.entries(obj)
    .map(([k, v]) => {
      const val = formatYamlValue(v, indent + 1);
      if (typeof v === 'object' && v !== null) {
        return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
      }
      return `${pad}${k}: ${val}`;
    })
    .join('\n');
}

function formatYamlValue(value, indent) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return ''; // handled in recursive call
  const s = String(value);
  if (/[:{}\[\],&*#?|\-<>=!%@`]/.test(s)) {
    return JSON.stringify(s); // quoted to be safe
  }
  return s;
}

export function toToonBlob(data) {
  const toon = serializeToToon(data);
  return new Blob([toon], { type: "text/toon" });
}

function serializeToToon(obj, indent = "") {
  if (obj === null || obj === undefined) {
    return "null\n";
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return "[]\n";
    }
    // assume array of primitives
    return `[${obj.length}]: ${obj.map(v => escapeToon(v)).join(",")}\n`;
  }
  if (typeof obj !== "object") {
    return `${escapeToon(obj)}\n`;
  }

  // object
  let out = "";
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v) && v.length > 0 && v.every(el => typeof el === "object" && el !== null)) {
      // array of objects → tabular representation
      const fields = Object.keys(v[0]);
      out += `${k}[${v.length}]{${fields.join(",")}}:\n`;
      v.forEach(item => {
        const row = fields.map(f => escapeToon(item[f])).join(",");
        out += `${indent}  ${row}\n`;
      });
    } else if (typeof v === "object" && v !== null) {
      // nested object => indentation
      out += `${k}:\n`;
      out += serializeToToon(v, indent + "  ").replace(/^/gm, indent + "  ");
    } else {
      // primitive or array-of-primitives
      out += `${k}: ${Array.isArray(v) ? v.map(escapeToon).join(",") : escapeToon(v)}\n`;
    }
  }
  return out;
}

function escapeToon(val) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (/[,\n]/.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

export function toXmlBlob(templateName, url, data) {
  const fields = Object.keys(data);
  const maxLen = Math.max(0, ...fields.map((f) => (data[f] || []).length));

  let xml = '';
  xml += '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += `<tn_datamapper template="${escapeXml(templateName)}" url="${escapeXml(url)}">\n`;
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
  xml += '</tn_datamapper>\n';

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
