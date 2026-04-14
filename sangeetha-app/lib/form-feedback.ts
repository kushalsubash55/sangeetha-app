"use client";

import { RefObject, useEffect } from "react";

export function useAutoScrollToMessage(
  message: string,
  messageRef: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!message || !messageRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      messageRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 60);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message, messageRef]);
}

export function focusFieldAfterError(
  fieldRef?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
) {
  if (!fieldRef?.current) {
    return;
  }

  window.setTimeout(() => {
    fieldRef.current?.focus();
  }, 120);
}
