import { EmailTheme } from './email.theme';

export const licenseExpirationTemplate = (licenseName: string, daysRemaining: number, expiryDateStr: string, dashboardLink: string, systemName = 'System', systemOrg = 'System') => `
<mjml>
  <mj-head>
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
          
          <!-- Header: KTMG-Vault Branding -->
          <mj-section background-color="${daysRemaining <= 3 ? EmailTheme.warningBg : EmailTheme.skyBlueBg}" padding="30px 20px">
            <mj-column vertical-align="middle">
              <mj-text align="center" padding="0">
                <span style="font-size: 24px; font-weight: 800; color: ${EmailTheme.title}; letter-spacing: 2px;">${systemName}</span>
              </mj-text>
              <mj-text align="center" font-size="10px" color="#64748b" font-weight="700" letter-spacing="1px" padding="5px 0 0">
                LICENSE MANAGEMENT SYSTEM
              </mj-text>
            </mj-column>
          </mj-section>

          <mj-divider border-color="${daysRemaining <= 3 ? EmailTheme.danger : EmailTheme.primary}" border-width="4px" padding="0" />

          <!-- Main Content -->
          <mj-section css-class="mobile-padding" padding="40px 40px 20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="800" color="${daysRemaining <= 3 ? EmailTheme.danger : EmailTheme.title}">
                Action Required: License Expiring
              </mj-text>
              <mj-text font-size="15px">
                A software license registered in ${systemName} is approaching its expiration date:
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Status Box -->
          <mj-section padding="0 40px">
            <mj-column background-color="${daysRemaining <= 3 ? '#fee2e2' : '#f8fafc'}" border-radius="8px" padding="25px" border="1px solid ${daysRemaining <= 3 ? '#fca5a5' : '#e2e8f0'}">
              <mj-text font-size="12px" color="${daysRemaining <= 3 ? '#b91c1c' : '#64748b'}" font-weight="800" text-transform="uppercase" letter-spacing="1.5px">License Details</mj-text>
              <mj-text font-size="15px" padding-top="15px">
                <strong style="color: #475569;">SOFTWARE:</strong> <span style="color:${EmailTheme.title}; font-weight: 700;">${licenseName}</span>
              </mj-text>
              <mj-text font-size="15px">
                <strong style="color: #475569;">EXPIRY DATE:</strong> <span style="font-weight: 600;">${expiryDateStr}</span>
              </mj-text>
              <mj-text font-size="15px">
                <strong style="color: #475569;">TIME REMAINING:</strong> <span style="font-weight: 800; color: ${daysRemaining <= 0 ? EmailTheme.danger : (daysRemaining <= 7 ? '#ca8a04' : EmailTheme.primary)};">${daysRemaining <= 0 ? 'EXPIRED' : `${daysRemaining} Days`}</span>
              </mj-text>
            </mj-column>
          </mj-section>

          <mj-section padding="25px 40px">
            <mj-column>
              <mj-text font-size="13px" font-weight="600" color="#64748b">
                Log in to the system to review this software license and process any necessary renewals to avoid service interruption.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Action Button -->
          <mj-section padding="10px 40px 40px">
            <mj-column>
              <mj-button background-color="${daysRemaining <= 3 ? EmailTheme.danger : EmailTheme.primary}" color="#ffffff" font-weight="800" font-size="15px" height="50px" border-radius="8px" href="${dashboardLink}" width="100%">
                MANAGE LICENSES
              </mj-button>
            </mj-column>
          </mj-section>

          <!-- Footer -->
          <mj-section background-color="#f8fafc" padding="20px 40px">
            <mj-column>
              <mj-text font-size="11px" color="#94a3b8" align="center">
                © ${new Date().getFullYear()} ${systemOrg}. This is an automated software license management communication.
              </mj-text>
            </mj-column>
          </mj-section>

        </mj-wrapper>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;
