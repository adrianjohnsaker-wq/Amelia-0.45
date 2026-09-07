'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { SidebarTrigger } from './ui/sidebar';
import { Skeleton } from './ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Terminal } from 'lucide-react';

interface MemoryLogProps {
  userId: string | undefined;
}

interface Memory {
  id: string;
  prompt: string;
  goal: string;
  dream: {
    timestamp: string;
    title: string;
    text: string;
  };
  reflection: string;
  narrative: {
    mode: string;
    narrative: string;
  };
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

function MemoryCard({ memory }: { memory: Memory }) {
  const date = memory.createdAt ? new Date(memory.createdAt.seconds * 1000).toLocaleString() : 'Just now';
  
  return (
    <Card className="bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg">Log Entry</CardTitle>
        <CardDescription>{date}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <h4 className="font-semibold text-primary mb-1">User Prompt</h4>
          <p className="text-muted-foreground italic">"{memory.prompt}"</p>
        </div>
        <div>
          <h4 className="font-semibold text-primary mb-1">Autonomous Goal</h4>
          <p className="text-muted-foreground">{memory.goal}</p>
        </div>
        <div>
          <h4 className="font-semibold text-primary mb-1">Symbolic Dream</h4>
          <p className="text-muted-foreground"><span className="font-medium">{memory.dream.title}:</span> {memory.dream.text}</p>
        </div>
        <div>
          <h4 className="font-semibold text-primary mb-1">Reflexive Narrative</h4>
          <p className="text-muted-foreground">{memory.narrative.narrative}</p>
          <Badge variant="outline" className="mt-2">{memory.narrative.mode}</Badge>
        </div>
        <div>
          <h4 className="font-semibold text-primary mb-1">Reflection</h4>
          <p className="text-muted-foreground">{memory.reflection}</p>
        </div>
      </CardContent>
    </Card>
  );
}


export default function MemoryLog({ userId }: MemoryLogProps) {
  const firestore = useFirestore();
  
  const memoriesQuery = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(collection(firestore, 'users', userId, 'memories'), orderBy('createdAt', 'desc'));
  }, [firestore, userId]);

  const { data: memories, isLoading, error } = useCollection<Memory>(memoriesQuery);

  const renderContent = () => {
    if (!userId) {
       return (
        <div className="flex items-center justify-center h-full">
            <Alert className="max-w-md">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Authentication Required</AlertTitle>
                <AlertDescription>
                    Please sign in to view your memory logs. For now, anonymous authentication is used.
                </AlertDescription>
            </Alert>
        </div>
       )
    }
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }
    if (error) {
        // Since the FirebaseErrorListener will catch and display the error overlay,
        // we can show a user-friendly message here.
        return <div className="text-destructive text-center p-8">Could not load memories. The security rules may be preventing access.</div>
    }
    if (!memories || memories.length === 0) {
      return <p className="text-muted-foreground text-center p-8">No memories logged yet. Interact with the AI to begin its evolution.</p>;
    }
    return (
      <div className="space-y-4">
        {memories.map((memory) => (
          <MemoryCard key={memory.id} memory={memory} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 md:p-6 border-b border-border/50 flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="font-headline text-2xl md:text-3xl text-primary">Memory Log</h1>
          <p className="text-muted-foreground mt-1">Observe the AI's evolving symbolic memory over time.</p>
        </div>
      </header>
      <ScrollArea className="flex-1 p-4 md:p-6">
        {renderContent()}
      </ScrollArea>
    </div>
  );
}
