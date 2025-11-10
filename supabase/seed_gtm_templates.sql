-- GTM Template Seeds (DEPRECATED - Use programmatic seeding instead)
-- 
-- NOTE: This file is kept for reference only. Templates are now seeded programmatically
-- via DatabaseService.seedGTMTemplates() which is called from the UI when a user
-- clicks "Create GTM Templates" button in an empty workspace.
--
-- If you need to manually seed templates for a specific workspace, you can:
-- 1. Use the "Create GTM Templates" button in the GTM Docs tab (recommended)
-- 2. Or call DatabaseService.seedGTMTemplates(workspaceId, userId) in code
-- 3. Or adapt the template data below by replacing YOUR_WORKSPACE_ID and YOUR_USER_ID
--    with actual UUIDs from your database
--
-- Manual seeding instructions (if needed):
-- 1. Get workspace UUID: SELECT id FROM workspaces WHERE owner_id = 'your-user-id';
-- 2. Get user UUID: SELECT id FROM profiles WHERE email = 'your-email@example.com';
-- 3. Replace placeholders below with actual UUIDs
-- 4. Run this SQL in Supabase Dashboard SQL Editor

-- 1. GTM Launch Brief Template
INSERT INTO gtm_docs (
    workspace_id,
    owner_id,
    title,
    doc_type,
    content_json,
    content_plain,
    visibility,
    is_template,
    template_category,
    tags
) VALUES (
    'YOUR_WORKSPACE_ID',
    'YOUR_USER_ID',
    'GTM Launch Brief Template',
    'brief',
    '{
        "type": "doc",
        "content": [
            {
                "type": "heading",
                "attrs": { "level": 1 },
                "content": [{ "type": "text", "text": "GTM Launch Brief" }]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Executive Summary" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "[Brief overview of the product/feature launch and key objectives]" }]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Product Positioning" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Value Proposition:" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "[What unique value does this provide?]" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Positioning Statement:" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "[For WHO, our product does WHAT, unlike COMPETITORS]" }]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Target Audience" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Primary: [Define primary audience]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Secondary: [Define secondary audience]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Pain points: [Key challenges we solve]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Key Messaging" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Core Message:" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "[One-sentence core message]" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Supporting Messages:" }]
            },
            {
                "type": "orderedList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Message pillar 1]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Message pillar 2]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Message pillar 3]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Channel Strategy" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Content marketing: [Blog, guides, etc.]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Email campaigns: [Sequences, newsletters]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Social media: [Platforms and approach]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Sales enablement: [Materials and training]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Success Metrics" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Awareness: [Impressions, reach, etc.]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Engagement: [Click-through, time on site, etc.]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Conversion: [Signups, demos, trials]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Revenue: [Pipeline, closed deals, ARR]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Timeline & Milestones" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "[Add key dates and milestones]" }]
            }
        ]
    }',
    E'GTM Launch Brief\n\nExecutive Summary\n[Brief overview of the product/feature launch and key objectives]\n\nProduct Positioning\nValue Proposition:\n[What unique value does this provide?]\n\nPositioning Statement:\n[For WHO, our product does WHAT, unlike COMPETITORS]\n\nTarget Audience\n• Primary: [Define primary audience]\n• Secondary: [Define secondary audience]\n• Pain points: [Key challenges we solve]\n\nKey Messaging\nCore Message:\n[One-sentence core message]\n\nSupporting Messages:\n1. [Message pillar 1]\n2. [Message pillar 2]\n3. [Message pillar 3]\n\nChannel Strategy\n• Content marketing: [Blog, guides, etc.]\n• Email campaigns: [Sequences, newsletters]\n• Social media: [Platforms and approach]\n• Sales enablement: [Materials and training]\n\nSuccess Metrics\n• Awareness: [Impressions, reach, etc.]\n• Engagement: [Click-through, time on site, etc.]\n• Conversion: [Signups, demos, trials]\n• Revenue: [Pipeline, closed deals, ARR]\n\nTimeline & Milestones\n[Add key dates and milestones]',
    'team',
    true,
    'launch',
    ARRAY['template', 'gtm', 'launch', 'brief']
);

-- 2. ICP Sheet Template
INSERT INTO gtm_docs (
    workspace_id,
    owner_id,
    title,
    doc_type,
    content_json,
    content_plain,
    visibility,
    is_template,
    template_category,
    tags
) VALUES (
    'YOUR_WORKSPACE_ID',
    'YOUR_USER_ID',
    'Ideal Customer Profile (ICP) Template',
    'icp_sheet',
    '{
        "type": "doc",
        "content": [
            {
                "type": "heading",
                "attrs": { "level": 1 },
                "content": [{ "type": "text", "text": "Ideal Customer Profile (ICP)" }]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Company Profile" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Industry: " }, { "type": "text", "text": "[Target industries]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Company Size: " }, { "type": "text", "text": "[Employee count range]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Revenue: " }, { "type": "text", "text": "[ARR range]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Geography: " }, { "type": "text", "text": "[Target regions]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Tech Stack: " }, { "type": "text", "text": "[Technologies they use]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Pain Points & Challenges" }]
            },
            {
                "type": "orderedList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Key pain point 1]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Key pain point 2]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Key pain point 3]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Decision Makers" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Economic Buyer: " }, { "type": "text", "text": "[Title, role]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Technical Buyer: " }, { "type": "text", "text": "[Title, role]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Champion: " }, { "type": "text", "text": "[Title, role]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Buying Process" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Typical Timeline: " }, { "type": "text", "text": "[Sales cycle length]" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Budget Process: " }, { "type": "text", "text": "[How they allocate budget]" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Evaluation Criteria:" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Criterion 1]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Criterion 2]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Criterion 3]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Qualifying Questions" }]
            },
            {
                "type": "orderedList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Question to validate fit]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Question to identify pain]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Question to assess timeline]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Red Flags (Disqualifiers)" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Deal breaker 1]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Deal breaker 2]" }] }] }
                ]
            }
        ]
    }',
    E'Ideal Customer Profile (ICP)\n\nCompany Profile\n• Industry: [Target industries]\n• Company Size: [Employee count range]\n• Revenue: [ARR range]\n• Geography: [Target regions]\n• Tech Stack: [Technologies they use]\n\nPain Points & Challenges\n1. [Key pain point 1]\n2. [Key pain point 2]\n3. [Key pain point 3]\n\nDecision Makers\n• Economic Buyer: [Title, role]\n• Technical Buyer: [Title, role]\n• Champion: [Title, role]\n\nBuying Process\nTypical Timeline: [Sales cycle length]\nBudget Process: [How they allocate budget]\nEvaluation Criteria:\n• [Criterion 1]\n• [Criterion 2]\n• [Criterion 3]\n\nQualifying Questions\n1. [Question to validate fit]\n2. [Question to identify pain]\n3. [Question to assess timeline]\n\nRed Flags (Disqualifiers)\n• [Deal breaker 1]\n• [Deal breaker 2]',
    'team',
    true,
    'targeting',
    ARRAY['template', 'icp', 'targeting', 'qualification']
);

-- 3. Campaign Plan Template
INSERT INTO gtm_docs (
    workspace_id,
    owner_id,
    title,
    doc_type,
    content_json,
    content_plain,
    visibility,
    is_template,
    template_category,
    tags
) VALUES (
    'YOUR_WORKSPACE_ID',
    'YOUR_USER_ID',
    'Campaign Plan Template',
    'campaign',
    '{
        "type": "doc",
        "content": [
            {
                "type": "heading",
                "attrs": { "level": 1 },
                "content": [{ "type": "text", "text": "Campaign Plan: [Campaign Name]" }]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Campaign Overview" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Campaign Goal: " }, { "type": "text", "text": "[What are we trying to achieve?]" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Target Audience: " }, { "type": "text", "text": "[Who are we targeting?]" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Duration: " }, { "type": "text", "text": "[Start date - End date]" }]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Key Objectives & KPIs" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Objective 1: [Specific, measurable goal]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Objective 2: [Specific, measurable goal]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Objective 3: [Specific, measurable goal]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Campaign Tactics" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Content:" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Blog posts, guides, videos]" }] }] }
                ]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Email:" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Email sequences, newsletters]" }] }] }
                ]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Social Media:" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Platform-specific tactics]" }] }] }
                ]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Paid Media:" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "[Ad platforms, budget allocation]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Budget" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "marks": [{ "type": "bold" }], "text": "Total Budget: " }, { "type": "text", "text": "$[Amount]" }]
            },
            {
                "type": "bulletList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Content: $[Amount]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Paid media: $[Amount]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Tools/software: $[Amount]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Timeline & Milestones" }]
            },
            {
                "type": "orderedList",
                "content": [
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Week 1: [Milestone]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Week 2: [Milestone]" }] }] },
                    { "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Week 3: [Milestone]" }] }] }
                ]
            },
            {
                "type": "heading",
                "attrs": { "level": 2 },
                "content": [{ "type": "text", "text": "Measurement & Reporting" }]
            },
            {
                "type": "paragraph",
                "content": [{ "type": "text", "text": "[How we will track success and report results]" }]
            }
        ]
    }',
    E'Campaign Plan: [Campaign Name]\n\nCampaign Overview\nCampaign Goal: [What are we trying to achieve?]\nTarget Audience: [Who are we targeting?]\nDuration: [Start date - End date]\n\nKey Objectives & KPIs\n• Objective 1: [Specific, measurable goal]\n• Objective 2: [Specific, measurable goal]\n• Objective 3: [Specific, measurable goal]\n\nCampaign Tactics\nContent:\n• [Blog posts, guides, videos]\n\nEmail:\n• [Email sequences, newsletters]\n\nSocial Media:\n• [Platform-specific tactics]\n\nPaid Media:\n• [Ad platforms, budget allocation]\n\nBudget\nTotal Budget: $[Amount]\n• Content: $[Amount]\n• Paid media: $[Amount]\n• Tools/software: $[Amount]\n\nTimeline & Milestones\n1. Week 1: [Milestone]\n2. Week 2: [Milestone]\n3. Week 3: [Milestone]\n\nMeasurement & Reporting\n[How we will track success and report results]',
    'team',
    true,
    'campaign',
    ARRAY['template', 'campaign', 'marketing', 'planning']
);

-- Continue with remaining templates...
-- (Truncated for brevity - would include Battlecard, Persona, Outbound Template, Competitive Snapshot)

-- Instructions for use:
-- 1. Replace YOUR_WORKSPACE_ID with actual workspace UUID
-- 2. Replace YOUR_USER_ID with actual user UUID (workspace owner recommended)
-- 3. Run this SQL in Supabase dashboard or via migration
-- 4. Templates will appear in workspace with 📋 Template badge
-- 5. Users can clone these to create their own docs
