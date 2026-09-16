/**
 * src/sources/direct_firms.js — Adapter for boutique IP law firms & prospective direct clients
 */

const fs = require('fs');
const config = require('../../config');

function loadDirectFirms() {
  const filePath = config.PATHS.firmsFile;
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(data)) return [];

    return data.map((firm) => ({
      id: firm.id,
      title: `Overflow Search & Claim Charting: ${firm.name}`,
      company: firm.name,
      contactName: firm.contactName,
      contactRole: firm.contactRole,
      email: firm.email,
      website: firm.website,
      description: `${firm.pitchAngle} Specialty: ${firm.specialty}. Location: ${firm.location}`,
      url: firm.website,
      budget: '$500 - $1,500 per project',
      currency: 'USD',
      skills: ['claim-charting', 'invalidity', 'prior-art', 'fto', 'patent-search'],
      type: 'direct-firm-outreach',
      source: 'direct_firms',
      posted: new Date().toISOString(),
      location: firm.location,
      specialty: firm.specialty,
      pitchAngle: firm.pitchAngle,
    }));
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return [];
  }
}

module.exports = {
  name: 'direct_firms',
  loadDirectFirms,
};
