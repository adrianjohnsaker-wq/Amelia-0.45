'use client';

import { useState, useRef } from 'react';
import { Search, Upload, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SidebarTrigger } from './ui/sidebar';

interface ModuleDirectoryProps {
  availableModules: string[];
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ModuleDirectory({ availableModules, onFileUpload }: ModuleDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredModules = availableModules.filter(m => m.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 md:p-6 border-b border-border/50 flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <div>
          <h1 className="font-headline text-2xl md:text-3xl text-primary">Module Directory</h1>
          <p className="text-muted-foreground mt-1">Browse, search, and upload Python modules.</p>
        </div>
      </header>
      <div className="p-4 md:p-6 flex-shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search modules..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Module
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={onFileUpload}
            className="hidden"
            accept=".py"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
          {filteredModules.map(moduleName => (
            <Card key={moduleName} className="bg-card/50 hover:border-primary/50 transition-colors duration-300 shadow-lg hover:shadow-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium truncate">{moduleName}</CardTitle>
                <FileCode className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xs text-accent font-mono">Process Metaphysics</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
