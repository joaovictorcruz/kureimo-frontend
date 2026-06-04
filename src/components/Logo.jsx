export default function Logo({ size = 40, showText = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <img
        src="/logo-icon.png"
        alt="Kureimo"
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      />
      {showText && (
        <img
          src="/logo-text.png"
          alt="kureimo"
          style={{ height: size * 0.85, objectFit: 'contain', flexShrink: 0 }}
        />
      )}
    </div>
  );
}