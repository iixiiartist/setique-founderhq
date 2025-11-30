// supabase/functions/huddle-ai-run/index.ts
// Handles AI invocation in Huddle - Groq + You.com integration with streaming

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIRunRequest {
  room_id: string;
  thread_root_id?: string;
  prompt: string;
  context_options: {
    include_recent_messages?: boolean;
    message_count?: number;
    include_thread?: boolean;
    include_workspace_data?: boolean;
    workspace_data_types?: ('tasks' | 'contacts' | 'deals' | 'documents' | 'forms' | 'pipeline')[];
    include_web_research?: boolean;
    web_research_query?: string;
    selected_files?: string[];
    selected_documents?: string[];
    selected_forms?: string[];
  };
  tool_options: {
    allow_task_creation?: boolean;
    allow_contact_creation?: boolean;
    allow_note_creation?: boolean;
    allow_web_search?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const encoder = new TextEncoder();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const groqApiKey = Deno.env.get('GROQ_API_KEY')!;
    const youComApiKey = Deno.env.get('YOU_COM_API_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AIRunRequest = await req.json();
    const { room_id, thread_root_id, prompt, context_options, tool_options } = body;

    // Validate room access and get settings
    const { data: room, error: roomError } = await supabaseUser
      .from('huddle_rooms')
      .select('id, workspace_id, settings, name')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: 'Room not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if AI is allowed in this room
    if (!room.settings?.ai_allowed) {
      return new Response(
        JSON.stringify({ error: 'AI is not enabled in this room' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check API balance/plan limits
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('plan_type, api_balance')
      .eq('id', room.workspace_id)
      .single();

    // TODO: Implement proper rate limiting based on plan
    // For now, allow all requests

    // Build context
    const context = await buildContext(supabaseUser, supabaseAdmin, {
      room_id,
      thread_root_id,
      workspace_id: room.workspace_id,
      user_id: user.id,
      options: context_options,
      youComApiKey,
    });

    // Build tools based on options
    const tools = buildTools(tool_options, room.settings?.ai_can_write);

    // First, post the user's prompt as a message
    const { data: userMessage } = await supabaseUser
      .from('huddle_messages')
      .insert({
        room_id,
        workspace_id: room.workspace_id,
        user_id: user.id,
        body: prompt,
        thread_root_id,
        metadata: { ai_request: true },
      })
      .select()
      .single();

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Call Groq API with streaming
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              messages: [
                {
                  role: 'system',
                  content: buildSystemPrompt(room.name, context),
                },
                ...context.recentMessages.map((m: any) => ({
                  role: m.is_ai ? 'assistant' : 'user',
                  content: m.user?.name ? `${m.user.name}: ${m.body}` : m.body,
                })),
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              tools: tools.length > 0 ? tools : undefined,
              stream: true,
              max_tokens: 2048,
              temperature: 0.7,
            }),
          });

          if (!groqResponse.ok) {
            const error = await groqResponse.text();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'AI request failed', detail: error })}\n\n`));
            controller.close();
            return;
          }

          const reader = groqResponse.body?.getReader();
          if (!reader) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No response stream' })}\n\n`));
            controller.close();
            return;
          }

          let fullContent = '';
          let toolCalls: any[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                if (delta?.content) {
                  fullContent += delta.content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`));
                }

                if (delta?.tool_calls) {
                  // Handle tool calls
                  for (const tc of delta.tool_calls) {
                    if (tc.function) {
                      toolCalls.push({
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                      });
                    }
                  }
                }
              } catch (e) {
                // Skip unparseable chunks
              }
            }
          }

          // Execute tool calls if any
          const toolResults = [];
          for (const tc of toolCalls) {
            try {
              const result = await executeToolCall(supabaseAdmin, tc, room.workspace_id, user.id);
              toolResults.push({ ...tc, result });
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', tool: tc.name, result })}\n\n`));
            } catch (e) {
              toolResults.push({ ...tc, error: e.message });
            }
          }

          // Save AI message to database
          const aiMetadata: Record<string, any> = {
            ai_request_id: userMessage?.id,
          };
          if (toolResults.length > 0) {
            aiMetadata.tool_calls = toolResults;
          }
          if (context.webSources?.length > 0) {
            aiMetadata.web_sources = context.webSources;
          }

          const { data: aiMessage } = await supabaseAdmin
            .from('huddle_messages')
            .insert({
              room_id,
              workspace_id: room.workspace_id,
              user_id: null, // AI message
              body: fullContent || 'I apologize, but I was unable to generate a response.',
              thread_root_id: thread_root_id || userMessage?.id, // Reply in thread
              is_ai: true,
              metadata: aiMetadata,
            })
            .select()
            .single();

          // Send completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete', 
            message_id: aiMessage?.id,
            tool_calls: toolResults,
            web_sources: context.webSources,
          })}\n\n`));

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Huddle AI error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Build context from various sources
async function buildContext(
  supabaseUser: any,
  supabaseAdmin: any,
  params: {
    room_id: string;
    thread_root_id?: string;
    workspace_id: string;
    user_id: string;
    options: AIRunRequest['context_options'];
    youComApiKey?: string;
  }
) {
  const { room_id, thread_root_id, workspace_id, options, youComApiKey } = params;
  const context: any = {
    recentMessages: [],
    workspaceData: {},
    webSources: [],
  };

  // Get recent messages
  if (options.include_recent_messages !== false) {
    const messageCount = options.message_count || 20;
    
    let query = supabaseUser
      .from('huddle_messages')
      .select(`
        id, body, is_ai, created_at,
        user:profiles!huddle_messages_user_id_fkey(id, name)
      `)
      .eq('room_id', room_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(messageCount);

    // If thread context requested, get thread messages
    if (options.include_thread && thread_root_id) {
      query = supabaseUser
        .from('huddle_messages')
        .select(`
          id, body, is_ai, created_at,
          user:profiles!huddle_messages_user_id_fkey(id, name)
        `)
        .or(`id.eq.${thread_root_id},thread_root_id.eq.${thread_root_id}`)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(50);
    }

    const { data: messages } = await query;
    context.recentMessages = (messages || []).reverse();
  }

  // Get workspace data if requested
  if (options.include_workspace_data && options.workspace_data_types?.length) {
    for (const dataType of options.workspace_data_types) {
      switch (dataType) {
        case 'tasks':
          const { data: tasks } = await supabaseUser
            .from('tasks')
            .select('id, title, status, priority, due_date')
            .eq('workspace_id', workspace_id)
            .neq('status', 'completed')
            .limit(20);
          context.workspaceData.tasks = tasks;
          break;

        case 'contacts':
          const { data: contacts } = await supabaseUser
            .from('contacts')
            .select('id, name, email, company, title')
            .eq('workspace_id', workspace_id)
            .limit(20);
          context.workspaceData.contacts = contacts;
          break;

        case 'deals':
          const { data: deals } = await supabaseUser
            .from('deals')
            .select('id, name, value, stage, probability')
            .eq('workspace_id', workspace_id)
            .limit(20);
          context.workspaceData.deals = deals;
          break;

        case 'pipeline':
          const { data: pipeline } = await supabaseUser
            .from('deals')
            .select('stage, value')
            .eq('workspace_id', workspace_id);
          
          // Aggregate pipeline data
          const pipelineSummary = (pipeline || []).reduce((acc: any, deal: any) => {
            if (!acc[deal.stage]) acc[deal.stage] = { count: 0, value: 0 };
            acc[deal.stage].count++;
            acc[deal.stage].value += deal.value || 0;
            return acc;
          }, {});
          context.workspaceData.pipeline = pipelineSummary;
          break;
      }
    }
  }

  // Web research via You.com
  if (options.include_web_research && options.web_research_query && youComApiKey) {
    try {
      const searchResponse = await fetch(`https://api.you.com/api/web/search?query=${encodeURIComponent(options.web_research_query)}`, {
        headers: { 'X-API-Key': youComApiKey },
      });
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        context.webSources = (searchData.hits || []).slice(0, 5).map((hit: any) => ({
          title: hit.title,
          url: hit.url,
          snippet: hit.snippet,
        }));
      }
    } catch (e) {
      console.error('You.com search error:', e);
    }
  }

  return context;
}

// Build system prompt
function buildSystemPrompt(roomName: string, context: any): string {
  let prompt = `You are an AI assistant in the Huddle chat room "${roomName || 'this room'}". 
You help team members with questions, provide insights from workspace data, and assist with tasks.

Guidelines:
- Be concise and helpful
- Use markdown formatting for readability
- When referencing workspace data, be specific with names and numbers
- If you're unsure, say so rather than making things up
- You can use tools to create tasks, notes, or search the web when appropriate
`;

  if (Object.keys(context.workspaceData).length > 0) {
    prompt += `\n\nWorkspace Context:\n`;
    
    if (context.workspaceData.tasks?.length) {
      prompt += `\nActive Tasks (${context.workspaceData.tasks.length}):\n`;
      context.workspaceData.tasks.slice(0, 10).forEach((t: any) => {
        prompt += `- ${t.title} [${t.status}] ${t.due_date ? `Due: ${t.due_date}` : ''}\n`;
      });
    }

    if (context.workspaceData.deals?.length) {
      prompt += `\nActive Deals (${context.workspaceData.deals.length}):\n`;
      context.workspaceData.deals.slice(0, 10).forEach((d: any) => {
        prompt += `- ${d.name}: $${d.value || 0} (${d.stage}, ${d.probability || 0}% probability)\n`;
      });
    }

    if (context.workspaceData.pipeline) {
      prompt += `\nPipeline Summary:\n`;
      for (const [stage, data] of Object.entries(context.workspaceData.pipeline) as any) {
        prompt += `- ${stage}: ${data.count} deals, $${data.value.toLocaleString()}\n`;
      }
    }

    if (context.workspaceData.contacts?.length) {
      prompt += `\nRecent Contacts (${context.workspaceData.contacts.length}):\n`;
      context.workspaceData.contacts.slice(0, 5).forEach((c: any) => {
        prompt += `- ${c.name}${c.title ? ` (${c.title})` : ''}${c.company ? ` at ${c.company}` : ''}\n`;
      });
    }
  }

  if (context.webSources?.length > 0) {
    prompt += `\n\nWeb Research Results:\n`;
    context.webSources.forEach((s: any, i: number) => {
      prompt += `${i + 1}. ${s.title}\n   ${s.snippet}\n   Source: ${s.url}\n\n`;
    });
    prompt += `When using web research, cite your sources.`;
  }

  return prompt;
}

// Build available tools
function buildTools(options: AIRunRequest['tool_options'], aiCanWrite: boolean): any[] {
  const tools: any[] = [];

  // Only add write tools if room allows and user requested
  if (aiCanWrite) {
    if (options.allow_task_creation) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new task in the workspace',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Task title' },
              description: { type: 'string', description: 'Task description' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Task priority' },
              due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
            },
            required: ['title'],
          },
        },
      });
    }

    if (options.allow_note_creation) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_note',
          description: 'Create a note or document draft',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Note title' },
              content: { type: 'string', description: 'Note content in markdown' },
            },
            required: ['title', 'content'],
          },
        },
      });
    }
  }

  if (options.allow_web_search) {
    tools.push({
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for information',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
    });
  }

  return tools;
}

// Execute a tool call
async function executeToolCall(
  supabase: any,
  toolCall: { name: string; arguments: string },
  workspace_id: string,
  user_id: string
): Promise<any> {
  const args = JSON.parse(toolCall.arguments);

  switch (toolCall.name) {
    case 'create_task':
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          workspace_id,
          created_by: user_id,
          title: args.title,
          description: args.description,
          priority: args.priority || 'medium',
          due_date: args.due_date,
          status: 'todo',
        })
        .select()
        .single();
      
      if (taskError) throw new Error(taskError.message);
      return { success: true, task_id: task.id, title: task.title };

    case 'create_note':
      const { data: note, error: noteError } = await supabase
        .from('documents')
        .insert({
          workspace_id,
          created_by: user_id,
          title: args.title,
          content: args.content,
          type: 'note',
        })
        .select()
        .single();
      
      if (noteError) throw new Error(noteError.message);
      return { success: true, note_id: note.id, title: note.title };

    case 'web_search':
      // This would be handled in the context building phase
      return { success: true, message: 'Web search results included in context' };

    default:
      throw new Error(`Unknown tool: ${toolCall.name}`);
  }
}
