import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_URL, authApi } from '../api/client';

export function useSignalR(setId, isActive) {
  const connectionRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [claimEvents, setClaimEvents] = useState([]);

  const connect = useCallback(async () => {
    if (connectionRef.current) return;

    let token;
    try {
      const data = await authApi.getSignalRToken();
      token = data.token;
    } catch (err) {
      console.error('Falha ao obter token SignalR', err);
      return;
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_URL, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('ClaimReceived', (claim) => {
      setClaimEvents((prev) => {
        const exists = prev.some((c) => c.id === claim.id);
        if (exists) return prev;
        return [claim, ...prev];
      });
    });

    connection.on('ClaimUpdated', (claims) => {
      setClaimEvents(claims);
    });

    try {
      await connection.start();
      if (setId) {
        await connection.invoke('JoinSet', setId);
      }
      setConnected(true);
      connectionRef.current = connection;
    } catch (err) {
      console.error('SignalR connection failed', err);
    }
  }, [setId]);

  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      await connectionRef.current.stop();
      connectionRef.current = null;
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (isActive && setId) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [isActive, setId]);

  return { connected, claimEvents };
}