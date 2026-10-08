"use client";
import {useState} from "react";
import {scenarioValue} from "@/lib/review-cohort";
export function ReviewScenarioCalculator() {
 const [period,setPeriod]=useState("");const [inquiries,setInquiries]=useState("");const [probability,setProbability]=useState("");const [value,setValue]=useState("");
 let result:number|null=null;let error="";
 if(period.trim() && inquiries!=="" && probability!=="" && value!=="") {try {result=scenarioValue(Number(inquiries),Number(probability),Number(value));}catch {error="Use a whole number of inquiries, a probability from 0 to 100 and a non-negative job value.";}}
 return <div className="revo-scenario"><h2>Build your own scenario</h2><p>No default inputs. All values are your assumptions for the same period.</p><div className="revo-scenario-workspace"><div className="revo-inputs"><label>Period label<input value={period} onChange={e=>setPeriod(e.target.value)} placeholder="Your chosen period" /></label><label>Unanswered qualified inquiries<input type="number" min="0" step="1" value={inquiries} onChange={e=>setInquiries(e.target.value)} /></label><label>Assumed booking probability (%)<input type="number" min="0" max="100" value={probability} onChange={e=>setProbability(e.target.value)} /></label><label>Assumed average job value (USD)<input type="number" min="0" value={value} onChange={e=>setValue(e.target.value)} /></label></div><output aria-live="polite">{error || (result===null ? "Enter all four inputs to explore a scenario." : `Potential gross job value for ${period}: ${new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(result)}`)}</output></div><p>This is hypothetical potential value, not measured lost revenue, profit or a result promised by Revo.</p></div>;
}
