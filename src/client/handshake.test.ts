/**
 * @file handshake.test.ts
 * @description Comprehensive Jest unit testing suite for CrokAgentHandshakeClient.
 * Tests connection lifecycle, schema validation, exponential backoff, error recovery,
 * and cryptographic key fingerprinting.
 */

import { CrokAgentHandshakeClient } from './CrokAgentHandshakeClient';
import { ClientConfig } from './types';

describe('CrokAgentHandshakeClient Unit Test Suite', () => {
  const defaultConfig: ClientConfig = {
    host: '127.0.0.1',
    port: 8888,
    agentId: 'crok-test-node-01',
    encryptionKey: 'sec_key_sov_9988_alpha',
    initialBackoffMs: 50,
    maxBackoffMs: 200,
    maxReconnectAttempts: 3,
    requestTimeoutMs: 1000,
  };

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('1. Handshake Packet Construction & Schema', () => {
    it('should generate a valid handshake packet matching daemon schema', () => {
      const client = new CrokAgentHandshakeClient(defaultConfig);
      const packet = client.buildHandshakePacket();

      expect(packet).toBeDefined();
      expect(packet.sender_id).toBe('crok-test-node-01');
      expect(packet.message_id).toMatch(/^msg-\d+-[a-z0-9]+$/);
      expect(packet.payload).toBeDefined();
      expect(packet.payload.agent_type).toBe('crok');
      expect(packet.payload.capabilities).toContain('neural_swarm');
      expect(packet.key_fingerprint).toMatch(/^sha3-[0-9a-f]+-v2$/);
      expect(packet.timestamp).toBeGreaterThan(0);
    });

    it('should produce identical key fingerprint for identical encryption keys', () => {
      const clientA = new CrokAgentHandshakeClient(defaultConfig);
      const clientB = new CrokAgentHandshakeClient(defaultConfig);

      const fpA = clientA.generateKeyFingerprint('secret_key_lattice_99');
      const fpB = clientB.generateKeyFingerprint('secret_key_lattice_99');

      expect(fpA).toBe(fpB);
    });
  });

  describe('2. Connection Lifecycle & Event Emission', () => {
    it('should transition from DISCONNECTED -> CONNECTING -> HANDSHAKING -> ACTIVE', async () => {
      const client = new CrokAgentHandshakeClient(defaultConfig);
      const states: string[] = [];

      client.on('stateChange', (newState) => {
        states.push(newState);
      });

      const response = await client.connect();

      expect(response.status).toBe('ACTIVE');
      expect(response.synchronized).toBe(true);
      expect(client.getState()).toBe('ACTIVE');
      expect(states).toEqual(['CONNECTING', 'HANDSHAKING', 'ACTIVE']);

      client.disconnect();
      expect(client.getState()).toBe('DISCONNECTED');
    });

    it('should emit handshakeSuccess event with verified response and duration', async () => {
      const client = new CrokAgentHandshakeClient(defaultConfig);
      const successHandler = jest.fn();

      client.on('handshakeSuccess', successHandler);
      await client.connect();

      expect(successHandler).toHaveBeenCalledTimes(1);
      const [res, duration] = successHandler.mock.calls[0];
      expect(res.status).toBe('ACTIVE');
      expect(duration).toBeGreaterThanOrEqual(0);

      client.disconnect();
    });
  });

  describe('3. Error Handling & Intermittent Network Recovery', () => {
    it('should handle transport failure and trigger exponential backoff reconnect', async () => {
      const client = new CrokAgentHandshakeClient({
        ...defaultConfig,
        maxReconnectAttempts: 2,
        initialBackoffMs: 20,
      });

      // Spy on transport layer to simulate network drop once, then recover
      let callCount = 0;
      jest.spyOn(client as any, 'executeTransportExchange').mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('ECONNREFUSED 127.0.0.1:8888: Network drop');
        }
        return {
          status: 'ACTIVE',
          synchronized: true,
          session_id: 'recovered_session_101',
          timestamp: Date.now()
        };
      });

      const errorHandler = jest.fn();
      client.on('handshakeError', errorHandler);

      // Connect will reject first attempt but initiate scheduled reconnect
      await expect(client.connect()).rejects.toThrow('ECONNREFUSED');
      expect(errorHandler).toHaveBeenCalled();
      expect(client.getState()).toBe('RECONNECTING');

      client.disconnect();
    });

    it('should transition to FAILED when maxReconnectAttempts is exceeded', async () => {
      const client = new CrokAgentHandshakeClient({
        ...defaultConfig,
        maxReconnectAttempts: 0, // No retries permitted
      });

      jest.spyOn(client as any, 'executeTransportExchange').mockRejectedValue(
        new Error('Socket connection fatal error')
      );

      await expect(client.connect()).rejects.toThrow('Socket connection fatal error');
      expect(client.getState()).toBe('FAILED');
    });
  });

  describe('4. Malformed Schema & Security Guardrails', () => {
    it('should reject packets missing sender_id or payload', async () => {
      const client = new CrokAgentHandshakeClient(defaultConfig);

      jest.spyOn(client, 'buildHandshakePacket').mockReturnValue({
        sender_id: '',
        message_id: 'msg-invalid',
        payload: null as any,
        key_fingerprint: 'invalid',
        timestamp: Date.now()
      });

      await expect(client.connect()).rejects.toThrow('Missing required schema fields');
    });
  });
});
