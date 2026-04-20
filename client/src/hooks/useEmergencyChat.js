import { useCallback, useEffect, useMemo, useState } from "react";
import socket from "../services/socket";
import { useSocket } from "./useSocket";

const normalizeChatMessage = (message, currentUserRole, currentUserId) => {
  const senderId =
    typeof message?.senderId === "string"
      ? message.senderId
      : message?.senderId?._id;

  const isMineByRole =
    currentUserRole && message?.senderRole === currentUserRole;
  const isMineById =
    currentUserId &&
    senderId &&
    senderId.toString() === currentUserId.toString();

  return {
    id:
      message?._id ||
      `${message?.senderRole || "system"}-${message?.createdAt || Date.now()}`,
    from: isMineByRole || isMineById ? "user" : "system",
    senderRole: message?.senderRole || "system",
    senderName: message?.senderName || "ResQNet",
    text: message?.message || "",
    createdAt: message?.createdAt || new Date().toISOString(),
  };
};

export default function useEmergencyChat({
  emergencyId,
  enabled = false,
  currentUserRole,
  currentUserName,
  currentUserId,
  initialMessages = [],
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([]);

  const normalizedInitial = useMemo(() => {
    if (!Array.isArray(initialMessages)) return [];
    return initialMessages.map((item) =>
      normalizeChatMessage(item, currentUserRole, currentUserId),
    );
  }, [initialMessages, currentUserRole, currentUserId]);

  useEffect(() => {
    if (!enabled || !emergencyId) {
      setChatInput("");
      return;
    }

    setChatLog(
      normalizedInitial.length > 0
        ? normalizedInitial
        : [
            {
              id: `system-${emergencyId}`,
              from: "system",
              senderRole: "system",
              senderName: "ResQNet",
              text: "Chat connected. You can exchange updates in real time.",
              createdAt: new Date().toISOString(),
            },
          ],
    );

    socket.emit("emergency:join", emergencyId);

    return () => {
      socket.emit("emergency:leave", emergencyId);
    };
  }, [enabled, emergencyId, normalizedInitial]);

  useSocket(socket, "emergency:chat-message", (payload) => {
    if (!enabled || !emergencyId) return;
    if (!payload?.emergencyId || !payload?.message) return;
    if (payload.emergencyId.toString() !== emergencyId.toString()) return;

    const incoming = normalizeChatMessage(
      payload.message,
      currentUserRole,
      currentUserId,
    );

    setChatLog((prev) => {
      if (prev.some((entry) => entry.id === incoming.id)) {
        return prev;
      }
      return [...prev, incoming];
    });
  });

  const sendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text || !enabled || !emergencyId) return;

    socket.emit("emergency:chat-send", {
      emergencyId,
      message: text,
      senderRole: currentUserRole || "user",
      senderName: currentUserName || "",
      senderId: currentUserId || null,
    });

    setChatInput("");
  }, [
    chatInput,
    enabled,
    emergencyId,
    currentUserRole,
    currentUserName,
    currentUserId,
  ]);

  return {
    chatInput,
    setChatInput,
    chatLog,
    sendChat,
  };
}
