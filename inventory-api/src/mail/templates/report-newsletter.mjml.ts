import { EmailTheme } from './email.theme';

export function reportNewsletterTemplate(
  subject: string,
  body: string,
  attachmentNote: string,
  systemName = 'KTMG-Vault',
): string {
  const year = new Date().getFullYear();
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return `
<mjml>
  <mj-head>
    <mj-title>${subject}</mj-title>
    <mj-font name="Inter" href="https://fonts.googleapis.com/css?family=Inter:wght@400;700;800" />
    <mj-attributes>
      <mj-all font-family="Inter, Arial, sans-serif" />
      <mj-text line-height="1.6" color="${EmailTheme.text}" />
    </mj-attributes>
    <mj-style>
      .vault-card { border-radius: 16px !important; overflow: hidden !important; }
      @media only screen and (max-width:480px) {
        .mobile-padding { padding: 20px 15px !important; }
      }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f1f5f9">
    <mj-section padding="20px 0">
      <mj-column>
        <mj-wrapper css-class="vault-card" background-color="#ffffff" padding="0" border="1px solid #e2e8f0">
          
          <!-- Header Brand Bar -->
          <mj-section background-color="#fffce8" padding="30px 20px">
            <mj-column vertical-align="middle">
              <mj-text align="center" padding="0">
                <span style="font-size: 24px; font-weight: 800; color: ${EmailTheme.title}; letter-spacing: 2px;">${systemName.toUpperCase()}</span>
              </mj-text>
              <mj-text align="center" font-size="10px" color="#64748b" font-weight="700" letter-spacing="1px" padding="5px 0 0">
                ADMINISTRATIVE REPORT SYSTEM
              </mj-text>
            </mj-column>
          </mj-section>

          <mj-divider border-color="#ffe053" border-width="4px" padding="0" />

          <!-- Subject and Timestamp -->
          <mj-section css-class="mobile-padding" padding="40px 40px 10px">
            <mj-column>
              <mj-text font-size="20px" font-weight="800" color="${EmailTheme.title}">${subject}</mj-text>
              <mj-text font-size="12px" color="#64748b" margin-top="6px">
                ${timestamp}
              </mj-text>
            </mj-column>
          </mj-section>
          
          <!-- Body Content -->
          <mj-section css-class="mobile-padding" padding="10px 40px 20px">
            <mj-column>
              <mj-text font-size="15px" color="${EmailTheme.text}" line-height="1.8" white-space="pre-wrap">
                ${body.replace(/\n/g, '<br/>')}
              </mj-text>

              ${attachmentNote ? `
              <mj-divider border-color="#e2e8f0" border-width="1px" padding="30px 0 20px" />
              <mj-section padding="0" background-color="#f8fafc" border-radius="8px">
                <mj-column padding="16px 20px">
                  <mj-text font-size="13px" color="#64748b" font-weight="600">
                    📎 ${attachmentNote}
                  </mj-text>
                </mj-column>
              </mj-section>` : ''}
            </mj-column>
          </mj-section>

          <!-- Footer -->
          <mj-section background-color="#fffce8" padding="20px 40px">
            <mj-column>
              <mj-text font-size="11px" color="#64748b" align="center">
                © ${year} ${systemName} · This is an automated administrative email.
              </mj-text>
            </mj-column>
          </mj-section>

        </mj-wrapper>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
  `.trim();
}
