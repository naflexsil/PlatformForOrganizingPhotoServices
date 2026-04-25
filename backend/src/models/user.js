import prisma from '../config/db.js';

/**
 * @typedef {Object} User
 * @property {string} id          - UUID
 * @property {string} vkId        - VK user id (unique)
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} username    - Public tag (unique)
 * @property {string|null} bio
 * @property {string|null} avatarUrl
 * @property {'CLIENT'|'PHOTOGRAPHER'|'ADMIN'} role
 * @property {import('./photographer.js').Photographer|null} photographer
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

const User = prisma.user;

export default User;
