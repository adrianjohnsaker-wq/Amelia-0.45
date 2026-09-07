'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Code2,
  Home,
  Settings2,
  SquareTerminal,
  SquareUser,
  Triangle,
  History,
  BrainCircuit,
  FileText
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarFooter
} from '@/components/ui/sidebar';
import { ModuleMindLogo } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();

  const menuItems = [
    { href: '/app', label: 'Dashboard', icon: Home },
    { href: '/app/chat', label: 'AI Chat', icon: SquareTerminal },
    { href: '/app/memory-log', label: 'Memory Log', icon: History },
    { href: '/app/modules', label: 'Module Directory', icon: Code2 },
    { href: '/app/autonomous', label: 'Autonomous Process', icon: BrainCircuit },
    { href: '/app/memory-upload', label: 'Memory Upload', icon: FileText }
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <ModuleMindLogo className="w-6 h-6 text-primary" />
            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
              Amelia
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map(item => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <div className="flex items-center gap-2 p-2 group-data-[collapsible=icon]:justify-center">
             <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:p-2">
                <SquareUser className="w-5 h-5" />
                <span className="group-data-[collapsible=icon]:hidden ml-2">{user ? 'Signed In' : 'Anonymous'}</span>
             </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
