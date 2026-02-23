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
        const websocketPath = getWebsocketBaseUrl();
        const token = tokenManager.getToken();

        const defaultOptions = {
            path: websocketPath,
            auth: { token: `Bearer ${token}` },
            transports: ['websocket', 'polling'] // Force websocket to prevent Vite HTTP polling loops
        };

        return io(namespace, { ...defaultOptions, ...options });
    }
};
