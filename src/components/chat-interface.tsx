'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, User, CornerDownLeft, Loader2, Globe, FileWarning, ShieldCheck, Settings2, SlidersHorizontal } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { scrapeAndSummarizeUrl } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { SidebarTrigger } from './ui/sidebar';
import { Badge } from './ui/badge';
import { sanitizeOutput } from '@/ai/io/outputSanitizer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from './ui/select';
import { GateConfig } from '@/analysis/StrictRunMetrics';
import { useUser } from '@/firebase';

interface Message {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  usedModules?: string[];
  meta?: any;
}

interface ChatInterfaceProps {
  allModules: string[];
}

const chatSchema = z.object({
  prompt: z.string().min(1, 'Message cannot be empty.'),
});
type ChatFormValues = z.infer<typeof chatSchema>;

const initialMessage: Message = { id: '1', role: 'ai', content: "I am Amelia, an AI research assistant specializing in process metaphysics. How can I assist your inquiry today?" };

export default function ChatInterface({ allModules }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const [gateRate, setGateRate] = useState<number>(1.0);
  const [schedule, setSchedule] = useState<string>('constant');
  const [seedType, setSeedType] = useState<string>('neutral');
  const [taskClass, setTaskClass] = useState<string>('1A-ethical');

  const { user } = useUser();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChatFormValues>({
    resolver: zodResolver(chatSchema),
  });
  
  useEffect(() => {
    setIsClient(true);
    try {
      const storedMessages = localStorage.getItem('chat_messages');
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      } else {
        setMessages([initialMessage]);
      }
    } catch (error) {
      console.error("Failed to load messages from localStorage", error);
      setMessages([initialMessage]);
    }
  }, []);

  useEffect(() => {
    if (isClient) {
      try {
        localStorage.setItem('chat_messages', JSON.stringify(messages));
      } catch (error) {
        console.error("Failed to save messages to localStorage", error);
      }
    }
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isClient]);

  const onSubmit: SubmitHandler<ChatFormValues> = async (data) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: data.prompt,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    reset();

    const currentGateConfig: GateConfig = {
      rate: gateRate,
      schedule: schedule as any,
      seedType: seedType as any
    };

    try {
        let response: Message | null = null;
        const prompt = data.prompt.trim();

        if (/(https?:\/\/[^\s]+)/g.test(prompt)) {
            const url = prompt.match(/(https?:\/\/[^\s]+)/g)![0];
            const systemMessage: Message = { id: Date.now().toString()+'_sys', role: 'system', content: `Fetching and summarizing content from: ${url}` };
            setMessages(prev => [...prev, systemMessage]);

            const result = await scrapeAndSummarizeUrl(url);
            if (result.success && result.summary) {
                response = { id: Date.now().toString(), role: 'ai', content: `Summary for ${url}:\n\n${result.summary}` };
            } else {
                throw new Error(result.error || 'Failed to scrape URL.');
            }
        } 
        else {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  prompt, 
                  gateConfig: currentGateConfig,
                  taskClass,
                  userId: user?.uid
                }),
            });

            const result = await res.json();
            
            if (res.ok) {
                const aiResponse: Message = { 
                  id: Date.now().toString(), 
                  role: 'ai', 
                  content: result.reply || "", 
                  meta: {
                    ...result.meta,
                    nextGateState: result.meta?.nextGateState || currentGateConfig,
                    taskClass: result.meta?.taskClass || taskClass
                  }
                };
                
                // Dispatch full stepsTrace for Stage 6 Observer
                if (result.meta?.stepsTrace && Array.isArray(result.meta.stepsTrace)) {
                  result.meta.stepsTrace.forEach((step: any, idx: number) => {
                    // Enrich the last step with the final output for binding
                    if (idx === result.meta.stepsTrace.length - 1) {
                      step.output = result.reply;
                      step.outputLen = (result.reply || "").length;
                    }
                    // Ensure the step has the server-calculated nextGateState
                    step.nextGateState = result.meta.nextGateState || step.nextGateState;
                    window.dispatchEvent(new CustomEvent("amelia:step", { detail: step }));
                  });
                } else {
                  // Fallback for missing trace
                  window.dispatchEvent(new CustomEvent("amelia:step", { 
                    detail: {
                      t: result.meta?.numogram?.tick || Date.now(),
                      input: prompt, 
                      output: result.reply,
                      outputLen: (result.reply || "").length,
                      regime: result.meta?.numogram?.mutationTag || 'unknown',
                      field: {
                        intensity: result.meta?.numogram?.intensity || 0,
                        tension: result.meta?.numogram?.tension || 0,
                        entropy: result.meta?.numogram?.entropy || 0,
                        turbulence: 0
                      },
                      nextGateState: result.meta.nextGateState || currentGateConfig,
                      renderer: 'gemini'
                    }
                  }));
                }

                setMessages(prev => [...prev.filter(m => !m.id.endsWith('_sys')), aiResponse]);
            } else {
                throw new Error(result.error || 'Failed to get AI response.');
            }
        }

    } catch (error: any) {
        const errorMessage: Message = { id: Date.now().toString(), role: 'system', content: `Error: ${error.message || 'An unknown error occurred.'}` };
        setMessages(prev => [...prev.filter(m => !m.id.endsWith('_sys')), errorMessage]);
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="p-4 md:p-6 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <div>
            <h1 className="font-headline text-2xl md:text-3xl text-primary">AI Chat</h1>
            <p className="text-muted-foreground mt-1">Interact with Amelia, your AI research assistant.</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => setShowConfig(!showConfig)}
          className={cn(showConfig && "bg-primary/10 border-primary/50 text-primary")}
        >
          <Settings2 className="h-5 w-5" />
        </Button>
      </header>

      {showConfig && (
        <Card className="m-4 md:m-6 border-primary/20 bg-primary/5">
          <CardHeader className="pb-3 flex flex-row items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold text-primary uppercase tracking-wider">Experimental Gate Policy</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Gate Rate</label>
              <Select value={gateRate.toString()} onValueChange={(v) => setGateRate(parseFloat(v))}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.25">×0.25 (Suppressed)</SelectItem>
                  <SelectItem value="0.5">×0.50 (Low)</SelectItem>
                  <SelectItem value="1">×1.00 (Baseline)</SelectItem>
                  <SelectItem value="2">×2.00 (Amplified)</SelectItem>
                  <SelectItem value="4">×4.00 (Highly Amplified)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Schedule</label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="constant">Constant (μ=0.50)</SelectItem>
                  <SelectItem value="CYC">CYC (Breathing)</SelectItem>
                  <SelectItem value="REV">REV (Annealing)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Seed Type</label>
              <Select value={seedType} onValueChange={setSeedType}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select seed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="parent-biased">Parent-Biased</SelectItem>
                  <SelectItem value="ring-biased">Ring-Biased</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase">Task Class</label>
              <Select value={taskClass} onValueChange={setTaskClass}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Class 1: Identity</SelectLabel>
                    <SelectItem value="1A-ethical">1A - Ethical</SelectItem>
                    <SelectItem value="1B-continuity">1B - Continuity</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Class 2: Technical</SelectLabel>
                    <SelectItem value="2A-mathematical">2A - Math</SelectItem>
                    <SelectItem value="2B-code">2B - Code</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 md:p-6 space-y-6">
            {messages.map(message => (
              <div
                key={message.id}
                className={cn(
                  'flex items-start gap-4',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'ai' && (
                  <Avatar className="w-8 h-8 border-2 border-primary shadow-lg">
                    <AvatarFallback><Bot className="text-primary" /></AvatarFallback>
                  </Avatar>
                )}

                {message.role === 'system' ? (
                  <Card className={cn("w-full max-w-2xl", message.content.startsWith('Error') ? "bg-destructive/10 border-destructive/50" : "bg-secondary/50 border-border/80")}>
                    <CardContent className="p-3">
                      <div className={cn("flex items-center gap-2 text-sm", message.content.startsWith('Error') ? "text-destructive" : "text-muted-foreground")}>
                        {message.content.startsWith("Executing") ? <ShieldCheck className="w-4 h-4"/> : message.content.startsWith("Fetching") ? <Globe className="w-4 h-4"/> : <FileWarning className="w-4 h-4"/>}
                        <p>{message.content}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div
                    className={cn(
                      'max-w-xl rounded-lg px-4 py-3 text-sm md:text-base shadow-md',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{sanitizeOutput(message.content)}</p>
                    {message.role === 'ai' && message.meta?.taskClass && (
                      <div className="mt-2 pt-2 border-t border-border/20 flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase opacity-60">Task: {message.meta.taskClass}</Badge>
                        <Badge variant="outline" className="text-[10px] uppercase opacity-60">Gate: ×{message.meta.nextGateState?.rate}</Badge>
                        {message.meta.metabolic?.plan && (
                          <Badge variant="secondary" className="text-[10px] uppercase">Plan: {message.meta.metabolic.plan.id}</Badge>
                        )}
                        {message.meta.metabolic?.refusal && (
                          <Badge variant="destructive" className="text-[10px] uppercase">Plan Refused</Badge>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {message.role === 'user' && (
                  <Avatar className="w-8 h-8">
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-4">
                <Avatar className="w-8 h-8 border-2 border-primary shadow-lg">
                  <AvatarFallback><Bot className="text-primary" /></AvatarFallback>
                </Avatar>
                <div className="max-w-xl rounded-lg px-4 py-3 bg-card flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="p-4 md:p-6 border-t border-border/50">
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2">
          <Input
            {...register('prompt')}
            placeholder="Ask a question or enter a URL..."
            className="flex-1"
            disabled={isLoading}
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={isLoading}>
            <CornerDownLeft className="h-4 w-4" />
          </Button>
        </form>
        {errors.prompt && <p className="text-xs text-destructive mt-2">{errors.prompt.message}</p>}
      </div>
    </div>
  );
}
