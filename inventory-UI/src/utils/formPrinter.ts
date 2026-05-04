import { useAuthStore } from '@/store/auth.store';

const API_ROOT_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/inventory-api/v1';

export interface EmployeeInfo {
  name: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  address?: string;
  contact?: string;
  company?: string;
  companyLogoUrl?: string;    // subsidiary company logo — shown top-left
  mainCompanyLogoUrl?: string; // KTMG main company logo — shown top-right
}

export interface PrintableItem {
  name: string;
  barcode: string;
  serialNumber?: string;
  condition?: string;
  category?: string;
  remarks?: string;
  purchasePrice?: string | number;
  status?: string;
}

const sharedStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; padding: 30px 40px;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px double #000; padding-bottom: 14px; margin-bottom: 16px; }
  .header-center { text-align: center; flex: 1; }
  .header-center h1 { font-size: 16px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
  .header-center h2 { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; border: 2px solid #000; display: inline-block; padding: 4px 16px; margin-top: 4px; }
  .logo-box { width: 80px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 4px; overflow: hidden; }
  .logo-box img { width: 100%; height: 100%; object-fit: contain; }
  .logo-fallback { width: 80px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; text-align: center; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  table th, table td { border: 1px solid #000; padding: 8px 10px; font-size: 11px; }
  table th { font-weight: bold; background: #f0f0f0; text-align: left; }
  .field-row { display: flex; align-items: baseline; margin: 8px 0; gap: 4px; }
  .field-label { font-weight: bold; font-size: 11px; white-space: nowrap; min-width: 180px; }
  .field-line { flex: 1; border-bottom: 1px solid #000; min-height: 18px; padding-left: 6px; font-size: 12px; }
  .section-title { font-weight: bold; font-size: 12px; text-align: center; text-decoration: underline; margin: 16px 0 8px; }
  .sig-row { display: flex; gap: 40px; margin-top: 40px; }
  .sig-block { flex: 1; }
  .sig-line { border-top: 1px solid #000; margin-top: 48px; }
  .sig-label { font-size: 10px; text-align: center; margin-top: 4px; }
  .declaration { border: 1px solid #000; padding: 10px 14px; margin: 12px 0; font-size: 11px; line-height: 1.7; }
  .meta { font-size: 11px; margin: 4px 0; }
  .highlight { font-weight: bold; }
  .stamp-area { border: 1px dashed #999; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #888; margin-top: 8px; }
  @media print {
    body { padding: 20px 30px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page { margin: 1cm; size: A4; }
    table { page-break-inside: avoid; break-inside: avoid; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    .declaration { page-break-inside: avoid; break-inside: avoid; }
    .sig-row { page-break-inside: avoid; break-inside: avoid; }
    .header { page-break-inside: avoid; break-inside: avoid; }
  }
`;

/**
 * Convert an image URL to a base64 data URI so it embeds into the print iframe.
 */
async function urlToBase64(url: string, token?: string): Promise<string> {
  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, { mode: 'cors', headers });
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('urlToBase64 failed, falling back to original URL:', url, err);
    return url; // Fall back to the original URL
  }
}

/** 
 * Sanitize employee name for use in a filename 
 */
function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
}

function openPrintFrame(html: string, filename: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;';
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    setTimeout(() => {
      if (iframe.contentWindow) {
        // Set document title to control the suggested PDF filename
        iframe.contentDocument!.title = filename;
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
      setTimeout(() => document.body.removeChild(iframe), 4000);
    }, 500);
  };
}

/**
 * Reusable helper to fetch logos via the API proxy to avoid CORS issues
 */
async function fetchLogoBase64(logoUrl?: string): Promise<string> {
  if (!logoUrl) return '';
  const token = (useAuthStore.getState() as any).accessToken;
  const fullUrl = logoUrl.startsWith('http') ? logoUrl : `${API_ROOT_URL}${logoUrl}`;
  const proxyUrl = `${API_ROOT_URL}/companies/logo-proxy?url=${encodeURIComponent(fullUrl)}`;
  return urlToBase64(proxyUrl, token);
}

function renderItemsTable(items: PrintableItem[]): string {
  const headers = ['#', 'Item Name', 'Barcode', 'Serial No.', 'Condition', 'Remarks'];
  return `
    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${items.map((item, i) => `
          <tr>
            <td style="text-align:center;width:30px">${i + 1}</td>
            <td>${item.name}</td>
            <td style="font-family:monospace;font-size:10px">${item.barcode}</td>
            <td>${item.serialNumber || '—'}</td>
            <td>${item.condition || 'Good'}</td>
            <td>${item.remarks || item.category || ''}</td>
          </tr>
        `).join('')}
        ${Array.from({ length: Math.max(0, 4 - items.length) }).map(() => `
          <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function buildLogoHtml(logoSource: string, companyName: string): string {
  if (logoSource) {
    return `<div class="logo-box"><img src="${logoSource}" alt="${companyName} logo" /></div>`;
  }
  const initials = companyName.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase();
  return `<div class="logo-fallback">${initials}<br/>GROUP</div>`;
}

/**
 * Asset Issuance Form — printed when giving assets to an employee for the first time.
 */
export async function printAssetIssuanceForm(employee: EmployeeInfo, items: PrintableItem[]): Promise<void> {
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const companyDisplay = employee.company || 'KTMG GROUP';
  const [leftLogoBase64, rightLogoBase64] = await Promise.all([
    fetchLogoBase64(employee.companyLogoUrl),
    fetchLogoBase64(employee.mainCompanyLogoUrl),
  ]);

  const leftLogoHtml  = buildLogoHtml(leftLogoBase64, companyDisplay);
  const rightLogoHtml = buildLogoHtml(rightLogoBase64 || leftLogoBase64, 'KTMG');
  const filename = `${safeFilename(employee.name)}_Asset_Issuance_Form`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <div class="header">
    ${leftLogoHtml}
    <div class="header-center">
      <h1>${companyDisplay}</h1>
      <h2>Asset Issuance Form</h2>
    </div>
    ${rightLogoHtml}
  </div>

  <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
    <div class="meta"><span class="highlight">Form No:</span> ISS-${Date.now().toString().slice(-6)}</div>
    <div class="meta"><span class="highlight">Date:</span> ${date}</div>
  </div>

  <div class="field-row">
    <div class="field-label">Issued To (Employee Name):</div>
    <div class="field-line">${employee.name || ''}</div>
  </div>
  <div style="display:flex;gap:20px;">
    <div class="field-row" style="flex:1">
      <div class="field-label">Employee ID:</div>
      <div class="field-line">${employee.employeeId || ''}</div>
    </div>
    <div class="field-row" style="flex:1">
      <div class="field-label">Department:</div>
      <div class="field-line">${employee.department || ''}</div>
    </div>
  </div>
  <div class="field-row">
    <div class="field-label">Designation:</div>
    <div class="field-line">${employee.designation || ''}</div>
  </div>

  <div class="section-title">Assets Issued</div>
  ${renderItemsTable(items)}

  <div style="margin:10px 0;">
    <div class="meta">Total Assets Issued: <span class="highlight">${items.length}</span></div>
  </div>

  <div class="section-title">Acknowledgement &amp; Declaration by Employee</div>
  <div class="declaration">
    I, Ms/Mr. <strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong>, acknowledge receipt of the above-listed 
    asset(s) in working condition from ${companyDisplay}. I understand and agree to the following:<br/><br/>
    1. I will take full responsibility for the safe custody and proper use of the issued assets.<br/>
    2. I will immediately report any damage, theft, or loss to the IT/Admin department.<br/>
    3. Upon resignation, termination, or transfer, I will promptly return all issued assets in their 
       original working condition to the company.<br/>
    4. I will be solely responsible for the company property in my custody.
  </div>

  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Signature of Receiving Employee</div>
      <div class="sig-label" style="margin-top:4px">Date: _________________</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Officer / IT Admin</div>
      <div class="sig-label" style="margin-top:4px">Date: _________________</div>
    </div>
    <div class="sig-block">
      <div class="stamp-area">Company Seal / Stamp</div>
    </div>
  </div>

  <div style="margin-top:20px;font-size:10px;color:#888;text-align:center;border-top:1px solid #ccc;padding-top:8px;">
    Generated by KTMG-VAULT Asset Management System &bull; ${date} &bull; For internal use only
  </div>
</body>
</html>`;

  openPrintFrame(html, filename);
}

/**
 * Asset Handover Form — printed when an employee leaves or returns assets.
 * Matches the physical BLOCKCHAIN GROUP ASSET HANDOVER FORM format.
 */
export async function printAssetHandoverForm(employee: EmployeeInfo, items: PrintableItem[]): Promise<void> {
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const companyDisplay = employee.company || 'KTMG GROUP';
  const [leftLogoBase64, rightLogoBase64] = await Promise.all([
    fetchLogoBase64(employee.companyLogoUrl),
    fetchLogoBase64(employee.mainCompanyLogoUrl),
  ]);

  const leftLogoHtml  = buildLogoHtml(leftLogoBase64, companyDisplay);
  const rightLogoHtml = buildLogoHtml(rightLogoBase64 || leftLogoBase64, 'KTMG');
  const filename = `${safeFilename(employee.name)}_Asset_Handover_Form`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <div class="header">
    ${leftLogoHtml}
    <div class="header-center">
      <h1>${companyDisplay}</h1>
      <h2>Asset Handover Form</h2>
    </div>
    ${rightLogoHtml}
  </div>

  <div style="display:flex;justify-content:space-between;margin:8px 0;">
    <div class="meta"><span class="highlight">Date:</span> ${date}</div>
    <div class="meta"><span class="highlight">Ref No:</span> HDO-${Date.now().toString().slice(-6)}</div>
  </div>

  <div class="field-row">
    <div class="field-label">To whom the Asset handed over:</div>
    <div class="field-line">${employee.name || ''}</div>
  </div>

  <div class="section-title">Asset Description</div>
  <table>
    <thead>
      <tr>
        <th style="width:30px">#</th>
        <th>Item</th>
        <th>Assignment Status</th>
        <th>Serial / Barcode</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item, i) => `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${item.name}</td>
          <td style="font-weight:bold">${item.status || 'Returned'}</td>
          <td style="font-family:monospace;font-size:10px">${item.serialNumber || item.barcode || ''}</td>
        </tr>
      `).join('')}
      ${Array.from({ length: Math.max(0, 5 - items.length) }).map(() => `
        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
      `).join('')}
    </tbody>
  </table>

  <div class="section-title" style="margin-top:16px">Details of the Person Holding the Asset</div>
  <div class="field-row">
    <div class="field-label">Name:</div>
    <div class="field-line">${employee.name || ''}</div>
  </div>
  <div class="field-row">
    <div class="field-label">Employee ID:</div>
    <div class="field-line">${employee.employeeId || ''}</div>
  </div>
  <div class="field-row">
    <div class="field-label">Address:</div>
    <div class="field-line">${employee.address || ''}</div>
  </div>
  <div class="field-row">
    <div class="field-label">Designation:</div>
    <div class="field-line">${employee.designation || ''}</div>
  </div>
  <div class="field-row">
    <div class="field-label">Department:</div>
    <div class="field-line">${employee.department || ''}</div>
  </div>
  <div class="field-row">
    <div class="field-label">Official or Personal Contact No:</div>
    <div class="field-line">${employee.contact || ''}</div>
  </div>
  <div class="field-row">
    <div class="field-label">Date:</div>
    <div class="field-line">${date}</div>
  </div>

  <div class="section-title">Acknowledgement and Declaration by Employee</div>
  <div class="declaration">
    I, Ms/Mr. <strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</strong> confirm that I am returning the above-listed 
    assets to ${companyDisplay} and agree to the following:<br/><br/>
    1. Upon my resignation/termination, I'll immediately hand over this asset in its working condition to the company.<br/>
    2. I will be solely responsible for the company property belonging to me.
  </div>

  <div style="margin-top:8px">
    <div class="meta" style="margin-bottom:8px">OTHER REMARKS:</div>
    <div style="border-bottom:1px solid #000;min-height:18px;margin:6px 0;"></div>
    <div style="border-bottom:1px solid #000;min-height:18px;margin:6px 0;"></div>
  </div>

  <div class="sig-row">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Signature of the Receiving Person</div>
      <div class="sig-label" style="margin-top:4px">Date: _________________</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Officer / IT Admin</div>
      <div class="sig-label" style="margin-top:4px">Date: _________________</div>
    </div>
    <div class="sig-block">
      <div class="stamp-area">Company Seal / Stamp</div>
    </div>
  </div>

  <div style="margin-top:20px;font-size:10px;color:#888;text-align:center;border-top:1px solid #ccc;padding-top:8px;">
    Generated by KTMG-VAULT Asset Management System &bull; ${date} &bull; For internal use only
  </div>
</body>
</html>`;

  openPrintFrame(html, filename);
}

export interface GatePassInfo {
  destination: string;
  reason?: string;
  authorizedBy?: string;
}

export interface CompanyInfo {
  name: string;
  logoUrl?: string;
  mainCompanyLogoUrl?: string;
}

export async function printGatePassForm(company: CompanyInfo, items: PrintableItem[], info: GatePassInfo) {
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const filename = `GatePass_${safeFilename(company.name)}_${new Date().getTime()}.pdf`;

  const [logoBase64, mainLogoBase64] = await Promise.all([
    fetchLogoBase64(company.logoUrl),
    fetchLogoBase64(company.mainCompanyLogoUrl),
  ]);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Gate Pass - ${company.name}</title>
  <style>${sharedStyles}</style>
</head>
<body>
  <div class="header">
    <div class="logo-box">
      ${logoBase64 ? `<img src="${logoBase64}" />` : `<div class="logo-fallback">${company.name}</div>`}
    </div>
    <div class="header-center">
      <h1>${company.name}</h1>
      <h2>GATE PASS / EXIT PERMIT</h2>
    </div>
    <div class="logo-box">
      ${mainLogoBase64 ? `<img src="${mainLogoBase64}" />` : `<div class="logo-fallback">KTMG</div>`}
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
    <div>
      <p class="meta"><span class="highlight">Pass No:</span> GP-${Math.floor(1000 + Math.random() * 9000)}</p>
      <p class="meta"><span class="highlight">Date:</span> ${date}</p>
      <p class="meta"><span class="highlight">Time:</span> ${time}</p>
    </div>
    <div style="text-align: right;">
      <p class="meta"><span class="highlight">Destination:</span> ${info.destination}</p>
    </div>
  </div>

  <div class="declaration">
    Permission is hereby granted to move the following items from <span class="highlight">${company.name}</span> 
    to <span class="highlight">${info.destination}</span>. These items are for official transfer/movement.
  </div>

  <div class="section-title">LIST OF ITEMS / ASSETS</div>
  <table>
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th>Item Description</th>
        <th>Barcode / ID</th>
        <th>Serial Number</th>
        <th>Category</th>
      </tr>
    </thead>
    <tbody>
      ${items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.name}</td>
          <td style="font-family: monospace;">${item.barcode}</td>
          <td>${item.serialNumber || '-'}</td>
          <td>${item.category || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div style="margin-top: 24px;">
    <div class="field-row">
      <div class="field-label">REASON FOR TRANSFER:</div>
      <div class="field-line">${info.reason || ''}</div>
    </div>
    <div class="field-row">
      <div class="field-label">AUTHORIZATION:</div>
      <div class="field-line">${info.authorizedBy ? `Authorized by ${info.authorizedBy}` : ''}</div>
    </div>
  </div>

  <div class="sig-row" style="margin-top: 60px;">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signature</div>
      <div class="sig-label">(Company Stamp)</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Security Check (Out Gate)</div>
      <div class="sig-label">Time Out: ___________</div>
    </div>
  </div>

  <div style="margin-top:40px; font-size: 10px; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
    This is a computer-generated document. Original copy to be retained by Security at the gate.
  </div>
</body>
</html>`;

  openPrintFrame(html, filename);
}
