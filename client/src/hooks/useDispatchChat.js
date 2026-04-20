import { useCallback, useEffect, useState } from "react";

const buildWelcomeMessage = (ambulance) =>
  `${ambulance?.driverName || "Driver"} connected. You can chat, call, or cancel from here.`;

export default function useDispatchChat({ ambulance, enabled = false }) {
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState([]);

  useEffect(() => {
    if (!enabled || !ambulance?._id) {
      setChatLog([]);
      setChatInput("");
      return;
    }

    setChatLog([
      {
        id: `system-${ambulance._id}`,
        from: "system",
        text: buildWelcomeMessage(ambulance),
      },
    ]);
    setChatInput("");
  }, [ambulance, enabled]);

  const sendChat = useCallback(() => {
    const text = chatInput.trim();
    if (!text) return;

    const ts = Date.now();
    setChatLog((prev) => [...prev, { id: `user-${ts}`, from: "user", text }]);
    setChatInput("");

    window.setTimeout(() => {
      setChatLog((prev) => [
        ...prev,
        {
          id: `driver-${Date.now()}`,
          from: "system",
          text: "Driver acknowledged. Ambulance is en route.",
        },
      ]);
    }, 400);
  }, [chatInput]);

  return {
    chatInput,
    setChatInput,
    chatLog,
    sendChat,
  };
}
