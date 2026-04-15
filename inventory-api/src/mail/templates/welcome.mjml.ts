import { EmailTheme } from './email.theme';

export const welcomeTemplate = (name: string, dashboardLink: string, systemName = 'System', systemOrg = 'System') => `
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
                <span style="font-size: 24px; font-weight: 800; color: ${EmailTheme.title}; letter-spacing: 2px;">${systemName}</span>
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
              <mj-text font-size="20px" font-weight="800" color="${EmailTheme.title}">Welcome aboard, ${name}!</mj-text>
              <mj-text font-size="15px">
                Your account setup is complete, and you are now a verified member of the <strong>${systemName} Enterprise Inventory System</strong>.
              </mj-text>
              <mj-text font-size="15px">
                You now have full access to your assigned workspace. Our secure environment is designed to streamline your operations while maintaining maximum data integrity.
              </mj-text>
              <mj-text font-size="15px">
                Feel free to explore the dashboard and set up your preferences.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Success Icon/Illustration Placeholder -->
          <mj-section padding="0 40px">
            <mj-column background-color="#f0fdf4" border-radius="8px" padding="30px" border="1px solid #bbf7d0">
              <mj-text align="center" font-size="48px" padding="0">✅</mj-text>
              <mj-text align="center" font-size="18px" font-weight="700" color="#166534" padding-top="10px">Account Fully Activated</mj-text>
              <mj-text align="center" font-size="13px" color="#166534" padding-top="5px">Secure credentials registered successfully.</mj-text>
            </mj-column>
          </mj-section>

          <!-- Action Button -->
          <mj-section padding="40px">
            <mj-column>
              <mj-button background-color="${EmailTheme.primary}" color="#ffffff" font-weight="800" font-size="15px" height="50px" border-radius="8px" href="${dashboardLink}" width="100%">
                ENTER THE VAULT
              </mj-button>
            </mj-column>
          </mj-section>

          <!-- Footer -->
          <mj-section background-color="#f8fafc" padding="20px 40px">
            <mj-column>
              <mj-text font-size="11px" color="#94a3b8" align="center">
                © ${new Date().getFullYear()} ${systemOrg}. This is an automated success notification.
              </mj-text>
            </mj-column>
          </mj-section>

        </mj-wrapper>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;
