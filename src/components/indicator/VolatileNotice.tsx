export function VolatileNotice() {
  return (
    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
      This indicator has swung sharply within the lookback window — a simple up/down label would oversimplify it,
      so no trend or target badge is shown here. See the chart and table above for the full picture.
    </p>
  );
}
