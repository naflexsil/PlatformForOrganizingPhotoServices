import prisma from '../config/db.js';

/**
 * @typedef {Object} Photographer
 * @property {string}  id               - UUID
 * @property {string}  userId           - FK → User.id (unique, 1-to-1)
 * @property {number}  rating           - Float, avg rating
 * @property {import('decimal.js').Decimal} pricePerHour  - Decimal(10,2)
 * @property {string|null} priceDescription
 * @property {boolean} hasSubscription
 * @property {import('./user.js').User} user
 * @property {Date}    createdAt
 * @property {Date}    updatedAt
 */

const Photographer = prisma.photographer;

export default Photographer;
