// Run this in your server/ folder:
// node generateHashes.js

import bcrypt from 'bcrypt';

const passwords = {
  'A':   'Admin@123',
  'Manager@123': 'Manager@123',
  'Student@123': 'Student@123',
};

for (const [label, pwd] of Object.entries(passwords)) {
  const hash = await bcrypt.hash(pwd, 10);
  console.log(`\n-- ${label}`);
  console.log(`-- Hash: ${hash}`);
  console.log(`UPDATE "users" SET "PasswordHash" = '${hash}' WHERE "Role" = '${label.replace('@123','')}' AND "id" = YOUR_ID;`);
}
