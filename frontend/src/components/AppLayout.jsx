import { useLayoutEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar, { Wordmark } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// There are two sidebar toggles: one in the sidebar header, and one in the top
// bar that replaces the sidebar while it is collapsed. Toggling hides whichever
// one was used, so if it had keyboard focus, hand focus to the one now visible.
// A layout effect runs before the browser blurs the newly hidden button, so
// document.activeElement still points at it here.
function useToggleFocusHandoff(sidebarTriggerRef, barTriggerRef) {
  const { isMobile, state } = useSidebar();
  const previousState = useRef(state);

  useLayoutEffect(() => {
    if (previousState.current === state) return;
    previousState.current = state;
    // On phones the sidebar is a modal sheet that manages its own focus.
    if (isMobile) return;

    const collapsed = state === "collapsed";
    const hiddenTrigger = collapsed ? sidebarTriggerRef.current : barTriggerRef.current;
    const visibleTrigger = collapsed ? barTriggerRef.current : sidebarTriggerRef.current;
    if (document.activeElement === hiddenTrigger) visibleTrigger?.focus();
  }, [state, isMobile, sidebarTriggerRef, barTriggerRef]);
}

function AppShell() {
  const { state } = useSidebar();
  const sidebarTriggerRef = useRef(null);
  const barTriggerRef = useRef(null);
  useToggleFocusHandoff(sidebarTriggerRef, barTriggerRef);

  return (
    <>
      <AppSidebar triggerRef={sidebarTriggerRef} />
      <SidebarInset>
        {/* Holds the product name and the sidebar toggle wherever the sidebar
            itself isn't visible: always on phones (where the sidebar is a
            slide-out sheet), and on desktop only while it is collapsed. It sits
            in normal flow, so it never overlaps the page content. */}
        <header
          className={cn(
            "flex h-12 shrink-0 items-center gap-1 border-b px-2",
            state !== "collapsed" && "md:hidden"
          )}
        >
          <SidebarTrigger ref={barTriggerRef} />
          <Wordmark />
        </header>
        {/* md:pt-7.5 (30px) centres the 36px text-3xl page title on the 48px
            midline of the sidebar's h-24 header row. Checked visually. */}
        <div className="flex-1 px-6 py-8 md:px-8 md:pt-7.5">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  );
}

function AppLayout() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppShell />
      </SidebarProvider>
    </TooltipProvider>
  );
}

export default AppLayout;
