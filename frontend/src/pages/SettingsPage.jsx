import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export function SettingsPage() {
  const [data, setData] = useState(null);
  const [report, setReport] = useState(null);
  const [reportingForm, setReportingForm] = useState({
    whatsappEnabled: false,
    provider: "webhook",
    whatsappNumber: "",
    whatsappWebhookUrl: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioFromNumber: "",
    sendHour: 22
  });
  const [status, setStatus] = useState("");

  useEffect(() => {
    api
      .get("/settings/bootstrap")
      .then((response) => {
        setData(response.data);
        setReportingForm({
          whatsappEnabled: Boolean(response.data.tenant?.reporting?.whatsappEnabled),
          provider: response.data.tenant?.reporting?.provider || "webhook",
          whatsappNumber: response.data.tenant?.reporting?.whatsappNumber || "",
          whatsappWebhookUrl: response.data.tenant?.reporting?.whatsappWebhookUrl || "",
          twilioAccountSid: response.data.tenant?.reporting?.twilioAccountSid || "",
          twilioAuthToken: response.data.tenant?.reporting?.twilioAuthToken || "",
          twilioFromNumber: response.data.tenant?.reporting?.twilioFromNumber || "",
          sendHour: response.data.tenant?.reporting?.sendHour ?? 22
        });
      })
      .catch(() => {});
    api.get("/reports/whatsapp/daily").then((response) => setReport(response.data)).catch(() => {});
  }, []);

  if (!data) {
    return <div className="glass-card p-6">Loading settings...</div>;
  }

  const saveReportingSettings = async () => {
    try {
      await api.patch("/settings/reporting", reportingForm);
      setStatus("Reporting settings saved.");
    } catch (error) {
      setStatus(error?.response?.data?.message || error.message || "Could not save reporting settings.");
    }
  };

  const sendReportNow = async () => {
    try {
      const response = await api.post("/reports/whatsapp/daily/send");
      setReport(response.data.report);
      setStatus(response.data.skipped ? response.data.reason : "WhatsApp report sent.");
    } catch (error) {
      setStatus(error?.response?.data?.message || error.message || "Could not send report.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <p className="section-title">Dhaba Setup</p>
        <h1 className="mt-2 font-display text-3xl text-brand-100">{data.tenant.name}</h1>
        <p className="mt-2 text-sm text-brand-200/75">
          {data.tenant.city || "City not set"} - {data.tenant.phone || "Phone not set"}
        </p>
        <p className="mt-2 text-sm text-brand-200/75">
          Owner PIN: {data.tenant.ownerPinEnabled ? "Configured" : "Missing"}
        </p>
        <p className="mt-2 text-sm text-brand-200/75">
          WhatsApp reporting: {data.tenant.reporting?.whatsappEnabled ? "Enabled" : "Disabled"}
        </p>
      </div>

      <div className="glass-card p-4">
        <p className="section-title">Staff Activity Access</p>
        <div className="mt-4 space-y-3">
          {data.staff.map((user) => (
            <div key={user._id} className="rounded-2xl bg-brand-800/70 p-4">
              <h3 className="font-medium text-brand-100">{user.name}</h3>
              <p className="text-sm text-brand-200/75">
                {user.role} - {user.email}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-4">
        <p className="section-title">WhatsApp Automation</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm text-brand-100">
            <input
              type="checkbox"
              checked={reportingForm.whatsappEnabled}
              onChange={(event) => setReportingForm((current) => ({ ...current, whatsappEnabled: event.target.checked }))}
            />
            Enable daily auto-send
          </label>
          <select
            className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
            value={reportingForm.provider}
            onChange={(event) => setReportingForm((current) => ({ ...current, provider: event.target.value }))}
          >
            <option value="webhook">Webhook</option>
            <option value="twilio">Twilio</option>
          </select>
          <input
            className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
            placeholder="WhatsApp number"
            value={reportingForm.whatsappNumber}
            onChange={(event) => setReportingForm((current) => ({ ...current, whatsappNumber: event.target.value }))}
          />
          {reportingForm.provider === "webhook" ? (
            <input
              className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none md:col-span-2"
              placeholder="Webhook URL"
              value={reportingForm.whatsappWebhookUrl}
              onChange={(event) => setReportingForm((current) => ({ ...current, whatsappWebhookUrl: event.target.value }))}
            />
          ) : (
            <>
              <input
                className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
                placeholder="Twilio Account SID"
                value={reportingForm.twilioAccountSid}
                onChange={(event) => setReportingForm((current) => ({ ...current, twilioAccountSid: event.target.value }))}
              />
              <input
                className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
                placeholder="Twilio Auth Token"
                value={reportingForm.twilioAuthToken}
                onChange={(event) => setReportingForm((current) => ({ ...current, twilioAuthToken: event.target.value }))}
              />
              <input
                className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none md:col-span-2"
                placeholder="Twilio WhatsApp From Number"
                value={reportingForm.twilioFromNumber}
                onChange={(event) => setReportingForm((current) => ({ ...current, twilioFromNumber: event.target.value }))}
              />
            </>
          )}
          <input
            className="rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
            placeholder="Send hour"
            type="number"
            min="0"
            max="23"
            value={reportingForm.sendHour}
            onChange={(event) => setReportingForm((current) => ({ ...current, sendHour: Number(event.target.value || 22) }))}
          />
          <div className="flex gap-2">
            <button className="pill-button" onClick={saveReportingSettings}>
              Save Reporting
            </button>
            <button className="pill-button" onClick={sendReportNow}>
              Send Now
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <p className="section-title">WhatsApp Daily Report</p>
        <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-brand-800/70 p-4 text-sm text-brand-100">
          {report?.text || data.whatsappPreview}
        </pre>
      </div>

      <div className="glass-card p-4">
        <p className="section-title">Recent Sensitive Activity</p>
        <div className="mt-4 space-y-3">
          {(data.recentActivity || []).map((activity) => (
            <div key={activity.id} className="rounded-2xl bg-brand-800/70 p-4">
              <h3 className="font-medium text-brand-100">
                {activity.entityType} - {activity.action}
              </h3>
              <p className="mt-1 text-sm text-brand-200/75">
                {new Date(activity.createdAt).toLocaleString("en-IN")}
              </p>
              <p className="mt-2 text-xs text-brand-200/70">{JSON.stringify(activity.meta || {})}</p>
            </div>
          ))}
        </div>
      </div>

      {status ? <div className="glass-card p-4 text-sm text-brand-100">{status}</div> : null}
    </div>
  );
}
