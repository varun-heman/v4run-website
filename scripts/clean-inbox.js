#!/usr/bin/env node
/**
 * clean-inbox.js — empties images/inbox/ (the staging folder used when
 * adding new photos — see README "Adding photos"), keeping the folder
 * itself. Called automatically at the end of gen-gallery.js so there's no
 * separate manual step; can also be run on its own.
 *
 * Run: node scripts/clean-inbox.js
 */

const fs   = require('fs');
const path = require('path');

const root     = path.join(__dirname, '..');
const inboxDir = path.join(root, 'images', 'inbox');

function cleanInbox() {
  if (!fs.existsSync(inboxDir)) {
    fs.mkdirSync(inboxDir, { recursive: true });
    return 0;
  }
  const entries = fs.readdirSync(inboxDir);
  entries.forEach((entry) => {
    fs.rmSync(path.join(inboxDir, entry), { recursive: true, force: true });
  });
  return entries.length;
}

module.exports = { cleanInbox };

if (require.main === module) {
  const count = cleanInbox();
  console.log(`✓ inbox cleared (${count} item${count !== 1 ? 's' : ''} removed)`);
}
