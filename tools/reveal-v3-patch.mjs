import fs from 'node:fs';

const files = ['app-product.js', 'LC_App_GitHub_Pages_Upload/app-product.js'];

const replacements = [
  [
    '${state.demo ? `<div class="lc-product-demo-banner"><strong>DEMO MODE · ${safe(state.demoPersona || "preview")}</strong><div class="lc-product-actions"><button class="lc-product-chip" type="button" data-lc-demo-switch>Switch role</button><button class="lc-product-chip" type="button" data-lc-demo-reset>Reset demo</button><button class="lc-product-chip" type="button" data-lc-demo-exit>Exit demo</button><button class="lc-product-chip active" type="button" data-auth-route="signup">Create your account</button></div></div>` : ""}',
    '${state.demo ? `<div class="lc-product-demo-banner"><strong>INTERACTIVE REVEAL · ${safe(state.demoPersona || "preview")}</strong><div class="lc-product-actions"><button class="lc-product-chip" type="button" data-lc-demo-switch>Switch perspective</button><button class="lc-product-chip" type="button" data-lc-demo-reset>Reset journey</button><button class="lc-product-chip" type="button" data-lc-demo-exit>Back to opening</button></div></div>` : ""}'
  ],
  [
`  function renderDemoEntry() {
    shell().innerHTML = \`${'${top("LC App", "Creator-first Live Casino")}'}
      <div class="lc-product-entry">
        ${'${visualHero("Visual 2.0", "Casino, through people.", "Follow creators. Catch the live moment. Return to the table with context.", visualMedia.fallback, \'<button class="lc-product-btn" type="button" data-lc-demo-persona="player">Start reveal</button><button class="lc-product-btn secondary" type="button" data-lc-demo-persona="operator">Ecosystem view</button>\')}'}
        <section class="lc-product-media-grid">
          ${'${visualTile(visualMedia["demo-sofia"], "Discover", "The host behind the table.", "A consumer entry point for live rooms.", true)}'}
          ${'${visualTile(visualMedia["demo-alex"], "Live now", "Baccarat starts soon.", "Creator-led live intent.")}'}
          ${'${visualTile(visualMedia["demo-marcus"], "Community", "The table becomes a room.", "People, content and return loops.")}'}
        </section>
        <section class="lc-product-card"><h2>Safe boundary</h2><p>LC App handles discovery and social context. Operators/providers keep game operation, wallet, KYC, wagering and settlement.</p></section>
        <section class="lc-product-personas">
          <button class="lc-product-persona" type="button" data-lc-demo-persona="player"><b>PLAYER</b><span>Discover -> Creator -> Follow -> Live -> Handoff -> Return.</span></button>
          <button class="lc-product-persona" type="button" data-lc-demo-persona="creator"><b>CREATOR / DEALER</b><span>Profile, content, audience and live schedule.</span></button>
          <button class="lc-product-persona" type="button" data-lc-demo-persona="operator"><b>OPERATOR</b><span>Creator-led discovery and operator-controlled handoff.</span></button>
          <button class="lc-product-persona" type="button" data-lc-demo-persona="provider"><b>PROVIDER</b><span>Distribution through people, rooms and content.</span></button>
        </section>
        <div class="lc-product-entry-auth"><button class="lc-product-btn secondary" type="button" data-auth-route="login">SIGN IN</button><button class="lc-product-btn" type="button" data-auth-route="signup">CREATE ACCOUNT</button></div>
      </div>\`;
  }`,
`  function renderDemoEntry() {
    shell().innerHTML = \`${'${top("LC App", "The social discovery layer for Live Casino")}'}
      <div class="lc-product-entry">
        ${'${visualHero("The social discovery layer for Live Casino", "Live Casino through people.", "Live Casino has always had personalities. LC App makes them discoverable, followable and able to bring audiences back to the live moment.", visualMedia.fallback, \'<button class="lc-product-btn" type="button" data-lc-demo-persona="player">Start with the player</button><button class="lc-product-btn secondary" type="button" data-lc-demo-persona="operator">See the business layer</button>\')}'}
        <section class="lc-product-card"><div class="lc-product-section-head"><h2>The discovery model changes</h2><span>Game-first → people-first</span></div><p style="margin-bottom:10px">Traditional Live Casino discovery starts with the lobby. LC starts with the person.</p><div class="lc-product-flow"><span>Casino</span><span>Lobby</span><span>Game</span><span>Table</span><span>Seat</span></div><div class="lc-product-flow" style="margin-top:8px"><span>Discover</span><span>Creator</span><span>Follow</span><span>Live</span><span>Return</span></div></section>
        <section class="lc-product-media-grid">
          ${'${visualTile(visualMedia["demo-sofia"], "Discover", "The person becomes the entry point.", "A player can discover a host before choosing the table.", true)}'}
          ${'${visualTile(visualMedia["demo-alex"], "Live intent", "Follow the moment, not only the game.", "Creator identity turns attention into a reason to return.")}'}
          ${'${visualTile(visualMedia["demo-marcus"], "Continuity", "The table is temporary. The relationship can continue.", "Content, schedules and follows connect one live session to the next.")}'}
        </section>
        <section class="lc-product-card"><div class="lc-product-section-head"><h2>One layer. Four sides.</h2><span>Explore the thesis</span></div><p>Start with the player journey, then switch perspective to see why creators, operators and providers can all participate without LC becoming the casino.</p></section>
        <section class="lc-product-personas">
          <button class="lc-product-persona" type="button" data-lc-demo-persona="player"><b>PLAYER</b><span>Discover → Creator → Follow → Live → Handoff → Return.</span></button>
          <button class="lc-product-persona" type="button" data-lc-demo-persona="creator"><b>CREATOR / DEALER</b><span>Dealer → Persona → Creator → Audience → Live intent.</span></button>
          <button class="lc-product-persona" type="button" data-lc-demo-persona="operator"><b>OPERATOR</b><span>The operator keeps the game. LC creates another path to it.</span></button>
          <button class="lc-product-persona" type="button" data-lc-demo-persona="provider"><b>PROVIDER</b><span>Distribution can start with a person, not only a game tile.</span></button>
        </section>
        <section class="lc-product-card"><h2>Clear operating boundary</h2><p>LC App owns discovery, creator identity, social context, schedules and return intent. Licensed operators/providers keep gameplay, wallet, deposits and withdrawals, KYC/AML, responsible gaming, wagering and settlement.</p></section>
        <section class="lc-product-card lc-product-hero"><span class="lc-product-label">The thesis</span><h1>Casino was built around games. LC is built around people.</h1><p>Live Casino through people.</p></section>
      </div>\`;
  }`
  ],
  [
    '${visualHero("Creator Home", "A home for the host.", "Profile, posts, rooms, followers and live schedule in one consumer surface.',
    '${visualHero("Creator Home", "From dealer to creator.", "A persistent identity turns a dealer into a persona players can discover, follow and return to across sessions.'
  ],
  [
    '<section class="lc-product-card"><div class="lc-product-flow"><span>Profile</span><span>Content</span><span>Schedule</span><span>Live</span><span>Audience</span></div><span class="lc-product-note">Verification and affiliation approval are protected. Creator cannot self-verify.</span></section>',
    '<section class="lc-product-card"><div class="lc-product-section-head"><h2>Identity becomes distribution</h2><span>Dealer → Creator</span></div><div class="lc-product-flow"><span>Dealer</span><span>Persona</span><span>Content</span><span>Audience</span><span>Live intent</span></div><span class="lc-product-note">Verification and affiliation approval are protected. Creator cannot self-verify.</span></section>'
  ],
  [
    'provider ? "Live Casino as a creator network." : "Return intent before the table opens."',
    'provider ? "Distribution can start with a person." : "The operator keeps the game. LC creates another path to it."'
  ],
  [
    'provider ? "A distribution layer for rooms, hosts and content without claiming production integrations." : "A social discovery and re-engagement layer around licensed operator infrastructure."',
    'provider ? "Creators, rooms and content become an additional discovery surface around existing provider distribution." : "Creator → Audience → Live intent → Operator handoff → Return. LC adds discovery and continuity around licensed operator infrastructure."'
  ],
  [
    '${provider ? "<span>Game</span><span>Creator</span><span>Audience</span><span>Live</span><span>Operator</span>" : "<span>Discover</span><span>Intent</span><span>Handoff</span><span>Return</span><span>Access</span>"}',
    '${provider ? "<span>Game</span><span>Creator</span><span>Audience</span><span>Live intent</span><span>Operator</span>" : "<span>Creator</span><span>Audience</span><span>Live intent</span><span>Handoff</span><span>Return</span>"}'
  ],
  [
    '<section class="lc-product-card"><div class="lc-product-flow"><span>Creator</span><span>Intent</span><span>Operator</span><span>Play</span><span>Return</span></div><span class="lc-product-note">No deposits, wagering, KYC, AML, wallet or settlement data passes through LC.</span></section>',
    '<section class="lc-product-card"><div class="lc-product-section-head"><h2>The relationship survives the handoff</h2><span>Context returns with the player</span></div><div class="lc-product-flow"><span>Creator</span><span>Intent</span><span>Operator</span><span>Play</span><span>Return</span></div><p style="margin-top:10px">The table is temporary. The relationship can continue.</p><span class="lc-product-note">No deposits, wagering, KYC, AML, wallet or settlement data passes through LC.</span></section><section class="lc-product-card lc-product-hero"><span class="lc-product-label">LC App</span><h1>Live Casino through people.</h1><p>Discovery, identity and return context around the licensed casino ecosystem.</p></section>'
  ],
  [
    '${state.demo ? `<button class="lc-product-btn secondary" type="button" data-lc-demo-exit>EXIT DEMO</button><button class="lc-product-btn" type="button" data-auth-route="signup">CREATE ACCOUNT</button>` : `<button class="lc-product-btn secondary" type="button" data-auth-route="logout">SIGN OUT</button>`}',
    '${state.demo ? `<button class="lc-product-btn secondary" type="button" data-lc-demo-exit>BACK TO OPENING</button>` : `<button class="lc-product-btn secondary" type="button" data-auth-route="logout">SIGN OUT</button>`}'
  ]
];

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    if (!text.includes(from)) {
      throw new Error(`Expected reveal patch anchor not found in ${file}: ${from.slice(0, 100)}`);
    }
    text = text.replace(from, to);
  }
  if (/Visual 2\.0|>SIGN IN<|>CREATE ACCOUNT</.test(text.split('function renderDemoEntry()')[1]?.split('function renderPersonaChoice()')[0] || '')) {
    throw new Error(`Public reveal entry still contains internal/auth residue in ${file}`);
  }
  fs.writeFileSync(file, text);
  console.log(`patched ${file}`);
}
