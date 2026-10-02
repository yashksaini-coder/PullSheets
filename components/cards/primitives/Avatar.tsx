import { initials, type PrPerson } from '../model';
export function Avatar({ person, size = 22 }: { person: PrPerson; size?: number }) {
  return (
    <span className={`pc-avatar${person.isBot ? ' pc-avatar-bot' : ''}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} title={person.name ?? person.login}>
      {person.isBot ? '⚙' : initials(person)}
    </span>
  );
}
export function AvatarStack({ people, size = 22 }: { people: PrPerson[]; size?: number }) {
  return (
    <span className="pc-avatars">
      {people.map((p) => <Avatar key={p.login} person={p} size={size} />)}
    </span>
  );
}
