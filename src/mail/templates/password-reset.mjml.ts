export const passwordResetTemplate = (name: string, link: string, time: string) => `
<mjml>
  <mj-head>
    <mj-font name="Inter" href="https://fonts.googleapis.com/css?family=Inter" />
  </mj-head>

  <mj-body background-color="#f7f9fc">

    <mj-section>
      <mj-column>

        <mj-wrapper background-color="#ffffff" padding="0px" border="1px solid #e5e7eb">

          <!-- Header -->
          <mj-section background-color="#fff4e6" padding="20px">
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

          <!-- Top line -->
          <mj-divider border-color="#ea580c" border-width="3px" padding="0" />

          <!-- Icon -->
          <mj-section padding="10px">
            <mj-column>
              <mj-text align="center" font-size="28px">🔒</mj-text>
            </mj-column>
          </mj-section>

          <!-- Title -->
          <mj-section padding="0">
            <mj-column>
              <mj-text align="center" font-size="22px" color="#ea580c" font-weight="700">
                Password Reset Requested
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Content -->
          <mj-section padding="10px 40px">
            <mj-column>
              <mj-text color="#4b5563">Hi ${name},</mj-text>
              <mj-text color="#4b5563">
                We received a request to reset your password for your
                <strong>Inventory Management System</strong> account.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Timestamp -->
          <mj-section padding="0 40px">
            <mj-column>
              <mj-text background-color="#f0f9ff" padding="12px" color="#0369a1">
                ℹ️ ${time}
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Instructions -->
          <mj-section padding="10px 40px">
            <mj-column>
              <mj-text>
                This link will <strong style="color:#ea580c;">expire in 30 minutes</strong>.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Button -->
          <mj-section padding="10px">
            <mj-column>
              <mj-button background-color="#ea580c" color="#ffffff" href="${link}">
                Reset My Password
              </mj-button>
            </mj-column>
          </mj-section>

          <!-- Warning -->
          <mj-section padding="0 40px 20px">
            <mj-column>
              <mj-text background-color="#fef2f2" padding="12px" color="#b91c1c">
                ⚠️ If you didn't request this, contact your administrator immediately.
              </mj-text>
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
