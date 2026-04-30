import prisma from '../config/db.js';

/**
 * @typedef {Object} User
 * @property {string} id          - UUID
 * @property {string} vkId        - VK user id (unique)
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} tag         - Public tag / @name (unique)
 * @property {string|null} bio
 * @property {string|null} gender
 * @property {Date|null} birthDate
 * @property {string|null} avatarUrl
 * @property {'USER'|'PHOTOGRAPHER'} role
 * @property {import('./photographer.js').Photographer|null} photographer
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

const User = prisma.user;

export default User;
