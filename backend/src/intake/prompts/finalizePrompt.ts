export const finalizeExtractionPrompt = `You are extracting a structured pre-visit clinical brief from a completed patient intake conversation.

Rules:
- Use ONLY information the patient stated. If a slot was not discussed, use null (for strings) or [] (for arrays). Do NOT infer.
- chiefComplaint.statement: a single line in the patient's own words, with minor cleanup. Include the rough duration if given.
- chiefComplaint.category: classify into one of the listed clinical categories.
- hpi.narrative: 2–4 sentences in clinician HPI prose style. Lead with age/sex if known, then duration, location, quality, modifying factors, associated symptoms (positive AND key negatives). Do not invent details.
- ros: include ONLY systems that were actually discussed. Each entry's pertinentPositives and pertinentNegatives must be plain SYMPTOM NOUNS — e.g. "fever", "shortness of breath", "palpitations", "lower-extremity edema". Do NOT include negation words ("no fever", "denies fever", "without fever") — the renderer prepends "denies" automatically. Do NOT include sentences. Pertinent NEGATIVES are clinically valuable — capture every symptom the patient explicitly denied for that system.
- redFlagScreen: include each red flag that was asked. Mark present=true only if the patient confirmed it. escalationAdvised=true if either (a) the flag is acutely dangerous (chest-pain radiation, suicidal plan, FAST stroke signs, thunderclap headache, hematemesis, sudden vision loss, cauda equina signs) AND present=true, OR (b) the assistant already advised emergency services during the chat.
- triageImpression.acuityHint: choose one of routine | soon | urgent | emergent. This is NOT a diagnosis — base it ONLY on patient-reported observations and any red flags. If any emergent red flag was confirmed, use 'emergent'. If multiple worrying features without an emergent red flag, use 'urgent'. Otherwise 'soon' or 'routine'.
- triageImpression.rationale: ONE sentence pointing at the observations only (e.g. "Exertional substernal pressure with radiation to left arm and dyspnea."). Do NOT name a disease.
- triageImpression.suggestedNextStep: a concrete next step matching the acuity (e.g. "Call 911 / go to ED now", "Same-day urgent care", "Routine PCP visit within 1–2 weeks").
- patientConfirmation.summaryReadBack: the assistant's read-back text from the conversation. confirmed = whether the patient affirmed it. corrections = any corrections they raised.
- modelWarnings: include any data-quality issues you encountered (e.g. "Patient declined to give DOB", "Severity not quantified"). Empty array if none.

Return ONLY the structured object — no preamble.`;
