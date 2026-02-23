import { getGraphqlBaseUrl } from '../config';
import { tokenManager } from '../client';

/**
 * GraphQL API Service
 * Handles executing generic GraphQL queries and mutations
 */
export const graphqlService = {
    /**
     * Execute a GraphQL query or mutation
     * @param {string} query - The GraphQL query string
     * @param {Object} [variables] - Optional variables dictionary
     * @returns {Promise<Object>} The `data` root of the GraphQL response
     * @throws {Error} If the response contains GraphQL errors
     */
    async query(query, variables = {}) {
        const graphqlUrl = getGraphqlBaseUrl();
        const token = tokenManager.getToken();

        const response = await fetch(graphqlUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ query, variables })
        });

        const jsonResponse = await response.json();

        if (jsonResponse.errors) {
            throw new Error(jsonResponse.errors[0].message || 'GraphQL Error');
        }

        return jsonResponse.data;
    }
};
