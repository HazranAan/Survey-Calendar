"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

/* ===================== Types ===================== */

type View = "day" | "week" | "month";
type Status = "available" | "booked" | "completed" | "unavailable";

type BackendSite = { idx: string; site_id?: string; name?: string };
type BackendSurvey = {
  idx: string;
  site: BackendSite;
  surveyor_booking: number;
  time_slot: string; // "10:00-11:00"
  survey_type: string; // "FINAL" | ...
  bd_remarks?: string;
  is_completed: boolean;
  completed_on: string | null;
  // maybe extra fields in backend:
  survey_remarks?: string | null;
  survey_photo_data_url?: string | null;
};

type BackendList = {
  total_pages?: number;
  total_records?: number;
  next_page_url?: string | null;
  previous_page_url?: string | null;
  current_page?: number;
  results: BackendSurvey[];
};

type SurveyorMeta = {
  bookingId: number; // ✅ REAL backend pk (surveyor_booking)
  name: string;
  region: string;
  state: string;
};

type DayRow = {
  bookingId: number;
  name: string;
  slots: Record<string, Status>;
};

type BookingDraft = {
  projectSiteName: string;
  siteIdx: string; // ✅ backend site idx (STxxxx)
  surveyorBookingId: number;
  surveyorName: string;
  region: string;
  state: string;
  surveyDateISO: string; // for UI only
  timeSlot: string; // "10:00 AM - 11:00 AM" (UI)
  timeSlotBackend: string; // "10:00-11:00"
  surveyType: string;
  bdRemarks: string;
};

type Booking = {
  idx: string; // ✅ backend survey idx (SVY...)
  siteIdx: string;
  siteName: string;
  projectSiteName: string;
  surveyorBookingId: number;
  surveyorName: string;
  region: string;
  state: string;
  surveyDateISO: string; // UI-only
  timeSlotBackend: string; // "10:00-11:00"
  startLabel: string; // "10:00 AM"
  endLabel: string; // "11:00 AM"
  surveyType: string;
  bdRemarks: string;
  isCompleted: boolean;

  surveyRemarks?: string;
  surveyPhotoDataUrl?: string;
};

type MonthDot = "green" | "orange" | "red";

/* ===================== Constants ===================== */

const DAY_TIMES = [
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
];

const MALAYSIA_REGIONS = ["Central", "Northern", "Southern", "East Coast", "East Malaysia"] as const;
const MALAYSIA_STATES = [
  "Johor","Kedah","Kelantan","Melaka","Negeri Sembilan","Pahang","Perak","Perlis","Pulau Pinang",
  "Sabah","Sarawak","Selangor","Terengganu","Kuala Lumpur","Putrajaya","Labuan",
] as const;

const MONTH_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ===================== Small UI Components ===================== */

function Icon({ name }: { name: "dashboard" | "calendar" | "users" | "billing" | "settings" }) {
  const common = "h-5 w-5";
  if (name === "calendar")
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M7 3v2M17 3v2M4 8h16M6 6h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  if (name === "users")
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  if (name === "billing")
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M7 7h10M7 11h10M7 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M6 3h9l3 3v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (name === "settings")
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2" />
        <path
          d="M19.4 15a7.97 7.97 0 0 0 .1-1 7.97 7.97 0 0 0-.1-1l2-1.5-2-3.46-2.35 1a8.04 8.04 0 0 0-1.73-1L15 2h-6l-.32 3.04c-.6.23-1.18.56-1.73 1l-2.35-1-2 3.46L4.6 13a7.97 7.97 0 0 0-.1 1c0 .34.03.67.1 1l-2 1.5 2 3.46 2.35-1c.55.44 1.13.77 1.73 1L9 22h6l.32-3.04c.6-.23 1.18-.56 1.73-1l2.35 1 2-3.46-2-1.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none">
      <path d="M4 19h16M4 5h7v14H4V5Zm9 7h7v7h-7v-7Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function NavItem({
  active,
  icon,
  label,
}: {
  active?: boolean;
  icon: "dashboard" | "calendar" | "users" | "billing" | "settings";
  label: string;
}) {
  return (
    <div
      className={[
        "flex items-center gap-3 px-7 py-3 cursor-pointer select-none",
        active ? "text-fuchsia-600 bg-fuchsia-50 border-r-4 border-fuchsia-500" : "text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      <span className={active ? "text-fuchsia-600" : "text-slate-600"}>
        <Icon name={icon} />
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function SegmentedTabs({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const base = "px-6 h-10 rounded-xl text-sm font-semibold transition";
  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
      <button
        onClick={() => onChange("day")}
        className={[base, value === "day" ? "bg-fuchsia-500 text-white shadow-sm" : "text-slate-700 hover:bg-slate-200"].join(
          " "
        )}
      >
        Day
      </button>
      <button
        onClick={() => onChange("week")}
        className={[base, value === "week" ? "bg-fuchsia-500 text-white shadow-sm" : "text-slate-700 hover:bg-slate-200"].join(
          " "
        )}
      >
        Week
      </button>
      <button
        onClick={() => onChange("month")}
        className={[
          base,
          value === "month" ? "bg-fuchsia-500 text-white shadow-sm" : "text-slate-700 hover:bg-slate-200",
        ].join(" ")}
      >
        Month
      </button>
    </div>
  );
}

function ArrowBtn({ dir, onClick, label }: { dir: "left" | "right"; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        {dir === "left" ? (
          <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

function StatusPillDay({ status, onClick, disabled }: { status: Status; onClick?: () => void; disabled?: boolean }) {
  const cfg = useMemo(() => {
    if (status === "available") return { label: "Available", cls: "bg-emerald-100 text-emerald-700" };
    if (status === "booked") return { label: "Booked", cls: "bg-rose-100 text-rose-700" };
    if (status === "completed") return { label: "Completed", cls: "bg-blue-100 text-blue-700" };
    return { label: "Unavailable", cls: "bg-slate-200 text-slate-600" };
  }, [status]);

  const clickable = Boolean(onClick) && status !== "unavailable" && !disabled;
  const Tag = clickable ? "button" : "span";

  return (
    <Tag
      onClick={onClick}
      className={[
        "inline-flex items-center justify-center h-7 px-4 rounded-full text-xs font-semibold",
        cfg.cls,
        clickable ? "hover:opacity-90 cursor-pointer" : "",
        disabled && status === "available" ? "opacity-50 cursor-not-allowed" : "",
      ].join(" ")}
      {...(clickable ? { type: "button" as const } : {})}
      title={disabled ? "Maximum 3 surveys per day for this surveyor." : ""}
    >
      {cfg.label}
    </Tag>
  );
}

function WeekUsagePill({ used, total }: { used: number; total: number }) {
  const ratio = total === 0 ? 0 : used / total;
  const cls =
    ratio >= 1 ? "bg-rose-50 text-rose-700 border-rose-100" : ratio >= 0.33 ? "bg-orange-50 text-orange-700 border-orange-100" : "bg-emerald-50 text-emerald-700 border-emerald-100";

  return (
    <div className={["h-11 w-[140px] rounded-xl border flex items-center justify-center text-sm font-semibold leading-tight text-center px-3", cls].join(" ")}>
      <span>
        {used} of {total} slots
        <br />
        used
      </span>
    </div>
  );
}

function UnavailablePill() {
  return <div className="h-11 w-[140px] rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-semibold">Unavailable</div>;
}

function Dot({ kind }: { kind: MonthDot }) {
  const cls = kind === "green" ? "bg-emerald-500" : kind === "orange" ? "bg-orange-500" : "bg-rose-500";
  return <span className={["h-2 w-2 rounded-full inline-block", cls].join(" ")} />;
}

/* ===================== Modals ===================== */

function ModalShell({
  open,
  onClose,
  title,
  headerRight,
  children,
  footer,
  widthClass = "max-w-[560px]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/40" aria-label="Close modal overlay" />
      <div className="relative z-[61] min-h-full flex items-end md:items-center justify-center p-0 md:p-6">
        <div
          className={[
            "w-full",
            widthClass,
            "rounded-t-2xl md:rounded-2xl overflow-hidden shadow-2xl bg-white",
            "max-h-[92vh] md:max-h-[calc(100vh-3rem)]",
            "flex flex-col",
          ].join(" ")}
        >
          <div className="bg-fuchsia-500 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="text-white font-semibold">{title}</div>
            <div className="flex items-center gap-3">
              {headerRight}
              <button
                type="button"
                onClick={onClose}
                className="text-white/90 hover:text-white text-3xl leading-none px-2 -mr-2"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1">{children}</div>

          {footer ? (
            <div className="px-6 pb-6 bg-white shrink-0">
              <div className="border-t pt-4 flex items-center justify-end gap-3 flex-wrap">{footer}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-slate-700">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </div>
      {children}
    </div>
  );
}

function BookSurveyModal({
  open,
  onClose,
  draft,
  setDraft,
  onConfirm,
  siteOptions,
}: {
  open: boolean;
  onClose: () => void;
  draft: BookingDraft;
  setDraft: React.Dispatch<React.SetStateAction<BookingDraft>>;
  onConfirm: () => void;
  siteOptions: Array<{ idx: string; label: string }>;
}) {
  const canConfirm = draft.projectSiteName.trim().length > 0 && draft.surveyType.trim().length > 0 && draft.siteIdx.trim().length > 0;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Book Survey"
      widthClass="max-w-[560px]"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-11 px-6 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={[
              "h-11 px-6 rounded-xl text-sm font-semibold",
              canConfirm ? "bg-fuchsia-500 text-white hover:opacity-95" : "bg-slate-200 text-slate-500 cursor-not-allowed",
            ].join(" ")}
          >
            Confirm Booking
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Project / Site Name" required>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-fuchsia-200"
            placeholder="Enter project or site name"
            value={draft.projectSiteName}
            onChange={(e) => setDraft((d) => ({ ...d, projectSiteName: e.target.value }))}
          />
        </Field>

        <Field label="Select Site (Backend)" required>
          <select
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-fuchsia-200"
            value={draft.siteIdx}
            onChange={(e) => setDraft((d) => ({ ...d, siteIdx: e.target.value }))}
          >
            <option value="">Select site</option>
            {siteOptions.map((s) => (
              <option key={s.idx} value={s.idx}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Surveyor Name">
          <input className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 text-slate-700" value={draft.surveyorName} readOnly />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Region">
            <input className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 text-slate-700" value={draft.region} readOnly />
          </Field>
          <Field label="State">
            <input className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 text-slate-700" value={draft.state} readOnly />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Survey Date">
            <input className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 text-slate-700" value={fmtFullDate(new Date(draft.surveyDateISO + "T00:00:00"))} readOnly />
          </Field>
          <Field label="Time Slot">
            <input className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm bg-slate-50 text-slate-700" value={draft.timeSlot} readOnly />
          </Field>
        </div>

        <Field label="Survey Type" required>
          <select
            className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-fuchsia-200"
            value={draft.surveyType}
            onChange={(e) => setDraft((d) => ({ ...d, surveyType: e.target.value }))}
          >
            <option value="">Select survey type</option>
            <option value="SITE_VISIT">SITE_VISIT</option>
            <option value="INITIAL">INITIAL</option>
            <option value="FINAL">FINAL</option>
          </select>
        </Field>

        <Field label="BD Remarks">
          <textarea
            className="min-h-[96px] w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-fuchsia-200"
            placeholder="Enter any additional remarks or notes..."
            value={draft.bdRemarks}
            onChange={(e) => setDraft((d) => ({ ...d, bdRemarks: e.target.value }))}
          />
        </Field>

        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
          <span className="inline-flex h-5 w-5 rounded-full bg-blue-600 text-white items-center justify-center text-xs font-bold">i</span>
          <span>Maximum 3 surveys per surveyor per day are allowed.</span>
        </div>
      </div>
    </ModalShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function CompleteSurveyModal({
  open,
  onClose,
  booking,
  remarks,
  setRemarks,
  photoDataUrl,
  setPhotoDataUrl,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  remarks: string;
  setRemarks: (v: string) => void;
  photoDataUrl: string;
  setPhotoDataUrl: (v: string) => void;
  onConfirm: () => void;
}) {
  if (!open || !booking) return null;

  const canConfirm = remarks.trim().length > 0 && Boolean(photoDataUrl) && !booking.isCompleted;

  const onPickFile = async (file: File | null) => {
    if (!file) return setPhotoDataUrl("");
    if (!file.type.startsWith("image/")) return setPhotoDataUrl("");
    const dataUrl = await fileToDataUrl(file);
    setPhotoDataUrl(dataUrl);
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Complete Survey"
      widthClass="max-w-[720px]"
      footer={
        <>
          <button type="button" onClick={onClose} className="h-11 px-6 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={[
              "h-11 px-6 rounded-xl text-sm font-semibold",
              canConfirm ? "bg-fuchsia-500 text-white hover:opacity-95" : "bg-slate-200 text-slate-500 cursor-not-allowed",
            ].join(" ")}
          >
            Confirm Complete
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="font-semibold text-slate-900">
            {booking.surveyorName} • {fmtFullDate(new Date(booking.surveyDateISO + "T00:00:00"))}
          </div>
          <div className="text-sm text-slate-600 mt-1">
            {booking.startLabel} - {booking.endLabel} • {booking.region} • {booking.state}
          </div>
          <div className="text-sm text-slate-700 mt-2">
            <span className="font-semibold">Project:</span> {booking.siteName || booking.projectSiteName}
          </div>
        </div>

        <Field label="Survey Remarks" required>
          <textarea
            className="min-h-[120px] w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-fuchsia-200"
            placeholder="Survey remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </Field>

        <Field label="Upload Survey Photo" required>
          <div className="space-y-3">
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:opacity-95"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />

            {photoDataUrl ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="text-sm font-semibold text-slate-700 mb-2">Preview</div>
                <img src={photoDataUrl} alt="Survey upload preview" className="w-full max-h-[360px] object-contain rounded-xl bg-slate-50" />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl("")}
                    className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50"
                  >
                    Remove Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Upload a picture to complete.</div>
            )}
          </div>
        </Field>
      </div>
    </ModalShell>
  );
}

function SurveyDetailsModal({
  open,
  onClose,
  booking,
  onCancel,
  onReschedule,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  booking: Booking | null;
  onCancel: () => void;
  onReschedule: () => void;
  onComplete: () => void;
}) {
  if (!open || !booking) return null;

  const isCompleted = booking.isCompleted;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Survey Details for ${fmtFullDate(new Date(booking.surveyDateISO + "T00:00:00"))}`}
      widthClass="max-w-[760px]"
      headerRight={
        <div className="text-white/90 text-sm font-medium flex items-center gap-3">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white/90" />
            {booking.startLabel}
          </span>
          <span>•</span>
          <span>1 Survey Scheduled</span>
        </div>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={onCancel}
            disabled={isCompleted}
            className={[
              "h-11 px-6 rounded-xl border text-sm font-semibold",
              isCompleted ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed" : "border-rose-300 bg-white text-rose-600 hover:bg-rose-50",
            ].join(" ")}
          >
            Cancel Survey
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onReschedule}
              disabled={isCompleted}
              className={[
                "h-11 px-6 rounded-xl text-sm font-semibold",
                isCompleted ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-amber-400 text-amber-900 hover:bg-amber-500",
              ].join(" ")}
            >
              Reschedule Survey
            </button>

            <button
              type="button"
              onClick={onComplete}
              disabled={isCompleted}
              className={[
                "h-11 px-6 rounded-xl text-sm font-semibold",
                isCompleted ? "bg-slate-200 text-slate-500 cursor-not-allowed" : "bg-fuchsia-500 text-white hover:opacity-95",
              ].join(" ")}
            >
              Complete
            </button>
          </div>
        </div>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-full bg-white border overflow-hidden flex items-center justify-center font-bold text-slate-700">
              {booking.surveyorName ? initials(booking.surveyorName) : "SC"}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{booking.surveyorName}</div>
              <div className="text-sm text-slate-500">Surveyor</div>
            </div>
          </div>

          <span
            className={[
              "inline-flex h-8 items-center rounded-full px-4 text-xs font-semibold",
              !booking.isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700",
            ].join(" ")}
          >
            {!booking.isCompleted ? "Confirmed" : "Completed"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Detail label="Region & State" value={`${booking.region} • ${booking.state}`} />
          <Detail label="Project / Site" value={booking.siteName || booking.projectSiteName} />
          <Detail label="Survey Type" value={booking.surveyType} />
          <Detail label="BD Remarks" value={booking.bdRemarks || "-"} />
          <Detail label="Survey Remarks" value={booking.surveyRemarks?.trim() ? booking.surveyRemarks : "-"} />
        </div>

        {booking.surveyPhotoDataUrl ? (
          <div className="mt-5">
            <div className="text-xs font-semibold text-slate-500">Survey Photo</div>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3">
              <img src={booking.surveyPhotoDataUrl} alt="Survey proof" className="w-full max-h-[420px] object-contain rounded-xl bg-slate-50" />
            </div>
          </div>
        ) : null}

        {isCompleted ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
            This survey has been completed and can no longer be edited.
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}

function SuccessToast({ open, text, onClose }: { open: boolean; text: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close success overlay" />
      <div className="relative bg-white rounded-2xl shadow-2xl border p-6 w-full max-w-[420px]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-slate-900">Success</div>
            <div className="text-sm text-slate-600">{text}</div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="h-10 px-5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-95">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== Page ===================== */

export default function Home() {
  const [view, setView] = useState<View>("day");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [surveys, setSurveys] = useState<BackendSurvey[]>([]);
  const [siteOptions, setSiteOptions] = useState<Array<{ idx: string; label: string }>>([]);

  // derived surveyors from backend (unique booking ids)
  const [surveyors, setSurveyors] = useState<SurveyorMeta[]>([]);
  const [dayData, setDayData] = useState<DayRow[]>([]);

  // local bookings for UI state (so no refresh)
  const [bookings, setBookings] = useState<Record<string, Booking>>({});

  // Day navigation
  const [dayOffset, setDayOffset] = useState(0);
  const BASE_DAY = useMemo(() => new Date(), []);
  const dayCursor = useMemo(() => addDays(BASE_DAY, dayOffset), [BASE_DAY, dayOffset]);
  const dayISO = useMemo(() => toISODate(dayCursor), [dayCursor]);

  const dayTitle = useMemo(
    () =>
      dayCursor.toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    [dayCursor]
  );

  // Week / Month offsets (match day cursor)
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    // sync weekOffset & monthOffset with dayCursor
    // (simple: compute delta from BASE_DAY for week/month view)
    const diffDays = Math.round((startOfDay(dayCursor).getTime() - startOfDay(BASE_DAY).getTime()) / (1000 * 60 * 60 * 24));
    setWeekOffset(Math.floor(diffDays / 7));
    setMonthOffset(dayCursor.getFullYear() * 12 + dayCursor.getMonth() - (BASE_DAY.getFullYear() * 12 + BASE_DAY.getMonth()));
  }, [dayCursor, BASE_DAY]);

  const weekStart = useMemo(() => startOfWeek(dayCursor), [dayCursor]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const monthCursor = useMemo(() => addMonths(new Date(BASE_DAY.getFullYear(), BASE_DAY.getMonth(), 1), monthOffset), [BASE_DAY, monthOffset]);
  const monthTitle = useMemo(() => fmtMonthTitle(monthCursor), [monthCursor]);

  const weekDays = useMemo(() => {
    const keys = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
    return keys.map((k, idx) => {
      const d = addDays(weekStart, idx);
      return { key: k, date: fmtShortMonthDay(d), iso: toISODate(d) };
    });
  }, [weekStart]);

  // Filters
  const [filterDraft, setFilterDraft] = useState({
    region: "All Regions",
    state: "All States",
    status: "All Status",
    surveyor: "",
  });
  const [filterApplied, setFilterApplied] = useState({
    region: "All Regions",
    state: "All States",
    status: "All Status",
    surveyor: "",
  });

  const stateOptionsList = useMemo(() => {
    const region = filterDraft.region;
    if (region === "All Regions") return Array.from(MALAYSIA_STATES);
    if (region === "Central") return ["Selangor", "Kuala Lumpur", "Putrajaya", "Negeri Sembilan"];
    if (region === "Northern") return ["Pulau Pinang", "Perak", "Kedah", "Perlis"];
    if (region === "Southern") return ["Johor", "Melaka"];
    if (region === "East Coast") return ["Kelantan", "Terengganu", "Pahang"];
    if (region === "East Malaysia") return ["Sabah", "Sarawak", "Labuan"];
    return Array.from(MALAYSIA_STATES);
  }, [filterDraft.region]);

  const resetFilters = () => {
    const reset = { region: "All Regions", state: "All States", status: "All Status", surveyor: "" };
    setFilterDraft(reset);
    setFilterApplied(reset);
  };
  const applyFilters = () => setFilterApplied(filterDraft);

  // Selected slot
  const [selected, setSelected] = useState<{ bookingId: number; time: string; dateISO: string } | null>(null);

  // Modals
  const [bookOpen, setBookOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);

  const [completeRemarks, setCompleteRemarks] = useState("");
  const [completePhoto, setCompletePhoto] = useState("");

  const [successOpen, setSuccessOpen] = useState(false);
  const [successText, setSuccessText] = useState("Completed successfully.");

  const [bookingDraft, setBookingDraft] = useState<BookingDraft>({
    projectSiteName: "",
    siteIdx: "",
    surveyorBookingId: 0,
    surveyorName: "",
    region: "",
    state: "",
    surveyDateISO: toISODate(new Date()),
    timeSlot: "",
    timeSlotBackend: "",
    surveyType: "",
    bdRemarks: "",
  });

  const currentBooking = useMemo(() => {
    if (!selected) return null;
    return bookings[slotKey(selected.dateISO, selected.bookingId, selected.time)] ?? null;
  }, [bookings, selected]);

  useEffect(() => {
    const shouldLock = sidebarOpen || bookOpen || detailsOpen || successOpen || completeOpen;
    const prev = document.body.style.overflow;
    if (shouldLock) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen, bookOpen, detailsOpen, successOpen, completeOpen]);

  /* ===================== FETCH (GET surveys) ===================== */
  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        setLoading(true);
        setApiError(null);

        // fetch page 1 (you can add pagination later)
        const res = await axios.get<BackendList>("/api/surveys?page=1");
        const list = res.data?.results ?? [];

        if (!mounted) return;

        setSurveys(list);

        // build site options from existing surveys (valid idx)
        const siteMap = new Map<string, string>();
        for (const s of list) {
          const idx = s.site?.idx;
          if (!idx) continue;
          const label = `${s.site?.site_id ?? ""} ${s.site?.name ?? ""}`.trim() || idx;
          if (!siteMap.has(idx)) siteMap.set(idx, label);
        }
        setSiteOptions(Array.from(siteMap.entries()).map(([idx, label]) => ({ idx, label })));

        // derive surveyor booking ids
        const bookingIds = Array.from(new Set(list.map((x) => x.surveyor_booking).filter(Boolean))).sort((a, b) => a - b);

        // if empty, show 10 dummy unavailable
        const derivedSurveyors: SurveyorMeta[] =
          bookingIds.length > 0
            ? bookingIds.map((bid, i) => ({
                bookingId: bid,
                name: `Surveyor #${i + 1}`,
                region: pick(MALAYSIA_REGIONS),
                state: pick(MALAYSIA_STATES),
              }))
            : Array.from({ length: 10 }).map((_, i) => ({
                bookingId: 0,
                name: `Surveyor #${i + 1}`,
                region: pick(MALAYSIA_REGIONS),
                state: pick(MALAYSIA_STATES),
              }));

        setSurveyors(derivedSurveyors);

        // build day data for current date
        const rows: DayRow[] = derivedSurveyors.map((sv) => ({
          bookingId: sv.bookingId,
          name: sv.name,
          slots: generateSlotsAllAvailable(DAY_TIMES),
        }));

        // seed statuses from backend surveys (no date field -> we seed into today's date)
        // IMPORTANT: status uses is_completed
        const seedBookings: Record<string, Booking> = {};

        for (const s of list) {
          const timeLabel = backendToLabelStart(s.time_slot); // "10:00 AM"
          const endLabel = backendToLabelEnd(s.time_slot); // "11:00 AM"
          const key = slotKey(dayISO, s.surveyor_booking, timeLabel);

          const siteName = `${s.site?.site_id ?? ""} ${s.site?.name ?? ""}`.trim() || s.site?.idx || "";

          seedBookings[key] = {
            idx: s.idx,
            siteIdx: s.site?.idx,
            siteName,
            projectSiteName: siteName,
            surveyorBookingId: s.surveyor_booking,
            surveyorName: derivedSurveyors.find((x) => x.bookingId === s.surveyor_booking)?.name ?? `Surveyor ${s.surveyor_booking}`,
            region: derivedSurveyors.find((x) => x.bookingId === s.surveyor_booking)?.region ?? "Central",
            state: derivedSurveyors.find((x) => x.bookingId === s.surveyor_booking)?.state ?? "Selangor",
            surveyDateISO: dayISO,
            timeSlotBackend: s.time_slot,
            startLabel: timeLabel,
            endLabel,
            surveyType: s.survey_type,
            bdRemarks: s.bd_remarks ?? "",
            isCompleted: Boolean(s.is_completed),
            surveyRemarks: s.survey_remarks ?? "",
            surveyPhotoDataUrl: s.survey_photo_data_url ?? "",
          };
        }

        // apply seed to rows
        const seededRows = rows.map((r) => {
          if (!r.bookingId) {
            // no real booking id => unavailable all
            const all: Record<string, Status> = {};
            for (const t of DAY_TIMES) all[t] = "unavailable";
            return { ...r, slots: all };
          }
          const newSlots = { ...r.slots };
          for (const t of DAY_TIMES) {
            const k = slotKey(dayISO, r.bookingId, t);
            const b = seedBookings[k];
            if (b) newSlots[t] = b.isCompleted ? "completed" : "booked";
          }
          return { ...r, slots: newSlots };
        });

        setBookings(seedBookings);
        setDayData(seededRows);

        setLoading(false);
      } catch (e: any) {
        setLoading(false);
        setApiError(typeof e?.response?.data === "string" ? e.response.data : JSON.stringify(e?.response?.data ?? { detail: e?.message ?? "Failed" }));
      }
    }

    run();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when change dayISO, we re-render day grid based on current bookings in memory (no refetch)
  useEffect(() => {
    setDayData((prev) =>
      prev.map((r) => {
        const newSlots = generateSlotsAllAvailable(DAY_TIMES);
        for (const t of DAY_TIMES) {
          const k = slotKey(dayISO, r.bookingId, t);
          const b = bookings[k];
          if (b) newSlots[t] = b.isCompleted ? "completed" : "booked";
        }
        // if no real booking id => unavailable
        if (!r.bookingId) {
          const all: Record<string, Status> = {};
          for (const t of DAY_TIMES) all[t] = "unavailable";
          return { ...r, slots: all };
        }
        return { ...r, slots: newSlots };
      })
    );
  }, [dayISO, bookings]);

  /* ===================== FILTERED ROWS ===================== */
  const filteredRows = useMemo(() => {
    const q = filterApplied.surveyor.trim().toLowerCase();
    const statusFilter = filterApplied.status;
    const regionFilter = filterApplied.region;
    const stateFilter = filterApplied.state;

    return dayData.filter((row) => {
      const meta = surveyors.find((s) => s.bookingId === row.bookingId);
      if (regionFilter !== "All Regions" && meta?.region !== regionFilter) return false;
      if (stateFilter !== "All States" && meta?.state !== stateFilter) return false;
      if (q && !row.name.toLowerCase().includes(q)) return false;

      if (statusFilter !== "All Status") {
        const desired = statusFilter.toLowerCase(); // "available" / "booked" / "unavailable"
        // row passes if it has at least one slot matching desired
        const anyMatch = DAY_TIMES.some((t) => (row.slots[t] ?? "unavailable") === (desired as any));
        if (!anyMatch) return false;
      }

      return true;
    });
  }, [dayData, filterApplied, surveyors]);

  /* ===================== Max 3 per day ===================== */
  const countUsedForSurveyor = (bookingId: number, dateISO: string) => {
    let used = 0;
    for (const t of DAY_TIMES) {
      const k = slotKey(dateISO, bookingId, t);
      const b = bookings[k];
      if (b) used += 1; // booked or completed counted
    }
    return used;
  };

  /* ===================== Click behaviors ===================== */

  const openBook = (bookingId: number, surveyorName: string, timeLabel: string) => {
    const meta = surveyors.find((s) => s.bookingId === bookingId);
    setSelected({ bookingId, time: timeLabel, dateISO: dayISO });

    setBookingDraft({
      projectSiteName: "",
      siteIdx: "",
      surveyorBookingId: bookingId,
      surveyorName,
      region: meta?.region ?? "Central",
      state: meta?.state ?? "Selangor",
      surveyDateISO: dayISO,
      timeSlot: `${timeLabel} - ${nextHour(timeLabel)}`,
      timeSlotBackend: labelToBackend(timeLabel), // "10:00-11:00"
      surveyType: "",
      bdRemarks: "",
    });

    setBookOpen(true);
  };

  const openDetails = (bookingId: number, timeLabel: string) => {
    setSelected({ bookingId, time: timeLabel, dateISO: dayISO });
    setDetailsOpen(true);
  };

  const confirmBooking = async () => {
    if (!selected) return;

    try {
      setApiError(null);

      const payload = {
        site: bookingDraft.siteIdx, // ✅ must be STxxxx
        surveyor_booking: bookingDraft.surveyorBookingId, // ✅ must be real pk
        time_slot: bookingDraft.timeSlotBackend, // "10:00-11:00"
        survey_type: bookingDraft.surveyType,
        bd_remarks: bookingDraft.bdRemarks,
      };

      const res = await axios.post<BackendSurvey>("/api/surveys", payload);

      // backend returns created survey
      const created = res.data;

      const startLabel = selected.time;
      const endLabel = nextHour(startLabel);

      const siteLabel =
        siteOptions.find((s) => s.idx === bookingDraft.siteIdx)?.label || bookingDraft.projectSiteName || bookingDraft.siteIdx;

      const newBooking: Booking = {
        idx: created.idx,
        siteIdx: bookingDraft.siteIdx,
        siteName: siteLabel,
        projectSiteName: bookingDraft.projectSiteName,
        surveyorBookingId: bookingDraft.surveyorBookingId,
        surveyorName: bookingDraft.surveyorName,
        region: bookingDraft.region,
        state: bookingDraft.state,
        surveyDateISO: bookingDraft.surveyDateISO,
        timeSlotBackend: bookingDraft.timeSlotBackend,
        startLabel,
        endLabel,
        surveyType: bookingDraft.surveyType,
        bdRemarks: bookingDraft.bdRemarks,
        isCompleted: false,
      };

      // ✅ update local state immediately (no refresh)
      setBookings((prev) => ({
        ...prev,
        [slotKey(dayISO, selected.bookingId, startLabel)]: newBooking,
      }));

      setBookOpen(false);
      setDetailsOpen(true);
    } catch (e: any) {
      setApiError(typeof e?.response?.data === "string" ? e.response.data : JSON.stringify(e?.response?.data ?? { detail: e?.message ?? "Failed" }));
    }
  };

  const cancelSurvey = () => {
    if (!selected) return;

    const k = slotKey(dayISO, selected.bookingId, selected.time);
    const existing = bookings[k];
    if (!existing) return;
    if (existing.isCompleted) return; // locked

    setBookings((prev) => {
      const copy = { ...prev };
      delete copy[k];
      return copy;
    });

    setDetailsOpen(false);
  };

  const rescheduleSurvey = () => {
    if (!selected) return;

    const k = slotKey(dayISO, selected.bookingId, selected.time);
    const existing = bookings[k];
    if (!existing) return;
    if (existing.isCompleted) return;

    setBookingDraft({
      projectSiteName: existing.projectSiteName,
      siteIdx: existing.siteIdx,
      surveyorBookingId: existing.surveyorBookingId,
      surveyorName: existing.surveyorName,
      region: existing.region,
      state: existing.state,
      surveyDateISO: existing.surveyDateISO,
      timeSlot: `${existing.startLabel} - ${existing.endLabel}`,
      timeSlotBackend: existing.timeSlotBackend,
      surveyType: existing.surveyType,
      bdRemarks: existing.bdRemarks,
    });

    setDetailsOpen(false);
    setBookOpen(true);
  };

  const openCompleteForm = () => {
    if (!selected) return;

    const k = slotKey(dayISO, selected.bookingId, selected.time);
    const existing = bookings[k];
    if (!existing) return;
    if (existing.isCompleted) return;

    setCompleteRemarks(existing.surveyRemarks ?? "");
    setCompletePhoto(existing.surveyPhotoDataUrl ?? "");
    setCompleteOpen(true);
  };

  const confirmComplete = async () => {
    if (!selected) return;
    const k = slotKey(dayISO, selected.bookingId, selected.time);
    const existing = bookings[k];
    if (!existing) return;
    if (existing.isCompleted) return;

    if (!completeRemarks.trim() || !completePhoto) return;

    try {
      setApiError(null);

      // ✅ PATCH backend
      // NOTE: field name maybe different in your backend.
      // If backend rejects, paste error JSON.
      const payload: any = {
        is_completed: true,
        survey_remarks: completeRemarks.trim(),
        survey_photo_data_url: completePhoto,
      };

      await axios.patch(`/api/surveys/${existing.idx}`, payload);

      // ✅ update local state immediately (no refresh)
      setBookings((prev) => ({
        ...prev,
        [k]: {
          ...prev[k],
          isCompleted: true,
          surveyRemarks: completeRemarks.trim(),
          surveyPhotoDataUrl: completePhoto,
        },
      }));

      setCompleteOpen(false);
      setDetailsOpen(true);

      setSuccessText("Survey marked as Completed.");
      setSuccessOpen(true);
      window.setTimeout(() => setSuccessOpen(false), 1200);
    } catch (e: any) {
      setApiError(typeof e?.response?.data === "string" ? e.response.data : JSON.stringify(e?.response?.data ?? { detail: e?.message ?? "Failed" }));
    }
  };

  const goToday = () => setDayOffset(0);

  /* ===================== Week view calc (0/3 green, 1-2 orange, 3 red) ===================== */
  const weekUsage = useMemo(() => {
    // map: bookingId -> dayISO -> usedCount
    const map: Record<number, Record<string, number>> = {};
    for (const sv of surveyors) {
      map[sv.bookingId] = {};
      for (const d of weekDays) map[sv.bookingId][d.iso] = 0;
    }

    for (const key in bookings) {
      const b = bookings[key];
      if (!b) continue;
      // only count if in this week range and same bookingId
      if (!map[b.surveyorBookingId]) continue;
      if (map[b.surveyorBookingId][b.surveyDateISO] === undefined) continue;

      map[b.surveyorBookingId][b.surveyDateISO] += 1;
    }

    return map;
  }, [bookings, surveyors, weekDays]);

  // month dots (simple: for dates in month, show dot based on total used across all surveyors)
  const dotsMap = useMemo(() => {
    const out: Record<string, MonthDot[]> = {};

    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    for (let day = 1; day <= last.getDate(); day++) {
      const iso = toISODate(new Date(year, month, day));
      let usedTotal = 0;
      for (const sv of surveyors) usedTotal += countUsedForSurveyor(sv.bookingId, iso);
      // max capacity = surveyors * 3
      const cap = surveyors.filter((s) => s.bookingId).length * 3;
      if (cap <= 0) continue;

      const ratio = usedTotal / cap;
      if (ratio === 0) continue;

      if (ratio >= 1) out[iso] = ["red", "red"];
      else if (ratio >= 0.66) out[iso] = ["red"];
      else if (ratio >= 0.33) out[iso] = ["orange"];
      else out[iso] = ["green"];
    }

    return out;
  }, [monthCursor, surveyors, bookings]);

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      {/* Top bar */}
      <div className="h-16 bg-gradient-to-r from-fuchsia-500 to-pink-500 flex items-center justify-between px-4 md:px-7">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden h-10 w-10 rounded-xl bg-white/15 hover:bg-white/20 ring-1 ring-white/25 flex items-center justify-center"
            aria-label="Open sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="text-white text-lg md:text-xl font-semibold">Survey Calendar</div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-white font-semibold hidden sm:inline">Sarah Mitchell</span>
          <div className="h-10 w-10 rounded-full bg-white/20 ring-2 ring-white/70 overflow-hidden flex items-center justify-center">
            <span className="text-white font-bold">SM</span>
          </div>
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen ? (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar overlay" />
          <aside className="absolute left-0 top-0 h-full w-[82vw] max-w-[320px] bg-white shadow-2xl border-r">
            <div className="h-16 bg-gradient-to-r from-fuchsia-500 to-pink-500 flex items-center justify-between px-5">
              <div className="text-white font-semibold">Menu</div>
              <button type="button" onClick={() => setSidebarOpen(false)} className="text-white/90 hover:text-white text-3xl leading-none px-2 -mr-2" aria-label="Close sidebar">
                ×
              </button>
            </div>
            <div className="py-6">
              <NavItem icon="dashboard" label="Dashboard" />
              <NavItem active icon="calendar" label="Survey Calendar" />
              <NavItem icon="users" label="Surveyors" />
              <NavItem icon="billing" label="Billing" />
              <NavItem icon="settings" label="Settings" />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex w-full">
        {/* Sidebar (desktop only) */}
        <aside className="hidden md:block w-[300px] bg-white border-r min-h-[calc(100vh-64px)]">
          <div className="py-6">
            <NavItem icon="dashboard" label="Dashboard" />
            <NavItem active icon="calendar" label="Survey Calendar" />
            <NavItem icon="users" label="Surveyors" />
            <NavItem icon="billing" label="Billing" />
            <NavItem icon="settings" label="Settings" />
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 md:p-8 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm border">
            {/* Error */}
            {apiError ? (
              <div className="px-6 py-4 text-rose-600 border-b text-sm font-semibold">
                Error: {apiError}
              </div>
            ) : null}

            {/* Filter row */}
            <div className="p-4 md:p-6 flex items-start md:items-center justify-between gap-6 flex-col lg:flex-row">
              <div className="flex items-center gap-4 flex-wrap">
                <select
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm bg-white"
                  value={filterDraft.region}
                  onChange={(e) => setFilterDraft((p) => ({ ...p, region: e.target.value, state: "All States" }))}
                >
                  <option>All Regions</option>
                  {MALAYSIA_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <select
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm bg-white"
                  value={filterDraft.state}
                  onChange={(e) => setFilterDraft((p) => ({ ...p, state: e.target.value }))}
                >
                  <option>All States</option>
                  {stateOptionsList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm bg-white"
                  value={filterDraft.status}
                  onChange={(e) => setFilterDraft((p) => ({ ...p, status: e.target.value }))}
                >
                  <option>All Status</option>
                  <option>Available</option>
                  <option>Booked</option>
                  <option>Completed</option>
                  <option>Unavailable</option>
                </select>

                <input
                  className="h-11 w-[240px] max-w-[80vw] rounded-xl border border-slate-200 px-5 text-sm bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-fuchsia-200"
                  placeholder="Surveyor name..."
                  value={filterDraft.surveyor}
                  onChange={(e) => setFilterDraft((p) => ({ ...p, surveyor: e.target.value }))}
                />

                <button type="button" onClick={resetFilters} className="text-sm font-medium text-slate-500 hover:text-slate-800 px-2">
                  Reset
                </button>

                <button type="button" onClick={applyFilters} className="h-11 px-6 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:opacity-95">
                  Apply Filters
                </button>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                <button type="button" onClick={goToday} className="h-11 px-6 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-50">
                  Today
                </button>

                <button type="button" className="h-11 px-6 rounded-xl bg-fuchsia-500 text-white text-sm font-semibold hover:opacity-95 inline-flex items-center gap-2">
                  <span className="text-lg leading-none">+</span>
                  Add Availability
                </button>
              </div>
            </div>

            <div className="border-t" />

            {/* Tabs + right controls */}
            <div className="px-4 md:px-6 py-5 flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
              <SegmentedTabs value={view} onChange={setView} />

              {view === "day" ? (
                <div className="flex items-center gap-3">
                  <ArrowBtn dir="left" label="Previous day" onClick={() => setDayOffset((v) => v - 1)} />
                  <div className="text-slate-800 font-semibold text-sm md:text-base">{dayTitle}</div>
                  <ArrowBtn dir="right" label="Next day" onClick={() => setDayOffset((v) => v + 1)} />
                </div>
              ) : view === "week" ? (
                <div className="flex items-center gap-3">
                  <ArrowBtn dir="left" label="Previous week" onClick={() => setDayOffset((v) => v - 7)} />
                  <div className="text-slate-800 font-semibold text-sm md:text-base">{fmtRange(weekStart, weekEnd)}</div>
                  <ArrowBtn dir="right" label="Next week" onClick={() => setDayOffset((v) => v + 7)} />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <ArrowBtn dir="left" label="Previous month" onClick={() => setMonthOffset((v) => v - 1)} />
                  <div className="text-slate-800 font-semibold text-sm md:text-base">{monthTitle}</div>
                  <ArrowBtn dir="right" label="Next month" onClick={() => setMonthOffset((v) => v + 1)} />
                </div>
              )}
            </div>

            <div className="border-t" />

            {/* Content */}
            <div className="px-4 md:px-6 pb-6 pt-5">
              {loading ? (
                <div className="p-10 text-slate-500">Loading data from API...</div>
              ) : view === "day" ? (
                <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                  <div className="min-w-[980px]">
                    <DayView
                      data={filteredRows}
                      dayISO={dayISO}
                      getUsed={(bookingId) => countUsedForSurveyor(bookingId, dayISO)}
                      onClickAvailable={(bookingId, surveyorName, time) => openBook(bookingId, surveyorName, time)}
                      onClickBooked={(bookingId, time) => openDetails(bookingId, time)}
                    />
                  </div>
                </div>
              ) : view === "week" ? (
                <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                  <div className="min-w-[1100px]">
                    <WeekView surveyors={surveyors} weekDays={weekDays} weekUsage={weekUsage} />
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                  <div className="min-w-[860px]">
                    <MonthView
                      monthCursor={monthCursor}
                      selectedISO={dayISO}
                      dotsMap={dotsMap}
                      onPickDate={(iso) => {
                        const d = new Date(iso + "T00:00:00");
                        const diff = Math.round((startOfDay(d).getTime() - startOfDay(BASE_DAY).getTime()) / (1000 * 60 * 60 * 24));
                        setDayOffset(diff);
                        setView("day");
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="h-6" />
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <BookSurveyModal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        draft={bookingDraft}
        setDraft={setBookingDraft}
        onConfirm={confirmBooking}
        siteOptions={siteOptions}
      />

      <SurveyDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        booking={currentBooking}
        onCancel={cancelSurvey}
        onReschedule={rescheduleSurvey}
        onComplete={openCompleteForm}
      />

      <CompleteSurveyModal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        booking={currentBooking}
        remarks={completeRemarks}
        setRemarks={setCompleteRemarks}
        photoDataUrl={completePhoto}
        setPhotoDataUrl={setCompletePhoto}
        onConfirm={confirmComplete}
      />

      <SuccessToast open={successOpen} text={successText} onClose={() => setSuccessOpen(false)} />
    </div>
  );
}

/* ===================== Views ===================== */

function DayView({
  data,
  dayISO,
  getUsed,
  onClickAvailable,
  onClickBooked,
}: {
  data: DayRow[];
  dayISO: string;
  getUsed: (bookingId: number) => number;
  onClickAvailable: (bookingId: number, surveyorName: string, time: string) => void;
  onClickBooked: (bookingId: number, time: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="grid grid-cols-[240px_repeat(8,minmax(110px,1fr))] bg-white">
        <div className="px-5 py-4 text-sm font-semibold text-slate-700 border-b">Surveyor Name</div>
        {DAY_TIMES.map((t) => (
          <div key={t} className="px-4 py-4 text-sm font-semibold text-slate-500 border-b text-center">
            {t}
          </div>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="bg-white p-10 text-center text-slate-500">Tiada surveyor.</div>
      ) : (
        data.map((row) => {
          const used = row.bookingId ? getUsed(row.bookingId) : 0;
          const disableNew = used >= 3;

          return (
            <div key={`${dayISO}-${row.bookingId}-${row.name}`} className="grid grid-cols-[240px_repeat(8,minmax(110px,1fr))] bg-white">
              <div className="px-5 py-5 border-b text-sm font-semibold text-slate-800">
                {row.name}
                <div className="text-xs text-slate-400 font-semibold mt-1">{row.bookingId ? `Used: ${used}/3` : "No booking id"}</div>
              </div>

              {DAY_TIMES.map((t) => {
                const st = (row.slots[t] ?? "unavailable") as Status;
                return (
                  <div key={t} className="px-4 py-4 border-b flex justify-center items-center">
                    <StatusPillDay
                      status={st}
                      disabled={st === "available" && disableNew}
                      onClick={
                        st === "available"
                          ? () => onClickAvailable(row.bookingId, row.name, t)
                          : st === "booked" || st === "completed"
                          ? () => onClickBooked(row.bookingId, t)
                          : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}

function WeekView({
  surveyors,
  weekDays,
  weekUsage,
}: {
  surveyors: SurveyorMeta[];
  weekDays: { key: string; date: string; iso: string }[];
  weekUsage: Record<number, Record<string, number>>;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="grid grid-cols-[280px_repeat(6,minmax(170px,1fr))] bg-slate-50">
        <div className="px-6 py-4 text-sm font-semibold text-slate-700 border-b">Surveyor Name</div>

        {weekDays.map((d) => (
          <div key={d.key} className="px-6 py-4 border-b text-center">
            <div className="text-sm font-semibold text-slate-700">{d.key}</div>
            <div className="text-xs text-slate-500">{d.date}</div>
          </div>
        ))}
      </div>

      {surveyors.map((row) => (
        <div key={row.bookingId || row.name} className="grid grid-cols-[280px_repeat(6,minmax(170px,1fr))] bg-white">
          <div className="px-6 py-5 border-b flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
              {initials(row.name)}
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-slate-800">{row.name}</div>
              <div className="text-sm text-slate-500">{row.state}</div>
            </div>
          </div>

          {weekDays.map((d) => {
            if (!row.bookingId) {
              return (
                <div key={d.key} className="px-6 py-5 border-b flex items-center justify-center">
                  <UnavailablePill />
                </div>
              );
            }

            const used = weekUsage[row.bookingId]?.[d.iso] ?? 0;
            const total = 3;

            return (
              <div key={d.key} className="px-6 py-5 border-b flex items-center justify-center">
                <WeekUsagePill used={used} total={total} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MonthView({
  monthCursor,
  selectedISO,
  dotsMap,
  onPickDate,
}: {
  monthCursor: Date;
  selectedISO: string;
  dotsMap: Record<string, MonthDot[]>;
  onPickDate: (iso: string) => void;
}) {
  const grid = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    const firstDay = first.getDay(); // Sun=0
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const totalCells = 42;
    const cells: { iso: string; day: number; muted?: boolean; selected?: boolean; dots?: MonthDot[] }[] = [];

    for (let i = 0; i < offset; i++) {
      const d = new Date(year, month, 1 - (offset - i));
      const iso = toISODate(d);
      cells.push({ iso, day: d.getDate(), muted: true, selected: iso === selectedISO, dots: dotsMap[iso] });
    }

    for (let day = 1; day <= last.getDate(); day++) {
      const d = new Date(year, month, day);
      const iso = toISODate(d);
      cells.push({ iso, day, selected: iso === selectedISO, dots: dotsMap[iso] });
    }

    while (cells.length < totalCells) {
      const d = new Date(year, month, last.getDate() + (cells.length - (offset + last.getDate()) + 1));
      const iso = toISODate(d);
      cells.push({ iso, day: d.getDate(), muted: true, selected: iso === selectedISO, dots: dotsMap[iso] });
    }

    return cells;
  }, [monthCursor, selectedISO, dotsMap]);

  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 bg-white">
        {MONTH_WEEKDAYS.map((d) => (
          <div key={d} className="px-6 py-4 text-sm font-semibold text-slate-700 border-b border-slate-100">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-white">
        {grid.map((cell, idx) => (
          <button
            type="button"
            key={cell.iso}
            onClick={() => onPickDate(cell.iso)}
            className={[
              "h-28 px-6 py-4 border-b border-r border-slate-100 relative text-left",
              idx % 7 === 6 ? "border-r-0" : "",
              cell.selected ? "bg-slate-50" : "bg-white hover:bg-slate-50/60",
            ].join(" ")}
          >
            <div className={["text-sm font-semibold", cell.muted ? "text-slate-400" : "text-slate-900", cell.selected ? "text-fuchsia-600" : ""].join(" ")}>
              {cell.day}
            </div>

            {cell.dots?.length ? (
              <div className="absolute left-6 bottom-4 flex items-center gap-2">
                {cell.dots.slice(0, 3).map((k, i) => (
                  <Dot key={i} kind={k} />
                ))}
              </div>
            ) : null}
          </button>
        ))}
      </div>

      <div className="px-6 py-4 bg-white flex items-center gap-6 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Dot kind="green" /> Low usage
        </div>
        <div className="flex items-center gap-2">
          <Dot kind="orange" /> Medium usage
        </div>
        <div className="flex items-center gap-2">
          <Dot kind="red" /> High usage
        </div>
      </div>
    </div>
  );
}

/* ===================== Helpers ===================== */

function pick<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSlotsAllAvailable(times: string[]): Record<string, Status> {
  const out: Record<string, Status> = {};
  for (const t of times) out[t] = "available";
  return out;
}

function slotKey(dateISO: string, bookingId: number, timeLabel: string) {
  return `${dateISO}||${bookingId}||${timeLabel}`;
}

function nextHour(time: string) {
  const m = time.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);
  if (!m) return time;
  let h = Number(m[1]);
  const min = m[2];
  let ap = m[3] as "AM" | "PM";

  h += 1;
  if (h === 12 && ap === "AM") ap = "PM";
  else if (h === 12 && ap === "PM") ap = "AM";
  else if (h === 13) h = 1;

  return `${h}:${min} ${ap}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "S";
  const b = parts[1]?.[0] ?? "C";
  return (a + b).toUpperCase();
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmtMonthTitle(d: Date) {
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function fmtShortMonthDay(d: Date) {
  return d.toLocaleString("en-US", { month: "short", day: "numeric" });
}

function fmtRange(start: Date, end: Date) {
  const s = start.toLocaleString("en-US", { month: "short", day: "numeric" });
  const e = end.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${s} - ${e}`;
}

function fmtFullDate(d: Date) {
  return d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfWeek(d: Date) {
  // Monday start
  const day = d.getDay(); // Sun=0
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(d), diff);
}

function backendToLabelStart(slot: string) {
  // "10:00-11:00" -> "10:00 AM" (assume 24h)
  const [a] = slot.split("-");
  return toAmPm(a);
}
function backendToLabelEnd(slot: string) {
  const [, b] = slot.split("-");
  return toAmPm(b);
}
function toAmPm(hhmm: string) {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  const m = mStr ?? "00";
  const ap = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  if (h > 12) h -= 12;
  return `${h}:${m} ${ap}`;
}
function labelToBackend(labelStart: string) {
  // "10:00 AM" -> "10:00-11:00" (24h)
  const start24 = fromAmPm(labelStart);
  const end24 = addHour24(start24);
  return `${start24}-${end24}`;
}
function fromAmPm(label: string) {
  const m = label.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);
  if (!m) return "10:00";
  let h = Number(m[1]);
  const min = m[2];
  const ap = m[3] as "AM" | "PM";
  if (ap === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${pad2(h)}:${min}`;
}
function addHour24(hhmm: string) {
  const [hStr, mStr] = hhmm.split(":");
  let h = Number(hStr);
  h = (h + 1) % 24;
  return `${pad2(h)}:${mStr ?? "00"}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}
