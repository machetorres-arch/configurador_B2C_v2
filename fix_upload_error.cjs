const fs = require('fs');
const file = 'src/components/TexturesSection.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "console.error(\"Upload error:\", error);",
  "console.error(\"Upload error:\", error);\n        alert('Error al subir: ' + error.message);"
);

code = code.replace(
  "setUploading(true);",
  "setUploading(true);\n    console.log('Empezando subida a:', storageRef.fullPath);"
);

fs.writeFileSync(file, code);
