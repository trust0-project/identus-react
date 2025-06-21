import React, { useCallback, useEffect, useState } from "react";
import SDK from "@hyperledger/identus-sdk";

import { useRIDB } from "@trust0/ridb-react";
import { MessagesContext } from "../context";
import { useAgent } from "../hooks";
import { schemas } from "../db";
import { hasDB } from "../utils";


export function MessagesProvider({ children }: { children: React.ReactNode }) {
    const { agent } = useAgent();
    const { db, state: dbState } = useRIDB<typeof schemas>();
    const [messages, setMessages] = useState<{ message: SDK.Domain.Message, read: boolean }[]>([]);
    useEffect(() => {
        if (!hasDB(db) || dbState !== "loaded") {
            throw new Error("Database not connected");
        }
            db.collections.messages.find({}).then((messages) => {
                setMessages(messages.map((message) => ({
                    message: SDK.Domain.Message.fromJson(message.dataJson),
                    read: message.read ?? false
                })));
            })
        
    }, [db]);
    const readMessage = useCallback(async (message: SDK.Domain.Message) => {
        if (!hasDB(db) || dbState !== "loaded") {
            throw new Error("Database not connected");
        }
        const [found] = await db.collections.messages.find({ $or: [{ read: true }, { id: message.id }] });
        if (found) {
            await db.collections.messages.update({
                ...found,
                read: true
            } as any)
        }
    }, [db]);
    const deleteMessage = useCallback(async (message: SDK.Domain.Message) => {
        if (!hasDB(db) || dbState !== "loaded") {
            throw new Error("Database not connected");
        }
        const query = { $or: [{ uuid: message.uuid }, { id: message.id }] }
        const [found] = await db.collections.messages.find(query);
        if (found) {
            await db.collections.messages.delete(found.uuid);
        }
    }, [db]);
    const onMessage = useCallback(async (messages: SDK.Domain.Message[]) => {
        setMessages((prev) => {
            const newMessages = messages.filter(
                (message) => !prev.some((m) => m.message.id === message.id)
            );
            return [...prev, ...newMessages.map((message) => ({ message, read: false }))];
        });
    }, [setMessages, agent]);
    useEffect(() => {
        if (agent) {
            agent.addListener(SDK.ListenerKey.MESSAGE, onMessage);
            return () => {
                agent.removeListener(SDK.ListenerKey.MESSAGE, onMessage);
            };
        }
    }, [agent, onMessage])
    return <MessagesContext.Provider value={{ messages, readMessage, deleteMessage }}>
        {children}
    </MessagesContext.Provider>
}
