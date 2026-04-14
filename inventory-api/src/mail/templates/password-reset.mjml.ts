import { EmailTheme } from './email.theme';

export const passwordResetTemplate = (name: string, link: string, time: string) => `
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
          <mj-section background-color="${EmailTheme.warningBg}" padding="30px 20px">
            <mj-column>
              <mj-text align="center" padding="0">
                <span style="font-size: 24px; font-weight: 800; color: ${EmailTheme.title}; letter-spacing: 2px;">KTMG-VAULT</span>
              </mj-text>
              <mj-text align="center" font-size="10px" color="#64748b" font-weight="700" letter-spacing="1px" padding="5px 0 0">
                SECURE ENTERPRISE LAYER
              </mj-text>
            </mj-column>
          </mj-section>

          <mj-divider border-color="${EmailTheme.danger}" border-width="4px" padding="0" />

          <!-- Main Content -->
          <mj-section css-class="mobile-padding" padding="40px 40px 20px">
            <mj-column>
              <mj-text align="center" font-size="32px">🔒</mj-text>
              <mj-text align="center" font-size="22px" font-weight="800" color="${EmailTheme.title}">Password Reset Requested</mj-text>
              <mj-text font-size="15px" padding-top="20px">
                Hi ${name},
              </mj-text>
              <mj-text font-size="15px">
                We received a request to reset your password for your <strong>KTMG-Vault</strong> account.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Warning Box -->
          <mj-section padding="0 40px">
            <mj-column background-color="${EmailTheme.warningBg}" border-radius="8px" padding="15px" border="1px solid #fed7aa">
              <mj-text font-size="13px" color="#9a3412" align="center">
                ℹ️ Requested at: <strong>${time}</strong>
              </mj-text>
              <mj-text font-size="13px" color="#9a3412" align="center" font-weight="700">
                This secure link expires in 30 minutes.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Action Button -->
          <mj-section padding="40px 40px 20px">
            <mj-column>
              <mj-button background-color="${EmailTheme.primary}" color="#ffffff" font-weight="800" font-size="15px" height="50px" border-radius="8px" href="${link}" width="100%">
                RESET MY PASSWORD
              </mj-button>
            </mj-column>
          </mj-section>

          <!-- Alert -->
          <mj-section padding="0 40px 30px">
            <mj-column background-color="#fef2f2" border-radius="8px" padding="12px" border="1px solid #fecaca">
              <mj-text font-size="12px" color="${EmailTheme.danger}" align="center">
                ⚠️ If you didn't request this, your account may be at risk. Contact your security administrator immediately.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Footer -->
          <mj-section background-color="#f8fafc" padding="20px 40px">
            <mj-column>
              <mj-text font-size="11px" color="#94a3b8" align="center">
                © 2026 KTMG Systems. Vault Security Notification.
              </mj-text>
            </mj-column>
          </mj-section>

        </mj-wrapper>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

