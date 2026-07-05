import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { SIGNALR_URL, getTokenForSignalR } from '../api/client';

export function useSignalR(accessToken, isActive) {
  const connectionRef = useRef(null);
  const [connection, setConnection] = useState(null);
  const [connected, setConnected]   = useState(false);
  const [claimEvent, setClaimEvent]     = useState(null);
  const [claimUpdates, setClaimUpdates] = useState(null);
  const [claimRemoval, setClaimRemoval] = useState(null);

  const connect = useCallback(async () => {
    if (connectionRef.current) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_URL, { accessTokenFactory: getTokenForSignalR })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('ClaimRegistered', (claim) => {
      setClaimEvent(claim);
    });

    connection.on('ClaimUpdated', (claims) => {
      setClaimUpdates(claims);
    });

    connection.on('ClaimRemoved', ({ photocardId, userId }) => {
      setClaimRemoval({ photocardId, userId });
    });

    try {
      await connection.start();
      if (accessToken) {
        await connection.invoke('JoinSet', accessToken);
      }
      setConnected(true);
      connectionRef.current = connection;
      setConnection(connection);
    } catch (err) {
      console.error('SignalR connection failed', err);
    }
  }, [accessToken]);

  const disconnect = useCallback(async () => {
    if (connectionRef.current) {
      await connectionRef.current.stop();
      connectionRef.current = null;
      setConnected(false);
      setConnection(null);
    }
  }, []);

  useEffect(() => {
    if (isActive && accessToken) {
      connect();
    } else {
      disconnect();
    }
    return () => { disconnect(); };
  }, [isActive, accessToken]);

  return { connected, claimEvent, claimUpdates, claimRemoval, connectionRef, connection };
}