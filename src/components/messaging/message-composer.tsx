"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessageAction } from "@/lib/social/actions";
import { Button } from "@/components/ui/button";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (value.trim().length === 0) return;
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("content", value);
      await sendMessageAction(conversationId, formData);
      setValue("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
      className="flex gap-2"
    >
      <label htmlFor="message-input" className="sr-only">
        Message
      </label>
      <input
        id="message-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={4000}
        placeholder="Write a message…"
        className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm"
      />
      <Button type="submit" disabled={busy || value.trim().length === 0}>
        {busy ? "…" : "Send"}
      </Button>
    </form>
  );
}