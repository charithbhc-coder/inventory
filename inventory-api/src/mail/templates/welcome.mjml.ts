export const welcomeTemplate = (name: string, to: string, tempPassword: string, loginLink: string) => `
<mjml>
  <mj-head>
    <mj-font name="Inter" href="https://fonts.googleapis.com/css?family=Inter" />
  </mj-head>
  <mj-body background-color="#f7f9fc">

    <mj-section>
      <mj-column>

        <mj-wrapper background-color="#ffffff" padding="0" border="1px solid #e5e7eb">

          <!-- Header -->
          <mj-section background-color="#eef2ff" padding="20px">
            <mj-column width="60px" vertical-align="middle">
              <mj-image src="https://img.icons8.com/fluency/48/checklist.png" width="48px" height="48px" padding="0" />
            </mj-column>
            <mj-column vertical-align="middle">
              <mj-text font-size="18px" font-weight="800" color="#0a2d5b" padding="0">
                INVENTORY
              </mj-text>
              <mj-text font-size="11px" color="#475569" padding="0">
                MANAGEMENT SYSTEM
              </mj-text>
            </mj-column>
          </mj-section>

          <mj-divider border-color="#1677ff" border-width="3px" padding="0" />

          <!-- Title -->
          <mj-section padding="20px 0 0">
            <mj-column>
              <mj-text align="center" font-size="22px" color="#1677ff" font-weight="700">
                Welcome!
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Content -->
          <mj-section padding="10px 40px">
            <mj-column>
              <mj-text>Hi ${name},</mj-text>
              <mj-text>
                An account has been created for you in the Inventory Management System. 
                Please use the temporary password below to log in for the first time.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Credentials -->
          <mj-section padding="0 40px">
            <mj-column>
              <mj-text background-color="#f5f5f5" padding="15px">
                <strong>Username:</strong> ${to}<br/>
                <strong>Temporary Password:</strong> <span style="font-size:16px; background-color:#e8e8e8; padding:2px 6px;">${tempPassword}</span>
              </mj-text>
            </mj-column>
          </mj-section>

          <mj-section padding="10px 40px">
            <mj-column>
              <mj-text>
                You will be required to change your password immediately upon logging in.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- CTA -->
          <mj-section padding="10px">
            <mj-column>
              <mj-button background-color="#1677ff" color="#ffffff" href="${loginLink}">
                Log In Now
              </mj-button>
            </mj-column>
          </mj-section>

          <!-- Footer -->
          <mj-section padding="20px 40px">
            <mj-column>
              <mj-text font-size="13px" color="#6b7280">
                Thanks,<br/>The Inventory System Team
              </mj-text>
            </mj-column>
          </mj-section>

        </mj-wrapper>

      </mj-column>
    </mj-section>

  </mj-body>
</mjml>
`;
