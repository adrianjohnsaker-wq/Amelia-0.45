'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { analyzeMemory } from '@/app/actions';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from './ui/sidebar';

type AnalyzedMemory = {
  keyThemes: string[];
  keyConcepts: string[];
  summary: string;
} | null;

export default function MemoryInterface() {
  const [memoryContent, setMemoryContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analyzedData, setAnalyzedData] = useState<AnalyzedMemory>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!memoryContent.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Memory content cannot be empty.' });
      return;
    }
    setIsLoading(true);
    setAnalyzedData(null);
    const result = await analyzeMemory(memoryContent);
    setIsLoading(false);
    if (result.success && result.data) {
      setAnalyzedData(result.data);
      toast({ title: 'Analysis Complete', description: 'Memory has been successfully analyzed.' });
    } else {
      toast({ variant: 'destructive', title: 'Analysis Failed', description: result.error });
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setMemoryContent(text);
        toast({ title: 'File Loaded', description: `Loaded content from ${file.name}.` });
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 md:p-6 border-b border-border/50 flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="font-headline text-2xl md:text-3xl text-primary">Memory Upload</h1>
          <p className="text-muted-foreground mt-1">Upload text or documents to enhance the AI's memory and recall.</p>
        </div>
      </header>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 md:p-6 overflow-hidden">
        <Card className="flex flex-col bg-card/50">
          <CardHeader>
            <CardTitle>Input Memory</CardTitle>
            <CardDescription>Paste text or upload a document.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <Textarea
              placeholder="Paste your memory content here..."
              className="flex-1 resize-none bg-background/50"
              value={memoryContent}
              onChange={(e) => setMemoryContent(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" className="w-full" onClick={() => document.getElementById('memory-file-upload')?.click()}>
                <Upload className="mr-2 h-4 w-4" /> Upload File
              </Button>
              <input id="memory-file-upload" type="file" className="hidden" accept=".txt,.md,.doc,.docx" onChange={handleFileChange} />
              <Button className="w-full" onClick={handleAnalyze} disabled={isLoading}>
                {isLoading ? 'Analyzing...' : 'Analyze Memory'}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>Key themes, concepts, and summary from the memory.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && <div className="flex justify-center items-center h-full"><p className="text-muted-foreground">Analyzing memory...</p></div>}
            {analyzedData && (
              <ScrollArea className="h-[calc(100vh-270px)] pr-4">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-primary mb-2">Summary</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{analyzedData.summary}</p>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-primary mb-2">Key Themes</h3>
                    <div className="flex flex-wrap gap-2">
                      {analyzedData.keyThemes.map((theme, i) => <Badge variant="secondary" key={i}>{theme}</Badge>)}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="font-semibold text-primary mb-2">Key Concepts</h3>
                    <div className="flex flex-wrap gap-2">
                      {analyzedData.keyConcepts.map((concept, i) => <Badge variant="secondary" key={i}>{concept}</Badge>)}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
            {!isLoading && !analyzedData && <div className="flex justify-center items-center h-full"><p className="text-muted-foreground">Results will be displayed here.</p></div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
