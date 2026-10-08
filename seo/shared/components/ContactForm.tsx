"use client";

import { useRef, useState } from "react";
import { captureAttribution, conversionEmitter, submitLeadRequest, type Attribution } from "@/lib/lead-attribution";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/constants";

export function ContactForm({reviewOnly=false}:{reviewOnly?:boolean}={}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const submission = useRef<{ id: string; payload: string } | null>(null);
  const inFlight = useRef(false);
  const attribution = useRef<Attribution|null>(null);
  const emitConversion = useRef(conversionEmitter((event,payload)=>window.gtag?.("event",event,payload)));

  async function handleSubmit() {
    if (inFlight.current) return;
    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required");
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      const payload = JSON.stringify({ name: name.trim(), phone: phone.trim(), source: window.location.pathname });
      if (!submission.current || submission.current.payload !== payload) {
        submission.current = { id: crypto.randomUUID(), payload };
        attribution.current = captureAttribution({getItem:key=>key==="revo-consent"?localStorage.getItem(key):sessionStorage.getItem(key),setItem:(key,value)=>sessionStorage.setItem(key,value),removeItem:key=>sessionStorage.removeItem(key)}, window.location, document.referrer);
      }
      // Keep the original submission ID across retries. Attribution is frozen on first send.
      let consent=false;
      try {consent=localStorage.getItem("revo-consent")==="granted";}catch{/* No attribution without accessible consent. */}
      await submitLeadRequest({ ...JSON.parse(payload), website, submissionId: submission.current.id, attribution: consent?attribution.current:null }, fetch, response=>{
        emitConversion.current(response,attribution.current,()=>localStorage.getItem("revo-consent")==="granted",window.location.origin);
      });
      setSubmitted(true);
    } catch {
      setError("We could not confirm receipt. Your details are still here: please retry or call us.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={`${reviewOnly ? "revo-review-form-success " : ""}bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center`}>
        <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <h3 className="text-emerald-300 font-black text-xl mb-2">We&apos;ve got it.</h3>
        <p className="text-emerald-200 text-sm leading-relaxed">
          {reviewOnly ? "Local simulated receipt confirmed. No request was sent to Revo." : "Your request has been received. Our team will follow up."}
        </p>
      </div>
    );
  }

  return (
    <div className={`${reviewOnly ? "revo-review-form " : ""}bg-zinc-900 border border-white/10 rounded-2xl p-6`}>
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 mb-4">
          <span className="text-orange-400 text-xs">●</span>
          <span className="text-orange-300 text-xs font-bold">Need help?</span>
        </div>
        <h2 className="text-white font-black text-2xl mb-2 tracking-tight">{reviewOnly ? "Test the local form" : "Talk to our team"}</h2>
        <p className="text-zinc-400 text-sm">{reviewOnly ? "Use fictional details. Storage is simulated in this preview." : "Leave your details if you need help getting started."}</p>
      </div>

      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
        <div aria-hidden="true" style={{position:"absolute",left:"-10000px",width:"1px",height:"1px",overflow:"hidden"}}>
          <label htmlFor="lead-website">Leave this field empty</label>
          <input id="lead-website" name="website" type="text" tabIndex={-1} autoComplete="off" maxLength={200}
            value={website} onChange={event=>setWebsite(event.target.value)} disabled={submitting} />
        </div>
        <label htmlFor="lead-name" className="sr-only">Your name</label>
        <input
          id="lead-name"
          name="name"
          type="text"
          autoComplete="name"
          required maxLength={120} disabled={submitting}
          aria-label="Your name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-zinc-950 border border-white/10 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm outline-none"
        />
        <label htmlFor="lead-phone" className="sr-only">Phone number</label>
        <input
          id="lead-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required maxLength={32} disabled={submitting}
          aria-label="Phone number"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full bg-zinc-950 border border-white/10 focus:border-orange-500 rounded-xl px-4 py-3 text-white text-sm outline-none"
        />
        {error && <p role="alert" className="text-red-400 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-black font-black py-3.5 rounded-xl text-sm"
        >
          {submitting ? "Sending..." : reviewOnly ? "Test simulated receipt →" : "Request help →"}
        </button>
        {!reviewOnly && <p className="text-zinc-500 text-xs text-center">
          Or call <a href={`tel:${PHONE_TEL}`} className="text-orange-400 hover:underline">{PHONE_DISPLAY}</a>
        </p>}
      </form>
    </div>
  );
}
