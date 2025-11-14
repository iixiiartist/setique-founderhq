/**
 * GTM Document Templates
 * Pre-built templates for common Go-To-Market documents
 */

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  content: string;
}

export const GTM_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'executive-summary',
    name: 'Executive Summary',
    description: 'High-level overview for leadership and stakeholders',
    icon: '📊',
    content: `<h1>Executive Summary</h1>
<p></p>
<h2>Overview</h2>
<p>Brief description of the initiative, product, or project.</p>
<p></p>
<h2>Key Objectives</h2>
<ul>
  <li><p>Objective 1: Description of primary goal</p></li>
  <li><p>Objective 2: Description of secondary goal</p></li>
  <li><p>Objective 3: Description of tertiary goal</p></li>
</ul>
<p></p>
<h2>Strategic Approach</h2>
<p>High-level strategy and methodology for achieving objectives.</p>
<p></p>
<h2>Target Market</h2>
<p><strong>Primary Audience:</strong> Description of target customer segment</p>
<p><strong>Market Size:</strong> TAM, SAM, SOM estimates</p>
<p><strong>Key Demographics:</strong> Age, industry, company size, etc.</p>
<p></p>
<h2>Value Proposition</h2>
<p>Clear statement of unique value and competitive differentiation.</p>
<p></p>
<h2>Success Metrics</h2>
<table>
  <tbody>
    <tr>
      <th><p>Metric</p></th>
      <th><p>Target</p></th>
      <th><p>Timeline</p></th>
    </tr>
    <tr>
      <td><p>Revenue</p></td>
      <td><p>$X</p></td>
      <td><p>Q4 2025</p></td>
    </tr>
    <tr>
      <td><p>Customer Acquisition</p></td>
      <td><p>X customers</p></td>
      <td><p>Q4 2025</p></td>
    </tr>
    <tr>
      <td><p>Market Share</p></td>
      <td><p>X%</p></td>
      <td><p>2026</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>Resource Requirements</h2>
<p><strong>Budget:</strong> $X total investment</p>
<p><strong>Team:</strong> X FTEs across departments</p>
<p><strong>Timeline:</strong> X months from kickoff to launch</p>
<p></p>
<h2>Risk Assessment</h2>
<ul>
  <li><p><strong>Risk 1:</strong> Description and mitigation strategy</p></li>
  <li><p><strong>Risk 2:</strong> Description and mitigation strategy</p></li>
  <li><p><strong>Risk 3:</strong> Description and mitigation strategy</p></li>
</ul>
<p></p>
<h2>Recommendation</h2>
<p>Clear recommendation for next steps and decision required from stakeholders.</p>`,
  },
  {
    id: 'product-brief',
    name: 'Product Brief',
    description: 'Detailed product specification and requirements',
    icon: '📦',
    content: `<h1>Product Brief</h1>
<p></p>
<h2>Product Overview</h2>
<p><strong>Product Name:</strong> [Product Name]</p>
<p><strong>Version:</strong> [Version Number]</p>
<p><strong>Release Date:</strong> [Target Date]</p>
<p><strong>Owner:</strong> [Product Manager Name]</p>
<p></p>
<h2>Problem Statement</h2>
<p>Clear description of the customer problem or market gap this product addresses.</p>
<p></p>
<h2>Solution</h2>
<p>Detailed explanation of how the product solves the identified problem.</p>
<p></p>
<h2>Target Audience</h2>
<p><strong>Primary Persona:</strong> [Name] - [Title/Role]</p>
<ul>
  <li><p>Demographics: Age, location, company size</p></li>
  <li><p>Pain Points: Key challenges they face</p></li>
  <li><p>Goals: What they want to achieve</p></li>
</ul>
<p><strong>Secondary Persona:</strong> [Name] - [Title/Role]</p>
<ul>
  <li><p>Demographics: Age, location, company size</p></li>
  <li><p>Pain Points: Key challenges they face</p></li>
  <li><p>Goals: What they want to achieve</p></li>
</ul>
<p></p>
<h2>Key Features</h2>
<table>
  <tbody>
    <tr>
      <th><p>Feature</p></th>
      <th><p>Description</p></th>
      <th><p>Priority</p></th>
    </tr>
    <tr>
      <td><p>Feature 1</p></td>
      <td><p>Description of core functionality</p></td>
      <td><p>Must-Have</p></td>
    </tr>
    <tr>
      <td><p>Feature 2</p></td>
      <td><p>Description of important feature</p></td>
      <td><p>Should-Have</p></td>
    </tr>
    <tr>
      <td><p>Feature 3</p></td>
      <td><p>Description of nice-to-have</p></td>
      <td><p>Could-Have</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>User Stories</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>As a [persona], I want to [action] so that [benefit]</p></li>
  <li data-checked="false" data-type="taskItem"><p>As a [persona], I want to [action] so that [benefit]</p></li>
  <li data-checked="false" data-type="taskItem"><p>As a [persona], I want to [action] so that [benefit]</p></li>
</ul>
<p></p>
<h2>Success Metrics</h2>
<ul>
  <li><p><strong>Adoption:</strong> X% of users activate feature within 30 days</p></li>
  <li><p><strong>Engagement:</strong> X% daily active usage</p></li>
  <li><p><strong>Satisfaction:</strong> X+ NPS score</p></li>
  <li><p><strong>Revenue:</strong> $X ARR impact</p></li>
</ul>
<p></p>
<h2>Technical Requirements</h2>
<p><strong>Platform:</strong> Web, iOS, Android</p>
<p><strong>Integrations:</strong> List of required integrations</p>
<p><strong>Performance:</strong> Load time, uptime, scalability requirements</p>
<p><strong>Security:</strong> Compliance, data protection, authentication</p>
<p></p>
<h2>Go-to-Market Plan</h2>
<p><strong>Launch Date:</strong> [Date]</p>
<p><strong>Beta Program:</strong> [Details]</p>
<p><strong>Marketing Campaign:</strong> [Overview]</p>
<p><strong>Sales Enablement:</strong> [Training and materials]</p>
<p></p>
<h2>Dependencies</h2>
<ul>
  <li><p>Engineering: [Team/resource requirements]</p></li>
  <li><p>Design: [Design assets needed]</p></li>
  <li><p>Marketing: [Campaign materials]</p></li>
  <li><p>Legal: [Contracts, compliance]</p></li>
</ul>
<p></p>
<h2>Timeline</h2>
<table>
  <tbody>
    <tr>
      <th><p>Phase</p></th>
      <th><p>Activities</p></th>
      <th><p>Timeline</p></th>
    </tr>
    <tr>
      <td><p>Discovery</p></td>
      <td><p>Research, validation</p></td>
      <td><p>2 weeks</p></td>
    </tr>
    <tr>
      <td><p>Design</p></td>
      <td><p>Wireframes, mockups</p></td>
      <td><p>3 weeks</p></td>
    </tr>
    <tr>
      <td><p>Development</p></td>
      <td><p>Build, test, iterate</p></td>
      <td><p>8 weeks</p></td>
    </tr>
    <tr>
      <td><p>Launch</p></td>
      <td><p>Deploy, monitor, optimize</p></td>
      <td><p>2 weeks</p></td>
    </tr>
  </tbody>
</table>`,
  },
  {
    id: 'launch-plan',
    name: 'Product Launch Plan',
    description: 'Comprehensive plan for product launch execution',
    icon: '🚀',
    content: `<h1>Product Launch Plan</h1>
<p></p>
<h2>Launch Overview</h2>
<p><strong>Product:</strong> [Product Name]</p>
<p><strong>Launch Date:</strong> [Date]</p>
<p><strong>Launch Type:</strong> ☐ Soft Launch  ☐ Full Launch  ☐ Phased Rollout</p>
<p><strong>Launch Owner:</strong> [Name]</p>
<p></p>
<h2>Launch Objectives</h2>
<ul>
  <li><p><strong>Awareness:</strong> Reach X impressions across channels</p></li>
  <li><p><strong>Acquisition:</strong> Convert X new customers</p></li>
  <li><p><strong>Revenue:</strong> Generate $X in first 30 days</p></li>
  <li><p><strong>Engagement:</strong> Achieve X% activation rate</p></li>
</ul>
<p></p>
<h2>Target Audience</h2>
<p><strong>Primary Segment:</strong> [Description]</p>
<p><strong>Secondary Segment:</strong> [Description]</p>
<p><strong>Total Addressable Market:</strong> X customers</p>
<p></p>
<h2>Pre-Launch Checklist</h2>
<h3>30 Days Before Launch</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Finalize product and complete testing</p></li>
  <li data-checked="false" data-type="taskItem"><p>Create marketing materials (landing page, emails, ads)</p></li>
  <li data-checked="false" data-type="taskItem"><p>Prepare sales enablement (pitch deck, demo, FAQs)</p></li>
  <li data-checked="false" data-type="taskItem"><p>Set up analytics and tracking</p></li>
  <li data-checked="false" data-type="taskItem"><p>Brief customer success team</p></li>
</ul>
<h3>14 Days Before Launch</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Begin email warm-up campaign</p></li>
  <li data-checked="false" data-type="taskItem"><p>Schedule press releases and media outreach</p></li>
  <li data-checked="false" data-type="taskItem"><p>Test payment and billing systems</p></li>
  <li data-checked="false" data-type="taskItem"><p>Create help documentation and support articles</p></li>
  <li data-checked="false" data-type="taskItem"><p>Launch beta program (if applicable)</p></li>
</ul>
<h3>7 Days Before Launch</h3>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Final product QA and bug fixes</p></li>
  <li data-checked="false" data-type="taskItem"><p>Train support team on product</p></li>
  <li data-checked="false" data-type="taskItem"><p>Schedule social media posts</p></li>
  <li data-checked="false" data-type="taskItem"><p>Notify existing customers (teaser)</p></li>
  <li data-checked="false" data-type="taskItem"><p>Prepare launch day monitoring plan</p></li>
</ul>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h2>Launch Day Activities</h2>
<table>
  <tbody>
    <tr>
      <th><p>Time</p></th>
      <th><p>Activity</p></th>
      <th><p>Owner</p></th>
    </tr>
    <tr>
      <td><p>6:00 AM</p></td>
      <td><p>Deploy product to production</p></td>
      <td><p>Engineering</p></td>
    </tr>
    <tr>
      <td><p>8:00 AM</p></td>
      <td><p>Publish blog post and press release</p></td>
      <td><p>Marketing</p></td>
    </tr>
    <tr>
      <td><p>9:00 AM</p></td>
      <td><p>Send launch email to customer list</p></td>
      <td><p>Marketing</p></td>
    </tr>
    <tr>
      <td><p>10:00 AM</p></td>
      <td><p>Social media blitz (Twitter, LinkedIn)</p></td>
      <td><p>Marketing</p></td>
    </tr>
    <tr>
      <td><p>12:00 PM</p></td>
      <td><p>Launch monitoring check-in</p></td>
      <td><p>All Teams</p></td>
    </tr>
    <tr>
      <td><p>3:00 PM</p></td>
      <td><p>Second wave social posts</p></td>
      <td><p>Marketing</p></td>
    </tr>
    <tr>
      <td><p>5:00 PM</p></td>
      <td><p>End of day metrics review</p></td>
      <td><p>Leadership</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>Marketing Channels</h2>
<h3>Email Marketing</h3>
<ul>
  <li><p>Announcement email to X subscribers</p></li>
  <li><p>Follow-up nurture sequence (5 emails)</p></li>
  <li><p>Personalized outreach to high-value prospects</p></li>
</ul>
<h3>Social Media</h3>
<ul>
  <li><p>Twitter: Launch thread + engagement strategy</p></li>
  <li><p>LinkedIn: Thought leadership posts</p></li>
  <li><p>Facebook: Community engagement</p></li>
  <li><p>Instagram: Visual storytelling</p></li>
</ul>
<h3>Content Marketing</h3>
<ul>
  <li><p>Blog post: Product announcement</p></li>
  <li><p>Case studies: Early customer wins</p></li>
  <li><p>Video: Product demo and walkthrough</p></li>
  <li><p>Webinar: Deep dive training</p></li>
</ul>
<h3>Paid Advertising</h3>
<ul>
  <li><p>Google Ads: Search campaigns ($X budget)</p></li>
  <li><p>LinkedIn Ads: Targeted B2B campaigns ($X budget)</p></li>
  <li><p>Facebook Ads: Retargeting campaigns ($X budget)</p></li>
</ul>
<h3>PR & Media</h3>
<ul>
  <li><p>Press release distribution</p></li>
  <li><p>Media kit and assets</p></li>
  <li><p>Journalist outreach (X publications)</p></li>
  <li><p>Podcast guest appearances</p></li>
</ul>
<p></p>
<h2>Success Metrics</h2>
<table>
  <tbody>
    <tr>
      <th><p>Metric</p></th>
      <th><p>Day 1</p></th>
      <th><p>Week 1</p></th>
      <th><p>Month 1</p></th>
    </tr>
    <tr>
      <td><p>Sign-ups</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
    </tr>
    <tr>
      <td><p>Paid Customers</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
    </tr>
    <tr>
      <td><p>Revenue</p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
      <td><p>$X</p></td>
    </tr>
    <tr>
      <td><p>Website Traffic</p></td>
      <td><p>X visits</p></td>
      <td><p>X visits</p></td>
      <td><p>X visits</p></td>
    </tr>
    <tr>
      <td><p>Media Mentions</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
      <td><p>X</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>Post-Launch Activities</h2>
<h3>Week 1</h3>
<ul>
  <li><p>Daily metrics monitoring and optimization</p></li>
  <li><p>Customer feedback collection and analysis</p></li>
  <li><p>Support ticket review and prioritization</p></li>
  <li><p>Content amplification and engagement</p></li>
</ul>
<h3>Week 2-4</h3>
<ul>
  <li><p>Iterate on messaging based on feedback</p></li>
  <li><p>Scale successful marketing channels</p></li>
  <li><p>Launch customer success program</p></li>
  <li><p>Conduct post-launch retrospective</p></li>
</ul>
<p></p>
<h2>Risk Mitigation</h2>
<table>
  <tbody>
    <tr>
      <th><p>Risk</p></th>
      <th><p>Impact</p></th>
      <th><p>Mitigation</p></th>
    </tr>
    <tr>
      <td><p>Technical issues on launch</p></td>
      <td><p>High</p></td>
      <td><p>24/7 engineering support, rollback plan</p></td>
    </tr>
    <tr>
      <td><p>Low initial adoption</p></td>
      <td><p>Medium</p></td>
      <td><p>Bonus incentives, extended trial periods</p></td>
    </tr>
    <tr>
      <td><p>Negative feedback</p></td>
      <td><p>Medium</p></td>
      <td><p>Rapid response team, communication plan</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>Team Responsibilities</h2>
<ul>
  <li><p><strong>Product:</strong> Feature readiness, product demos</p></li>
  <li><p><strong>Engineering:</strong> Stability, monitoring, bug fixes</p></li>
  <li><p><strong>Marketing:</strong> Campaign execution, content, PR</p></li>
  <li><p><strong>Sales:</strong> Pipeline management, demos, closing</p></li>
  <li><p><strong>Customer Success:</strong> Onboarding, training, support</p></li>
</ul>`,
  },
  {
    id: 'competitive-analysis',
    name: 'Competitive Analysis',
    description: 'Market positioning and competitor comparison',
    icon: '⚔️',
    content: `<h1>Competitive Analysis</h1>
<p></p>
<h2>Market Overview</h2>
<p><strong>Market Size:</strong> $X billion (2025)</p>
<p><strong>Growth Rate:</strong> X% CAGR (2025-2030)</p>
<p><strong>Key Trends:</strong> List major trends shaping the market</p>
<p></p>
<h2>Competitive Landscape</h2>
<p>High-level overview of competitive dynamics and market structure.</p>
<p></p>
<h2>Competitor Comparison Matrix</h2>
<table>
  <tbody>
    <tr>
      <th><p>Feature</p></th>
      <th><p>Our Product</p></th>
      <th><p>Competitor A</p></th>
      <th><p>Competitor B</p></th>
      <th><p>Competitor C</p></th>
    </tr>
    <tr>
      <td><p>Price</p></td>
      <td><p>$X/mo</p></td>
      <td><p>$X/mo</p></td>
      <td><p>$X/mo</p></td>
      <td><p>$X/mo</p></td>
    </tr>
    <tr>
      <td><p>Core Feature 1</p></td>
      <td><p>✅ Yes</p></td>
      <td><p>✅ Yes</p></td>
      <td><p>❌ No</p></td>
      <td><p>⚠️ Limited</p></td>
    </tr>
    <tr>
      <td><p>Core Feature 2</p></td>
      <td><p>✅ Advanced</p></td>
      <td><p>⚠️ Basic</p></td>
      <td><p>✅ Yes</p></td>
      <td><p>❌ No</p></td>
    </tr>
    <tr>
      <td><p>Core Feature 3</p></td>
      <td><p>✅ Yes</p></td>
      <td><p>❌ No</p></td>
      <td><p>❌ No</p></td>
      <td><p>✅ Yes</p></td>
    </tr>
    <tr>
      <td><p>Integrations</p></td>
      <td><p>X apps</p></td>
      <td><p>X apps</p></td>
      <td><p>X apps</p></td>
      <td><p>X apps</p></td>
    </tr>
    <tr>
      <td><p>Customer Support</p></td>
      <td><p>24/7 Chat</p></td>
      <td><p>Email Only</p></td>
      <td><p>Business Hours</p></td>
      <td><p>Self-Service</p></td>
    </tr>
    <tr>
      <td><p>Market Share</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h2>Competitor Deep Dive: Competitor A</h2>
<p><strong>Company:</strong> [Name]</p>
<p><strong>Founded:</strong> [Year]</p>
<p><strong>Funding:</strong> $X raised</p>
<p><strong>Customers:</strong> X+ companies</p>
<p></p>
<h3>Strengths</h3>
<ul>
  <li><p>Strength 1: Detailed description</p></li>
  <li><p>Strength 2: Detailed description</p></li>
  <li><p>Strength 3: Detailed description</p></li>
</ul>
<h3>Weaknesses</h3>
<ul>
  <li><p>Weakness 1: Detailed description</p></li>
  <li><p>Weakness 2: Detailed description</p></li>
  <li><p>Weakness 3: Detailed description</p></li>
</ul>
<h3>Market Position</h3>
<p>Analysis of their positioning, messaging, and target audience.</p>
<p></p>
<h2>Competitor Deep Dive: Competitor B</h2>
<p><strong>Company:</strong> [Name]</p>
<p><strong>Founded:</strong> [Year]</p>
<p><strong>Funding:</strong> $X raised</p>
<p><strong>Customers:</strong> X+ companies</p>
<p></p>
<h3>Strengths</h3>
<ul>
  <li><p>Strength 1: Detailed description</p></li>
  <li><p>Strength 2: Detailed description</p></li>
  <li><p>Strength 3: Detailed description</p></li>
</ul>
<h3>Weaknesses</h3>
<ul>
  <li><p>Weakness 1: Detailed description</p></li>
  <li><p>Weakness 2: Detailed description</p></li>
  <li><p>Weakness 3: Detailed description</p></li>
</ul>
<h3>Market Position</h3>
<p>Analysis of their positioning, messaging, and target audience.</p>
<p></p>
<h2>Competitor Deep Dive: Competitor C</h2>
<p><strong>Company:</strong> [Name]</p>
<p><strong>Founded:</strong> [Year]</p>
<p><strong>Funding:</strong> $X raised</p>
<p><strong>Customers:</strong> X+ companies</p>
<p></p>
<h3>Strengths</h3>
<ul>
  <li><p>Strength 1: Detailed description</p></li>
  <li><p>Strength 2: Detailed description</p></li>
  <li><p>Strength 3: Detailed description</p></li>
</ul>
<h3>Weaknesses</h3>
<ul>
  <li><p>Weakness 1: Detailed description</p></li>
  <li><p>Weakness 2: Detailed description</p></li>
  <li><p>Weakness 3: Detailed description</p></li>
</ul>
<h3>Market Position</h3>
<p>Analysis of their positioning, messaging, and target audience.</p>
<p></p>
<h2>SWOT Analysis</h2>
<table>
  <tbody>
    <tr>
      <th><p>Strengths</p></th>
      <th><p>Weaknesses</p></th>
    </tr>
    <tr>
      <td><p>• Internal advantage 1<br>• Internal advantage 2<br>• Internal advantage 3</p></td>
      <td><p>• Internal limitation 1<br>• Internal limitation 2<br>• Internal limitation 3</p></td>
    </tr>
    <tr>
      <th><p>Opportunities</p></th>
      <th><p>Threats</p></th>
    </tr>
    <tr>
      <td><p>• External opportunity 1<br>• External opportunity 2<br>• External opportunity 3</p></td>
      <td><p>• External threat 1<br>• External threat 2<br>• External threat 3</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>Differentiation Strategy</h2>
<h3>Our Unique Value</h3>
<ol>
  <li><p><strong>Differentiator 1:</strong> Clear explanation of competitive advantage</p></li>
  <li><p><strong>Differentiator 2:</strong> Clear explanation of competitive advantage</p></li>
  <li><p><strong>Differentiator 3:</strong> Clear explanation of competitive advantage</p></li>
</ol>
<h3>Positioning Statement</h3>
<blockquote>
  <p>For [target customer] who [statement of need], [product name] is a [product category] that [statement of benefit]. Unlike [competitor], our product [key differentiator].</p>
</blockquote>
<p></p>
<h2>Competitive Response Strategy</h2>
<h3>When Competitor Launches New Feature</h3>
<ul>
  <li><p>Assess impact on our product roadmap</p></li>
  <li><p>Communicate our differentiators to customers</p></li>
  <li><p>Accelerate development if strategic</p></li>
</ul>
<h3>When Competitor Changes Pricing</h3>
<ul>
  <li><p>Analyze total cost of ownership comparison</p></li>
  <li><p>Emphasize value over price</p></li>
  <li><p>Consider promotional offers if necessary</p></li>
</ul>
<h3>When Competitor Wins Major Customer</h3>
<ul>
  <li><p>Learn from the loss (if we competed)</p></li>
  <li><p>Target similar customer profiles</p></li>
  <li><p>Strengthen our unique selling points</p></li>
</ul>
<p></p>
<h2>Market Positioning Map</h2>
<p>Visual representation of where we and competitors sit on key dimensions (e.g., price vs. features, ease of use vs. power, etc.)</p>
<p></p>
<h2>Win/Loss Analysis</h2>
<table>
  <tbody>
    <tr>
      <th><p>Reason</p></th>
      <th><p>Wins</p></th>
      <th><p>Losses</p></th>
    </tr>
    <tr>
      <td><p>Price</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
    </tr>
    <tr>
      <td><p>Features</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
    </tr>
    <tr>
      <td><p>Support</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
    </tr>
    <tr>
      <td><p>Brand</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
    </tr>
    <tr>
      <td><p>Implementation</p></td>
      <td><p>X%</p></td>
      <td><p>X%</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<h2>Action Items</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Update competitive battlecard for sales team</p></li>
  <li data-checked="false" data-type="taskItem"><p>Create comparison landing pages</p></li>
  <li data-checked="false" data-type="taskItem"><p>Develop sales objection handling guide</p></li>
  <li data-checked="false" data-type="taskItem"><p>Schedule quarterly competitive review</p></li>
  <li data-checked="false" data-type="taskItem"><p>Monitor competitor product updates</p></li>
</ul>`,
  },
  {
    id: 'sales-deck',
    name: 'Sales Deck',
    description: 'Persuasive presentation for customer pitches',
    icon: '💼',
    content: `<h1>Sales Deck: [Company Name]</h1>
<p style="text-align: center"><em>Transforming [Industry] with [Product/Service]</em></p>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h1>The Problem</h1>
<p>Companies in [industry] face significant challenges:</p>
<ul>
  <li><p><strong>Challenge 1:</strong> Description of major pain point</p></li>
  <li><p><strong>Challenge 2:</strong> Description of costly inefficiency</p></li>
  <li><p><strong>Challenge 3:</strong> Description of missed opportunity</p></li>
</ul>
<p></p>
<blockquote>
  <p>"Insert powerful customer quote about the problem they faced"</p>
</blockquote>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h1>The Solution</h1>
<p>[Product Name] is a [category] that helps [target customer] [key benefit].</p>
<p></p>
<h2>How It Works</h2>
<ol>
  <li><p><strong>Step 1:</strong> Simple description of first interaction</p></li>
  <li><p><strong>Step 2:</strong> Simple description of core value delivery</p></li>
  <li><p><strong>Step 3:</strong> Simple description of outcome/result</p></li>
</ol>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h1>Key Features</h1>
<h2>Feature 1: [Name]</h2>
<p>Description of feature and benefit it provides to customers.</p>
<p></p>
<h2>Feature 2: [Name]</h2>
<p>Description of feature and benefit it provides to customers.</p>
<p></p>
<h2>Feature 3: [Name]</h2>
<p>Description of feature and benefit it provides to customers.</p>
<p></p>
<h2>Feature 4: [Name]</h2>
<p>Description of feature and benefit it provides to customers.</p>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h1>Customer Success Stories</h1>
<h2>Case Study: [Company Name]</h2>
<p><strong>Industry:</strong> [Industry]</p>
<p><strong>Company Size:</strong> [Number] employees</p>
<p><strong>Challenge:</strong> Brief description of customer's problem</p>
<p><strong>Solution:</strong> How they used our product</p>
<p></p>
<h3>Results</h3>
<table>
  <tbody>
    <tr>
      <th><p>Metric</p></th>
      <th><p>Improvement</p></th>
    </tr>
    <tr>
      <td><p>Revenue</p></td>
      <td><p><mark style="background-color: #00ff00; color: inherit">↑ X% increase</mark></p></td>
    </tr>
    <tr>
      <td><p>Efficiency</p></td>
      <td><p><mark style="background-color: #00ff00; color: inherit">↓ X% time saved</mark></p></td>
    </tr>
    <tr>
      <td><p>Cost Savings</p></td>
      <td><p><mark style="background-color: #00ff00; color: inherit">$X saved annually</mark></p></td>
    </tr>
  </tbody>
</table>
<p></p>
<blockquote>
  <p>"Insert powerful testimonial from satisfied customer"<br>— [Name], [Title] at [Company]</p>
</blockquote>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h1>Why Choose Us?</h1>
<table>
  <tbody>
    <tr>
      <th><p>Factor</p></th>
      <th><p>Us</p></th>
      <th><p>Competitors</p></th>
    </tr>
    <tr>
      <td><p>Implementation</p></td>
      <td><p>✅ 1 week setup</p></td>
      <td><p>❌ 3+ months</p></td>
    </tr>
    <tr>
      <td><p>Price</p></td>
      <td><p>✅ $X/month</p></td>
      <td><p>💰 $X/month</p></td>
    </tr>
    <tr>
      <td><p>Support</p></td>
      <td><p>✅ 24/7 chat & phone</p></td>
      <td><p>⚠️ Email only</p></td>
    </tr>
    <tr>
      <td><p>Integrations</p></td>
      <td><p>✅ X+ apps</p></td>
      <td><p>⚠️ Limited</p></td>
    </tr>
    <tr>
      <td><p>ROI Timeline</p></td>
      <td><p>✅ 90 days</p></td>
      <td><p>❌ 6+ months</p></td>
    </tr>
  </tbody>
</table>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h1>Pricing & Packages</h1>
<table>
  <tbody>
    <tr>
      <th><p>Plan</p></th>
      <th><p>Starter</p></th>
      <th><p>Professional</p></th>
      <th><p>Enterprise</p></th>
    </tr>
    <tr>
      <td><p><strong>Price</strong></p></td>
      <td><p>$X/month</p></td>
      <td><p>$X/month</p></td>
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
      <td><p>❌</p></td>
      <td><p>✅</p></td>
      <td><p>✅</p></td>
    </tr>
    <tr>
      <td><p>Priority Support</p></td>
      <td><p>❌</p></td>
      <td><p>✅</p></td>
      <td><p>✅</p></td>
    </tr>
    <tr>
      <td><p>Custom Integrations</p></td>
      <td><p>❌</p></td>
      <td><p>❌</p></td>
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
<p style="text-align: center"><em>All plans include 14-day free trial • No credit card required</em></p>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h1>Implementation Process</h1>
<h2>Getting Started (Week 1)</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Kickoff call with dedicated success manager</p></li>
  <li data-checked="false" data-type="taskItem"><p>Account setup and configuration</p></li>
  <li data-checked="false" data-type="taskItem"><p>Connect your existing tools and data</p></li>
</ul>
<h2>Training & Onboarding (Week 2)</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Team training sessions (customized to your needs)</p></li>
  <li data-checked="false" data-type="taskItem"><p>Best practices workshop</p></li>
  <li data-checked="false" data-type="taskItem"><p>Access to help docs and video tutorials</p></li>
</ul>
<h2>Go-Live & Optimization (Week 3+)</h2>
<ul data-type="taskList">
  <li data-checked="false" data-type="taskItem"><p>Launch to full team</p></li>
  <li data-checked="false" data-type="taskItem"><p>Monitor adoption and usage</p></li>
  <li data-checked="false" data-type="taskItem"><p>Ongoing optimization and support</p></li>
</ul>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h1>Trusted by Leading Companies</h1>
<p style="text-align: center"><em>[Insert logos of notable customers]</em></p>
<p></p>
<p style="text-align: center">Join X+ companies using [Product Name] to [key outcome]</p>
<p></p>
<h2>Key Statistics</h2>
<ul>
  <li><p><strong>X+</strong> Active customers</p></li>
  <li><p><strong>X%</strong> Average customer satisfaction (NPS)</p></li>
  <li><p><strong>$X</strong> Average ROI in first year</p></li>
  <li><p><strong>X%</strong> Year-over-year growth</p></li>
</ul>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h1>Security & Compliance</h1>
<p>Enterprise-grade security protecting your data:</p>
<ul>
  <li><p>✅ <strong>SOC 2 Type II</strong> certified</p></li>
  <li><p>✅ <strong>GDPR</strong> compliant</p></li>
  <li><p>✅ <strong>ISO 27001</strong> certified</p></li>
  <li><p>✅ <strong>HIPAA</strong> compliant (Enterprise plan)</p></li>
  <li><p>✅ <strong>256-bit encryption</strong> at rest and in transit</p></li>
  <li><p>✅ <strong>SSO/SAML</strong> support</p></li>
  <li><p>✅ <strong>99.99% uptime</strong> SLA</p></li>
</ul>
<p></p>
<div data-type="page-break" class="page-break"></div>
<p></p>
<h1>Next Steps</h1>
<h2>Ready to Get Started?</h2>
<ol>
  <li><p><strong>Schedule a Demo</strong><br>See the product in action with your use case</p></li>
  <li><p><strong>Start Free Trial</strong><br>Test drive with your team for 14 days</p></li>
  <li><p><strong>Talk to Sales</strong><br>Discuss custom requirements and pricing</p></li>
</ol>
<p></p>
<h2>Contact Information</h2>
<p><strong>Sales Team</strong><br>📧 sales@company.com<br>📞 +1 (XXX) XXX-XXXX<br>🌐 company.com/demo</p>
<p></p>
<p style="text-align: center"><em>Let's transform your [process/workflow] together.</em></p>`,
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
