import { getWebsocketBaseUrl, ENDPOINTS } from '../config';
import { tokenManager } from '../client';
import { io } from 'socket.io-client';

/**
 * WebSocket API Service
 * Manages Socket.IO connections natively integrated with the app's routing framework
 */
export const websocketService = {
    /**
     * Connect to a specific WebSocket namespace
     * @param {string} namespace - The namespace to connect to (e.g., '/attendance')
     * @param {Object} [options] - Additional Socket.io client options
     * @returns {import('socket.io-client').Socket} The initialized socket instance
     */
    connect(namespace = ENDPOINTS.WEBSOCKET.ATTENDANCE, options = {}) {
        const websocketPath = `${getWebsocketBaseUrl()}/socket.io`;
        const token = tokenManager.getToken();

        // Production domain is behind a government SSL gateway that blocks WebSocket upgrades.
        // Force polling-only to avoid noisy console errors; real-time still works via long-polling.
        const isProd = typeof window !== 'undefined' &&
            ['plp-sms.moeys.gov.kh', '192.168.155.115'].includes(window.location.hostname);

        const defaultOptions = {
            path: websocketPath,
            auth: { token: `Bearer ${token}` },
            transports: isProd ? ['polling'] : ['polling', 'websocket'],
        };

        return io(namespace, { ...defaultOptions, ...options });
    }
};
