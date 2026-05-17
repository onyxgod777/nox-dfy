#!/usr/bin/env node
// Nox DFY — Quick Deploy Template
// Usage: node dfy-deploy.js <client-name> <tier>
// Tiers: content, trading, full, custom
// 
// Example: node dfy-deploy.js "DrSarah" content

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WS = '/data/data/com.termux/files/home/.openclaw/workspace';
const DFY_DIR = path.join(WS, 'dfy-package');
const DEPLOY_DIR = path.join(DFY_DIR, 'deployments');

// ── Tier templates ──
const TIERS = {
  content: {
    price: '2500',
    agents: ['writer', 'seo'],
    crons: ['0 9 * * *', '0 8 * * 0'],
    description: 'Blog writing + SEO automation',
  },
  trading: {
    price: '4000',
    agents: ['polymarket', 'monitor'],
    crons: ['30 9 * * *', '0 12 * * *', '0 15 * * *'],
    description: 'Polymarket trading bot + monitoring',
  },
  full: {
    price: '6500',
    agents: ['writer', 'promoter', 'seo', 'monitor', 'security'],
    crons: ['0 9 * * *', '0 11 * * *', '0 8 * * 0', '0 */3 * * *', '0 7 * * 0'],
    description: 'Full business automation suite',
  },
};

// ── Agent prompt templates ──
const AGENT_PROMPTS = {
  writer: `You are a content writing agent for {CLIENT_NAME}.
Write blog posts about {CLIENT_NICHE}. Each post should be 1000-1500 words,
SEO-optimized with proper headings, meta descriptions, and internal links.
Write in {CLIENT_TONE} tone. Publish to the client's website.`,

  seo: `You are an SEO audit agent for {CLIENT_NAME}.
Check all pages for: meta tags, OG tags, headings, broken links, sitemap.
Fix issues found. Run weekly.`,

  promoter: `You are a promotional agent for {CLIENT_NAME}.
Post about the client's content on social platforms.
Share links, engage with relevant communities.
Rotation: different platform each day.`,

  monitor: `You are a monitoring agent for {CLIENT_NAME}.
Check all client services every 3 hours:
1. Website: 200 OK?
2. SSL cert: expiring?
3. Agents: running?
4. Disk space: sufficient?
Log everything. Alert on new issues only.`,

  security: `You are a security agent for {CLIENT_NAME}.
Weekly scan:
1. File permissions (600 for keys)
2. Exposed credentials
3. CSP headers
4. HTTPS enforcement
5. Failed login attempts
Report findings.`,

  polymarket: `You are a Polymarket trading agent for {CLIENT_NAME}.
Risk params:
  maxPosition: {RISK_MAX_POS}
  maxDeployed: 80%
  maxOpenPositions: 3
  stopLoss: 50%
  takeProfit: 3x
Scan daily at 9:30 AM ET.
Auto-buy best signal. Auto-place TP/SL limit orders.
Report to Telegram at 5 PM ET.`,
};

function log(msg) {
  console.log(`  ${msg}`);
}

function deployTier(clientName, tier) {
  const config = TIERS[tier];
  if (!config) throw new Error(`Unknown tier: ${tier}. Options: ${Object.keys(TIERS).join(', ')}`);

  const clientSlug = clientName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const deployPath = path.join(DEPLOY_DIR, clientSlug);
  fs.mkdirSync(deployPath, { recursive: true });

  log(`\n═══════════════════════════════════════`);
  log(`  NOX DFY — Deploying: ${clientName}`);
  log(`  Tier: ${tier} (${config.description})`);
  log(`  Price: \$${config.price}`);
  log(`═══════════════════════════════════════\n`);

  // Generate agent configs
  const agents = [];
  for (const agentType of config.agents) {
    let prompt = AGENT_PROMPTS[agentType] || `Agent for ${clientName}`;
    prompt = prompt.replace(/{CLIENT_NAME}/g, clientName);
    prompt = prompt.replace(/{CLIENT_NICHE}/g, 'their niche');
    prompt = prompt.replace(/{CLIENT_TONE}/g, 'professional');
    prompt = prompt.replace(/{RISK_MAX_POS}/g, '10');

    const agentConfig = {
      name: `${clientSlug}-${agentType}`,
      type: agentType,
      client: clientName,
      prompt: prompt,
      schedule: config.crons[config.agents.indexOf(agentType)] || '0 0 * * *',
    };
    agents.push(agentConfig);
  }

  // Write deployment config
  const deployment = {
    client: clientName,
    slug: clientSlug,
    tier: tier,
    price: config.price,
    deployedAt: new Date().toISOString(),
    agents: agents,
    status: 'deployed',
  };

  const deployFile = path.join(deployPath, 'deployment.json');
  fs.writeFileSync(deployFile, JSON.stringify(deployment, null, 2));
  log(`✅ Config saved: ${deployFile}`);

  // Generate a simple deployment summary
  const summary = `
═══════════════════════════════════════
  NOX DFY — Deployment Summary
═══════════════════════════════════════
  Client: ${clientName}
  Tier:   ${tier} (${config.description})
  Price:  \$${config.price}
  Agents: ${agents.length}

  Agents:
${agents.map(a => `    • ${a.name} — ${a.type}
      Schedule: ${a.schedule}`).join('\n')}

  Setup checklist:
  [ ] VPS/server provisioned
  [ ] OpenClaw installed
  [ ] Agents configured
  [ ] Cron jobs created
  [ ] Telegram delivery wired
  [ ] DNS + SSL configured
  [ ] Client briefed
  [ ] Payment received

═══════════════════════════════════════
`;

  fs.writeFileSync(path.join(deployPath, 'summary.txt'), summary.trim());
  log(summary);

  return deployment;
}

// ── CLI ──
const clientName = process.argv[2];
const tier = process.argv[3] || 'content';

if (!clientName) {
  console.log('\n  Usage: node dfy-deploy.js <client-name> <tier>');
  console.log(`  Tiers: ${Object.keys(TIERS).join(', ')}`);
  console.log('\n  Example: node dfy-deploy.js "DrSarah" content\n');
  process.exit(1);
}

try {
  deployTier(clientName, tier);
  log('✅ Deployment template ready. Hand off to client.');
} catch(e) {
  log(`❌ ${e.message}`);
}
