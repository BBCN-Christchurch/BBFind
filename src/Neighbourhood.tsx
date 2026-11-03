import { priorityNeighbourhoods } from "./domain";

export function NeighbourhoodOptions({ locations }: { locations: string[] }) {
  const priority = priorityNeighbourhoods.filter((s) => locations.includes(s));
  const others = [...new Set(locations)]
    .filter((s) => !priorityNeighbourhoods.includes(s))
    .sort((a, b) => a.localeCompare(b));
  return (
    <>
      {!!priority.length && (
        <optgroup label="Our neighbourhoods">
          {priority.map((s) => (
            <option key={s} value={s}>
              {s} ★
            </option>
          ))}
        </optgroup>
      )}
      {!!others.length && (
        <optgroup label="Wider community">
          {others.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </optgroup>
      )}
    </>
  );
}

export function PriorityNeighbourhoods({
  locations,
  value,
  onChange,
}: {
  locations: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="priority-neighbourhoods"
      role="group"
      aria-label="Our priority neighbourhoods"
    >
      <small>Our neighbourhoods</small>
      <div>
        {priorityNeighbourhoods
          .filter((s) => locations.includes(s))
          .map((s) => (
            <button
              type="button"
              key={s}
              aria-pressed={value === s}
              className={value === s ? "active" : ""}
              onClick={() => onChange(value === s ? "" : s)}
            >
              {s}
            </button>
          ))}
      </div>
    </div>
  );
}
