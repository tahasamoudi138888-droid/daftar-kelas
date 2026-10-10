/* Manager actions are tenant-scoped on the server; saved views never contain account secrets. */
managerState.workbench = null;
function managerQualityPanel(summary) {
  const q = summary.quality;
  if (!q) return "";
  return `<section class="manager-quality-card"><header>${ICON.shield}<h3>${tr("manager_data_quality")}</h3><strong>${q.percent == null ? "—" : `${formatLocaleNumber(q.percent)}٪`}</strong></header><p>${tr("manager_quality_counts").replace("{received}", formatLocaleNumber(q.received)).replace("{expected}", formatLocaleNumber(q.expected)).replace("{fresh}", formatLocaleNumber(q.fresh))}</p><small>${tr("manager_last_received")}: ${q.last_received_at ? escapeHtml(new Date(q.last_received_at).toLocaleString()) : tr("manager_not_reported")}</small><div class="manager-quality-foot"><span>${tr("manager_enrollments")}: ${formatLocaleNumber(q.enrollments)}</span><span>${tr("manager_unique_students")}: ${q.uniqueStudents == null ? tr("manager_identity_incomplete") : formatLocaleNumber(q.uniqueStudents)}</span></div><p>${tr("manager_source_teacher")}</p><p>${tr("manager_score_definition").replace("{samples}", formatLocaleNumber(summary.scoreDefinition?.samples || 0))}</p><button class="btn btn-outline-dark" data-action="openAccountSecurity()">${tr("account_security")}</button><button class="btn btn-outline-dark" data-action="managerSetSection('actions')">${tr("manager_action_center")}</button></section>`;
}
async function managerLoadWorkbench() {
  try {
    managerState.workbench = await managerRequest("/api/v1/manager/workbench");
    renderManagerPortal();
  } catch (e) {
    securityError(e);
  }
}
function managerActionReason(reason) {
  if(reason.kind==='grade_drop')return tr('manager_reason_grade_drop').replace('{drop}',formatLocaleNumber(reason.drop)).replace('{exam}',examLabel(reason.exam)).replace('{previous}',formatLocaleNumber(reason.previous)).replace('{current}',formatLocaleNumber(reason.current));
  const key =
    reason.kind === "homework"
      ? "manager_reason_homework"
      : reason.kind === "consecutive_absence"
        ? "manager_reason_consecutive"
        : "manager_reason_absence";
  return tr(key).replace("{count}", formatLocaleNumber(reason.count));
}
function renderManagerWorkbench() {
  const w = managerState.workbench;
  if (!w)
    return `<div class="manager-empty"><p>${tr("manager_loading")}</p><button class="btn btn-gold" data-action="managerLoadWorkbench()">${tr("manager_retry")}</button></div>`;
  const tasks = w.tasks.filter((t) => !t.unavailable),
    actions = w.actions || [];
  return `<div class="manager-section-head"><h2>${tr("manager_action_center")}</h2><button class="btn btn-outline-dark" data-action="managerLoadWorkbench()">${ICON.refresh}</button></div>${managerQualityPanel(managerState.summary)}${w.truncated ? `<p role="status">${tr("manager_actions_partial")}</p>` : ""}<div class="manager-action-list">${actions.length ? actions.map((a) => `<article class="manager-action-card"><span>${a.kind === "student_risk" ? ICON.user : ICON.clock}</span><div><b>${escapeHtml(a.studentName || a.teacher || tr("manager_waiting_sync"))}</b><small>${a.kind === "student_risk" ? escapeHtml(a.className) + " · " + a.reasons.map(managerActionReason).map(escapeHtml).join(" · ") : tr(a.kind === "unavailable_report" ? "manager_report_unavailable" : "manager_report_overdue")}</small>${a.lastReceivedAt ? `<small>${escapeHtml(new Date(a.lastReceivedAt).toLocaleString())}</small>` : ""}</div>${a.teacherId ? `<button class="btn btn-outline-dark btn-sm" data-action="managerOpenTeacher('${a.teacherId}')">${tr("manager_branch_details")}</button>` : ""}</article>`).join("") : `<div class="manager-empty mini"><p>${tr("manager_no_actions")}</p></div>`}</div><div class="manager-section-head compact"><h2>${tr("manager_followups")}</h2>${managerCanWrite() ? `<button class="btn btn-gold" data-action="managerEditTask('')">${ICON.plusCircle}${tr("manager_task_new")}</button>` : ""}</div><div class="manager-action-list">${tasks.length ? tasks.map((t) => `<article class="manager-action-card ${t.status === "done" ? "done" : ""}"><span>${t.status === "done" ? ICON.check : ICON.calendar}</span><div><b>${escapeHtml(t.title)}</b><small>${escapeHtml(t.assignee || tr("manager_task_unassigned"))} · ${t.dueDate ? escapeHtml(String(t.dueDate).slice(0, 10)) : tr("manager_task_no_due")} · ${tr("manager_task_" + t.status)}</small></div>${managerCanWrite() ? `<button class="btn btn-outline-dark btn-sm" data-action="managerEditTask('${t.id}')">${ICON.edit}</button>` : ""}</article>`).join("") : `<div class="manager-empty mini"><p>${tr("manager_task_empty")}</p></div>`}</div><div class="manager-section-head compact"><h2>${tr("manager_saved_views")}</h2><button class="btn btn-outline-dark" data-action="managerSaveView()">${tr("manager_view_save")}</button></div><div class="manager-saved-views">${w.views.map((v) => `<div><button class="btn btn-outline-dark" data-action="managerApplyView('${v.id}')">${escapeHtml(v.name)}</button><button class="icon-action danger" data-action="managerDeleteView('${v.id}')" aria-label="${escapeAttr(tr("btn_delete"))}">${ICON.trash}</button></div>`).join("")}</div><section class="manager-class-status-list"><h3>${tr("manager_class_status")}</h3><p>${tr("manager_source_manual")}</p>${(
    w.operations || []
  )
    .slice(0, 30)
    .map(
      (o) =>
        `<p>${escapeHtml(o.class_id)} · ${escapeHtml(String(o.session_date).slice(0, 10))} · ${tr("manager_status_" + o.status)}</p>`,
    )
    .join(
      "",
    )}</section><button class="btn btn-outline-dark" data-action="managerWeeklyReport()">${ICON.download}${tr("manager_weekly_report")}</button>`;
}
function managerEditTask(id) {
  const t = managerState.workbench?.tasks.find((t) => t.id === id) || {},
    branches = managerState.summary.branches;
  openModal(
    `<button class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr("settings_close"))}">${ICON.x}</button><h3>${tr("manager_task_new")}</h3><div class="field"><label>${tr("manager_task_title")}</label><textarea id="taskTitle" maxlength="500">${escapeHtml(t.title || "")}</textarea></div><div class="field"><label>${tr("manager_branches")}</label><select id="taskBranch">${branches.map((b) => `<option value="${b.id}" ${t.branchId === b.id ? "selected" : ""}>${escapeHtml(b.name)}</option>`).join("")}</select></div><div class="field"><label>${tr("manager_task_assignee")}</label><select id="taskAssignee"><option value="">${tr("manager_task_unassigned")}</option>${(managerState.workbench?.members || []).map((m) => `<option value="${m.id}" ${m.id === t.assignedTo ? "selected" : ""}>${escapeHtml(m.name)}</option>`).join("")}</select></div><div class="field"><label>${tr("manager_note_due")}</label><input id="taskDue" type="date" value="${escapeAttr(String(t.dueDate || "").slice(0, 10))}"></div><div class="field"><label>${tr("manager_task_status")}</label><select id="taskStatus">${["open", "doing", "done"].map((x) => `<option value="${x}" ${t.status === x ? "selected" : ""}>${tr("manager_task_" + x)}</option>`).join("")}</select></div><button class="btn btn-gold" data-action="managerSaveTask('${id}')">${tr("btn_save")}</button>`,
  );
}
async function managerSaveTask(id) {
  const current = managerState.workbench?.tasks.find((t) => t.id === id),
    body = {
      title: document.getElementById("taskTitle").value.trim(),
      branchId: document.getElementById("taskBranch").value,
      assignedTo: document.getElementById("taskAssignee").value,
      dueDate: document.getElementById("taskDue").value,
      status: document.getElementById("taskStatus").value,
      version: current?.version,
    };
  if (!body.title) return;
  try {
    await managerRequest(
      `/api/v1/manager/workbench/tasks${id ? "/" + id : ""}`,
      { method: id ? "PUT" : "POST", body: JSON.stringify(body) },
    );
    closeModal();
    await managerLoadWorkbench();
  } catch (e) {
    if (e.status === 409) {
      closeModal();
      await managerLoadWorkbench();
      toast(tr("manager_conflict_reload"));
    } else securityError(e);
  }
}
function managerSaveView() {
  openModal(
    `<h3>${tr("manager_view_save")}</h3><div class="field"><label>${tr("manager_task_title")}</label><input id="viewName" maxlength="80"></div><button class="btn btn-gold" data-action="managerConfirmSaveView()">${tr("btn_save")}</button>`,
  );
}
async function managerConfirmSaveView() {
  const name = document.getElementById("viewName")?.value.trim();
  if (!name) return;
  try {
    await managerRequest("/api/v1/manager/workbench/views", {
      method: "POST",
      body: JSON.stringify({
        name,
        filters: {
          section: managerState.section,
          branchId: managerState.branchId || "",
          q: managerState.directoryQuery || "",
        },
      }),
    });
    closeModal();
    await managerLoadWorkbench();
  } catch (e) {
    securityError(e);
  }
}
async function managerApplyView(id) {
  const v = managerState.workbench?.views.find((v) => v.id === id);
  if (!v) return;
  managerState.directoryQuery = v.filters.q;
  await managerSetSection(v.filters.section);
  if (v.filters.branchId) managerSelectBranch(v.filters.branchId);
}
async function managerDeleteView(id) {
  try {
    await managerRequest(`/api/v1/manager/workbench/views/${id}`, {
      method: "DELETE",
    });
    await managerLoadWorkbench();
  } catch (e) {
    securityError(e);
  }
}
function openManagerSettings() {
  openModal(
    `<button class="modal-close-x" data-action="closeModal()" aria-label="${escapeAttr(tr("settings_close"))}">${ICON.x}</button><h3>${tr("settings_title")}</h3><div class="manager-settings-grid">${[
      ["account_security", ICON.shield, "openAccountSecurity()"],
      ["manager_edit_profile", ICON.user, "managerEditProfile()"],
      [
        "manager_team",
        ICON.users || ICON.user,
        "openManagerSettingsSection('team')",
      ],
      [
        "manager_saved_views",
        ICON.folder,
        "openManagerSettingsSection('actions')",
      ],
      ["settings_appearance_title", ICON.brush, "openAppearanceModal()"],
      ["settings_title", ICON.gear, "openSettingsModal()"],
    ]
      .filter((x) => x[0] !== "manager_team" || managerCanSeeTeam())
      .map(
        ([key, icon, action]) =>
          `<button class="backup-row" data-action="${action}"><span class="theme-icon">${icon}</span><b>${tr(key)}</b>${ICON.chev}</button>`,
      )
      .join(
        "",
      )}</div><p class="appearance-note">${tr("manager_backup_limits")}</p>`,
  );
}
function openManagerSettingsSection(section){closeModal();return managerSetSection(section)}
function managerWeeklyReport() {
  const s = managerState.summary,
    w = managerState.workbench;
  if (!s) return;
  const trend = (s.trend || []).slice(-7),
    rows = trend
      .map(
        (x) =>
          `<tr><td>${escapeHtml(String(x.date).slice(0, 10))}</td><td>${formatLocaleNumber(x.present)}</td><td>${formatLocaleNumber(x.late)}</td><td>${formatLocaleNumber(x.absent)}</td><td>${formatLocaleNumber(x.held_classes)}</td></tr>`,
      )
      .join("");
  const body = `<h1>${tr("manager_weekly_report")}</h1><h2>${escapeHtml(s.organization.name)}</h2>${managerQualityPanel(s)}<p>${tr("manager_weekly_note")}</p><table><thead><tr>${["manager_note_due", "manager_present", "manager_late_students", "manager_absent", "manager_held_classes"].map((k) => `<th>${tr(k)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table><h2>${tr("manager_followups")}</h2><ul>${(
    w?.tasks || []
  )
    .filter((t) => t.status !== "done")
    .map(
      (t) =>
        `<li>${escapeHtml(t.title)} · ${escapeHtml(t.assignee || "—")} · ${escapeHtml(String(t.dueDate || "—").slice(0, 10))}</li>`,
    )
    .join("")}</ul>`;
  const win = window.open("", "_blank");
  if (!win) {
    toast(tr("manager_report_popup"));
    return;
  }
  win.document.open();
  win.document.write(
    `<!doctype html><html lang="${escapeAttr(data.settings.lang)}" dir="${document.documentElement.dir}"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; font-src 'self'; img-src 'none'; base-uri 'none'"><title>${tr("manager_weekly_report")}</title><link rel="stylesheet" href="${new URL("assets/css/manager-report.css", location.href).href}"></head><body>${body}</body></html>`,
  );
  win.document.close();
  win.addEventListener("load", () => win.print(), { once: true });
}
async function managerOpenClassStatus() {
  if(!managerState.workbench)await managerLoadWorkbench();
  if(!managerState.workbench)return;
  const cls = currentManagerClass();
  if (!cls) return;
  const date = tehranNow().iso,
    op = managerState.workbench?.operations.find(
      (o) =>
        o.teacher_user_id === managerState.teacherId &&
        o.class_id === cls.id &&
        String(o.session_date).slice(0, 10) === date,
    );
  openModal(
    `<h3>${tr("manager_class_status")}</h3><div class="field"><label>${tr("manager_note_due")}</label><input id="classStatusDate" type="date" value="${date}"></div><div class="field"><label>${tr("manager_class_status")}</label><select id="classStatusValue">${["held", "cancelled", "makeup", "substitute"].map((s) => `<option value="${s}" ${op?.status === s ? "selected" : ""}>${tr("manager_status_" + s)}</option>`).join("")}</select></div><div class="field"><label>${tr("manager_status_substitute")}</label><select id="classSubstitute"><option value="">—</option>${(
      managerState.workbench?.members || []
    )
      .filter((m) => m.role === "teacher")
      .map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`)
      .join(
        "",
      )}</select></div><button class="btn btn-gold" data-action="managerSaveClassStatus()">${tr("btn_save")}</button>`,
  );
}
async function managerSaveClassStatus() {
  const date = document.getElementById("classStatusDate").value,
    old = managerState.workbench?.operations.find(
      (o) =>
        o.teacher_user_id === managerState.teacherId &&
        o.class_id === managerState.classId &&
        String(o.session_date).slice(0, 10) === date,
    ),
    body = {
      teacherId: managerState.teacherId,
      classId: managerState.classId,
      date,
      status: document.getElementById("classStatusValue").value,
      substituteId: document.getElementById("classSubstitute").value || null,
      version: old?.version || 0,
    };
  try {
    await managerRequest("/api/v1/manager/workbench/class-status", {
      method: "PUT",
      body: JSON.stringify(body),
    });
    closeModal();
    await managerLoadWorkbench();
    toast(tr("toast_saved"));
  } catch (e) {
    if (e.status === 409) {
      closeModal();
      await managerLoadWorkbench();
      toast(tr("manager_conflict_reload"));
    } else securityError(e);
  }
}

function renderManagerComparison(summary) {
  return `<section class="manager-comparison"><h3>${tr("manager_compare_branches")}</h3><p class="manager-muted-note">${tr("manager_compare_note")}</p><div class="manager-comparison-grid">${summary.branches
    .map(
      (b) =>
        `<article><h4>${escapeHtml(b.name)}</h4><p>${tr("manager_attendance")}: ${b.attendance_rate == null ? tr("manager_not_reported") : formatLocaleNumber(b.attendance_rate) + "٪"}</p><p>${tr("manager_grade_average")}: ${b.score?.average_score == null ? tr("manager_not_reported") : formatLocaleNumber(b.score.average_score) + "٪"} · ${tr("manager_score_samples").replace("{count}", formatLocaleNumber(b.score?.samples || 0))}</p><p>${tr(
          "manager_quality_counts",
        )
          .replace("{received}", formatLocaleNumber(b.quality?.received || 0))
          .replace("{expected}", formatLocaleNumber(b.quality?.expected || 0))
          .replace(
            "{fresh}",
            formatLocaleNumber(b.quality?.fresh || 0),
          )}</p><small>${tr("manager_last_received")}: ${b.quality?.last_received_at ? escapeHtml(new Date(b.quality.last_received_at).toLocaleString()) : tr("manager_not_reported")}</small></article>`,
    )
    .join("")}</div></section>`;
}
