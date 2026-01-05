const https = require('https');

const SUPABASE_URL = 'tmdiqbjxezdzphisdgnt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtZGlxYmp4ZXpkenBoaXNkZ250Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzAwMTMsImV4cCI6MjA4Mjk0NjAxM30.S0_MYO4oc4u_qG_uhfpFoqVrbu6RTnuRiTALa8dVeH0';

// Account consolidation mappings: child accounts -> parent account
const consolidations = [
  {
    parent: { id: '057c061f-2570-4e79-97f5-85b14fa1471d', name: 'Cummins' },
    children: [
      { id: 'c4776c48-9c81-40a7-84aa-6c183ded0571', name: 'Cummins (Accelera)', suffix: 'Accelera' },
      { id: '8c67bc5e-3159-4874-bbc0-f3469c506bd3', name: 'Cummins (EBU)', suffix: 'EBU' },
      { id: '4678cced-b8bd-4b97-b2a9-091cdcc6aa32', name: 'Cummins (PCRA)', suffix: 'PCRA' },
    ]
  },
  {
    parent: { id: '278dce05-1e01-4272-b17c-face30ddc800', name: 'Ford' },
    children: [
      { id: '867b540c-9111-4225-821b-50425fcd4e8a', name: 'Ford Otosan', suffix: 'Otosan' },
      { id: 'baaa59e1-e6c1-410b-9809-7ab6835c68ea', name: 'Ford otosan (TARA)', suffix: 'Otosan TARA' },
    ]
  },
  {
    parent: { id: '35e47d18-66e1-4b89-a7ff-36a2d5171298', name: 'Aptiv' },
    children: [
      { id: 'c30ac5a8-b594-4545-a771-0a5a12c55d6e', name: 'Aptiv TARA', suffix: 'TARA' },
    ]
  }
];

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1' + path,
      method: method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : (method === 'PATCH' ? 'return=representation' : 'return=minimal')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${method} ${path} failed: ${res.statusCode} - ${data}`));
        } else {
          resolve(data ? JSON.parse(data) : null);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function consolidateAccounts() {
  console.log('Starting account consolidation...\n');

  for (const group of consolidations) {
    console.log(`\n=== Consolidating ${group.parent.name} ===`);

    for (const child of group.children) {
      console.log(`\nProcessing: ${child.name} -> ${group.parent.name}`);

      // 1. Move pursuits - update account_plan_id and optionally rename
      try {
        const pursuits = await makeRequest('GET', `/pursuits?account_plan_id=eq.${child.id}&select=pursuit_id,name`);
        console.log(`  Found ${pursuits.length} pursuits`);

        for (const pursuit of pursuits) {
          // Add business unit suffix to pursuit name if not already there
          const newName = pursuit.name.includes(child.suffix) ? pursuit.name : `${pursuit.name} (${child.suffix})`;
          await makeRequest('PATCH', `/pursuits?pursuit_id=eq.${pursuit.pursuit_id}`, {
            account_plan_id: group.parent.id,
            name: newName
          });
          console.log(`    Moved pursuit: ${pursuit.name} -> ${newName}`);
        }
      } catch (e) {
        console.error(`  Error moving pursuits: ${e.message}`);
      }

      // 2. Move stakeholders
      try {
        const stakeholders = await makeRequest('GET', `/stakeholders?account_plan_id=eq.${child.id}&select=stakeholder_id,full_name`);
        console.log(`  Found ${stakeholders.length} stakeholders`);

        for (const sh of stakeholders) {
          await makeRequest('PATCH', `/stakeholders?stakeholder_id=eq.${sh.stakeholder_id}`, {
            account_plan_id: group.parent.id,
            business_unit: child.suffix  // Tag with business unit
          });
          console.log(`    Moved stakeholder: ${sh.full_name}`);
        }
      } catch (e) {
        console.error(`  Error moving stakeholders: ${e.message}`);
      }

      // 3. Move action items
      try {
        const actions = await makeRequest('GET', `/action_items?account_plan_id=eq.${child.id}&select=action_id,title`);
        console.log(`  Found ${actions.length} action items`);

        for (const action of actions) {
          await makeRequest('PATCH', `/action_items?action_id=eq.${action.action_id}`, {
            account_plan_id: group.parent.id
          });
          console.log(`    Moved action: ${action.title.substring(0, 40)}...`);
        }
      } catch (e) {
        console.error(`  Error moving actions: ${e.message}`);
      }

      // 4. Move engagement logs
      try {
        const engagements = await makeRequest('GET', `/engagement_logs?account_plan_id=eq.${child.id}&select=engagement_id,title`);
        console.log(`  Found ${engagements.length} engagement logs`);

        for (const eng of engagements) {
          await makeRequest('PATCH', `/engagement_logs?engagement_id=eq.${eng.engagement_id}`, {
            account_plan_id: group.parent.id
          });
          console.log(`    Moved engagement: ${eng.title?.substring(0, 40) || 'Untitled'}...`);
        }
      } catch (e) {
        console.error(`  Error moving engagements: ${e.message}`);
      }

      // 5. Move pain points
      try {
        const painPoints = await makeRequest('GET', `/pain_points?account_plan_id=eq.${child.id}&select=pain_point_id,description`);
        console.log(`  Found ${painPoints.length} pain points`);

        for (const pp of painPoints) {
          await makeRequest('PATCH', `/pain_points?pain_point_id=eq.${pp.pain_point_id}`, {
            account_plan_id: group.parent.id
          });
        }
      } catch (e) {
        console.error(`  Error moving pain points: ${e.message}`);
      }

      // 6. Move risks
      try {
        const risks = await makeRequest('GET', `/risks?account_plan_id=eq.${child.id}&select=risk_id,description`);
        console.log(`  Found ${risks.length} risks`);

        for (const risk of risks) {
          await makeRequest('PATCH', `/risks?risk_id=eq.${risk.risk_id}`, {
            account_plan_id: group.parent.id
          });
        }
      } catch (e) {
        console.error(`  Error moving risks: ${e.message}`);
      }

      // 7. Move review notes
      try {
        const notes = await makeRequest('GET', `/review_notes?account_plan_id=eq.${child.id}&select=note_id,note_text`);
        console.log(`  Found ${notes.length} review notes`);

        for (const note of notes) {
          await makeRequest('PATCH', `/review_notes?note_id=eq.${note.note_id}`, {
            account_plan_id: group.parent.id
          });
        }
      } catch (e) {
        console.error(`  Error moving review notes: ${e.message}`);
      }

      // 8. Delete the child account
      try {
        await makeRequest('DELETE', `/account_plans?account_plan_id=eq.${child.id}`);
        console.log(`  DELETED account: ${child.name}`);
      } catch (e) {
        console.error(`  Error deleting account: ${e.message}`);
      }
    }
  }

  console.log('\n\n=== Consolidation complete! ===');
}

consolidateAccounts().catch(console.error);
