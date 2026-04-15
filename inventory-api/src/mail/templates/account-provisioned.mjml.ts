import { EmailTheme } from './email.theme';

export const accountProvisionedTemplate = (name: string, to: string, tempPassword: string, loginLink: string, systemName = 'System', systemOrg = 'System') => `
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
              <mj-text font-size="20px" font-weight="800" color="${EmailTheme.title}">Account Provisioned</mj-text>
              <mj-text font-size="15px">
                Hi ${name},
              </mj-text>
              <mj-text font-size="15px">
                A new secure account has been provisioned for you in the <strong>${systemName} Enterprise Inventory System</strong>.
              </mj-text>
              <mj-text font-size="15px">
                Please use the temporary credentials below to sign in and initialize your account.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Credential Box -->
          <mj-section padding="0 40px">
            <mj-column background-color="${EmailTheme.warningBg}" border-radius="8px" padding="25px" border="1px solid #fed7aa">
              <mj-text font-size="12px" color="#9a3412" font-weight="800" text-transform="uppercase" letter-spacing="1.5px">Access Credentials</mj-text>
              <mj-text font-size="14px" padding-top="15px">
                <strong style="color: #475569;">USERNAME:</strong> <span style="color:${EmailTheme.title}; font-weight: 600;">${to}</span>
              </mj-text>
              <mj-text font-size="14px">
                <strong style="color: #475569;">TEMPORARY PASSKEY:</strong> <span style="font-family: monospace; font-size:18px; color: ${EmailTheme.primary}; background:#ffffff; padding:6px 10px; border-radius:6px; border: 1px solid #fed7aa; margin-left: 8px;">${tempPassword}</span>
              </mj-text>
            </mj-column>
          </mj-section>

          <mj-section padding="25px 40px">
            <mj-column>
              <mj-text font-size="12px" font-weight="600" color="${EmailTheme.primary}">
                * Note: You will be required to change this password immediately upon your first login to secure your account.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Action Button -->
          <mj-section padding="10px 40px 40px">
            <mj-column>
              <mj-button background-color="${EmailTheme.primary}" color="#ffffff" font-weight="800" font-size="15px" height="50px" border-radius="8px" href="${loginLink}" width="100%">
                INITIALIZE ACCOUNT
              </mj-button>
            </mj-column>
          </mj-section>

          <!-- Footer -->
          <mj-section background-color="#f8fafc" padding="20px 40px">
            <mj-column>
              <mj-text font-size="11px" color="#94a3b8" align="center">
                © ${new Date().getFullYear()} ${systemOrg}. This is an automated security communication.
              </mj-text>
            </mj-column>
          </mj-section>

        </mj-wrapper>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;
