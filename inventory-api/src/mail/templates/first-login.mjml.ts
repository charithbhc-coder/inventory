import { EmailTheme } from './email.theme';

export const firstLoginTemplate = (name: string, dashboardLink: string, time: string) => `
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
          
          <!-- Header -->
          <mj-section background-color="${EmailTheme.skyBlueBg}" padding="30px 20px">
            <mj-column vertical-align="middle">
              <mj-text align="center" padding="0">
                <span style="font-size: 24px; font-weight: 800; color: ${EmailTheme.title}; letter-spacing: 2px;">KTMG-VAULT</span>
              </mj-text>
              <mj-text align="center" font-size="10px" color="#64748b" font-weight="700" letter-spacing="1px" padding="5px 0 0">
                SECURE ENTERPRISE LAYER
              </mj-text>
            </mj-column>
          </mj-section>

          <mj-divider border-color="${EmailTheme.primary}" border-width="4px" padding="0" />

          <!-- Main Content -->
          <mj-section css-class="mobile-padding" padding="40px 40px 20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="800" color="${EmailTheme.title}">Security Notification: Successful Login</mj-text>
              <mj-text font-size="15px">
                Hi ${name},
              </mj-text>
              <mj-text font-size="15px">
                Your <strong>KTMG-Vault</strong> account was successfully accessed for the first time.
              </mj-text>
              <mj-text font-size="15px">
                This automated notification confirms your initial session activation.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Event Highlight -->
          <mj-section padding="0 40px">
            <mj-column background-color="#f1f5f9" border-radius="8px" padding="20px" border="1px solid #e2e8f0">
              <mj-text font-size="12px" color="#64748b" font-weight="800" text-transform="uppercase" letter-spacing="1.5px">Authentication Log</mj-text>
              <mj-text font-size="14px" padding-top="15px">
                <strong style="color: #475569;">STATUS:</strong> <span style="color:${EmailTheme.success}; font-weight:700;">AUTHENTICATED</span>
              </mj-text>
              <mj-text font-size="14px">
                <strong style="color: #475569;">TIMESTAMP:</strong> <span style="font-family: monospace; font-size:16px; color: ${EmailTheme.title}; font-weight:700;">${time}</span>
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Security Reminder -->
          <mj-section padding="25px 40px">
            <mj-column>
              <mj-text background-color="${EmailTheme.infoBg}" padding="15px" border-radius="8px" border="1px solid #bae6fd" font-size="13px" color="#0369a1">
                ℹ️ <strong>SECURITY NOTE:</strong> If you did <strong>NOT</strong> perform this login, please contact your systems administrator immediately to secure your account.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Action Button -->
          <mj-section padding="10px 40px 40px">
            <mj-column>
              <mj-button background-color="${EmailTheme.primary}" color="#ffffff" font-weight="800" font-size="15px" height="50px" border-radius="8px" href="${dashboardLink}" width="100%">
                GO TO DASHBOARD
              </mj-button>
            </mj-column>
          </mj-section>

          <!-- Footer -->
          <mj-section background-color="#f8fafc" padding="20px 40px">
            <mj-column>
              <mj-text font-size="11px" color="#94a3b8" align="center">
                © 2026 KTMG Systems. Enterprise Security Alert.
              </mj-text>
            </mj-column>
          </mj-section>

        </mj-wrapper>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

