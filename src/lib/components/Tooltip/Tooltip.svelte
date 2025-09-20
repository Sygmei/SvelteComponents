<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    trigger: Snippet;
    content: Snippet;
    placement?:
      | "top"
      | "bottom"
      | "left"
      | "right"
      | "over"
      | "over-left"
      | "over-right"
      | "over-top"
      | "over-bottom"
      | "over-top-left"
      | "over-top-right"
      | "over-bottom-left"
      | "over-bottom-right";
    delay?: number;
    hideDelay?: number;
    offset?: number;
    interactive?: boolean;
    frame?: boolean;
    arrow?: boolean;
  }

  let {
    trigger,
    content,
    placement = "top",
    delay = 100,
    hideDelay = 100,
    offset = 8,
    interactive = false,
    frame = false,
    arrow = false,
  }: Props = $props();

  let showTooltip = $state(false);
  let triggerElement: HTMLElement;
  let renderedTrigger: HTMLElement;
  let tooltipElement: HTMLElement;
  let tooltipPosition = $state({ top: 0, left: 0 });
  let showTimeout: number;
  let hideTimeout: number;

  function updateTooltipPosition() {
    if (!renderedTrigger || !tooltipElement) return;

    const triggerRect = renderedTrigger.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (placement) {
      case "top":
        top = triggerRect.top - tooltipRect.height - offset;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + offset;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "left":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - offset;
        break;
      case "right":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + offset;
        break;
      case "over":
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case "over-left":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width / 2;
        break;
      case "over-right":
        top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        left = triggerRect.right - tooltipRect.width / 2;
        break;
      case "over-top":
        top = triggerRect.top - tooltipRect.height / 2;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "over-bottom":
        top = triggerRect.bottom - tooltipRect.height / 2;
        left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        break;
      case "over-top-left":
        top = triggerRect.top - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width / 2;
        break;
      case "over-top-right":
        top = triggerRect.top - tooltipRect.height / 2;
        left = triggerRect.right - tooltipRect.width / 2;
        break;
      case "over-bottom-left":
        top = triggerRect.bottom - tooltipRect.height / 2;
        left = triggerRect.left - tooltipRect.width / 2;
        break;
      case "over-bottom-right":
        top = triggerRect.bottom - tooltipRect.height / 2;
        left = triggerRect.right - tooltipRect.width / 2;
        break;
    }

    // Keep tooltip within viewport
    const margin = 8;
    if (left < margin) {
      left = margin;
    } else if (left + tooltipRect.width > window.innerWidth - margin) {
      left = window.innerWidth - tooltipRect.width - margin;
    }

    if (top < margin) {
      top = margin;
    } else if (top + tooltipRect.height > window.innerHeight - margin) {
      top = window.innerHeight - tooltipRect.height - margin;
    }

    tooltipPosition = { top, left };
  }

  function handleMouseEnter() {
    // Clear any pending hide timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    // Clear any pending show timeout
    if (showTimeout) {
      clearTimeout(showTimeout);
    }

    showTimeout = setTimeout(() => {
      showTooltip = true;
      // Update position after tooltip becomes visible
      setTimeout(() => {
        updateTooltipPosition();
      }, 0);
    }, delay);
  }

  function handleMouseLeave() {
    // Clear any pending show timeout
    if (showTimeout) {
      clearTimeout(showTimeout);
    }

    // Clear any pending hide timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    hideTimeout = setTimeout(() => {
      showTooltip = false;
    }, hideDelay);
  }

  function handleTooltipMouseEnter() {
    if (!interactive) return;

    // Clear any pending hide timeout when hovering the tooltip
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }
  }

  function handleTooltipMouseLeave() {
    if (!interactive) return;

    // Start hide timeout when leaving the tooltip
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    hideTimeout = setTimeout(() => {
      showTooltip = false;
    }, hideDelay);
  }

  // Update position when tooltip becomes visible or window resizes
  $effect(() => {
    if (!showTooltip) return;

    const handleResize = () => {
      if (showTooltip) {
        updateTooltipPosition();
      }
    };

    const handleScroll = () => {
      if (showTooltip) {
        updateTooltipPosition();
      }
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Also listen to scroll events on any scrollable parent elements
    let element = renderedTrigger?.parentElement;
    const scrollableElements: Element[] = [];

    while (element) {
      const style = window.getComputedStyle(element);
      if (
        style.overflow === "scroll" ||
        style.overflow === "auto" ||
        style.overflowY === "scroll" ||
        style.overflowY === "auto"
      ) {
        scrollableElements.push(element);
        element.addEventListener("scroll", handleScroll, { passive: true });
      }
      element = element.parentElement;
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      scrollableElements.forEach((el) => {
        el.removeEventListener("scroll", handleScroll);
      });
    };
  });

  // Get reference to the rendered trigger element
  $effect(() => {
    if (triggerElement && triggerElement.firstElementChild) {
      renderedTrigger = triggerElement.firstElementChild as HTMLElement;
    }
  });
</script>

<div
  bind:this={triggerElement}
  style="display: contents;"
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  {@render trigger()}
</div>

{#if showTooltip}
  <div
    bind:this={tooltipElement}
    onmouseenter={handleTooltipMouseEnter}
    onmouseleave={handleTooltipMouseLeave}
    class="fixed z-[70] {interactive
      ? 'pointer-events-auto'
      : 'pointer-events-none'} {frame
      ? 'px-3 py-2 text-sm text-white bg-surface-900 dark:bg-surface-100 dark:text-surface-900 rounded-lg shadow-lg border border-surface-700 dark:border-surface-300 max-w-xs break-words'
      : ''}"
    style="top: {tooltipPosition.top}px; left: {tooltipPosition.left}px;"
  >
    {#if arrow && !placement.startsWith("over") && frame}
      <!-- Arrow triangle matching tooltip background -->
      {#if placement === "top"}
        <div
          class="absolute dark:hidden"
          style="bottom: -5px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid rgb(17 24 39);"
        ></div>
        <div
          class="absolute hidden dark:block"
          style="bottom: -5px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid rgb(245 245 245);"
        ></div>
      {:else if placement === "bottom"}
        <div
          class="absolute dark:hidden"
          style="top: -5px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 5px solid rgb(17 24 39);"
        ></div>
        <div
          class="absolute hidden dark:block"
          style="top: -5px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 5px solid rgb(245 245 245);"
        ></div>
      {:else if placement === "left"}
        <div
          class="absolute dark:hidden"
          style="right: -5px; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 5px solid rgb(17 24 39);"
        ></div>
        <div
          class="absolute hidden dark:block"
          style="right: -5px; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 5px solid rgb(245 245 245);"
        ></div>
      {:else if placement === "right"}
        <div
          class="absolute dark:hidden"
          style="left: -5px; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-right: 5px solid rgb(17 24 39);"
        ></div>
        <div
          class="absolute hidden dark:block"
          style="left: -5px; top: 50%; transform: translateY(-50%); width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-right: 5px solid rgb(245 245 245);"
        ></div>
      {/if}
    {/if}
    {@render content()}
  </div>
{/if}
