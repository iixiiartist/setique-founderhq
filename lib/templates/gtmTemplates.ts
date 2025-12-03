/**
 * GTM Document Templates
 * Pre-built templates for common Go-To-Market documents
 * 
 * These templates use TipTap-compatible HTML formatting with rich styling
 * for a professional, polished document experience.
 */

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'strategy' | 'planning' | 'sales' | 'marketing' | 'product' | 'operations';
  content: string;
}

export const GTM_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'High-level overview for leadership and stakeholders',
    icon: '📊',
    category: 'strategy',
    content: `<h1>📊 Executive Summary</h1>
<p><em>Strategic overview document for leadership review</em></p>
<p></p>
<blockquote><p><strong>💡 Pro Tip:</strong> Keep this summary to 2-3 pages maximum. Lead with the most critical insights and recommendations.</p></blockquote>
<p></p>
<h2>🎯 Overview</h2>
<p>Provide a compelling 2-3 sentence overview of your initiative, product, or project. Answer: What is this, and why does it matter now?</p>
<p></p>
<h2>📌 Key Objectives</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p><strong>Primary Goal:</strong> Define your north-star objective with a measurable outcome</p></li>
  <li data-checked="false" data-type="taskItem"><p><strong>Secondary Goal:</strong> Supporting objective that enables the primary goal</p></li>
  <li data-checked="false" data-type="taskItem"><p><strong>Tertiary Goal:</strong> Nice-to-have objective if resources allow</p></li>
</ul>
<p></p>
<h2>🧭 Strategic Approach</h2>
<p>Outline your high-level strategy and methodology. What's the game plan?</p>
<ol>
  <li><p><strong>Phase 1 — Discovery:</strong> Research and validate core assumptions</p></li>
  <li><p><strong>Phase 2 — Build:</strong> Develop MVP and gather initial feedback</p></li>
  <li><p><strong>Phase 3 — Scale:</strong> Expand reach and optimize for growth</p></li>
</ol>
<p></p>
<h2>🎯 Target Market</h2>
<table>
  <tbody>
    <tr>
      <th><p>Segment</p></th>
      <th><p>Description</p></th>
      <th><p>Size</p></th>
    </tr>
    <tr>
      <td><p><strong>Primary Audience</strong></p></td>
      <td><p>Your ideal customer profile — describe demographics, firmographics, and behaviors</p></td>
      <td><p>$X TAM</p></td>
    </tr>
    <tr>
      <td><p><strong>Secondary Audience</strong></p></td>
      <td><p>Adjacent segments that can benefit from your solution</p></td>
      <td><p>$X SAM</p></td>
    </tr>
    <tr>
      <td><p><strong>Initial Target</strong></p></td>
      <td><p>Your beachhead market for initial traction</p></td>
      <td><p>$X SOM</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>💎 Value Proposition</h2>
<blockquote><p><strong>For</strong> [target customer] <strong>who</strong> [statement of need], <strong>our</strong> [product/service] <strong>provides</strong> [key benefit]. <strong>Unlike</strong> [competitors], <strong>we</strong> [key differentiator].</p></blockquote>
<p></p>
<h2>📈 Success Metrics</h2>
<table>
  <tbody>
    <tr>
      <th><p>Metric</p></th>
      <th><p>Current</p></th>
      <th><p>Target</p></th>
      <th><p>Timeline</p></th>
    </tr>
    <tr>
      <td><p>🎯 Revenue</p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
      <td><p>Q4 2025</p></td>
    </tr>
    <tr>
      <td><p>👥 Customers</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>Q4 2025</p></td>
    </tr>
    <tr>
      <td><p>📊 Market Share</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p>2026</p></td>
    </tr>
    <tr>
      <td><p>⭐ NPS Score</p></td>
      <td><p>X</p></td>
      <td><p>X+</p></td>
      <td><p>Q2 2025</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>💰 Resource Requirements</h2>
<ul>
  <li><p><strong>Budget:</strong> $X total investment over Y months</p></li>
  <li><p><strong>Team:</strong> X FTEs (Product: X, Engineering: X, Marketing: X, Sales: X)</p></li>
  <li><p><strong>Timeline:</strong> X months from kickoff to launch</p></li>
  <li><p><strong>Tools/Infrastructure:</strong> List critical tech stack needs</p></li>
</ul>
<p></p>
<h2>⚠️ Risk Assessment</h2>
<table>
  <tbody>
    <tr>
      <th><p>Risk</p></th>
      <th><p>Impact</p></th>
      <th><p>Likelihood</p></th>
      <th><p>Mitigation</p></th>
    </tr>
    <tr>
      <td><p>Market timing risk</p></td>
      <td><p><mark style="background-color: #fecaca; color: inherit">High</mark></p></td>
      <td><p>Medium</p></td>
      <td><p>Phased rollout with validation gates</p></td>
    </tr>
    <tr>
      <td><p>Resource constraints</p></td>
      <td><p><mark style="background-color: #fef08a; color: inherit">Medium</mark></p></td>
      <td><p>Medium</p></td>
      <td><p>Prioritize core features, outsource non-critical</p></td>
    </tr>
    <tr>
      <td><p>Competitive response</p></td>
      <td><p><mark style="background-color: #fef08a; color: inherit">Medium</mark></p></td>
      <td><p>High</p></td>
      <td><p>Speed to market + defensible differentiation</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>✅ Recommendation & Next Steps</h2>
<p><strong>Our recommendation:</strong> [Clear, actionable recommendation for stakeholders]</p>
<p></p>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p><strong>Immediate:</strong> [Action item requiring approval/decision]</p></li>
  <li data-checked="false" data-type="taskItem"><p><strong>This Week:</strong> [Follow-up action]</p></li>
  <li data-checked="false" data-type="taskItem"><p><strong>This Month:</strong> [Longer-term action]</p></li>
</ul>
<p></p>
<hr>
<p><em>Document Owner: [Name] • Last Updated: [Date] • Version: 1.0</em></p>`,
  },
  {
    id: 'product-brief',
    name: 'Product Brief',
    description: 'Detailed product specification and requirements document',
    icon: '📦',
    category: 'product',
    content: `<h1>📦 Product Brief</h1>
<p><em>Comprehensive product specification for cross-functional alignment</em></p>
<p></p>
<blockquote><p><strong>🎯 Purpose:</strong> This document defines the what, why, and how of a product or feature. It serves as the single source of truth for product development.</p></blockquote>
<p></p>
<h2>📋 Product Overview</h2>
<table>
  <tbody>
    <tr>
      <td><p><strong>Product Name</strong></p></td>
      <td><p>[Your Product Name]</p></td>
    </tr>
    <tr>
      <td><p><strong>Version</strong></p></td>
      <td><p>v1.0</p></td>
    </tr>
    <tr>
      <td><p><strong>Target Release</strong></p></td>
      <td><p>[Date]</p></td>
    </tr>
    <tr>
      <td><p><strong>Product Owner</strong></p></td>
      <td><p>[Name]</p></td>
    </tr>
    <tr>
      <td><p><strong>Status</strong></p></td>
      <td><p><mark style="background-color: #bfdbfe; color: inherit">In Development</mark></p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>🔥 Problem Statement</h2>
<p><strong>The Problem:</strong></p>
<p>Describe the specific customer pain point or market gap in clear, empathetic terms. What's broken today?</p>
<p></p>
<p><strong>Impact of the Problem:</strong></p>
<ul>
  <li><p>💰 <strong>Financial:</strong> How much does this cost customers?</p></li>
  <li><p>⏰ <strong>Time:</strong> How much time is wasted?</p></li>
  <li><p>😤 <strong>Frustration:</strong> What's the emotional toll?</p></li>
</ul>
<p></p>
<h2>💡 Solution</h2>
<p>Explain how your product elegantly solves the identified problem. Be specific about the approach.</p>
<p></p>
<blockquote><p><strong>The Big Idea:</strong> [One sentence that captures the essence of your solution]</p></blockquote>
<p></p>
<h2>👥 Target Audience</h2>
<h3>Primary Persona: [Name]</h3>
<table>
  <tbody>
    <tr>
      <td><p><strong>Role/Title</strong></p></td>
      <td><p>[e.g., Marketing Manager at B2B SaaS companies]</p></td>
    </tr>
    <tr>
      <td><p><strong>Demographics</strong></p></td>
      <td><p>Company size: 50-500 employees, $5M-$50M revenue</p></td>
    </tr>
    <tr>
      <td><p><strong>Pain Points</strong></p></td>
      <td><p>1. [Pain] 2. [Pain] 3. [Pain]</p></td>
    </tr>
    <tr>
      <td><p><strong>Goals</strong></p></td>
      <td><p>1. [Goal] 2. [Goal] 3. [Goal]</p></td>
    </tr>
    <tr>
      <td><p><strong>Current Tools</strong></p></td>
      <td><p>[Tools they currently use]</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h3>Secondary Persona: [Name]</h3>
<p>Brief description of secondary user and how their needs differ.</p>
<p></p>
<h2>✨ Key Features</h2>
<table>
  <tbody>
    <tr>
      <th><p>Feature</p></th>
      <th><p>Description</p></th>
      <th><p>Priority</p></th>
      <th><p>Effort</p></th>
    </tr>
    <tr>
      <td><p><strong>Feature 1</strong></p></td>
      <td><p>Core functionality that delivers primary value</p></td>
      <td><p><mark style="background-color: #fecaca; color: inherit">Must-Have</mark></p></td>
      <td><p>Large</p></td>
    </tr>
    <tr>
      <td><p><strong>Feature 2</strong></p></td>
      <td><p>Important capability for key use cases</p></td>
      <td><p><mark style="background-color: #fef08a; color: inherit">Should-Have</mark></p></td>
      <td><p>Medium</p></td>
    </tr>
    <tr>
      <td><p><strong>Feature 3</strong></p></td>
      <td><p>Enhancement for power users</p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">Could-Have</mark></p></td>
      <td><p>Small</p></td>
    </tr>
    <tr>
      <td><p><strong>Feature 4</strong></p></td>
      <td><p>Future consideration</p></td>
      <td><p>Won't-Have (v1)</p></td>
      <td><p>—</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>📝 User Stories</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p><strong>Epic 1:</strong> As a [persona], I want to [action] so that [benefit]</p></li>
  <li data-checked="false" data-type="taskItem"><p><strong>Epic 2:</strong> As a [persona], I want to [action] so that [benefit]</p></li>
  <li data-checked="false" data-type="taskItem"><p><strong>Epic 3:</strong> As a [persona], I want to [action] so that [benefit]</p></li>
  <li data-checked="false" data-type="taskItem"><p><strong>Epic 4:</strong> As a [persona], I want to [action] so that [benefit]</p></li>
</ul>
<p></p>
<h2>📊 Success Metrics</h2>
<table>
  <tbody>
    <tr>
      <th><p>Category</p></th>
      <th><p>Metric</p></th>
      <th><p>Target</p></th>
      <th><p>Measurement</p></th>
    </tr>
    <tr>
      <td><p>🚀 Adoption</p></td>
      <td><p>Activation rate</p></td>
      <td><p>X% within 7 days</p></td>
      <td><p>Analytics</p></td>
    </tr>
    <tr>
      <td><p>💪 Engagement</p></td>
      <td><p>DAU/MAU ratio</p></td>
      <td><p>X%</p></td>
      <td><p>Analytics</p></td>
    </tr>
    <tr>
      <td><p>😊 Satisfaction</p></td>
      <td><p>NPS / CSAT</p></td>
      <td><p>50+ NPS</p></td>
      <td><p>Survey</p></td>
    </tr>
    <tr>
      <td><p>💰 Revenue</p></td>
      <td><p>ARR impact</p></td>
      <td><p>$X</p></td>
      <td><p>Revenue tracking</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>⚙️ Technical Requirements</h2>
<ul>
  <li><p><strong>Platform:</strong> Web, iOS, Android (specify priority)</p></li>
  <li><p><strong>Integrations:</strong> List required third-party integrations</p></li>
  <li><p><strong>Performance:</strong> Page load &lt; 2s, 99.9% uptime, support X concurrent users</p></li>
  <li><p><strong>Security:</strong> SOC2, GDPR compliance, SSO support</p></li>
  <li><p><strong>Accessibility:</strong> WCAG 2.1 AA compliance</p></li>
</ul>
<p></p>
<h2>🚀 Go-to-Market Preview</h2>
<table>
  <tbody>
    <tr>
      <td><p><strong>Launch Type</strong></p></td>
      <td><p>☐ Soft Launch  ☐ Beta  ☐ Full Launch</p></td>
    </tr>
    <tr>
      <td><p><strong>Target Date</strong></p></td>
      <td><p>[Date]</p></td>
    </tr>
    <tr>
      <td><p><strong>Beta Program</strong></p></td>
      <td><p>[X] customers for [Y] weeks</p></td>
    </tr>
    <tr>
      <td><p><strong>Marketing Campaign</strong></p></td>
      <td><p>[Brief overview]</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>🔗 Dependencies</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p><strong>Engineering:</strong> [Resource/API requirements]</p></li>
  <li data-checked="false" data-type="taskItem"><p><strong>Design:</strong> [Design assets needed]</p></li>
  <li data-checked="false" data-type="taskItem"><p><strong>Marketing:</strong> [Campaign materials]</p></li>
  <li data-checked="false" data-type="taskItem"><p><strong>Legal:</strong> [Contracts, compliance reviews]</p></li>
  <li data-checked="false" data-type="taskItem"><p><strong>External:</strong> [Third-party dependencies]</p></li>
</ul>
<p></p>
<h2>📅 Timeline</h2>
<table>
  <tbody>
    <tr>
      <th><p>Phase</p></th>
      <th><p>Activities</p></th>
      <th><p>Duration</p></th>
      <th><p>Status</p></th>
    </tr>
    <tr>
      <td><p>🔍 Discovery</p></td>
      <td><p>Research, user interviews, validation</p></td>
      <td><p>2 weeks</p></td>
      <td><p>✅ Complete</p></td>
    </tr>
    <tr>
      <td><p>🎨 Design</p></td>
      <td><p>Wireframes, prototypes, user testing</p></td>
      <td><p>3 weeks</p></td>
      <td><p>🔄 In Progress</p></td>
    </tr>
    <tr>
      <td><p>⚙️ Development</p></td>
      <td><p>Build, test, iterate</p></td>
      <td><p>8 weeks</p></td>
      <td><p>⏳ Pending</p></td>
    </tr>
    <tr>
      <td><p>🚀 Launch</p></td>
      <td><p>Deploy, monitor, optimize</p></td>
      <td><p>2 weeks</p></td>
      <td><p>⏳ Pending</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<hr>
<p><em>Document Owner: [Name] • Stakeholders: [Names] • Last Updated: [Date]</em></p>`,
  },
  {
    id: 'launch-plan',
    name: 'Product Launch Plan',
    description: 'Comprehensive plan for product launch execution',
    icon: '🚀',
    category: 'planning',
    content: `<h1>🚀 Product Launch Plan</h1>
<p><em>Your comprehensive roadmap from development to market</em></p>
<p></p>
<blockquote><p><strong>🎯 Launch Readiness:</strong> Use this document to coordinate all teams and ensure nothing falls through the cracks.</p></blockquote>
<p></p>
<h2>📋 Launch Overview</h2>
<table>
  <tbody>
    <tr>
      <td><p><strong>Product</strong></p></td>
      <td><p>[Product Name]</p></td>
    </tr>
    <tr>
      <td><p><strong>Launch Date</strong></p></td>
      <td><p>[Target Date]</p></td>
    </tr>
    <tr>
      <td><p><strong>Launch Type</strong></p></td>
      <td><p>☐ Soft Launch  ☐ Full Launch  ☐ Phased Rollout</p></td>
    </tr>
    <tr>
      <td><p><strong>Launch Owner</strong></p></td>
      <td><p>[Name, Title]</p></td>
    </tr>
    <tr>
      <td><p><strong>War Room</strong></p></td>
      <td><p>[Slack channel / Meeting room]</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>🎯 Launch Objectives</h2>
<table>
  <tbody>
    <tr>
      <th><p>Objective</p></th>
      <th><p>Target Metric</p></th>
      <th><p>Measurement</p></th>
    </tr>
    <tr>
      <td><p>📣 <strong>Awareness</strong></p></td>
      <td><p>X impressions, Y unique visitors</p></td>
      <td><p>Analytics, social</p></td>
    </tr>
    <tr>
      <td><p>👥 <strong>Acquisition</strong></p></td>
      <td><p>X new signups, Y% conversion</p></td>
      <td><p>CRM, analytics</p></td>
    </tr>
    <tr>
      <td><p>💰 <strong>Revenue</strong></p></td>
      <td><p>$X in first 30 days</p></td>
      <td><p>Billing system</p></td>
    </tr>
    <tr>
      <td><p>🔄 <strong>Activation</strong></p></td>
      <td><p>X% complete onboarding</p></td>
      <td><p>Product analytics</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>👥 Target Audience</h2>
<ul>
  <li><p><strong>Primary Segment:</strong> [Description + size]</p></li>
  <li><p><strong>Secondary Segment:</strong> [Description + size]</p></li>
  <li><p><strong>Geographic Focus:</strong> [Regions]</p></li>
  <li><p><strong>Total Addressable:</strong> X customers</p></li>
</ul>
<p></p>
<h2>✅ Pre-Launch Checklist</h2>
<h3>📅 30 Days Before Launch</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>✅ Product feature complete and tested</p></li>
  <li data-checked="false" data-type="taskItem"><p>🎨 Marketing materials finalized (landing page, emails, ads)</p></li>
  <li data-checked="false" data-type="taskItem"><p>📊 Sales enablement ready (pitch deck, demo script, FAQs)</p></li>
  <li data-checked="false" data-type="taskItem"><p>📈 Analytics and tracking configured</p></li>
  <li data-checked="false" data-type="taskItem"><p>👨‍💼 Customer success team briefed</p></li>
  <li data-checked="false" data-type="taskItem"><p>📝 Legal review complete</p></li>
</ul>
<p></p>
<h3>📅 14 Days Before Launch</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>📧 Email warm-up campaign started</p></li>
  <li data-checked="false" data-type="taskItem"><p>📰 Press releases and media outreach scheduled</p></li>
  <li data-checked="false" data-type="taskItem"><p>💳 Payment and billing systems tested</p></li>
  <li data-checked="false" data-type="taskItem"><p>📚 Help documentation and support articles published</p></li>
  <li data-checked="false" data-type="taskItem"><p>🧪 Beta program feedback incorporated</p></li>
</ul>
<p></p>
<h3>📅 7 Days Before Launch</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>🐛 Final QA pass and bug fixes</p></li>
  <li data-checked="false" data-type="taskItem"><p>🎓 Support team product training complete</p></li>
  <li data-checked="false" data-type="taskItem"><p>📱 Social media posts scheduled</p></li>
  <li data-checked="false" data-type="taskItem"><p>📢 Existing customers notified (teaser)</p></li>
  <li data-checked="false" data-type="taskItem"><p>🔥 Launch day monitoring plan confirmed</p></li>
</ul>
<p></p>
<h3>📅 1 Day Before Launch</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>🚨 All systems green-lighted</p></li>
  <li data-checked="false" data-type="taskItem"><p>👥 War room setup and team on standby</p></li>
  <li data-checked="false" data-type="taskItem"><p>📞 On-call rotation confirmed</p></li>
  <li data-checked="false" data-type="taskItem"><p>🔙 Rollback plan ready if needed</p></li>
</ul>
<p></p>
<h2>🎬 Launch Day Schedule</h2>
<table>
  <tbody>
    <tr>
      <th><p>Time</p></th>
      <th><p>Activity</p></th>
      <th><p>Owner</p></th>
      <th><p>Status</p></th>
    </tr>
    <tr>
      <td><p>6:00 AM</p></td>
      <td><p>🚀 Deploy product to production</p></td>
      <td><p>Engineering</p></td>
      <td><p>⏳</p></td>
    </tr>
    <tr>
      <td><p>7:00 AM</p></td>
      <td><p>✅ Smoke tests and monitoring checks</p></td>
      <td><p>QA</p></td>
      <td><p>⏳</p></td>
    </tr>
    <tr>
      <td><p>8:00 AM</p></td>
      <td><p>📝 Publish blog post and press release</p></td>
      <td><p>Marketing</p></td>
      <td><p>⏳</p></td>
    </tr>
    <tr>
      <td><p>9:00 AM</p></td>
      <td><p>📧 Send launch email to subscriber list</p></td>
      <td><p>Marketing</p></td>
      <td><p>⏳</p></td>
    </tr>
    <tr>
      <td><p>10:00 AM</p></td>
      <td><p>📱 Social media blitz begins</p></td>
      <td><p>Marketing</p></td>
      <td><p>⏳</p></td>
    </tr>
    <tr>
      <td><p>12:00 PM</p></td>
      <td><p>📊 Mid-day check-in and metrics review</p></td>
      <td><p>All Teams</p></td>
      <td><p>⏳</p></td>
    </tr>
    <tr>
      <td><p>3:00 PM</p></td>
      <td><p>📱 Second wave social posts</p></td>
      <td><p>Marketing</p></td>
      <td><p>⏳</p></td>
    </tr>
    <tr>
      <td><p>5:00 PM</p></td>
      <td><p>📈 End of day metrics review</p></td>
      <td><p>Leadership</p></td>
      <td><p>⏳</p></td>
    </tr>
    <tr>
      <td><p>6:00 PM</p></td>
      <td><p>🎉 Launch celebration (if all goes well!)</p></td>
      <td><p>Everyone</p></td>
      <td><p>⏳</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>📣 Marketing Channels</h2>
<h3>📧 Email Marketing</h3>
<ul>
  <li><p>Launch announcement to X subscribers</p></li>
  <li><p>5-email nurture sequence over 2 weeks</p></li>
  <li><p>Personalized outreach to high-value prospects</p></li>
</ul>
<p></p>
<h3>📱 Social Media</h3>
<ul>
  <li><p><strong>LinkedIn:</strong> Thought leadership posts + company announcement</p></li>
  <li><p><strong>Twitter/X:</strong> Launch thread + engagement strategy</p></li>
  <li><p><strong>Instagram:</strong> Visual storytelling + Stories</p></li>
</ul>
<p></p>
<h3>📝 Content Marketing</h3>
<ul>
  <li><p>Launch blog post</p></li>
  <li><p>Product demo video</p></li>
  <li><p>Customer case study</p></li>
  <li><p>Webinar: Deep dive training</p></li>
</ul>
<p></p>
<h3>💰 Paid Advertising</h3>
<table>
  <tbody>
    <tr>
      <th><p>Channel</p></th>
      <th><p>Budget</p></th>
      <th><p>Target CPA</p></th>
    </tr>
    <tr>
      <td><p>Google Ads</p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
    </tr>
    <tr>
      <td><p>LinkedIn Ads</p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
    </tr>
    <tr>
      <td><p>Facebook/Meta</p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>📊 Success Metrics Dashboard</h2>
<table>
  <tbody>
    <tr>
      <th><p>Metric</p></th>
      <th><p>Day 1</p></th>
      <th><p>Week 1</p></th>
      <th><p>Month 1</p></th>
    </tr>
    <tr>
      <td><p>🆕 Sign-ups</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
    </tr>
    <tr>
      <td><p>💳 Paid Customers</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
    </tr>
    <tr>
      <td><p>💰 Revenue</p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
    </tr>
    <tr>
      <td><p>🌐 Website Visits</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
    </tr>
    <tr>
      <td><p>📰 Media Mentions</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
    </tr>
    <tr>
      <td><p>⭐ NPS Score</p></td>
      <td><p>—</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>⚠️ Risk Mitigation</h2>
<table>
  <tbody>
    <tr>
      <th><p>Risk</p></th>
      <th><p>Impact</p></th>
      <th><p>Mitigation</p></th>
      <th><p>Owner</p></th>
    </tr>
    <tr>
      <td><p>Technical issues</p></td>
      <td><p><mark style="background-color: #fecaca; color: inherit">High</mark></p></td>
      <td><p>24/7 engineering on-call, rollback plan ready</p></td>
      <td><p>CTO</p></td>
    </tr>
    <tr>
      <td><p>Low initial adoption</p></td>
      <td><p><mark style="background-color: #fef08a; color: inherit">Medium</mark></p></td>
      <td><p>Bonus incentives, extended trial periods</p></td>
      <td><p>Marketing</p></td>
    </tr>
    <tr>
      <td><p>Negative feedback</p></td>
      <td><p><mark style="background-color: #fef08a; color: inherit">Medium</mark></p></td>
      <td><p>Rapid response team, communication plan</p></td>
      <td><p>CS Lead</p></td>
    </tr>
    <tr>
      <td><p>Support overload</p></td>
      <td><p><mark style="background-color: #fef08a; color: inherit">Medium</mark></p></td>
      <td><p>Extra coverage scheduled, escalation path</p></td>
      <td><p>Support</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>👥 Team Responsibilities</h2>
<ul>
  <li><p><strong>🎯 Product:</strong> Feature readiness, product demos, release notes</p></li>
  <li><p><strong>⚙️ Engineering:</strong> Stability, monitoring, bug fixes, scaling</p></li>
  <li><p><strong>📣 Marketing:</strong> Campaign execution, content, PR, social</p></li>
  <li><p><strong>💼 Sales:</strong> Pipeline management, demos, objection handling</p></li>
  <li><p><strong>🤝 Customer Success:</strong> Onboarding, training, proactive outreach</p></li>
  <li><p><strong>🎧 Support:</strong> Ticket management, knowledge base, escalation</p></li>
</ul>
<p></p>
<h2>📈 Post-Launch Activities</h2>
<h3>Week 1</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Daily metrics monitoring and optimization</p></li>
  <li data-checked="false" data-type="taskItem"><p>Customer feedback collection and triage</p></li>
  <li data-checked="false" data-type="taskItem"><p>Support ticket review and pattern analysis</p></li>
  <li data-checked="false" data-type="taskItem"><p>Content amplification and engagement</p></li>
</ul>
<p></p>
<h3>Week 2-4</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Iterate on messaging based on performance data</p></li>
  <li data-checked="false" data-type="taskItem"><p>Scale successful marketing channels</p></li>
  <li data-checked="false" data-type="taskItem"><p>Launch customer success program</p></li>
  <li data-checked="false" data-type="taskItem"><p>Conduct post-launch retrospective</p></li>
  <li data-checked="false" data-type="taskItem"><p>Plan v1.1 based on feedback</p></li>
</ul>
<p></p>
<hr>
<p><em>Launch Commander: [Name] • Last Updated: [Date] • Version: 1.0</em></p>`,
  },
  {
    id: 'competitive-analysis',
    name: 'Competitive Analysis',
    description: 'Market positioning and competitor comparison',
    icon: '⚔️',
    category: 'strategy',
    content: `<h1>⚔️ Competitive Analysis</h1>
<p><em>Know your market, own your position</em></p>
<p></p>
<blockquote><p><strong>💡 Purpose:</strong> This document provides a comprehensive view of your competitive landscape to inform strategic decisions across product, marketing, and sales.</p></blockquote>
<p></p>
<h2>🌍 Market Overview</h2>
<table>
  <tbody>
    <tr>
      <td><p><strong>Market Size (2025)</strong></p></td>
      <td><p>$X billion</p></td>
    </tr>
    <tr>
      <td><p><strong>Growth Rate</strong></p></td>
      <td><p>X% CAGR (2025-2030)</p></td>
    </tr>
    <tr>
      <td><p><strong>Market Stage</strong></p></td>
      <td><p>☐ Emerging  ☐ Growth  ☐ Mature</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<p><strong>Key Market Trends:</strong></p>
<ol>
  <li><p><strong>Trend 1:</strong> Description and impact on market</p></li>
  <li><p><strong>Trend 2:</strong> Description and impact on market</p></li>
  <li><p><strong>Trend 3:</strong> Description and impact on market</p></li>
</ol>
<p></p>
<h2>📊 Competitor Comparison Matrix</h2>
<table>
  <tbody>
    <tr>
      <th><p>Criteria</p></th>
      <th><p>🏆 Us</p></th>
      <th><p>Competitor A</p></th>
      <th><p>Competitor B</p></th>
      <th><p>Competitor C</p></th>
    </tr>
    <tr>
      <td><p><strong>Starting Price</strong></p></td>
      <td><p>$X/mo</p></td>
      <td><p>$X/mo</p></td>
      <td><p>$X/mo</p></td>
      <td><p>$X/mo</p></td>
    </tr>
    <tr>
      <td><p><strong>Core Feature 1</strong></p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">✅ Advanced</mark></p></td>
      <td><p>✅ Yes</p></td>
      <td><p>⚠️ Limited</p></td>
      <td><p>❌ No</p></td>
    </tr>
    <tr>
      <td><p><strong>Core Feature 2</strong></p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">✅ Yes</mark></p></td>
      <td><p>⚠️ Basic</p></td>
      <td><p>✅ Yes</p></td>
      <td><p>✅ Yes</p></td>
    </tr>
    <tr>
      <td><p><strong>Core Feature 3</strong></p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">✅ Yes</mark></p></td>
      <td><p>❌ No</p></td>
      <td><p>❌ No</p></td>
      <td><p>✅ Yes</p></td>
    </tr>
    <tr>
      <td><p><strong>Integrations</strong></p></td>
      <td><p>X+ apps</p></td>
      <td><p>X apps</p></td>
      <td><p>X apps</p></td>
      <td><p>X apps</p></td>
    </tr>
    <tr>
      <td><p><strong>Support</strong></p></td>
      <td><p>24/7 Chat</p></td>
      <td><p>Email Only</p></td>
      <td><p>Business Hours</p></td>
      <td><p>Self-Service</p></td>
    </tr>
    <tr>
      <td><p><strong>Est. Market Share</strong></p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>🔍 Competitor Deep Dives</h2>
<h3>Competitor A: [Name]</h3>
<table>
  <tbody>
    <tr>
      <td><p><strong>Company</strong></p></td>
      <td><p>[Name]</p></td>
    </tr>
    <tr>
      <td><p><strong>Founded</strong></p></td>
      <td><p>[Year]</p></td>
    </tr>
    <tr>
      <td><p><strong>Funding</strong></p></td>
      <td><p>$X raised</p></td>
    </tr>
    <tr>
      <td><p><strong>Est. Customers</strong></p></td>
      <td><p>X+ companies</p></td>
    </tr>
    <tr>
      <td><p><strong>Target Market</strong></p></td>
      <td><p>[Description]</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<p><strong>💪 Strengths:</strong></p>
<ul>
  <li><p>Strong brand recognition in [segment]</p></li>
  <li><p>Robust feature set for [use case]</p></li>
  <li><p>Large ecosystem of integrations</p></li>
</ul>
<p></p>
<p><strong>🎯 Weaknesses:</strong></p>
<ul>
  <li><p>Complex pricing, hidden costs</p></li>
  <li><p>Slow to innovate on [area]</p></li>
  <li><p>Poor customer support reviews</p></li>
</ul>
<p></p>
<p><strong>📌 Market Position:</strong> [Analysis of their positioning and messaging strategy]</p>
<p></p>
<hr>
<p></p>
<h3>Competitor B: [Name]</h3>
<table>
  <tbody>
    <tr>
      <td><p><strong>Company</strong></p></td>
      <td><p>[Name]</p></td>
    </tr>
    <tr>
      <td><p><strong>Founded</strong></p></td>
      <td><p>[Year]</p></td>
    </tr>
    <tr>
      <td><p><strong>Funding</strong></p></td>
      <td><p>$X raised</p></td>
    </tr>
    <tr>
      <td><p><strong>Est. Customers</strong></p></td>
      <td><p>X+ companies</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<p><strong>💪 Strengths:</strong></p>
<ul>
  <li><p>[Strength 1]</p></li>
  <li><p>[Strength 2]</p></li>
</ul>
<p></p>
<p><strong>🎯 Weaknesses:</strong></p>
<ul>
  <li><p>[Weakness 1]</p></li>
  <li><p>[Weakness 2]</p></li>
</ul>
<p></p>
<h2>📈 SWOT Analysis (Our Position)</h2>
<table>
  <tbody>
    <tr>
      <th><p>💪 Strengths</p></th>
      <th><p>🎯 Weaknesses</p></th>
    </tr>
    <tr>
      <td><p>• [Internal advantage 1]<br>• [Internal advantage 2]<br>• [Internal advantage 3]</p></td>
      <td><p>• [Internal limitation 1]<br>• [Internal limitation 2]<br>• [Internal limitation 3]</p></td>
    </tr>
    <tr>
      <th><p>🚀 Opportunities</p></th>
      <th><p>⚠️ Threats</p></th>
    </tr>
    <tr>
      <td><p>• [External opportunity 1]<br>• [External opportunity 2]<br>• [External opportunity 3]</p></td>
      <td><p>• [External threat 1]<br>• [External threat 2]<br>• [External threat 3]</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>🎯 Our Differentiation Strategy</h2>
<h3>Unique Value Pillars</h3>
<ol>
  <li><p><strong>Differentiator 1:</strong> Clear explanation of what makes us unique here</p></li>
  <li><p><strong>Differentiator 2:</strong> Clear explanation of competitive advantage</p></li>
  <li><p><strong>Differentiator 3:</strong> Clear explanation of defensible moat</p></li>
</ol>
<p></p>
<h3>Positioning Statement</h3>
<blockquote><p><strong>For</strong> [target customer] <strong>who</strong> [statement of need], <strong>[product name]</strong> is a [product category] <strong>that</strong> [statement of benefit]. <strong>Unlike</strong> [competitor], our product [key differentiator].</p></blockquote>
<p></p>
<h2>⚔️ Competitive Response Playbook</h2>
<h3>When Competitor Launches New Feature</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Assess impact on our product roadmap</p></li>
  <li data-checked="false" data-type="taskItem"><p>Communicate our differentiators to customers</p></li>
  <li data-checked="false" data-type="taskItem"><p>Accelerate development if strategic</p></li>
  <li data-checked="false" data-type="taskItem"><p>Update sales battlecards</p></li>
</ul>
<p></p>
<h3>When Competitor Changes Pricing</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Analyze total cost of ownership comparison</p></li>
  <li data-checked="false" data-type="taskItem"><p>Emphasize value over price in messaging</p></li>
  <li data-checked="false" data-type="taskItem"><p>Consider promotional offers if necessary</p></li>
  <li data-checked="false" data-type="taskItem"><p>Brief sales team on new objection handling</p></li>
</ul>
<p></p>
<h3>When Competitor Wins a Deal We Lost</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Conduct win/loss analysis</p></li>
  <li data-checked="false" data-type="taskItem"><p>Document lessons learned</p></li>
  <li data-checked="false" data-type="taskItem"><p>Update our competitive positioning</p></li>
</ul>
<p></p>
<h2>📊 Win/Loss Analysis</h2>
<table>
  <tbody>
    <tr>
      <th><p>Factor</p></th>
      <th><p>Wins %</p></th>
      <th><p>Losses %</p></th>
      <th><p>Notes</p></th>
    </tr>
    <tr>
      <td><p>💰 Price</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p></p></td>
    </tr>
    <tr>
      <td><p>✨ Features</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p></p></td>
    </tr>
    <tr>
      <td><p>🤝 Support</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p></p></td>
    </tr>
    <tr>
      <td><p>🏷️ Brand</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p></p></td>
    </tr>
    <tr>
      <td><p>⚙️ Integration</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p></p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>✅ Action Items</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Update competitive battlecard for sales team</p></li>
  <li data-checked="false" data-type="taskItem"><p>Create comparison landing pages</p></li>
  <li data-checked="false" data-type="taskItem"><p>Develop sales objection handling guide</p></li>
  <li data-checked="false" data-type="taskItem"><p>Schedule quarterly competitive review</p></li>
  <li data-checked="false" data-type="taskItem"><p>Set up competitor product monitoring</p></li>
  <li data-checked="false" data-type="taskItem"><p>Brief product team on competitive gaps</p></li>
</ul>
<p></p>
<hr>
<p><em>Competitive Intel Owner: [Name] • Review Cadence: Quarterly • Last Updated: [Date]</em></p>`,
  },
  {
    id: 'sales-deck',
    name: 'Sales Deck',
    description: 'Persuasive presentation for customer pitches',
    icon: '💼',
    category: 'sales',
    content: `<h1>💼 Sales Deck: [Company Name]</h1>
<p style="text-align: center"><em>Transforming [Industry] with [Product/Service]</em></p>
<p></p>
<blockquote><p><strong>🎯 How to use this deck:</strong> Customize each slide to your prospect. Lead with their pain points, show relevant case studies, and always end with a clear next step.</p></blockquote>
<p></p>
<hr>
<p></p>
<h1>🔥 The Problem</h1>
<p>Companies in [industry] face significant challenges that cost them time, money, and competitive advantage:</p>
<p></p>
<table>
  <tbody>
    <tr>
      <th><p>Challenge</p></th>
      <th><p>Impact</p></th>
      <th><p>Cost</p></th>
    </tr>
    <tr>
      <td><p>⚠️ <strong>Challenge 1</strong></p></td>
      <td><p>Description of business pain</p></td>
      <td><p>$X/year lost</p></td>
    </tr>
    <tr>
      <td><p>⚠️ <strong>Challenge 2</strong></p></td>
      <td><p>Description of inefficiency</p></td>
      <td><p>X hours wasted</p></td>
    </tr>
    <tr>
      <td><p>⚠️ <strong>Challenge 3</strong></p></td>
      <td><p>Description of missed opportunity</p></td>
      <td><p>X% growth missed</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<blockquote><p><em>"Insert powerful customer quote about the problem they faced before finding your solution"</em><br>— [Name], [Title] at [Company]</p></blockquote>
<p></p>
<hr>
<p></p>
<h1>💡 The Solution</h1>
<p><strong>[Product Name]</strong> is a [category] that helps [target customer] achieve [key benefit] without [common pain point].</p>
<p></p>
<h2>How It Works</h2>
<ol>
  <li><p><strong>🔌 Connect:</strong> Simple description of first step — integrates in minutes</p></li>
  <li><p><strong>⚡ Configure:</strong> Simple description of setup — no code required</p></li>
  <li><p><strong>🚀 Launch:</strong> Simple description of outcome — see results in days</p></li>
</ol>
<p></p>
<hr>
<p></p>
<h1>✨ Key Features</h1>
<table>
  <tbody>
    <tr>
      <th><p>Feature</p></th>
      <th><p>What It Does</p></th>
      <th><p>Why It Matters</p></th>
    </tr>
    <tr>
      <td><p>🎯 <strong>Feature 1</strong></p></td>
      <td><p>Description of capability</p></td>
      <td><p>Saves X hours/week</p></td>
    </tr>
    <tr>
      <td><p>⚡ <strong>Feature 2</strong></p></td>
      <td><p>Description of capability</p></td>
      <td><p>Increases Y by X%</p></td>
    </tr>
    <tr>
      <td><p>🔒 <strong>Feature 3</strong></p></td>
      <td><p>Description of capability</p></td>
      <td><p>Reduces Z by X%</p></td>
    </tr>
    <tr>
      <td><p>📊 <strong>Feature 4</strong></p></td>
      <td><p>Description of capability</p></td>
      <td><p>Full visibility into [area]</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<hr>
<p></p>
<h1>🏆 Customer Success Story</h1>
<h2>Case Study: [Company Name]</h2>
<table>
  <tbody>
    <tr>
      <td><p><strong>Industry</strong></p></td>
      <td><p>[Industry]</p></td>
    </tr>
    <tr>
      <td><p><strong>Company Size</strong></p></td>
      <td><p>[X] employees</p></td>
    </tr>
    <tr>
      <td><p><strong>Challenge</strong></p></td>
      <td><p>Brief description of their problem</p></td>
    </tr>
    <tr>
      <td><p><strong>Solution</strong></p></td>
      <td><p>How they used our product</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h3>📈 Results</h3>
<table>
  <tbody>
    <tr>
      <th><p>Metric</p></th>
      <th><p>Before</p></th>
      <th><p>After</p></th>
      <th><p>Impact</p></th>
    </tr>
    <tr>
      <td><p>Revenue</p></td>
      <td><p>$X</p></td>
      <td><p>$Y</p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">↑ X% increase</mark></p></td>
    </tr>
    <tr>
      <td><p>Time Savings</p></td>
      <td><p>X hrs/wk</p></td>
      <td><p>Y hrs/wk</p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">↓ X% reduction</mark></p></td>
    </tr>
    <tr>
      <td><p>Cost</p></td>
      <td><p>$X/mo</p></td>
      <td><p>$Y/mo</p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">$Z saved annually</mark></p></td>
    </tr>
  </tbody>
</table>
<p></p>
<blockquote><p><em>"Insert powerful testimonial from satisfied customer about the transformation"</em><br>— [Name], [Title] at [Company]</p></blockquote>
<p></p>
<hr>
<p></p>
<h1>🆚 Why Choose Us?</h1>
<table>
  <tbody>
    <tr>
      <th><p>Factor</p></th>
      <th><p>🏆 Us</p></th>
      <th><p>Competitors</p></th>
    </tr>
    <tr>
      <td><p>⚡ Implementation</p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">✅ 1 week setup</mark></p></td>
      <td><p>❌ 3+ months</p></td>
    </tr>
    <tr>
      <td><p>💰 Price</p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">✅ $X/month</mark></p></td>
      <td><p>💸 $Y/month</p></td>
    </tr>
    <tr>
      <td><p>🎧 Support</p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">✅ 24/7 chat + phone</mark></p></td>
      <td><p>⚠️ Email only</p></td>
    </tr>
    <tr>
      <td><p>🔌 Integrations</p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">✅ X+ native apps</mark></p></td>
      <td><p>⚠️ Limited</p></td>
    </tr>
    <tr>
      <td><p>📈 Time to ROI</p></td>
      <td><p><mark style="background-color: #bbf7d0; color: inherit">✅ 90 days</mark></p></td>
      <td><p>❌ 6+ months</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<hr>
<p></p>
<h1>💳 Pricing & Packages</h1>
<table>
  <tbody>
    <tr>
      <th><p>Plan</p></th>
      <th><p>Starter</p></th>
      <th><p>Professional ⭐</p></th>
      <th><p>Enterprise</p></th>
    </tr>
    <tr>
      <td><p><strong>Price</strong></p></td>
      <td><p>$X/mo</p></td>
      <td><p>$X/mo</p></td>
      <td><p>Custom</p></td>
    </tr>
    <tr>
      <td><p>Users</p></td>
      <td><p>Up to 5</p></td>
      <td><p>Up to 25</p></td>
      <td><p>Unlimited</p></td>
    </tr>
    <tr>
      <td><p>Core Features</p></td>
      <td><p>✅</p></td>
      <td><p>✅</p></td>
      <td><p>✅</p></td>
    </tr>
    <tr>
      <td><p>Advanced Features</p></td>
      <td><p>—</p></td>
      <td><p>✅</p></td>
      <td><p>✅</p></td>
    </tr>
    <tr>
      <td><p>Priority Support</p></td>
      <td><p>—</p></td>
      <td><p>✅</p></td>
      <td><p>✅</p></td>
    </tr>
    <tr>
      <td><p>Custom Integrations</p></td>
      <td><p>—</p></td>
      <td><p>—</p></td>
      <td><p>✅</p></td>
    </tr>
    <tr>
      <td><p>SLA</p></td>
      <td><p>—</p></td>
      <td><p>99.9%</p></td>
      <td><p>99.99%</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<p style="text-align: center"><em>✨ All plans include 14-day free trial • No credit card required • Cancel anytime</em></p>
<p></p>
<hr>
<p></p>
<h1>🚀 Implementation</h1>
<h2>Getting Started (Week 1)</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>📞 Kickoff call with dedicated success manager</p></li>
  <li data-checked="false" data-type="taskItem"><p>⚙️ Account setup and configuration</p></li>
  <li data-checked="false" data-type="taskItem"><p>🔌 Connect your existing tools and import data</p></li>
</ul>
<p></p>
<h2>Training & Onboarding (Week 2)</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>🎓 Team training sessions (customized to your workflow)</p></li>
  <li data-checked="false" data-type="taskItem"><p>📚 Best practices workshop</p></li>
  <li data-checked="false" data-type="taskItem"><p>📖 Access to help docs and video tutorials</p></li>
</ul>
<p></p>
<h2>Go-Live & Optimization (Week 3+)</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>🚀 Launch to full team</p></li>
  <li data-checked="false" data-type="taskItem"><p>📊 Monitor adoption and usage</p></li>
  <li data-checked="false" data-type="taskItem"><p>🔄 Ongoing optimization and quarterly reviews</p></li>
</ul>
<p></p>
<hr>
<p></p>
<h1>🏢 Trusted by Leading Companies</h1>
<p style="text-align: center"><em>[Insert logos of notable customers here]</em></p>
<p></p>
<p style="text-align: center">Join <strong>X+ companies</strong> using [Product Name] to [key outcome]</p>
<p></p>
<table>
  <tbody>
    <tr>
      <td style="text-align: center"><p><strong>X+</strong><br>Active Customers</p></td>
      <td style="text-align: center"><p><strong>X%</strong><br>Avg NPS Score</p></td>
      <td style="text-align: center"><p><strong>$X</strong><br>Avg First-Year ROI</p></td>
      <td style="text-align: center"><p><strong>X%</strong><br>YoY Growth</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<hr>
<p></p>
<h1>🔒 Security & Compliance</h1>
<p>Enterprise-grade security protecting your data:</p>
<ul>
  <li><p>✅ <strong>SOC 2 Type II</strong> certified</p></li>
  <li><p>✅ <strong>GDPR</strong> compliant</p></li>
  <li><p>✅ <strong>ISO 27001</strong> certified</p></li>
  <li><p>✅ <strong>HIPAA</strong> compliant (Enterprise)</p></li>
  <li><p>✅ <strong>256-bit encryption</strong> at rest and in transit</p></li>
  <li><p>✅ <strong>SSO/SAML</strong> support</p></li>
  <li><p>✅ <strong>99.99% uptime</strong> SLA</p></li>
</ul>
<p></p>
<hr>
<p></p>
<h1>👉 Next Steps</h1>
<h2>Ready to Get Started?</h2>
<ol>
  <li><p><strong>📅 Schedule a Demo</strong> — See the product in action with your use case</p></li>
  <li><p><strong>🧪 Start Free Trial</strong> — Test drive with your team for 14 days</p></li>
  <li><p><strong>💬 Talk to Sales</strong> — Discuss custom requirements and pricing</p></li>
</ol>
<p></p>
<h2>📞 Contact Information</h2>
<table>
  <tbody>
    <tr>
      <td><p><strong>Your Rep</strong></p></td>
      <td><p>[Name], [Title]</p></td>
    </tr>
    <tr>
      <td><p><strong>Email</strong></p></td>
      <td><p>sales@company.com</p></td>
    </tr>
    <tr>
      <td><p><strong>Phone</strong></p></td>
      <td><p>+1 (XXX) XXX-XXXX</p></td>
    </tr>
    <tr>
      <td><p><strong>Demo Booking</strong></p></td>
      <td><p>company.com/demo</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<p style="text-align: center"><strong>Let's transform your [process/workflow] together! 🚀</strong></p>`,
  },
  {
    id: 'ideal-customer-profile',
    name: 'Ideal Customer Profile (ICP)',
    description: 'Define your perfect customer for targeted sales and marketing',
    icon: '🎯',
    category: 'sales',
    content: `<h1>🎯 Ideal Customer Profile (ICP)</h1>
<p><em>Define who you're selling to — and who you're not</em></p>
<p></p>
<blockquote><p><strong>💡 Why this matters:</strong> A clear ICP helps your entire team focus resources on prospects most likely to convert, succeed, and become advocates.</p></blockquote>
<p></p>
<h2>📋 ICP Summary</h2>
<table>
  <tbody>
    <tr>
      <td><p><strong>ICP Name</strong></p></td>
      <td><p>[e.g., "Growth-Stage B2B SaaS"]</p></td>
    </tr>
    <tr>
      <td><p><strong>Primary Industry</strong></p></td>
      <td><p>[e.g., Software, Healthcare, Finance]</p></td>
    </tr>
    <tr>
      <td><p><strong>Target Geo</strong></p></td>
      <td><p>[e.g., North America, EMEA]</p></td>
    </tr>
    <tr>
      <td><p><strong>Fit Score</strong></p></td>
      <td><p>☐ Tier 1 (Best Fit)  ☐ Tier 2  ☐ Tier 3</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>🏢 Company Firmographics</h2>
<table>
  <tbody>
    <tr>
      <th><p>Attribute</p></th>
      <th><p>Ideal Range</p></th>
      <th><p>Red Flags</p></th>
    </tr>
    <tr>
      <td><p><strong>Company Size</strong></p></td>
      <td><p>50-500 employees</p></td>
      <td><p>&lt;10 or &gt;5000 employees</p></td>
    </tr>
    <tr>
      <td><p><strong>Annual Revenue</strong></p></td>
      <td><p>$5M - $100M ARR</p></td>
      <td><p>&lt;$1M or enterprise bureaucracy</p></td>
    </tr>
    <tr>
      <td><p><strong>Growth Stage</strong></p></td>
      <td><p>Series A - Series C</p></td>
      <td><p>Bootstrapped with no budget</p></td>
    </tr>
    <tr>
      <td><p><strong>Industry</strong></p></td>
      <td><p>SaaS, Fintech, Healthtech</p></td>
      <td><p>Government, heavy regulation</p></td>
    </tr>
    <tr>
      <td><p><strong>Tech Stack</strong></p></td>
      <td><p>Modern cloud-native tools</p></td>
      <td><p>Legacy on-premise only</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>👥 Buying Committee</h2>
<h3>💰 Economic Buyer</h3>
<table>
  <tbody>
    <tr>
      <td><p><strong>Title</strong></p></td>
      <td><p>VP of [Function] / C-Level</p></td>
    </tr>
    <tr>
      <td><p><strong>Priorities</strong></p></td>
      <td><p>ROI, cost savings, revenue growth</p></td>
    </tr>
    <tr>
      <td><p><strong>Concerns</strong></p></td>
      <td><p>Budget, risk, vendor stability</p></td>
    </tr>
    <tr>
      <td><p><strong>Content Preferences</strong></p></td>
      <td><p>Executive summaries, ROI calculators</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h3>⚙️ Technical Buyer</h3>
<table>
  <tbody>
    <tr>
      <td><p><strong>Title</strong></p></td>
      <td><p>Director/Manager of [Tech/Ops]</p></td>
    </tr>
    <tr>
      <td><p><strong>Priorities</strong></p></td>
      <td><p>Integration, security, scalability</p></td>
    </tr>
    <tr>
      <td><p><strong>Concerns</strong></p></td>
      <td><p>Implementation time, tech debt</p></td>
    </tr>
    <tr>
      <td><p><strong>Content Preferences</strong></p></td>
      <td><p>Documentation, API docs, security whitepapers</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h3>🏆 Champion / End User</h3>
<table>
  <tbody>
    <tr>
      <td><p><strong>Title</strong></p></td>
      <td><p>[Individual Contributor / Manager]</p></td>
    </tr>
    <tr>
      <td><p><strong>Priorities</strong></p></td>
      <td><p>Ease of use, time savings, career growth</p></td>
    </tr>
    <tr>
      <td><p><strong>Concerns</strong></p></td>
      <td><p>Learning curve, workflow disruption</p></td>
    </tr>
    <tr>
      <td><p><strong>Content Preferences</strong></p></td>
      <td><p>Tutorials, videos, community</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>🔥 Pain Points & Triggers</h2>
<h3>Primary Pain Points</h3>
<ol>
  <li><p><strong>Pain 1:</strong> Description of critical challenge they face</p></li>
  <li><p><strong>Pain 2:</strong> Description of costly inefficiency</p></li>
  <li><p><strong>Pain 3:</strong> Description of missed opportunity</p></li>
</ol>
<p></p>
<h3>Buying Triggers</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>🚀 Just raised funding round</p></li>
  <li data-checked="false" data-type="taskItem"><p>👤 New leadership hire (VP/C-level)</p></li>
  <li data-checked="false" data-type="taskItem"><p>📈 Rapid headcount growth (>20% YoY)</p></li>
  <li data-checked="false" data-type="taskItem"><p>🔄 Contract renewal with competitor coming up</p></li>
  <li data-checked="false" data-type="taskItem"><p>⚠️ Compliance/regulatory deadline</p></li>
</ul>
<p></p>
<h2>🎯 Goals & Success Metrics</h2>
<table>
  <tbody>
    <tr>
      <th><p>Their Goal</p></th>
      <th><p>How We Help</p></th>
      <th><p>Success Metric</p></th>
    </tr>
    <tr>
      <td><p>Increase revenue</p></td>
      <td><p>[How our product helps]</p></td>
      <td><p>X% revenue increase</p></td>
    </tr>
    <tr>
      <td><p>Reduce costs</p></td>
      <td><p>[How our product helps]</p></td>
      <td><p>$X saved annually</p></td>
    </tr>
    <tr>
      <td><p>Improve efficiency</p></td>
      <td><p>[How our product helps]</p></td>
      <td><p>X hours saved/week</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>🛒 Buying Process</h2>
<table>
  <tbody>
    <tr>
      <td><p><strong>Typical Sales Cycle</strong></p></td>
      <td><p>X-Y weeks</p></td>
    </tr>
    <tr>
      <td><p><strong>Decision Process</strong></p></td>
      <td><p>[Describe typical evaluation steps]</p></td>
    </tr>
    <tr>
      <td><p><strong>Procurement</strong></p></td>
      <td><p>☐ Credit card  ☐ PO required  ☐ Legal review</p></td>
    </tr>
    <tr>
      <td><p><strong>Budget Cycle</strong></p></td>
      <td><p>[Quarterly / Annual / Ad-hoc]</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>❌ Negative Fit Indicators</h2>
<p>Don't pursue if they have:</p>
<ul>
  <li><p>🚫 Less than $X annual budget for this category</p></li>
  <li><p>🚫 Recently signed long-term contract with competitor</p></li>
  <li><p>🚫 No dedicated owner for this function</p></li>
  <li><p>🚫 Incompatible tech stack requirements</p></li>
  <li><p>🚫 History of failed implementations</p></li>
</ul>
<p></p>
<h2>📝 Qualification Questions</h2>
<ol>
  <li><p>What's your current solution for [problem area]?</p></li>
  <li><p>What triggered you to evaluate new options now?</p></li>
  <li><p>Who else would be involved in this decision?</p></li>
  <li><p>What's your timeline for making a change?</p></li>
  <li><p>Do you have budget allocated for this?</p></li>
</ol>
<p></p>
<hr>
<p><em>ICP Owner: [Name] • Review Cadence: Quarterly • Last Updated: [Date]</em></p>`,
  },
  {
    id: 'campaign-plan',
    name: 'Marketing Campaign Plan',
    description: 'Strategic plan for marketing campaign execution',
    icon: '📢',
    category: 'marketing',
    content: `<h1>📢 Marketing Campaign Plan</h1>
<p><em>From strategy to execution — your complete campaign playbook</em></p>
<p></p>
<blockquote><p><strong>🎯 Campaign at a glance:</strong> [One sentence describing the campaign's core objective and expected impact]</p></blockquote>
<p></p>
<h2>📋 Campaign Overview</h2>
<table>
  <tbody>
    <tr>
      <td><p><strong>Campaign Name</strong></p></td>
      <td><p>[Campaign Name]</p></td>
    </tr>
    <tr>
      <td><p><strong>Campaign Type</strong></p></td>
      <td><p>☐ Awareness  ☐ Lead Gen  ☐ Product Launch  ☐ Event  ☐ ABM</p></td>
    </tr>
    <tr>
      <td><p><strong>Start Date</strong></p></td>
      <td><p>[Date]</p></td>
    </tr>
    <tr>
      <td><p><strong>End Date</strong></p></td>
      <td><p>[Date]</p></td>
    </tr>
    <tr>
      <td><p><strong>Campaign Owner</strong></p></td>
      <td><p>[Name]</p></td>
    </tr>
    <tr>
      <td><p><strong>Total Budget</strong></p></td>
      <td><p>$X</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>🎯 Campaign Objectives</h2>
<table>
  <tbody>
    <tr>
      <th><p>Objective</p></th>
      <th><p>KPI</p></th>
      <th><p>Target</p></th>
      <th><p>Measurement</p></th>
    </tr>
    <tr>
      <td><p>📣 Awareness</p></td>
      <td><p>Impressions / Reach</p></td>
      <td><p>X</p></td>
      <td><p>Social / Ads platform</p></td>
    </tr>
    <tr>
      <td><p>💬 Engagement</p></td>
      <td><p>CTR / Engagement Rate</p></td>
      <td><p>X%</p></td>
      <td><p>Analytics</p></td>
    </tr>
    <tr>
      <td><p>📥 Lead Gen</p></td>
      <td><p>MQLs Generated</p></td>
      <td><p>X leads</p></td>
      <td><p>CRM</p></td>
    </tr>
    <tr>
      <td><p>💰 Pipeline</p></td>
      <td><p>Pipeline Created</p></td>
      <td><p>$X</p></td>
      <td><p>CRM</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>👥 Target Audience</h2>
<h3>Primary Audience</h3>
<ul>
  <li><p><strong>Who:</strong> [Job titles, roles]</p></li>
  <li><p><strong>Industries:</strong> [Target verticals]</p></li>
  <li><p><strong>Company Size:</strong> [Employee count / revenue range]</p></li>
  <li><p><strong>Pain Points:</strong> [What keeps them up at night]</p></li>
</ul>
<p></p>
<h3>Secondary Audience</h3>
<ul>
  <li><p><strong>Who:</strong> [Influencers, other stakeholders]</p></li>
  <li><p><strong>Why Target:</strong> [Their role in buying process]</p></li>
</ul>
<p></p>
<h2>💬 Messaging Framework</h2>
<h3>Core Message</h3>
<blockquote><p>[One sentence that captures the essence of your campaign message]</p></blockquote>
<p></p>
<h3>Supporting Messages</h3>
<ol>
  <li><p><strong>Pillar 1:</strong> [Message about benefit/feature 1]</p></li>
  <li><p><strong>Pillar 2:</strong> [Message about benefit/feature 2]</p></li>
  <li><p><strong>Pillar 3:</strong> [Message about benefit/feature 3]</p></li>
</ol>
<p></p>
<h3>Key Proof Points</h3>
<ul>
  <li><p>📊 [Statistic or data point]</p></li>
  <li><p>💬 [Customer quote or testimonial]</p></li>
  <li><p>🏆 [Award or recognition]</p></li>
</ul>
<p></p>
<h2>📣 Channel Strategy</h2>
<table>
  <tbody>
    <tr>
      <th><p>Channel</p></th>
      <th><p>Tactics</p></th>
      <th><p>Budget</p></th>
      <th><p>Owner</p></th>
    </tr>
    <tr>
      <td><p>📧 <strong>Email</strong></p></td>
      <td><p>X-part nurture sequence, newsletter feature</p></td>
      <td><p>$X</p></td>
      <td><p>[Name]</p></td>
    </tr>
    <tr>
      <td><p>📱 <strong>Social (Organic)</strong></p></td>
      <td><p>LinkedIn posts, Twitter thread, employee advocacy</p></td>
      <td><p>$X</p></td>
      <td><p>[Name]</p></td>
    </tr>
    <tr>
      <td><p>💰 <strong>Paid Social</strong></p></td>
      <td><p>LinkedIn Ads, retargeting</p></td>
      <td><p>$X</p></td>
      <td><p>[Name]</p></td>
    </tr>
    <tr>
      <td><p>🔍 <strong>Paid Search</strong></p></td>
      <td><p>Google Ads, branded + non-branded</p></td>
      <td><p>$X</p></td>
      <td><p>[Name]</p></td>
    </tr>
    <tr>
      <td><p>📝 <strong>Content</strong></p></td>
      <td><p>Blog post, whitepaper, case study</p></td>
      <td><p>$X</p></td>
      <td><p>[Name]</p></td>
    </tr>
    <tr>
      <td><p>🎤 <strong>Events</strong></p></td>
      <td><p>Webinar, virtual event, trade show</p></td>
      <td><p>$X</p></td>
      <td><p>[Name]</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>📅 Campaign Timeline</h2>
<h3>Phase 1: Pre-Launch (Week -2 to -1)</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Finalize creative assets</p></li>
  <li data-checked="false" data-type="taskItem"><p>Set up tracking and analytics</p></li>
  <li data-checked="false" data-type="taskItem"><p>Build landing pages and forms</p></li>
  <li data-checked="false" data-type="taskItem"><p>Schedule emails and social posts</p></li>
  <li data-checked="false" data-type="taskItem"><p>Brief sales team on campaign</p></li>
</ul>
<p></p>
<h3>Phase 2: Launch (Week 1-2)</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Activate paid campaigns</p></li>
  <li data-checked="false" data-type="taskItem"><p>Send launch emails</p></li>
  <li data-checked="false" data-type="taskItem"><p>Publish organic social content</p></li>
  <li data-checked="false" data-type="taskItem"><p>Monitor initial performance</p></li>
  <li data-checked="false" data-type="taskItem"><p>A/B test ad creative</p></li>
</ul>
<p></p>
<h3>Phase 3: Optimize (Week 3-4)</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Analyze performance data</p></li>
  <li data-checked="false" data-type="taskItem"><p>Optimize underperforming channels</p></li>
  <li data-checked="false" data-type="taskItem"><p>Double down on winners</p></li>
  <li data-checked="false" data-type="taskItem"><p>Launch retargeting campaigns</p></li>
</ul>
<p></p>
<h3>Phase 4: Wrap-up (Week 5)</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Wind down paid spend</p></li>
  <li data-checked="false" data-type="taskItem"><p>Final lead handoff to sales</p></li>
  <li data-checked="false" data-type="taskItem"><p>Compile performance report</p></li>
  <li data-checked="false" data-type="taskItem"><p>Document learnings</p></li>
</ul>
<p></p>
<h2>🎨 Creative Assets Checklist</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Landing page(s)</p></li>
  <li data-checked="false" data-type="taskItem"><p>Email templates (X emails)</p></li>
  <li data-checked="false" data-type="taskItem"><p>Social media graphics (X sizes)</p></li>
  <li data-checked="false" data-type="taskItem"><p>Display ad banners</p></li>
  <li data-checked="false" data-type="taskItem"><p>Video content</p></li>
  <li data-checked="false" data-type="taskItem"><p>Blog post / Article</p></li>
  <li data-checked="false" data-type="taskItem"><p>Lead magnet / Gated content</p></li>
  <li data-checked="false" data-type="taskItem"><p>Sales enablement materials</p></li>
</ul>
<p></p>
<h2>💰 Budget Breakdown</h2>
<table>
  <tbody>
    <tr>
      <th><p>Category</p></th>
      <th><p>Planned</p></th>
      <th><p>Actual</p></th>
      <th><p>Variance</p></th>
    </tr>
    <tr>
      <td><p>Paid Media</p></td>
      <td><p>$X</p></td>
      <td><p>$—</p></td>
      <td><p>—</p></td>
    </tr>
    <tr>
      <td><p>Creative/Design</p></td>
      <td><p>$X</p></td>
      <td><p>$—</p></td>
      <td><p>—</p></td>
    </tr>
    <tr>
      <td><p>Content Production</p></td>
      <td><p>$X</p></td>
      <td><p>$—</p></td>
      <td><p>—</p></td>
    </tr>
    <tr>
      <td><p>Tools/Software</p></td>
      <td><p>$X</p></td>
      <td><p>$—</p></td>
      <td><p>—</p></td>
    </tr>
    <tr>
      <td><p>Events</p></td>
      <td><p>$X</p></td>
      <td><p>$—</p></td>
      <td><p>—</p></td>
    </tr>
    <tr>
      <td><p><strong>TOTAL</strong></p></td>
      <td><p><strong>$X</strong></p></td>
      <td><p><strong>$—</strong></p></td>
      <td><p>—</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>📊 Success Metrics & Reporting</h2>
<h3>Weekly Check-ins</h3>
<ul>
  <li><p>Impressions and reach</p></li>
  <li><p>Engagement metrics (CTR, clicks)</p></li>
  <li><p>Lead volume and quality</p></li>
  <li><p>Cost per lead (CPL)</p></li>
</ul>
<p></p>
<h3>Final Report Metrics</h3>
<ul>
  <li><p>Total leads generated</p></li>
  <li><p>Lead-to-MQL conversion rate</p></li>
  <li><p>Pipeline influenced</p></li>
  <li><p>Revenue attributed</p></li>
  <li><p>ROI calculation</p></li>
</ul>
<p></p>
<hr>
<p><em>Campaign Owner: [Name] • Stakeholders: [Names] • Last Updated: [Date]</em></p>`,
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes Template',
    description: 'Structured notes for productive meetings',
    icon: '📝',
    category: 'operations',
    content: `<h1>📝 Meeting Notes</h1>
<p></p>
<h2>📋 Meeting Details</h2>
<table>
  <tbody>
    <tr>
      <td><p><strong>Date</strong></p></td>
      <td><p>[Date]</p></td>
    </tr>
    <tr>
      <td><p><strong>Time</strong></p></td>
      <td><p>[Start Time] - [End Time]</p></td>
    </tr>
    <tr>
      <td><p><strong>Location</strong></p></td>
      <td><p>[Room / Video Link]</p></td>
    </tr>
    <tr>
      <td><p><strong>Meeting Type</strong></p></td>
      <td><p>☐ 1:1  ☐ Team  ☐ Client  ☐ All-Hands  ☐ Other</p></td>
    </tr>
    <tr>
      <td><p><strong>Organizer</strong></p></td>
      <td><p>[Name]</p></td>
    </tr>
    <tr>
      <td><p><strong>Note Taker</strong></p></td>
      <td><p>[Name]</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>👥 Attendees</h2>
<ul>
  <li><p>✅ [Name] — [Role/Company]</p></li>
  <li><p>✅ [Name] — [Role/Company]</p></li>
  <li><p>✅ [Name] — [Role/Company]</p></li>
  <li><p>❌ [Name] — [Role/Company] (Absent)</p></li>
</ul>
<p></p>
<h2>🎯 Meeting Objective</h2>
<p>[What is the purpose of this meeting? What decision needs to be made or what outcome is expected?]</p>
<p></p>
<h2>📋 Agenda</h2>
<ol>
  <li><p><strong>[Topic 1]</strong> — [X min] — [Owner]</p></li>
  <li><p><strong>[Topic 2]</strong> — [X min] — [Owner]</p></li>
  <li><p><strong>[Topic 3]</strong> — [X min] — [Owner]</p></li>
  <li><p><strong>Next Steps & Action Items</strong> — [X min]</p></li>
</ol>
<p></p>
<hr>
<p></p>
<h2>📝 Discussion Notes</h2>
<h3>Topic 1: [Title]</h3>
<p><strong>Key Points:</strong></p>
<ul>
  <li><p>[Point discussed]</p></li>
  <li><p>[Point discussed]</p></li>
  <li><p>[Point discussed]</p></li>
</ul>
<p></p>
<p><strong>Decisions Made:</strong></p>
<ul>
  <li><p>✅ [Decision]</p></li>
</ul>
<p></p>
<h3>Topic 2: [Title]</h3>
<p><strong>Key Points:</strong></p>
<ul>
  <li><p>[Point discussed]</p></li>
  <li><p>[Point discussed]</p></li>
</ul>
<p></p>
<p><strong>Decisions Made:</strong></p>
<ul>
  <li><p>✅ [Decision]</p></li>
</ul>
<p></p>
<h3>Topic 3: [Title]</h3>
<p><strong>Key Points:</strong></p>
<ul>
  <li><p>[Point discussed]</p></li>
  <li><p>[Point discussed]</p></li>
</ul>
<p></p>
<p><strong>Open Questions:</strong></p>
<ul>
  <li><p>❓ [Question that needs follow-up]</p></li>
</ul>
<p></p>
<hr>
<p></p>
<h2>✅ Action Items</h2>
<table>
  <tbody>
    <tr>
      <th><p>Action</p></th>
      <th><p>Owner</p></th>
      <th><p>Due Date</p></th>
      <th><p>Status</p></th>
    </tr>
    <tr>
      <td><p>[Action item description]</p></td>
      <td><p>[Name]</p></td>
      <td><p>[Date]</p></td>
      <td><p>⏳ Pending</p></td>
    </tr>
    <tr>
      <td><p>[Action item description]</p></td>
      <td><p>[Name]</p></td>
      <td><p>[Date]</p></td>
      <td><p>⏳ Pending</p></td>
    </tr>
    <tr>
      <td><p>[Action item description]</p></td>
      <td><p>[Name]</p></td>
      <td><p>[Date]</p></td>
      <td><p>⏳ Pending</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>📅 Next Meeting</h2>
<ul>
  <li><p><strong>Date:</strong> [Next meeting date]</p></li>
  <li><p><strong>Time:</strong> [Time]</p></li>
  <li><p><strong>Agenda Preview:</strong> [Topics to cover]</p></li>
</ul>
<p></p>
<hr>
<p><em>Notes by: [Name] • Distributed to: [Names/Team] • Date: [Date]</em></p>`,
  },
  {
    id: 'quarterly-business-review',
    name: 'Quarterly Business Review (QBR)',
    description: 'Comprehensive quarterly performance review template',
    icon: '📈',
    category: 'strategy',
    content: `<h1>📈 Quarterly Business Review</h1>
<p><em>[Quarter] [Year] Performance Review</em></p>
<p></p>
<h2>📋 Executive Summary</h2>
<table>
  <tbody>
    <tr>
      <td><p><strong>Quarter</strong></p></td>
      <td><p>Q[X] [Year]</p></td>
    </tr>
    <tr>
      <td><p><strong>Report Date</strong></p></td>
      <td><p>[Date]</p></td>
    </tr>
    <tr>
      <td><p><strong>Prepared By</strong></p></td>
      <td><p>[Name, Title]</p></td>
    </tr>
    <tr>
      <td><p><strong>Overall Rating</strong></p></td>
      <td><p>☐ 🟢 On Track  ☐ 🟡 At Risk  ☐ 🔴 Off Track</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<blockquote><p><strong>Quarter Highlights:</strong> [2-3 sentence summary of the quarter's most important outcomes, wins, and challenges]</p></blockquote>
<p></p>
<h2>📊 Key Metrics Dashboard</h2>
<table>
  <tbody>
    <tr>
      <th><p>Metric</p></th>
      <th><p>Q[X-1] Actual</p></th>
      <th><p>Q[X] Target</p></th>
      <th><p>Q[X] Actual</p></th>
      <th><p>Status</p></th>
    </tr>
    <tr>
      <td><p>💰 <strong>Revenue</strong></p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
      <td><p>🟢 / 🟡 / 🔴</p></td>
    </tr>
    <tr>
      <td><p>👥 <strong>New Customers</strong></p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>🟢 / 🟡 / 🔴</p></td>
    </tr>
    <tr>
      <td><p>🔄 <strong>Churn Rate</strong></p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p>🟢 / 🟡 / 🔴</p></td>
    </tr>
    <tr>
      <td><p>⭐ <strong>NPS Score</strong></p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>🟢 / 🟡 / 🔴</p></td>
    </tr>
    <tr>
      <td><p>📈 <strong>MRR Growth</strong></p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p>🟢 / 🟡 / 🔴</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>🏆 Quarter Wins</h2>
<ol>
  <li><p><strong>Win 1:</strong> Description of major achievement and its impact</p></li>
  <li><p><strong>Win 2:</strong> Description of major achievement and its impact</p></li>
  <li><p><strong>Win 3:</strong> Description of major achievement and its impact</p></li>
</ol>
<p></p>
<h2>⚠️ Challenges & Learnings</h2>
<table>
  <tbody>
    <tr>
      <th><p>Challenge</p></th>
      <th><p>Impact</p></th>
      <th><p>Learning / Action Taken</p></th>
    </tr>
    <tr>
      <td><p>[Challenge 1]</p></td>
      <td><p>[Impact on metrics/goals]</p></td>
      <td><p>[What we learned / how we responded]</p></td>
    </tr>
    <tr>
      <td><p>[Challenge 2]</p></td>
      <td><p>[Impact on metrics/goals]</p></td>
      <td><p>[What we learned / how we responded]</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>📊 Department Performance</h2>
<h3>💼 Sales</h3>
<ul>
  <li><p><strong>Pipeline:</strong> $X (X% of target)</p></li>
  <li><p><strong>Closed Won:</strong> $X (X deals)</p></li>
  <li><p><strong>Win Rate:</strong> X%</p></li>
  <li><p><strong>Key Wins:</strong> [Notable deals]</p></li>
</ul>
<p></p>
<h3>📣 Marketing</h3>
<ul>
  <li><p><strong>Leads Generated:</strong> X (X% of target)</p></li>
  <li><p><strong>MQL → SQL Rate:</strong> X%</p></li>
  <li><p><strong>CAC:</strong> $X</p></li>
  <li><p><strong>Top Campaigns:</strong> [Best performing campaigns]</p></li>
</ul>
<p></p>
<h3>🎯 Product</h3>
<ul>
  <li><p><strong>Features Shipped:</strong> X</p></li>
  <li><p><strong>Adoption Rate:</strong> X%</p></li>
  <li><p><strong>Bug Count:</strong> X → X</p></li>
  <li><p><strong>Key Launches:</strong> [Major features]</p></li>
</ul>
<p></p>
<h3>🤝 Customer Success</h3>
<ul>
  <li><p><strong>NPS:</strong> X (△ X from last quarter)</p></li>
  <li><p><strong>Retention Rate:</strong> X%</p></li>
  <li><p><strong>Expansion Revenue:</strong> $X</p></li>
  <li><p><strong>Support Tickets:</strong> X (Avg resolution: X hrs)</p></li>
</ul>
<p></p>
<h2>🔮 Next Quarter Focus</h2>
<h3>Top 3 Priorities</h3>
<ol>
  <li><p><strong>Priority 1:</strong> Description and expected outcome</p></li>
  <li><p><strong>Priority 2:</strong> Description and expected outcome</p></li>
  <li><p><strong>Priority 3:</strong> Description and expected outcome</p></li>
</ol>
<p></p>
<h3>Key Initiatives</h3>
<table>
  <tbody>
    <tr>
      <th><p>Initiative</p></th>
      <th><p>Owner</p></th>
      <th><p>Target Date</p></th>
      <th><p>Expected Impact</p></th>
    </tr>
    <tr>
      <td><p>[Initiative 1]</p></td>
      <td><p>[Name]</p></td>
      <td><p>[Date]</p></td>
      <td><p>[Metric impact]</p></td>
    </tr>
    <tr>
      <td><p>[Initiative 2]</p></td>
      <td><p>[Name]</p></td>
      <td><p>[Date]</p></td>
      <td><p>[Metric impact]</p></td>
    </tr>
    <tr>
      <td><p>[Initiative 3]</p></td>
      <td><p>[Name]</p></td>
      <td><p>[Date]</p></td>
      <td><p>[Metric impact]</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>🎯 Next Quarter Targets</h2>
<table>
  <tbody>
    <tr>
      <th><p>Metric</p></th>
      <th><p>Q[X] Actual</p></th>
      <th><p>Q[X+1] Target</p></th>
      <th><p>Growth</p></th>
    </tr>
    <tr>
      <td><p>Revenue</p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
      <td><p>+X%</p></td>
    </tr>
    <tr>
      <td><p>New Customers</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>+X%</p></td>
    </tr>
    <tr>
      <td><p>MRR</p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
      <td><p>+X%</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>❓ Discussion Items</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>[Topic requiring leadership input/decision]</p></li>
  <li data-checked="false" data-type="taskItem"><p>[Resource request or budget discussion]</p></li>
  <li data-checked="false" data-type="taskItem"><p>[Strategic question or concern]</p></li>
</ul>
<p></p>
<hr>
<p><em>Prepared by: [Name] • Review Date: [Date] • Next QBR: [Date]</em></p>`,
  },
];

/**
 * Get template by ID
 */
export const getTemplateById = (id: string): DocumentTemplate | undefined => {
  return GTM_TEMPLATES.find(template => template.id === id);
};

/**
 * Get all template IDs
 */
export const getTemplateIds = (): string[] => {
  return GTM_TEMPLATES.map(template => template.id);
};

/**
 * Get all template names
 */
export const getTemplateNames = (): string[] => {
  return GTM_TEMPLATES.map(template => template.name);
};
