export default function IRProcessPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .ir-flowchart {
          --bg:#f5f4f0;--ink:#1a1a1a;--line:#c8c4bc;
          --blue-dark:#1d3557;--blue-mid:#2e5f8a;--blue-light:#d6e8f7;
          --gold:#e8a020;--gold-light:#fef3dc;
          --green:#2d6a4f;--green-light:#d8f0e6;
          --red:#c0392b;--red-light:#fde8e6;
          --purple:#5b3fa6;--purple-light:#ede8fb;
          --gray:#6b7280;--radius:6px;
          --font:'IBM Plex Sans',sans-serif;--mono:'IBM Plex Mono',monospace;
          font-family:var(--font);
          background:var(--bg);
          color:var(--ink);
          padding:40px 20px 80px;
          min-height:100vh;
        }
        .ir-flowchart *{box-sizing:border-box;margin:0;padding:0;}
        .ir-flowchart h1{text-align:center;font-size:22px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--blue-dark);margin-bottom:6px;}
        .ir-flowchart .subtitle{text-align:center;font-size:12px;color:var(--gray);font-family:var(--mono);margin-bottom:32px;letter-spacing:.06em;text-transform:uppercase;}
        .ir-flowchart .legend{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:36px;}
        .ir-flowchart .legend-item{display:flex;align-items:center;gap:6px;font-size:11px;font-family:var(--mono);text-transform:uppercase;letter-spacing:.05em;color:var(--gray);}
        .ir-flowchart .legend-dot{width:12px;height:12px;border-radius:3px;flex-shrink:0;}
        .ir-flowchart .flow{max-width:980px;margin:0 auto;display:flex;flex-direction:column;align-items:center;}
        .ir-flowchart .node{width:100%;border-radius:var(--radius);padding:14px 18px;font-size:13px;line-height:1.55;border:1.5px solid transparent;}
        .ir-flowchart .node.trigger{background:var(--blue-dark);color:#fff;max-width:580px;text-align:center;font-weight:600;font-size:14px;}
        .ir-flowchart .node.trigger.end{background:var(--green);}
        .ir-flowchart .node.action{background:#fff;border-color:var(--line);max-width:580px;}
        .ir-flowchart .step-num{display:inline-block;background:var(--blue-dark);color:#fff;font-size:10px;font-family:var(--mono);font-weight:600;padding:1px 7px;border-radius:3px;margin-bottom:6px;letter-spacing:.06em;}
        .ir-flowchart .node.golden{background:var(--green-light);border-color:var(--green);}
        .ir-flowchart .node.golden .step-num{background:var(--green);}
        .ir-flowchart .node.exception{background:var(--red-light);border-color:var(--red);}
        .ir-flowchart .node.exception .step-num{background:var(--red);}
        .ir-flowchart .node.note{background:var(--purple-light);border-color:var(--purple);font-size:12px;max-width:640px;text-align:center;}
        .ir-flowchart .node.section-hdr{background:var(--blue-mid);color:#fff;text-align:center;font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;padding:8px 18px;}
        .ir-flowchart .node ul{margin-top:6px;padding-left:16px;}
        .ir-flowchart .node ul li{margin-bottom:4px;}
        .ir-flowchart .tag{display:block;background:var(--blue-light);color:var(--blue-dark);font-family:var(--mono);font-size:10px;padding:5px 8px;border-radius:3px;font-weight:600;margin-top:8px;line-height:1.7;}
        .ir-flowchart .warn{display:block;background:#fff3cd;color:#856404;font-size:11px;padding:4px 8px;border-radius:3px;margin-top:8px;font-weight:500;line-height:1.5;}
        .ir-flowchart .alert{display:block;background:var(--red-light);color:var(--red);font-size:11px;padding:4px 8px;border-radius:3px;margin-top:8px;font-weight:600;line-height:1.5;}
        .ir-flowchart .arrow{width:2px;height:28px;background:var(--line);margin:0 auto;position:relative;flex-shrink:0;}
        .ir-flowchart .arrow::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid var(--line);}
        .ir-flowchart .split{display:grid;grid-template-columns:1fr 1fr;gap:20px;width:100%;max-width:980px;align-items:start;}
        .ir-flowchart .split-col{display:flex;flex-direction:column;align-items:center;}
        .ir-flowchart .split-col .node{width:100%;max-width:100%;}
        .ir-flowchart .col-header{background:var(--blue-dark);color:#fff;text-align:center;font-weight:700;font-size:13px;letter-spacing:.04em;padding:10px 16px;border-radius:var(--radius);width:100%;}
        .ir-flowchart .split3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;width:100%;}
        .ir-flowchart .split3-col{display:flex;flex-direction:column;align-items:center;}
        .ir-flowchart .split3-col .node{width:100%;max-width:100%;font-size:12px;}
        .ir-flowchart .split3-col .col-header{font-size:11px;background:var(--blue-mid);padding:8px 10px;}
        .ir-flowchart .bracket{display:flex;align-items:flex-start;justify-content:center;width:100%;max-width:980px;position:relative;height:30px;}
        .ir-flowchart .bracket-line{position:absolute;top:0;left:25%;right:25%;height:1.5px;background:var(--line);}
        .ir-flowchart .bracket-down-left{position:absolute;top:0;left:25%;width:1.5px;height:30px;background:var(--line);}
        .ir-flowchart .bracket-down-right{position:absolute;top:0;right:25%;width:1.5px;height:30px;background:var(--line);}
        .ir-flowchart .bracket3{position:relative;width:100%;height:30px;}
        .ir-flowchart .bracket3-line{position:absolute;top:0;left:16.5%;right:16.5%;height:1.5px;background:var(--line);}
        .ir-flowchart .bracket3-l{position:absolute;top:0;left:16.5%;width:1.5px;height:30px;background:var(--line);}
        .ir-flowchart .bracket3-m{position:absolute;top:0;left:50%;transform:translateX(-50%);width:1.5px;height:30px;background:var(--line);}
        .ir-flowchart .bracket3-r{position:absolute;top:0;right:16.5%;width:1.5px;height:30px;background:var(--line);}
        .ir-flowchart .divider{width:100%;max-width:980px;height:1.5px;background:var(--line);margin:36px 0;}
        .ir-flowchart .gap{height:20px;}
        .ir-flowchart .gap-sm{height:10px;}
        @media(max-width:700px){.ir-flowchart .split,.ir-flowchart .split3{grid-template-columns:1fr;}}
      `}</style>

      <div className="ir-flowchart">
        <h1>IR Testing Coordination</h1>
        <div className="subtitle">From Final Decision Letter &rarr; Testing Complete</div>

        <div className="legend">
          <div className="legend-item"><div className="legend-dot" style={{ background: '#1d3557' }}></div>Trigger</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: '#fff', border: '1.5px solid #c8c4bc' }}></div>Action</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: '#fef3dc', border: '1.5px solid #e8a020' }}></div>Decision</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: '#d8f0e6', border: '1.5px solid #2d6a4f' }}></div>Golden Path</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: '#fde8e6', border: '1.5px solid #c0392b' }}></div>Exception</div>
          <div className="legend-item"><div className="legend-dot" style={{ background: '#ede8fb', border: '1.5px solid #5b3fa6' }}></div>Note</div>
        </div>

        <div className="flow">

          <div className="node trigger">&#x1F4CB; FD Letter Received &mdash; Client is IR Eligible</div>
          <div className="arrow"></div>

          <div className="node action">
            <div className="step-num">STEP 1 &mdash; ON THE CALL</div>
            <strong>Introduce the IR evaluation.</strong> Briefly explain the tests needed (6MWT and PFT with DLCO &amp; pre/post bronchodilator &mdash; not a simple spirometry), then present both doctor options:
            <ul>
              <li><strong>Dr. Lewis</strong> &mdash; slightly higher ratings; handles all testing himself; in-person eval in Kennewick, WA or Idaho Falls, ID; travel reimbursement available</li>
              <li><strong>La Plata Medical Examiners</strong> &mdash; high ratings; phone evaluation; mobile testing team available; typically serves NV, AZ, NM and surrounding area</li>
            </ul>
            <div className="warn">&#x26A0;&#xFE0F; If client chooses Dr. Lewis: confirm they understand they must book their own travel AND call their state&rsquo;s DOL Resource Center to pre-authorize it before traveling.</div>
          </div>
          <div className="arrow"></div>

          <div className="node" style={{ background: 'var(--gold-light)', borderColor: 'var(--gold)', maxWidth: '420px', textAlign: 'center', fontWeight: 700, fontSize: '13px', padding: '12px 18px' }}>Which IR doctor did the client choose?</div>

          <div className="bracket">
            <div className="bracket-line"></div>
            <div className="bracket-down-left"></div>
            <div className="bracket-down-right"></div>
          </div>

          {/* TWO COLUMNS */}
          <div className="split">

            {/* DR. LEWIS */}
            <div className="split-col">
              <div className="col-header">&#x1F3D4; Dr. Lewis</div>
              <div className="arrow"></div>

              <div className="node golden">
                <div className="step-num">STEP 2 &mdash; EMAIL DR. LEWIS&rsquo;S OFFICE</div>
                Send the client&rsquo;s contact info and causation records (diagnosis letters / medical records for all approved conditions).<br /><br />
                Use the SWNA Tools EE-10 email template and attach causation records.
                <div className="tag">&#x1F4E7; admin [at] drlewis.org &mdash; Carolyn &amp; Emilee</div>
                <div className="warn">&#x2705; Dr. Smith B-reads CAN be attached for Dr. Lewis.<br />&#x1F6AB; Do NOT CC any HHC group &mdash; Dr. Lewis coordinates everything himself.</div>
              </div>
              <div className="arrow"></div>

              <div className="node golden">
                <div className="step-num">STEP 3 &mdash; EMAIL CLIENT: TRAVEL GUIDE</div>
                Send the client the <strong>Kennewick Travel Guide</strong> (airport, office address, nearby hotels).<br /><br />
                Remind them to call their state&rsquo;s DOL Resource Center to <strong>pre-authorize travel</strong> once their appointment is scheduled, and to keep all receipts for reimbursement.
              </div>
              <div className="arrow"></div>

              <div className="node golden">
                <div className="step-num">STEP 4 &mdash; BRIEF CLIENT ON PFT</div>
                Dr. Lewis coordinates the 6MWT himself &mdash; no need to advise the client on test order.<br /><br />
                PFT tips to share:
                <ul>
                  <li>No need to &ldquo;win&rdquo; &mdash; just do what you can</li>
                  <li>Quick breath into upper chest, not a deep belly breath</li>
                  <li>Don&rsquo;t breathe deeper than you would with light exercise</li>
                </ul>
              </div>
              <div className="arrow"></div>

              <div className="node golden">
                <div className="step-num">STEP 5 &mdash; SUBMIT EE-10</div>
                Submit the <strong>EE-10</strong> to the DOL portal for Dr. Lewis.
              </div>
              <div className="arrow"></div>

              <div className="node golden">
                <div className="step-num">STEP 6 &mdash; UPDATE AIRTABLE</div>
                Add the <strong>IR (Dr. Lewis)</strong> tag.<br />
                Log everything: what was discussed, what was sent, date + initials.
              </div>
              <div className="arrow"></div>

              <div className="node golden">
                <div className="step-num">STEP 7 &mdash; UPDATE IR TRACKING SHEET</div>
                Add client and note how testing is being handled.
                <div className="warn">&#x1F534; RED = action still needed &nbsp;&#x1F535; BLUE = note for AO &nbsp;&#x1F7E2; GREEN = AO&rsquo;s notes to us</div>
              </div>
            </div>

            {/* LA PLATA */}
            <div className="split-col">
              <div className="col-header">&#x1F3E5; La Plata Medical Examiners</div>
              <div className="arrow"></div>

              <div className="node golden">
                <div className="step-num">STEP 2 &mdash; EMAIL LA PLATA</div>
                Send the client&rsquo;s contact info and causation records (diagnosis letters / medical records for all approved conditions).<br /><br />
                Use the SWNA Tools EE-10 email template. <strong>CC the client&rsquo;s HHC group</strong> (AO or GHHC only) on this same email &mdash; you can also use it to request an OV note and ADL from them.
                <div className="tag">&#x1F4E7; impairments [at] lpmedx.com<br />cali.candelaria [at] lpmedx.com</div>
                <div className="alert">&#x1F6AB; DO NOT attach Dr. Smith B-reads to La Plata emails. Klepper B-reads are OK.<br />Check CS letters &mdash; many now auto-attach a B-read at the end. DELETE it before sending and save the B-read separately in the client&rsquo;s file.</div>
              </div>
              <div className="arrow"></div>

              <div className="node" style={{ background: 'var(--gold-light)', borderColor: 'var(--gold)', textAlign: 'center', fontWeight: 700, fontSize: '13px', padding: '12px 18px', width: '100%', maxWidth: '100%' }}>What is the client&rsquo;s HHC situation?</div>

              <div className="bracket3">
                <div className="bracket3-line"></div>
                <div className="bracket3-l"></div>
                <div className="bracket3-m"></div>
                <div className="bracket3-r"></div>
              </div>

              {/* 3-way split */}
              <div className="split3">

                {/* AO */}
                <div className="split3-col">
                  <div className="col-header">AO Client</div>
                  <div className="arrow"></div>
                  <div className="node golden">
                    <div className="step-num">TESTING</div>
                    CC AO on the La Plata email.<br /><br />
                    Request <strong>mobile testing</strong> in the La Plata email (bold the request). CC Zeke. La Plata coordinates with Infinity Medical &mdash; Brock or Daniel will call the client.<br /><br />
                    Also send client availability + Desert Pulmonary referral form to Roxy &amp; Hunter at AO.
                    <div className="tag">&#x1F4E7; roxy [at] aomedicalgroup.com<br />hunter [at] aomedicalgroup.com<br />zkalcich [at] lpmedx.com (CC Zeke &mdash; mobile only)</div>
                  </div>
                  <div className="arrow"></div>
                  <div className="node golden">
                    <div className="step-num">OVN + ADL</div>
                    Ask AO (in the La Plata email) to send us a recent OV note and ADL sheet.<br /><br />
                    Also encourage the client to get their own copy to speed things up.
                  </div>
                  <div className="arrow"></div>
                  <div className="node golden">
                    <div className="step-num">SPREADSHEET</div>
                    Add client to the <strong>AO / La Plata Clients spreadsheet</strong> and note how testing is being coordinated.
                  </div>
                </div>

                {/* GHHC */}
                <div className="split3-col">
                  <div className="col-header">GHHC Client</div>
                  <div className="arrow"></div>
                  <div className="node golden">
                    <div className="step-num">TESTING</div>
                    CC GHHC on the La Plata email.<br /><br />
                    Send a <strong>separate email to GHHC</strong> asking them to coordinate the 6MWT and PFT (with DLCO and pre/post bronchodilator).<br /><br />
                    <strong>If client is in NV or nearby:</strong> also request mobile testing in the La Plata email (bold the request). CC Zeke.
                    <div className="tag">&#x1F4E7; ar.nv [at] givinghhc.com (NV only)<br />stephv [at] givinghhc.com<br />bradyp [at] givinghhc.com<br />cache [at] givinghhc.com (TN only)<br />zkalcich [at] lpmedx.com (CC Zeke &mdash; mobile only)</div>
                  </div>
                  <div className="arrow"></div>
                  <div className="node golden">
                    <div className="step-num">OVN + ADL</div>
                    Ask GHHC (in the La Plata email) to send us a recent OV note and ADL sheet.<br /><br />
                    Also encourage the client to get their own copy to speed things up.
                  </div>
                </div>

                {/* OTHER HHC */}
                <div className="split3-col">
                  <div className="col-header">Other HHC</div>
                  <div className="arrow"></div>
                  <div className="node exception">
                    <div className="step-num">TESTING</div>
                    Contact the client&rsquo;s medical company on file and ask if they can assist with coordinating the 6MWT and PFT.<br /><br />
                    <strong>Mobile testing available (NV/nearby):</strong> request it in the La Plata email (bold). CC Zeke.<br /><br />
                    <strong>Client has a pulmonologist:</strong> get their office info, send to La Plata, ask them to send a referral.<br /><br />
                    <strong>No pulmonologist:</strong> refer to Desert Pulmonary &mdash; fill out La Plata&rsquo;s referral form and send to Roxy &amp; Hunter at AO.
                    <div className="tag">&#x1F4E7; zkalcich [at] lpmedx.com (CC Zeke &mdash; mobile only)<br />roxy [at] aomedicalgroup.com (Desert Pulm referral)</div>
                  </div>
                  <div className="arrow"></div>
                  <div className="node exception">
                    <div className="step-num">OVN + ADL</div>
                    Client must obtain their own OV note:
                    <ul>
                      <li>Download from patient portal</li>
                      <li>Pick up in person at doctor&rsquo;s office</li>
                      <li>Call doctor to fax &mdash; give them our fax: <strong>702-825-0145</strong></li>
                    </ul>
                    <strong>No doctor?</strong> Contact Roxy at AO to set up with Dr. Margallo (Wed/Fri in Las Vegas; Thu in Pahrump).<br /><br />
                    <strong>ADL:</strong> Required but not mandatory if unobtainable &mdash; note in Airtable.
                  </div>
                </div>

              </div>{/* end split3 */}

              <div className="gap"></div>

              <div className="node action" style={{ maxWidth: '100%' }}>
                <div className="step-num">ADVISE CLIENT ON TESTING ORDER &mdash; ALL LA PLATA CLIENTS</div>
                <strong>6MWT must happen BEFORE the PFT.</strong> The bronchodilator inhaler given during the PFT will artificially boost lung function and skew 6MWT results if done afterward.<br /><br />
                PFT tips:
                <ul>
                  <li>No need to &ldquo;win&rdquo; &mdash; just do what you can</li>
                  <li>Quick breath into upper chest, not a deep belly breath</li>
                  <li>Don&rsquo;t breathe deeper than you would with light exercise</li>
                </ul>
                Send the client the <strong>IR Testing Guidelines</strong> document to take to their appointment (lists tests, CPT codes, and doctor instructions).
              </div>
              <div className="arrow"></div>

              <div className="node golden">
                <div className="step-num">STEP 3 &mdash; SUBMIT EE-10</div>
                Submit the <strong>EE-10</strong> to the DOL portal for La Plata.
              </div>
              <div className="arrow"></div>

              <div className="node golden">
                <div className="step-num">STEP 4 &mdash; UPDATE AIRTABLE</div>
                Add the <strong>IR (La Plata)</strong> tag.<br />
                Log everything: testing method, OVN/ADL status, who was emailed, date + initials.<br /><br />
                <em>Example: He wants La Plata for his IR. Emailed AO to coordinate 6MWT and request OVN from his PCP. Emailed La Plata causation and contact info. Submitted EE-10. 1.7.26 DP</em>
              </div>
              <div className="arrow"></div>

              <div className="node golden">
                <div className="step-num">STEP 5 &mdash; UPDATE IR TRACKING SHEET</div>
                Add client and note how testing is being handled.
                <div className="warn">&#x1F534; RED = action still needed &nbsp;&#x1F535; BLUE = note for AO &nbsp;&#x1F7E2; GREEN = AO&rsquo;s notes to us</div>
              </div>

            </div>{/* end La Plata col */}
          </div>{/* end split */}

          <div className="divider"></div>

          {/* EXCEPTION REFERENCE */}
          <div className="node section-hdr" style={{ maxWidth: '700px' }}>Exception Reference &mdash; Edge Cases</div>
          <div className="gap"></div>

          <div className="split" style={{ maxWidth: '700px' }}>
            <div className="node exception">
              <strong>Client tested within the last year</strong><br />
              Previous PFT/6MWT results are still valid &mdash; no need to repeat testing.
            </div>
            <div className="node exception">
              <strong>Client can&rsquo;t find a local facility</strong><br />
              Ask their HHC company to help find one. Or refer to Desert Pulmonary &mdash; fill out La Plata&rsquo;s referral form and send to Roxy &amp; Hunter at AO.
            </div>
            <div className="node exception">
              <strong>La Plata requests additional testing</strong><br />
              Occasionally they&rsquo;ll need labwork or dermatology records. Case-by-case &mdash; La Plata will let us know.
            </div>
            <div className="node exception">
              <strong>Client wants reimbursement for PFT/6MWT</strong><br />
              If approved for a pulmonary condition on ECOMP, they can submit their bill + Medical Reimbursement form to the LV Resource Center.<br />
              &#x1F4DE; 702-697-0841
            </div>
          </div>

          <div className="gap"></div>
          <div className="node note">
            <strong>Always ensure there is a clear path for test results to get back to us</strong> &mdash; either the client brings a copy from their appointment, the facility faxes directly to La Plata, or the HHC group assists in retrieving them.
          </div>

        </div>{/* end flow */}
      </div>
    </>
  );
}
