const fs = require('fs');
const file = 'src/components/Configurator.tsx';
let code = fs.readFileSync(file, 'utf8');

const newColorPicker = `
const ColorPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
  const isHex = value.startsWith('#');
  return (
    <div className="flex flex-col gap-1 mb-2">
      <label className={labelClass}>{label} (Hex o Nombre de textura)</label>
      <div className="flex items-center gap-2">
        {isHex ? (
          <div className="relative w-8 h-8 rounded-md overflow-hidden border border-white/20 shrink-0">
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-[-10px] w-20 h-20 cursor-pointer" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center border border-white/20 shrink-0 text-xs" title="Textura">
            🖼️
          </div>
        )}
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-black/30 border border-white/10 rounded-md px-2 py-1 text-sm text-white focus:outline-none focus:border-orange-500"
          placeholder="#ffffff o archivo.jpg"
        />
      </div>
    </div>
  );
};
`;

code = code.replace(
  `const ColorPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
  <div className="flex items-center justify-between">
    <label className={labelClass}>{label}</label>
    <div className="p-1 border border-white/10 rounded-md bg-white/5 hover:border-orange-500/50 transition-colors w-10 h-10 flex items-center justify-center relative overflow-hidden">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-[-10px] w-20 h-20 cursor-pointer opacity-0" />
      <div className="w-full h-full rounded-sm shadow-inner pointer-events-none" style={{ backgroundColor: value }}></div>
    </div>
  </div>
);`,
  newColorPicker
);

fs.writeFileSync(file, code);
