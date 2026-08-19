const fs = require('fs');
const file = 'src/components/TexturesSection.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "alert('Error al subir: ' + error.message);",
  "if (error.code === 'storage/unknown' || error.message.includes('unknown')) { alert('Error: El Storage no está activado en este proyecto de Firebase. Revisa el chat para configurarlo.'); } else { alert('Error al subir: ' + error.message); }"
);

fs.writeFileSync(file, code);
