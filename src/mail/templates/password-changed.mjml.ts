export const passwordChangedTemplate = (name: string, dashboardLink: string) => `
<mjml>
  <mj-head>
    <mj-font name="Inter" href="https://fonts.googleapis.com/css?family=Inter" />
  </mj-head>
  <mj-body background-color="#f7f9fc">

    <mj-section>
      <mj-column>

        <mj-wrapper background-color="#ffffff" padding="0" border="1px solid #e5e7eb">

          <!-- Header -->
          <mj-section background-color="#f0fdf4" padding="20px">
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

          <mj-divider border-color="#16a34a" border-width="3px" padding="0" />

          <!-- Icon -->
          <mj-section padding="10px">
            <mj-column>
              <mj-text align="center" font-size="28px">🔐</mj-text>
            </mj-column>
          </mj-section>

          <!-- Title -->
          <mj-section padding="0">
            <mj-column>
              <mj-text align="center" font-size="22px" color="#16a34a" font-weight="700">
                Password Changed Successfully
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Content -->
          <mj-section padding="10px 40px">
            <mj-column>
              <mj-text>Hi ${name},</mj-text>
              <mj-text>
                Your password for the <strong>Inventory Management System</strong> account 
                has been changed successfully.
              </mj-text>
              <mj-text>
                If you made this change, no further action is required.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- Warning -->
          <mj-section padding="0 40px">
            <mj-column>
              <mj-text background-color="#fef2f2" padding="12px" color="#b91c1c">
                ⚠️ If you did NOT make this change, contact your administrator immediately.
              </mj-text>
            </mj-column>
          </mj-section>

          <!-- CTA -->
          <mj-section padding="20px">
            <mj-column>
              <mj-button background-color="#2563eb" color="#ffffff" href="${dashboardLink}">
                Go to Dashboard
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
