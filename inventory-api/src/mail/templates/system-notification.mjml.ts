import { EmailTheme } from './email.theme';

export const systemNotificationTemplate = (title: string, message: string, actionUrl: string | undefined) => `
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
                SYSTEM NOTIFICATION
              </mj-text>
            </mj-column>
          </mj-section>

          <mj-divider border-color="${EmailTheme.primary}" border-width="4px" padding="0" />

          <!-- Main Content -->
          <mj-section css-class="mobile-padding" padding="40px 40px 20px">
            <mj-column>
              <mj-text font-size="20px" font-weight="800" color="${EmailTheme.title}">${title}</mj-text>
              <mj-text font-size="15px">
                ${message}
              </mj-text>
            </mj-column>
          </mj-section>

          ${actionUrl ? `
          <!-- Action Button -->
          <mj-section padding="20px 40px">
            <mj-column>
              <mj-button background-color="${EmailTheme.primary}" color="#1a1a2e" font-weight="800" font-size="15px" height="50px" border-radius="8px" href="${actionUrl}" width="100%">
                VIEW DETAILS
              </mj-button>
            </mj-column>
          </mj-section>
          ` : ''}

          <!-- Footer -->
          <mj-section background-color="#f8fafc" padding="20px 40px">
            <mj-column>
              <mj-text font-size="11px" color="#94a3b8" align="center">
                © ${new Date().getFullYear()} KTMG Systems. This is an automated notification.
              </mj-text>
            </mj-column>
          </mj-section>

        </mj-wrapper>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
`;
