-- ============================================
-- SEED TAM DATA FROM C2A 2026 TAM MASTER
-- ============================================

-- Clear existing sample TAM data (keeping real data if any)
DELETE FROM campaign_tam_accounts;
DELETE FROM tam_contacts;
DELETE FROM tam_warm_paths;
DELETE FROM account_signals;
DELETE FROM tam_accounts;

-- ============================================
-- MEDICAL DEVICE TAM (Top accounts)
-- ============================================

INSERT INTO tam_accounts (company_name, website, vertical, fit_tier, estimated_deal_value, company_summary, fit_rationale, priority_score, status) VALUES
('Medtronic', 'medtronic.com', 'Medical', 'A', 750000, 'Global leader in medical technology. $33.5B revenue, 95,000 employees. Broad portfolio of connected medical devices.', 'High - Device Mfg. Tier 1 priority. FDA 524B / IEC 62304 compliance needs.', 95, 'Qualified'),
('Johnson & Johnson MedTech', 'jnj.com', 'Medical', 'A', 700000, 'MedTech segment of J&J. $31.9B revenue, 138,000 employees. Major device manufacturer.', 'High - Device Mfg. Tier 1 priority. Extensive connected device portfolio.', 92, 'Qualified'),
('Siemens Healthineers', 'siemens-healthineers.com', 'Medical', 'A', 650000, 'German medical technology company. $25.7B revenue. Imaging, diagnostics, advanced therapies.', 'High - Device Mfg. Tier 1 priority. Strong EU presence (CRA relevant).', 90, 'Qualified'),
('Danaher Corporation', 'danaher.com', 'Medical', 'A', 600000, 'Diagnostics and Life Sciences. $24B revenue. Multiple operating companies.', 'High - Device Mfg. Tier 1 priority. Complex multi-brand compliance needs.', 88, 'Qualified'),
('Stryker Corporation', 'stryker.com', 'Medical', 'A', 600000, 'Medical technology company. $23B revenue. Orthopedics, MedSurg, Neurotechnology.', 'High - Device Mfg. Tier 1 priority. Growing connected surgery portfolio.', 87, 'Qualified'),
('Becton Dickinson', 'bd.com', 'Medical', 'A', 550000, 'Medical technology company. $21.7B revenue. Medication management, diagnostics.', 'High - Device Mfg. Tier 1 priority. Connected medication management systems.', 85, 'Qualified'),
('GE Healthcare', 'gehealthcare.com', 'Medical', 'A', 550000, 'Healthcare technology. $19.7B revenue. Imaging, ultrasound, patient monitoring.', 'High - Device Mfg. Tier 1 priority. Large connected device portfolio.', 84, 'Qualified'),
('Philips', 'philips.com', 'Medical', 'A', 600000, 'Health technology company. $19.5B revenue. Diagnostic imaging, patient monitoring.', 'High - Device Mfg. Tier 1 priority. Massive connected device install base.', 88, 'Qualified'),
('Roche Diagnostics', 'roche.com', 'Medical', 'A', 500000, 'Swiss healthcare company. $17.7B diagnostics revenue. Lab systems, point of care.', 'High - Device Mfg. Tier 1 priority. Connected diagnostics platforms.', 82, 'Qualified'),
('Boston Scientific', 'bostonscientific.com', 'Medical', 'A', 500000, 'Medical device company. $17B revenue. Cardiovascular, rhythm management.', 'High - Device Mfg. Tier 1 priority. Active in EU market (CRA relevant).', 83, 'Qualified'),
('Abbott Laboratories', 'abbott.com', 'Medical', 'B', 450000, 'Healthcare company. $28.3B revenue. Diagnostics, cardiovascular, neuromodulation.', 'High - Device Mfg. Tier 2 priority.', 75, 'Qualified'),
('Baxter International', 'baxter.com', 'Medical', 'A', 400000, 'Healthcare company. $10.6B revenue. Renal care, medication delivery.', 'High - Device Mfg. Tier 1 priority. Connected infusion pumps.', 80, 'Qualified'),
('Fresenius Medical Care', 'freseniusmedicalcare.com', 'Medical', 'A', 400000, 'Dialysis company. $4.4B revenue. Dialysis machines, services.', 'High - Device Mfg. Tier 1 priority. Connected dialysis systems.', 78, 'Qualified'),
('Intuitive Surgical', 'intuitive.com', 'Medical', 'A', 450000, 'Robotic surgery. $8.4B revenue. da Vinci surgical systems.', 'High - Device Mfg. Tier 1 priority. Complex connected surgical robots.', 85, 'Qualified'),
('Smith & Nephew', 'smith-nephew.com', 'Medical', 'A', 350000, 'Medical technology. $5.8B revenue. Orthopedics, sports medicine, wound care.', 'High - Device Mfg. Tier 1 priority.', 76, 'Qualified'),
('Steris', 'steris.com', 'Medical', 'A', 350000, 'Healthcare company. $5.4B revenue. Sterilization, surgical products.', 'High - Device Mfg. Tier 1 priority. Connected sterilization equipment.', 77, 'Qualified'),
('B. Braun', 'bbraun.com', 'Medical', 'B', 350000, 'German medical company. $10.4B revenue. Infusion therapy, pain management.', 'High - Device Mfg. Tier 2 priority. Strong EU presence.', 72, 'Qualified'),
('Alcon', 'alcon.com', 'Medical', 'B', 300000, 'Eye care company. $10B revenue. Surgical, vision care.', 'High - Device Mfg. Tier 2 priority.', 68, 'Qualified'),
('Zimmer Biomet', 'zimmerbiomet.com', 'Medical', 'B', 300000, 'Musculoskeletal healthcare. $7.7B revenue. Joint reconstruction, spine.', 'High - Device Mfg. Tier 2 priority. Growing connected surgery portfolio.', 70, 'Qualified'),
('Terumo', 'terumo.com', 'Medical', 'B', 280000, 'Japanese medical company. $6.9B revenue. Cardiovascular, blood management.', 'High - Device Mfg. Tier 2 priority.', 65, 'Qualified'),
('Olympus Medical', 'olympus.com', 'Medical', 'B', 280000, 'Japanese medical company. $6.5B medical revenue. Endoscopy, surgical.', 'High - Device Mfg. Tier 2 priority.', 66, 'Qualified'),
('ResMed', 'resmed.com', 'Medical', 'B', 250000, 'Sleep and respiratory care. $5B revenue. Connected CPAP devices.', 'High - Device Mfg. Tier 2 priority. Strong connected device focus.', 67, 'Qualified'),
('Solventum', 'solventum.com', 'Medical', 'A', 350000, '3M Healthcare spinoff. $8.3B revenue. Medical solutions, wound care.', 'High - Device Mfg. Tier 1 priority. New company, establishing compliance.', 79, 'Qualified');

-- ============================================
-- AUTOMOTIVE TAM (Top accounts)
-- ============================================

INSERT INTO tam_accounts (company_name, website, vertical, fit_tier, estimated_deal_value, company_summary, fit_rationale, priority_score, status) VALUES
('Volkswagen Group', 'volkswagen.com', 'Automotive', 'A', 800000, 'German automotive giant. $345B revenue. VW, Audi, Porsche, SEAT, Skoda.', 'Prospect. Tier 1 - Active. UN R155 / ISO 21434 compliance.', 95, 'Qualified'),
('Mercedes-Benz Group', 'mercedes-benz.com', 'Automotive', 'A', 750000, 'German luxury automaker. $154B revenue. Mercedes-Benz, AMG, Maybach.', 'Customer. Tier 1 - Active. Existing relationship.', 98, 'Qualified'),
('Stellantis', 'stellantis.com', 'Automotive', 'A', 700000, 'Multinational automotive. $204B revenue. Jeep, RAM, Peugeot, Fiat, Chrysler.', 'Prospect. Tier 1 - Active. Multi-brand compliance needs.', 90, 'Qualified'),
('Nissan Motor', 'nissan-global.com', 'Automotive', 'A', 600000, 'Japanese automaker. $78.7B revenue. Nissan, Infiniti, Datsun.', 'Prospect. Tier 1 - Active.', 85, 'Qualified'),
('Bosch', 'bosch.com', 'Automotive', 'B', 650000, 'German technology company. $99.9B revenue. Largest automotive supplier.', 'Cold. Tier 2 - Pursue. Massive ECU portfolio.', 78, 'Qualified'),
('Toyota Motor', 'toyota.com', 'Automotive', 'B', 600000, 'Japanese automaker. $303.7B revenue. World largest automaker.', 'Prospect. Tier 1 - Active.', 82, 'Qualified'),
('Ford Motor', 'ford.com', 'Automotive', 'B', 550000, 'American automaker. $174.2B revenue. Ford, Lincoln.', 'Cold. Tier 2 - Pursue.', 72, 'Qualified'),
('General Motors', 'gm.com', 'Automotive', 'B', 550000, 'American automaker. $171.8B revenue. Chevrolet, GMC, Cadillac, Buick.', 'Cold. Tier 2 - Pursue.', 70, 'Qualified'),
('BMW Group', 'bmwgroup.com', 'Automotive', 'B', 600000, 'German automaker. $157.2B revenue. BMW, MINI, Rolls-Royce.', 'Cold. Tier 2 - Pursue. Premium segment.', 75, 'Qualified'),
('Honda Motor', 'honda.com', 'Automotive', 'B', 500000, 'Japanese automaker. $135.2B revenue. Honda, Acura.', 'Cold. Tier 2 - Pursue.', 68, 'Qualified'),
('Hyundai Motor', 'hyundai.com', 'Automotive', 'B', 500000, 'Korean automaker. $133.1B revenue. Hyundai, Kia, Genesis.', 'Cold. Tier 2 - Pursue.', 70, 'Qualified'),
('Continental AG', 'continental.com', 'Automotive', 'B', 450000, 'German automotive supplier. $45.8B revenue. ADAS, connectivity, tires.', 'Unknown. Tier 2 - Pursue. Major Tier 1 with ECU portfolio.', 72, 'Qualified'),
('ZF Friedrichshafen', 'zf.com', 'Automotive', 'B', 450000, 'German automotive supplier. $46.6B revenue. Driveline, chassis, safety.', 'Unknown. Tier 2 - Pursue. Safety-critical systems.', 70, 'Qualified'),
('Magna International', 'magna.com', 'Automotive', 'B', 400000, 'Canadian automotive supplier. $42.8B revenue. Body, chassis, electronics.', 'Unknown. Tier 2 - Pursue. Diverse portfolio.', 65, 'Qualified'),
('Denso', 'denso.com', 'Automotive', 'B', 400000, 'Japanese supplier. $51.6B revenue. Powertrain, thermal, electronics.', 'Unknown. Tier 2 - Pursue.', 68, 'Qualified'),
('Tesla', 'tesla.com', 'Automotive', 'B', 500000, 'American EV maker. $96.8B revenue. Electric vehicles, energy.', 'Cold. Tier 2 - Pursue. Unique software-defined vehicle approach.', 73, 'Qualified'),
('Renault Group', 'renaultgroup.com', 'Automotive', 'B', 400000, 'French automaker. $53.5B revenue. Renault, Dacia, Alpine.', 'Cold. Tier 2 - Pursue.', 65, 'Qualified'),
('Volvo Cars', 'volvocars.com', 'Automotive', 'B', 350000, 'Swedish automaker. $37.2B revenue. Safety-focused premium brand.', 'Unknown. Tier 2 - Pursue. Strong safety culture.', 68, 'Qualified'),
('Hyundai Mobis', 'mobis.co.kr', 'Automotive', 'B', 350000, 'Korean supplier. $37.6B revenue. Chassis, cockpit, ADAS.', 'Cold. Tier 2 - Pursue.', 62, 'Qualified'),
('Forvia', 'forvia.com', 'Automotive', 'B', 300000, 'French-German supplier. $28.1B revenue. Faurecia + Hella merger.', 'Unknown. Tier 2 - Pursue. Electronics focus.', 60, 'Qualified');

-- ============================================
-- CRA / INDUSTRIAL TAM (Top accounts)
-- ============================================

INSERT INTO tam_accounts (company_name, website, vertical, fit_tier, estimated_deal_value, company_summary, fit_rationale, priority_score, status) VALUES
('Jungheinrich AG', 'jungheinrich.com', 'Industrial', 'A', 400000, 'German material handling company. ~5B EUR revenue. Forklifts, warehouse automation.', 'CRA Top 50. Tier 1. IEC 62443, CRA compliance needs.', 90, 'Qualified'),
('Kion Group', 'kiongroup.com', 'Industrial', 'A', 450000, 'German material handling. ~11B EUR revenue. Linde, STILL, Dematic.', 'CRA Top 50. Tier 1. IEC 62443, CRA. Major automation player.', 92, 'Qualified'),
('Toyota Material Handling', 'toyota-forklifts.com', 'Industrial', 'A', 350000, 'Swedish material handling. ~4B EUR revenue. Part of Toyota Industries.', 'CRA Top 50. Tier 1. ISO standards, CRA, UN R155 overlap.', 85, 'Qualified'),
('Crown Equipment', 'crown.com', 'Industrial', 'A', 350000, 'American material handling. ~4B EUR revenue. Forklifts, fleet management.', 'CRA Top 50. Tier 1. CRA (EU operations).', 83, 'Qualified'),
('Daifuku', 'daifuku.com', 'Industrial', 'A', 400000, 'Japanese material handling. ~500B JPY revenue. Airport, automotive logistics.', 'CRA Top 50. Tier 1. CRA, critical infrastructure, IEC 62443.', 88, 'Qualified'),
('Vanderlande', 'vanderlande.com', 'Industrial', 'A', 350000, 'Dutch material handling. ~2B EUR revenue. Airport, warehouse automation.', 'CRA Top 50. Tier 1. CRA, critical infrastructure, aviation.', 85, 'Qualified'),
('Schneider Electric', 'se.com', 'Industrial', 'A', 500000, 'French industrial company. $25.2B revenue. Energy management, automation.', 'CRA Ready. Include in CRA Campaign. IEC 62443 leader.', 88, 'Qualified'),
('Siemens', 'siemens.com', 'Industrial', 'A', 600000, 'German industrial conglomerate. Digital industries, smart infrastructure.', 'CRA Ready. Massive OT portfolio. Setting IEC 62443 standards.', 92, 'Qualified'),
('Rockwell Automation', 'rockwellautomation.com', 'Industrial', 'A', 450000, 'American industrial automation. PLCs, drives, software.', 'CRA Ready. Connected enterprise strategy. IT/OT convergence.', 82, 'Qualified'),
('ABB', 'abb.com', 'Industrial', 'B', 400000, 'Swiss-Swedish industrial. $29B revenue. Electrification, robotics, automation.', 'CRA Ready. ABB Ability platform. Strong EU presence.', 75, 'Qualified'),
('Emerson Electric', 'emerson.com', 'Industrial', 'A', 400000, 'American automation. $8.5B revenue. Automation solutions, software.', 'CRA Ready. Include in CRA Campaign.', 80, 'Qualified'),
('Honeywell Industrial', 'honeywell.com', 'Industrial', 'A', 450000, 'American conglomerate. $10.8B industrial revenue. Aerospace, automation, safety.', 'CRA Ready. Include in CRA Campaign.', 82, 'Qualified'),
('Caterpillar', 'caterpillar.com', 'Industrial', 'B', 500000, 'American equipment manufacturer. $67.1B revenue. Construction, mining.', 'CRA Ready. Tier 2. Connected equipment, autonomous systems.', 78, 'Qualified'),
('John Deere', 'deere.com', 'Industrial', 'B', 450000, 'American equipment. $59.3B revenue. Agricultural, construction equipment.', 'CRA Ready. Include in CRA Campaign. Autonomous systems.', 76, 'Qualified'),
('Komatsu', 'komatsu.com', 'Industrial', 'B', 400000, 'Japanese equipment. $30.5B revenue. Construction, mining equipment.', 'CRA Ready. Include in CRA Campaign. Autonomous mining.', 74, 'Qualified'),
('Liebherr Group', 'liebherr.com', 'Industrial', 'B', 400000, 'Swiss-German manufacturer. ~16B EUR revenue. Construction, mining, components.', 'CRA Ready. Include in CRA Campaign.', 72, 'Qualified'),
('CNH Industrial', 'cnhindustrial.com', 'Industrial', 'B', 380000, 'UK/Italy equipment. $22.5B revenue. Case, New Holland, IVECO.', 'CRA Ready. Include in CRA Campaign.', 70, 'Qualified'),
('Sandvik', 'sandvik.com', 'Industrial', 'B', 350000, 'Swedish engineering. $11.7B revenue. Mining, rock excavation, machining.', 'CRA Ready. Include in CRA Campaign.', 72, 'Qualified'),
('Atlas Copco', 'atlascopco.com', 'Industrial', 'B', 350000, 'Swedish industrial. $17.3B revenue. Compressors, vacuum, industrial tools.', 'CRA Adjacent. H2 2026 - Positioning Work.', 65, 'Qualified'),
('GEA Group', 'gea.com', 'Industrial', 'B', 300000, 'German food/pharma. ~5B EUR revenue. Food, pharma process equipment.', 'CRA Ready. Tier 2. FDA, FSMA, CRA overlap.', 68, 'Qualified');

-- ============================================
-- HEAVY TRUCKS / COMMERCIAL VEHICLES
-- ============================================

INSERT INTO tam_accounts (company_name, website, vertical, fit_tier, estimated_deal_value, company_summary, fit_rationale, priority_score, status) VALUES
('Daimler Truck', 'daimlertruck.com', 'Automotive', 'A', 550000, 'German truck manufacturer. $60.4B revenue. Freightliner, Mercedes-Benz Trucks.', 'UN R155. Include in Auto Pipeline. Commercial vehicles.', 85, 'Qualified'),
('Volvo Group', 'volvogroup.com', 'Automotive', 'A', 500000, 'Swedish commercial vehicles. $56.5B revenue. Trucks, buses, construction equipment.', 'UN R155. Include in Auto Pipeline.', 82, 'Qualified'),
('Traton Group', 'traton.com', 'Automotive', 'A', 450000, 'German truck manufacturer. $51.3B revenue. MAN, Scania, Navistar.', 'UN R155. Include in Auto Pipeline. VW Group company.', 80, 'Qualified'),
('Paccar', 'paccar.com', 'Automotive', 'B', 400000, 'American truck manufacturer. $33.7B revenue. Kenworth, Peterbilt, DAF.', 'UN R155. Include in Auto Pipeline.', 72, 'Qualified');

-- ============================================
-- LINK ACCOUNTS TO CAMPAIGNS
-- ============================================

-- First, get campaign IDs and create fits

-- Medical Device Campaign fits
INSERT INTO campaign_tam_accounts (campaign_id, tam_account_id, fit_score, fit_rationale)
SELECT c.campaign_id, t.tam_account_id,
    CASE
        WHEN t.fit_tier = 'A' THEN 90
        WHEN t.fit_tier = 'B' THEN 75
        ELSE 60
    END,
    'Strong vertical fit - Medical Device manufacturer with FDA/IEC compliance needs'
FROM campaigns c, tam_accounts t
WHERE c.name LIKE '%Medical%' AND t.vertical = 'Medical'
ON CONFLICT (campaign_id, tam_account_id) DO NOTHING;

-- Automotive Campaign fits
INSERT INTO campaign_tam_accounts (campaign_id, tam_account_id, fit_score, fit_rationale)
SELECT c.campaign_id, t.tam_account_id,
    CASE
        WHEN t.fit_tier = 'A' THEN 90
        WHEN t.fit_tier = 'B' THEN 75
        ELSE 60
    END,
    'Strong vertical fit - Automotive OEM/Tier 1 with UN R155 / ISO 21434 requirements'
FROM campaigns c, tam_accounts t
WHERE c.name LIKE '%Automotive%' AND t.vertical = 'Automotive'
ON CONFLICT (campaign_id, tam_account_id) DO NOTHING;

-- CRA Campaign fits (Industrial + some Medical/Auto with EU presence)
INSERT INTO campaign_tam_accounts (campaign_id, tam_account_id, fit_score, fit_rationale)
SELECT c.campaign_id, t.tam_account_id,
    CASE
        WHEN t.fit_tier = 'A' THEN 85
        WHEN t.fit_tier = 'B' THEN 70
        ELSE 55
    END,
    'CRA relevant - EU market presence, IEC 62443 / CRA compliance requirements'
FROM campaigns c, tam_accounts t
WHERE c.name LIKE '%CRA%' AND t.vertical = 'Industrial'
ON CONFLICT (campaign_id, tam_account_id) DO NOTHING;

-- Add some CRA fits for EU-based Medical and Auto companies
INSERT INTO campaign_tam_accounts (campaign_id, tam_account_id, fit_score, fit_rationale)
SELECT c.campaign_id, t.tam_account_id, 75,
    'CRA relevant - EU-headquartered company with connected products'
FROM campaigns c, tam_accounts t
WHERE c.name LIKE '%CRA%'
AND t.company_name IN ('Siemens Healthineers', 'Philips', 'B. Braun', 'Volkswagen Group', 'Mercedes-Benz Group', 'BMW Group', 'Continental AG', 'ZF Friedrichshafen', 'Stellantis')
ON CONFLICT (campaign_id, tam_account_id) DO NOTHING;

-- ============================================
-- ADD SAMPLE SIGNALS
-- ============================================

-- Recent regulatory signals
INSERT INTO account_signals (tam_account_id, signal_type, signal_date, headline, summary, source, signal_strength)
SELECT tam_account_id, 'Regulatory_Action', '2024-12-15', 'FDA Cybersecurity Guidance Update', 'FDA issued guidance update on cybersecurity documentation requirements for connected devices.', 'FDA', 'high'
FROM tam_accounts WHERE company_name = 'Medtronic';

INSERT INTO account_signals (tam_account_id, signal_type, signal_date, headline, summary, source, signal_strength)
SELECT tam_account_id, 'Leadership_Change', '2024-12-20', 'New VP Product Security Appointed', 'Appointed new VP of Product Security, previously led cybersecurity at competitor.', 'LinkedIn', 'high'
FROM tam_accounts WHERE company_name = 'Boston Scientific';

INSERT INTO account_signals (tam_account_id, signal_type, signal_date, headline, summary, source, signal_strength)
SELECT tam_account_id, 'Regulatory_Action', '2024-12-28', 'CRA Readiness Assessment Published', 'Published CRA readiness assessment - identified gaps in SBOM processes.', 'Company Blog', 'high'
FROM tam_accounts WHERE company_name = 'Continental AG';

INSERT INTO account_signals (tam_account_id, signal_type, signal_date, headline, summary, source, signal_strength)
SELECT tam_account_id, 'Product_Launch', '2024-12-10', 'Connected Surgery Platform Launch', 'Announced new connected surgery platform with 50+ connected components.', 'Press Release', 'medium'
FROM tam_accounts WHERE company_name = 'Stryker Corporation';

INSERT INTO account_signals (tam_account_id, signal_type, signal_date, headline, summary, source, signal_strength)
SELECT tam_account_id, 'Partnership', '2024-12-18', 'Software-Defined Vehicle Investment', 'Major investment in software-defined vehicle platform. Hiring 500+ engineers.', 'Press Release', 'high'
FROM tam_accounts WHERE company_name = 'Volkswagen Group';

INSERT INTO account_signals (tam_account_id, signal_type, signal_date, headline, summary, source, signal_strength)
SELECT tam_account_id, 'Security_Incident', '2024-11-30', 'PLC Vulnerabilities Disclosed', 'Security researcher disclosed PLC vulnerabilities. Company issued advisory.', 'ICS-CERT', 'high'
FROM tam_accounts WHERE company_name = 'Rockwell Automation';

INSERT INTO account_signals (tam_account_id, signal_type, signal_date, headline, summary, source, signal_strength)
SELECT tam_account_id, 'Regulatory_Action', '2024-12-22', 'MDR Cybersecurity Documentation Request', 'EU notified body requested additional cybersecurity documentation for MDR.', 'Industry Source', 'medium'
FROM tam_accounts WHERE company_name = 'Philips';

INSERT INTO account_signals (tam_account_id, signal_type, signal_date, headline, summary, source, signal_strength)
SELECT tam_account_id, 'Funding_Round', '2024-12-05', '$500M IoT Security Investment', 'Announced $500M investment in industrial IoT security capabilities.', 'Press Release', 'high'
FROM tam_accounts WHERE company_name = 'Siemens';

INSERT INTO account_signals (tam_account_id, signal_type, signal_date, headline, summary, source, signal_strength)
SELECT tam_account_id, 'Partnership', '2024-12-12', 'Vehicle SOC Partnership', 'Partnered with cybersecurity vendor for vehicle SOC capabilities.', 'Press Release', 'medium'
FROM tam_accounts WHERE company_name = 'Mercedes-Benz Group';

-- ============================================
-- ADD SAMPLE CONTACTS
-- ============================================

INSERT INTO tam_contacts (tam_account_id, full_name, title, email, linkedin_url, notes)
SELECT tam_account_id, 'Sarah Chen', 'VP Product Security', 'schen@medtronic.com', 'linkedin.com/in/sarahchen', 'Key decision maker for security tooling. Spoke at H-ISAC.'
FROM tam_accounts WHERE company_name = 'Medtronic';

INSERT INTO tam_contacts (tam_account_id, full_name, title, email, linkedin_url, notes)
SELECT tam_account_id, 'Dr. James Wilson', 'Chief Medical Officer', 'jwilson@medtronic.com', 'linkedin.com/in/jameswilson', 'Executive sponsor for connected device initiatives.'
FROM tam_accounts WHERE company_name = 'Medtronic';

INSERT INTO tam_contacts (tam_account_id, full_name, title, email, linkedin_url, notes)
SELECT tam_account_id, 'Michael Weber', 'Director Cybersecurity', 'michael.weber@continental.com', 'linkedin.com/in/mweber', 'Leading ISO 21434 implementation.'
FROM tam_accounts WHERE company_name = 'Continental AG';

INSERT INTO tam_contacts (tam_account_id, full_name, title, email, linkedin_url, notes)
SELECT tam_account_id, 'Hans Mueller', 'VP Automotive Security', 'hans.mueller@vw.com', 'linkedin.com/in/hansmueller', 'Industry thought leader. Sets strategy for VW Group security.'
FROM tam_accounts WHERE company_name = 'Volkswagen Group';

INSERT INTO tam_contacts (tam_account_id, full_name, title, email, linkedin_url, notes)
SELECT tam_account_id, 'Lisa Chang', 'Product Security Director', 'lchang@siemens.com', 'linkedin.com/in/lisachang', 'Responsible for ICS/OT security. IEC 62443 expert.'
FROM tam_accounts WHERE company_name = 'Siemens';

INSERT INTO tam_contacts (tam_account_id, full_name, title, email, linkedin_url, notes)
SELECT tam_account_id, 'Thomas Anderson', 'CISO', 'tanderson@philips.com', 'linkedin.com/in/thomasanderson', 'Enterprise CISO with product security oversight.'
FROM tam_accounts WHERE company_name = 'Philips';

-- ============================================
-- ADD SAMPLE WARM PATHS
-- ============================================

INSERT INTO tam_warm_paths (tam_account_id, connection_name, relationship_type, strength, notes)
SELECT tam_account_id, 'John Auld', 'Former colleague', 'strong', 'Worked with their VP Engineering at previous company.'
FROM tam_accounts WHERE company_name = 'Continental AG';

INSERT INTO tam_warm_paths (tam_account_id, connection_name, relationship_type, strength, notes)
SELECT tam_account_id, 'Roy Fridman', 'Conference contact', 'medium', 'Met at H-ISAC conference. Discussed product security challenges.'
FROM tam_accounts WHERE company_name = 'Medtronic';

INSERT INTO tam_warm_paths (tam_account_id, connection_name, relationship_type, strength, notes)
SELECT tam_account_id, 'John Auld', 'Former customer', 'strong', 'Worked together at previous company. Trusted relationship.'
FROM tam_accounts WHERE company_name = 'Siemens';

INSERT INTO tam_warm_paths (tam_account_id, connection_name, relationship_type, strength, notes)
SELECT tam_account_id, 'Paul Priepke', 'Industry contact', 'medium', 'Connected through automotive security working group.'
FROM tam_accounts WHERE company_name = 'Volkswagen Group';

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'TAM Accounts by Vertical:' as info;
SELECT vertical, COUNT(*) as count FROM tam_accounts GROUP BY vertical ORDER BY count DESC;

SELECT 'TAM Accounts by Tier:' as info;
SELECT fit_tier, COUNT(*) as count FROM tam_accounts GROUP BY fit_tier ORDER BY fit_tier;

SELECT 'Campaign Fits:' as info;
SELECT COUNT(*) as total_fits FROM campaign_tam_accounts;
