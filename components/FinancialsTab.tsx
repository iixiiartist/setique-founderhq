import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { FinancialLog, Expense, ExpenseCategory, PaymentMethod, AppActions, Task, Document, BusinessProfile, WorkspaceMember } from '../types';
import ModuleAssistant from './shared/ModuleAssistant';
import { Tab } from '../constants';
import TaskManagement from './shared/TaskManagement';
import { useWorkspace } from '../contexts/WorkspaceContext';
import KpiCard from './shared/KpiCard';

const FinancialLogItem: React.FC<{ item: FinancialLog; onDelete: () => void; }> = ({ item, onDelete }) => (
    <li className="flex items-center justify-between p-3 bg-white border-2 border-black shadow-neo">
        <div className="flex-grow">
            <p className="font-semibold">{new Date(item.date + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                <span>MRR: <strong className="text-black">${item.mrr.toLocaleString()}</strong></span>
                <span>GMV: <strong className="text-black">${item.gmv.toLocaleString()}</strong></span>
                <span>Signups: <strong className="text-black">{item.signups.toLocaleString()}</strong></span>
            </div>
        </div>
        <button onClick={onDelete} className="text-xl font-bold hover:text-red-500 transition-colors shrink-0 ml-4" aria-label={`Delete financial log for ${item.date}`}>&times;</button>
    </li>
);

const ExpenseItem: React.FC<{ item: Expense; onDelete: () => void; }> = ({ item, onDelete }) => (
    <li className="flex items-center justify-between p-3 bg-white border-2 border-black shadow-neo">
        <div className="flex-grow">
            <div className="flex items-center justify-between mb-1">
                <p className="font-semibold">{item.description}</p>
                <span className="font-mono font-bold text-lg text-red-600">-${item.amount.toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <span>{new Date(item.date + 'T00:00:00').toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="font-semibold text-blue-600">{item.category}</span>
                {item.vendor && <span>Vendor: <strong className="text-black">{item.vendor}</strong></span>}
                {item.paymentMethod && <span>{item.paymentMethod}</span>}
            </div>
        </div>
        <button onClick={onDelete} className="text-xl font-bold hover:text-red-500 transition-colors shrink-0 ml-4" aria-label={`Delete expense: ${item.description}`}>&times;</button>
    </li>
);

const FinancialsTab: React.FC<{
    items: FinancialLog[];
    expenses: Expense[];
    tasks: Task[];
    actions: AppActions;
    documents: Document[];
    businessProfile?: BusinessProfile | null;
    workspaceId?: string;
    onUpgradeNeeded?: () => void;
    workspaceMembers?: WorkspaceMember[];
}> = React.memo(({ items, expenses, tasks, actions, documents, businessProfile, workspaceId, onUpgradeNeeded, workspaceMembers = [] }) => {
    const { workspace } = useWorkspace();
    const [form, setForm] = useState<Omit<FinancialLog, 'id'>>({
        date: new Date().toISOString().split('T')[0], mrr: 0, gmv: 0, signups: 0
    });
    
    const [expenseForm, setExpenseForm] = useState<Omit<Expense, 'id' | 'notes'>>({
        date: new Date().toISOString().split('T')[0],
        category: 'Software/SaaS' as ExpenseCategory,
        amount: 0,
        description: '',
        vendor: '',
        paymentMethod: undefined
    });

    const [expenseFilter, setExpenseFilter] = useState<ExpenseCategory | 'All'>('All');
    const [expenseSortBy, setExpenseSortBy] = useState<'date' | 'amount'>('date');
    
    const documentsMetadata = useMemo(() => documents.map(({ id, name, mimeType, module, uploadedAt }) => ({ id, name, mimeType, module, uploadedAt })), [documents]);
    
    // Build business context from profile (handle snake_case from database)
    const profile = businessProfile as any;
    const companyName = profile?.company_name || profile?.companyName || 'your company';
    const industry = profile?.industry || 'Not specified';
    const businessModel = profile?.business_model || profile?.businessModel || 'Not specified';
    const primaryGoal = profile?.primary_goal || profile?.primaryGoal || 'Not specified';
    
    const businessContext = businessProfile ? `
**Business Context: ${companyName}**
- **Company:** ${companyName}
- **Industry:** ${industry}
- **Business Model:** ${businessModel}
- **Primary Goal:** ${primaryGoal}
` : `**Business Context:** Not yet configured.`;
    
    const teamContext = workspaceMembers.length > 0 ? `
**Team Members (${workspaceMembers.length}):**
${workspaceMembers.map(member => `- ${member.fullName || member.email || 'Unknown Member'} (${member.email || 'no email'}) - Role: ${member.role}`).join('\n')}

**Collaboration Notes:**
- Highlight which teammates own revenue, finance, or operations tasks when suggesting follow-ups.
- Surface potential owners for approvals or reviews using the listed roles.
` : `**Team:** Working solo (no additional team members in workspace).`;

    const systemPrompt = `You are an expert CFO and financial analyst assistant for ${companyName}.

${businessContext}

${teamContext}

**Reporting Guidelines:**
When asked for a report, analyze the provided financial logs.
- Identify the most recent financial entry and highlight its key metrics (MRR, GMV, Signups).
- If there are at least two entries, calculate the period-over-period growth rate for MRR and GMV.
- Summarize the overall trend (e.g., "consistent growth," "stable," "volatile").
- Conclude with a brief insight based on the data.

**File Handling:**
- When a user attaches a file, their message is a multi-part message. One part is text, and another part is \`inlineData\` containing the file's base64 encoded content (\`data\`) and its \`mimeType\`. The user's text will also be prefixed with \`[File Attached: filename.ext]\`.
- When the user asks to save the file (e.g., "save this", "add it to the library"), this request refers to the file attached in their **most recent message**.
- To save the file, you MUST call the \`uploadDocument\` function.
- For the \`uploadDocument\` parameters:
    - \`name\`: Extract the filename from the \`[File Attached: ...]\` prefix.
    - \`mimeType\`: Use the \`mimeType\` from the \`inlineData\` part of the user's message.
    - \`content\`: Use the \`data\` field from the \`inlineData\` part. This is the base64 content.
    - \`module\`: Set this to '${Tab.Financials}'.
- Do NOT ask for this information. You have everything you need from the user's multi-part message. Do NOT use content from previous files in the conversation history when saving.

**File Analysis Instructions:**
- **Finding File IDs:** When a user asks about a file by its name (e.g., "What is in 'q3_expenses.csv'?"), you MUST look up its ID in the \`Current File Library Context\` provided to you. Use that ID to call the \`getFileContent\` function. Do NOT ask the user for the file ID if the file name is in your context.
- **Critical Two-Step Process:**
    1.  **Call the Tool:** Once you have the file ID, call the \`getFileContent\` function.
    2.  **Analyze and Respond:** After the system returns the file's content, you MUST use that information to answer the user's original question. Do NOT just say "I've completed the action." Your job is not finished until you have provided a summary or answer based on the file's content.

**Example Interaction:**
User: "Where is our latest financial model?"
You (Assistant): "I see a file named 'Financial_Model_v3.xlsx'."
User: "What's our projected burn rate for next month?"
You (Assistant): *[Internal Action: Finds the ID for 'Financial_Model_v3.xlsx' in the context, then calls getFileContent(fileId: 'doc-12345')]*
System: *[Internal Action: Returns file content to the model]*
You (Assistant): "Based on the financial model, the projected burn rate for next month is $45,000."

**Response Accuracy:**
- Do not make up or hallucinate information. All responses must be based on real-world information and the data provided.
- If you do not have an answer to a question, explicitly state that you don't know the answer at this time.

Your goal is to help with financial modeling, analyzing KPIs (especially GMV, transaction volume, and user growth over MRR for now), managing burn rate, expense tracking, and preparing for board meetings.
Use the provided dashboard context to answer questions and call functions to complete tasks.
Today's date is ${new Date().toISOString().split('T')[0]}.

Current Financials Context:
Logs: ${JSON.stringify(items, null, 2)}
Expenses: ${JSON.stringify(expenses, null, 2)}
Tasks: ${JSON.stringify(tasks, null, 2)}

Current File Library Context:
${JSON.stringify(documentsMetadata, null, 2)}
`;

    const handleLog = (e: React.FormEvent) => {
        e.preventDefault();
        actions.logFinancials(form);
        setForm({ date: new Date().toISOString().split('T')[0], mrr: 0, gmv: 0, signups: 0 });
    };

    const handleExpense = (e: React.FormEvent) => {
        e.preventDefault();
        actions.createExpense(expenseForm);
        setExpenseForm({
            date: new Date().toISOString().split('T')[0],
            category: 'Software/SaaS' as ExpenseCategory,
            amount: 0,
            description: '',
            vendor: '',
            paymentMethod: undefined
        });
    };

    // Expense calculations
    const filteredExpenses = useMemo(() => {
        let filtered = expenseFilter === 'All' ? expenses : expenses.filter(e => e.category === expenseFilter);
        return [...filtered].sort((a, b) => {
            if (expenseSortBy === 'date') {
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            }
            return b.amount - a.amount;
        });
    }, [expenses, expenseFilter, expenseSortBy]);

    const expensesByCategory = useMemo(() => {
        const categoryTotals: Record<string, number> = {};
        expenses.forEach(expense => {
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
        });
        return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
    }, [expenses]);

    const totalExpenses = useMemo(() => 
        expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]);

    const monthlyExpenses = useMemo(() => {
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        return expenses
            .filter(e => e.date.startsWith(currentMonth))
            .reduce((sum, e) => sum + e.amount, 0);
    }, [expenses]);

    const EXPENSE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'];

     const chartData = items.map(f => ({
        name: new Date(f.date + 'T00:00:00').toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }),
        MRR: f.mrr,
        GMV: f.gmv,
    })).sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    const sortedLogs = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Get latest signups data
    const latestFinancials = items.length > 0 
        ? [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] 
        : { signups: 0 };

    const calculatedXp = useMemo(() => {
        const BASE_XP = 10;
        const XP_PER_SIGNUP = 2;
        const signups = Number(form.signups) || 0;
        return BASE_XP + (signups * XP_PER_SIGNUP);
    }, [form.signups]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KpiCard 
                        title="New Signups" 
                        value={latestFinancials.signups.toLocaleString()} 
                        description="From latest financial log" 
                    />
                    <div className="bg-white p-4 border-2 border-black shadow-neo">
                        <p className="text-sm text-gray-600 font-mono mb-1">Total Expenses</p>
                        <p className="text-2xl font-bold text-red-600">-${totalExpenses.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">All time</p>
                    </div>
                    <div className="bg-white p-4 border-2 border-black shadow-neo">
                        <p className="text-sm text-gray-600 font-mono mb-1">Monthly Expenses</p>
                        <p className="text-2xl font-bold text-orange-600">-${monthlyExpenses.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1">Current month</p>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h2 className="text-xl font-semibold text-black mb-4">Revenue Trends</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                                    <XAxis dataKey="name" tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }} />
                                    <YAxis tickFormatter={(value) => `$${Number(value).toLocaleString()}`} tick={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }} />
                                    <Tooltip contentStyle={{ fontFamily: "'Inter', sans-serif" }}/>
                                    <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace" }} />
                                    <Line type="monotone" dataKey="MRR" stroke="#3b82f6" strokeWidth={2} />
                                    <Line type="monotone" dataKey="GMV" stroke="#10b981" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h2 className="text-xl font-semibold text-black mb-4">Expenses by Category</h2>
                        {expensesByCategory.length > 0 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={expensesByCategory}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={(entry) => `$${entry.value.toLocaleString()}`}
                                        >
                                            {expensesByCategory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-2 text-xs space-y-1">
                                    {expensesByCategory.slice(0, 3).map((cat, idx) => (
                                        <div key={cat.name} className="flex justify-between">
                                            <span className="flex items-center gap-1">
                                                <div className="w-3 h-3 border border-black" style={{ backgroundColor: EXPENSE_COLORS[idx] }}></div>
                                                {cat.name}
                                            </span>
                                            <span className="font-bold">${cat.value.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic text-center py-8">No expense data yet</p>
                        )}
                    </div>
                </div>

                {/* Forms Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h2 className="text-xl font-semibold text-black mb-4">Log Financial Snapshot</h2>
                        <form onSubmit={handleLog} className="space-y-3">
                            <div>
                                <label htmlFor="log-date" className="block font-mono text-sm font-semibold text-black mb-1">Date</label>
                                <input 
                                    id="log-date"
                                    type="date" 
                                    value={form.date || ''} 
                                    onChange={e => setForm(p=>({...p, date: e.target.value}))} 
                                    required 
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="log-mrr" className="block font-mono text-xs font-semibold text-black mb-1">MRR ($)</label>
                                    <input 
                                        id="log-mrr"
                                        type="number" 
                                        value={form.mrr || ''} 
                                        onChange={e => setForm(p=>({...p, mrr: Number(e.target.value)}))} 
                                        placeholder="1000" 
                                        required 
                                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 text-sm"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="log-gmv" className="block font-mono text-xs font-semibold text-black mb-1">GMV ($)</label>
                                    <input 
                                        id="log-gmv"
                                        type="number" 
                                        value={form.gmv || ''} 
                                        onChange={e => setForm(p=>({...p, gmv: Number(e.target.value)}))} 
                                        placeholder="10000" 
                                        required 
                                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 text-sm" 
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="log-signups" className="block font-mono text-sm font-semibold text-black mb-1">New Signups</label>
                                <input 
                                    id="log-signups"
                                    type="number" 
                                    value={form.signups || ''} 
                                    onChange={e => setForm(p=>({...p, signups: Number(e.target.value)}))} 
                                    placeholder="100" 
                                    required 
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="flex justify-end items-center gap-3 pt-2">
                                <span className="font-mono text-sm font-semibold text-green-600">+{calculatedXp} XP</span>
                                <button type="submit" className="font-mono font-semibold bg-black text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn text-sm">Log</button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h2 className="text-xl font-semibold text-black mb-4">Log Expense</h2>
                        <form onSubmit={handleExpense} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="expense-date" className="block font-mono text-xs font-semibold text-black mb-1">Date</label>
                                    <input 
                                        id="expense-date"
                                        type="date" 
                                        value={expenseForm.date || ''} 
                                        onChange={e => setExpenseForm(p=>({...p, date: e.target.value}))} 
                                        required 
                                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 text-sm" 
                                    />
                                </div>
                                <div>
                                    <label htmlFor="expense-amount" className="block font-mono text-xs font-semibold text-black mb-1">Amount ($)</label>
                                    <input 
                                        id="expense-amount"
                                        type="number" 
                                        step="0.01"
                                        value={expenseForm.amount || ''} 
                                        onChange={e => setExpenseForm(p=>({...p, amount: Number(e.target.value)}))} 
                                        placeholder="0.00" 
                                        required 
                                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="expense-description" className="block font-mono text-sm font-semibold text-black mb-1">Description</label>
                                <input 
                                    id="expense-description"
                                    type="text" 
                                    value={expenseForm.description || ''} 
                                    onChange={e => setExpenseForm(p=>({...p, description: e.target.value}))} 
                                    placeholder="AWS hosting" 
                                    required 
                                    className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="expense-category" className="block font-mono text-xs font-semibold text-black mb-1">Category</label>
                                    <select 
                                        id="expense-category"
                                        value={expenseForm.category || 'Other'} 
                                        onChange={e => setExpenseForm(p=>({...p, category: e.target.value as ExpenseCategory}))} 
                                        required
                                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 text-sm"
                                    >
                                        <option value="Software/SaaS">Software/SaaS</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Office">Office</option>
                                        <option value="Legal">Legal</option>
                                        <option value="Contractors">Contractors</option>
                                        <option value="Travel">Travel</option>
                                        <option value="Meals">Meals</option>
                                        <option value="Equipment">Equipment</option>
                                        <option value="Subscriptions">Subscriptions</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="expense-vendor" className="block font-mono text-xs font-semibold text-black mb-1">Vendor</label>
                                    <input 
                                        id="expense-vendor"
                                        type="text" 
                                        value={expenseForm.vendor || ''} 
                                        onChange={e => setExpenseForm(p=>({...p, vendor: e.target.value}))} 
                                        placeholder="Optional" 
                                        className="w-full bg-white border-2 border-black text-black p-2 rounded-none focus:outline-none focus:border-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" className="font-mono font-semibold bg-red-600 text-white py-2 px-4 rounded-none cursor-pointer transition-all border-2 border-black shadow-neo-btn hover:bg-red-700 text-sm">Log</button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* History Lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <h2 className="text-xl font-semibold text-black mb-4">Financial Log History</h2>
                        <ul className="max-h-80 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                            {sortedLogs.length > 0 ? (
                                sortedLogs.map(item => <FinancialLogItem key={item.id} item={item} onDelete={() => actions.deleteItem('financials', item.id)} />)
                            ) : (
                                <p className="text-gray-500 italic text-sm">No financial data logged yet.</p>
                            )}
                        </ul>
                    </div>

                    <div className="bg-white p-6 border-2 border-black shadow-neo">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-black">Expense History</h2>
                            <div className="flex gap-2">
                                <select 
                                    value={expenseFilter} 
                                    onChange={e => setExpenseFilter(e.target.value as ExpenseCategory | 'All')}
                                    className="bg-white border-2 border-black text-black px-2 py-1 text-xs font-mono rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="All">All</option>
                                    <option value="Software/SaaS">Software</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Office">Office</option>
                                    <option value="Other">Other</option>
                                </select>
                                <select 
                                    value={expenseSortBy} 
                                    onChange={e => setExpenseSortBy(e.target.value as 'date' | 'amount')}
                                    className="bg-white border-2 border-black text-black px-2 py-1 text-xs font-mono rounded-none focus:outline-none focus:border-blue-500"
                                >
                                    <option value="date">Date</option>
                                    <option value="amount">Amount</option>
                                </select>
                            </div>
                        </div>
                        <ul className="max-h-80 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                            {filteredExpenses.length > 0 ? (
                                filteredExpenses.map(item => <ExpenseItem key={item.id} item={item} onDelete={() => actions.deleteItem('expenses', item.id)} />)
                            ) : (
                                <p className="text-gray-500 italic text-sm">No expenses logged yet.</p>
                            )}
                        </ul>
                    </div>
                </div>

                {/* Tasks Section */}
                <TaskManagement
                    tasks={tasks}
                    actions={actions}
                    taskCollectionName="financialTasks"
                    tag="Financials"
                    title="Financial Tasks"
                    placeholder="e.g., 'Prepare Q3 board deck'"
                />
            </div>

            {/* AI Assistant Sidebar */}
            {workspace?.planType !== 'free' && (
                <div className="lg:col-span-1">
                    <div className="sticky top-4">
                        <ModuleAssistant 
                            title="Financials AI" 
                            systemPrompt={systemPrompt} 
                            actions={actions} 
                            currentTab={Tab.Financials}
                            workspaceId={workspaceId}
                            onUpgradeNeeded={onUpgradeNeeded}
                        />
                    </div>
                </div>
            )}
        </div>
    );
});

export default FinancialsTab;
