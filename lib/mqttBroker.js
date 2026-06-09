"use client";
// =============================================================
//  MQTT Broker - service pour tiroirs pharmacie connectés
//  Aujourd'hui : Wrapper WebSocket vers broker MQTT public ou interne
//  Pour prod : Configurer broker Mosquitto interne (mqtt.aveho.local:1883/9001)
// =============================================================

const MQTT_WS_URL = process.env.NEXT_PUBLIC_MQTT_WS_URL || "wss://test.mosquitto.org:8081";
const TOPIC_PREFIX = "aveho/pharmacie";

let connection = null;
let listeners = new Map(); // topic → [cb, cb...]
let connectPromise = null;

async function connect() {
  if (connection) return connection;
  if (connectPromise) return connectPromise;
  
  connectPromise = new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(MQTT_WS_URL, ["mqttv3.1"]);
      const timeout = setTimeout(() => { ws.close(); reject(new Error("MQTT timeout")); }, 5000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        connection = ws;
        resolve(ws);
      };
      ws.onerror = (e) => { clearTimeout(timeout); reject(e); };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const cbs = listeners.get(msg.topic) || [];
          cbs.forEach(cb => cb(msg.payload, msg.topic));
        } catch {}
      };
      ws.onclose = () => { connection = null; connectPromise = null; };
    } catch (e) {
      reject(e);
    }
  });
  return connectPromise;
}

/**
 * S'abonner à un topic (ex: "tiroir/A1/etat")
 */
export async function subscribe(topic, callback) {
  const fullTopic = `${TOPIC_PREFIX}/${topic}`;
  try {
    await connect();
    const cbs = listeners.get(fullTopic) || [];
    cbs.push(callback);
    listeners.set(fullTopic, cbs);
    return () => {
      const arr = listeners.get(fullTopic) || [];
      listeners.set(fullTopic, arr.filter(c => c !== callback));
    };
  } catch (e) {
    console.warn("[MQTT] Subscribe failed:", e.message);
    return () => {};
  }
}

/**
 * Publier sur un topic (ex: "tiroir/A1/cmd", { action: "open" })
 */
export async function publish(topic, payload) {
  const fullTopic = `${TOPIC_PREFIX}/${topic}`;
  try {
    const ws = await connect();
    ws.send(JSON.stringify({ topic: fullTopic, payload, ts: Date.now() }));
    return true;
  } catch (e) {
    console.warn("[MQTT] Publish failed:", e.message);
    return false;
  }
}

/**
 * Commandes spécifiques tiroirs
 */
export const tiroir = {
  ouvrir: (id) => publish(`tiroir/${id}/cmd`, { action: "open", ts: Date.now() }),
  fermer: (id) => publish(`tiroir/${id}/cmd`, { action: "close", ts: Date.now() }),
  status: (id, cb) => subscribe(`tiroir/${id}/etat`, cb),
  led: (id, color) => publish(`tiroir/${id}/cmd`, { action: "led", color }),
};

/**
 * Hook React pour le statut connexion
 */
import { useEffect, useState } from "react";
export function useMqttStatus() {
  const [status, setStatus] = useState("disconnected");
  useEffect(() => {
    connect().then(() => setStatus("connected")).catch(() => setStatus("error"));
  }, []);
  return status;
}
