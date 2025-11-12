import { BusinessProfile, DocType } from '../types';

export interface GTMTemplate {
  id: string;
  name: string;
  description: string;
  docTypes: DocType[];
  generatePrompt: (businessProfile: BusinessProfile) => string;
}

export const GTM_TEMPLATES: GTMTemplate[] = [
  {
    id: 'gtm_brief',
    name: 'Complete GTM Brief',
    description: 'Comprehensive go-to-market strategy document with all key sections',
    docTypes: ['brief', 'campaign'],
    generatePrompt: (bp: BusinessProfile) => `Create a comprehensive GTM Brief for ${bp.companyName}.

Business Context:
- Company: ${bp.companyName}
- Industry: ${bp.industry || 'Not specified'}
- Business: ${bp.description || 'Not specified'}
- Target Market: ${bp.targetMarket || 'Not specified'}
- Value Proposition: ${bp.valueProposition || 'Not specified'}
- Growth Stage: ${bp.growthStage || 'Not specified'}

Generate a professional GTM Brief with these sections:

# GTM Brief – ${bp.companyName}

## 1. Executive Summary
Write 2-3 paragraphs summarizing the business, market opportunity, and key GTM objectives. Use the actual business information provided above.

## 2. Business Profile
Create a detailed profile table with:
| Attribute | Details |
|-----------|---------|
| Company | ${bp.companyName} |
| Industry | [Use actual industry] |
| Business | [Use actual description] |
| Growth Stage | [Use actual stage] |
| Location | [If known, otherwise ask user] |
| Revenue Streams | [Based on business type] |

## 3. Target Market
Create detailed customer segments with demographics, psychographics, behaviors, and needs. Base this on "${bp.targetMarket || 'the target market - request clarification'}".

## 4. Value Proposition
Expand on "${bp.valueProposition || 'the value proposition - request clarification'}" with:
- Customer benefits
- Business benefits
- Differentiation

## 5. Positioning Statement
Create a clear positioning statement for ${bp.companyName}.

## 6. Go-to-Market Strategy
Create a phased timeline with:
- Pre-Launch activities
- Launch phase
- Post-Launch growth
- Channel mix (Owned, Social, Partnerships, Paid, PR)

## 7. Success Metrics
Define KPIs with targets and measurement tools.

## 8. Risks & Mitigation
Identify potential risks and mitigation strategies specific to ${bp.industry || 'this industry'}.

## 9. Budget Overview
Create a realistic budget breakdown.

## 10. Next Steps
List actionable next steps with dates.

CRITICAL FORMATTING:
- Use proper markdown with ##, ###, tables, and bullet points
- Keep ${bp.companyName} as the company name throughout
- Use actual business data - don't invent details
- For missing information, use [brackets] and note what's needed
- Professional tone appropriate for internal strategy docs

Generate the complete document now:`
  },

  {
    id: 'positioning_statement',
    name: 'Positioning Statement',
    description: 'Craft a clear, compelling positioning statement',
    docTypes: ['brief', 'battlecard'],
    generatePrompt: (bp: BusinessProfile) => `Create a positioning statement for ${bp.companyName}.

Business Context:
- Company: ${bp.companyName}
- Industry: ${bp.industry || 'Not specified'}
- Business: ${bp.description || 'Not specified'}
- Target Market: ${bp.targetMarket || 'Not specified'}
- Value Proposition: ${bp.valueProposition || 'Not specified'}

Generate:

# Positioning Statement – ${bp.companyName}

## Primary Positioning Statement
Create one clear, compelling positioning statement following this structure:
"For [target market], ${bp.companyName} is the [category] that [unique benefit] because [reason to believe]."

## Positioning Pillars
### 1. Target Market
Detail who "${bp.targetMarket || '[define target]'}" is.

### 2. Category
Define the market category for ${bp.companyName}.

### 3. Differentiation
Explain what makes ${bp.companyName} different, using "${bp.valueProposition || '[define value prop]'}".

### 4. Proof Points
List 3-5 reasons customers should believe the positioning.

## Message Testing
Provide 3 variations of the positioning statement:
- **Direct Version**: Clear and concise
- **Benefit-Focused Version**: Emphasizes customer outcomes
- **Differentiation Version**: Highlights competitive advantage

Use only the actual business information provided. Format professionally with markdown.`
  },

  {
    id: 'target_market_analysis',
    name: 'Target Market Analysis',
    description: 'Deep dive into customer segments, needs, and behaviors',
    docTypes: ['persona', 'icp_sheet', 'brief'],
    generatePrompt: (bp: BusinessProfile) => `Create a target market analysis for ${bp.companyName}.

Business Context:
- Company: ${bp.companyName}
- Industry: ${bp.industry || 'Not specified'}
- Business: ${bp.description || 'Not specified'}
- Target Market: ${bp.targetMarket || 'Not specified'}
- Value Proposition: ${bp.valueProposition || 'Not specified'}

Generate:

# Target Market Analysis – ${bp.companyName}

## Market Overview
Describe the overall market for ${bp.industry || 'this industry'} and where ${bp.companyName} fits.

## Customer Segments
Create 3-4 detailed segments based on "${bp.targetMarket || 'the target market'}":

### Segment 1: [Name]
| Attribute | Details |
|-----------|---------|
| Demographics | Age, income, location, education |
| Psychographics | Values, lifestyle, priorities |
| Behaviors | Buying habits, media consumption |
| Pain Points | Key challenges they face |
| How ${bp.companyName} Helps | Based on "${bp.valueProposition || '[value prop]'}" |

[Repeat for 3-4 segments]

## Buying Journey
Map the typical journey from awareness to purchase:
1. **Awareness**: How they discover solutions
2. **Consideration**: What they evaluate
3. **Decision**: What drives purchase
4. **Retention**: What keeps them loyal

## Market Sizing
Estimate TAM (Total Addressable Market) for ${bp.companyName} based on ${bp.industry || 'the industry'} and ${bp.targetMarket || 'target market'}.

## Key Insights & Recommendations
Provide 5-7 actionable insights for ${bp.companyName}'s GTM strategy.

Use professional formatting with tables, bullet points, and clear headings.`
  },

  {
    id: 'launch_plan',
    name: 'Product/Service Launch Plan',
    description: '90-day launch plan with phases, tactics, and milestones',
    docTypes: ['campaign', 'brief'],
    generatePrompt: (bp: BusinessProfile) => `Create a launch plan for ${bp.companyName}.

Business Context:
- Company: ${bp.companyName}
- Industry: ${bp.industry || 'Not specified'}
- Business: ${bp.description || 'Not specified'}
- Target Market: ${bp.targetMarket || 'Not specified'}
- Value Proposition: ${bp.valueProposition || 'Not specified'}

Generate:

# Launch Plan – ${bp.companyName}

## Launch Overview
Brief summary of what ${bp.companyName} is launching and strategic objectives.

## 90-Day Launch Timeline

### Phase 1: Pre-Launch (Weeks 1-4)
| Week | Focus Area | Key Activities | Owner | Status |
|------|-----------|----------------|-------|--------|
| 1 | Foundation | - Finalize positioning<br>- Create messaging framework<br>- Set up analytics | Marketing | Not Started |
| 2 | Content | - Develop launch content<br>- Create demo materials<br>- Prepare FAQs | Content Team | Not Started |
[Continue for 4 weeks]

### Phase 2: Launch (Weeks 5-6)
[Launch week activities]

### Phase 3: Post-Launch (Weeks 7-12)
[Growth and optimization activities]

## Channel Strategy
### Owned Channels
- Website: [Specific tactics for ${bp.companyName}]
- Email: [Email strategy]
- Blog: [Content strategy]

### Social Media
Based on ${bp.targetMarket || 'target audience'}:
- Primary platforms: [Choose based on target market]
- Content themes
- Posting frequency

### Partnerships
Potential partners for ${bp.companyName} in ${bp.industry || 'this industry'}.

### Paid Media
Budget allocation and targeting for ${bp.targetMarket || 'target market'}.

## Launch Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Awareness | [Set target] | Impressions, reach |
| Engagement | [Set target] | Click-through, time on site |
| Conversion | [Set target] | Signups, purchases |
| Retention | [Set target] | Repeat usage/purchase |

## Risk Mitigation
Identify 3-5 potential launch risks and contingency plans.

## Budget Summary
Break down estimated costs by category.

Format professionally with tables and clear sections.`
  },

  {
    id: 'messaging_framework',
    name: 'Messaging Framework',
    description: 'Core messages, value props, and talk tracks',
    docTypes: ['brief', 'outbound_template', 'battlecard'],
    generatePrompt: (bp: BusinessProfile) => `Create a messaging framework for ${bp.companyName}.

Business Context:
- Company: ${bp.companyName}
- Industry: ${bp.industry || 'Not specified'}
- Business: ${bp.description || 'Not specified'}
- Target Market: ${bp.targetMarket || 'Not specified'}
- Value Proposition: ${bp.valueProposition || 'Not specified'}

Generate:

# Messaging Framework – ${bp.companyName}

## Elevator Pitch (30 seconds)
Create a concise pitch for ${bp.companyName} using the business context.

## Core Message
One-sentence description of what ${bp.companyName} does and why it matters.

## Value Propositions
Based on "${bp.valueProposition || '[define value prop]'}":

### For ${bp.targetMarket || '[Target Segment]'}
- **Headline**: [Benefit-focused headline]
- **Description**: [2-3 sentences expanding on benefit]
- **Proof Points**: 
  - [Evidence 1]
  - [Evidence 2]
  - [Evidence 3]

## Key Messages by Audience
### Decision Makers
[Messages that resonate with decision makers in ${bp.targetMarket || 'target market'}]

### End Users
[Messages for day-to-day users]

### Influencers
[Messages for people who influence the buying decision]

## Differentiation
### What makes ${bp.companyName} different?
1. [Differentiator 1]
2. [Differentiator 2]
3. [Differentiator 3]

### vs. Status Quo
Why ${bp.companyName} is better than doing nothing.

### vs. Competitors
How ${bp.companyName} stands out in ${bp.industry || 'the industry'}.

## Talk Tracks
### Discovery Questions
[5-7 questions sales/support should ask]

### Objection Handling
| Common Objection | Response |
|------------------|----------|
| [Objection 1] | [How to address] |
| [Objection 2] | [How to address] |

## Brand Voice
Define tone and style for ${bp.companyName}'s communications.

Use clear, professional formatting with examples and specific language.`
  },

  {
    id: 'competitive_analysis',
    name: 'Competitive Analysis',
    description: 'Competitive landscape and differentiation strategy',
    docTypes: ['competitive_snapshot', 'battlecard', 'brief'],
    generatePrompt: (bp: BusinessProfile) => `Create a competitive analysis for ${bp.companyName}.

Business Context:
- Company: ${bp.companyName}
- Industry: ${bp.industry || 'Not specified'}
- Business: ${bp.description || 'Not specified'}
- Target Market: ${bp.targetMarket || 'Not specified'}
- Value Proposition: ${bp.valueProposition || 'Not specified'}

Generate:

# Competitive Analysis – ${bp.companyName}

## Market Landscape
Overview of ${bp.industry || 'the industry'} competitive dynamics.

## Competitive Categories
### Direct Competitors
[Similar solutions targeting ${bp.targetMarket || 'the same market'}]

### Indirect Competitors
[Alternative solutions to the same problem]

### Substitute Solutions
[What customers do today without ${bp.companyName}]

## Competitive Matrix
| Feature/Capability | ${bp.companyName} | Competitor A | Competitor B | Competitor C |
|-------------------|-------------------|--------------|--------------|--------------|
| [Key feature 1] | ✓ | ✓ | ✗ | ✓ |
| [Key feature 2] | ✓ | ✗ | ✓ | ✗ |
[5-10 key differentiators]

## SWOT Analysis
### Strengths
What ${bp.companyName} does exceptionally well, based on "${bp.valueProposition || 'value proposition'}".

### Weaknesses
Areas where competitors may have advantages.

### Opportunities
Market gaps ${bp.companyName} can exploit.

### Threats
Competitive or market risks to address.

## Win/Loss Analysis
### Why ${bp.companyName} Wins
Key reasons customers choose ${bp.companyName}.

### Why We Lose
Common reasons for competitive losses and mitigation strategies.

## Positioning Strategy
How ${bp.companyName} should position against competition in ${bp.industry || 'the market'}.

## Recommended Actions
5-7 tactical recommendations to strengthen competitive position.

Format with tables, bullet points, and clear analysis.`
  }
];

export function getTemplatesForDocType(docType: DocType): GTMTemplate[] {
  return GTM_TEMPLATES.filter(template => template.docTypes.includes(docType));
}

export function getTemplateById(id: string): GTMTemplate | undefined {
  return GTM_TEMPLATES.find(template => template.id === id);
}
