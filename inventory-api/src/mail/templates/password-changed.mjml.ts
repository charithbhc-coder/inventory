import { EmailTheme } from './email.theme';

export const passwordChangedTemplate = (name: string, time: string) => `
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
          <mj-section background-color="${EmailTheme.successBg}" padding="30px 20px">
            <mj-column>
              <mj-text align="center" padding="0">
                <span style="font-size: 24px; font-weight: 800; color: ${EmailTheme.title}; letter-spacing: 2px;">KTMG-VAULT</span>
              </mj-text>
              <mj-text align="center" font-size="10px" color="#64748b" font-weight="700" letter-spacing="1px" padding="5px 0 0">
                SECURE ENTERPRISE LAYER
              </mj-text>
            </mj-column>
          </mj-section>

          <mj-divider border-color="${EmailTheme.success}" border-width="4px" padding="0" />

          <!-- Main Content -->
          <mj-section css-class="mobile-padding" padding="40px 40px 20px">
            <mj-column>
              <mj-text align="center" font-size="32px">✅</mj-text>
              <mj-text align="center" font-size="22px" font-weight="800" color="${EmailTheme.title}">Password Successfully Updated</mj-text>
              <mj-text font-size="15px" padding-top="20px">
                Hi ${name},
              </mj-text>
              <mj-text font-size="15px">
                Your <strong>KTMG-Vault</strong> account password was modified successfully.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Security Log -->
          <mj-section padding="0 40px">
            <mj-column background-color="${EmailTheme.successBg}" border-radius="8px" padding="15px" border="1px solid #bbf7d0">
              <mj-text font-size="13px" color="${EmailTheme.success}" align="center">
                🕒 Event triggered at: <strong>${time}</strong>
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Security Reminder -->
          <mj-section padding="20px 40px 40px">
            <mj-column>
              <mj-text font-size="14px">
                If you performed this action, no further steps are required. You can now use your new credentials to sign in.
              </mj-text>
              <mj-divider border-color="#e2e8f0" border-width="1px" padding="20px 0" />
              <mj-text font-size="12px" color="${EmailTheme.danger}" background-color="#fef2f2" padding="12px" border-radius="6px" border="1px solid #fecaca">
                ⚠️ If you did <strong>NOT</strong> change your password, please contact your security team immediately as your account may have been compromised.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Footer -->
          <mj-section background-color="#f8fafc" padding="20px 40px">
            <mj-column>
              <mj-text font-size="11px" color="#94a3b8" align="center">
                © 2026 KTMG Systems. Automated Security Alert.
              </mj-text>
            </mj-column>
          </mj-section>

        </mj-wrapper>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;

