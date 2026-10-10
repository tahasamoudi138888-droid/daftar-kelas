/* Account ownership and TOTP are independent of the optional local encryption lock. */
let accountChallenge = null,
  accountSecurityStatus = null;
function accountRequest(path, body) {
  return managerRequest(
    `/api/v1/${path}`,
    body ? { method: "POST", body: JSON.stringify(body) } : {},
  );
}
function securityError(error) {
  toast(
    tr(
      error.message === "manager_security_required"
        ? "account_security_required"
        : error.message.includes("unconfigured")
          ? "account_delivery_unconfigured"
          : error.message === "verification_cooldown" || error.status === 429
            ? "account_code_wait"
            : "account_verification_failed",
    ),
  );
}
async function openAccountSecurity() {
  try {
    accountSecurityStatus = await accountRequest("security/status");
    const s = accountSecurityStatus;
    openModal(
      `<button class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr("settings_close"))}">${ICON.x}</button><h3>${tr("account_security")}</h3><p class="appearance-note">${tr("account_security_hint")}</p><div class="account-security-grid">${[
        ["email", s.email, s.email_verified_at, s.emailDeliveryReady],
        ["phone", s.phone, s.phone_verified_at, s.smsDeliveryReady],
      ]
        .map(
          ([kind, value, verified, ready]) =>
            `<article><h4>${tr(kind === "email" ? "manager_email" : "manager_phone")}</h4><p dir="ltr">${escapeHtml(value || "—")}</p><span class="settings-state ${verified ? "on" : "off"}">${tr(verified ? "account_verified" : "account_unverified")}</span>${kind === "phone" && !verified ? `<input id="verifyPhone" type="tel" dir="ltr" maxlength="11" placeholder="09123456789" value="${escapeAttr(value || managerConfig.phone || "")}">` : ""}${!verified ? `<button class="btn btn-outline-dark" ${!ready ? "disabled" : ""} data-action="requestContactCode('${kind}')">${tr("account_send_code")}</button>${!ready ? `<small>${tr("account_delivery_unconfigured")}</small>` : ""}` : ""}</article>`,
        )
        .join(
          "",
        )}</div><h4>${tr("account_mfa")}</h4><p>${tr(s.mfa_enabled ? "account_mfa_on" : "account_mfa_off")}</p><button class="btn btn-gold" ${!s.mfaReady ? "disabled" : ""} data-action="openMfaSetup(${!!s.mfa_enabled})">${tr(s.mfa_enabled ? "account_mfa_disable" : "account_mfa_enable")}</button>`,
    );
  } catch (e) {
    securityError(e);
  }
}
async function requestContactCode(kind) {
  try {
    const phone = normalizeIranMobile(
      document.getElementById("verifyPhone")?.value ||
        accountSecurityStatus?.phone ||
        "",
    );
    if (kind === "phone" && !isValidIranMobile(phone)) {
      toast(tr("manager_phone_invalid"));
      return;
    }
    accountChallenge = {
      ...(await accountRequest("security/contact-request", { kind, phone })),
      kind,
    };
    openCodeConfirmation(false);
  } catch (e) {
    securityError(e);
  }
}
function openCodeConfirmation(reset = false) {
  openModal(
    `<button class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr("settings_close"))}">${ICON.x}</button><h3>${tr(reset ? "account_reset_title" : "account_verify_title")}</h3><p>${tr("account_code_hint")}</p><div class="field"><label>${tr("account_code")}</label><input id="verifyCode" autocomplete="one-time-code" inputmode="numeric" maxlength="6" dir="ltr"></div>${reset ? `<div class="field"><label>${tr("manager_password")}</label><input id="resetPassword" type="password" autocomplete="new-password" minlength="10" maxlength="128"></div><p class="appearance-note">${tr("account_reset_local_note")}</p>` : ""}<button class="btn btn-gold" data-action="confirmContactCode(${reset})">${tr("btn_save")}</button>`,
  );
}
async function confirmContactCode(reset = false) {
  const code = normalizeDigits(
    document.getElementById("verifyCode")?.value || "",
  );
  if (!/^\d{6}$/.test(code)) {
    toast(tr("account_verification_failed"));
    return;
  }
  try {
    const body = {
      challengeId: accountChallenge?.challengeId,
      kind: accountChallenge?.kind,
      code,
    };
    if (reset) {
      body.password = document.getElementById("resetPassword")?.value || "";
      if (body.password.length < 10 || body.password.length > 128) {
        toast(tr("manager_password_invalid"));
        return;
      }
    }
    await accountRequest(
      reset ? "auth/reset-confirm" : "security/contact-confirm",
      body,
    );
    accountChallenge = null;
    if (reset) {
      closeModal();
      toast(tr("account_reset_done"));
    } else await openAccountSecurity();
  } catch (e) {
    securityError(e);
  }
}
function openPasswordReset() {
  openModal(
    `<button class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr("settings_close"))}">${ICON.x}</button><h3>${tr("account_reset_title")}</h3><div class="field"><label>${tr("manager_email")}</label><input id="resetEmail" type="email" autocomplete="email" maxlength="254" dir="ltr" value="${escapeAttr(managerConfig.email || "")}"></div><button class="btn btn-gold" data-action="requestPasswordReset()">${tr("account_send_code")}</button>`,
  );
}
async function requestPasswordReset() {
  const email = String(document.getElementById("resetEmail")?.value || "")
    .trim()
    .toLowerCase();
  if (!isValidContactEmail(email)) {
    toast(tr("manager_email_invalid"));
    return;
  }
  try {
    managerConfig.apiUrl = managerBackendUrl();
    accountChallenge = await accountRequest("auth/reset-request", { email });
    openCodeConfirmation(true);
  } catch (e) {
    securityError(e);
  }
}
function openMfaSetup(disable = false) {
  openModal(
    `<button class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr("settings_close"))}">${ICON.x}</button><h3>${tr(disable ? "account_mfa_disable" : "account_mfa_enable")}</h3><p>${tr("account_mfa_hint")}</p><div class="field"><label>${tr("manager_password")}</label><input id="mfaPassword" type="password" autocomplete="current-password" maxlength="128"></div>${disable ? `<div class="field"><label>${tr("account_code")}</label><input id="mfaCode" autocomplete="one-time-code" maxlength="30" dir="ltr"></div>` : ""}<button class="btn btn-gold" data-action="prepareMfa(${disable})">${tr("btn_save")}</button>`,
  );
}
async function prepareMfa(disable = false) {
  try {
    const password = document.getElementById("mfaPassword")?.value || "";
    if (disable) {
      await accountRequest("security/mfa-disable", {
        password,
        code: document.getElementById("mfaCode")?.value || "",
      });
      await openAccountSecurity();
      return;
    }
    const result = await accountRequest("security/mfa-setup", { password });
    openModal(
      `<button class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr("settings_close"))}">${ICON.x}</button><h3>${tr("account_mfa_enable")}</h3><p>${tr("account_mfa_setup_hint")}</p><code class="mfa-secret" dir="ltr">${escapeHtml(result.secret)}</code><div class="field"><label>${tr("account_code")}</label><input id="mfaCode" inputmode="numeric" maxlength="6" autocomplete="one-time-code" dir="ltr"></div><button class="btn btn-gold" data-action="confirmMfa()">${tr("btn_save")}</button>`,
    );
  } catch (e) {
    securityError(e);
  }
}
async function confirmMfa() {
  try {
    const result = await accountRequest("security/mfa-confirm", {
      code: normalizeDigits(document.getElementById("mfaCode")?.value || ""),
    });
    openModal(
      `<h3>${tr("account_recovery_codes")}</h3><p>${tr("account_recovery_hint")}</p><pre class="mfa-secret" dir="ltr">${result.recoveryCodes.map(escapeHtml).join("\n")}</pre><button class="btn btn-gold" data-action="closeModal()">${tr("settings_close")}</button>`,
    );
  } catch (e) {
    securityError(e);
  }
}
