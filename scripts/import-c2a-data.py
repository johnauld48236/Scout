#!/usr/bin/env python3
"""
C2A Data Import Script
Imports TAM accounts, Goals, and Pipeline from Excel files into Supabase

Usage:
  python3 scripts/import-c2a-data.py [--tam] [--goals] [--pipeline] [--dry-run]

Options:
  --tam       Import TAM accounts from TAM Master Excel
  --goals     Import goals from Company Goals Excel
  --pipeline  Import pipeline deals from Pipeline Excel
  --dry-run   Preview data without inserting
"""

import os
import sys
import argparse
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment from .env.local (which should be .env.c2a)
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

# File paths
TAM_FILE = 'c2a data/C2A_2026_TAM_Master.xlsx'
GOALS_FILE = 'c2a data/2026 Company goals.xlsx'
PIPELINE_FILE = 'c2a data/C2A Security Pipeline Projections 2026 01012026 Final.xlsx'

# Vertical mapping from sheet names
VERTICAL_MAP = {
    'Medical Device TAM': 'Medical Device',
    'CRA TAM': 'CRA/Regulatory',
    'Automotive TAM': 'Automotive',
    'Industrial Full': 'Industrial'
}

# Header row for each sheet (0-indexed)
HEADER_ROW = {
    'Medical Device TAM': 3,
    'CRA TAM': 3,
    'Automotive TAM': 3,
    'Industrial Full': 2
}

def get_supabase() -> Client:
    """Create Supabase client"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Missing Supabase credentials. Make sure .env.local is configured.")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def clean_revenue(value):
    """Convert revenue values to decimal"""
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        # Assume values are in billions, convert to actual value
        return float(value) * 1_000_000_000
    return None

def clean_employees(value):
    """Convert employee count to string"""
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        return str(int(value))
    return str(value)

def map_priority_to_tier(priority):
    """Map 2026 Priority to fit tier"""
    if pd.isna(priority):
        return None
    priority_str = str(priority).lower().strip()
    if priority_str in ['high', 'a', '1', 'tier 1', 'priority']:
        return 'A'
    elif priority_str in ['medium', 'b', '2', 'tier 2']:
        return 'B'
    elif priority_str in ['low', 'c', '3', 'tier 3']:
        return 'C'
    return None

def import_tam_accounts(supabase: Client, dry_run: bool = False):
    """Import TAM accounts from all 4 vertical sheets"""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Importing TAM accounts from {TAM_FILE}")

    xl = pd.ExcelFile(TAM_FILE)
    total_imported = 0

    for sheet_name in ['Medical Device TAM', 'CRA TAM', 'Automotive TAM', 'Industrial Full']:
        print(f"\n  Processing: {sheet_name}")
        header_row = HEADER_ROW.get(sheet_name, 0)
        df = pd.read_excel(xl, sheet_name=sheet_name, header=header_row)
        vertical = VERTICAL_MAP[sheet_name]

        # Normalize column names
        df.columns = [str(c).strip() for c in df.columns]

        # Map columns based on sheet type
        records = []
        for idx, row in df.iterrows():
            # Get company name (varies by sheet)
            company_name = None
            for col in ['Company Name', 'Company', 'Company name']:
                if col in df.columns and pd.notna(row.get(col)):
                    company_name = str(row[col]).strip()
                    break

            if not company_name:
                continue

            # Get other fields
            country = None
            for col in ['Country', 'Region']:
                if col in df.columns and pd.notna(row.get(col)):
                    country = str(row[col]).strip()
                    break

            # Revenue
            revenue = None
            for col in ['Revenue ($Bn)', 'Revenue', 'Revenue Est']:
                if col in df.columns:
                    revenue = clean_revenue(row.get(col))
                    break

            # Employees
            employees = None
            for col in ['Employees', 'Number of employees']:
                if col in df.columns:
                    employees = clean_employees(row.get(col))
                    break

            # Priority/Fit
            priority = None
            fit_tier = None
            for col in ['2026 Priority', '2026 Action', 'C2A Fit']:
                if col in df.columns and pd.notna(row.get(col)):
                    priority = str(row[col]).strip()
                    fit_tier = map_priority_to_tier(row.get(col))
                    break

            # Additional notes
            notes = []
            if 'Status Notes' in df.columns and pd.notna(row.get('Status Notes')):
                notes.append(str(row['Status Notes']))
            if 'C2A Relationship' in df.columns and pd.notna(row.get('C2A Relationship')):
                notes.append(f"Relationship: {row['C2A Relationship']}")
            if 'Regulatory Pressures' in df.columns and pd.notna(row.get('Regulatory Pressures')):
                notes.append(f"Regulatory: {row['Regulatory Pressures']}")
            if 'Key Segment' in df.columns and pd.notna(row.get('Key Segment')):
                notes.append(f"Segment: {row['Key Segment']}")

            record = {
                'company_name': company_name,
                'vertical': vertical,
                'headquarters': country,
                'employee_count': employees,
                'fit_tier': fit_tier,
                'fit_rationale': priority,
                'company_summary': '; '.join(notes) if notes else None,
                'status': 'New',
                'estimated_deal_value': revenue
            }
            records.append(record)

        print(f"    Found {len(records)} companies")

        if not dry_run and records:
            # Insert in batches
            batch_size = 50
            for i in range(0, len(records), batch_size):
                batch = records[i:i+batch_size]
                result = supabase.table('tam_accounts').insert(batch).execute()
                print(f"    Inserted batch {i//batch_size + 1}: {len(batch)} records")
            total_imported += len(records)
        elif dry_run:
            print(f"    Sample record: {records[0] if records else 'None'}")

    print(f"\n  Total TAM accounts {'would be ' if dry_run else ''}imported: {total_imported}")
    return total_imported

def import_goals(supabase: Client, dry_run: bool = False):
    """Import goals from Company Goals and Sales BD KPIs sheets"""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Importing Goals from {GOALS_FILE}")

    xl = pd.ExcelFile(GOALS_FILE)
    total_imported = 0

    # 1. Company Goals (top-level goals)
    print("\n  Processing: Company Goals")
    df = pd.read_excel(xl, sheet_name='Company Goals')

    company_goal_ids = []
    for idx, row in df.iterrows():
        goal_text = row.iloc[0]  # First column contains the goal
        if pd.isna(goal_text):
            continue

        # Parse goal to extract target value if possible
        target_value = 10_000_000  # Default $10M
        if '$10M' in str(goal_text) or '$10m' in str(goal_text).lower():
            target_value = 10_000_000
        elif '$500K' in str(goal_text) or '$500k' in str(goal_text).lower():
            target_value = 500_000

        # Determine goal type
        goal_type = 'revenue'
        if 'partnership' in str(goal_text).lower() or 'agreement' in str(goal_text).lower():
            goal_type = 'strategic'
        elif 'non-automotive' in str(goal_text).lower():
            goal_type = 'new_business'

        record = {
            'name': str(goal_text)[:255],  # Truncate to fit
            'goal_type': goal_type,
            'category': 'company',
            'target_value': target_value,
            'target_year': 2026,
            'current_value': 0,
            'is_active': True
        }

        if not dry_run:
            result = supabase.table('goals').insert(record).execute()
            if result.data:
                company_goal_ids.append(result.data[0]['goal_id'])
                print(f"    Inserted company goal: {record['name'][:50]}...")
            total_imported += 1
        else:
            print(f"    Would insert: {record['name'][:50]}...")

    # 2. Sales/BD KPIs (child goals linked to company goals)
    print("\n  Processing: Sales BD KPIs")
    df = pd.read_excel(xl, sheet_name='Sales BD KPIs')

    for idx, row in df.iterrows():
        kpi_name = row.get('KPIs')
        if pd.isna(kpi_name):
            continue

        description = row.get('Description', '')

        # Parse target value from KPI name or description
        target_value = 0
        kpi_str = str(kpi_name) + ' ' + str(description)
        if '$2.5M' in kpi_str or '$2.5m' in kpi_str.lower():
            target_value = 2_500_000
        elif '$500K' in kpi_str or '$500k' in kpi_str.lower():
            target_value = 500_000
        elif '10 New' in kpi_str:
            target_value = 10  # 10 new logos
        elif '$1M' in kpi_str or '$1m' in kpi_str.lower():
            target_value = 1_000_000

        # Determine goal type
        goal_type = 'revenue'
        if 'logo' in str(kpi_name).lower():
            goal_type = 'new_logos'
        elif 'Non-Automotive' in str(kpi_name):
            goal_type = 'new_business'
        elif 'Pipeline' in str(kpi_name):
            goal_type = 'pipeline'

        # Extract vertical if mentioned
        vertical = None
        if 'medical' in kpi_str.lower():
            vertical = 'Medical Device'
        elif 'automotive' in kpi_str.lower():
            vertical = 'Automotive'
        elif 'CRA' in kpi_str:
            vertical = 'CRA/Regulatory'

        # Extract region if mentioned
        region = None
        if 'NA ' in kpi_str or 'North America' in kpi_str:
            region = 'North America'
        elif 'EU ' in kpi_str or 'Europe' in kpi_str:
            region = 'Europe'
        elif 'AP ' in kpi_str or 'Asia' in kpi_str:
            region = 'Asia Pacific'

        record = {
            'name': str(kpi_name)[:255],
            'goal_type': goal_type,
            'category': 'sales',
            'vertical': vertical,
            'region': region,
            'target_value': target_value,
            'target_year': 2026,
            'current_value': 0,
            'is_active': True
        }

        # Link to first company goal if exists
        if company_goal_ids:
            record['parent_goal_id'] = company_goal_ids[0]

        if not dry_run:
            result = supabase.table('goals').insert(record).execute()
            print(f"    Inserted sales goal: {record['name'][:50]}...")
            total_imported += 1
        else:
            print(f"    Would insert: {record['name'][:50]}...")

    print(f"\n  Total goals {'would be ' if dry_run else ''}imported: {total_imported}")
    return total_imported

def map_deal_stage(stage):
    """Map Excel deal stage to pursuit stage"""
    if pd.isna(stage):
        return 'Discovery'
    stage_str = str(stage).lower().strip()
    stage_map = {
        # C2A specific stages
        'win': 'Closed Won',
        'purchasing engaged': 'Proposal',
        'interested': 'Qualification',
        'no indication (high)': 'Discovery',
        'no indication (low)': 'Discovery',
        # Standard stages
        'won': 'Closed Won',
        'closed won': 'Closed Won',
        'lost': 'Closed Lost',
        'closed lost': 'Closed Lost',
        'negotiate': 'Negotiation',
        'negotiation': 'Negotiation',
        'proposal': 'Proposal',
        'demo': 'Demo',
        'qualification': 'Qualification',
        'discovery': 'Discovery',
        'prospect': 'Discovery',
        'lead': 'Discovery',
    }
    return stage_map.get(stage_str, 'Discovery')

def map_stage_to_probability(stage):
    """Map stage to probability percentage"""
    prob_map = {
        'Discovery': 10,
        'Qualification': 20,
        'Demo': 40,
        'Proposal': 60,
        'Negotiation': 80,
        'Closed Won': 100,
        'Closed Lost': 0,
    }
    return prob_map.get(stage, 10)

def parse_quarter_to_date(quarter_str):
    """Convert quarter string (e.g., 'Q1 2026', 'Q2', '2026 Q3') to last day of that quarter"""
    if pd.isna(quarter_str):
        return None

    q_str = str(quarter_str).strip().upper()

    # Extract quarter number
    quarter = None
    year = datetime.now().year  # Default to current year

    # Try to find Q1-Q4
    import re
    q_match = re.search(r'Q([1-4])', q_str)
    if q_match:
        quarter = int(q_match.group(1))

    # Try to find year
    year_match = re.search(r'20\d{2}', q_str)
    if year_match:
        year = int(year_match.group())

    if quarter is None:
        return None

    # Map quarter to last day of that quarter
    quarter_end = {
        1: f"{year}-03-31",
        2: f"{year}-06-30",
        3: f"{year}-09-30",
        4: f"{year}-12-31",
    }

    return quarter_end.get(quarter)

def map_deal_type_to_pursuit_type(deal_type, stage):
    """Map deal type and stage to pursuit_type category"""
    if pd.isna(deal_type):
        deal_type = ''
    deal_type_lower = str(deal_type).lower().strip()

    # Check for renewal/recurring indicators
    if any(word in deal_type_lower for word in ['renewal', 'renew', 'recurring', 'maintenance', 'support', 'subscription']):
        return 'renewal'

    # Check for expansion
    if any(word in deal_type_lower for word in ['expansion', 'upsell', 'cross-sell', 'add-on', 'upgrade']):
        return 'expansion'

    # Check stage for closed won (existing business)
    if stage == 'Closed Won':
        return 'recurring'

    # Default to new business
    return 'new_business'

def extract_company_from_deal(deal_name):
    """Extract company name from deal name (e.g., 'Elekta: BOM & Vuln...' -> 'Elekta')"""
    if pd.isna(deal_name):
        return None
    # Try splitting by colon first
    if ':' in str(deal_name):
        return str(deal_name).split(':')[0].strip()
    # Try splitting by dash
    if ' - ' in str(deal_name):
        return str(deal_name).split(' - ')[0].strip()
    return str(deal_name).strip()

def import_pipeline(supabase: Client, dry_run: bool = False):
    """Import pipeline deals from Pipeline Excel"""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Importing Pipeline from {PIPELINE_FILE}")

    xl = pd.ExcelFile(PIPELINE_FILE)
    df = pd.read_excel(xl, sheet_name='Pipeline')

    # Filter to non-empty deals
    df = df[df['Deal Name'].notna()]
    print(f"  Found {len(df)} deals")

    # Cache for account plans (company_name -> account_plan_id)
    account_cache = {}

    # First, get existing account plans
    if not dry_run:
        existing = supabase.table('account_plans').select('account_plan_id, account_name').execute()
        for ap in existing.data:
            account_cache[ap['account_name'].lower()] = ap['account_plan_id']
        print(f"  Found {len(account_cache)} existing account plans")

    total_accounts = 0
    total_pursuits = 0

    for idx, row in df.iterrows():
        deal_name = row.get('Deal Name')
        company_name = extract_company_from_deal(deal_name)

        if not company_name:
            continue

        # Get or create account plan
        account_plan_id = account_cache.get(company_name.lower())

        if not account_plan_id and not dry_run:
            # Create new account plan
            vertical = row.get('Vertical', '')
            if pd.isna(vertical):
                vertical = None

            account_record = {
                'account_name': company_name,
                'account_type': 'Prospect',
                'vertical': vertical,
            }
            result = supabase.table('account_plans').insert(account_record).execute()
            if result.data:
                account_plan_id = result.data[0]['account_plan_id']
                account_cache[company_name.lower()] = account_plan_id
                total_accounts += 1
                print(f"    Created account plan: {company_name}")

        # Create pursuit
        stage = map_deal_stage(row.get('Deal Stage'))
        probability = map_stage_to_probability(stage)

        # Get amounts
        total_amount = row.get('Total Amount', 0)
        if pd.isna(total_amount):
            total_amount = 0

        # Get deal metadata
        deal_owner = row.get('Deal Owner')
        if pd.isna(deal_owner):
            deal_owner = None
        else:
            deal_owner = str(deal_owner).strip()

        deal_type = row.get('Deal Type')
        if pd.isna(deal_type):
            deal_type = None
        else:
            deal_type = str(deal_type).strip()

        quarter_str = row.get('Quarter to Close')
        target_close_date = parse_quarter_to_date(quarter_str)
        target_quarter = str(quarter_str).strip() if not pd.isna(quarter_str) else None

        # Determine pursuit type from deal type and stage
        pursuit_type = map_deal_type_to_pursuit_type(deal_type, stage)

        pursuit_record = {
            'account_plan_id': account_plan_id,
            'name': str(deal_name)[:255],
            'stage': stage,
            'probability': probability,
            'estimated_value': float(total_amount) if total_amount else None,
            'deal_owner': deal_owner,
            'deal_type': deal_type,
            'target_quarter': target_quarter,
            'target_close_date': target_close_date,
            'pursuit_type': pursuit_type,
        }

        if not dry_run:
            result = supabase.table('pursuits').insert(pursuit_record).execute()
            total_pursuits += 1
        else:
            if idx < 5:  # Show first 5 samples
                print(f"    Would create: {company_name} -> {deal_name[:50]}...")

    print(f"\n  Account plans created: {total_accounts}")
    print(f"  Pursuits {'would be ' if dry_run else ''}imported: {total_pursuits if not dry_run else len(df)}")
    return total_pursuits

def main():
    parser = argparse.ArgumentParser(description='Import C2A data from Excel files')
    parser.add_argument('--tam', action='store_true', help='Import TAM accounts')
    parser.add_argument('--goals', action='store_true', help='Import goals')
    parser.add_argument('--pipeline', action='store_true', help='Import pipeline deals')
    parser.add_argument('--dry-run', action='store_true', help='Preview without inserting')
    parser.add_argument('--all', action='store_true', help='Import all data')

    args = parser.parse_args()

    # Default to all if nothing specified
    if not args.tam and not args.goals and not args.pipeline and not args.all:
        args.all = True

    print("=" * 60)
    print("C2A Data Import")
    print("=" * 60)
    print(f"Supabase URL: {SUPABASE_URL}")
    print(f"Dry Run: {args.dry_run}")

    try:
        supabase = get_supabase()
        print("Connected to Supabase")
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        sys.exit(1)

    if args.tam or args.all:
        import_tam_accounts(supabase, args.dry_run)

    if args.goals or args.all:
        import_goals(supabase, args.dry_run)

    if args.pipeline or args.all:
        import_pipeline(supabase, args.dry_run)

    print("\n" + "=" * 60)
    print("Import complete!")
    print("=" * 60)

if __name__ == '__main__':
    main()
