import { faker } from "../config/faker.js";

/**
 * Generate a male full name using faker
 * @returns {string} Male full name
 */
export function generateMaleName() {
  return faker.person.fullName({ sex: "male" });
}

/**
 * Generate a male first name
 * @returns {string} Male first name
 */
export function generateMaleFirstName() {
  return faker.person.firstName("male");
}

/**
 * Generate a male last name
 * @returns {string} Male last name
 */
export function generateMaleLastName() {
  return faker.person.lastName("male");
}

/**
 * Generate an Egyptian phone number in format: 0XXXXXXXXXX
 * @returns {string} Phone number
 */
export function generateEgyptianPhone() {
  return `0${faker.string.numeric(10)}`;
}

/**
 * Generate a male user object with common fields
 * @param {Object} overrides - Override specific fields
 * @returns {Object} Male user object
 */
export function generateMaleUser(overrides = {}) {
  return {
    name: generateMaleName(),
    email: faker.internet.email(),
    password: "12345678",
    phone: generateEgyptianPhone(),
    ...overrides,
  };
}

/**
 * Generate a male professional user for staff/branch roles
 * @param {Object} overrides - Override specific fields
 * @returns {Object} Professional user object
 */
export function generateMaleProfessional(overrides = {}) {
  return {
    ownerName: generateMaleName(),
    email: faker.internet.email(),
    password: "12345678",
    phone: generateEgyptianPhone(),
    ...overrides,
  };
}
